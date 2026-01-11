import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { ProfileQuest } from './ProfileQuest.js';

@Entity({ name: 'profiles' })
export class Profile {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'integer', default: 0 })
  coins!: number;

  @Column({ type: 'integer', default: 0 })
  wins!: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @OneToMany(() => ProfileQuest, (profileQuest) => profileQuest.profile)
  quests!: ProfileQuest[];
}
