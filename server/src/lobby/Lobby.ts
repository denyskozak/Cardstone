import type { PlayerSide } from '@cardstone/shared/types';
import { Match } from '../match/Match';

interface WaitingPlayer {
  playerId: string;
  notify: (match: Match, side: PlayerSide) => void;
}

export class Lobby {
  private waiting: WaitingPlayer | null = null;
  private matches = new Map<string, Match>();
  private counter = 1;

  join(playerId: string, notify: (match: Match, side: PlayerSide) => void): Match | null {
    if (!this.waiting) {
      this.waiting = { playerId, notify };
      return null;
    }

    const matchId = `match_${this.counter++}`;
    const match = Match.create(matchId, this.waiting.playerId, playerId);
    this.matches.set(matchId, match);
    this.waiting.notify(match, 'A');
    notify(match, 'B');
    this.waiting = null;
    return match;
  }

  getMatch(matchId: string): Match | undefined {
    return this.matches.get(matchId);
  }

  leave(playerId: string): void {
    if (this.waiting?.playerId === playerId) {
      this.waiting = null;
    }
  }
}
