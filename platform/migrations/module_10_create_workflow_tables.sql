-- Module 10: Orchestration Hub - Database Migration
-- Create workflows and workflow_executions tables

-- Drop tables if exist (for development)
DROP TABLE IF EXISTS workflow_executions CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;

-- Create workflows table
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    workflow_name VARCHAR(200) NOT NULL,
    description TEXT,
    workflow_type VARCHAR(20) NOT NULL CHECK (workflow_type IN ('scheduled', 'triggered', 'manual')),
    module_name VARCHAR(100) NOT NULL,
    
    -- Steps stored as JSONB
    steps JSONB NOT NULL,
    
    -- Schedule configuration (for scheduled workflows)
    schedule JSONB,
    
    -- Trigger configuration (for triggered workflows)
    trigger JSONB,
    
    -- Status and execution tracking
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
    execution_count INTEGER DEFAULT 0,
    last_executed TIMESTAMP,
    next_execution TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

-- Create workflow_executions table
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    
    execution_status VARCHAR(20) NOT NULL CHECK (execution_status IN ('running', 'completed', 'failed', 'cancelled')),
    
    -- Step results stored as JSONB
    step_results JSONB,
    
    -- Execution timing
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration INTEGER, -- in seconds
    
    error TEXT,
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_workflows_tenant ON workflows(tenant_id);
CREATE INDEX idx_workflows_module ON workflows(module_name);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_type ON workflows(workflow_type);
CREATE INDEX idx_workflows_next_execution ON workflows(next_execution);

CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_tenant ON workflow_executions(tenant_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(execution_status);
CREATE INDEX idx_workflow_executions_started ON workflow_executions(started_at DESC);

-- Create updated_at trigger for workflows
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_workflows_updated_at();

-- Insert sample workflow for demonstration
INSERT INTO workflows (
    tenant_id,
    workflow_name,
    description,
    workflow_type,
    module_name,
    steps,
    schedule,
    status,
    created_by
) VALUES (
    '00000000-0000-0000-0000-000000000001', -- Demo tenant
    'Daily Invoice Processing',
    'Automated daily invoice generation and distribution',
    'scheduled',
    'Invoice Generation',
    '[
        {"stepId": "1", "stepName": "Generate Invoices", "action": "generate_invoices", "retryCount": 3},
        {"stepId": "2", "stepName": "Send Notifications", "action": "send_notifications", "retryCount": 2},
        {"stepId": "3", "stepName": "Update Records", "action": "update_records"}
    ]'::jsonb,
    '{"cron": "0 8 * * *", "timezone": "UTC"}'::jsonb,
    'active',
    '00000000-0000-0000-0000-000000000001'
);

-- Verification query
SELECT 
    COUNT(*) as total_workflows,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_workflows
FROM workflows;
