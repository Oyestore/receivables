import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CurrencyPair {
  USD_EUR = 'USD_EUR',
  USD_GBP = 'USD_GBP',
  USD_INR = 'USD_INR',
  EUR_GBP = 'EUR_GBP',
  EUR_INR = 'EUR_INR',
  GBP_INR = 'GBP_INR',
  USD_AED = 'USD_AED',
  EUR_AED = 'EUR_AED',
  INR_AED = 'INR_AED',
}

@Entity('forex_rates')
export class ForexRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: CurrencyPair,
    unique: true,
  })
  currencyPair: CurrencyPair;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  rate: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  lockedRate: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  spread: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commission: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'source', length: 50, nullable: true })
  source: string;

  @Column({ name: 'last_updated', type: 'timestamp' })
  lastUpdated: Date;
}
