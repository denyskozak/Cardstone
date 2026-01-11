import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DataSource } from 'typeorm';
import { Profile } from './entities/Profile.js';
import { ProfileQuest } from './entities/ProfileQuest.js';
import { Quest } from './entities/Quest.js';

const DEFAULT_DB_PATH = path.join(process.cwd(), 'data', 'cardstone.sqlite');
const databasePath = process.env.SQLITE_PATH ?? DEFAULT_DB_PATH;

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: databasePath,
  entities: [Profile, Quest, ProfileQuest],
  synchronize: true,
  logging: false
});

let initializing: Promise<DataSource> | null = null;

export async function initDataSource(): Promise<DataSource> {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }
  if (!initializing) {
    initializing = (async () => {
      await mkdir(path.dirname(databasePath), { recursive: true });
      await AppDataSource.initialize();
      return AppDataSource;
    })();
  }
  return initializing;
}
