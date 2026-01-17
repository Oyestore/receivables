import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Invoice } from './invoice.entity';
import { ProductServiceCatalog } from '../../product-service-catalog/entities/product-service-catalog.entity'; // Assuming path

@Entity('invoice_line_items')
export class InvoiceLineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  invoice_id: string;

  @ManyToOne(() => Invoice, invoice => invoice.line_items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Index()
  @Column({ type: 'uuid' })
  tenant_id: string; // Denormalized from Invoice for easier querying

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1.00 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unit_price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  item_sub_total: number; // quantity * unit_price

  @Column({ type: 'uuid', nullable: true })
  tax_rate_id: string; // For Phase 1.3

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.00 })
  discount_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  line_total: number; // item_sub_total + tax_amount - discount_amount

  @Index()
  @Column({ type: 'uuid', nullable: true })
  product_id: string;

  @ManyToOne(() => ProductServiceCatalog, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: ProductServiceCatalog;

  @Column({ type: 'integer', default: 0 })
  order_index: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

