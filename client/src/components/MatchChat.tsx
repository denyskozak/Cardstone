import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { PlayerSide } from '@cardstone/shared/types';
import styles from './MatchChat.module.css';

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

type ChatEntry = {
  id: string;
  from: string;
  side?: PlayerSide;
  text: string;
  timestamp: number;
  self: boolean;
};

interface MatchChatProps {
  messages: ChatEntry[];
  collapsed: boolean;
  collapseReason?: string;
  onSend: (text: string) => void;
  onToggleCollapse: (nextCollapsed: boolean) => void;
  playerId?: string;
}

export function MatchChat({
  messages,
  collapsed,
  collapseReason,
  onSend,
  onToggleCollapse,
  playerId
}: MatchChatProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (collapsed) {
      return;
    }
    const node = listRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [messages, collapsed]);

  const handleSend = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    onSend(trimmed);
    setDraft('');
  }, [draft, onSend]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const headerLabel = useMemo(() => {
    const total = messages.length;
    if (total === 0) {
      return 'Chat';
    }
    const opponents = messages.filter((msg) => !msg.self).length;
    return `Chat · ${total} msg${total === 1 ? '' : 's'}${opponents ? ` (${opponents} from rival)` : ''}`;
  }, [messages]);

  return (
    <div className={cn(styles.container, collapsed && styles.collapsed)}>
      <div className={styles.header} onClick={() => onToggleCollapse(!collapsed)}>
        <div className={styles.title}>{headerLabel}</div>
        <button
          type="button"
          className={styles.toggleButton}
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapse(!collapsed);
          }}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
      <div className={cn(styles.body, collapsed && styles.hidden)}>
        <div ref={listRef} className={styles.messageList}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(styles.message, message.self && styles.messageSelf)}
            >
              <span className={styles.messageMeta}>
                {message.self ? 'You' : message.from}
                {message.side ? ` (${message.side})` : ''} ·{' '}
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span>{message.text}</span>
            </div>
          ))}
        </div>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            type="text"
            placeholder={collapsed ? 'Chat collapsed' : 'Send a message'}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={collapsed}
          />
          <button
            type="button"
            className={styles.sendButton}
            onClick={handleSend}
            disabled={collapsed || !draft.trim()}
          >
            Send
          </button>
        </div>
        <div className={cn(styles.collapseHint, !collapseReason && styles.hidden)}>
          {collapseReason}
        </div>
        <div className={cn(styles.collapseHint, !playerId && styles.hidden)}>
          You are {playerId}
        </div>
      </div>
    </div>
  );
}

export type { ChatEntry as MatchChatEntry };
