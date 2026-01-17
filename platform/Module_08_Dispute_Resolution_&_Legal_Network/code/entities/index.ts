// Phase 8.1: Core Dispute Management
export { DisputeCase, DisputeStatus, DisputeType, DisputePriority } from './dispute-case.entity';
export { WorkflowState, WorkflowTransition, WorkflowStateType, TransitionType } from './workflow-state.entity';
export { ApprovalWorkflow, ApprovalHistory, ApprovalStatus, ApprovalLevel, ApprovalDecision } from './approval-workflow.entity';
export { DisputeAuditLog, AuditAction, AuditEntityType } from './dispute-audit-log.entity';

// Phase 8.2: Collection & Legal Network
export { CollectionCase, CollectionSequence, CollectionStatus, CollectionStrategy } from './collection-case.entity';
export { LegalProviderProfile } from './legal-provider-profile.entity';
export { DocumentTemplate } from './document-template.entity';
export { GeneratedDocument } from './generated-document.entity';

// Phase 8.4: India-Specific
export { MSMECase } from './msme-case.entity';
