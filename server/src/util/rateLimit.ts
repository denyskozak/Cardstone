const WINDOW_MS = 10_000;

export class RateLimiter {
  private timestamps: number[] = [];

  constructor(private readonly limit: number) {}

  allow(now = Date.now()): boolean {
    this.timestamps = this.timestamps.filter((ts) => now - ts <= WINDOW_MS);
    if (this.timestamps.length >= this.limit) {
      return false;
    }
    this.timestamps.push(now);
    return true;
  }
}
