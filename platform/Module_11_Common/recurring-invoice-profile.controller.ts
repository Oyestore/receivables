import { Controller, Post, Body, Get, Param, Put, Delete, Query, UsePipes, ValidationPipe, ParseUUIDPipe, InternalServerErrorException } from "@nestjs/common";
import { RecurringInvoiceProfileService } from "../services/recurring-invoice-profile.service";
import { CreateRecurringInvoiceProfileDto, UpdateRecurringInvoiceProfileDto } from "../dto/recurring-invoice-profile.dto";
import { RecurringInvoiceProfile } from "../entities/recurring-invoice-profile.entity";

@Controller("api/v1/recurring-invoices") // Base path as per design document
export class RecurringInvoiceProfileController {
  constructor(private readonly profileService: RecurringInvoiceProfileService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() createDto: CreateRecurringInvoiceProfileDto): Promise<RecurringInvoiceProfile> {
    return this.profileService.create(createDto);
  }

  @Get()
  async findAll(@Query("tenant_id", ParseUUIDPipe) tenant_id: string): Promise<RecurringInvoiceProfile[]> {
    return this.profileService.findAll(tenant_id);
  }

  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("tenant_id", ParseUUIDPipe) tenant_id: string
  ): Promise<RecurringInvoiceProfile> {
    return this.profileService.findOne(id, tenant_id);
  }

  @Put(":id")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateRecurringInvoiceProfileDto,
    @Query("tenant_id", ParseUUIDPipe) tenant_id: string
  ): Promise<RecurringInvoiceProfile> {
    return this.profileService.update(id, updateDto, tenant_id);
  }

  @Delete(":id")
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("tenant_id", ParseUUIDPipe) tenant_id: string
  ): Promise<void> {
    return this.profileService.remove(id, tenant_id);
  }

  // Endpoint to manually trigger processing of due profiles (for testing/admin)
  @Post("process-due")
  async processDueProfiles(): Promise<{ message: string; processedCount?: number }> {
    // In a real application, this would be a scheduled task (e.g., cron job)
    // For now, an admin endpoint can trigger it.
    // This is a simplified response. You might want to return more details.
    try {
        await this.profileService.processDueProfiles();
        return { message: "Processing of due recurring profiles initiated." };
    } catch (error) {
        console.error("Error triggering due profile processing:", error);
        throw new InternalServerErrorException("Failed to process due profiles.");
    }
  }
}

