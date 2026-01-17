import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

@Entity('client_preferences')
@Unique(['tenant_id', 'client_id']) // Ensure one preference record per client per tenant
export class ClientPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  tenant_id: string;

  @Index()
  @Column({ type: 'uuid' })
  client_id: string; // Assuming a clients table exists, FK to clients.id

  @Column({ type: 'text', nullable: true })
  default_payment_terms: string;

  @Column({ type: 'text', nullable: true })
  default_notes: string;

  @Column({ type: 'uuid', nullable: true })
  default_invoice_template_id: string; // For Phase 1.2 template integration

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

