import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUpRule, TriggerType } from '../entities/follow-up-rule.entity';
import { CommunicationChannel } from '../../distribution/entities/recipient-contact.entity';

export class CreateFollowUpRuleDto {
  name: string;
  description?: string;
  triggerType: TriggerType;
  daysOffset: number;
  templateId?: string;
  channel: CommunicationChannel;
  organizationId: string;
}

export class UpdateFollowUpRuleDto {
  name?: string;
  description?: string;
  triggerType?: TriggerType;
  daysOffset?: number;
  templateId?: string;
  channel?: CommunicationChannel;
}

@Injectable()
export class FollowUpRuleService {
  constructor(
    @InjectRepository(FollowUpRule)
    private followUpRuleRepository: Repository<FollowUpRule>,
  ) {}

  /**
   * Create a new follow-up rule
   */
  async create(createFollowUpRuleDto: CreateFollowUpRuleDto): Promise<FollowUpRule> {
    const newRule = this.followUpRuleRepository.create(createFollowUpRuleDto);
    return this.followUpRuleRepository.save(newRule);
  }

  /**
   * Get all follow-up rules for an organization
   */
  async findAll(organizationId: string): Promise<FollowUpRule[]> {
    return this.followUpRuleRepository.find({
      where: { organizationId },
      order: { name: 'ASC' },
    });
  }

  /**
   * Get a specific follow-up rule
   */
  async findOne(id: string, organizationId: string): Promise<FollowUpRule> {
    const rule = await this.followUpRuleRepository.findOne({
      where: { id, organizationId },
    });

    if (!rule) {
      throw new Error(`Follow-up rule with ID ${id} not found`);
    }

    return rule;
  }

  /**
   * Update a follow-up rule
   */
  async update(
    id: string,
    updateFollowUpRuleDto: UpdateFollowUpRuleDto,
    organizationId: string,
  ): Promise<FollowUpRule> {
    const rule = await this.findOne(id, organizationId);
    
    // Update the rule with the new data
    Object.assign(rule, updateFollowUpRuleDto);
    
    return this.followUpRuleRepository.save(rule);
  }

  /**
   * Delete a follow-up rule
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const rule = await this.findOne(id, organizationId);
    await this.followUpRuleRepository.remove(rule);
  }

  /**
   * Find rules by trigger type
   */
  async findByTriggerType(triggerType: TriggerType, organizationId: string): Promise<FollowUpRule[]> {
    return this.followUpRuleRepository.find({
      where: { triggerType, organizationId },
      order: { daysOffset: 'ASC' },
    });
  }
}
