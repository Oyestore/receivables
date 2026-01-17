import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { CreditLimit } from '../entities/credit-limit.entity';
import { CreditLimitApproval } from '../entities/credit-limit-approval.entity';
import { CreditLimitHistory } from '../entities/credit-limit-history.entity';
import { CreditLimitCalculationService } from './credit-limit-calculation.service';

/**
 * Service responsible for credit limit management.
 * This service provides functionality for creating, updating, and managing credit limits.
 */
@Injectable()
export class CreditLimitService {
  private readonly logger = new Logger(CreditLimitService.name);

  constructor(
    @InjectRepository(CreditLimit)
    private creditLimitRepository: Repository<CreditLimit>,
    @InjectRepository(CreditLimitApproval)
    private creditLimitApprovalRepository: Repository<CreditLimitApproval>,
    @InjectRepository(CreditLimitHistory)
    private creditLimitHistoryRepository: Repository<CreditLimitHistory>,
    private creditLimitCalculationService: CreditLimitCalculationService,
  ) {}

  /**
   * Create a new credit limit
   * @param createDto - Data for creating the credit limit
   * @returns The created credit limit
   */
  async create(createDto: any): Promise<CreditLimit> {
    this.logger.log(`Creating credit limit for buyer ${createDto.buyerId}`);
    
    // Check if active credit limit already exists
    const existingLimit = await this.findActiveLimitByBuyer(createDto.buyerId, createDto.tenantId);
    
    if (existingLimit) {
      throw new Error(`Active credit limit already exists for buyer ${createDto.buyerId}`);
    }
    
    // Calculate available credit
    const availableCredit = createDto.approvedLimit - (createDto.currentUtilization || 0);
    
    // Create credit limit
    const creditLimit = this.creditLimitRepository.create({
      ...createDto,
      availableCredit,
      utilizationPercentage: createDto.approvedLimit > 0 
        ? Math.round((createDto.currentUtilization || 0) * 100 / createDto.approvedLimit) 
        : 0,
      isActive: true,
    });
    
    const savedLimit = await this.creditLimitRepository.save(creditLimit);
    
    // Create history entry
    await this.createHistoryEntry({
      creditLimitId: savedLimit.id,
      buyerId: savedLimit.buyerId,
      tenantId: savedLimit.tenantId,
      changeType: 'created',
      previousLimit: null,
      newLimit: savedLimit.approvedLimit,
      currencyCode: savedLimit.currencyCode,
      changeAmount: savedLimit.approvedLimit,
      previousStatus: null,
      newStatus: savedLimit.status,
      changeReason: 'Initial credit limit creation',
      changedBy: createDto.createdBy,
      changedByName: createDto.createdByName || 'System',
      notes: `Initial credit limit of ${savedLimit.approvedLimit} ${savedLimit.currencyCode} created`,
    });
    
    return savedLimit;
  }

  /**
   * Find all credit limits for a tenant
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns Array of credit limits
   */
  async findAll(tenantId: string, filters?: any): Promise<CreditLimit[]> {
    const where: FindOptionsWhere<CreditLimit> = { tenantId };
    
    // Apply additional filters if provided
    if (filters) {
      if (filters.buyerId) {
        where.buyerId = filters.buyerId;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
    }
    
    return await this.creditLimitRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find a credit limit by ID
   * @param id - Credit limit ID
   * @param tenantId - Tenant ID
   * @returns The credit limit or null if not found
   */
  async findOne(id: string, tenantId: string): Promise<CreditLimit> {
    return await this.creditLimitRepository.findOne({
      where: { id, tenantId },
    });
  }

  /**
   * Find active credit limit for a buyer
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @returns The active credit limit or null if not found
   */
  async findActiveLimitByBuyer(buyerId: string, tenantId: string): Promise<CreditLimit> {
    return await this.creditLimitRepository.findOne({
      where: { buyerId, tenantId, isActive: true },
    });
  }

  /**
   * Update a credit limit
   * @param id - Credit limit ID
   * @param updateDto - Data for updating the credit limit
   * @param tenantId - Tenant ID
   * @returns The updated credit limit
   */
  async update(id: string, updateDto: any, tenantId: string): Promise<CreditLimit> {
    this.logger.log(`Updating credit limit ${id}`);
    
    // Check if credit limit exists
    const creditLimit = await this.findOne(id, tenantId);
    if (!creditLimit) {
      throw new Error(`Credit limit with ID ${id} not found`);
    }
    
    // Create history entry if approved limit is changing
    if (updateDto.approvedLimit !== undefined && updateDto.approvedLimit !== creditLimit.approvedLimit) {
      await this.createHistoryEntry({
        creditLimitId: id,
        buyerId: creditLimit.buyerId,
        tenantId,
        changeType: 'updated',
        previousLimit: creditLimit.approvedLimit,
        newLimit: updateDto.approvedLimit,
        currencyCode: creditLimit.currencyCode,
        changeAmount: updateDto.approvedLimit - creditLimit.approvedLimit,
        changePercentage: creditLimit.approvedLimit > 0 
          ? ((updateDto.approvedLimit - creditLimit.approvedLimit) * 100 / creditLimit.approvedLimit)
          : null,
        previousStatus: creditLimit.status,
        newStatus: updateDto.status || creditLimit.status,
        changeReason: updateDto.changeReason || 'Credit limit update',
        changedBy: updateDto.updatedBy,
        changedByName: updateDto.updatedByName || 'System',
        notes: updateDto.notes || `Credit limit updated from ${creditLimit.approvedLimit} to ${updateDto.approvedLimit} ${creditLimit.currencyCode}`,
      });
    }
    
    // Update utilization metrics if needed
    if (updateDto.currentUtilization !== undefined || updateDto.approvedLimit !== undefined) {
      const currentUtilization = updateDto.currentUtilization !== undefined 
        ? updateDto.currentUtilization 
        : creditLimit.currentUtilization;
        
      const approvedLimit = updateDto.approvedLimit !== undefined
        ? updateDto.approvedLimit
        : creditLimit.approvedLimit;
      
      updateDto.availableCredit = approvedLimit - currentUtilization;
      updateDto.utilizationPercentage = approvedLimit > 0 
        ? Math.round(currentUtilization * 100 / approvedLimit) 
        : 0;
    }
    
    // Update the credit limit
    await this.creditLimitRepository.update(
      { id, tenantId },
      {
        ...updateDto,
        updatedAt: new Date(),
      }
    );
    
    return await this.findOne(id, tenantId);
  }

  /**
   * Deactivate a credit limit
   * @param id - Credit limit ID
   * @param tenantId - Tenant ID
   * @param reason - Reason for deactivation
   * @param userId - User ID performing the deactivation
   * @returns True if deactivated successfully
   */
  async deactivate(id: string, tenantId: string, reason: string, userId?: string): Promise<boolean> {
    this.logger.log(`Deactivating credit limit ${id}`);
    
    // Check if credit limit exists
    const creditLimit = await this.findOne(id, tenantId);
    if (!creditLimit) {
      throw new Error(`Credit limit with ID ${id} not found`);
    }
    
    // Create history entry
    await this.createHistoryEntry({
      creditLimitId: id,
      buyerId: creditLimit.buyerId,
      tenantId,
      changeType: 'deactivated',
      previousLimit: creditLimit.approvedLimit,
      newLimit: 0,
      currencyCode: creditLimit.currencyCode,
      changeAmount: -creditLimit.approvedLimit,
      previousStatus: creditLimit.status,
      newStatus: 'inactive',
      changeReason: reason || 'Credit limit deactivation',
      changedBy: userId,
      changedByName: 'User',
      notes: `Credit limit deactivated: ${reason}`,
    });
    
    // Update the credit limit
    await this.creditLimitRepository.update(
      { id, tenantId },
      {
        isActive: false,
        status: 'inactive',
        updatedAt: new Date(),
        updatedBy: userId,
      }
    );
    
    return true;
  }

  /**
   * Apply temporary increase to credit limit
   * @param id - Credit limit ID
   * @param tenantId - Tenant ID
   * @param increaseAmount - Amount to increase
   * @param expiryDate - Expiry date for the increase
   * @param reason - Reason for the increase
   * @param userId - User ID applying the increase
   * @returns The updated credit limit
   */
  async applyTemporaryIncrease(
    id: string,
    tenantId: string,
    increaseAmount: number,
    expiryDate: Date,
    reason: string,
    userId?: string,
  ): Promise<CreditLimit> {
    this.logger.log(`Applying temporary increase of ${increaseAmount} to credit limit ${id}`);
    
    // Check if credit limit exists
    const creditLimit = await this.findOne(id, tenantId);
    if (!creditLimit) {
      throw new Error(`Credit limit with ID ${id} not found`);
    }
    
    // Create history entry
    await this.createHistoryEntry({
      creditLimitId: id,
      buyerId: creditLimit.buyerId,
      tenantId,
      changeType: 'temporary-increase',
      previousLimit: creditLimit.approvedLimit,
      newLimit: creditLimit.approvedLimit + increaseAmount,
      currencyCode: creditLimit.currencyCode,
      changeAmount: increaseAmount,
      changePercentage: (increaseAmount * 100 / creditLimit.approvedLimit),
      previousStatus: creditLimit.status,
      newStatus: creditLimit.status,
      changeReason: reason || 'Temporary credit limit increase',
      changedBy: userId,
      changedByName: 'User',
      notes: `Temporary increase of ${increaseAmount} ${creditLimit.currencyCode} applied until ${expiryDate.toISOString().split('T')[0]}`,
      changeDetails: {
        temporaryIncrease: increaseAmount,
        expiryDate: expiryDate,
      },
    });
    
    // Update the credit limit
    const updatedLimit = await this.update(
      id,
      {
        temporaryIncrease: increaseAmount,
        temporaryIncreaseExpiry: expiryDate,
        availableCredit: creditLimit.availableCredit + increaseAmount,
        updatedBy: userId,
        notes: reason || 'Temporary credit limit increase',
      },
      tenantId
    );
    
    return updatedLimit;
  }

  /**
   * Remove temporary increase from credit limit
   * @param id - Credit limit ID
   * @param tenantId - Tenant ID
   * @param reason - Reason for removal
   * @param userId - User ID removing the increase
   * @returns The updated credit limit
   */
  async removeTemporaryIncrease(
    id: string,
    tenantId: string,
    reason: string,
    userId?: string,
  ): Promise<CreditLimit> {
    this.logger.log(`Removing temporary increase from credit limit ${id}`);
    
    // Check if credit limit exists
    const creditLimit = await this.findOne(id, tenantId);
    if (!creditLimit) {
      throw new Error(`Credit limit with ID ${id} not found`);
    }
    
    if (!creditLimit.temporaryIncrease) {
      throw new Error(`No temporary increase found for credit limit ${id}`);
    }
    
    // Create history entry
    await this.createHistoryEntry({
      creditLimitId: id,
      buyerId: creditLimit.buyerId,
      tenantId,
      changeType: 'remove-temporary-increase',
      previousLimit: creditLimit.approvedLimit + creditLimit.temporaryIncrease,
      newLimit: creditLimit.approvedLimit,
      currencyCode: creditLimit.currencyCode,
      changeAmount: -creditLimit.temporaryIncrease,
      changePercentage: (-creditLimit.temporaryIncrease * 100 / (creditLimit.approvedLimit + creditLimit.temporaryIncrease)),
      previousStatus: creditLimit.status,
      newStatus: creditLimit.status,
      changeReason: reason || 'Temporary credit limit increase removed',
      changedBy: userId,
      changedByName: 'User',
      notes: `Temporary increase of ${creditLimit.temporaryIncrease} ${creditLimit.currencyCode} removed: ${reason}`,
    });
    
    // Update the credit limit
    const updatedLimit = await this.update(
      id,
      {
        temporaryIncrease: 0,
        temporaryIncreaseExpiry: null,
        availableCredit: creditLimit.availableCredit - creditLimit.temporaryIncrease,
        updatedBy: userId,
        notes: reason || 'Temporary credit limit increase removed',
      },
      tenantId
    );
    
    return updatedLimit;
  }

  /**
   * Update credit limit utilization
   * @param id - Credit limit ID
   * @param tenantId - Tenant ID
   * @param utilizationAmount - Current utilization amount
   * @returns The updated credit limit
   */
  async updateUtilization(
    id: string,
    tenantId: string,
    utilizationAmount: number,
  ): Promise<CreditLimit> {
    this.logger.log(`Updating utilization for credit limit ${id} to ${utilizationAmount}`);
    
    // Check if credit limit exists
    const creditLimit = await this.findOne(id, tenantId);
    if (!creditLimit) {
      throw new Error(`Credit limit with ID ${id} not found`);
    }
    
    // Calculate total limit including temporary increase
    const totalLimit = creditLimit.approvedLimit + (creditLimit.temporaryIncrease || 0);
    
    // Calculate available credit
    const availableCredit = totalLimit - utilizationAmount;
    
    // Calculate utilization percentage
    const utilizationPercentage = totalLimit > 0 
      ? Math.round(utilizationAmount * 100 / totalLimit) 
      : 0;
    
    // Check if utilization exceeds limit
    if (utilizationAmount > totalLimit) {
      this.logger.warn(`Utilization ${utilizationAmount} exceeds total limit ${totalLimit} for credit limit ${id}`);
    }
    
    // Check if utilization exceeds alert threshold
    if (utilizationPercentage >= creditLimit.utilizationAlertThreshold) {
      this.logger.warn(`Utilization ${utilizationPercentage}% exceeds alert threshold ${creditLimit.utilizationAlertThreshold}% for credit limit ${id}`);
      // In a real implementation, would trigger alerts here
    }
    
    // Update the credit limit
    const updatedLimit = await this.update(
      id,
      {
        currentUtilization: utilizationAmount,
        availableCredit,
        utilizationPercentage,
      },
      tenantId
    );
    
    return updatedLimit;
  }

  /**
   * Get credit limit history
   * @param creditLimitId - Credit limit ID
   * @param tenantId - Tenant ID
   * @returns Array of credit limit history entries
   */
  async getHistory(creditLimitId: string, tenantId: string): Promise<CreditLimitHistory[]> {
    return await this.creditLimitHistoryRepository.find({
      where: { creditLimitId, tenantId },
      order: { changedAt: 'DESC' },
    });
  }

  /**
   * Create credit limit history entry
   * @param createDto - Data for creating the history entry
   * @returns The created history entry
   */
  private async createHistoryEntry(createDto: any): Promise<CreditLimitHistory> {
    const historyEntry = this.creditLimitHistoryRepository.create(createDto);
    return await this.creditLimitHistoryRepository.save(historyEntry);
  }

  /**
   * Calculate and create new credit limit for a buyer
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @param options - Calculation options
   * @returns The created credit limit
   */
  async calculateAndCreateLimit(
    buyerId: string,
    tenantId: string,
    options: any = {},
  ): Promise<CreditLimit> {
    this.logger.log(`Calculating and creating credit limit for buyer ${buyerId}`);
    
    // Calculate recommended limit
    const calculationResult = await this.creditLimitCalculationService.calculateRecommendedLimit(
      buyerId,
      tenantId,
      options
    );
    
    // Create credit limit with pending status
    const creditLimit = await this.create({
      ...calculationResult,
      status: 'pending',
      currentUtilization: 0,
      createdBy: options.userId,
    });
    
    return creditLimit;
  }

  /**
   * Check if buyer has sufficient available credit
   * @param buyerId - Buyer ID
   * @param tenantId - Tenant ID
   * @param amount - Amount to check
   * @returns True if sufficient credit is available
   */
  async hasSufficientCredit(
    buyerId: string,
    tenantId: string,
    amount: number,
  ): Promise<boolean> {
    // Get active credit limit
    const creditLimit = await this.findActiveLimitByBuyer(buyerId, tenantId);
    
    if (!creditLimit) {
      return false;
    }
    
    // Check if credit limit is approved
    if (creditLimit.status !== 'approved') {
      return false;
    }
    
    // Calculate total limit including temporary increase
    const totalLimit = creditLimit.approvedLimit + (creditLimit.temporaryIncrease || 0);
    
    // Check if amount exceeds available credit
    return amount <= creditLimit.availableCredit;
  }

  /**
   * Get expiring credit limits
   * @param tenantId - Tenant ID
   * @param daysThreshold - Days threshold (default: 30)
   * @returns Array of expiring credit limits
   */
  async getExpiringLimits(tenantId: string, daysThreshold: number = 30): Promise<CreditLimit[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    
    return await this.creditLimitRepository.find({
      where: {
        tenantId,
        isActive: true,
        expiryDate: LessThanOrEqual(thresholdDate),
      },
      order: { expiryDate: 'ASC' },
    });
  }

  /**
   * Get limits due for review
   * @param tenantId - Tenant ID
   * @param daysThreshold - Days threshold (default: 7)
   * @returns Array of limits due for review
   */
  async getLimitsDueForReview(tenantId: string, daysThreshold: number = 7): Promise<CreditLimit[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    
    return await this.creditLimitRepository.find({
      where: {
        tenantId,
        isActive: true,
        reviewDate: LessThanOrEqual(thresholdDate),
      },
      order: { reviewDate: 'ASC' },
    });
  }

  /**
   * Get high utilization limits
   * @param tenantId - Tenant ID
   * @param thresholdPercentage - Utilization threshold percentage (default: 80)
   * @returns Array of high utilization limits
   */
  async getHighUtilizationLimits(tenantId: string, thresholdPercentage: number = 80): Promise<CreditLimit[]> {
    return await this.creditLimitRepository.find({
      where: {
        tenantId,
        isActive: true,
        utilizationPercentage: MoreThanOrEqual(thresholdPercentage),
      },
      order: { utilizationPercentage: 'DESC' },
    });
  }
}
