import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { ProfileQuest } from './ProfileQuest.js';

@Entity({ name: 'quests' })
export class Quest {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'integer' })
  targetWins!: number;

  @Column({ type: 'integer' })
  rewardCoins!: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @OneToMany(() => ProfileQuest, (profileQuest) => profileQuest.quest)
  profileQuests!: ProfileQuest[];
}
