import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';
import type { QuestStatusResponse } from '@cardstone/shared/quests';
import { apiPath } from '../config';
import { fetchJson } from '../lib/api';
import { QUESTS_QUERY_KEY } from '../lib/queryKeys';
import { getAuthToken } from '../net/auth';

export function QuestsPage() {
  const token = getAuthToken();

  const questsQuery = useQuery({
    queryKey: QUESTS_QUERY_KEY,
    queryFn: () =>
      fetchJson<QuestStatusResponse>(apiPath('/api/quests'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }),
    enabled: Boolean(token)
  });

  if (!token) {
    return (
      <Flex direction="column" align="center" justify="center" gap="4" style={{ padding: '48px' }}>
        <Heading size="7">Quests</Heading>
        <Text color="gray">Sign in to view your active quests.</Text>
        <Button asChild color="cyan" size="3">
          <Link to="/sign-in">Sign in</Link>
        </Button>
      </Flex>
    );
  }

  const data = questsQuery.data;

  return (
    <Flex direction="column" gap="6" style={{ padding: '32px', color: 'white' }}>
      <Flex align="center" justify="between" wrap="wrap" gap="3">
        <div>
          <Heading size="7">Quests</Heading>
          <Text color="gray">Complete quests to earn on-chain rewards.</Text>
        </div>
        <Button asChild variant="soft" color="gray">
          <Link to="/menu">Back to Menu</Link>
        </Button>
      </Flex>

      {questsQuery.isLoading && <Text>Loading quests...</Text>}
      {questsQuery.error && (
        <Text color="red">
          Failed to load quests: {(questsQuery.error as Error).message}
        </Text>
      )}

      {data && (
        <Flex direction="column" gap="4">
          <Card style={{ background: 'rgba(7, 12, 23, 0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Flex direction="column" gap="2">
              <Heading size="5">Profile</Heading>
              <Text color="gray">Wallet: {data.profile.id}</Text>
              <Flex gap="4">
                <Text>Wins: {data.profile.wins}</Text>
                <Text>Coins: {data.profile.coins}</Text>
              </Flex>
            </Flex>
          </Card>

          <Flex direction="column" gap="3">
            {data.quests.map((quest) => {
              const progressText = `${quest.progressWins}/${quest.targetWins}`;
              const isCompleted = quest.completedAt !== null;
              const isRewarded = quest.rewardedAt !== null;
              return (
                <Card
                  key={quest.id}
                  style={{
                    background: 'rgba(7, 12, 23, 0.85)',
                    border: `1px solid ${isRewarded ? 'rgba(34,197,94,0.7)' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: isRewarded ? '0 0 16px rgba(34,197,94,0.35)' : undefined
                  }}
                >
                  <Flex direction="column" gap="2">
                    <Heading size="5">{quest.title}</Heading>
                    <Text color="gray">{quest.description}</Text>
                    <Text>Progress: {progressText}</Text>
                    <Text>Reward: {quest.rewardCoins} coins</Text>
                    <Text color={isRewarded ? 'green' : isCompleted ? 'yellow' : 'gray'}>
                      {isRewarded
                        ? `Rewarded • ${quest.rewardTx ?? 'pending tx'}`
                        : isCompleted
                          ? 'Completed • Reward pending'
                          : 'In progress'}
                    </Text>
                  </Flex>
                </Card>
              );
            })}
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}
