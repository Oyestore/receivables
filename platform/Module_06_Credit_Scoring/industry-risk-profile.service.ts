import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { IndustryRiskProfile } from '../entities/industry-risk-profile.entity';
import { RegionalRiskAdjustment } from '../entities/regional-risk-adjustment.entity';
import { IndustryRiskFactor } from '../entities/industry-risk-factor.entity';

/**
 * Service responsible for managing industry risk profiles.
 * This service provides functionality for creating, retrieving, and managing industry-specific risk profiles.
 */
@Injectable()
export class IndustryRiskProfileService {
  private readonly logger = new Logger(IndustryRiskProfileService.name);

  constructor(
    @InjectRepository(IndustryRiskProfile)
    private industryRiskProfileRepository: Repository<IndustryRiskProfile>,
    @InjectRepository(RegionalRiskAdjustment)
    private regionalRiskAdjustmentRepository: Repository<RegionalRiskAdjustment>,
    @InjectRepository(IndustryRiskFactor)
    private industryRiskFactorRepository: Repository<IndustryRiskFactor>,
  ) {}

  /**
   * Create a new industry risk profile
   * @param createDto - Data for creating the industry risk profile
   * @returns The created industry risk profile
   */
  async create(createDto: any): Promise<IndustryRiskProfile> {
    this.logger.log(`Creating industry risk profile for industry code ${createDto.industryCode}`);
    
    const profile = this.industryRiskProfileRepository.create({
      ...createDto,
      isActive: true,
      version: '1.0',
    });
    
    return await this.industryRiskProfileRepository.save(profile);
  }

  /**
   * Find all industry risk profiles for a tenant
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns Array of industry risk profiles
   */
  async findAll(tenantId: string, filters?: any): Promise<IndustryRiskProfile[]> {
    const where: FindOptionsWhere<IndustryRiskProfile> = { tenantId };
    
    // Apply additional filters if provided
    if (filters) {
      if (filters.industryCode) {
        where.industryCode = filters.industryCode;
      }
      if (filters.industrySector) {
        where.industrySector = filters.industrySector;
      }
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
    }
    
    return await this.industryRiskProfileRepository.find({
      where,
      order: { industryName: 'ASC' },
    });
  }

  /**
   * Find an industry risk profile by ID
   * @param id - Profile ID
   * @param tenantId - Tenant ID
   * @returns The industry risk profile or null if not found
   */
  async findOne(id: string, tenantId: string): Promise<IndustryRiskProfile> {
    return await this.industryRiskProfileRepository.findOne({
      where: { id, tenantId },
    });
  }

  /**
   * Find an industry risk profile by industry code
   * @param industryCode - Industry code
   * @param tenantId - Tenant ID
   * @returns The industry risk profile or null if not found
   */
  async findByIndustryCode(industryCode: string, tenantId: string): Promise<IndustryRiskProfile> {
    return await this.industryRiskProfileRepository.findOne({
      where: { industryCode, tenantId, isActive: true },
    });
  }

  /**
   * Update an industry risk profile
   * @param id - Profile ID
   * @param updateDto - Data for updating the profile
   * @param tenantId - Tenant ID
   * @returns The updated industry risk profile
   */
  async update(id: string, updateDto: any, tenantId: string): Promise<IndustryRiskProfile> {
    this.logger.log(`Updating industry risk profile ${id}`);
    
    // Check if profile exists
    const profile = await this.findOne(id, tenantId);
    if (!profile) {
      throw new Error(`Industry risk profile with ID ${id} not found`);
    }
    
    // Update version if significant changes
    let newVersion = profile.version;
    if (updateDto.baseRiskLevel !== undefined || 
        updateDto.defaultRatePercentage !== undefined ||
        updateDto.riskFactors !== undefined) {
      // Increment version number
      const versionParts = profile.version.split('.');
      const minor = parseInt(versionParts[1]) + 1;
      newVersion = `${versionParts[0]}.${minor}`;
    }
    
    // Update the profile
    await this.industryRiskProfileRepository.update(
      { id, tenantId },
      {
        ...updateDto,
        version: newVersion,
        updatedAt: new Date(),
      }
    );
    
    return await this.findOne(id, tenantId);
  }

  /**
   * Delete an industry risk profile
   * @param id - Profile ID
   * @param tenantId - Tenant ID
   * @returns True if deleted successfully
   */
  async remove(id: string, tenantId: string): Promise<boolean> {
    this.logger.log(`Deleting industry risk profile ${id}`);
    
    const result = await this.industryRiskProfileRepository.delete({ id, tenantId });
    return result.affected > 0;
  }

  /**
   * Get regional adjustments for an industry risk profile
   * @param profileId - Industry risk profile ID
   * @param tenantId - Tenant ID
   * @returns Array of regional risk adjustments
   */
  async getRegionalAdjustments(profileId: string, tenantId: string): Promise<RegionalRiskAdjustment[]> {
    return await this.regionalRiskAdjustmentRepository.find({
      where: { industryRiskProfileId: profileId, tenantId, isActive: true },
      order: { regionName: 'ASC' },
    });
  }

  /**
   * Get regional adjustment for a specific region
   * @param profileId - Industry risk profile ID
   * @param regionCode - Region code
   * @param tenantId - Tenant ID
   * @returns The regional risk adjustment or null if not found
   */
  async getRegionalAdjustmentForRegion(
    profileId: string,
    regionCode: string,
    tenantId: string,
  ): Promise<RegionalRiskAdjustment> {
    return await this.regionalRiskAdjustmentRepository.findOne({
      where: { 
        industryRiskProfileId: profileId, 
        regionCode, 
        tenantId, 
        isActive: true 
      },
    });
  }

  /**
   * Create a regional adjustment for an industry risk profile
   * @param createDto - Data for creating the regional adjustment
   * @returns The created regional risk adjustment
   */
  async createRegionalAdjustment(createDto: any): Promise<RegionalRiskAdjustment> {
    this.logger.log(`Creating regional adjustment for industry profile ${createDto.industryRiskProfileId} and region ${createDto.regionCode}`);
    
    const adjustment = this.regionalRiskAdjustmentRepository.create({
      ...createDto,
      isActive: true,
    });
    
    return await this.regionalRiskAdjustmentRepository.save(adjustment);
  }

  /**
   * Update a regional adjustment
   * @param id - Adjustment ID
   * @param updateDto - Data for updating the adjustment
   * @param tenantId - Tenant ID
   * @returns The updated regional risk adjustment
   */
  async updateRegionalAdjustment(id: string, updateDto: any, tenantId: string): Promise<RegionalRiskAdjustment> {
    this.logger.log(`Updating regional adjustment ${id}`);
    
    await this.regionalRiskAdjustmentRepository.update(
      { id, tenantId },
      {
        ...updateDto,
        updatedAt: new Date(),
      }
    );
    
    return await this.regionalRiskAdjustmentRepository.findOne({
      where: { id, tenantId },
    });
  }

  /**
   * Get risk factors for an industry risk profile
   * @param profileId - Industry risk profile ID
   * @param tenantId - Tenant ID
   * @returns Array of industry risk factors
   */
  async getRiskFactors(profileId: string, tenantId: string): Promise<IndustryRiskFactor[]> {
    return await this.industryRiskFactorRepository.find({
      where: { industryRiskProfileId: profileId, tenantId, isActive: true },
      order: { factorCategory: 'ASC', weight: 'DESC' },
    });
  }

  /**
   * Create a risk factor for an industry risk profile
   * @param createDto - Data for creating the risk factor
   * @returns The created industry risk factor
   */
  async createRiskFactor(createDto: any): Promise<IndustryRiskFactor> {
    this.logger.log(`Creating risk factor for industry profile ${createDto.industryRiskProfileId}`);
    
    // Calculate risk score from impact and likelihood
    const riskScore = createDto.impactLevel * createDto.likelihoodLevel;
    
    const factor = this.industryRiskFactorRepository.create({
      ...createDto,
      riskScore,
      isActive: true,
    });
    
    return await this.industryRiskFactorRepository.save(factor);
  }

  /**
   * Update a risk factor
   * @param id - Factor ID
   * @param updateDto - Data for updating the factor
   * @param tenantId - Tenant ID
   * @returns The updated industry risk factor
   */
  async updateRiskFactor(id: string, updateDto: any, tenantId: string): Promise<IndustryRiskFactor> {
    this.logger.log(`Updating risk factor ${id}`);
    
    // Recalculate risk score if impact or likelihood changed
    if (updateDto.impactLevel !== undefined || updateDto.likelihoodLevel !== undefined) {
      const factor = await this.industryRiskFactorRepository.findOne({
        where: { id, tenantId },
      });
      
      if (factor) {
        const impactLevel = updateDto.impactLevel !== undefined ? updateDto.impactLevel : factor.impactLevel;
        const likelihoodLevel = updateDto.likelihoodLevel !== undefined ? updateDto.likelihoodLevel : factor.likelihoodLevel;
        updateDto.riskScore = impactLevel * likelihoodLevel;
      }
    }
    
    await this.industryRiskFactorRepository.update(
      { id, tenantId },
      {
        ...updateDto,
        updatedAt: new Date(),
      }
    );
    
    return await this.industryRiskFactorRepository.findOne({
      where: { id, tenantId },
    });
  }

  /**
   * Get industry risk profiles by sector
   * @param sector - Industry sector
   * @param tenantId - Tenant ID
   * @returns Array of industry risk profiles in the sector
   */
  async getProfilesBySector(sector: string, tenantId: string): Promise<IndustryRiskProfile[]> {
    return await this.industryRiskProfileRepository.find({
      where: { industrySector: sector, tenantId, isActive: true },
      order: { industryName: 'ASC' },
    });
  }

  /**
   * Get high-risk industry profiles
   * @param tenantId - Tenant ID
   * @param threshold - Risk level threshold (default: 7)
   * @returns Array of high-risk industry profiles
   */
  async getHighRiskProfiles(tenantId: string, threshold: number = 7): Promise<IndustryRiskProfile[]> {
    return await this.industryRiskProfileRepository.find({
      where: { tenantId, isActive: true, baseRiskLevel: MoreThanOrEqual(threshold) },
      order: { baseRiskLevel: 'DESC' },
    });
  }

  /**
   * Get low-risk industry profiles
   * @param tenantId - Tenant ID
   * @param threshold - Risk level threshold (default: 3)
   * @returns Array of low-risk industry profiles
   */
  async getLowRiskProfiles(tenantId: string, threshold: number = 3): Promise<IndustryRiskProfile[]> {
    return await this.industryRiskProfileRepository.find({
      where: { tenantId, isActive: true, baseRiskLevel: LessThanOrEqual(threshold) },
      order: { baseRiskLevel: 'ASC' },
    });
  }
}
