import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecipientContact, CommunicationChannel } from '../entities/recipient-contact.entity';
import { CreateRecipientContactDto, UpdateRecipientContactDto } from '../dto/recipient-contact.dto';

@Injectable()
export class RecipientContactService {
  constructor(
    @InjectRepository(RecipientContact)
    private recipientContactRepository: Repository<RecipientContact>,
  ) {}

  async create(createRecipientContactDto: CreateRecipientContactDto): Promise<RecipientContact> {
    const newContact = this.recipientContactRepository.create(createRecipientContactDto);
    return await this.recipientContactRepository.save(newContact);
  }

  async findAll(organizationId: string): Promise<RecipientContact[]> {
    return await this.recipientContactRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<RecipientContact> {
    const contact = await this.recipientContactRepository.findOne({
      where: { id, organizationId },
    });

    if (!contact) {
      throw new NotFoundException(`Recipient contact with ID ${id} not found`);
    }

    return contact;
  }

  async findByEmail(email: string, organizationId: string): Promise<RecipientContact> {
    return await this.recipientContactRepository.findOne({
      where: { email, organizationId },
    });
  }

  async findByPhone(phone: string, organizationId: string): Promise<RecipientContact> {
    return await this.recipientContactRepository.findOne({
      where: { phone, organizationId },
    });
  }

  async update(id: string, organizationId: string, updateRecipientContactDto: UpdateRecipientContactDto): Promise<RecipientContact> {
    const contact = await this.findOne(id, organizationId);
    
    Object.assign(contact, updateRecipientContactDto);
    return await this.recipientContactRepository.save(contact);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const contact = await this.findOne(id, organizationId);
    await this.recipientContactRepository.remove(contact);
  }

  async findByPreferredChannel(channel: CommunicationChannel, organizationId: string): Promise<RecipientContact[]> {
    return await this.recipientContactRepository.find({
      where: { preferredChannel: channel, organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async search(query: string, organizationId: string): Promise<RecipientContact[]> {
    return await this.recipientContactRepository
      .createQueryBuilder('contact')
      .where('contact.organizationId = :organizationId', { organizationId })
      .andWhere(
        '(contact.recipientName ILIKE :query OR contact.email ILIKE :query OR contact.phone ILIKE :query)',
        { query: `%${query}%` }
      )
      .orderBy('contact.recipientName', 'ASC')
      .getMany();
  }
}
