import type { PlayerSide } from '@cardstone/shared/types';
import { Match } from '../match/Match.js';

interface WaitingPlayer {
  playerId: string;
  deck: string[];
  notify: (match: Match, side: PlayerSide) => void;
}

export class Lobby {
  private waitingPlayer: WaitingPlayer | null = null;
  private matches = new Map<string, Match>();
  private counter = 1;

  join(
    playerId: string,
    deck: string[],
    notify: (match: Match, side: PlayerSide) => void
  ): Match | null {
    const waiting = this.waitingPlayer;
    if (!waiting) {
      this.waitingPlayer = { playerId, deck, notify };
      return null;
    }

    const matchId = `match_${this.counter++}`;
    const match = Match.create(matchId, waiting.playerId, playerId, waiting.deck, deck);
    this.matches.set(matchId, match);
    waiting.notify(match, 'A');
    notify(match, 'B');
    this.waitingPlayer = null;
    return match;
  }

  getMatch(matchId: string): Match | undefined {
    return this.matches.get(matchId);
  }

  leave(playerId: string): void {
    if (this.waitingPlayer?.playerId === playerId) {
      this.waitingPlayer = null;
    }
  }
}
