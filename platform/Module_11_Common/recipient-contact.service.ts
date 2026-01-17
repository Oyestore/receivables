import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecipientContact } from '../entities/recipient-contact.entity';
import { CreateRecipientContactDto, UpdateRecipientContactDto } from '../dto/recipient-contact.dto';

@Injectable()
export class RecipientContactService {
  constructor(
    @InjectRepository(RecipientContact)
    private recipientContactRepository: Repository<RecipientContact>,
  ) {}

  async create(createRecipientContactDto: CreateRecipientContactDto): Promise<RecipientContact> {
    const newRecipientContact = this.recipientContactRepository.create(createRecipientContactDto);
    return this.recipientContactRepository.save(newRecipientContact);
  }

  async findAll(organizationId: string): Promise<RecipientContact[]> {
    return this.recipientContactRepository.find({
      where: { organizationId },
      order: { recipientName: 'ASC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<RecipientContact> {
    const recipientContact = await this.recipientContactRepository.findOne({
      where: { id, organizationId },
    });

    if (!recipientContact) {
      throw new NotFoundException(`Recipient contact with ID ${id} not found`);
    }

    return recipientContact;
  }

  async update(
    id: string,
    updateRecipientContactDto: UpdateRecipientContactDto,
    organizationId: string,
  ): Promise<RecipientContact> {
    const recipientContact = await this.findOne(id, organizationId);
    
    // Update the recipient contact with the new data
    Object.assign(recipientContact, updateRecipientContactDto);
    
    return this.recipientContactRepository.save(recipientContact);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const recipientContact = await this.findOne(id, organizationId);
    await this.recipientContactRepository.remove(recipientContact);
  }

  async findByEmail(email: string, organizationId: string): Promise<RecipientContact | undefined> {
    const contact = await this.recipientContactRepository.findOne({
      where: { email, organizationId },
    });
    
    return contact || undefined;
  }

  async findByPhone(phone: string, organizationId: string): Promise<RecipientContact | undefined> {
    const contact = await this.recipientContactRepository.findOne({
      where: { phone, organizationId },
    });
    
    return contact || undefined;
  }
}
