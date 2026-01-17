import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DistributionRule, DistributionAssignment, DistributionStatus, DistributionChannel, DistributionRuleType } from '../entities/distribution-entities';
import { CreateDistributionRuleDto, UpdateDistributionRuleDto, CreateDistributionAssignmentDto, UpdateAssignmentStatusDto, DistributionQueryDto } from '../dto/distribution.dto';

export interface DistributionAnalytics {
  totalAssignments: number;
  statusBreakdown: Record<DistributionStatus, number>;
  channelBreakdown: Record<DistributionChannel, number>;
  successRate: number;
  averageDeliveryTime: number;
  deliveryTrends: Array<{
    date: string;
    delivered: number;
    failed: number;
    successRate: number;
  }>;
}

export interface RuleEvaluationResult {
  matched: boolean;
  ruleId?: string;
  ruleName?: string;
  priority: number;
  targetChannel: DistributionChannel;
  reason: string;
  confidence: number;
}

export interface DistributionResult {
  success: boolean;
  assignmentId: string;
  channel: DistributionChannel;
  messageId?: string;
  error?: string;
  deliveryTime?: number;
}

@Injectable()
export class DistributionService {
  private readonly logger = new Logger(DistributionService.name);

  constructor(
    @InjectRepository(DistributionRule)
    private readonly distributionRuleRepository: Repository<DistributionRule>,
    @InjectRepository(DistributionAssignment)
    private readonly distributionAssignmentRepository: Repository<DistributionAssignment>,
  ) {}

  // ========== DISTRIBUTION RULES ==========

  async createDistributionRule(createRuleDto: CreateDistributionRuleDto): Promise<DistributionRule> {
    this.logger.log(`Creating distribution rule: ${createRuleDto.ruleName} for tenant: ${createRuleDto.tenantId}`);
    
    // Validate rule conditions based on type
    this.validateRuleConditions(createRuleDto.ruleType, createRuleDto.conditions);
    
    const rule = this.distributionRuleRepository.create({
      ...createRuleDto,
      isActive: true,
      priority: createRuleDto.priority || 0,
    });

    const savedRule = await this.distributionRuleRepository.save(rule);
    this.logger.log(`Distribution rule created successfully: ${savedRule.id}`);
    
    return savedRule;
  }

  async getDistributionRules(tenantId: string, query?: DistributionQueryDto): Promise<{ rules: DistributionRule[]; total: number }> {
    this.logger.log(`Fetching distribution rules for tenant: ${tenantId}`);
    
    const queryBuilder = this.distributionRuleRepository
      .createQueryBuilder('rule')
      .where('rule.tenantId = :tenantId', { tenantId });

    if (query?.channel) {
      queryBuilder.andWhere('rule.targetChannel = :channel', { channel: query.channel });
    }

    if (query?.ruleType) {
      queryBuilder.andWhere('rule.ruleType = :ruleType', { ruleType: query.ruleType });
    }

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder
      .orderBy('rule.priority', 'DESC')
      .addOrderBy('rule.createdAt', 'ASC')
      .skip(offset)
      .take(limit);

    const [rules, total] = await queryBuilder.getManyAndCount();
    
    return { rules, total };
  }

  async getDistributionRuleById(id: string, tenantId: string): Promise<DistributionRule> {
    const rule = await this.distributionRuleRepository.findOne({
      where: { id, tenantId, isActive: true },
    });

    if (!rule) {
      throw new NotFoundException(`Distribution rule not found: ${id}`);
    }

    return rule;
  }

  async updateDistributionRule(id: string, tenantId: string, updateRuleDto: UpdateDistributionRuleDto): Promise<DistributionRule> {
    this.logger.log(`Updating distribution rule: ${id}`);
    
    const rule = await this.getDistributionRuleById(id, tenantId);

    if (updateRuleDto.ruleType && updateRuleDto.conditions) {
      this.validateRuleConditions(updateRuleDto.ruleType, updateRuleDto.conditions);
    }

    Object.assign(rule, updateRuleDto);
    const updatedRule = await this.distributionRuleRepository.save(rule);
    
    this.logger.log(`Distribution rule updated successfully: ${updatedRule.id}`);
    return updatedRule;
  }

  async deleteDistributionRule(id: string, tenantId: string): Promise<void> {
    this.logger.log(`Deleting distribution rule: ${id}`);
    
    const result = await this.distributionRuleRepository.update(
      { id, tenantId },
      { isActive: false }
    );

    if (result.affected === 0) {
      throw new NotFoundException('Distribution rule not found or access denied');
    }

    this.logger.log(`Distribution rule deleted successfully: ${id}`);
  }

  // ========== DISTRIBUTION ASSIGNMENTS ==========

  async createDistributionAssignment(createAssignmentDto: CreateDistributionAssignmentDto): Promise<DistributionAssignment> {
    this.logger.log(`Creating distribution assignment for invoice: ${createAssignmentDto.invoiceId}`);
    
    const assignment = this.distributionAssignmentRepository.create({
      ...createAssignmentDto,
      distributionStatus: DistributionStatus.PENDING,
    });

    const savedAssignment = await this.distributionAssignmentRepository.save(assignment);
    this.logger.log(`Distribution assignment created successfully: ${savedAssignment.id}`);
    
    return savedAssignment;
  }

  async getDistributionAssignments(tenantId: string, query?: DistributionQueryDto): Promise<{ assignments: DistributionAssignment[]; total: number }> {
    this.logger.log(`Fetching distribution assignments for tenant: ${tenantId}`);
    
    const queryBuilder = this.distributionAssignmentRepository
      .createQueryBuilder('assignment')
      .where('assignment.tenantId = :tenantId', { tenantId });

    if (query?.status) {
      queryBuilder.andWhere('assignment.distributionStatus = :status', { status: query.status });
    }

    if (query?.channel) {
      queryBuilder.andWhere('assignment.assignedChannel = :channel', { channel: query.channel });
    }

    if (query?.ruleId) {
      queryBuilder.andWhere('assignment.ruleId = :ruleId', { ruleId: query.ruleId });
    }

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder
      .orderBy('assignment.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [assignments, total] = await queryBuilder.getManyAndCount();
    
    return { assignments, total };
  }

  async getAssignmentById(id: string, tenantId: string): Promise<DistributionAssignment> {
    const assignment = await this.distributionAssignmentRepository.findOne({
      where: { id, tenantId },
    });

    if (!assignment) {
      throw new NotFoundException(`Distribution assignment not found: ${id}`);
    }

    return assignment;
  }

  async updateAssignmentStatus(
    id: string,
    tenantId: string,
    updateStatusDto: UpdateAssignmentStatusDto,
  ): Promise<DistributionAssignment> {
    this.logger.log(`Updating assignment ${id} status to: ${updateStatusDto.status}`);
    
    const assignment = await this.getAssignmentById(id, tenantId);
    
    const updateData: Partial<DistributionAssignment> = {
      distributionStatus: updateStatusDto.status as DistributionStatus,
    };

    if (updateStatusDto.status === 'sent') {
      updateData.sentAt = new Date();
    } else if (updateStatusDto.status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    if (updateStatusDto.error) {
      updateData.error = updateStatusDto.error;
    }

    Object.assign(assignment, updateData);
    const updatedAssignment = await this.distributionAssignmentRepository.save(assignment);
    
    this.logger.log(`Assignment status updated successfully: ${updatedAssignment.id}`);
    return updatedAssignment;
  }

  async getAssignmentsByInvoice(tenantId: string, invoiceId: string): Promise<DistributionAssignment[]> {
    this.logger.log(`Fetching assignments for invoice: ${invoiceId}`);
    
    return await this.distributionAssignmentRepository.find({
      where: { tenantId, invoiceId },
      order: { createdAt: 'DESC' },
    });
  }

  // ========== INTELLIGENT DISTRIBUTION LOGIC ==========

  async evaluateAndCreateAssignments(
    tenantId: string,
    invoiceData: {
      invoiceId: string;
      customerId: string;
      amount: number;
      dueDate: Date;
      customerData: Record<string, any>;
    },
  ): Promise<DistributionAssignment[]> {
    this.logger.log(`Evaluating distribution rules for invoice: ${invoiceData.invoiceId}`);
    
    try {
      // Get active rules for tenant
      const rules = await this.distributionRuleRepository.find({
        where: { tenantId, isActive: true },
        order: { priority: 'DESC' },
      });

      const evaluationResults: RuleEvaluationResult[] = [];

      // Evaluate each rule
      for (const rule of rules) {
        const result = await this.evaluateRule(rule, invoiceData);
        if (result.matched) {
          evaluationResults.push(result);
        }
      }

      // Sort by priority and confidence
      evaluationResults.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return b.confidence - a.confidence;
      });

      const bestMatch = evaluationResults[0];

      if (!bestMatch) {
        this.logger.warn(`No distribution rules matched for invoice: ${invoiceData.invoiceId}`);
        return [];
      }

      // Create assignment
      const assignment = await this.createDistributionAssignment({
        tenantId,
        invoiceId: invoiceData.invoiceId,
        customerId: invoiceData.customerId,
        assignedChannel: bestMatch.targetChannel,
        ruleId: bestMatch.ruleId,
        assignmentReason: bestMatch.reason,
        metadata: {
          ruleName: bestMatch.ruleName,
          evaluationTimestamp: new Date(),
          invoiceAmount: invoiceData.amount,
          customerData: invoiceData.customerData,
          confidence: bestMatch.confidence,
        },
      });

      this.logger.log(`Created distribution assignment: ${assignment.id} for invoice: ${invoiceData.invoiceId}`);
      return [assignment];
    } catch (error) {
      this.logger.error(`Error evaluating rules for invoice ${invoiceData.invoiceId}:`, error);
      throw new InternalServerErrorException('Failed to evaluate distribution rules');
    }
  }

  private async evaluateRule(rule: DistributionRule, invoiceData: any): Promise<RuleEvaluationResult> {
    const { ruleType, conditions, targetChannel, priority } = rule;

    try {
      switch (ruleType) {
        case DistributionRuleType.AMOUNT_BASED:
          return this.evaluateAmountRule(rule, invoiceData);
        case DistributionRuleType.CUSTOMER_BASED:
          return this.evaluateCustomerRule(rule, invoiceData);
        case DistributionRuleType.INDUSTRY_BASED:
          return this.evaluateIndustryRule(rule, invoiceData);
        case DistributionRuleType.GEOGRAPHIC:
          return this.evaluateGeographicRule(rule, invoiceData);
        case DistributionRuleType.CUSTOM:
          return this.evaluateCustomRule(rule, invoiceData);
        default:
          return { matched: false, priority: 0, targetChannel, reason: 'Unknown rule type', confidence: 0 };
      }
    } catch (error) {
      this.logger.error(`Error evaluating rule ${rule.id}:`, error);
      return { matched: false, priority, targetChannel, reason: `Rule evaluation failed: ${error.message}`, confidence: 0 };
    }
  }

  private evaluateAmountRule(rule: DistributionRule, invoiceData: any): RuleEvaluationResult {
    const { minAmount, maxAmount } = rule.conditions;
    const amount = invoiceData.amount;

    let confidence = 0;
    let reason = '';

    if (minAmount && maxAmount) {
      if (amount >= minAmount && amount <= maxAmount) {
        confidence = 1.0;
        reason = `Amount $${amount} within range $${minAmount} - $${maxAmount}`;
      } else {
        confidence = 0;
        reason = `Amount $${amount} outside range $${minAmount} - $${maxAmount}`;
      }
    } else if (minAmount) {
      if (amount >= minAmount) {
        confidence = Math.min(1.0, (amount - minAmount) / minAmount + 0.5);
        reason = `Amount $${amount} exceeds minimum $${minAmount}`;
      } else {
        confidence = 0;
        reason = `Amount $${amount} below minimum $${minAmount}`;
      }
    } else if (maxAmount) {
      if (amount <= maxAmount) {
        confidence = Math.min(1.0, (maxAmount - amount) / maxAmount + 0.5);
        reason = `Amount $${amount} within maximum $${maxAmount}`;
      } else {
        confidence = 0;
        reason = `Amount $${amount} exceeds maximum $${maxAmount}`;
      }
    } else {
      confidence = 0.5;
      reason = 'No amount conditions specified';
    }
    
    return {
      matched: confidence > 0,
      ruleId: rule.id,
      ruleName: rule.ruleName,
      priority: rule.priority,
      targetChannel: rule.targetChannel,
      reason,
      confidence,
    };
  }

  private evaluateCustomerRule(rule: DistributionRule, invoiceData: any): RuleEvaluationResult {
    const { customerSegments, customerTypes, preferredChannels } = rule.conditions;
    const customerData = invoiceData.customerData;

    let confidence = 0;
    let matched = false;
    let reason = '';

    // Check customer segments
    if (customerSegments?.length > 0) {
      const segmentMatch = customerSegments.includes(customerData.segment);
      if (segmentMatch) {
        confidence += 0.4;
        matched = true;
        reason += `Customer segment ${customerData.segment} matches; `;
      }
    }

    // Check customer types
    if (customerTypes?.length > 0) {
      const typeMatch = customerTypes.includes(customerData.type);
      if (typeMatch) {
        confidence += 0.4;
        matched = true;
        reason += `Customer type ${customerData.type} matches; `;
      }
    }

    // Check preferred channels
    if (preferredChannels?.length > 0) {
      const channelMatch = preferredChannels.includes(customerData.preferredChannel);
      if (channelMatch) {
        confidence += 0.2;
        matched = true;
        reason += `Preferred channel ${customerData.preferredChannel} matches; `;
      }
    }

    if (!matched) {
      reason = 'Customer criteria not met';
    }

    return {
      matched,
      ruleId: rule.id,
      ruleName: rule.ruleName,
      priority: rule.priority,
      targetChannel: rule.targetChannel,
      reason: reason.trim(),
      confidence: Math.min(1.0, confidence),
    };
  }

  private evaluateIndustryRule(rule: DistributionRule, invoiceData: any): RuleEvaluationResult {
    const { industries, industryRisks } = rule.conditions;
    const customerIndustry = invoiceData.customerData?.industry;

    let confidence = 0;
    let reason = '';

    if (industries?.length > 0) {
      const industryMatch = industries.includes(customerIndustry);
      if (industryMatch) {
        confidence = 0.8;
        reason = `Industry ${customerIndustry} matches allowed industries`;
      } else {
        confidence = 0;
        reason = `Industry ${customerIndustry} not in allowed industries`;
      }
    }

    // Consider industry risk if specified
    if (industryRisks && customerIndustry) {
      const riskLevel = industryRisks[customerIndustry] || 'medium';
      if (riskLevel === 'low') {
        confidence += 0.2;
        reason += ` (low risk industry)`;
      } else if (riskLevel === 'high') {
        confidence -= 0.2;
        reason += ` (high risk industry)`;
      }
    }

    return {
      matched: confidence > 0,
      ruleId: rule.id,
      ruleName: rule.ruleName,
      priority: rule.priority,
      targetChannel: rule.targetChannel,
      reason: reason || 'Industry rule evaluation completed',
      confidence: Math.max(0, Math.min(1.0, confidence)),
    };
  }

  private evaluateGeographicRule(rule: DistributionRule, invoiceData: any): RuleEvaluationResult {
    const { countries, states, cities, regions } = rule.conditions;
    const customerLocation = invoiceData.customerData?.location || {};

    let confidence = 0;
    let matched = false;
    let reason = '';

    // Check countries
    if (countries?.length > 0) {
      const countryMatch = countries.includes(customerLocation.country);
      if (countryMatch) {
        confidence += 0.4;
        matched = true;
        reason += `Country ${customerLocation.country} matches; `;
      }
    }

    // Check states
    if (states?.length > 0) {
      const stateMatch = states.includes(customerLocation.state);
      if (stateMatch) {
        confidence += 0.3;
        matched = true;
        reason += `State ${customerLocation.state} matches; `;
      }
    }

    // Check cities
    if (cities?.length > 0) {
      const cityMatch = cities.includes(customerLocation.city);
      if (cityMatch) {
        confidence += 0.2;
        matched = true;
        reason += `City ${customerLocation.city} matches; `;
      }
    }

    // Check regions
    if (regions?.length > 0) {
      const regionMatch = regions.includes(customerLocation.region);
      if (regionMatch) {
        confidence += 0.1;
        matched = true;
        reason += `Region ${customerLocation.region} matches; `;
      }
    }

    if (!matched) {
      reason = 'Geographic criteria not met';
    }

    return {
      matched,
      ruleId: rule.id,
      ruleName: rule.ruleName,
      priority: rule.priority,
      targetChannel: rule.targetChannel,
      reason: reason.trim(),
      confidence: Math.min(1.0, confidence),
    };
  }

  private evaluateCustomRule(rule: DistributionRule, invoiceData: any): RuleEvaluationResult {
    const { customConditions } = rule.conditions;
    
    try {
      // Safe custom condition evaluation
      if (!customConditions) {
        return { matched: false, priority: rule.priority, targetChannel: rule.targetChannel, reason: 'No custom conditions specified', confidence: 0 };
      }

      // Evaluate expression with limited scope for security
      const context = {
        invoice: invoiceData,
        customer: invoiceData.customerData,
        amount: invoiceData.amount,
        dueDate: invoiceData.dueDate,
      };

      let matched = false;
      let confidence = 0.5;
      let reason = 'Custom rule evaluation completed';

      // Simple condition evaluation (in production, use a proper rule engine)
      if (customConditions.expression) {
        // This is a simplified evaluation - in production, use a sandboxed JavaScript engine
        matched = this.evaluateCustomExpression(customConditions.expression, context);
        confidence = matched ? 0.8 : 0.2;
        reason = matched ? 'Custom expression matched' : 'Custom expression not met';
      }

      return {
        matched,
        ruleId: rule.id,
        ruleName: rule.ruleName,
        priority: rule.priority,
        targetChannel: rule.targetChannel,
        reason,
        confidence,
      };
    } catch (error) {
      this.logger.error(`Error evaluating custom rule ${rule.id}:`, error);
      return { matched: false, priority: rule.priority, targetChannel: rule.targetChannel, reason: 'Custom rule evaluation failed', confidence: 0 };
    }
  }

  private evaluateCustomExpression(expression: string, context: any): boolean {
    // Simplified expression evaluator - in production, use a proper sandboxed engine
    try {
      // Basic safety checks
      if (expression.includes('eval') || expression.includes('Function') || expression.includes('require')) {
        return false;
      }

      // Create a safe evaluation context
      const safeContext = {
        invoice: context.invoice || {},
        customer: context.customer || {},
        amount: context.amount || 0,
        dueDate: context.dueDate || new Date(),
        Math: Math,
        Date: Date,
      };

      // Simple evaluation (this is very basic - in production, use a proper rule engine)
      const func = new Function(...Object.keys(safeContext), `return ${expression}`);
      return func(...Object.values(safeContext));
    } catch (error) {
      this.logger.error('Custom expression evaluation failed:', error);
      return false;
    }
  }

  // ========== ANALYTICS ==========

  async getDistributionAnalytics(tenantId: string, startDate?: Date, endDate?: Date): Promise<DistributionAnalytics> {
    this.logger.log(`Generating distribution analytics for tenant: ${tenantId}`);
    
    try {
      const queryBuilder = this.distributionAssignmentRepository
        .createQueryBuilder('assignment')
        .where('assignment.tenantId = :tenantId', { tenantId });

      if (startDate) {
        queryBuilder.andWhere('assignment.createdAt >= :startDate', { startDate });
      }

      if (endDate) {
        queryBuilder.andWhere('assignment.createdAt <= :endDate', { endDate });
      }

      const assignments = await queryBuilder.getMany();

      const totalAssignments = assignments.length;
      const statusBreakdown = assignments.reduce((acc, assignment) => {
        acc[assignment.distributionStatus] = (acc[assignment.distributionStatus] || 0) + 1;
        return acc;
      }, {} as Record<DistributionStatus, number>);

      const channelBreakdown = assignments.reduce((acc, assignment) => {
        acc[assignment.assignedChannel] = (acc[assignment.assignedChannel] || 0) + 1;
        return acc;
      }, {} as Record<DistributionChannel, number>);

      const successfulAssignments = assignments.filter(a => 
        a.distributionStatus === DistributionStatus.DELIVERED || 
        a.distributionStatus === DistributionStatus.SENT
      ).length;

      const successRate = totalAssignments > 0 ? (successfulAssignments / totalAssignments) * 100 : 0;

      // Calculate average delivery time
      const deliveredAssignments = assignments.filter(a => 
        a.distributionStatus === DistributionStatus.DELIVERED && 
        a.sentAt && 
        a.deliveredAt
      );

      const averageDeliveryTime = deliveredAssignments.length > 0
        ? deliveredAssignments.reduce((sum, a) => 
            sum + (a.deliveredAt.getTime() - a.sentAt.getTime()), 0
          ) / deliveredAssignments.length / (1000 * 60) // Convert to minutes
        : 0;

      // Generate delivery trends
      const deliveryTrends = this.generateDeliveryTrends(assignments);

      return {
        totalAssignments,
        statusBreakdown,
        channelBreakdown,
        successRate,
        averageDeliveryTime,
        deliveryTrends,
      };
    } catch (error) {
      this.logger.error('Error generating analytics:', error);
      throw new InternalServerErrorException('Failed to generate distribution analytics');
    }
  }

  private generateDeliveryTrends(assignments: DistributionAssignment[]): Array<{date: string; delivered: number; failed: number; successRate: number}> {
    const trends: Map<string, {delivered: number; failed: number}> = new Map();

    assignments.forEach(assignment => {
      const date = assignment.createdAt.toISOString().split('T')[0];
      const current = trends.get(date) || {delivered: 0, failed: 0};

      if (assignment.distributionStatus === DistributionStatus.DELIVERED) {
        current.delivered++;
      } else if (assignment.distributionStatus === DistributionStatus.FAILED || assignment.distributionStatus === DistributionStatus.BOUNCED) {
        current.failed++;
      }

      trends.set(date, current);
    });

    return Array.from(trends.entries())
      .map(([date, counts]) => ({
        date,
        delivered: counts.delivered,
        failed: counts.failed,
        successRate: counts.delivered + counts.failed > 0 
          ? (counts.delivered / (counts.delivered + counts.failed)) * 100 
          : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days
  }

  // ========== BATCH OPERATIONS ==========

  async createBatchAssignments(tenantId: string, assignments: CreateDistributionAssignmentDto[]): Promise<DistributionAssignment[]> {
    this.logger.log(`Creating batch of ${assignments.length} assignments for tenant: ${tenantId}`);
    
    try {
      const results: DistributionAssignment[] = [];
      
      for (const assignmentDto of assignments) {
        const assignment = await this.createDistributionAssignment({
          ...assignmentDto,
          tenantId,
        });
        results.push(assignment);
      }
      
      this.logger.log(`Successfully created ${results.length} assignments`);
      return results;
    } catch (error) {
      this.logger.error('Error creating batch assignments:', error);
      throw new InternalServerErrorException('Failed to create batch assignments');
    }
  }

  async updateBatchAssignmentStatus(
    tenantId: string,
    updates: Array<{id: string; status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'; error?: string}>,
  ): Promise<DistributionAssignment[]> {
    this.logger.log(`Updating batch of ${updates.length} assignment statuses for tenant: ${tenantId}`);
    
    try {
      const results: DistributionAssignment[] = [];
      
      for (const update of updates) {
        const assignment = await this.updateAssignmentStatus(
          update.id,
          tenantId,
          {
            status: update.status,
            error: update.error,
          },
        );
        results.push(assignment);
      }
      
      this.logger.log(`Successfully updated ${results.length} assignment statuses`);
      return results;
    } catch (error) {
      this.logger.error('Error updating batch assignment statuses:', error);
      throw new InternalServerErrorException('Failed to update batch assignment statuses');
    }
  }

  // ========== VALIDATION ==========

  private validateRuleConditions(ruleType: DistributionRuleType, conditions: Record<string, any>): void {
    switch (ruleType) {
      case DistributionRuleType.AMOUNT_BASED:
        if (!conditions.minAmount && !conditions.maxAmount) {
          throw new BadRequestException('Amount-based rules must specify minAmount, maxAmount, or both');
        }
        if (conditions.minAmount && conditions.minAmount < 0) {
          throw new BadRequestException('minAmount cannot be negative');
        }
        if (conditions.maxAmount && conditions.maxAmount < 0) {
          throw new BadRequestException('maxAmount cannot be negative');
        }
        if (conditions.minAmount && conditions.maxAmount && conditions.minAmount > conditions.maxAmount) {
          throw new BadRequestException('minAmount cannot be greater than maxAmount');
        }
        break;

      case DistributionRuleType.CUSTOMER_BASED:
        if (!conditions.customerSegments?.length && !conditions.customerTypes?.length) {
          throw new BadRequestException('Customer-based rules must specify customerSegments or customerTypes');
        }
        break;

      case DistributionRuleType.INDUSTRY_BASED:
        if (!conditions.industries?.length) {
          throw new BadRequestException('Industry-based rules must specify industries');
        }
        break;

      case DistributionRuleType.GEOGRAPHIC:
        if (!conditions.countries?.length && !conditions.states?.length && !conditions.cities?.length) {
          throw new BadRequestException('Geographic rules must specify countries, states, or cities');
        }
        break;

      case DistributionRuleType.CUSTOM:
        if (!conditions.customConditions) {
          throw new BadRequestException('Custom rules must specify customConditions');
        }
        if (conditions.customConditions.expression && typeof conditions.customConditions.expression !== 'string') {
          throw new BadRequestException('Custom expression must be a string');
        }
        break;
    }
  }
}
