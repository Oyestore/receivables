import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { RecipientContactService } from '../services/recipient-contact.service';
import { CreateRecipientContactDto, UpdateRecipientContactDto } from '../dto/recipient-contact.dto';
import { RecipientContact, CommunicationChannel } from '../entities/recipient-contact.entity';

@Controller('recipient-contacts')
export class RecipientContactController {
  constructor(private readonly recipientContactService: RecipientContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRecipientContactDto: CreateRecipientContactDto): Promise<RecipientContact> {
    return await this.recipientContactService.create(createRecipientContactDto);
  }

  @Get()
  async findAll(@Query('organizationId') organizationId: string): Promise<RecipientContact[]> {
    return await this.recipientContactService.findAll(organizationId);
  }

  @Get('search')
  async search(@Query('query') query: string, @Query('organizationId') organizationId: string): Promise<RecipientContact[]> {
    return await this.recipientContactService.search(query, organizationId);
  }

  @Get('channel/:channel')
  async findByChannel(
    @Param('channel') channel: CommunicationChannel,
    @Query('organizationId') organizationId: string,
  ): Promise<RecipientContact[]> {
    return await this.recipientContactService.findByPreferredChannel(channel, organizationId);
  }

  @Get('email/:email')
  async findByEmail(
    @Param('email') email: string,
    @Query('organizationId') organizationId: string,
  ): Promise<RecipientContact> {
    return await this.recipientContactService.findByEmail(email, organizationId);
  }

  @Get('phone/:phone')
  async findByPhone(
    @Param('phone') phone: string,
    @Query('organizationId') organizationId: string,
  ): Promise<RecipientContact> {
    return await this.recipientContactService.findByPhone(phone, organizationId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ): Promise<RecipientContact> {
    return await this.recipientContactService.findOne(id, organizationId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() updateRecipientContactDto: UpdateRecipientContactDto,
  ): Promise<RecipientContact> {
    return await this.recipientContactService.update(id, organizationId, updateRecipientContactDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ): Promise<void> {
    await this.recipientContactService.remove(id, organizationId);
  }
}
