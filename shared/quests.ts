export type QuestDefinition = {
  id: string;
  title: string;
  description: string;
  targetWins: number;
  rewardCoins: number;
};

export type QuestStatus = QuestDefinition & {
  progressWins: number;
  completedAt: string | null;
  rewardedAt: string | null;
  rewardTx: string | null;
};

export type ProfileSummary = {
  id: string;
  coins: number;
  wins: number;
};

export type QuestStatusResponse = {
  profile: ProfileSummary;
  quests: QuestStatus[];
};
