import type { DomainId, PlayerSide } from '@cardstone/shared/types';
import { Match } from '../match/Match.js';

interface WaitingPlayer {
  playerId: string;
  deck: string[];
  notify: (match: Match, side: PlayerSide) => void;
}

export class Lobby {
  private waitingByDomain = new Map<DomainId, WaitingPlayer>();
  private matches = new Map<string, Match>();
  private counter = 1;

  join(
    playerId: string,
    deckDomain: DomainId,
    deck: string[],
    notify: (match: Match, side: PlayerSide) => void
  ): Match | null {
    const waiting = this.waitingByDomain.get(deckDomain);
    if (!waiting) {
      this.waitingByDomain.set(deckDomain, { playerId, deck, notify });
      return null;
    }

    const matchId = `match_${this.counter++}`;
    const match = Match.create(matchId, waiting.playerId, playerId, waiting.deck, deck);
    this.matches.set(matchId, match);
    waiting.notify(match, 'A');
    notify(match, 'B');
    this.waitingByDomain.delete(deckDomain);
    return match;
  }

  getMatch(matchId: string): Match | undefined {
    return this.matches.get(matchId);
  }

  leave(playerId: string): void {
    for (const [domain, waiting] of this.waitingByDomain.entries()) {
      if (waiting.playerId === playerId) {
        this.waitingByDomain.delete(domain);
        return;
      }
    }
  }
}
