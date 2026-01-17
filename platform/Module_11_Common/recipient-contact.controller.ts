import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RecipientContactService } from '../services/recipient-contact.service';
import { CreateRecipientContactDto, UpdateRecipientContactDto } from '../dto/recipient-contact.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RecipientContact } from '../entities/recipient-contact.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('recipient-contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recipient-contacts')
export class RecipientContactController {
  constructor(private readonly recipientContactService: RecipientContactService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new recipient contact' })
  @ApiResponse({ status: 201, description: 'The recipient contact has been successfully created.', type: RecipientContact })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(@Body() createRecipientContactDto: CreateRecipientContactDto, @Request() req): Promise<RecipientContact> {
    // Ensure the organization ID matches the user's organization
    if (req.user.organizationId !== createRecipientContactDto.organizationId) {
      throw new ForbiddenException('You can only create contacts for your own organization');
    }
    
    return this.recipientContactService.create(createRecipientContactDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all recipient contacts for the organization' })
  @ApiResponse({ status: 200, description: 'List of recipient contacts.', type: [RecipientContact] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@Request() req): Promise<RecipientContact[]> {
    return this.recipientContactService.findAll(req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recipient contact by ID' })
  @ApiResponse({ status: 200, description: 'The recipient contact.', type: RecipientContact })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Recipient contact not found.' })
  async findOne(@Param('id') id: string, @Request() req): Promise<RecipientContact> {
    return this.recipientContactService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recipient contact' })
  @ApiResponse({ status: 200, description: 'The recipient contact has been successfully updated.', type: RecipientContact })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Recipient contact not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateRecipientContactDto: UpdateRecipientContactDto,
    @Request() req,
  ): Promise<RecipientContact> {
    return this.recipientContactService.update(id, updateRecipientContactDto, req.user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a recipient contact' })
  @ApiResponse({ status: 200, description: 'The recipient contact has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Recipient contact not found.' })
  async remove(@Param('id') id: string, @Request() req): Promise<{ message: string }> {
    await this.recipientContactService.remove(id, req.user.organizationId);
    return { message: 'Recipient contact successfully deleted' };
  }
}
