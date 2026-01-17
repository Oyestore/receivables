-- =====================================================
-- Module 05: Milestone Workflows Database Schema
-- =====================================================
-- Initial Schema Migration
-- Version: 001
-- Created: 2025-01-12
-- Description: Complete database schema for Milestone-Based Payment Workflow Module

-- =====================================================
-- Core Milestone Tables
-- =====================================================

-- Milestones Table
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    tenant_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255) NOT NULL,
    client_id VARCHAR(255),
    contract_id VARCHAR(255),
    milestone_type VARCHAR(50) NOT NULL DEFAULT 'DELIVERABLE',
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    value DECIMAL(15,2),
    currency VARCHAR(3),
    progress_percentage DECIMAL(5,2),
    start_date DATE,
    due_date DATE,
    completed_date DATE,
    verified_date DATE,
    approved_date DATE,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    dependencies JSONB,
    completion_criteria JSONB,
    verification_requirements JSONB,
    payment_terms JSONB,
    metadata JSONB,
    custom_fields JSONB,
    notes TEXT,
    internal_notes TEXT,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    is_template BOOLEAN DEFAULT FALSE,
    template_name VARCHAR(255),
    version INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Milestone Workflows Table
CREATE TABLE milestone_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tenant_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    workflow_type VARCHAR(50) NOT NULL DEFAULT 'LINEAR',
    workflow_definition JSONB,
    workflow_rules JSONB,
    triggers JSONB,
    conditions JSONB,
    actions JSONB,
    total_milestones INTEGER DEFAULT 0,
    completed_milestones INTEGER DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    template_id VARCHAR(255),
    is_template BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Verification and Evidence Tables
-- =====================================================

-- Milestone Verifications Table
CREATE TABLE milestone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    milestone_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    verification_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    verified_by VARCHAR(255),
    assigned_to VARCHAR(255),
    verification_criteria JSONB,
    checklist JSONB,
    evidence JSONB,
    test_results JSONB,
    approvals JSONB,
    rejections JSONB,
    verification_notes TEXT,
    rejection_reason TEXT,
    feedback JSONB,
    submitted_date DATE,
    due_date DATE,
    verified_date DATE,
    verification_duration INTEGER,
    attempt_count INTEGER DEFAULT 0,
    score DECIMAL(5,2),
    priority VARCHAR(255),
    notifications JSONB,
    attachments JSONB,
    audit_trail JSONB,
    metadata JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Milestone Evidence Table
CREATE TABLE milestone_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    milestone_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    evidence_type VARCHAR(50) NOT NULL DEFAULT 'DOCUMENT',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    uploaded_by VARCHAR(255),
    verified_by VARCHAR(255),
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(1000),
    mime_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64),
    metadata JSONB,
    extraction_data JSONB,
    verification_results JSONB,
    verification_notes TEXT,
    rejection_reason TEXT,
    uploaded_date DATE,
    verified_date DATE,
    expiry_date DATE,
    version INTEGER,
    parent_evidence_id VARCHAR(255),
    tags JSONB,
    categories JSONB,
    is_required BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Owner and Escalation Tables
-- =====================================================

-- Milestone Owners Table
CREATE TABLE milestone_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    milestone_id VARCHAR(255) NOT NULL,
    owner_id VARCHAR(255) NOT NULL,
    owner_type VARCHAR(50) NOT NULL DEFAULT 'INDIVIDUAL',
    owner_role VARCHAR(50) NOT NULL DEFAULT 'PRIMARY',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    assigned_by VARCHAR(255),
    delegated_to VARCHAR(255),
    delegated_by VARCHAR(255),
    responsibilities TEXT,
    permissions JSONB,
    workload JSONB,
    workload_percentage DECIMAL(5,2),
    estimated_hours INTEGER,
    actual_hours INTEGER,
    assigned_date DATE,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    performance_metrics JSONB,
    notifications JSONB,
    preferences JSONB,
    expertise JSONB,
    priority INTEGER DEFAULT 0,
    is_backup BOOLEAN DEFAULT FALSE,
    can_delegate BOOLEAN DEFAULT TRUE,
    receive_notifications BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Milestone Escalations Table
CREATE TABLE milestone_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    milestone_id VARCHAR(255) NOT NULL,
    workflow_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    severity VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    escalation_type VARCHAR(50) NOT NULL DEFAULT 'DELAY',
    escalated_by VARCHAR(255),
    assigned_to VARCHAR(255),
    escalation_reason JSONB,
    impact_assessment JSONB,
    resolution_plan JSONB,
    actions JSONB,
    delay_days INTEGER,
    financial_impact DECIMAL(15,2),
    priority VARCHAR(255),
    escalated_date DATE,
    target_resolution_date DATE,
    actual_resolution_date DATE,
    resolution_notes TEXT,
    notifications JSONB,
    stakeholders JSONB,
    attachments JSONB,
    internal_notes TEXT,
    resolved_by VARCHAR(255),
    approved_by VARCHAR(255),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern JSONB,
    metadata JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Status Probing Table
-- =====================================================

-- Milestone Status Probes Table
CREATE TABLE milestone_status_probes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    milestone_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    probe_type VARCHAR(50) NOT NULL DEFAULT 'AUTOMATED',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    frequency VARCHAR(50) NOT NULL DEFAULT 'ONCE',
    created_by VARCHAR(255),
    probe_config JSONB,
    target_system JSONB,
    credentials JSONB,
    query_parameters JSONB,
    expected_results JSONB,
    actual_results JSONB,
    comparison_rules JSONB,
    probe_query TEXT,
    api_url TEXT,
    headers JSONB,
    email_template TEXT,
    sms_template TEXT,
    last_probe_date DATE,
    next_probe_date DATE,
    start_date DATE,
    end_date DATE,
    interval_minutes INTEGER,
    attempt_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_error TEXT,
    error_history JSONB,
    max_retries INTEGER DEFAULT 5,
    timeout_seconds INTEGER DEFAULT 300,
    is_active BOOLEAN DEFAULT TRUE,
    is_enabled BOOLEAN DEFAULT TRUE,
    send_notifications BOOLEAN DEFAULT FALSE,
    notification_channels JSONB,
    metadata JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Workflow Management Tables
-- =====================================================

-- Workflow Definitions Table
CREATE TABLE workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    workflow_type VARCHAR(50) NOT NULL DEFAULT 'LINEAR',
    workflow_structure JSONB NOT NULL,
    node_definitions JSONB,
    edge_definitions JSONB,
    conditions JSONB,
    actions JSONB,
    triggers JSONB,
    validators JSONB,
    notifications JSONB,
    escalations JSONB,
    category VARCHAR(255),
    tags JSONB,
    industry VARCHAR(255),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    is_template BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    is_reusable BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    average_completion_time DECIMAL(5,2),
    success_rate DECIMAL(5,2),
    version_history JSONB,
    version INTEGER DEFAULT 1,
    metadata JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Instances Table
CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    workflow_definition_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    initiated_by VARCHAR(255) NOT NULL,
    context JSONB,
    variables JSONB,
    input_parameters JSONB,
    output_parameters JSONB,
    execution_history JSONB,
    current_node_states JSONB,
    completed_nodes JSONB,
    failed_nodes JSONB,
    error_log JSONB,
    start_date DATE,
    end_date DATE,
    last_activity_date DATE,
    duration_minutes INTEGER,
    progress_percentage INTEGER DEFAULT 0,
    total_nodes INTEGER DEFAULT 0,
    completed_nodes_count INTEGER DEFAULT 0,
    failed_nodes_count INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 0,
    failure_reason TEXT,
    notifications JSONB,
    escalations JSONB,
    metadata JSONB,
    parent_instance_id VARCHAR(255),
    child_instance_ids JSONB,
    is_template BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow States Table
CREATE TABLE workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id VARCHAR(255) NOT NULL,
    node_id VARCHAR(255) NOT NULL,
    node_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    state_type VARCHAR(50) NOT NULL DEFAULT 'TASK',
    state_data JSONB,
    input_parameters JSONB,
    output_parameters JSONB,
    execution_log JSONB,
    start_date DATE,
    end_date DATE,
    duration_seconds INTEGER,
    attempt_count INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    conditions JSONB,
    transitions JSONB,
    metadata JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Advanced Workflow Tables
-- =====================================================

-- Workflow Orchestration Table
CREATE TABLE workflow_orchestrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    orchestration_type VARCHAR(255) NOT NULL,
    configuration JSONB,
    schedule JSONB,
    triggers JSONB,
    execution_log JSONB,
    last_run DATE,
    next_run DATE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Specialized Workflow Tables
-- =====================================================

-- Success Milestones Table
CREATE TABLE success_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    milestone_type VARCHAR(50) NOT NULL DEFAULT 'PROJECT_COMPLETION',
    achieved_by VARCHAR(255),
    achieved_date DATE,
    value DECIMAL(15,2),
    currency VARCHAR(3),
    metrics JSONB,
    achievements JSONB,
    recognition JSONB,
    rewards JSONB,
    impact JSONB,
    lessons JSONB,
    best_practices JSONB,
    metadata JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financing Workflows Table
CREATE TABLE financing_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    project_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    term_months INTEGER NOT NULL,
    terms JSONB,
    collateral JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financing Workflow Instances Table
CREATE TABLE financing_workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    financing_workflow_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    disbursed_amount DECIMAL(15,2) NOT NULL,
    disbursement_date DATE NOT NULL,
    repayment_date DATE,
    repayment_schedule JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding Workflows Table
CREATE TABLE onboarding_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    steps JSONB,
    documents JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Personalized Workflows Table
CREATE TABLE personalized_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    preferences JSONB,
    customizations JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Indexes for Performance Optimization
-- =====================================================

-- Milestone Indexes
CREATE INDEX idx_milestones_tenant_status ON milestones(tenant_id, status);
CREATE INDEX idx_milestones_project_status ON milestones(project_id, status);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);
CREATE INDEX idx_milestones_type ON milestones(milestone_type);
CREATE INDEX idx_milestones_tenant_project ON milestones(tenant_id, project_id);

-- Workflow Indexes
CREATE INDEX idx_milestone_workflows_tenant_status ON milestone_workflows(tenant_id, status);
CREATE INDEX idx_milestone_workflows_project ON milestone_workflows(project_id);
CREATE INDEX idx_milestone_workflows_type ON milestone_workflows(workflow_type);
CREATE INDEX idx_milestone_workflows_template ON milestone_workflows(is_template);

-- Verification Indexes
CREATE INDEX idx_milestone_verifications_tenant_status ON milestone_verifications(tenant_id, status);
CREATE INDEX idx_milestone_verifications_milestone_status ON milestone_verifications(milestone_id, status);
CREATE INDEX idx_milestone_verifications_type ON milestone_verifications(verification_type);
CREATE INDEX idx_milestone_verifications_date ON milestone_verifications(verified_date);

-- Evidence Indexes
CREATE INDEX idx_milestone_evidence_tenant_status ON milestone_evidence(tenant_id, status);
CREATE INDEX idx_milestone_evidence_milestone_status ON milestone_evidence(milestone_id, status);
CREATE INDEX idx_milestone_evidence_type ON milestone_evidence(evidence_type);
CREATE INDEX idx_milestone_evidence_date ON milestone_evidence(uploaded_date);

-- Owner Indexes
CREATE INDEX idx_milestone_owners_tenant_status ON milestone_owners(tenant_id, status);
CREATE INDEX idx_milestone_owners_milestone_role ON milestone_owners(milestone_id, owner_role);
CREATE INDEX idx_milestone_owners_owner_type ON milestone_owners(owner_id, owner_type);
CREATE INDEX idx_milestone_owners_date ON milestone_owners(assigned_date);

-- Escalation Indexes
CREATE INDEX idx_milestone_escalations_tenant_status ON milestone_escalations(tenant_id, status);
CREATE INDEX idx_milestone_escalations_milestone_status ON milestone_escalations(milestone_id, status);
CREATE INDEX idx_milestone_escalations_severity ON milestone_escalations(severity);
CREATE INDEX idx_milestone_escalations_type ON milestone_escalations(escalation_type);
CREATE INDEX idx_milestone_escalations_date ON milestone_escalations(escalated_date);

-- Status Probe Indexes
CREATE INDEX idx_milestone_status_probes_tenant_status ON milestone_status_probes(tenant_id, status);
CREATE INDEX idx_milestone_status_probes_milestone_type ON milestone_status_probes(milestone_id, probe_type);
CREATE INDEX idx_milestone_status_probes_next_date ON milestone_status_probes(next_probe_date);
CREATE INDEX idx_milestone_status_probes_frequency ON milestone_status_probes(frequency);

-- Workflow Definition Indexes
CREATE INDEX idx_workflow_definitions_tenant_status ON workflow_definitions(tenant_id, status);
CREATE INDEX idx_workflow_definitions_type ON workflow_definitions(workflow_type);
CREATE INDEX idx_workflow_definitions_template ON workflow_definitions(is_template);
CREATE INDEX idx_workflow_definitions_category ON workflow_definitions(category);

-- Workflow Instance Indexes
CREATE INDEX idx_workflow_instances_tenant_status ON workflow_instances(tenant_id, status);
CREATE INDEX idx_workflow_instances_definition_status ON workflow_instances(workflow_definition_id, status);
CREATE INDEX idx_workflow_instances_initiated ON workflow_instances(initiated_by);
CREATE INDEX idx_workflow_instances_date ON workflow_instances(start_date);

-- Workflow State Indexes
CREATE INDEX idx_workflow_states_instance_status ON workflow_states(workflow_instance_id, status);
CREATE INDEX idx_workflow_states_node ON workflow_states(node_id);
CREATE INDEX idx_workflow_states_type ON workflow_states(state_type);

-- Specialized Workflow Indexes
CREATE INDEX idx_success_milestones_tenant_type ON success_milestones(tenant_id, milestone_type);
CREATE INDEX idx_success_milestones_project ON success_milestones(project_id);
CREATE INDEX idx_success_milestones_date ON success_milestones(achieved_date);

CREATE INDEX idx_financing_workflows_tenant_status ON financing_workflows(tenant_id, status);
CREATE INDEX idx_financing_workflows_project ON financing_workflows(project_id);

CREATE INDEX idx_financing_instances_workflow_status ON financing_workflow_instances(financing_workflow_id, status);

CREATE INDEX idx_onboarding_workflows_tenant_status ON onboarding_workflows(tenant_id, status);
CREATE INDEX idx_onboarding_workflows_client ON onboarding_workflows(client_id);

CREATE INDEX idx_personalized_workflows_tenant_status ON personalized_workflows(tenant_id, status);
CREATE INDEX idx_personalized_workflows_user ON personalized_workflows(user_id);

-- =====================================================
-- Foreign Key Constraints
-- =====================================================

-- Milestone Foreign Keys
ALTER TABLE milestones ADD CONSTRAINT fk_milestones_workflow 
    FOREIGN KEY (workflow_id) REFERENCES milestone_workflows(id) ON DELETE SET NULL;

-- Verification Foreign Keys
ALTER TABLE milestone_verifications ADD CONSTRAINT fk_verifications_milestone 
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE;

-- Evidence Foreign Keys
ALTER TABLE milestone_evidence ADD CONSTRAINT fk_evidence_milestone 
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE;

-- Owner Foreign Keys
ALTER TABLE milestone_owners ADD CONSTRAINT fk_owners_milestone 
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE;

-- Escalation Foreign Keys
ALTER TABLE milestone_escalations ADD CONSTRAINT fk_escalations_milestone 
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE;
ALTER TABLE milestone_escalations ADD CONSTRAINT fk_escalations_workflow 
    FOREIGN KEY (workflow_id) REFERENCES milestone_workflows(id) ON DELETE SET NULL;

-- Status Probe Foreign Keys
ALTER TABLE milestone_status_probes ADD CONSTRAINT fk_probes_milestone 
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE;

-- Workflow Instance Foreign Keys
ALTER TABLE workflow_instances ADD CONSTRAINT fk_instances_definition 
    FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE;

-- Workflow State Foreign Keys
ALTER TABLE workflow_states ADD CONSTRAINT fk_states_instance 
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE;

-- Financing Instance Foreign Keys
ALTER TABLE financing_workflow_instances ADD CONSTRAINT fk_financing_instances_workflow 
    FOREIGN KEY (financing_workflow_id) REFERENCES financing_workflows(id) ON DELETE CASCADE;

-- =====================================================
-- Triggers for Automatic Updates
-- =====================================================

-- Update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestone_workflows_updated_at BEFORE UPDATE ON milestone_workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestone_verifications_updated_at BEFORE UPDATE ON milestone_verifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestone_evidence_updated_at BEFORE UPDATE ON milestone_evidence 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestone_owners_updated_at BEFORE UPDATE ON milestone_owners 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestone_escalations_updated_at BEFORE UPDATE ON milestone_escalations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestone_status_probes_updated_at BEFORE UPDATE ON milestone_status_probes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_definitions_updated_at BEFORE UPDATE ON workflow_definitions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_instances_updated_at BEFORE UPDATE ON workflow_instances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_states_updated_at BEFORE UPDATE ON workflow_states 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_orchestrations_updated_at BEFORE UPDATE ON workflow_orchestrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_success_milestones_updated_at BEFORE UPDATE ON success_milestones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financing_workflows_updated_at BEFORE UPDATE ON financing_workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financing_workflow_instances_updated_at BEFORE UPDATE ON financing_workflow_instances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_workflows_updated_at BEFORE UPDATE ON onboarding_workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personalized_workflows_updated_at BEFORE UPDATE ON personalized_workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Views for Common Queries
-- =====================================================

-- Milestone Summary View
CREATE VIEW milestone_summary AS
SELECT 
    m.id,
    m.title,
    m.status,
    m.priority,
    m.due_date,
    m.progress_percentage,
    m.value,
    m.currency,
    m.tenant_id,
    m.project_id,
    mw.name as workflow_name,
    COUNT(mo.id) as owner_count,
    COUNT(me.id) as evidence_count,
    COUNT(mv.id) as verification_count,
    COUNT(mesc.id) as escalation_count
FROM milestones m
LEFT JOIN milestone_workflows mw ON m.workflow_id = mw.id
LEFT JOIN milestone_owners mo ON m.id = mo.milestone_id AND mo.is_deleted = FALSE
LEFT JOIN milestone_evidence me ON m.id = me.milestone_id AND me.is_deleted = FALSE
LEFT JOIN milestone_verifications mv ON m.id = mv.milestone_id AND mv.is_deleted = FALSE
LEFT JOIN milestone_escalations mesc ON m.id = mesc.milestone_id AND mesc.is_deleted = FALSE
WHERE m.is_deleted = FALSE
GROUP BY m.id, mw.name;

-- Workflow Progress View
CREATE VIEW workflow_progress AS
SELECT 
    mw.id,
    mw.name,
    mw.status,
    mw.progress_percentage,
    mw.total_milestones,
    mw.completed_milestones,
    COUNT(m.id) as actual_milestones,
    COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END) as actual_completed,
    mw.tenant_id,
    mw.project_id,
    mw.start_date,
    mw.end_date
FROM milestone_workflows mw
LEFT JOIN milestones m ON mw.id = m.workflow_id AND m.is_deleted = FALSE
WHERE mw.is_deleted = FALSE
GROUP BY mw.id;

-- Escalation Dashboard View
CREATE VIEW escalation_dashboard AS
SELECT 
    me.id,
    me.title,
    me.status,
    me.severity,
    me.escalation_type,
    me.escalated_date,
    me.target_resolution_date,
    me.actual_resolution_date,
    me.delay_days,
    me.financial_impact,
    me.tenant_id,
    m.title as milestone_title,
    m.project_id,
    mw.name as workflow_name
FROM milestone_escalations me
LEFT JOIN milestones m ON me.milestone_id = m.id
LEFT JOIN milestone_workflows mw ON me.workflow_id = mw.id
WHERE me.is_deleted = FALSE;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE milestones IS 'Core milestones table for tracking project milestones and their status';
COMMENT ON TABLE milestone_workflows IS 'Workflow definitions for milestone-based payment processes';
COMMENT ON TABLE milestone_verifications IS 'Verification records for milestone completion';
COMMENT ON TABLE milestone_evidence IS 'Evidence and documentation for milestones';
COMMENT ON TABLE milestone_owners IS 'Owner assignments and responsibilities for milestones';
COMMENT ON TABLE milestone_escalations IS 'Escalation records for delayed or problematic milestones';
COMMENT ON TABLE milestone_status_probes IS 'Automated status probing configurations';
COMMENT ON TABLE workflow_definitions IS 'Reusable workflow definitions and templates';
COMMENT ON TABLE workflow_instances IS 'Active workflow execution instances';
COMMENT ON TABLE workflow_states IS 'Current state of individual workflow nodes';
COMMENT ON TABLE workflow_orchestrations IS 'Workflow orchestration and scheduling';
COMMENT ON TABLE success_milestones IS 'Achievement and success milestone tracking';
COMMENT ON TABLE financing_workflows IS 'Financing workflow configurations';
COMMENT ON TABLE financing_workflow_instances IS 'Individual financing workflow executions';
COMMENT ON TABLE onboarding_workflows IS 'Client onboarding workflow processes';
COMMENT ON TABLE personalized_workflows IS 'User-specific workflow customizations';
