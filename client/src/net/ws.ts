import type { ClientToServer, ServerToClient } from '@cardstone/shared/types';
import { getAuthToken } from './auth';

type MessageListener = (message: ServerToClient) => void;
type OpenListener = () => void;

type CommandName = ClientToServer['t'];

type CommandPayload<T extends CommandName> = Extract<ClientToServer, { t: T }>['payload'];
type CommandMessage<T extends CommandName> = Extract<ClientToServer, { t: T }>;

type CommandOptions = {
  expectAck?: boolean;
};

const RECONNECT_DELAY = 1500;

function resolveWsUrl(): string {
  return import.meta.env.VITE_API_URL!;
  // if (typeof window === 'undefined') {
  //   return 'ws://localhost:8787';
  // }
  // const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // const port = window.location.port === '5173' ? '8787' : window.location.port;
  // const host = window.location.hostname;
  // return `${protocol}://${host}${port ? `:${port}` : ''}`;
}

function randomNonce(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export class GameSocket {
  private ws?: WebSocket;
  private readonly listeners = new Set<MessageListener>();
  private readonly openListeners = new Set<OpenListener>();
  private readonly pending: string[] = [];
  private seq = 1;
  private url: string;
  private reconnectTimer?: number;
  private authenticated = false;
  private readonly tokenProvider: () => string | null;

  constructor(url = resolveWsUrl(), tokenProvider: () => string | null = getAuthToken) {
    this.url = url;
    this.tokenProvider = tokenProvider;
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.authenticated = false;
      const token = this.tokenProvider();
      if (!token) {
        console.warn('Missing auth token. Please sign in again.');
        this.ws?.close();
        return;
      }
      this.ws?.send(JSON.stringify({ type: 'auth', token }));
    };
    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data as string) as
          | ServerToClient
          | { type: 'auth_ok' }
          | { type: 'auth_error'; message?: string };
        if ('type' in parsed) {
          if (parsed.type === 'auth_ok') {
            this.authenticated = true;
            while (this.pending.length > 0) {
              const payload = this.pending.shift();
              if (payload) {
                this.ws?.send(payload);
              }
            }
            for (const listener of this.openListeners) {
              listener();
            }
          } else if (parsed.type === 'auth_error') {
            console.warn(parsed.message ?? 'WebSocket auth failed.');
            this.ws?.close();
          }
          return;
        }
        for (const listener of this.listeners) {
          listener(parsed);
        }
      } catch (error) {
        console.warn('Failed to parse message', error);
      }
    };
    this.ws.onclose = () => {
      this.authenticated = false;
      window.clearTimeout(this.reconnectTimer);
      if (this.tokenProvider()) {
        this.reconnectTimer = window.setTimeout(() => this.connect(), RECONNECT_DELAY);
      }
    };
    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  close(): void {
    window.clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }

  onMessage(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onOpen(listener: OpenListener): () => void {
    this.openListeners.add(listener);
    return () => {
      this.openListeners.delete(listener);
    };
  }

  send<T extends CommandName>(t: T, payload: CommandPayload<T>, options: CommandOptions = {}): void {
    const expectAck = options.expectAck ?? false;
    const message = { t, payload } as CommandMessage<T>;
    if (expectAck) {
      message.seq = this.seq++;
      message.nonce = randomNonce();
    }
    this.dispatch(message as ClientToServer);
  }

  sendWithAck<T extends CommandName>(
    t: T,
    payload: CommandPayload<T>
  ): { seq: number; nonce: string } {
    const seq = this.seq++;
    const nonce = randomNonce();
    const message = { t, payload, seq, nonce } as CommandMessage<T>;
    this.dispatch(message as ClientToServer);
    return { seq, nonce };
  }

  private dispatch(message: ClientToServer): void {
    const serialized = JSON.stringify(message);
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.authenticated) {
      this.ws.send(serialized);
    } else {
      this.pending.push(serialized);
    }
  }
}
