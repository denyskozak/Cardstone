import { initDataSource } from '../db/dataSource.js';
import { Profile } from '../db/entities/Profile.js';
import { ProfileQuest } from '../db/entities/ProfileQuest.js';
import { Quest } from '../db/entities/Quest.js';
import { mockGrantCoins } from './suiRewards.js';

const DEFAULT_QUESTS: Array<Pick<Quest, 'id' | 'title' | 'description' | 'targetWins' | 'rewardCoins'>> = [
  {
    id: 'win-3-games',
    title: 'Win 3 games',
    description: 'Win 3 matches to earn 10 coins.',
    targetWins: 3,
    rewardCoins: 10
  }
];

export async function ensureDefaultQuests(): Promise<void> {
  const dataSource = await initDataSource();
  const questRepo = dataSource.getRepository(Quest);
  const existing = await questRepo.find();
  if (existing.length === 0) {
    const entries = DEFAULT_QUESTS.map((quest) => questRepo.create(quest));
    await questRepo.save(entries);
    return;
  }
  const existingIds = new Set(existing.map((quest) => quest.id));
  const missing = DEFAULT_QUESTS.filter((quest) => !existingIds.has(quest.id));
  if (missing.length > 0) {
    await questRepo.save(missing.map((quest) => questRepo.create(quest)));
  }
}

export async function ensureProfile(address: string): Promise<Profile> {
  const dataSource = await initDataSource();
  const profileRepo = dataSource.getRepository(Profile);
  let profile = await profileRepo.findOne({ where: { id: address } });
  if (!profile) {
    profile = profileRepo.create({ id: address, coins: 0, wins: 0 });
    profile = await profileRepo.save(profile);
  }
  return profile;
}

async function ensureProfileQuest(
  profileId: string,
  quest: Quest
): Promise<ProfileQuest> {
  const dataSource = await initDataSource();
  const profileQuestRepo = dataSource.getRepository(ProfileQuest);
  let profileQuest = await profileQuestRepo.findOne({
    where: { profileId, questId: quest.id },
    relations: { quest: true }
  });
  if (!profileQuest) {
    profileQuest = profileQuestRepo.create({
      profileId,
      questId: quest.id,
      progressWins: 0,
      completedAt: null,
      rewardedAt: null,
      rewardTx: null,
      quest
    });
    profileQuest = await profileQuestRepo.save(profileQuest);
  }
  return profileQuest;
}

export async function getQuestStatus(address: string): Promise<{
  profile: { id: string; coins: number; wins: number };
  quests: Array<{
    id: string;
    title: string;
    description: string;
    targetWins: number;
    rewardCoins: number;
    progressWins: number;
    completedAt: string | null;
    rewardedAt: string | null;
    rewardTx: string | null;
  }>;
}> {
  await ensureDefaultQuests();
  const dataSource = await initDataSource();
  const profile = await ensureProfile(address);
  const questRepo = dataSource.getRepository(Quest);
  const quests = await questRepo.find();
  const profileQuestRepo = dataSource.getRepository(ProfileQuest);
  const existingProfileQuests = await profileQuestRepo.find({
    where: { profileId: profile.id },
    relations: { quest: true }
  });
  const profileQuestMap = new Map(existingProfileQuests.map((entry) => [entry.questId, entry]));

  for (const quest of quests) {
    if (!profileQuestMap.has(quest.id)) {
      const created = await ensureProfileQuest(profile.id, quest);
      profileQuestMap.set(quest.id, created);
    }
  }

  const questStatuses = quests.map((quest) => {
    const profileQuest = profileQuestMap.get(quest.id)!;
    return {
      id: quest.id,
      title: quest.title,
      description: quest.description,
      targetWins: quest.targetWins,
      rewardCoins: quest.rewardCoins,
      progressWins: profileQuest.progressWins,
      completedAt: profileQuest.completedAt ? profileQuest.completedAt.toISOString() : null,
      rewardedAt: profileQuest.rewardedAt ? profileQuest.rewardedAt.toISOString() : null,
      rewardTx: profileQuest.rewardTx
    };
  });

  return {
    profile: {
      id: profile.id,
      coins: profile.coins,
      wins: profile.wins
    },
    quests: questStatuses
  };
}

export async function recordWin(address: string): Promise<void> {
  await ensureDefaultQuests();
  const dataSource = await initDataSource();
  const profileRepo = dataSource.getRepository(Profile);
  const questRepo = dataSource.getRepository(Quest);
  const profileQuestRepo = dataSource.getRepository(ProfileQuest);

  const profile = await ensureProfile(address);
  profile.wins += 1;
  await profileRepo.save(profile);

  const quests = await questRepo.find();
  for (const quest of quests) {
    const profileQuest = await ensureProfileQuest(profile.id, quest);
    if (profileQuest.progressWins < quest.targetWins) {
      profileQuest.progressWins = Math.min(quest.targetWins, profileQuest.progressWins + 1);
      if (profileQuest.progressWins >= quest.targetWins && !profileQuest.completedAt) {
        profileQuest.completedAt = new Date();
      }
    }

    if (profileQuest.completedAt && !profileQuest.rewardedAt) {
      const rewardTx = await mockGrantCoins(profile.id, quest.rewardCoins, quest.id);
      profileQuest.rewardedAt = new Date();
      profileQuest.rewardTx = rewardTx;
      profile.coins += quest.rewardCoins;
      await profileRepo.save(profile);
    }

    await profileQuestRepo.save(profileQuest);
  }
}
