import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';

// Entities - Corrected paths
import { Invoice } from '../invoice.entity';
import { InvoiceLineItem } from '../invoice-line-item.entity';
import { InvoiceTemplate } from '../invoice-template.entity';
import { InvoiceTemplateMaster } from '../invoice-template-master.entity';
import { InvoiceTemplateVersion } from '../invoice-template-version.entity';
import { RecurringInvoiceProfile } from '../recurring-invoice-profile.entity';

// Services - Core - Corrected paths
import { InvoiceService } from '../services/invoice.service';
import { TemplateManagementService } from '../services/template-management.service';
import { RecurringInvoiceService } from '../services/recurring-invoice-profile.service';

// Services - Integration - Corrected path
import {
  DistributionIntegrationService,
  PaymentIntegrationService,
  NotificationIntegrationService,
  GLPostingIntegrationService,
} from '../integration/cross-module.integration';

// Controllers - Corrected paths
import { InvoiceController } from '../controllers/invoice.controller';
import { InvoiceControllerExtended } from '../controllers/invoice-extended.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceLineItem,
      InvoiceTemplate,
      InvoiceTemplateMaster,
      InvoiceTemplateVersion,
      RecurringInvoiceProfile,
    ]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ScheduleModule.forRoot(), // For recurring invoice scheduler
  ],
  controllers: [
    InvoiceController,
    InvoiceControllerExtended,
  ],
  providers: [
    // Core Services
    InvoiceService,
    TemplateManagementService,
    RecurringInvoiceService,

    // Integration Services
    DistributionIntegrationService,
    PaymentIntegrationService,
    NotificationIntegrationService,
    GLPostingIntegrationService,
  ],
  exports: [
    InvoiceService,
    TemplateManagementService,
    RecurringInvoiceService,
    // Export integration services for use by other modules
    DistributionIntegrationService,
    PaymentIntegrationService,
    NotificationIntegrationService,
    GLPostingIntegrationService,
  ],
})
export class InvoiceModule { }
