import { Entity, Column, PrimaryGeneratedColumn, Index, Unique, OneToOne, JoinColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { PaymentMethod } from '../types/PaymentMethod';
import { SubscriptionStatus } from '../types/SubscriptionStatus';
import { SubscriptionType } from '../types/SubscriptionType';
import { Payment } from './Payment';

@Entity()
@Index('idx_subscription_end_recurring', ['end', 'recurring'])
@Index('idx_subscription_userId_start_end', ['userId', 'start', 'end'])
@Index('idx_subscription_userId_createdAt', ['userId', 'createdAt'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @CreateDateColumn()
  createdAt?: Date;

  @Column('uuid')
  userId: string;

  @Column('date')
  start: Date;

  @Column('date')
  end: Date;

  @Column({ default: true })
  recurring: boolean;

  @Column({ type: 'int', array: true, default: `{1, 3, 7}` })
  alertDays: number[];

  @Column({default: SubscriptionStatus.Provisioning})
  status: SubscriptionStatus;

  @Column({default: true})
  preferToUseCredit: boolean;

  @OneToMany(() => Payment, payment => payment.subscription, {onDelete: 'CASCADE'})
  payments: Payment[];
}

