import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUpSequence } from '../entities/follow-up-sequence.entity';
import { FollowUpStep } from '../entities/follow-up-step.entity';

@Injectable()
export class FollowUpSequenceService {
  constructor(
    @InjectRepository(FollowUpSequence)
    private followUpSequenceRepository: Repository<FollowUpSequence>,
    @InjectRepository(FollowUpStep)
    private followUpStepRepository: Repository<FollowUpStep>,
  ) {}

  async create(createFollowUpSequenceDto: any): Promise<FollowUpSequence> {
    const sequence = this.followUpSequenceRepository.create(createFollowUpSequenceDto);
    return await this.followUpSequenceRepository.save(sequence);
  }

  async findAll(organizationId: string): Promise<FollowUpSequence[]> {
    return await this.followUpSequenceRepository.find({
      where: { organizationId },
      relations: ['steps'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<FollowUpSequence> {
    const sequence = await this.followUpSequenceRepository.findOne({
      where: { id, organizationId },
      relations: ['steps'],
    });

    if (!sequence) {
      throw new NotFoundException(`Follow-up sequence with ID ${id} not found`);
    }

    return sequence;
  }

  async update(id: string, organizationId: string, updateFollowUpSequenceDto: any): Promise<FollowUpSequence> {
    const sequence = await this.findOne(id, organizationId);
    
    Object.assign(sequence, updateFollowUpSequenceDto);
    return await this.followUpSequenceRepository.save(sequence);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const sequence = await this.findOne(id, organizationId);
    
    // Remove associated steps first
    await this.followUpStepRepository.delete({ sequenceId: id });
    
    // Remove the sequence
    await this.followUpSequenceRepository.remove(sequence);
  }

  async addStep(sequenceId: string, organizationId: string, stepData: any): Promise<FollowUpStep> {
    // Verify sequence exists and belongs to organization
    await this.findOne(sequenceId, organizationId);
    
    const step = this.followUpStepRepository.create({
      ...stepData,
      sequenceId,
    });
    
    return await this.followUpStepRepository.save(step);
  }

  async removeStep(stepId: string, organizationId: string): Promise<void> {
    const step = await this.followUpStepRepository.findOne({
      where: { id: stepId },
      relations: ['sequence'],
    });

    if (!step || step.sequence.organizationId !== organizationId) {
      throw new NotFoundException(`Follow-up step with ID ${stepId} not found`);
    }

    await this.followUpStepRepository.remove(step);
  }

  async getActiveSequences(organizationId: string): Promise<FollowUpSequence[]> {
    return await this.followUpSequenceRepository.find({
      where: { organizationId, isActive: true },
      relations: ['steps'],
      order: { createdAt: 'DESC' },
    });
  }

  async getSequenceByRule(ruleId: string, organizationId: string): Promise<FollowUpSequence[]> {
    return await this.followUpSequenceRepository.find({
      where: { ruleId, organizationId },
      relations: ['steps'],
      order: { createdAt: 'DESC' },
    });
  }
}
