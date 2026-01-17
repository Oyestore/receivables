import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { RiskAlert } from '../entities/risk-alert.entity';
import { RiskIndicator } from '../entities/risk-indicator.entity';
import { BuyerProfile } from '../entities/buyer-profile.entity';
import { RiskLevel } from '../enums/risk-level.enum';

/**
 * Service responsible for generating and managing risk alerts.
 * This service provides functionality for creating alerts based on risk indicators
 * and managing their lifecycle.
 */
@Injectable()
export class RiskAlertService {
  private readonly logger = new Logger(RiskAlertService.name);

  constructor(
    @InjectRepository(RiskAlert)
    private riskAlertRepository: Repository<RiskAlert>,
    @InjectRepository(RiskIndicator)
    private riskIndicatorRepository: Repository<RiskIndicator>,
    @InjectRepository(BuyerProfile)
    private buyerProfileRepository: Repository<BuyerProfile>,
  ) {}

  /**
   * Generate alerts from risk indicators
   * @param indicators - Risk indicators
   * @param tenantId - Tenant ID
   * @returns Array of generated alerts
   */
  async generateAlertsFromIndicators(indicators: RiskIndicator[], tenantId: string): Promise<RiskAlert[]> {
    this.logger.log(`Generating alerts from ${indicators.length} risk indicators`);
    
    const alerts: RiskAlert[] = [];
    
    // Group indicators by buyer
    const buyerIndicators: Record<string, RiskIndicator[]> = {};
    
    indicators.forEach(indicator => {
      if (!buyerIndicators[indicator.buyerId]) {
        buyerIndicators[indicator.buyerId] = [];
      }
      buyerIndicators[indicator.buyerId].push(indicator);
    });
    
    // Process indicators for each buyer
    for (const buyerId of Object.keys(buyerIndicators)) {
      const buyerProfile = await this.buyerProfileRepository.findOne({
        where: { buyerId, tenantId },
      });
      
      if (!buyerProfile) {
        this.logger.warn(`Buyer profile not found for buyer ${buyerId}`);
        continue;
      }
      
      const buyerName = buyerProfile.businessName || `Buyer ${buyerId}`;
      
      // Group indicators by type
      const indicatorsByType: Record<string, RiskIndicator[]> = {};
      
      buyerIndicators[buyerId].forEach(indicator => {
        if (!indicatorsByType[indicator.indicatorType]) {
          indicatorsByType[indicator.indicatorType] = [];
        }
        indicatorsByType[indicator.indicatorType].push(indicator);
      });
      
      // Generate alerts for each indicator type
      for (const indicatorType of Object.keys(indicatorsByType)) {
        const typeIndicators = indicatorsByType[indicatorType];
        
        // Determine highest risk level
        let highestRiskLevel = RiskLevel.LOW;
        typeIndicators.forEach(indicator => {
          if (this.getRiskLevelValue(indicator.riskLevel) > this.getRiskLevelValue(highestRiskLevel)) {
            highestRiskLevel = indicator.riskLevel;
          }
        });
        
        // Generate alert
        const alert = await this.createAlert({
          tenantId,
          buyerId,
          alertType: indicatorType,
          title: this.generateAlertTitle(indicatorType, highestRiskLevel, buyerName),
          message: this.generateAlertMessage(typeIndicators, buyerName),
          severity: this.mapRiskLevelToSeverity(highestRiskLevel),
          priority: this.calculateAlertPriority(highestRiskLevel, typeIndicators.length),
          riskIndicatorIds: typeIndicators.map(i => i.id),
          recommendedActions: this.generateRecommendedActions(indicatorType, highestRiskLevel),
          notificationChannels: this.determineNotificationChannels(highestRiskLevel),
        });
        
        alerts.push(alert);
      }
    }
    
    return alerts;
  }

  /**
   * Create a new alert
   * @param createDto - Data for creating the alert
   * @returns The created alert
   */
  async createAlert(createDto: Partial<RiskAlert>): Promise<RiskAlert> {
    this.logger.log(`Creating alert for buyer ${createDto.buyerId}`);
    
    const alert = this.riskAlertRepository.create({
      ...createDto,
      status: 'new',
      notificationStatus: {},
    });
    
    return await this.riskAlertRepository.save(alert);
  }

  /**
   * Find all alerts for a tenant
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns Array of alerts
   */
  async findAll(tenantId: string, filters?: any): Promise<RiskAlert[]> {
    const where: FindOptionsWhere<RiskAlert> = { tenantId };
    
    // Apply additional filters if provided
    if (filters) {
      if (filters.buyerId) {
        where.buyerId = filters.buyerId;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.severity) {
        where.severity = filters.severity;
      }
      if (filters.alertType) {
        where.alertType = filters.alertType;
      }
    }
    
    return await this.riskAlertRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find an alert by ID
   * @param id - Alert ID
   * @param tenantId - Tenant ID
   * @returns The alert or null if not found
   */
  async findOne(id: string, tenantId: string): Promise<RiskAlert> {
    return await this.riskAlertRepository.findOne({
      where: { id, tenantId },
    });
  }

  /**
   * Update an alert
   * @param id - Alert ID
   * @param updateDto - Data for updating the alert
   * @param tenantId - Tenant ID
   * @returns The updated alert
   */
  async update(id: string, updateDto: Partial<RiskAlert>, tenantId: string): Promise<RiskAlert> {
    this.logger.log(`Updating alert ${id}`);
    
    // Check if alert exists
    const alert = await this.findOne(id, tenantId);
    if (!alert) {
      throw new Error(`Alert with ID ${id} not found`);
    }
    
    // Update the alert
    await this.riskAlertRepository.update(
      { id, tenantId },
      {
        ...updateDto,
        updatedAt: new Date(),
      }
    );
    
    return await this.findOne(id, tenantId);
  }

  /**
   * Assign an alert to a user
   * @param id - Alert ID
   * @param tenantId - Tenant ID
   * @param userId - User ID to assign to
   * @param userName - User name to assign to
   * @returns The updated alert
   */
  async assignAlert(
    id: string,
    tenantId: string,
    userId: string,
    userName: string,
  ): Promise<RiskAlert> {
    this.logger.log(`Assigning alert ${id} to user ${userId}`);
    
    return await this.update(
      id,
      {
        assignedTo: userId,
        assignedToName: userName,
        assignedAt: new Date(),
        status: 'in_progress',
      },
      tenantId
    );
  }

  /**
   * Mark an alert as read
   * @param id - Alert ID
   * @param tenantId - Tenant ID
   * @param userId - User ID reading the alert
   * @returns The updated alert
   */
  async markAsRead(id: string, tenantId: string, userId: string): Promise<RiskAlert> {
    this.logger.log(`Marking alert ${id} as read by user ${userId}`);
    
    return await this.update(
      id,
      {
        isRead: true,
        readBy: userId,
        readAt: new Date(),
      },
      tenantId
    );
  }

  /**
   * Resolve an alert
   * @param id - Alert ID
   * @param tenantId - Tenant ID
   * @param resolutionNotes - Resolution notes
   * @param userId - User ID resolving the alert
   * @returns The updated alert
   */
  async resolveAlert(
    id: string,
    tenantId: string,
    resolutionNotes: string,
    userId: string,
  ): Promise<RiskAlert> {
    this.logger.log(`Resolving alert ${id}`);
    
    return await this.update(
      id,
      {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolutionNotes,
      },
      tenantId
    );
  }

  /**
   * Dismiss an alert
   * @param id - Alert ID
   * @param tenantId - Tenant ID
   * @param notes - Dismissal notes
   * @param userId - User ID dismissing the alert
   * @returns The updated alert
   */
  async dismissAlert(
    id: string,
    tenantId: string,
    notes: string,
    userId: string,
  ): Promise<RiskAlert> {
    this.logger.log(`Dismissing alert ${id}`);
    
    return await this.update(
      id,
      {
        status: 'dismissed',
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolutionNotes: notes,
      },
      tenantId
    );
  }

  /**
   * Update notification status for an alert
   * @param id - Alert ID
   * @param tenantId - Tenant ID
   * @param channel - Notification channel
   * @param status - Notification status
   * @returns The updated alert
   */
  async updateNotificationStatus(
    id: string,
    tenantId: string,
    channel: string,
    status: string,
  ): Promise<RiskAlert> {
    this.logger.log(`Updating notification status for alert ${id}, channel ${channel} to ${status}`);
    
    const alert = await this.findOne(id, tenantId);
    if (!alert) {
      throw new Error(`Alert with ID ${id} not found`);
    }
    
    const notificationStatus = alert.notificationStatus || {};
    notificationStatus[channel] = status;
    
    return await this.update(
      id,
      {
        notificationStatus,
      },
      tenantId
    );
  }

  /**
   * Get risk level value for comparison
   * @param riskLevel - Risk level
   * @returns Numeric value for comparison
   */
  private getRiskLevelValue(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.VERY_LOW:
        return 1;
      case RiskLevel.LOW:
        return 2;
      case RiskLevel.MEDIUM:
        return 3;
      case RiskLevel.HIGH:
        return 4;
      case RiskLevel.VERY_HIGH:
        return 5;
      case RiskLevel.CRITICAL:
        return 6;
      default:
        return 0;
    }
  }

  /**
   * Map risk level to alert severity
   * @param riskLevel - Risk level
   * @returns Alert severity
   */
  private mapRiskLevelToSeverity(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case RiskLevel.VERY_LOW:
      case RiskLevel.LOW:
        return 'low';
      case RiskLevel.MEDIUM:
        return 'medium';
      case RiskLevel.HIGH:
        return 'high';
      case RiskLevel.VERY_HIGH:
      case RiskLevel.CRITICAL:
        return 'critical';
      default:
        return 'medium';
    }
  }

  /**
   * Calculate alert priority (1-5, where 1 is highest)
   * @param riskLevel - Risk level
   * @param indicatorCount - Number of indicators
   * @returns Alert priority
   */
  private calculateAlertPriority(riskLevel: RiskLevel, indicatorCount: number): number {
    // Base priority from risk level
    let priority: number;
    
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        priority = 1;
        break;
      case RiskLevel.VERY_HIGH:
        priority = 2;
        break;
      case RiskLevel.HIGH:
        priority = 3;
        break;
      case RiskLevel.MEDIUM:
        priority = 4;
        break;
      default:
        priority = 5;
    }
    
    // Adjust based on indicator count (more indicators = higher priority)
    if (indicatorCount >= 3 && priority > 1) {
      priority -= 1;
    }
    
    return priority;
  }

  /**
   * Generate alert title
   * @param indicatorType - Indicator type
   * @param riskLevel - Risk level
   * @param buyerName - Buyer name
   * @returns Alert title
   */
  private generateAlertTitle(indicatorType: string, riskLevel: RiskLevel, buyerName: string): string {
    const riskText = riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.VERY_HIGH 
      ? 'Critical' 
      : riskLevel === RiskLevel.HIGH 
        ? 'High' 
        : 'Potential';
    
    switch (indicatorType) {
      case 'credit_score':
        return `${riskText} Credit Score Risk for ${buyerName}`;
      case 'payment_behavior':
        return `${riskText} Payment Behavior Risk for ${buyerName}`;
      case 'credit_utilization':
        return `${riskText} Credit Utilization Risk for ${buyerName}`;
      default:
        return `${riskText} Risk Alert for ${buyerName}`;
    }
  }

  /**
   * Generate alert message
   * @param indicators - Risk indicators
   * @param buyerName - Buyer name
   * @returns Alert message
   */
  private generateAlertMessage(indicators: RiskIndicator[], buyerName: string): string {
    let message = `Risk alert for ${buyerName}:\n\n`;
    
    indicators.forEach(indicator => {
      message += `- ${indicator.description}\n`;
    });
    
    message += `\nDetected on ${new Date().toLocaleDateString()}`;
    
    return message;
  }

  /**
   * Generate recommended actions
   * @param indicatorType - Indicator type
   * @param riskLevel - Risk level
   * @returns Recommended actions
   */
  private generateRecommendedActions(indicatorType: string, riskLevel: RiskLevel): string {
    const isHighRisk = riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.VERY_HIGH;
    
    switch (indicatorType) {
      case 'credit_score':
        return isHighRisk
          ? 'Review credit limit immediately. Consider credit limit reduction or additional security requirements.'
          : 'Review credit assessment and monitor for further changes.';
      case 'payment_behavior':
        return isHighRisk
          ? 'Contact buyer to discuss payment issues. Consider payment terms adjustment or credit hold.'
          : 'Monitor payment patterns and follow up on overdue invoices.';
      case 'credit_utilization':
        return isHighRisk
          ? 'Review credit exposure and consider temporary credit limit freeze until payments are received.'
          : 'Monitor credit utilization and review credit limit if utilization remains high.';
      default:
        return 'Review risk indicators and take appropriate action based on severity.';
    }
  }

  /**
   * Determine notification channels based on risk level
   * @param riskLevel - Risk level
   * @returns Array of notification channels
   */
  private determineNotificationChannels(riskLevel: RiskLevel): string[] {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return ['email', 'sms', 'in_app'];
      case RiskLevel.VERY_HIGH:
        return ['email', 'in_app'];
      case RiskLevel.HIGH:
        return ['email', 'in_app'];
      default:
        return ['in_app'];
    }
  }

  /**
   * Get unread alerts count for a user
   * @param tenantId - Tenant ID
   * @param userId - User ID
   * @returns Count of unread alerts
   */
  async getUnreadAlertsCount(tenantId: string, userId: string): Promise<number> {
    const count = await this.riskAlertRepository.count({
      where: {
        tenantId,
        isRead: false,
        assignedTo: userId,
      },
    });
    
    return count;
  }

  /**
   * Get alerts summary for dashboard
   * @param tenantId - Tenant ID
   * @returns Alerts summary
   */
  async getAlertsSummary(tenantId: string): Promise<any> {
    const allAlerts = await this.riskAlertRepository.find({
      where: { tenantId },
    });
    
    const totalCount = allAlerts.length;
    const newCount = allAlerts.filter(a => a.status === 'new').length;
    const inProgressCount = allAlerts.filter(a => a.status === 'in_progress').length;
    const resolvedCount = allAlerts.filter(a => a.status === 'resolved').length;
    const dismissedCount = allAlerts.filter(a => a.status === 'dismissed').length;
    
    const criticalCount = allAlerts.filter(a => a.severity === 'critical').length;
    const highCount = allAlerts.filter(a => a.severity === 'high').length;
    const mediumCount = allAlerts.filter(a => a.severity === 'medium').length;
    const lowCount = allAlerts.filter(a => a.severity === 'low').length;
    
    return {
      totalCount,
      byStatus: {
        new: newCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        dismissed: dismissedCount,
      },
      bySeverity: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
    };
  }
}
