import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ExternalDataSource } from '../entities/external-data-source.entity';
import { DataSourceType } from '../enums/data-source-type.enum';
import { BuyerProfile } from '../entities/buyer-profile.entity';
import * as NodeCache from 'node-cache';

/**
 * Service for integrating with external credit bureaus and data sources
 * Provides a unified interface for fetching data from various external sources
 * with caching, error handling, and data normalization
 */
@Injectable()
export class ExternalDataService {
  private readonly logger = new Logger(ExternalDataService.name);
  private readonly cache: NodeCache;
  
  constructor(
    @InjectRepository(ExternalDataSource)
    private externalDataSourceRepository: Repository<ExternalDataSource>,
    private readonly configService: ConfigService,
  ) {
    // Initialize cache with default TTL of 1 hour
    this.cache = new NodeCache({
      stdTTL: 3600,
      checkperiod: 600,
      useClones: false,
    });
    
    this.logger.log('External Data Service initialized');
  }
  
  /**
   * Get credit bureau data for a buyer
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID for multi-tenancy support
   * @param forceRefresh Whether to bypass cache and fetch fresh data
   * @returns Credit bureau data for the buyer
   */
  async getCreditBureauData(buyerId: string, tenantId: string, forceRefresh = false): Promise<any> {
    this.logger.log(`Getting credit bureau data for buyer ${buyerId} in tenant ${tenantId}`);
    
    try {
      // Get active credit bureau data sources for the tenant
      const dataSources = await this.getActiveCreditBureauSources(tenantId);
      
      if (dataSources.length === 0) {
        this.logger.warn(`No active credit bureau sources found for tenant ${tenantId}`);
        return null;
      }
      
      // Get data from each source and merge
      const results = await Promise.all(
        dataSources.map(source => this.getDataFromSource(source, buyerId, tenantId, forceRefresh))
      );
      
      // Merge and normalize results
      const mergedData = this.mergeAndNormalizeData(results, dataSources);
      
      return mergedData;
    } catch (error) {
      this.logger.error(`Error getting credit bureau data: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Get financial data for a buyer
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID for multi-tenancy support
   * @param forceRefresh Whether to bypass cache and fetch fresh data
   * @returns Financial data for the buyer
   */
  async getFinancialData(buyerId: string, tenantId: string, forceRefresh = false): Promise<any> {
    this.logger.log(`Getting financial data for buyer ${buyerId} in tenant ${tenantId}`);
    
    try {
      // Get active financial data sources for the tenant
      const dataSources = await this.getActiveDataSourcesByType(tenantId, DataSourceType.FINANCIAL);
      
      if (dataSources.length === 0) {
        this.logger.warn(`No active financial data sources found for tenant ${tenantId}`);
        return null;
      }
      
      // Get data from each source and merge
      const results = await Promise.all(
        dataSources.map(source => this.getDataFromSource(source, buyerId, tenantId, forceRefresh))
      );
      
      // Merge and normalize results
      const mergedData = this.mergeAndNormalizeData(results, dataSources);
      
      return mergedData;
    } catch (error) {
      this.logger.error(`Error getting financial data: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Get public records data for a buyer
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID for multi-tenancy support
   * @param forceRefresh Whether to bypass cache and fetch fresh data
   * @returns Public records data for the buyer
   */
  async getPublicRecordsData(buyerId: string, tenantId: string, forceRefresh = false): Promise<any> {
    this.logger.log(`Getting public records data for buyer ${buyerId} in tenant ${tenantId}`);
    
    try {
      // Get active public records data sources for the tenant
      const dataSources = await this.getActiveDataSourcesByType(tenantId, DataSourceType.PUBLIC_RECORDS);
      
      if (dataSources.length === 0) {
        this.logger.warn(`No active public records data sources found for tenant ${tenantId}`);
        return null;
      }
      
      // Get data from each source and merge
      const results = await Promise.all(
        dataSources.map(source => this.getDataFromSource(source, buyerId, tenantId, forceRefresh))
      );
      
      // Merge and normalize results
      const mergedData = this.mergeAndNormalizeData(results, dataSources);
      
      return mergedData;
    } catch (error) {
      this.logger.error(`Error getting public records data: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Get news and media data for a buyer
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID for multi-tenancy support
   * @param forceRefresh Whether to bypass cache and fetch fresh data
   * @returns News and media data for the buyer
   */
  async getNewsAndMediaData(buyerId: string, tenantId: string, forceRefresh = false): Promise<any> {
    this.logger.log(`Getting news and media data for buyer ${buyerId} in tenant ${tenantId}`);
    
    try {
      // Get active news and media data sources for the tenant
      const dataSources = await this.getActiveDataSourcesByType(tenantId, DataSourceType.NEWS_MEDIA);
      
      if (dataSources.length === 0) {
        this.logger.warn(`No active news and media data sources found for tenant ${tenantId}`);
        return null;
      }
      
      // Get data from each source and merge
      const results = await Promise.all(
        dataSources.map(source => this.getDataFromSource(source, buyerId, tenantId, forceRefresh))
      );
      
      // Merge and normalize results
      const mergedData = this.mergeAndNormalizeData(results, dataSources);
      
      return mergedData;
    } catch (error) {
      this.logger.error(`Error getting news and media data: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Get comprehensive external data for a buyer
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID for multi-tenancy support
   * @param forceRefresh Whether to bypass cache and fetch fresh data
   * @returns Comprehensive external data for the buyer
   */
  async getComprehensiveData(buyerId: string, tenantId: string, forceRefresh = false): Promise<any> {
    this.logger.log(`Getting comprehensive data for buyer ${buyerId} in tenant ${tenantId}`);
    
    try {
      // Get all data types in parallel
      const [creditBureauData, financialData, publicRecordsData, newsAndMediaData] = await Promise.all([
        this.getCreditBureauData(buyerId, tenantId, forceRefresh),
        this.getFinancialData(buyerId, tenantId, forceRefresh),
        this.getPublicRecordsData(buyerId, tenantId, forceRefresh),
        this.getNewsAndMediaData(buyerId, tenantId, forceRefresh),
      ]);
      
      // Combine all data
      return {
        creditBureau: creditBureauData,
        financial: financialData,
        publicRecords: publicRecordsData,
        newsAndMedia: newsAndMediaData,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error getting comprehensive data: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Get active credit bureau data sources for a tenant
   * @param tenantId The tenant ID
   * @returns Array of active credit bureau data sources
   */
  private async getActiveCreditBureauSources(tenantId: string): Promise<ExternalDataSource[]> {
    return this.getActiveDataSourcesByType(tenantId, DataSourceType.CREDIT_BUREAU);
  }
  
  /**
   * Get active data sources by type for a tenant
   * @param tenantId The tenant ID
   * @param sourceType The data source type
   * @returns Array of active data sources of the specified type
   */
  private async getActiveDataSourcesByType(tenantId: string, sourceType: DataSourceType): Promise<ExternalDataSource[]> {
    return this.externalDataSourceRepository.find({
      where: {
        tenantId,
        sourceType,
        isActive: true,
        isHealthy: true,
      },
      order: {
        isDefault: 'DESC',
      },
    });
  }
  
  /**
   * Get data from a specific external source
   * @param source The external data source
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @param forceRefresh Whether to bypass cache and fetch fresh data
   * @returns Data from the external source
   */
  private async getDataFromSource(
    source: ExternalDataSource,
    buyerId: string,
    tenantId: string,
    forceRefresh: boolean,
  ): Promise<any> {
    const cacheKey = `${source.id}:${tenantId}:${buyerId}`;
    
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return cachedData;
      }
    }
    
    this.logger.debug(`Cache miss or force refresh for ${cacheKey}, fetching from source`);
    
    try {
      // Get buyer profile data needed for external API calls
      const buyerProfile = await this.getBuyerProfile(buyerId, tenantId);
      
      if (!buyerProfile) {
        throw new Error(`Buyer profile not found for ${buyerId}`);
      }
      
      // Call the appropriate connector based on source type
      const startTime = Date.now();
      let data: any;
      
      switch (source.sourceType) {
        case DataSourceType.CREDIT_BUREAU:
          data = await this.callCreditBureauApi(source, buyerProfile);
          break;
        case DataSourceType.FINANCIAL:
          data = await this.callFinancialDataApi(source, buyerProfile);
          break;
        case DataSourceType.PUBLIC_RECORDS:
          data = await this.callPublicRecordsApi(source, buyerProfile);
          break;
        case DataSourceType.NEWS_MEDIA:
          data = await this.callNewsMediaApi(source, buyerProfile);
          break;
        default:
          throw new Error(`Unsupported data source type: ${source.sourceType}`);
      }
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Update source metrics
      await this.updateSourceMetrics(source, responseTime, false);
      
      // Cache the result
      const ttlSeconds = source.cacheTtlMinutes * 60;
      this.cache.set(cacheKey, data, ttlSeconds);
      
      return data;
    } catch (error) {
      this.logger.error(`Error fetching data from source ${source.name}: ${error.message}`, error.stack);
      
      // Update source metrics with error
      await this.updateSourceMetrics(source, 0, true);
      
      // Return null for this source, other sources might still succeed
      return null;
    }
  }
  
  /**
   * Get buyer profile data
   * @param buyerId The ID of the buyer
   * @param tenantId The tenant ID
   * @returns Buyer profile data
   */
  private async getBuyerProfile(buyerId: string, tenantId: string): Promise<any> {
    // This would be implemented to fetch from buyer profile repository
    // For now, return mock data
    return {
      id: buyerId,
      tenantId,
      legalName: 'Sample Company Ltd',
      registrationNumber: 'REG123456',
      taxId: 'TAX987654',
      address: {
        line1: '123 Business Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      incorporationDate: new Date('2010-01-01'),
      industryCode: 'MANUFACTURING',
    };
  }
  
  /**
   * Call credit bureau API
   * @param source The credit bureau data source
   * @param buyerProfile The buyer profile data
   * @returns Credit bureau data
   */
  private async callCreditBureauApi(source: ExternalDataSource, buyerProfile: any): Promise<any> {
    this.logger.debug(`Calling credit bureau API: ${source.name}`);
    
    // This would be implemented to call the actual API
    // For now, return mock data
    await this.simulateApiCall(source);
    
    return {
      source: source.name,
      creditScore: 750,
      scoreRange: {
        min: 300,
        max: 900,
      },
      scoreDate: new Date(),
      paymentHistory: {
        onTimePayments: 45,
        late30Days: 2,
        late60Days: 1,
        late90PlusDays: 0,
      },
      creditAccounts: {
        total: 5,
        open: 3,
        closed: 2,
      },
      derogatory: {
        bankruptcies: 0,
        liens: 0,
        judgments: 0,
      },
      inquiries: 3,
    };
  }
  
  /**
   * Call financial data API
   * @param source The financial data source
   * @param buyerProfile The buyer profile data
   * @returns Financial data
   */
  private async callFinancialDataApi(source: ExternalDataSource, buyerProfile: any): Promise<any> {
    this.logger.debug(`Calling financial data API: ${source.name}`);
    
    // This would be implemented to call the actual API
    // For now, return mock data
    await this.simulateApiCall(source);
    
    return {
      source: source.name,
      financialStatements: {
        income: {
          revenue: 5000000,
          costOfGoods: 3000000,
          grossProfit: 2000000,
          operatingExpenses: 1500000,
          operatingIncome: 500000,
          netIncome: 400000,
          year: 2024,
        },
        balance: {
          totalAssets: 3000000,
          totalLiabilities: 1800000,
          equity: 1200000,
          currentAssets: 1500000,
          currentLiabilities: 900000,
          year: 2024,
        },
        cashFlow: {
          operatingCashFlow: 600000,
          investingCashFlow: -200000,
          financingCashFlow: -100000,
          netCashFlow: 300000,
          year: 2024,
        },
      },
      ratios: {
        currentRatio: 1.67,
        quickRatio: 1.2,
        debtToEquity: 1.5,
        returnOnAssets: 0.13,
        returnOnEquity: 0.33,
      },
    };
  }
  
  /**
   * Call public records API
   * @param source The public records data source
   * @param buyerProfile The buyer profile data
   * @returns Public records data
   */
  private async callPublicRecordsApi(source: ExternalDataSource, buyerProfile: any): Promise<any> {
    this.logger.debug(`Calling public records API: ${source.name}`);
    
    // This would be implemented to call the actual API
    // For now, return mock data
    await this.simulateApiCall(source);
    
    return {
      source: source.name,
      registrationDetails: {
        status: 'ACTIVE',
        registrationDate: '2010-01-01',
        lastFilingDate: '2023-12-15',
      },
      legalProceedings: {
        pendingLawsuits: 0,
        judgments: 0,
        liens: 0,
      },
      regulatoryCompliance: {
        status: 'COMPLIANT',
        lastInspectionDate: '2023-06-10',
        violations: 0,
      },
      directors: [
        {
          name: 'John Smith',
          position: 'Director',
          appointmentDate: '2010-01-01',
        },
        {
          name: 'Jane Doe',
          position: 'Director',
          appointmentDate: '2015-03-15',
        },
      ],
    };
  }
  
  /**
   * Call news and media API
   * @param source The news and media data source
   * @param buyerProfile The buyer profile data
   * @returns News and media data
   */
  private async callNewsMediaApi(source: ExternalDataSource, buyerProfile: any): Promise<any> {
    this.logger.debug(`Calling news and media API: ${source.name}`);
    
    // This would be implemented to call the actual API
    // For now, return mock data
    await this.simulateApiCall(source);
    
    return {
      source: source.name,
      articles: [
        {
          title: 'Sample Company Announces New Product Line',
          source: 'Business Daily',
          date: '2023-11-15',
          sentiment: 'POSITIVE',
          url: 'https://example.com/article1',
        },
        {
          title: 'Industry Growth Continues, Sample Company Among Leaders',
          source: 'Economic Times',
          date: '2023-09-22',
          sentiment: 'POSITIVE',
          url: 'https://example.com/article2',
        },
      ],
      sentiment: {
        overall: 'POSITIVE',
        score: 0.75,
      },
      socialMedia: {
        mentions: 120,
        positivePercentage: 80,
        negativePercentage: 5,
        neutralPercentage: 15,
      },
    };
  }
  
  /**
   * Simulate an API call with delay and potential errors
   * @param source The data source
   */
  private async simulateApiCall(source: ExternalDataSource): Promise<void> {
    // Simulate API call delay
    const delay = Math.floor(Math.random() * 500) + 100;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate occasional errors
    if (Math.random() < 0.05) {
      throw new Error(`Simulated API error for ${source.name}`);
    }
  }
  
  /**
   * Update metrics for a data source
   * @param source The data source
   * @param responseTimeMs Response time in milliseconds
   * @param isError Whether the call resulted in an error
   */
  private async updateSourceMetrics(
    source: ExternalDataSource,
    responseTimeMs: number,
    isError: boolean,
  ): Promise<void> {
    try {
      // Update call count and error count
      source.callCount += 1;
      if (isError) {
        source.errorCount += 1;
      }
      
      // Update average response time
      if (responseTimeMs > 0) {
        const totalResponseTime = source.averageResponseTimeMs * (source.callCount - 1) + responseTimeMs;
        source.averageResponseTimeMs = totalResponseTime / source.callCount;
      }
      
      // Save updates
      await this.externalDataSourceRepository.save(source);
    } catch (error) {
      this.logger.error(`Error updating source metrics: ${error.message}`, error.stack);
      // Non-critical error, don't throw
    }
  }
  
  /**
   * Merge and normalize data from multiple sources
   * @param results Array of results from different sources
   * @param dataSources Array of data sources
   * @returns Merged and normalized data
   */
  private mergeAndNormalizeData(results: any[], dataSources: ExternalDataSource[]): any {
    // Filter out null results
    const validResults = results.filter(result => result !== null);
    
    if (validResults.length === 0) {
      return null;
    }
    
    // If only one result, return it
    if (validResults.length === 1) {
      return validResults[0];
    }
    
    // For multiple results, merge based on source type
    const sourceType = dataSources[0].sourceType;
    
    switch (sourceType) {
      case DataSourceType.CREDIT_BUREAU:
        return this.mergeCreditBureauData(validResults);
      case DataSourceType.FINANCIAL:
        return this.mergeFinancialData(validResults);
      case DataSourceType.PUBLIC_RECORDS:
        return this.mergePublicRecordsData(validResults);
      case DataSourceType.NEWS_MEDIA:
        return this.mergeNewsMediaData(validResults);
      default:
        // Default to returning the first result
        return validResults[0];
    }
  }
  
  /**
   * Merge credit bureau data from multiple sources
   * @param results Array of credit bureau results
   * @returns Merged credit bureau data
   */
  private mergeCreditBureauData(results: any[]): any {
    // This would implement a more sophisticated merging strategy
    // For now, use a simple approach
    
    // Start with the first result
    const merged = { ...results[0] };
    
    // Add sources array
    merged.sources = results.map(result => result.source);
    
    // Calculate average credit score
    merged.creditScore = Math.round(
      results.reduce((sum, result) => sum + result.creditScore, 0) / results.length
    );
    
    // Use the most recent score date
    merged.scoreDate = results.reduce(
      (latest, result) => (result.scoreDate > latest ? result.scoreDate : latest),
      new Date(0)
    );
    
    // Merge payment history
    merged.paymentHistory = {
      onTimePayments: Math.max(...results.map(r => r.paymentHistory.onTimePayments)),
      late30Days: Math.max(...results.map(r => r.paymentHistory.late30Days)),
      late60Days: Math.max(...results.map(r => r.paymentHistory.late60Days)),
      late90PlusDays: Math.max(...results.map(r => r.paymentHistory.late90PlusDays)),
    };
    
    return merged;
  }
  
  /**
   * Merge financial data from multiple sources
   * @param results Array of financial data results
   * @returns Merged financial data
   */
  private mergeFinancialData(results: any[]): any {
    // Simple merge strategy for now
    const merged = { ...results[0] };
    merged.sources = results.map(result => result.source);
    return merged;
  }
  
  /**
   * Merge public records data from multiple sources
   * @param results Array of public records results
   * @returns Merged public records data
   */
  private mergePublicRecordsData(results: any[]): any {
    // Simple merge strategy for now
    const merged = { ...results[0] };
    merged.sources = results.map(result => result.source);
    
    // Merge legal proceedings
    merged.legalProceedings = {
      pendingLawsuits: Math.max(...results.map(r => r.legalProceedings.pendingLawsuits)),
      judgments: Math.max(...results.map(r => r.legalProceedings.judgments)),
      liens: Math.max(...results.map(r => r.legalProceedings.liens)),
    };
    
    return merged;
  }
  
  /**
   * Merge news and media data from multiple sources
   * @param results Array of news and media results
   * @returns Merged news and media data
   */
  private mergeNewsMediaData(results: any[]): any {
    // Simple merge strategy for now
    const merged = { ...results[0] };
    merged.sources = results.map(result => result.source);
    
    // Merge articles
    merged.articles = results.flatMap(result => result.articles);
    
    // Calculate average sentiment
    const sentiments = results.map(r => r.sentiment.score);
    merged.sentiment.score = sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length;
    
    return merged;
  }
  
  /**
   * Register a new external data source
   * @param dataSource The data source to register
   * @returns The registered data source
   */
  async registerDataSource(dataSource: ExternalDataSource): Promise<ExternalDataSource> {
    this.logger.log(`Registering new data source: ${dataSource.name} (${dataSource.sourceType})`);
    
    try {
      // Validate the data source
      this.validateDataSource(dataSource);
      
      // Check if this is set as default
      if (dataSource.isDefault) {
        // Unset default flag on other sources of the same type
        await this.unsetDefaultForType(dataSource.tenantId, dataSource.sourceType);
      }
      
      // Save the data source
      const savedSource = await this.externalDataSourceRepository.save(dataSource);
      
      // Test the connection
      await this.testDataSourceConnection(savedSource);
      
      return savedSource;
    } catch (error) {
      this.logger.error(`Error registering data source: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Validate a data source
   * @param dataSource The data source to validate
   */
  private validateDataSource(dataSource: ExternalDataSource): void {
    if (!dataSource.name) {
      throw new Error('Data source name is required');
    }
    
    if (!dataSource.sourceType) {
      throw new Error('Data source type is required');
    }
    
    if (!dataSource.baseUrl) {
      throw new Error('Data source base URL is required');
    }
    
    if (!dataSource.tenantId) {
      throw new Error('Tenant ID is required');
    }
    
    // Validate URL format
    try {
      new URL(dataSource.baseUrl);
    } catch (error) {
      throw new Error('Invalid base URL format');
    }
  }
  
  /**
   * Unset default flag for all sources of a specific type
   * @param tenantId The tenant ID
   * @param sourceType The source type
   */
  private async unsetDefaultForType(tenantId: string, sourceType: DataSourceType): Promise<void> {
    await this.externalDataSourceRepository.update(
      {
        tenantId,
        sourceType,
        isDefault: true,
      },
      {
        isDefault: false,
      }
    );
  }
  
  /**
   * Test the connection to a data source
   * @param dataSource The data source to test
   */
  private async testDataSourceConnection(dataSource: ExternalDataSource): Promise<void> {
    this.logger.log(`Testing connection to data source: ${dataSource.name}`);
    
    try {
      // This would implement actual connection testing
      // For now, simulate a test
      await this.simulateApiCall(dataSource);
      
      // Update health status
      dataSource.isHealthy = true;
      dataSource.lastHealthCheckAt = new Date();
      await this.externalDataSourceRepository.save(dataSource);
    } catch (error) {
      this.logger.error(`Connection test failed for ${dataSource.name}: ${error.message}`);
      
      // Update health status
      dataSource.isHealthy = false;
      dataSource.lastHealthCheckAt = new Date();
      await this.externalDataSourceRepository.save(dataSource);
      
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }
  
  /**
   * Update an existing data source
   * @param id The ID of the data source to update
   * @param updates The updates to apply
   * @returns The updated data source
   */
  async updateDataSource(id: string, updates: Partial<ExternalDataSource>): Promise<ExternalDataSource> {
    this.logger.log(`Updating data source with ID ${id}`);
    
    try {
      // Get the existing data source
      const dataSource = await this.externalDataSourceRepository.findOne({ where: { id } });
      
      if (!dataSource) {
        throw new Error(`Data source with ID ${id} not found`);
      }
      
      // Apply updates
      Object.assign(dataSource, updates);
      
      // Validate the updated data source
      this.validateDataSource(dataSource);
      
      // Check if this is set as default
      if (dataSource.isDefault) {
        // Unset default flag on other sources of the same type
        await this.unsetDefaultForType(dataSource.tenantId, dataSource.sourceType);
      }
      
      // Save the updated data source
      const savedSource = await this.externalDataSourceRepository.save(dataSource);
      
      // Clear cache for this source
      this.clearCacheForSource(id);
      
      return savedSource;
    } catch (error) {
      this.logger.error(`Error updating data source: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Delete a data source
   * @param id The ID of the data source to delete
   */
  async deleteDataSource(id: string): Promise<void> {
    this.logger.log(`Deleting data source with ID ${id}`);
    
    try {
      // Get the data source
      const dataSource = await this.externalDataSourceRepository.findOne({ where: { id } });
      
      if (!dataSource) {
        throw new Error(`Data source with ID ${id} not found`);
      }
      
      // Delete the data source
      await this.externalDataSourceRepository.remove(dataSource);
      
      // Clear cache for this source
      this.clearCacheForSource(id);
    } catch (error) {
      this.logger.error(`Error deleting data source: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Clear cache for a specific data source
   * @param sourceId The ID of the data source
   */
  private clearCacheForSource(sourceId: string): void {
    this.logger.debug(`Clearing cache for data source ${sourceId}`);
    
    // Get all cache keys
    const keys = this.cache.keys();
    
    // Filter keys for this source
    const sourceKeys = keys.filter(key => key.startsWith(`${sourceId}:`));
    
    // Delete matching keys
    if (sourceKeys.length > 0) {
      this.cache.del(sourceKeys);
      this.logger.debug(`Cleared ${sourceKeys.length} cache entries for source ${sourceId}`);
    }
  }
  
  /**
   * Run health checks on all data sources
   */
  async runHealthChecks(): Promise<void> {
    this.logger.log('Running health checks on all data sources');
    
    try {
      // Get all active data sources
      const dataSources = await this.externalDataSourceRepository.find({
        where: { isActive: true },
      });
      
      this.logger.log(`Found ${dataSources.length} active data sources to check`);
      
      // Run health checks in parallel
      await Promise.all(
        dataSources.map(async (source) => {
          try {
            await this.testDataSourceConnection(source);
            this.logger.debug(`Health check passed for ${source.name}`);
          } catch (error) {
            this.logger.warn(`Health check failed for ${source.name}: ${error.message}`);
            // Error already handled in testDataSourceConnection
          }
        })
      );
      
      this.logger.log('Health checks completed');
    } catch (error) {
      this.logger.error(`Error running health checks: ${error.message}`, error.stack);
      throw error;
    }
  }
}
