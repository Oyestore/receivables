import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringInvoiceProfile } from '../entities/recurring-invoice-profile.entity';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceService } from './invoice.service';
import { TemplateManagementService } from './template-management.service';

export interface CreateRecurringDto {
  template_id: string;
  client_id: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  start_date: Date;
  end_date?: Date;
  next_run: Date;
  is_active: boolean;
  tenant_id: string;
  auto_send?: boolean;
}

export interface UpdateRecurringDto {
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  end_date?: Date;
  is_active?: boolean;
  auto_send?: boolean;
}

@Injectable()
export class RecurringInvoiceService {
  private readonly logger = new Logger(RecurringInvoiceService.name);

  constructor(
    @InjectRepository(RecurringInvoiceProfile)
    private recurringRepo: Repository<RecurringInvoiceProfile>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    private invoiceService: InvoiceService,
    private templateService: TemplateManagementService,
  ) { }

  // PROFILE MANAGEMENT
  async createRecurringProfile(data: CreateRecurringDto): Promise<RecurringInvoiceProfile> {
    // Validate template exists
    await this.templateService.findTemplateById(data.template_id, data.tenant_id);

    // Calculate initial next_run if not provided
    if (!data.next_run) {
      data.next_run = data.start_date;
    }

    const profile = this.recurringRepo.create({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return this.recurringRepo.save(profile);
  }

  async findAllProfiles(tenantId: string): Promise<RecurringInvoiceProfile[]> {
    return this.recurringRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async findProfileById(id: string, tenantId: string): Promise<RecurringInvoiceProfile> {
    const profile = await this.recurringRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!profile) {
      throw new NotFoundException(`Recurring profile ${id} not found`);
    }

    return profile;
  }

  async updateRecurringProfile(
    id: string,
    data: UpdateRecurringDto,
    tenantId: string,
  ): Promise<RecurringInvoiceProfile> {
    const profile = await this.findProfileById(id, tenantId);

    // If frequency or interval changed, recalculate next_run
    if (data.frequency || data.interval) {
      const updatedProfile = { ...profile, ...data };
      updatedProfile.next_run = await this.calculateNextRun(updatedProfile);
    }

    await this.recurringRepo.update(id, {
      ...data,
      updated_at: new Date(),
    });

    return this.findProfileById(id, tenantId);
  }

  async pauseRecurring(id: string, tenantId: string): Promise<RecurringInvoiceProfile> {
    const profile = await this.findProfileById(id, tenantId);

    await this.recurringRepo.update(id, {
      is_active: false,
      paused_at: new Date(),
      updated_at: new Date(),
    });

    this.logger.log(`Paused recurring profile ${id}`);
    return this.findProfileById(id, tenantId);
  }

  async resumeRecurring(id: string, tenantId: string): Promise<RecurringInvoiceProfile> {
    const profile = await this.findProfileById(id, tenantId);

    // Recalculate next_run from now
    const nextRun = await this.calculateNextRun({
      ...profile,
      last_run: new Date(),
    });

    await this.recurringRepo.update(id, {
      is_active: true,
      paused_at: null,
      next_run: nextRun,
      updated_at: new Date(),
    });

    this.logger.log(`Resumed recurring profile ${id}, next run: ${nextRun}`);
    return this.findProfileById(id, tenantId);
  }

  // GENERATION LOGIC
  async generateFromRecurring(profileId: string): Promise<Invoice> {
    const profile = await this.recurringRepo.findOne({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException(`Profile ${profileId} not found`);
    }

    // Load template
    const template = await this.templateService.findTemplateById(
      profile.template_id,
      profile.tenant_id,
    );

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(profile.tenant_id);

    // Create invoice from template
    const invoiceData = {
      number: invoiceNumber,
      tenant_id: profile.tenant_id,
      client_id: profile.client_id,
      template_id: profile.template_id,
      issue_date: new Date(),
      due_date: this.calculateDueDate(new Date(), 30), // Default 30 days
      status: profile.auto_send ? 'sent' : 'draft',
      currency: 'INR',
      recurring_profile_id: profile.id,
      line_items: [], // Would be populated from template defaults
    };

    const invoice = await this.invoiceService.create(invoiceData as any);

    // Update profile
    const nextRun = await this.calculateNextRun(profile);
    await this.recurringRepo.update(profileId, {
      last_run: new Date(),
      next_run: nextRun,
      run_count: (profile.run_count || 0) + 1,
      updated_at: new Date(),
    });

    this.logger.log(
      `Generated invoice ${invoice.number} from recurring profile ${profileId}`,
    );

    return invoice;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledGeneration(): Promise<Invoice[]> {
    this.logger.log('Running scheduled recurring invoice generation...');

    // Find all profiles due for generation
    const dueProfiles = await this.recurringRepo.find({
      where: {
        is_active: true,
        next_run: LessThanOrEqual(new Date()),
      },
    });

    this.logger.log(`Found ${dueProfiles.length} profiles due for generation`);

    const generatedInvoices: Invoice[] = [];

    for (const profile of dueProfiles) {
      try {
        // Check if end_date passed
        if (profile.end_date && new Date() > profile.end_date) {
          await this.recurringRepo.update(profile.id, {
            is_active: false,
            updated_at: new Date(),
          });
          this.logger.log(`Profile ${profile.id} ended (past end_date)`);
          continue;
        }

        const invoice = await this.generateFromRecurring(profile.id);
        generatedInvoices.push(invoice);
      } catch (error) {
        this.logger.error(
          `Error generating invoice for profile ${profile.id}:`,
          error,
        );
        // Continue with other profiles
      }
    }

    this.logger.log(
      `Generated ${generatedInvoices.length} invoices from ${dueProfiles.length} profiles`,
    );

    return generatedInvoices;
  }

  // SCHEDULE CALCULATION
  async calculateNextRun(profile: RecurringInvoiceProfile): Promise<Date> {
    const baseDate = profile.last_run || profile.start_date || new Date();
    const interval = profile.interval || 1;

    let nextDate = new Date(baseDate);

    switch (profile.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + interval * 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
      default:
        throw new Error(`Unknown frequency: ${profile.frequency}`);
    }

    return nextDate;
  }

  // HISTORY & ANALYTICS
  async getGenerationHistory(profileId: string, tenantId: string): Promise<Invoice[]> {
    const profile = await this.findProfileById(profileId, tenantId);

    return this.invoiceRepo.find({
      where: { recurring_profile_id: profileId },
      order: { created_at: 'DESC' },
    });
  }

  async getRecurringStats(profileId: string, tenantId: string): Promise<any> {
    const profile = await this.findProfileById(profileId, tenantId);
    const history = await this.getGenerationHistory(profileId, tenantId);

    const totalRevenue = history.reduce(
      (sum, inv) => sum + (inv.grand_total || 0),
      0,
    );
    const paidInvoices = history.filter(inv => inv.status === 'paid');

    return {
      profile_id: profileId,
      total_generated: history.length,
      run_count: profile.run_count || 0,
      total_revenue: totalRevenue,
      paid_count: paidInvoices.length,
      success_rate: history.length > 0 ? (paidInvoices.length / history.length) * 100 : 0,
      next_scheduled: profile.next_run,
      is_active: profile.is_active,
      frequency: profile.frequency,
    };
  }

  // ADVANCED FEATURES
  async previewNextInvoice(profileId: string, tenantId: string): Promise<any> {
    const profile = await this.findProfileById(profileId, tenantId);
    const template = await this.templateService.findTemplateById(
      profile.template_id,
      tenantId,
    );

    return {
      profile_id: profileId,
      template_name: template.master.name,
      scheduled_for: profile.next_run,
      preview_number: `INV-PREVIEW-${Date.now()}`,
      status: profile.auto_send ? 'Will be sent automatically' : 'Will be created as draft',
    };
  }

  async bulkPauseResume(
    profileIds: string[],
    action: 'pause' | 'resume',
    tenantId: string,
  ): Promise<RecurringInvoiceProfile[]> {
    const results: RecurringInvoiceProfile[] = [];

    for (const id of profileIds) {
      try {
        const result =
          action === 'pause'
            ? await this.pauseRecurring(id, tenantId)
            : await this.resumeRecurring(id, tenantId);
        results.push(result);
      } catch (error) {
        this.logger.error(`Error ${action}ing profile ${id}:`, error);
      }
    }

    return results;
  }

  // UTILITY METHODS
  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const count = await this.invoiceRepo.count({ where: { tenant_id: tenantId } });
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }

  private calculateDueDate(issueDate: Date, daysUntilDue: number): Date {
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + daysUntilDue);
    return dueDate;
  }

  async deleteProfile(id: string, tenantId: string): Promise<void> {
    const profile = await this.findProfileById(id, tenantId);

    // Check if any invoices generated
    const generatedCount = await this.invoiceRepo.count({
      where: { recurring_profile_id: id },
    });

    if (generatedCount > 0) {
      // Soft delete - just deactivate
      await this.recurringRepo.update(id, {
        is_active: false,
        updated_at: new Date(),
      });
    } else {
      // Hard delete if no invoices generated
      await this.recurringRepo.remove(profile);
    }
  }
}
