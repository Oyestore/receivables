import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('product_service_catalog')
@Unique(['tenant_id', 'item_name']) // Ensure item names are unique per tenant
export class ProductServiceCatalog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ length: 255 })
  item_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  default_unit_price: number;

  @Column({ type: 'uuid', nullable: true })
  default_tax_id: string; // For Phase 1.3 tax integration

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

