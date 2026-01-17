import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistributionRecord, DistributionStatus } from '../entities/distribution-record.entity';
import { CreateDistributionRecordDto, UpdateDistributionRecordDto } from '../dto/distribution-record.dto';
import { RecipientContactService } from './recipient-contact.service';

@Injectable()
export class DistributionRecordService {
  constructor(
    @InjectRepository(DistributionRecord)
    private distributionRecordRepository: Repository<DistributionRecord>,
    private recipientContactService: RecipientContactService,
  ) {}

  async create(createDistributionRecordDto: CreateDistributionRecordDto): Promise<DistributionRecord> {
    // Verify that the recipient exists
    await this.recipientContactService.findOne(
      createDistributionRecordDto.recipientId,
      createDistributionRecordDto.organizationId,
    );

    const newDistributionRecord = this.distributionRecordRepository.create(createDistributionRecordDto);
    return this.distributionRecordRepository.save(newDistributionRecord);
  }

  async findAll(organizationId: string): Promise<DistributionRecord[]> {
    return this.distributionRecordRepository.find({
      where: { organizationId },
      relations: ['recipient'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByInvoice(invoiceId: string, organizationId: string): Promise<DistributionRecord[]> {
    return this.distributionRecordRepository.find({
      where: { invoiceId, organizationId },
      relations: ['recipient'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<DistributionRecord> {
    const distributionRecord = await this.distributionRecordRepository.findOne({
      where: { id, organizationId },
      relations: ['recipient'],
    });

    if (!distributionRecord) {
      throw new NotFoundException(`Distribution record with ID ${id} not found`);
    }

    return distributionRecord;
  }

  async update(
    id: string,
    updateDistributionRecordDto: UpdateDistributionRecordDto,
    organizationId: string,
  ): Promise<DistributionRecord> {
    const distributionRecord = await this.findOne(id, organizationId);
    
    // Update the distribution record with the new data
    Object.assign(distributionRecord, updateDistributionRecordDto);
    
    return this.distributionRecordRepository.save(distributionRecord);
  }

  async updateStatus(
    id: string,
    status: DistributionStatus,
    organizationId: string,
  ): Promise<DistributionRecord> {
    const distributionRecord = await this.findOne(id, organizationId);
    
    // Update status and related timestamps
    distributionRecord.status = status;
    
    switch (status) {
      case DistributionStatus.SENT:
        distributionRecord.sentAt = new Date();
        break;
      case DistributionStatus.DELIVERED:
        distributionRecord.deliveredAt = new Date();
        break;
      case DistributionStatus.OPENED:
        distributionRecord.openedAt = new Date();
        break;
    }
    
    return this.distributionRecordRepository.save(distributionRecord);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const distributionRecord = await this.findOne(id, organizationId);
    await this.distributionRecordRepository.remove(distributionRecord);
  }
}
