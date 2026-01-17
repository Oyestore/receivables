import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum EscrowStatus {
  PENDING = 'pending',
  FUNDED = 'funded',
  RELEASED = 'released',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

export enum EscrowType {
  TRADE_PAYMENT = 'trade_payment',
  MILESTONE_PAYMENT = 'milestone_payment',
  SERVICE_PAYMENT = 'service_payment',
}

@Entity('escrow_transactions')
export class EscrowTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id', unique: true, length: 100 })
  transactionId: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ name: 'trade_id', nullable: true })
  tradeId: string;

  @Column({
    type: 'enum',
    enum: EscrowType,
    default: EscrowType.TRADE_PAYMENT,
  })
  escrowType: EscrowType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({
    type: 'enum',
    enum: EscrowStatus,
    default: EscrowStatus.PENDING,
  })
  status: EscrowStatus;

  @Column({ name: 'blockchain_hash', length: 64, nullable: true })
  blockchainHash: string;

  @Column({ name: 'smart_contract_address', length: 42, nullable: true })
  smartContractAddress: string;

  @Column({ name: 'release_conditions', type: 'jsonb', nullable: true })
  releaseConditions: Record<string, any>;

  @Column({ name: 'dispute_reason', type: 'text', nullable: true })
  disputeReason: string;

  @Column({ name: 'release_notes', type: 'text', nullable: true })
  releaseNotes: string;

  @Column({ name: 'funded_at', type: 'timestamp', nullable: true })
  fundedAt: Date;

  @Column({ name: 'released_at', type: 'timestamp', nullable: true })
  releasedAt: Date;

  @Column({ name: 'disputed_at', type: 'timestamp', nullable: true })
  disputedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;
}
