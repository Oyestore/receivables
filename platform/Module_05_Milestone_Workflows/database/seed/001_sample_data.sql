-- =====================================================
-- Module 05: Milestone Workflows Seed Data
-- =====================================================
-- Seed Data Script
-- Version: 001
-- Created: 2025-01-12
-- Description: Sample data for Milestone-Based Payment Workflow Module

-- =====================================================
-- Enable UUID Extension
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Sample Tenant Data
-- =====================================================
INSERT INTO tenants (id, name, domain, industry, status, created_at, updated_at) VALUES
('tenant-001', 'Acme Manufacturing Pvt Ltd', 'acme.manufacturing', 'Manufacturing', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tenant-002', 'TechSolutions India', 'techsolutions.india', 'Technology', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tenant-003', 'Global Construction Co', 'global.construction', 'Construction', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- =====================================================
-- Sample Project Data
-- =====================================================
INSERT INTO projects (id, tenant_id, name, description, client_name, total_value, currency, start_date, end_date, status, created_at, updated_at) VALUES
('proj-001', 'tenant-001', 'Factory Automation Project', 'Complete factory automation with IoT sensors and robotics', 'Acme Manufacturing', 2500000.00, 'INR', '2025-01-01', '2025-06-30', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('proj-002', 'tenant-002', 'Mobile App Development', 'Native mobile app for customer engagement', 'TechSolutions', 1800000.00, 'INR', '2025-01-15', '2025-04-15', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('proj-003', 'tenant-003', 'Commercial Building Construction', '10-story commercial building construction', 'Global Construction', 15000000.00, 'INR', '2025-01-01', '2025-12-31', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- =====================================================
-- Sample Milestone Workflows
-- =====================================================
INSERT INTO milestone_workflows (
    id, tenant_id, project_id, name, description, workflow_type, status,
    workflow_definition, total_milestones, completed_milestones, progress_percentage,
    start_date, end_date, created_by, updated_by, created_at, updated_at
) VALUES
(
    'mw-001', 'tenant-001', 'proj-001', 'Factory Automation Workflow',
    'Complete workflow for factory automation project with hardware and software milestones',
    'HYBRID', 'ACTIVE',
    '{"nodes": [{"id": "start", "type": "start"}, {"id": "design", "type": "task"}, {"id": "procurement", "type": "task"}, {"id": "installation", "type": "task"}, {"id": "testing", "type": "task"}, {"id": "end", "type": "end"}], "edges": [{"from": "start", "to": "design"}, {"from": "design", "to": "procurement"}, {"from": "procurement", "to": "installation"}, {"from": "installation", "to": "testing"}, {"from": "testing", "to": "end"}]}',
    8, 2, 25.00,
    '2025-01-01', '2025-06-30', 'user-001', 'user-001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'mw-002', 'tenant-002', 'proj-002', 'Mobile App Development Workflow',
    'Agile workflow for mobile app development with sprints',
    'PARALLEL', 'ACTIVE',
    '{"nodes": [{"id": "start", "type": "start"}, {"id": "planning", "type": "task"}, {"id": "design", "type": "task"}, {"id": "development", "type": "task"}, {"id": "testing", "type": "task"}, {"id": "deployment", "type": "end"}], "edges": [{"from": "start", "to": "planning"}, {"from": "planning", "to": "design"}, {"from": "design", "to": "development"}, {"from": "development", "to": "testing"}, {"from": "testing", "to": "deployment"}]}',
    12, 3, 25.00,
    '2025-01-15', '2025-04-15', 'user-002', 'user-002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'mw-003', 'tenant-003', 'proj-003', 'Construction Project Workflow',
    'Construction workflow with parallel activities for different floors',
    'PARALLEL', 'ACTIVE',
    '{"nodes": [{"id": "start", "type": "start"}, {"id": "foundation", "type": "task"}, {"id": "structure", "type": "task"}, {"id": "electrical", "type": "task"}, {"id": "plumbing", "type": "task"}, {"id": "finishing", "type": "end"}], "edges": [{"from": "start", "to": "foundation"}, {"from": "foundation", "to": "structure"}, {"from": "structure", "to": "electrical"}, {"from": "structure", "to": "plumbing"}, {"from": "electrical", "to": "finishing"}, {"from": "plumbing", "to": "finishing"}]}',
    20, 4, 20.00,
    '2025-01-01', '2025-12-31', 'user-003', 'user-003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- =====================================================
-- Sample Milestones
-- =====================================================
INSERT INTO milestones (
    id, tenant_id, project_id, workflow_id, title, description, milestone_type, status,
    priority, value, currency, progress_percentage, start_date, due_date, completed_date,
    dependencies, completion_criteria, verification_requirements, payment_terms,
    created_by, updated_by, is_template, version, is_active, created_at, updated_at
) VALUES
-- Factory Automation Project Milestones
(
    'ms-001', 'tenant-001', 'proj-001', 'mw-001', 'Design Phase Completion',
    'Complete system architecture and hardware design specifications',
    'DELIVERABLE', 'COMPLETED', 'HIGH', 312500.00, 'INR', 100.00,
    '2025-01-01', '2025-01-31', '2025-01-28',
    '[]', '{"documents": ["Architecture Diagram", "Hardware Specs", "Software Design"], "approvals": ["Technical Lead", "Project Manager"]}',
    '{"type": "DOCUMENT_REVIEW", "reviewers": ["technical-lead"], "min_score": 85}',
    '{"payment_trigger": "MILESTONE_COMPLETION", "payment_terms": "NET_30", "retention": 10}',
    'user-001', 'user-001', FALSE, 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'ms-002', 'tenant-001', 'proj-001', 'mw-001', 'Hardware Procurement',
    'Procure all required hardware components and sensors',
    'DELIVERABLE', 'IN_PROGRESS', 'HIGH', 625000.00, 'INR', 60.00,
    '2025-02-01', '2025-02-28', NULL,
    '["ms-001"]', '{"items": ["Sensors", "Controllers", "Actuators", "Cables"], "quality_standards": "ISO_9001"}',
    '{"type": "DOCUMENT_VERIFICATION", "documents": ["Purchase Orders", "Quality Certificates"]}',
    '{"payment_trigger": "MILESTONE_COMPLETION", "payment_terms": "NET_45", "retention": 5}',
    'user-001', 'user-001', FALSE, 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'ms-003', 'tenant-001', 'proj-001', 'mw-001', 'Installation Phase 1',
    'Install sensors and control systems in production area',
    'DELIVERABLE', 'PENDING', 'HIGH', 750000.00, 'INR', 0.00,
    '2025-03-01', '2025-03-31', NULL,
    '["ms-002"]', '{"area": "Production Floor", "systems": ["Sensor Network", "Control Panel"], "safety_compliance": true}',
    '{"type": "SITE_INSPECTION", "inspectors": ["safety-officer", "technical-lead"], "checklist": ["Installation Quality", "Safety Compliance"]}',
    '{"payment_trigger": "MILESTONE_COMPLETION", "payment_terms": "NET_30", "retention": 10}',
    'user-001', 'user-001', FALSE, 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Mobile App Development Milestones
(
    'ms-004', 'tenant-002', 'proj-002', 'mw-002', 'UI/UX Design Complete',
    'Complete user interface and user experience design',
    'DELIVERABLE', 'COMPLETED', 'HIGH', 300000.00, 'INR', 100.00,
    '2025-01-15', '2025-02-15', '2025-02-12',
    '[]', '{"deliverables": ["Wireframes", "Mockups", "Design System"], "tools": ["Figma", "Sketch"]}',
    '{"type": "DESIGN_REVIEW", "reviewers": ["product-manager", "ui-lead"], "approval_required": true}',
    '{"payment_trigger": "MILESTONE_COMPLETION", "payment_terms": "NET_15", "retention": 0}',
    'user-002', 'user-002', FALSE, 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'ms-005', 'tenant-002', 'proj-002', 'mw-002', 'Backend API Development',
    'Develop RESTful APIs and database schema',
    'DELIVERABLE', 'IN_PROGRESS', 'HIGH', 450000.00, 'INR', 70.00,
    '2025-02-01', '2025-03-15', NULL,
    '["ms-004"]', '{"apis": ["User Management", "Data Sync", "Notifications"], "database": "PostgreSQL", "documentation": true}',
    '{"type": "CODE_REVIEW", "reviewers": ["tech-lead"], "test_coverage": ">=80%"}',
    '{"payment_trigger": "MILESTONE_COMPLETION", "payment_terms": "NET_30", "retention": 5}',
    'user-002', 'user-002', FALSE, 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Construction Project Milestones
(
    'ms-006', 'tenant-003', 'proj-003', 'mw-003', 'Foundation Work Complete',
    'Complete building foundation and ground floor structure',
    'DELIVERABLE', 'COMPLETED', 'CRITICAL', 2000000.00, 'INR', 100.00,
    '2025-01-01', '2025-03-31', '2025-03-28',
    '[]', '{"scope": ["Excavation", "Foundation", "Ground Floor"], "materials": ["Concrete", "Steel"], "standards": ["IS_456"]}',
    '{"type": "STRUCTURAL_INSPECTION", "inspectors": ["structural-engineer", "safety-officer"], "tests": ["Concrete Strength", "Steel Integrity"]}',
    '{"payment_trigger": "MILESTONE_COMPLETION", "payment_terms": "NET_45", "retention": 10}',
    'user-003', 'user-003', FALSE, 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'ms-007', 'tenant-003', 'proj-003', 'mw-003', 'Structure Floor 5-7',
    'Complete structural work for floors 5-7',
    'DELIVERABLE', 'IN_PROGRESS', 'HIGH', 2500000.00, 'INR', 40.00,
    '2025-04-01', '2025-08-31', NULL,
    '["ms-006"]', '{"floors": [5, 6, 7], "area": "15000_sqft", "materials": ["Concrete", "Steel", "Bricks"]}',
    '{"type": "PROGRESS_INSPECTION", "frequency": "WEEKLY", "inspectors": ["site-engineer"]}',
    '{"payment_trigger": "PROGRESS_BASED", "payment_terms": "NET_30", "retention": 5}',
    'user-003', 'user-003', FALSE, 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- =====================================================
-- Sample Milestone Owners
-- =====================================================
INSERT INTO milestone_owners (
    id, tenant_id, milestone_id, owner_id, owner_type, owner_role, status,
    assigned_by, responsibilities, permissions, workload_percentage,
    estimated_hours, actual_hours, assigned_date, start_date, end_date,
    priority, can_delegate, receive_notifications, is_active, created_at, updated_at
) VALUES
-- Factory Automation Project Owners
(
    'mo-001', 'tenant-001', 'ms-001', 'user-001', 'INDIVIDUAL', 'PRIMARY', 'ACTIVE',
    'user-001', 'Lead design team and coordinate with stakeholders',
    '{"can_edit": true, "can_approve": true, "can_assign": true}',
    100.00, 160, 145, '2025-01-01', '2025-01-01', '2025-01-31',
    1, TRUE, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'mo-002', 'tenant-001', 'ms-002', 'user-002', 'INDIVIDUAL', 'PRIMARY', 'ACTIVE',
    'user-001', 'Manage hardware procurement and vendor relationships',
    '{"can_edit": true, "can_approve": true, "can_assign": false}',
    100.00, 200, 120, '2025-02-01', '2025-02-01', '2025-02-28',
    1, TRUE, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'mo-003', 'tenant-001', 'ms-003', 'user-003', 'TEAM', 'PRIMARY', 'ACTIVE',
    'user-001', 'Lead installation team and ensure safety compliance',
    '{"can_edit": true, "can_approve": false, "can_assign": true}',
    100.00, 240, 0, '2025-03-01', '2025-03-01', '2025-03-31',
    1, TRUE, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Mobile App Development Owners
(
    'mo-004', 'tenant-002', 'ms-004', 'user-004', 'INDIVIDUAL', 'PRIMARY', 'ACTIVE',
    'user-002', 'Lead UI/UX design and user research',
    '{"can_edit": true, "can_approve": true, "can_assign": true}',
    100.00, 120, 125, '2025-01-15', '2025-01-15', '2025-02-15',
    1, TRUE, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'mo-005', 'tenant-002', 'ms-005', 'user-005', 'INDIVIDUAL', 'PRIMARY', 'ACTIVE',
    'user-002', 'Lead backend development and API architecture',
    '{"can_edit": true, "can_approve": false, "can_assign": true}',
    100.00, 180, 126, '2025-02-01', '2025-02-01', '2025-03-15',
    1, TRUE, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),

-- Construction Project Owners
(
    'mo-006', 'tenant-003', 'ms-006', 'user-006', 'INDIVIDUAL', 'PRIMARY', 'ACTIVE',
    'user-003', 'Manage foundation work and structural engineering',
    '{"can_edit": true, "can_approve": true, "can_assign": true}',
    100.00, 480, 510, '2025-01-01', '2025-01-01', '2025-03-31',
    1, TRUE, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'mo-007', 'tenant-003', 'ms-007', 'user-007', 'TEAM', 'PRIMARY', 'ACTIVE',
    'user-003', 'Lead construction team for floors 5-7',
    '{"can_edit": true, "can_approve": false, "can_assign": true}',
    100.00, 600, 240, '2025-04-01', '2025-04-01', '2025-08-31',
    1, TRUE, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- =====================================================
-- Sample Milestone Verifications
-- =====================================================
INSERT INTO milestone_verifications (
    id, tenant_id, milestone_id, title, description, verification_type, status,
    verified_by, assigned_to, verification_criteria, checklist, evidence,
    verification_notes, submitted_date, due_date, verified_date,
    verification_duration, attempt_count, score, priority,
    is_active, created_at, updated_at
) VALUES
(
    'mv-001', 'tenant-001', 'ms-001', 'Design Phase Verification',
    'Verify that all design documents are complete and approved',
    'MANUAL', 'APPROVED', 'user-008', 'user-008',
    '{"documents": ["Architecture Diagram", "Hardware Specs", "Software Design"], "approvals": ["Technical Lead", "Project Manager"]}',
    '[{"item": "Architecture Diagram Complete", "status": "PASS"}, {"item": "Hardware Specifications", "status": "PASS"}, {"item": "Software Design Document", "status": "PASS"}, {"item": "Technical Lead Approval", "status": "PASS"}, {"item": "Project Manager Approval", "status": "PASS"}]',
    '{"documents": [{"name": "architecture_diagram.pdf", "url": "/files/arch/arch_001.pdf"}, {"name": "hardware_specs.pdf", "url": "/files/hw/specs_001.pdf"}], "approvals": [{"approver": "tech-lead", "date": "2025-01-25"}, {"approver": "pm", "date": "2025-01-26"}]}',
    'All design documents reviewed and approved. Quality standards met.',
    '2025-01-27', '2025-01-31', '2025-01-28',
    1, 1, 92.00, 'HIGH',
    TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'mv-002', 'tenant-002', 'ms-004', 'UI/UX Design Review',
    'Review and approve UI/UX design deliverables',
    'MANUAL', 'APPROVED', 'user-009', 'user-009',
    '{"deliverables": ["Wireframes", "Mockups", "Design System"], "tools": ["Figma", "Sketch"]}',
    '[{"item": "Wireframes Complete", "status": "PASS"}, {"item": "High-Fidelity Mockups", "status": "PASS"}, {"item": "Design System", "status": "PASS"}, {"item": "User Research Integration", "status": "PASS"}]',
    '{"documents": [{"name": "wireframes.fig", "url": "/files/ui/wireframes_001.fig"}, {"name": "mockups.pdf", "url": "/files/ui/mockups_001.pdf"}], "prototypes": [{"name": "Interactive Prototype", "url": "/prototypes/mobile_app_001"}]}',
    'Excellent design work. User experience well thought out. Ready for development.',
    '2025-02-10', '2025-02-15', '2025-02-12',
    2, 1, 95.00, 'HIGH',
    TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'mv-003', 'tenant-003', 'ms-006', 'Foundation Inspection',
    'Structural inspection of building foundation',
    'EXTERNAL_AUDIT', 'APPROVED', 'user-010', 'user-010',
    '{"scope": ["Excavation", "Foundation", "Ground Floor"], "materials": ["Concrete", "Steel"], "standards": ["IS_456"]}',
    '[{"item": "Excavation Depth", "status": "PASS"}, {"item": "Concrete Strength", "status": "PASS"}, {"item": "Steel Reinforcement", "status": "PASS"}, {"item": "Waterproofing", "status": "PASS"}, {"item": "Safety Compliance", "status": "PASS"}]',
    '{"test_reports": [{"name": "Concrete Test Report", "result": "PASS", "strength": "25 MPa"}, {"name": "Steel Test Report", "result": "PASS", "grade": "Fe500"}], "inspections": [{"inspector": "structural-eng", "date": "2025-03-25", "status": "PASS"}]}',
    'Foundation work meets all structural requirements and safety standards.',
    '2025-03-26', '2025-03-31', '2025-03-28',
    2, 1, 88.00, 'CRITICAL',
    TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- =====================================================
-- Sample Milestone Evidence
-- =====================================================
INSERT INTO milestone_evidence (
    id, tenant_id, milestone_id, title, description, evidence_type, status,
    uploaded_by, file_name, file_path, mime_type, file_size, file_hash,
    metadata, verification_results, uploaded_date, verified_date,
    is_required, is_public, is_active, created_at, updated_at
) VALUES
(
    'me-001', 'tenant-001', 'ms-001', 'Architecture Diagram',
    'Complete system architecture diagram with all components',
    'DOCUMENT', 'VERIFIED', 'user-001', 'architecture_diagram.pdf',
    '/files/milestones/ms-001/architecture_diagram.pdf', 'application/pdf', 2048576,
    'sha256:abc123def456...',
    '{"version": "1.2", "pages": 15, "created_by": "AutoCAD", "last_modified": "2025-01-20"}',
    '{"status": "VERIFIED", "verified_by": "user-008", "verification_date": "2025-01-28"}',
    '2025-01-20', '2025-01-28',
    TRUE, FALSE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'me-002', 'tenant-001', 'ms-001', 'Hardware Specifications',
    'Detailed hardware specifications for all components',
    'DOCUMENT', 'VERIFIED', 'user-001', 'hardware_specs.pdf',
    '/files/milestones/ms-001/hardware_specs.pdf', 'application/pdf', 1536789,
    'sha256:def456abc789...',
    '{"version": "2.0", "pages": 25, "components": 45, "created_by": "Engineering Team"}',
    '{"status": "VERIFIED", "verified_by": "user-008", "verification_date": "2025-01-28"}',
    '2025-01-22', '2025-01-28',
    TRUE, FALSE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'me-003', 'tenant-002', 'ms-004', 'UI Mockups',
    'High-fidelity UI mockups for mobile application',
    'IMAGE', 'VERIFIED', 'user-004', 'mobile_app_mockups.png',
    '/files/milestones/ms-004/mobile_app_mockups.png', 'image/png', 3072456,
    'sha256:789abc123def...',
    '{"resolution": "1920x1080", "screens": 12, "color_profile": "sRGB", "tool": "Figma"}',
    '{"status": "VERIFIED", "verified_by": "user-009", "verification_date": "2025-02-12"}',
    '2025-02-08', '2025-02-12',
    TRUE, FALSE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'me-004', 'tenant-003', 'ms-006', 'Concrete Test Report',
    'Concrete strength test results for foundation',
    'REPORT', 'VERIFIED', 'user-006', 'concrete_test_report.pdf',
    '/files/milestones/ms-006/concrete_test_report.pdf', 'application/pdf', 892456,
    'sha256:123def456abc...',
    '{"test_date": "2025-03-20", "lab": "ABC Testing Lab", "samples": 12, "avg_strength": "25 MPa"}',
    '{"status": "VERIFIED", "verified_by": "user-010", "verification_date": "2025-03-28"}',
    '2025-03-22', '2025-03-28',
    TRUE, FALSE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- =====================================================
-- Sample Milestone Escalations
-- =====================================================
INSERT INTO milestone_escalations (
    id, tenant_id, milestone_id, title, description, escalation_type, status,
    severity, escalated_by, assigned_to, escalation_reason, impact_assessment,
    delay_days, financial_impact, escalated_date, target_resolution_date,
    resolution_notes, is_active, created_at, updated_at
) VALUES
(
    'me-001', 'tenant-001', 'ms-002', 'Hardware Procurement Delay',
    'Delay in sensor procurement due to supply chain issues',
    'DELAY', 'IN_PROGRESS', 'HIGH',
    'user-001', 'user-011',
    '{"reason": "Supply chain disruption", "details": "Sensor supplier facing production delays", "affected_items": ["IoT Sensors", "Temperature Sensors"]}',
    '{"project_delay": "2 weeks", "budget_impact": "5% increase", "quality_risk": "LOW"}',
    14, 31250.00, '2025-02-15', '2025-02-28',
    'Alternative supplier identified. Expedited shipping arranged.',
    TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'me-002', 'tenant-002', 'ms-005', 'API Development Resource Issue',
    'Backend development falling behind schedule due to resource shortage',
    'RESOURCE', 'PENDING', 'MEDIUM',
    'user-002', 'user-012',
    '{"reason": "Developer shortage", "details": "Senior backend developer unavailable for 2 weeks", "affected_apis": ["User Management", "Data Sync"]}',
    '{"project_delay": "1 week", "budget_impact": "2% increase", "quality_risk": "LOW"}',
    7, 9000.00, '2025-02-20', '2025-02-27',
    NULL, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- =====================================================
-- Sample Workflow Definitions
-- =====================================================
INSERT INTO workflow_definitions (
    id, tenant_id, name, description, workflow_type, status,
    workflow_structure, node_definitions, conditions, actions,
    category, tags, industry, is_template, is_public, usage_count,
    version, is_active, created_at, updated_at
) VALUES
(
    'wd-001', 'tenant-001', 'Manufacturing Automation Template',
    'Reusable template for manufacturing automation projects',
    'HYBRID', 'ACTIVE',
    '{"nodes": [{"id": "start", "type": "start"}, {"id": "analysis", "type": "task"}, {"id": "design", "type": "task"}, {"id": "procurement", "type": "task"}, {"id": "installation", "type": "task"}, {"id": "testing", "type": "task"}, {"id": "deployment", "type": "task"}, {"id": "end", "type": "end"}], "edges": [{"from": "start", "to": "analysis"}, {"from": "analysis", "to": "design"}, {"from": "design", "to": "procurement"}, {"from": "procurement", "to": "installation"}, {"from": "installation", "to": "testing"}, {"from": "testing", "to": "deployment"}, {"from": "deployment", "to": "end"}]}',
    '{"analysis": {"name": "Requirements Analysis", "duration": 5}, "design": {"name": "System Design", "duration": 10}, "procurement": {"name": "Hardware Procurement", "duration": 15}}',
    '{"procurement": {"condition": "design_approved", "action": "proceed"}}, {"testing": {"condition": "installation_complete", "action": "start_testing"}}',
    '{"design_approved": {"action": "send_notification", "recipients": ["procurement_team"]}}, {"testing_complete": {"action": "generate_report"}}',
    'Manufacturing', '["automation", "iot", "manufacturing", "sensors"]', 'Manufacturing',
    TRUE, TRUE, 15, 2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'wd-002', 'tenant-002', 'Mobile App Development Template',
    'Agile template for mobile application development',
    'PARALLEL', 'ACTIVE',
    '{"nodes": [{"id": "start", "type": "start"}, {"id": "planning", "type": "task"}, {"id": "design", "type": "task"}, {"id": "backend", "type": "task"}, {"id": "frontend", "type": "task"}, {"id": "testing", "type": "task"}, {"id": "deployment", "type": "end"}], "edges": [{"from": "start", "to": "planning"}, {"from": "planning", "to": "design"}, {"from": "design", "to": "backend"}, {"from": "design", "to": "frontend"}, {"from": "backend", "to": "testing"}, {"from": "frontend", "to": "testing"}, {"from": "testing", "to": "deployment"}]}',
    '{"planning": {"name": "Sprint Planning", "duration": 3}, "design": {"name": "UI/UX Design", "duration": 10}, "backend": {"name": "API Development", "duration": 15}}',
    '{"design": {"condition": "planning_approved", "action": "start_design"}}, {"backend": {"condition": "api_spec_ready", "action": "start_development"}}',
    '{"sprint_complete": {"action": "demo", "recipients": ["stakeholders"]}}, {"deployment_ready": {"action": "release_notes"}}',
    'Software Development', '["mobile", "app", "agile", "development"]', 'Technology',
    TRUE, TRUE, 32, 3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- =====================================================
-- Sample Success Milestones
-- =====================================================
INSERT INTO success_milestones (
    id, tenant_id, project_id, title, description, milestone_type,
    achieved_by, achieved_date, value, currency, metrics, achievements,
    impact, lessons, best_practices, is_active, created_at, updated_at
) VALUES
(
    'sm-001', 'tenant-001', 'proj-001', 'Early Design Completion',
    'Design phase completed 3 days ahead of schedule',
    'EFFICIENCY_MILESTONE',
    'user-001', '2025-01-28', 25000.00, 'INR',
    '{"time_saved": "3 days", "budget_saved": "5%", "quality_score": "92/100"}',
    '{"recognition": "Team Excellence Award", "bonuses": ["Design Team"], "client_feedback": "Excellent"}',
    '{"project_impact": "Early start to procurement", "financial_impact": "Cost savings of INR 25,000"}',
    '{"lesson1": "Parallel design reviews save time", "lesson2": "Early stakeholder involvement critical"}',
    '{"practice1": "Daily design standups", "practice2": "Automated design validation"}',
    TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'sm-002', 'tenant-003', 'proj-003', 'Zero Safety Incidents',
    'Completed foundation work with zero safety incidents',
    'QUALITY_MILESTONE',
    'user-006', '2025-03-28', 50000.00, 'INR',
    '{"safety_score": "100%", "incident_count": 0, "safety_audits": 5}',
    '{"recognition": "Safety Excellence Award", "certification": "ISO 45001 Compliance"}',
    '{"project_impact": "Improved safety culture", "financial_impact": "Reduced insurance costs"}',
    '{"lesson1": "Daily safety briefings essential", "lesson2": "Safety equipment investment pays off"}',
    '{"practice1": "Safety-first approach", "practice2": "Regular safety training"}',
    TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- =====================================================
-- Update Statistics
-- =====================================================
-- Update workflow progress
UPDATE milestone_workflows SET 
    completed_milestones = (
        SELECT COUNT(*) FROM milestones 
        WHERE milestones.workflow_id = milestone_workflows.id 
        AND milestones.status = 'COMPLETED'
    ),
    progress_percentage = (
        SELECT CASE 
            WHEN total_milestones > 0 
            THEN (COUNT(*) FILTER (WHERE status = 'COMPLETED') * 100.0 / total_milestones)
            ELSE 0 
        END
        FROM milestones 
        WHERE milestones.workflow_id = milestone_workflows.id
    )
WHERE id IN ('mw-001', 'mw-002', 'mw-003');

-- =====================================================
-- Completion Message
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Module 05: Milestone Workflows seed data loaded successfully';
    RAISE NOTICE 'Created % milestones', (SELECT COUNT(*) FROM milestones);
    RAISE NOTICE 'Created % workflows', (SELECT COUNT(*) FROM milestone_workflows);
    RAISE NOTICE 'Created % verifications', (SELECT COUNT(*) FROM milestone_verifications);
    RAISE NOTICE 'Created % evidence items', (SELECT COUNT(*) FROM milestone_evidence);
    RAISE NOTICE 'Created % escalations', (SELECT COUNT(*) FROM milestone_escalations);
    RAISE NOTICE 'Created % owners', (SELECT COUNT(*) FROM milestone_owners);
END $$;
