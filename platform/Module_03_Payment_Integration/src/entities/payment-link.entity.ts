import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDate Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice.entity';

/**
 * Payment Link Entity
 * 
 * Stores shareable payment links for invoices or custom amounts
 * Supports:
 * - Expirable links
 * - One-time or multi-use links
 * - Usage tracking
 * - QR code generation
 */
@

    Entity('payment_links')
@Index(['short_code'], { unique: true })
@Index(['tenant_id', 'status'])
@Index(['expires_at'])
export class PaymentLink {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'tenant_id', length: 255 })
    tenant_id: string;

    @Column({ name: 'invoice_id', type: 'uuid', nullable: true })
    invoice_id?: string;

    @ManyToOne(() => Invoice, { nullable: true })
    @JoinColumn({ name: 'invoice_id' })
    invoice?: Invoice;

    @Column({ name: 'short_code', length: 20 })
    short_code: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ length: 10, default: 'INR' })
    currency: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ name: 'customer_email', length: 255, nullable: true })
    customer_email?: string;

    @Column({ name: 'customer_phone', length: 20, nullable: true })
    customer_phone?: string;

    @Column({ name: 'callback_url', type: 'text', nullable: true })
    callback_url?: string;

    @Column({ length: 50, default: 'active' })
    status: string; // active, expired, used, cancelled

    @Column({ name: 'use_count', type: 'int', default: 0 })
    use_count: number;

    @Column({ name: 'max_uses', type: 'int', nullable: true })
    max_uses?: number;

    @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
    expires_at?: Date;

    @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
    last_used_at?: Date;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: any;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
