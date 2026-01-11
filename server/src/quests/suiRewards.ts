import { randomUUID } from 'node:crypto';

export async function mockGrantCoins(address: string, amount: number, questId: string): Promise<string> {
  const txId = `mock-${randomUUID()}`;
  console.info(`Mock Sui reward: ${amount} coins to ${address} for quest ${questId} (tx ${txId})`);
  return txId;
}
