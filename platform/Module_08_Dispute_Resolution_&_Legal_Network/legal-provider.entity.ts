/**
 * Legal Service Provider Entities
 * Module 8 Enhancement - Legal Compliance Automation
 * 
 * This file contains all entity definitions for Legal Service Provider network
 * including providers, services, bookings, notices, and quality management.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
  ManyToMany,
  JoinTable
} from 'typeorm';
import { IsUUID, IsString, IsEnum, IsNumber, IsBoolean, IsDate, IsOptional, IsObject, ValidateNested, Min, Max, IsEmail, IsPhoneNumber, IsUrl } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { v4 as uuidv4 } from 'uuid';
import {
  LegalSpecialization,
  LegalProviderStatus,
  LegalProviderAvailability,
  LegalNoticeType,
  LegalNoticeDeliveryMethod,
  LegalNoticeDeliveryStatus,
  LegalServiceType,
  LegalServicePriority,
  DocumentLanguage,
  LegalJurisdiction,
  TimeZone,
  IndianState,
  CurrencyCode,
  PaymentTerms
} from '@shared/enums/legal-compliance.enum';
import {
  ILegalServiceProvider,
  IProviderLocation,
  IPricingStructure,
  IFixedPackage,
  IDiscount,
  ILegalCredentials,
  ICertification,
  IEducation,
  IAchievement,
  IPublication,
  IMembership,
  IWorkingHours,
  ITimeSlot,
  IContactDetails,
  IAddress
} from '@shared/interfaces/legal-compliance.interface';

// ============================================================================
// Legal Service Provider Entity
// ============================================================================

/**
 * Legal Service Provider Entity
 * Represents legal service providers in the network
 */
@Entity('legal_service_providers')
@Index(['tenantId', 'verificationStatus'])
@Index(['providerCode'], { unique: true })
@Index(['barCouncilNumber'], { unique: true })
@Index(['rating'])
@Index(['location'])
@Index(['specializations'])
export class LegalServiceProvider {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @IsUUID()
  @Index()
  tenantId: string;

  @Column({ name: 'provider_code', type: 'varchar', length: 50, unique: true })
  @IsString()
  providerCode: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  @IsString()
  name: string;

  @Column({ name: 'firm_name', type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  firmName?: string;

  @Column({ name: 'specializations', type: 'jsonb' })
  @IsObject()
  specializations: LegalSpecialization[];

  @Column({ name: 'experience_years', type: 'integer' })
  @IsNumber()
  @Min(0)
  @Max(70)
  experienceYears: number;

  @Column({ name: 'bar_council_number', type: 'varchar', length: 100, unique: true })
  @IsString()
  barCouncilNumber: string;

  @Column({ name: 'location', type: 'jsonb' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  location: IProviderLocation;

  @Column({ name: 'contact_details', type: 'jsonb' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  contactDetails: IContactDetails;

  @Column({ name: 'pricing_structure', type: 'jsonb' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  pricingStructure: IPricingStructure;

  @Column({ name: 'credentials', type: 'jsonb' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  credentials: ILegalCredentials;

  @Column({ name: 'rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;

  @Column({ name: 'total_reviews', type: 'integer', default: 0 })
  @IsNumber()
  @Min(0)
  totalReviews: number;

  @Column({
    name: 'availability_status',
    type: 'enum',
    enum: LegalProviderAvailability,
    default: LegalProviderAvailability.AVAILABLE
  })
  @IsEnum(LegalProviderAvailability)
  availabilityStatus: LegalProviderAvailability;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: LegalProviderStatus,
    default: LegalProviderStatus.PENDING_VERIFICATION
  })
  @IsEnum(LegalProviderStatus)
  verificationStatus: LegalProviderStatus;

  @Column({ name: 'languages', type: 'jsonb' })
  @IsObject()
  languages: DocumentLanguage[];

  @Column({ name: 'jurisdiction', type: 'jsonb' })
  @IsObject()
  jurisdiction: LegalJurisdiction[];

  @Column({ name: 'working_hours', type: 'jsonb' })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  workingHours: IWorkingHours;

  @Column({ name: 'emergency_available', type: 'boolean', default: false })
  @IsBoolean()
  emergencyAvailable: boolean;

  @Column({ name: 'profile_image_url', type: 'text', nullable: true })
  @IsOptional()
  @IsUrl()
  profileImageUrl?: string;

  @Column({ name: 'bio', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  bio?: string;

  @Column({ name: 'website_url', type: 'text', nullable: true })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @Column({ name: 'social_media_links', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  socialMediaLinks?: Record<string, string>;

  @Column({ name: 'verification_documents', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  verificationDocuments?: any[];

  @Column({ name: 'verification_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  verificationDate?: Date;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  verifiedBy?: string;

  @Column({ name: 'last_active_at', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  lastActiveAt?: Date;

  @Column({ name: 'total_cases_handled', type: 'integer', default: 0 })
  @IsNumber()
  @Min(0)
  totalCasesHandled: number;

  @Column({ name: 'success_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  successRate: number;

  @Column({ name: 'average_response_time', type: 'integer', default: 0 })
  @IsNumber()
  @Min(0)
  averageResponseTime: number; // in minutes

  @Column({ name: 'compliance_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  complianceScore: number;

  @Column({ name: 'provider_metadata', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  providerMetadata?: Record<string, any>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @IsBoolean()
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  @IsDate()
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  updatedBy?: string;

  @Column({ name: 'version', type: 'integer', default: 1 })
  @IsNumber()
  version: number;

  // Relationships
  @OneToMany(() => LegalServiceBooking, booking => booking.provider)
  bookings: LegalServiceBooking[];

  @OneToMany(() => LegalNoticeDispatch, notice => notice.provider)
  notices: LegalNoticeDispatch[];

  @OneToMany(() => ProviderReview, review => review.provider)
  reviews: ProviderReview[];

  @OneToMany(() => ProviderAvailabilitySlot, slot => slot.provider)
  availabilitySlots: ProviderAvailabilitySlot[];

  @ManyToMany(() => LegalServiceCategory)
  @JoinTable({
    name: 'provider_service_categories',
    joinColumn: { name: 'provider_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' }
  })
  serviceCategories: LegalServiceCategory[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.providerCode) {
      this.providerCode = this.generateProviderCode();
    }
  }

  @BeforeUpdate()
  updateVersion() {
    this.version += 1;
    this.lastActiveAt = new Date();
  }

  // Helper methods
  private generateProviderCode(): string {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `LP-${year}-${random}`;
  }

  isAvailable(): boolean {
    return this.availabilityStatus === LegalProviderAvailability.AVAILABLE &&
      this.verificationStatus === LegalProviderStatus.VERIFIED &&
      this.isActive;
  }

  isVerified(): boolean {
    return this.verificationStatus === LegalProviderStatus.VERIFIED;
  }

  hasSpecialization(specialization: LegalSpecialization): boolean {
    return this.specializations.includes(specialization);
  }

  getAverageRating(): number {
    return Math.round(this.rating * 100) / 100;
  }

  canHandleJurisdiction(jurisdiction: LegalJurisdiction): boolean {
    return this.jurisdiction.includes(jurisdiction);
  }

  supportsLanguage(language: DocumentLanguage): boolean {
    return this.languages.includes(language);
  }

  getConsultationFee(): number {
    return this.pricingStructure.consultationFee;
  }

  getHourlyRate(): number {
    return this.pricingStructure.hourlyRate;
  }

  updateRating(newRating: number): void {
    const totalRatingPoints = this.rating * this.totalReviews;
    this.totalReviews += 1;
    this.rating = (totalRatingPoints + newRating) / this.totalReviews;
  }

  updateSuccessRate(successful: boolean): void {
    const totalSuccessful = (this.successRate / 100) * this.totalCasesHandled;
    this.totalCasesHandled += 1;

    if (successful) {
      this.successRate = ((totalSuccessful + 1) / this.totalCasesHandled) * 100;
    } else {
      this.successRate = (totalSuccessful / this.totalCasesHandled) * 100;
    }
  }
}

// ============================================================================
// Legal Service Booking Entity
// ============================================================================

/**
 * Legal Service Booking Entity
 * Represents bookings for legal services
 */
@Entity('legal_service_bookings')
@Index(['tenantId', 'status'])
@Index(['providerId', 'scheduledDate'])
@Index(['clientId'])
@Index(['bookingNumber'], { unique: true })
export class LegalServiceBooking {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @IsUUID()
  @Index()
  tenantId: string;

  @Column({ name: 'booking_number', type: 'varchar', length: 50, unique: true })
  @IsString()
  bookingNumber: string;

  @Column({
    name: 'service_type',
    type: 'enum',
    enum: LegalServiceType
  })
  @IsEnum(LegalServiceType)
  serviceType: LegalServiceType;

  @Column({ name: 'provider_id', type: 'uuid' })
  @IsUUID()
  providerId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  @IsUUID()
  clientId: string;

  @Column({ name: 'scheduled_date', type: 'timestamp with time zone' })
  @IsDate()
  scheduledDate: Date;

  @Column({ name: 'duration', type: 'integer' })
  @IsNumber()
  @Min(15)
  @Max(480) // 8 hours max
  duration: number; // in minutes

  @Column({
    name: 'priority',
    type: 'enum',
    enum: LegalServicePriority,
    default: LegalServicePriority.NORMAL
  })
  @IsEnum(LegalServicePriority)
  priority: LegalServicePriority;

  @Column({ name: 'description', type: 'text' })
  @IsString()
  description: string;

  @Column({ name: 'requirements', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  requirements?: string[];

  @Column({ name: 'meeting_mode', type: 'varchar', length: 20 })
  @IsString()
  meetingMode: 'in_person' | 'video_call' | 'phone_call';

  @Column({ name: 'meeting_details', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  meetingDetails?: any;

  @Column({ name: 'cost', type: 'decimal', precision: 10, scale: 2 })
  @IsNumber()
  @Min(0)
  cost: number;

  @Column({
    name: 'currency',
    type: 'enum',
    enum: CurrencyCode,
    default: CurrencyCode.INR
  })
  @IsEnum(CurrencyCode)
  currency: CurrencyCode;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'scheduled' })
  @IsString()
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

  @Column({ name: 'booking_notes', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  bookingNotes?: string;

  @Column({ name: 'client_notes', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  clientNotes?: string;

  @Column({ name: 'provider_notes', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  providerNotes?: string;

  @Column({ name: 'outcome', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  outcome?: string;

  @Column({ name: 'follow_up_required', type: 'boolean', default: false })
  @IsBoolean()
  followUpRequired: boolean;

  @Column({ name: 'follow_up_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  followUpDate?: Date;

  @Column({ name: 'payment_status', type: 'varchar', length: 20, default: 'pending' })
  @IsString()
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'disputed';

  @Column({ name: 'payment_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  paymentDate?: Date;

  @Column({ name: 'payment_reference', type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  cancelledBy?: string;

  @Column({ name: 'cancellation_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  cancellationDate?: Date;

  @Column({ name: 'reminder_sent', type: 'boolean', default: false })
  @IsBoolean()
  reminderSent: boolean;

  @Column({ name: 'reminder_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  reminderDate?: Date;

  @Column({ name: 'booking_metadata', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  bookingMetadata?: Record<string, any>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @IsBoolean()
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  @IsDate()
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  updatedBy?: string;

  @Column({ name: 'version', type: 'integer', default: 1 })
  @IsNumber()
  version: number;

  // Relationships
  @ManyToOne(() => LegalServiceProvider, provider => provider.bookings)
  @JoinColumn({ name: 'provider_id' })
  provider: LegalServiceProvider;

  @OneToMany(() => BookingStatusHistory, history => history.booking)
  statusHistory: BookingStatusHistory[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.bookingNumber) {
      this.bookingNumber = this.generateBookingNumber();
    }
  }

  @BeforeUpdate()
  updateVersion() {
    this.version += 1;
  }

  // Helper methods
  private generateBookingNumber(): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `BK-${year}${month}-${timestamp}`;
  }

  isUpcoming(): boolean {
    return this.scheduledDate > new Date() &&
      ['scheduled', 'confirmed'].includes(this.status);
  }

  isCompleted(): boolean {
    return this.status === 'completed';
  }

  isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  canBeCancelled(): boolean {
    const now = new Date();
    const cancellationDeadline = new Date(this.scheduledDate.getTime() - (24 * 60 * 60 * 1000)); // 24 hours before
    return now < cancellationDeadline && ['scheduled', 'confirmed'].includes(this.status);
  }

  getTimeUntilMeeting(): number {
    return this.scheduledDate.getTime() - Date.now();
  }

  getDurationInHours(): number {
    return this.duration / 60;
  }

  getTotalCost(): number {
    return this.cost;
  }

  needsReminder(): boolean {
    const now = new Date();
    const reminderTime = new Date(this.scheduledDate.getTime() - (24 * 60 * 60 * 1000)); // 24 hours before
    return !this.reminderSent && now >= reminderTime && this.isUpcoming();
  }
}

// ============================================================================
// Legal Notice Dispatch Entity
// ============================================================================

/**
 * Legal Notice Dispatch Entity
 * Represents legal notices sent through providers
 */
@Entity('legal_notice_dispatches')
@Index(['tenantId', 'noticeType'])
@Index(['providerId', 'dispatchDate'])
@Index(['recipientName'])
@Index(['deliveryStatus'])
@Index(['noticeNumber'], { unique: true })
export class LegalNoticeDispatch {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @IsUUID()
  @Index()
  tenantId: string;

  @Column({ name: 'notice_number', type: 'varchar', length: 50, unique: true })
  @IsString()
  noticeNumber: string;

  @Column({
    name: 'notice_type',
    type: 'enum',
    enum: LegalNoticeType
  })
  @IsEnum(LegalNoticeType)
  noticeType: LegalNoticeType;

  @Column({ name: 'provider_id', type: 'uuid' })
  @IsUUID()
  providerId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  @IsUUID()
  clientId: string;

  @Column({ name: 'recipient_name', type: 'varchar', length: 255 })
  @IsString()
  recipientName: string;

  @Column({ name: 'recipient_details', type: 'jsonb' })
  @IsObject()
  recipientDetails: any;

  @Column({ name: 'notice_content', type: 'jsonb' })
  @IsObject()
  noticeContent: any;

  @Column({
    name: 'delivery_method',
    type: 'enum',
    enum: LegalNoticeDeliveryMethod
  })
  @IsEnum(LegalNoticeDeliveryMethod)
  deliveryMethod: LegalNoticeDeliveryMethod;

  @Column({
    name: 'urgency',
    type: 'enum',
    enum: LegalServicePriority,
    default: LegalServicePriority.NORMAL
  })
  @IsEnum(LegalServicePriority)
  urgency: LegalServicePriority;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @Column({ name: 'customizations', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  customizations?: Record<string, any>;

  @Column({ name: 'delivery_instructions', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  deliveryInstructions?: string;

  @Column({ name: 'follow_up_required', type: 'boolean', default: false })
  @IsBoolean()
  followUpRequired: boolean;

  @Column({ name: 'dispatch_date', type: 'timestamp with time zone' })
  @IsDate()
  dispatchDate: Date;

  @Column({ name: 'expected_delivery_date', type: 'timestamp with time zone' })
  @IsDate()
  expectedDeliveryDate: Date;

  @Column({ name: 'actual_delivery_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  actualDeliveryDate?: Date;

  @Column({ name: 'tracking_number', type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @Column({
    name: 'delivery_status',
    type: 'enum',
    enum: LegalNoticeDeliveryStatus,
    default: LegalNoticeDeliveryStatus.PENDING
  })
  @IsEnum(LegalNoticeDeliveryStatus)
  deliveryStatus: LegalNoticeDeliveryStatus;

  @Column({ name: 'cost', type: 'decimal', precision: 10, scale: 2 })
  @IsNumber()
  @Min(0)
  cost: number;

  @Column({
    name: 'currency',
    type: 'enum',
    enum: CurrencyCode,
    default: CurrencyCode.INR
  })
  @IsEnum(CurrencyCode)
  currency: CurrencyCode;

  @Column({ name: 'estimated_response_time', type: 'integer' })
  @IsNumber()
  @Min(0)
  estimatedResponseTime: number; // in days

  @Column({ name: 'actual_response_time', type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualResponseTime?: number; // in days

  @Column({ name: 'response_received', type: 'boolean', default: false })
  @IsBoolean()
  responseReceived: boolean;

  @Column({ name: 'response_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  responseDate?: Date;

  @Column({ name: 'response_content', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  responseContent?: string;

  @Column({ name: 'delivery_proof', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  deliveryProof?: any;

  @Column({ name: 'delivery_attempts', type: 'integer', default: 0 })
  @IsNumber()
  @Min(0)
  deliveryAttempts: number;

  @Column({ name: 'last_attempt_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  lastAttemptDate?: Date;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  failureReason?: string;

  @Column({ name: 'notice_metadata', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  noticeMetadata?: Record<string, any>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @IsBoolean()
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  @IsDate()
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  updatedBy?: string;

  @Column({ name: 'version', type: 'integer', default: 1 })
  @IsNumber()
  version: number;

  // Relationships
  @ManyToOne(() => LegalServiceProvider, provider => provider.notices)
  @JoinColumn({ name: 'provider_id' })
  provider: LegalServiceProvider;

  @OneToMany(() => NoticeDeliveryAttempt, attempt => attempt.notice)
  deliveryAttempts_: NoticeDeliveryAttempt[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.noticeNumber) {
      this.noticeNumber = this.generateNoticeNumber();
    }
  }

  @BeforeUpdate()
  updateVersion() {
    this.version += 1;
  }

  // Helper methods
  private generateNoticeNumber(): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `LN-${year}${month}-${timestamp}`;
  }

  isDelivered(): boolean {
    return this.deliveryStatus === LegalNoticeDeliveryStatus.DELIVERED;
  }

  isAcknowledged(): boolean {
    return this.deliveryStatus === LegalNoticeDeliveryStatus.ACKNOWLEDGED;
  }

  hasResponse(): boolean {
    return this.responseReceived && !!this.responseDate;
  }

  isOverdue(): boolean {
    return new Date() > this.expectedDeliveryDate &&
      !this.isDelivered();
  }

  getDaysOverdue(): number {
    if (!this.isOverdue()) return 0;
    const now = new Date();
    const diffTime = now.getTime() - this.expectedDeliveryDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDeliveryDuration(): number | null {
    if (!this.actualDeliveryDate) return null;
    const diffTime = this.actualDeliveryDate.getTime() - this.dispatchDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  canRetry(): boolean {
    return this.deliveryAttempts < 3 &&
      [LegalNoticeDeliveryStatus.FAILED, LegalNoticeDeliveryStatus.RETURNED].includes(this.deliveryStatus);
  }

  getEstimatedCost(): number {
    return this.cost;
  }
}

// ============================================================================
// Supporting Entities
// ============================================================================

/**
 * Legal Service Category Entity
 */
@Entity('legal_service_categories')
@Index(['categoryCode'], { unique: true })
export class LegalServiceCategory {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'category_code', type: 'varchar', length: 50, unique: true })
  @IsString()
  categoryCode: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  @IsString()
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Column({ name: 'parent_category_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  parentCategoryId?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @IsBoolean()
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  @IsDate()
  updatedAt: Date;

  // Self-referencing relationship for parent-child categories
  @ManyToOne(() => LegalServiceCategory, category => category.subCategories)
  @JoinColumn({ name: 'parent_category_id' })
  parentCategory: LegalServiceCategory;

  @OneToMany(() => LegalServiceCategory, category => category.parentCategory)
  subCategories: LegalServiceCategory[];

  @ManyToMany(() => LegalServiceProvider, provider => provider.serviceCategories)
  providers: LegalServiceProvider[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}

/**
 * Provider Review Entity
 */
@Entity('provider_reviews')
@Index(['providerId', 'rating'])
@Index(['clientId'])
@Index(['reviewDate'])
export class ProviderReview {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  @IsUUID()
  providerId: string;

  @Column({ name: 'client_id', type: 'uuid' })
  @IsUUID()
  clientId: string;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @Column({ name: 'rating', type: 'integer' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @Column({ name: 'review_text', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  reviewText?: string;

  @Column({ name: 'review_date', type: 'timestamp with time zone' })
  @IsDate()
  reviewDate: Date;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  @IsBoolean()
  isVerified: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @IsBoolean()
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  // Relationships
  @ManyToOne(() => LegalServiceProvider, provider => provider.reviews)
  @JoinColumn({ name: 'provider_id' })
  provider: LegalServiceProvider;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.reviewDate) {
      this.reviewDate = new Date();
    }
  }
}

/**
 * Provider Availability Slot Entity
 */
@Entity('provider_availability_slots')
@Index(['providerId', 'slotDate'])
@Index(['isAvailable'])
export class ProviderAvailabilitySlot {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  @IsUUID()
  providerId: string;

  @Column({ name: 'slot_date', type: 'date' })
  @IsDate()
  slotDate: Date;

  @Column({ name: 'start_time', type: 'time' })
  @IsString()
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  @IsString()
  endTime: string;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  @IsBoolean()
  isAvailable: boolean;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @Column({ name: 'slot_type', type: 'varchar', length: 20, default: 'regular' })
  @IsString()
  slotType: 'regular' | 'emergency' | 'blocked';

  @Column({ name: 'notes', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  @IsDate()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => LegalServiceProvider, provider => provider.availabilitySlots)
  @JoinColumn({ name: 'provider_id' })
  provider: LegalServiceProvider;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}

/**
 * Booking Status History Entity
 */
@Entity('booking_status_history')
@Index(['bookingId', 'statusChangeDate'])
export class BookingStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  @IsUUID()
  bookingId: string;

  @Column({ name: 'previous_status', type: 'varchar', length: 20, nullable: true })
  @IsOptional()
  @IsString()
  previousStatus?: string;

  @Column({ name: 'current_status', type: 'varchar', length: 20 })
  @IsString()
  currentStatus: string;

  @Column({ name: 'status_change_date', type: 'timestamp with time zone' })
  @IsDate()
  statusChangeDate: Date;

  @Column({ name: 'change_reason', type: 'text' })
  @IsString()
  changeReason: string;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  changedBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  // Relationships
  @ManyToOne(() => LegalServiceBooking, booking => booking.statusHistory)
  @JoinColumn({ name: 'booking_id' })
  booking: LegalServiceBooking;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.statusChangeDate) {
      this.statusChangeDate = new Date();
    }
  }
}

/**
 * Notice Delivery Attempt Entity
 */
@Entity('notice_delivery_attempts')
@Index(['noticeId', 'attemptDate'])
export class NoticeDeliveryAttempt {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id: string;

  @Column({ name: 'notice_id', type: 'uuid' })
  @IsUUID()
  noticeId: string;

  @Column({ name: 'attempt_number', type: 'integer' })
  @IsNumber()
  @Min(1)
  attemptNumber: number;

  @Column({ name: 'attempt_date', type: 'timestamp with time zone' })
  @IsDate()
  attemptDate: Date;

  @Column({
    name: 'delivery_method',
    type: 'enum',
    enum: LegalNoticeDeliveryMethod
  })
  @IsEnum(LegalNoticeDeliveryMethod)
  deliveryMethod: LegalNoticeDeliveryMethod;

  @Column({
    name: 'attempt_status',
    type: 'enum',
    enum: LegalNoticeDeliveryStatus
  })
  @IsEnum(LegalNoticeDeliveryStatus)
  attemptStatus: LegalNoticeDeliveryStatus;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  failureReason?: string;

  @Column({ name: 'delivery_proof', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  deliveryProof?: any;

  @Column({ name: 'next_attempt_date', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate()
  nextAttemptDate?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @IsDate()
  createdAt: Date;

  // Relationships
  @ManyToOne(() => LegalNoticeDispatch, notice => notice.deliveryAttempts_)
  @JoinColumn({ name: 'notice_id' })
  notice: LegalNoticeDispatch;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.attemptDate) {
      this.attemptDate = new Date();
    }
  }
}

// ============================================================================
// Export all entities
// ============================================================================

export const LegalProviderEntities = [
  LegalServiceProvider,
  LegalServiceBooking,
  LegalNoticeDispatch,
  LegalServiceCategory,
  ProviderReview,
  ProviderAvailabilitySlot,
  BookingStatusHistory,
  NoticeDeliveryAttempt
] as const;

