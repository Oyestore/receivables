import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * UPI Transaction Entity
 * 
 * Tracks all UPI payment transactions across providers:
 * - PhonePe
 * - Google Pay
 * - Paytm
 * - BHIM
 * 
 * Stores complete transaction lifecycle from initiation to completion/failure
 */
@Entity('upi_transactions')
@Index(['merchant_transaction_id', 'provider'])
@Index(['status', 'created_at'])
@Index(['payer_vpa'])
export class UpiTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'merchant_transaction_id', length: 255 })
    merchantTransactionId: string;

    @Column({ length: 50 })
    provider: string; // phonepe, googlepay, paytm, bhim

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ length: 50, default: 'PENDING' })
    status: string; // PENDING, COMPLETED, FAILED, EXPIRED

    @Column({ name: 'payer_vpa', length: 255, nullable: true })
    payer_vpa?: string;

    @Column({ name: 'payee_vpa', length: 255, nullable: true })
    payee_vpa?: string;

    @Column({ length: 255, nullable: true })
    rrn?: string; // Retrieval Reference Number

    @Column({ name: 'transaction_id', length: 255, nullable: true })
    transactionId?: string; // Provider transaction ID

    @Column({ length: 255, nullable: true })
    utr?: string; // Unique Transaction Reference

    @Column({ name: 'deep_link', type: 'text', nullable: true })
    deep_link?: string;

    @Column({ name: 'qr_code', type: 'text', nullable: true })
    qr_code?: string;

    @Column({ name: 'txn_token', length: 500, nullable: true })
    txn_token?: string; // For Paytm

    @Column({ name: 'callback_url', type: 'text', nullable: true })
    callback_url?: string;

    @Column({ name: 'redirect_url', type: 'text', nullable: true })
    redirect_url?: string;

    @Column({ type: 'jsonb', nullable: true })
    raw_request?: any;

    @Column({ type: 'jsonb', nullable: true })
    raw_response?: any;

    @Column({ type: 'text', nullable: true })
    error_message?: string;

    @Column({ length: 50, nullable: true })
    error_code?: string;

    @Column({ name: 'retry_count', type: 'int', default: 0 })
    retryCount: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: any;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;

    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completed_at?: Date;

    @Column({ name: 'expired_at', type: 'timestamp', nullable: true })
    expired_at?: Date;
}
