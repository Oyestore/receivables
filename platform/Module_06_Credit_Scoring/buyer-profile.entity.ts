import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CreditAssessment } from './credit-assessment.entity';

/**
 * Entity representing a buyer profile for credit assessment.
 * Contains key information about the buyer needed for credit scoring.
 */
@Entity('buyer_profiles')
export class BuyerProfile {
  /**
   * Unique identifier for the buyer profile
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant ID for multi-tenancy support
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * External buyer ID in the system
   */
  @Column({ name: 'buyer_id' })
  buyerId: string;

  /**
   * Legal name of the buyer
   */
  @Column({ name: 'legal_name', length: 255 })
  legalName: string;

  /**
   * Business registration number
   */
  @Column({ name: 'registration_number', length: 50, nullable: true })
  registrationNumber: string;

  /**
   * Tax identification number (e.g., GST number in India)
   */
  @Column({ name: 'tax_id', length: 50, nullable: true })
  taxId: string;

  /**
   * PAN (Permanent Account Number) for Indian businesses
   */
  @Column({ name: 'pan_number', length: 10, nullable: true })
  panNumber: string;

  /**
   * Year the business was established
   */
  @Column({ name: 'year_established', type: 'integer', nullable: true })
  yearEstablished: number;

  /**
   * Industry code (based on NIC/ISIC)
   */
  @Column({ name: 'industry_code', length: 20, nullable: true })
  industryCode: string;

  /**
   * Industry sector description
   */
  @Column({ name: 'industry_sector', length: 100, nullable: true })
  industrySector: string;

  /**
   * Business size category (e.g., micro, small, medium, large)
   */
  @Column({ name: 'business_size', length: 20, nullable: true })
  businessSize: string;

  /**
   * Annual revenue in base currency
   */
  @Column({ name: 'annual_revenue', type: 'decimal', precision: 19, scale: 4, nullable: true })
  annualRevenue: number;

  /**
   * Currency code for annual revenue (ISO 4217)
   */
  @Column({ name: 'revenue_currency', length: 3, default: 'INR' })
  revenueCurrency: string;

  /**
   * Number of employees
   */
  @Column({ name: 'employee_count', type: 'integer', nullable: true })
  employeeCount: number;

  /**
   * Primary business address
   */
  @Column({ name: 'address', type: 'text', nullable: true })
  address: string;

  /**
   * City
   */
  @Column({ length: 100, nullable: true })
  city: string;

  /**
   * State/province
   */
  @Column({ length: 100, nullable: true })
  state: string;

  /**
   * Postal/ZIP code
   */
  @Column({ name: 'postal_code', length: 20, nullable: true })
  postalCode: string;

  /**
   * Country code (ISO 3166-1 alpha-2)
   */
  @Column({ name: 'country_code', length: 2, default: 'IN' })
  countryCode: string;

  /**
   * Primary contact name
   */
  @Column({ name: 'contact_name', length: 255, nullable: true })
  contactName: string;

  /**
   * Primary contact email
   */
  @Column({ name: 'contact_email', length: 255, nullable: true })
  contactEmail: string;

  /**
   * Primary contact phone
   */
  @Column({ name: 'contact_phone', length: 50, nullable: true })
  contactPhone: string;

  /**
   * Website URL
   */
  @Column({ length: 255, nullable: true })
  website: string;

  /**
   * JSON object containing additional business information
   */
  @Column({ name: 'additional_info', type: 'jsonb', nullable: true })
  additionalInfo: Record<string, any>;

  /**
   * Date when the profile was last verified
   */
  @Column({ name: 'last_verified_at', type: 'timestamp', nullable: true })
  lastVerifiedAt: Date;

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
}
