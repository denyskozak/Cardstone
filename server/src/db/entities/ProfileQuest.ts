import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Profile } from './Profile.js';
import { Quest } from './Quest.js';

@Entity({ name: 'profile_quests' })
@Index(['profileId', 'questId'], { unique: true })
export class ProfileQuest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  profileId!: string;

  @Column({ type: 'text' })
  questId!: string;

  @Column({ type: 'integer', default: 0 })
  progressWins!: number;

  @Column({ type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  rewardedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  rewardTx!: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @ManyToOne(() => Profile, (profile) => profile.quests, { onDelete: 'CASCADE' })
  profile!: Profile;

  @ManyToOne(() => Quest, (quest) => quest.profileQuests, { onDelete: 'CASCADE' })
  quest!: Quest;
}
