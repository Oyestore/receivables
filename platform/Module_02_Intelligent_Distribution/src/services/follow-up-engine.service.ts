import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Equal } from 'typeorm';
import { FollowUpRule, TriggerType } from '../entities/follow-up-rule.entity';
import { FollowUpSequence } from '../entities/follow-up-sequence.entity';
import { FollowUpStep } from '../entities/follow-up-step.entity';
import { DistributionService } from '../../channel-integration/services/distribution.service';

interface InvoiceData {
  id: string;
  recipientId: string;
  organizationId: string;
  dueDate: Date;
  amount: number;
  status: string;
  createdAt: Date;
}

@Injectable()
export class FollowUpEngineService {
  constructor(
    @InjectRepository(FollowUpRule)
    private followUpRuleRepository: Repository<FollowUpRule>,
    @InjectRepository(FollowUpSequence)
    private followUpSequenceRepository: Repository<FollowUpSequence>,
    @InjectRepository(FollowUpStep)
    private followUpStepRepository: Repository<FollowUpStep>,
    private distributionService: DistributionService,
  ) {}

  /**
   * Process follow-ups for invoices based on their due dates and status
   */
  async processFollowUps(invoices: InvoiceData[]): Promise<void> {
    for (const invoice of invoices) {
      await this.processInvoiceFollowUps(invoice);
    }
  }

  /**
   * Process follow-ups for a specific invoice
   */
  async processInvoiceFollowUps(invoice: InvoiceData): Promise<void> {
    const today = new Date();
    const { id: invoiceId, organizationId, recipientId, dueDate, status } = invoice;

    // Find applicable rules based on trigger type and organization
    const rules = await this.findApplicableRules(invoice);

    for (const rule of rules) {
      // Check if the rule should be triggered based on due date and offset
      if (this.shouldTriggerRule(rule, dueDate, today, status)) {
        // Trigger the follow-up communication
        await this.triggerFollowUp(rule, invoiceId, recipientId, organizationId);
      }
    }
  }

  /**
   * Find applicable follow-up rules for an invoice
   */
  private async findApplicableRules(invoice: InvoiceData): Promise<FollowUpRule[]> {
    const { organizationId, status } = invoice;

    // Find all rules for the organization
    return this.followUpRuleRepository.find({
      where: { organizationId },
      order: { triggerType: 'ASC', daysOffset: 'ASC' },
    });
  }

  /**
   * Check if a rule should be triggered based on due date and offset
   */
  private shouldTriggerRule(
    rule: FollowUpRule,
    dueDate: Date,
    today: Date,
    invoiceStatus: string,
  ): boolean {
    // If invoice is already paid, don't trigger follow-ups
    if (invoiceStatus === 'PAID') {
      return false;
    }

    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);
    
    const todayOnly = new Date(today);
    todayOnly.setHours(0, 0, 0, 0);

    // Calculate the target date based on rule type and offset
    let targetDate: Date;
    
    switch (rule.triggerType) {
      case TriggerType.BEFORE_DUE:
        // Target date is X days before due date
        targetDate = new Date(dueDateOnly);
        targetDate.setDate(targetDate.getDate() - rule.daysOffset);
        break;
        
      case TriggerType.ON_DUE:
        // Target date is the due date
        targetDate = new Date(dueDateOnly);
        break;
        
      case TriggerType.AFTER_DUE:
        // Target date is X days after due date
        targetDate = new Date(dueDateOnly);
        targetDate.setDate(targetDate.getDate() + rule.daysOffset);
        break;
        
      case TriggerType.ON_EVENT:
        // For event-based triggers, we would need additional logic
        // This is a placeholder for future implementation
        return false;
        
      default:
        return false;
    }

    // Check if today matches the target date
    return todayOnly.getTime() === targetDate.getTime();
  }

  /**
   * Trigger a follow-up communication based on a rule
   */
  private async triggerFollowUp(
    rule: FollowUpRule,
    invoiceId: string,
    recipientId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      // Queue the distribution through the appropriate channel
      await this.distributionService.distributeInvoice(
        invoiceId,
        recipientId,
        rule.channel,
        rule.templateId,
        undefined, // customContent
        undefined, // attachments
        organizationId,
        2, // Higher priority for follow-ups
      );
      
      console.log(`Triggered follow-up for invoice ${invoiceId} using rule ${rule.id}`);
    } catch (error) {
      console.error(`Failed to trigger follow-up for invoice ${invoiceId}: ${error.message}`);
    }
  }

  /**
   * Get follow-up sequences for an organization
   */
  async getFollowUpSequences(organizationId: string): Promise<FollowUpSequence[]> {
    return this.followUpSequenceRepository.find({
      where: { organizationId },
      relations: ['steps', 'steps.rule'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Get a specific follow-up sequence
   */
  async getFollowUpSequence(id: string, organizationId: string): Promise<FollowUpSequence> {
    return this.followUpSequenceRepository.findOne({
      where: { id, organizationId },
      relations: ['steps', 'steps.rule'],
    });
  }

  /**
   * Apply a follow-up sequence to an invoice
   */
  async applySequenceToInvoice(
    sequenceId: string,
    invoiceId: string,
    recipientId: string,
    organizationId: string,
  ): Promise<void> {
    const sequence = await this.getFollowUpSequence(sequenceId, organizationId);
    
    if (!sequence) {
      throw new Error(`Follow-up sequence with ID ${sequenceId} not found`);
    }
    
    // Sort steps by step number
    const sortedSteps = sequence.steps.sort((a, b) => a.stepNumber - b.stepNumber);
    
    for (const step of sortedSteps) {
      // For each step, schedule a follow-up based on the rule
      const rule = step.rule;
      
      // In a real implementation, we would schedule these for future execution
      // For now, we'll just log the planned follow-ups
      console.log(`Scheduled follow-up for invoice ${invoiceId} using rule ${rule.id} from sequence ${sequenceId}`);
    }
  }
}
