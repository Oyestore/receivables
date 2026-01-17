import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// Entities
import {
    DisputeCase,
    WorkflowState,
    WorkflowTransition,
    ApprovalWorkflow,
    ApprovalHistory,
    DisputeAuditLog,
    CollectionCase,
    CollectionSequence,
    LegalProviderProfile,
    DocumentTemplate,
    GeneratedDocument,
    MSMECase
} from './entities';

// Services
import { DisputeManagementService } from './services/dispute-management.service';
import { LegalNetworkService } from './services/legal-network.service';
import { DocumentTemplateService } from './services/document-template.service';
import { DocumentGeneratorService } from './services/document-generator.service';
import { PDFGenerationService } from './services/pdf-generation.service';
import { MSMEPortalService } from './services/msme-portal.service';
// Phase 8.1 Services
import { WorkflowEngineService } from './services/workflow-engine.service';
import { ApprovalService } from './services/approval.service';
import { AuditService } from './services/audit.service';
// Phase 8.2 Services
import { CollectionManagementService } from './services/collection-management.service';
import { CollectionSequenceService } from './services/collection-sequence.service';
import { AttorneyMatchingService } from './services/attorney-matching.service';
// Phase 8.3 Services
import { DisputeAIPredictionService } from './services/dispute-ai-prediction.service';
// Phase 8.4 Services
import { IndiaComplianceService } from './services/india-compliance.service';
import { DigitalSignatureService } from './services/digital-signature.service';
// Event Handlers
import { InvoiceEventHandlerService } from './services/invoice-event-handler.service';

// Controllers
import { DisputeController } from './controllers/dispute.controller';
import { LegalNetworkController } from './controllers/legal-network.controller';
import { DocumentController } from './controllers/document.controller';
import { MSMEController } from './controllers/msme.controller';
import { CollectionController } from './controllers/collection.controller';

// Adapters
import { CommunicationAdapter } from './integrations/adapters/communication.adapter';

import { CommonModule } from '../../Module_11_Common/common.module';
import { InvoiceModule } from '../../Module_01_Smart_Invoice_Generation/src/invoice.module';
import { PaymentModule } from '../../Module_03_Payment_Integration/src/payment.module';

@Module({
    imports: [
        HttpModule,
        CommonModule,
        InvoiceModule,
        PaymentModule,
        TypeOrmModule.forFeature([
            // Phase 8.1
            DisputeCase,
            WorkflowState,
            WorkflowTransition,
            ApprovalWorkflow,
            ApprovalHistory,
            DisputeAuditLog,
            // Phase 8.2
            CollectionCase,
            CollectionSequence,
            LegalProviderProfile,
            DocumentTemplate,
            GeneratedDocument,
            // Phase 8.4
            MSMECase,
        ])
    ],
    controllers: [
        DisputeController,
        LegalNetworkController,
        DocumentController,
        MSMEController,
        CollectionController,
    ],
    providers: [
        DisputeManagementService,
        LegalNetworkService,
        DocumentTemplateService,
        DocumentGeneratorService,
        PDFGenerationService,
        MSMEPortalService,
        // Phase 8.1
        WorkflowEngineService,
        ApprovalService,
        AuditService,
        // Phase 8.2
        CollectionManagementService,
        CollectionSequenceService,
        AttorneyMatchingService,
        // Phase 8.3
        DisputeAIPredictionService,
        // Phase 8.4
        IndiaComplianceService,
        DigitalSignatureService,
        // Event Handlers
        InvoiceEventHandlerService,
        // Adapters
        CommunicationAdapter,
    ],
    exports: [
        DisputeManagementService,
        LegalNetworkService,
        DocumentTemplateService,
        DocumentGeneratorService,
        PDFGenerationService,
        MSMEPortalService,
        // Phase 8.1
        WorkflowEngineService,
        ApprovalService,
        AuditService,
        // Phase 8.2
        CollectionManagementService,
        CollectionSequenceService,
        AttorneyMatchingService,
        // Phase 8.3
        DisputeAIPredictionService,
        // Phase 8.4
        IndiaComplianceService,
        DigitalSignatureService,
    ]
})
export class DisputeResolutionModule { }
