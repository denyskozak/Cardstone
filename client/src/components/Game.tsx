import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CardInHand,
  CardPlacement,
  ChatMessagePayload,
  ChatVisibilityPayload,
  GameState,
  MinionEntity,
  PlayerSide,
  ServerToClient,
  TargetDescriptor,
  TargetSelector
} from '@cardstone/shared/types';
import { CARD_IDS } from '@cardstone/shared/constants';
import {
  actionRequiresTarget,
  getActionTargetSelector,
  getPrimaryPlayAction
} from '@cardstone/shared/effects';
import StageRoot from '../gamepixi/StageRoot';
import { GameSocket } from '../net/ws';
import styles from './Game.module.css';
import { MatchChat, type MatchChatEntry } from './MatchChat';

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

function getDefaultTargetForSelector(
  selector: TargetSelector,
  side: PlayerSide
): TargetDescriptor | undefined {
  const opponentSide: PlayerSide = side === 'A' ? 'B' : 'A';
  switch (selector) {
    case 'AllEnemies':
    case 'RandomEnemy':
      return { type: 'hero', side: opponentSide };
    case 'AllFriendlies':
    case 'Self':
    case 'Hero':
      return { type: 'hero', side };
    default:
      return undefined;
  }
}

export function Game() {
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
  const [chatMessages, setChatMessages] = useState<MatchChatEntry[]>([]);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [chatCollapseReason, setChatCollapseReason] = useState<string | undefined>();
  const [stageBounds, setStageBounds] = useState({ width: 0, height: 0 });
  const [now, setNow] = useState(() => Date.now());
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
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => {
      window.clearInterval(id);
    };
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
          setChatMessages([]);
          setChatCollapsed(false);
          setChatCollapseReason(undefined);
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
        case 'ChatMessage': {
          setChatMessages((prev) => {
            const payload: ChatMessagePayload = message.payload;
            const entry: MatchChatEntry = {
              id: `${payload.timestamp}-${payload.from}-${Math.random().toString(16).slice(2, 8)}`,
              from: payload.from,
              side: payload.side,
              text: payload.text,
              timestamp: payload.timestamp,
              self: payload.from === playerIdRef.current
            };
            return [...prev.slice(-99), entry];
          });
          break;
        }
        case 'ChatVisibility': {
          const payload: ChatVisibilityPayload = message.payload;
          setChatCollapsed(payload.collapsed);
          setChatCollapseReason(payload.reason);
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
      if (state.stage !== 'Play') {
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
      let target: TargetDescriptor | undefined = explicitTarget;
      if (!target && card.card.type === 'Spell') {
        const action = getPrimaryPlayAction(card.card);
        if (action && actionRequiresTarget(action)) {
          const selector = getActionTargetSelector(action);
          if (selector) {
            target = getDefaultTargetForSelector(selector, side);
          }
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
      if (state.stage !== 'Play') {
        return false;
      }
      if (state.turn.current !== side || state.turn.phase !== 'Main') {
        return false;
      }
      if (minion.attack <= 0) {
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
      if (state.stage !== 'Play') {
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
    if (state.stage !== 'Play') {
      return;
    }
    if (state.turn.current !== side || state.turn.phase !== 'Main') {
      return;
    }
    socket.sendWithAck('EndTurn', {});
  }, [side, socket, state]);

  const isMulligan = state?.stage === 'Mulligan';
  const player = side && state ? state.players[side] : null;
  const opponent = side && state ? state.players[side === 'A' ? 'B' : 'A'] : null;
  const mulliganEndsAt = isMulligan ? state?.timers.mulliganEndsAt ?? null : null;
  const mulliganSecondsLeft =
    mulliganEndsAt != null ? Math.max(0, Math.ceil((mulliganEndsAt - now) / 1000)) : null;
  const turnEndsAt = state?.timers.turnEndsAt ?? null;
  const turnSecondsLeft =
    state?.stage === 'Play' && turnEndsAt != null
      ? Math.max(0, Math.ceil((turnEndsAt - now) / 1000))
      : null;
  const canEndTurn = Boolean(
    state && side && state.stage === 'Play' && state.turn.current === side && state.turn.phase === 'Main'
  );

  const handleSendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      socket.send('ChatMessage', { text: trimmed });
    },
    [socket]
  );

  const handleToggleChatCollapse = useCallback(
    (nextCollapsed: boolean) => {
      socket.send('SetChatCollapsed', { collapsed: nextCollapsed });
      setChatCollapsed(nextCollapsed);
    },
    [socket]
  );

  const handleMulliganReplace = useCallback(
    (card: CardInHand) => {
      if (!state || !side) {
        return;
      }
      if (state.stage !== 'Mulligan') {
        return;
      }
      if (state.mulligan.applied[side]) {
        return;
      }
      if (card.mulliganReplaced) {
        return;
      }
      if (card.card.id === CARD_IDS.coin) {
        return;
      }
      socket.sendWithAck('MulliganReplace', { cardId: card.instanceId });
    },
    [side, socket, state]
  );

  const handleMulliganApply = useCallback(() => {
    if (!state || !side) {
      return;
    }
    if (state.stage !== 'Mulligan') {
      return;
    }
    if (state.mulligan.applied[side]) {
      return;
    }
    socket.sendWithAck('MulliganApply', {});
  }, [side, socket, state]);

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
        {isMulligan && side && state ? (
          <div className={styles.mulliganOverlay}>
            <div className={styles.mulliganHeader}>
              <h2>Mulligan</h2>
              <span className={styles.mulliganTimer}>
                {mulliganSecondsLeft !== null ? `${mulliganSecondsLeft}s` : '—'}
              </span>
            </div>
            <div className={styles.mulliganStatus}>
              {state.mulligan.applied[side]
                ? 'Waiting for opponent to finish...'
                : 'Click a card to replace it and press Apply'}
            </div>
            <div className={styles.mulliganCards}>
              {player?.hand.map((card) => {
                const disabled =
                  Boolean(card.mulliganReplaced) ||
                  card.card.id === CARD_IDS.coin ||
                  state.mulligan.applied[side];
                return (
                  <button
                    key={card.instanceId}
                    type="button"
                    className={styles.mulliganCard}
                    onClick={() => handleMulliganReplace(card)}
                    disabled={disabled}
                  >
                      <img
                          src={`/assets/cards/${card.card.id}.webp`}
                          alt={card.card.name}
                          className={styles.mulliganCardArt}
                      />
                      <span className={styles.mulliganCardName}>{card.card.name}</span>
                    <div className={styles.mulliganCardStats}>
                      <div className={styles.mulliganCardStatsRow}>
                        <span
                          className={styles.mulliganCardStat}
                          title="Mana cost"
                        >
                          <span className={styles.mulliganCardStatLabel}>Mana</span>
                          <span className={styles.mulliganCardStatValue}>{card.card.cost}</span>
                        </span>
                        {'attack' in card.card ? (
                          <span
                            className={styles.mulliganCardStat}
                            title="Attack"
                          >
                            <span className={styles.mulliganCardStatLabel}>ATK</span>
                            <span className={styles.mulliganCardStatValue}>{card.card.attack}</span>
                          </span>
                        ) : null}
                        {'health' in card.card ? (
                          <span
                            className={styles.mulliganCardStat}
                            title="Health"
                          >
                            <span className={styles.mulliganCardStatLabel}>HP</span>
                            <span className={styles.mulliganCardStatValue}>{card.card.health}</span>
                          </span>
                        ) : null}
                      </div>
                      {card.card.text ? (
                        <p className={styles.mulliganCardText}>{card.card.text}</p>
                      ) : null}
                    </div>
                    {card.mulliganReplaced ? (
                      <span className={styles.mulliganCardReplaced}>✖</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className={styles.mulliganApply}
              onClick={handleMulliganApply}
              disabled={state.mulligan.applied[side]}
            >
              Apply
            </button>
          </div>
        ) : null}
      </div>
      <div className={styles.overlay}>
        <div className={styles.statBlock}>
          <div>Player ID: {playerId ?? 'assigning...'}</div>
          <div>Side: {side ?? '-'}</div>
          <div>
            Turn: {state?.turn.turnNumber ?? 0} ({state?.turn.current ?? '-'})
          </div>
          <div>Stage: {state?.stage ?? '-'}</div>
          <div>Phase: {state?.turn.phase ?? '-'}</div>
          {isMulligan && mulliganSecondsLeft !== null ? (
            <div>Mulligan timer: {mulliganSecondsLeft}s</div>
          ) : null}
          {state?.stage === 'Play' && turnSecondsLeft !== null ? (
            <div>Turn timer: {turnSecondsLeft}s</div>
          ) : null}
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
      <MatchChat
        messages={chatMessages}
        collapsed={chatCollapsed}
        collapseReason={chatCollapseReason}
        onSend={handleSendChat}
        onToggleCollapse={handleToggleChatCollapse}
        playerId={playerIdRef.current}
      />
    </div>
  );
}
