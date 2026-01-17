import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Entity representing industry classification mappings.
 * This stores mappings between different industry classification systems.
 */
@Entity('industry_classification_mappings')
export class IndustryClassificationMapping {
  /**
   * Unique identifier for the industry classification mapping
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Primary classification system (e.g., NIC, ISIC, NAICS)
   */
  @Column({ name: 'primary_system', length: 50 })
  primarySystem: string;

  /**
   * Primary classification code
   */
  @Column({ name: 'primary_code', length: 20 })
  primaryCode: string;

  /**
   * Primary classification description
   */
  @Column({ name: 'primary_description', length: 255 })
  primaryDescription: string;

  /**
   * Secondary classification system
   */
  @Column({ name: 'secondary_system', length: 50 })
  secondarySystem: string;

  /**
   * Secondary classification code
   */
  @Column({ name: 'secondary_code', length: 20 })
  secondaryCode: string;

  /**
   * Secondary classification description
   */
  @Column({ name: 'secondary_description', length: 255 })
  secondaryDescription: string;

  /**
   * Tertiary classification system (optional)
   */
  @Column({ name: 'tertiary_system', length: 50, nullable: true })
  tertiarySystem: string;

  /**
   * Tertiary classification code (optional)
   */
  @Column({ name: 'tertiary_code', length: 20, nullable: true })
  tertiaryCode: string;

  /**
   * Tertiary classification description (optional)
   */
  @Column({ name: 'tertiary_description', length: 255, nullable: true })
  tertiaryDescription: string;

  /**
   * Internal sector category
   */
  @Column({ name: 'internal_sector', length: 50 })
  internalSector: string;

  /**
   * Internal sub-sector category
   */
  @Column({ name: 'internal_sub_sector', length: 50, nullable: true })
  internalSubSector: string;

  /**
   * Mapping confidence level (0-100)
   */
  @Column({ name: 'confidence_level', type: 'integer' })
  confidenceLevel: number;

  /**
   * Whether this mapping is verified
   */
  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  /**
   * Whether this mapping is active
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Notes about this mapping
   */
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  /**
   * Timestamp when the record was created
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Timestamp when the record was last updated
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * User ID who created this mapping
   */
  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  /**
   * User ID who last updated this mapping
   */
  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;
}
