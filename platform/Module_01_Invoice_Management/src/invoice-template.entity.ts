import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
// Assuming Organization and Tenant entities exist elsewhere or will be simple UUIDs for now
// For a real setup, you would import them:
// import { Organization } from '../../organizations/entities/organization.entity'; 
// import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('invoice_templates')
@Unique(['organization_id', 'template_name'])
export class InvoiceTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;
  // @ManyToOne(() => Tenant)
  // @JoinColumn({ name: 'tenant_id' })
  // tenant: Tenant;

  @Column({ type: 'uuid' })
  organization_id: string;
  // @ManyToOne(() => Organization)
  // @JoinColumn({ name: 'organization_id' })
  // organization: Organization;

  @Column()
  template_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  template_definition: any; // Stores layout, styles, field mappings

  @Column({ default: false })
  is_system_template: boolean;

  @Column({ default: false })
  is_default_for_org: boolean;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  preview_image_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

