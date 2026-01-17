import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from '../../../Module_01_Smart_Invoice_Generation/src/entities/invoice.entity';

@Entity('discount_offers')
export class DiscountOffer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'invoice_id' })
    invoiceId: string;

    @ManyToOne(() => Invoice)
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;

    @Column({ name: 'buyer_id' })
    buyerId: string;

    @Column({ name: 'supplier_id' })
    supplierId: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    originalAmount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    discountedAmount: number;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    discountRate: number; // e.g., 2.5%

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    apr: number; // Annualized Percentage Rate equivalent

    @Column({ type: 'int' })
    daysEarly: number;

    @Column({
        type: 'enum',
        enum: ['OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
        default: 'OFFERED'
    })
    status: string;

    @Column({ type: 'timestamp' })
    offerExpiryDate: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
