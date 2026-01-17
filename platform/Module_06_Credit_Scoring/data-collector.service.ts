import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentDataSource } from '../entities/assessment-data-source.entity';
import { BuyerProfile } from '../entities/buyer-profile.entity';
import { PaymentHistory } from '../entities/payment-history.entity';
import { DataSourceType } from '../enums/data-source-type.enum';
import { CreateAssessmentDataSourceDto } from '../dto/create-assessment-data-source.dto';

/**
 * Service responsible for collecting data from various sources for credit assessment.
 * This service handles the data collection and preparation phase of the credit scoring process.
 */
@Injectable()
export class DataCollectorService {
  private readonly logger = new Logger(DataCollectorService.name);

  constructor(
    @InjectRepository(AssessmentDataSource)
    private assessmentDataSourceRepository: Repository<AssessmentDataSource>,
    @InjectRepository(BuyerProfile)
    private buyerProfileRepository: Repository<BuyerProfile>,
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepository: Repository<PaymentHistory>,
  ) {}

  /**
   * Collect data from all available sources for a credit assessment
   * @param assessmentId - ID of the assessment
   * @param buyerId - ID of the buyer
   * @param tenantId - Tenant ID
   * @returns Array of collected data sources
   */
  async collectAllData(assessmentId: string, buyerId: string, tenantId: string): Promise<AssessmentDataSource[]> {
    this.logger.log(`Collecting data for assessment ${assessmentId}, buyer ${buyerId}`);
    
    const dataSources: AssessmentDataSource[] = [];
    
    try {
      // Collect internal payment history
      const paymentHistorySource = await this.collectPaymentHistory(assessmentId, buyerId, tenantId);
      if (paymentHistorySource) {
        dataSources.push(paymentHistorySource);
      }
      
      // Collect buyer profile data
      const profileDataSource = await this.collectBuyerProfileData(assessmentId, buyerId, tenantId);
      if (profileDataSource) {
        dataSources.push(profileDataSource);
      }
      
      // In a real implementation, we would collect data from external sources as well
      // For example:
      // - Credit bureau data
      // - Banking data
      // - Market intelligence
      // - Government databases
      
      // Save all collected data sources
      if (dataSources.length > 0) {
        return await this.assessmentDataSourceRepository.save(dataSources);
      }
      
      return dataSources;
    } catch (error) {
      this.logger.error(`Error collecting data for assessment ${assessmentId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Collect payment history data for a buyer
   * @param assessmentId - ID of the assessment
   * @param buyerId - ID of the buyer
   * @param tenantId - Tenant ID
   * @returns Data source with payment history data or null if no data available
   */
  async collectPaymentHistory(assessmentId: string, buyerId: string, tenantId: string): Promise<AssessmentDataSource> {
    this.logger.log(`Collecting payment history for buyer ${buyerId}`);
    
    try {
      // Get payment history for the buyer
      const paymentRecords = await this.paymentHistoryRepository.find({
        where: { buyerId, tenantId }
      });
      
      if (paymentRecords.length === 0) {
        this.logger.log(`No payment history found for buyer ${buyerId}`);
        return null;
      }
      
      // Calculate data quality metrics
      const totalRecords = paymentRecords.length;
      const recentRecords = paymentRecords.filter(
        record => record.createdAt > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) // Last 180 days
      ).length;
      
      const dataQuality = Math.min(100, Math.round((recentRecords / Math.max(1, totalRecords)) * 100));
      const dataCompleteness = 100; // Internal data is considered complete
      const dataFreshness = Math.min(100, Math.round((recentRecords / Math.max(1, Math.min(10, totalRecords))) * 100));
      
      // Create data source
      const dataSource = this.assessmentDataSourceRepository.create({
        assessmentId,
        tenantId,
        sourceType: DataSourceType.INTERNAL_PAYMENT_HISTORY,
        sourceName: 'Internal Payment Records',
        dataQuality,
        dataCompleteness,
        dataFreshness,
        weight: 50, // Payment history is typically weighted heavily
        sourceMetadata: {
          recordCount: totalRecords,
          recentRecordCount: recentRecords,
          oldestRecord: paymentRecords.reduce((oldest, record) => 
            record.createdAt < oldest ? record.createdAt : oldest, 
            new Date()
          ),
          newestRecord: paymentRecords.reduce((newest, record) => 
            record.createdAt > newest ? record.createdAt : newest, 
            new Date(0)
          ),
          averageDaysPastDue: paymentRecords.reduce((sum, record) => sum + (record.daysPastDue || 0), 0) / totalRecords,
          onTimePaymentPercentage: (paymentRecords.filter(record => !record.daysPastDue || record.daysPastDue <= 0).length / totalRecords) * 100,
        },
        collectedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
      });
      
      return dataSource;
    } catch (error) {
      this.logger.error(`Error collecting payment history for buyer ${buyerId}: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Collect buyer profile data
   * @param assessmentId - ID of the assessment
   * @param buyerId - ID of the buyer
   * @param tenantId - Tenant ID
   * @returns Data source with buyer profile data or null if no data available
   */
  async collectBuyerProfileData(assessmentId: string, buyerId: string, tenantId: string): Promise<AssessmentDataSource> {
    this.logger.log(`Collecting profile data for buyer ${buyerId}`);
    
    try {
      // Get buyer profile
      const buyerProfile = await this.buyerProfileRepository.findOne({
        where: { buyerId, tenantId }
      });
      
      if (!buyerProfile) {
        this.logger.log(`No profile found for buyer ${buyerId}`);
        return null;
      }
      
      // Calculate data quality metrics
      let completenessScore = 0;
      let totalFields = 0;
      
      // Count non-null fields to calculate completeness
      Object.entries(buyerProfile).forEach(([key, value]) => {
        if (!['id', 'createdAt', 'updatedAt', 'tenantId', 'buyerId'].includes(key)) {
          totalFields++;
          if (value !== null && value !== undefined) {
            completenessScore++;
          }
        }
      });
      
      const dataCompleteness = Math.round((completenessScore / Math.max(1, totalFields)) * 100);
      
      // Calculate freshness based on last verified date
      const daysSinceVerification = buyerProfile.lastVerifiedAt 
        ? Math.floor((Date.now() - buyerProfile.lastVerifiedAt.getTime()) / (24 * 60 * 60 * 1000))
        : 365; // Default to a year if never verified
        
      const dataFreshness = Math.max(0, Math.min(100, 100 - Math.round(daysSinceVerification / 3.65))); // Scale to 0-100
      
      // Overall quality is average of completeness and freshness
      const dataQuality = Math.round((dataCompleteness + dataFreshness) / 2);
      
      // Create data source
      const dataSource = this.assessmentDataSourceRepository.create({
        assessmentId,
        tenantId,
        sourceType: DataSourceType.MANUAL_INPUT,
        sourceName: 'Buyer Profile',
        dataQuality,
        dataCompleteness,
        dataFreshness,
        weight: 20, // Profile data typically weighted less than payment history
        sourceMetadata: {
          lastVerified: buyerProfile.lastVerifiedAt,
          daysSinceVerification,
          businessAge: buyerProfile.yearEstablished 
            ? new Date().getFullYear() - buyerProfile.yearEstablished 
            : null,
          industry: buyerProfile.industrySector,
          businessSize: buyerProfile.businessSize,
          location: {
            city: buyerProfile.city,
            state: buyerProfile.state,
            country: buyerProfile.countryCode,
          }
        },
        collectedAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Expires in 90 days
      });
      
      return dataSource;
    } catch (error) {
      this.logger.error(`Error collecting profile data for buyer ${buyerId}: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Create a custom data source
   * @param createDto - DTO with data source information
   * @returns The created data source
   */
  async createDataSource(createDto: CreateAssessmentDataSourceDto): Promise<AssessmentDataSource> {
    const dataSource = this.assessmentDataSourceRepository.create(createDto);
    return await this.assessmentDataSourceRepository.save(dataSource);
  }

  /**
   * Get all data sources for an assessment
   * @param assessmentId - ID of the assessment
   * @param tenantId - Tenant ID for security
   * @returns Array of data sources
   */
  async getDataSourcesForAssessment(assessmentId: string, tenantId: string): Promise<AssessmentDataSource[]> {
    return this.assessmentDataSourceRepository.find({
      where: { assessmentId, tenantId }
    });
  }
}
