import { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '@pixi/sound';
import type {
  CardInHand,
  CardPlacement,
  GameState,
  MinionEntity,
  PlayerSide,
  ServerToClient,
  TargetDescriptor
} from '@cardstone/shared/types';
import StageRoot from './gamepixi/StageRoot';
import { GameSocket } from './net/ws';
import styles from './App.module.css';

import {
  Container,
  Graphics,
  Sprite,
  Text,
} from 'pixi.js';
import {
  Application,
  extend,
} from '@pixi/react';

// extend tells @pixi/react what Pixi.js components are available
extend({
  Container,
  Graphics,
  Sprite,
  Text,
});

const PLAYER_STORAGE_KEY = 'cardstone:playerId';

export default function App() {
  const [socket] = useState(() => new GameSocket());
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const [playerId, setPlayerId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    return window.localStorage.getItem(PLAYER_STORAGE_KEY) ?? undefined;
  });
  const [side, setSide] = useState<PlayerSide | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [stageBounds, setStageBounds] = useState({ width: 0, height: 0 });
  const playerIdRef = useRef<string | undefined>(playerId);

  const appendLog = useCallback((entry: string) => {
    setLog((prev) => [entry, ...prev].slice(0, 10));
  }, []);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  useEffect(() => {
    // if (!sound.exists('taverna-1')) {
    //   sound.add('taverna-1', '/assets/music/taverna.mp3');
    // }
    // console.log('1: ', 1);
    // sound.play('taverna-1');
  }, []);

  useEffect(() => {
    socket.connect();
    const unsubOpen = socket.onOpen(() => {
      socket.send('JoinMatch', { matchId: 'auto', playerId: playerIdRef.current });
    });
    const unsubMessage = socket.onMessage((message: ServerToClient) => {
      switch (message.t) {
        case 'MatchJoined': {
          setPlayerId(message.payload.playerId);
          setSide(message.payload.side);
          appendLog(`Joined match ${message.payload.matchId} as ${message.payload.side}`);
          socket.send('Ready', { playerId: message.payload.playerId });
          break;
        }
        case 'StateSync': {
          setState(message.payload.state);
          break;
        }
        case 'ActionResult': {
          if (!message.payload.ok && message.payload.error) {
            appendLog(`Action failed: ${message.payload.error}`);
          }
          break;
        }
        case 'Toast': {
          appendLog(message.payload.message);
          break;
        }
        case 'OpponentLeft': {
          appendLog('Opponent disconnected, waiting...');
          break;
        }
        case 'GameOver': {
          appendLog(`Game over! Winner: ${message.payload.winner}`);
          break;
        }
        default:
          break;
      }
    });
    return () => {
      unsubOpen();
      unsubMessage();
      socket.close();
    };
  }, [appendLog, socket]);

  useEffect(() => {
    if (playerId) {
      window.localStorage.setItem(PLAYER_STORAGE_KEY, playerId);
    }
  }, [playerId]);

  useEffect(() => {
    const node = stageContainerRef.current;
    if (!node) {
      return;
    }
    const updateBounds = () => {
      const rect = node.getBoundingClientRect();
      setStageBounds({ width: rect.width, height: rect.height });
    };
    updateBounds();
    window.addEventListener('resize', updateBounds);
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', updateBounds);
      };
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === node) {
          const { width, height } = entry.contentRect;
          setStageBounds({ width, height });
        }
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, []);

  const canPlayCard = useCallback(
    (card: CardInHand) => {
      if (!state || !side) {
        return false;
      }
      if (state.turn.current !== side || state.turn.phase !== 'Main') {
        return false;
      }
      const player = state.players[side];
      return player.mana.current >= card.card.cost;
    },
    [side, state]
  );

  const handlePlayCard = useCallback(
    (
      card: CardInHand,
      options?: { target?: TargetDescriptor; placement?: CardPlacement }
    ) => {
      const explicitTarget = options?.target;
      const placement = options?.placement;
      if (!side || !canPlayCard(card)) {
        return;
      }
      const opponentSide: PlayerSide = side === 'A' ? 'B' : 'A';
      let target: TargetDescriptor | undefined = explicitTarget;
      if (!target && card.card.type === 'Spell') {
        if (card.card.effect === 'Firebolt') {
          target = { type: 'hero', side: opponentSide };
        } else if (card.card.effect === 'Heal') {
          target = { type: 'hero', side };
        }
      }
      socket.sendWithAck('PlayCard', {
        cardId: card.instanceId,
        ...(target ? { target } : {}),
        ...(placement ? { placement } : {})
      });
    },
    [canPlayCard, side, socket]
  );

  const canAttackMinion = useCallback(
    (minion: MinionEntity) => {
      if (!state || !side) {
        return false;
      }
      if (state.turn.current !== side || state.turn.phase !== 'Main') {
        return false;
      }
      return minion.attacksRemaining > 0;
    },
    [side, state]
  );

  const handleAttack = useCallback(
    (attackerId: string, target: TargetDescriptor) => {
      if (!side || !state) {
        return;
      }
      if (state.turn.current !== side || state.turn.phase !== 'Main') {
        return;
      }
      socket.sendWithAck('Attack', { attackerId, target });
    },
    [side, socket, state]
  );

  const handleEndTurn = useCallback(() => {
    if (!state || !side) {
      return;
    }
    if (state.turn.current !== side || state.turn.phase !== 'Main') {
      return;
    }
    socket.sendWithAck('EndTurn', {});
  }, [side, socket, state]);

  const player = side && state ? state.players[side] : null;
  const opponent = side && state ? state.players[side === 'A' ? 'B' : 'A'] : null;
  const canEndTurn = Boolean(state && side && state.turn.current === side && state.turn.phase === 'Main');

  return (
    <div className={styles.container}>
      <div ref={stageContainerRef} className={styles.stageWrapper}>
        <Application autoStart sharedTicker>
          <StageRoot
            state={state}
            playerSide={side}
            onPlayCard={handlePlayCard}
            canPlayCard={canPlayCard}
            onAttack={handleAttack}
            canAttack={canAttackMinion}
            width={stageBounds.width}
            height={stageBounds.height}
          />
        </Application>
      </div>
      <div className={styles.overlay}>
        <div className={styles.statBlock}>
          <div>Player ID: {playerId ?? 'assigning...'}</div>
          <div>Side: {side ?? '-'}</div>
          <div>
            Turn: {state?.turn.turnNumber ?? 0} ({state?.turn.current ?? '-'})
          </div>
          <div>Phase: {state?.turn.phase ?? '-'}</div>
        </div>
        <div className={styles.controls}>
          <button className={styles.endTurnButton} onClick={handleEndTurn} disabled={!canEndTurn}>
            End Turn
          </button>
          {player ? <span>{`Deck: ${player.deck.length} | Hand: ${player.hand.length}`}</span> : null}
          {player ? <span>{`Hero HP: ${player.hero.hp}`}</span> : null}
          {opponent ? <span>{`Opponent HP: ${opponent.hero.hp}`}</span> : null}
        </div>
        <div className={styles.log}>
          <strong>Log</strong>
          <ul>
            {log.map((entry, index) => (
              <li key={index}>{entry}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
