import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Currency } from './currency.entity';

export enum ExchangeRateType {
  MANUAL = 'manual',
  API = 'api',
  REAL_TIME = 'real_time',
  DAILY = 'daily',
  HISTORICAL = 'historical',
}

export enum ExchangeRateProvider {
  MANUAL = 'manual',
  OPEN_EXCHANGE_RATES = 'open_exchange_rates',
  FIXER = 'fixer',
  EXCHANGE_RATE_API = 'exchange_rate_api',
  CUSTOM = 'custom',
}

@Entity()
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Currency)
  baseCurrency: Currency;

  @Column()
  baseCurrencyCode: string;

  @ManyToOne(() => Currency)
  targetCurrency: Currency;

  @Column()
  targetCurrencyCode: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  rate: number;

  @Column({
    type: 'enum',
    enum: ExchangeRateType,
    default: ExchangeRateType.MANUAL,
  })
  rateType: ExchangeRateType;

  @Column({
    type: 'enum',
    enum: ExchangeRateProvider,
    default: ExchangeRateProvider.MANUAL,
  })
  provider: ExchangeRateProvider;

  @Column({ nullable: true })
  providerLastUpdated: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  validFrom: Date;

  @Column({ nullable: true })
  validTo: Date;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  spreadPercentage: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
