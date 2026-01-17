-- Seed Data for Intelligent Distribution Module
-- Module 02: Intelligent Distribution & Follow-up
-- Created: 2025-01-12

-- Insert sample distribution rules
INSERT INTO distribution_rules (id, tenant_id, rule_name, description, rule_type, conditions, target_channel, priority, is_active, created_at, updated_at, created_by)
VALUES 
    ('rule-1', 'tenant-1', 'High Value Email Distribution', 'Send invoices over $10,000 via email with priority handling', 'amount_based', '{"minAmount": 10000, "maxAmount": null}', 'EMAIL', 90, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin'),
    ('rule-2', 'tenant-1', 'SMS for Small Invoices', 'Send invoices under $500 via SMS for quick delivery', 'amount_based', '{"minAmount": 0, "maxAmount": 500}', 'SMS', 80, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin'),
    ('rule-3', 'tenant-1', 'Premium Customer WhatsApp', 'Send to premium customers via WhatsApp for personal touch', 'customer_based', '{"customerSegments": ["premium", "enterprise"], "customerTypes": ["recurring"]}', 'WHATSAPP', 95, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin'),
    ('rule-4', 'tenant-1', 'Manufacturing Industry EDI', 'Send to manufacturing customers via EDI integration', 'industry_based', '{"industries": ["manufacturing", "automotive"]}', 'EDI', 85, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin'),
    ('rule-5', 'tenant-1', 'US Customers Postal Mail', 'Send to US customers via postal mail for compliance', 'geographic', '{"countries": ["US"], "states": ["CA", "NY", "TX"]}', 'POSTAL', 70, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin'),
    ('rule-6', 'tenant-1', 'Custom Risk Assessment', 'Custom rule based on risk score and amount', 'custom', '{"customConditions": {"expression": "invoice.amount > 5000 && customer.riskScore < 50", "variables": ["invoice.amount", "customer.riskScore"]}}', 'EMAIL', 75, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin'),
    ('rule-7', 'tenant-2', 'Default Email Rule', 'Default rule for all invoices via email', 'amount_based', '{"minAmount": 0, "maxAmount": null}', 'EMAIL', 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin'),
    ('rule-8', 'tenant-2', 'Urgent SMS Notifications', 'Send urgent notifications via SMS', 'customer_based', '{"customerSegments": ["urgent"], "customerTypes": ["new"]}', 'SMS', 100, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin')
ON CONFLICT (id) DO NOTHING;

-- Insert sample distribution assignments
INSERT INTO distribution_assignments (id, tenant_id, invoice_id, customer_id, assigned_channel, rule_id, assignment_reason, distribution_status, sent_at, delivered_at, error, metadata, created_at, updated_at)
VALUES 
    ('assignment-1', 'tenant-1', 'invoice-001', 'customer-1', 'EMAIL', 'rule-1', 'High value invoice - email priority', 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour 50 minutes', NULL, '{"priority": "high", "template": "premium"}', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour 50 minutes'),
    ('assignment-2', 'tenant-1', 'invoice-002', 'customer-2', 'SMS', 'rule-2', 'Small invoice - SMS delivery', 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours 55 minutes', NULL, '{"template": "compact"}', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours 55 minutes'),
    ('assignment-3', 'tenant-1', 'invoice-003', 'customer-3', 'WHATSAPP', 'rule-3', 'Premium customer - WhatsApp delivery', 'SENT', CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL, NULL, '{"template": "premium", "media": true}', CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
    ('assignment-4', 'tenant-1', 'invoice-004', 'customer-4', 'EDI', 'rule-4', 'Manufacturing customer - EDI integration', 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours 45 minutes', NULL, '{"edi_format": "X12", "version": "005010"}', CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours 45 minutes'),
    ('assignment-5', 'tenant-1', 'invoice-005', 'customer-5', 'POSTAL', 'rule-5', 'US customer - postal mail', 'PENDING', CURRENT_TIMESTAMP - INTERVAL '30 minutes', NULL, NULL, '{"mail_class": "first_class", "tracking": "US123456789"}', CURRENT_TIMESTAMP - INTERVAL '30 minutes', CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
    ('assignment-6', 'tenant-1', 'invoice-006', 'customer-6', 'EMAIL', 'rule-6', 'Custom rule - risk assessment passed', 'FAILED', CURRENT_TIMESTAMP - INTERVAL '5 hours', NULL, 'Email service unavailable', '{"retry_count": 3, "last_retry": CURRENT_TIMESTAMP - INTERVAL "1 hour"}', CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
    ('assignment-7', 'tenant-2', 'invoice-007', 'customer-7', 'EMAIL', 'rule-7', 'Default email distribution', 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '6 hours', CURRENT_TIMESTAMP - INTERVAL '5 hours 50 minutes', NULL, '{"template": "standard"}', CURRENT_TIMESTAMP - INTERVAL '6 hours', CURRENT_TIMESTAMP - INTERVAL '5 hours 50 minutes'),
    ('assignment-8', 'tenant-2', 'invoice-008', 'customer-8', 'SMS', 'rule-8', 'Urgent notification - SMS', 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP - INTERVAL '55 minutes', NULL, '{"template": "urgent", "priority": "high"}', CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP - INTERVAL '55 minutes')
ON CONFLICT (id) DO NOTHING;

-- Insert sample distribution records
INSERT INTO distribution_records (id, tenant_id, assignment_id, status, sent_at, delivered_at, error_message, retry_count, metadata, created_at, updated_at)
VALUES 
    ('record-1', 'tenant-1', 'assignment-1', 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour 50 minutes', NULL, 0, '{"provider": "sendgrid", "message_id": "msg_12345", "opened": true, "clicked": false}', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour 50 minutes'),
    ('record-2', 'tenant-1', 'assignment-2', 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours 55 minutes', NULL, 0, '{"provider": "twilio", "message_id": "SM12345", "delivered": true}', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours 55 minutes'),
    ('record-3', 'tenant-1', 'assignment-3', 'SENT', CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL, NULL, 0, '{"provider": "whatsapp", "message_id": "wamid.H4Lk5", "status": "sent"}', CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
    ('record-4', 'tenant-1', 'assignment-4', 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours 45 minutes', NULL, 0, '{"provider": "edi", "transaction_id": "EDI12345", "format": "X12"}', CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours 45 minutes'),
    ('record-5', 'tenant-1', 'assignment-5', 'PENDING', CURRENT_TIMESTAMP - INTERVAL '30 minutes', NULL, NULL, 0, '{"provider": "postal", "tracking_number": "US123456789", "estimated_delivery": CURRENT_TIMESTAMP + INTERVAL "3 days"}', CURRENT_TIMESTAMP - INTERVAL '30 minutes', CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
    ('record-6', 'tenant-1', 'assignment-6', 'FAILED', CURRENT_TIMESTAMP - INTERVAL '5 hours', NULL, 'Email service temporarily unavailable', 3, '{"provider": "sendgrid", "last_error": "Service unavailable", "retry_after": CURRENT_TIMESTAMP + INTERVAL "1 hour"}', CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
    ('record-7', 'tenant-2', 'assignment-7', 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '6 hours', CURRENT_TIMESTAMP - INTERVAL '5 hours 50 minutes', NULL, 0, '{"provider": "ses", "message_id": "0101234567890-123456-1", "bounce": false}', CURRENT_TIMESTAMP - INTERVAL '6 hours', CURRENT_TIMESTAMP - INTERVAL '5 hours 50 minutes'),
    ('record-8', 'tenant-2', 'assignment-8', 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP - INTERVAL '55 minutes', NULL, 0, '{"provider": "sns", "message_id": "sns-12345", "delivered": true}', CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP - INTERVAL '55 minutes')
ON CONFLICT (id) DO NOTHING;

-- Insert sample recipient contacts
INSERT INTO recipient_contacts (id, tenant_id, customer_id, first_name, last_name, email, phone, whatsapp_number, address, channel, preferences, is_active, created_at, updated_at)
VALUES 
    ('contact-1', 'tenant-1', 'customer-1', 'John', 'Doe', 'john.doe@company.com', '+1234567890', '+1234567890', '123 Main St, New York, NY 10001', 'EMAIL', '{"email_notifications": true, "sms_notifications": false, "whatsapp_notifications": true, "preferred_time": "09:00-17:00"}', true, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '30 days'),
    ('contact-2', 'tenant-1', 'customer-2', 'Jane', 'Smith', 'jane.smith@business.com', '+1234567891', '+1234567891', '456 Oak Ave, Los Angeles, CA 90001', 'SMS', '{"email_notifications": false, "sms_notifications": true, "whatsapp_notifications": false, "preferred_time": "08:00-18:00"}', true, CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP - INTERVAL '25 days'),
    ('contact-3', 'tenant-1', 'customer-3', 'Bob', 'Johnson', 'bob.johnson@enterprise.com', '+1234567892', '+1234567892', '789 Pine Rd, Chicago, IL 60007', 'WHATSAPP', '{"email_notifications": true, "sms_notifications": true, "whatsapp_notifications": true, "preferred_time": "10:00-16:00"}', true, CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '20 days'),
    ('contact-4', 'tenant-1', 'customer-4', 'Alice', 'Brown', 'alice.brown@manufacturing.com', '+1234567893', NULL, '321 Elm St, Detroit, MI 48201', 'EDI', '{"email_notifications": false, "sms_notifications": false, "whatsapp_notifications": false, "edi_format": "X12"}', true, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    ('contact-5', 'tenant-1', 'customer-5', 'Charlie', 'Wilson', 'charlie.wilson@retail.com', '+1234567894', '+1234567894', '654 Maple Dr, Houston, TX 77001', 'POSTAL', '{"email_notifications": true, "sms_notifications": false, "whatsapp_notifications": false, "mail_preference": "first_class"}', true, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    ('contact-6', 'tenant-2', 'customer-6', 'Diana', 'Miller', 'diana.miller@startup.com', '+1234567895', '+1234567895', '987 Cedar Ln, Phoenix, AZ 85001', 'EMAIL', '{"email_notifications": true, "sms_notifications": true, "whatsapp_notifications": true, "preferred_time": "09:00-17:00"}', true, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('contact-7', 'tenant-2', 'customer-7', 'Edward', 'Davis', 'edward.davis@tech.com', '+1234567896', NULL, '147 Birch Way, Philadelphia, PA 19101', 'EMAIL', '{"email_notifications": true, "sms_notifications": false, "whatsapp_notifications": false, "preferred_time": "08:00-18:00"}', true, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('contact-8', 'tenant-2', 'customer-8', 'Fiona', 'Garcia', 'fiona.garcia@urgent.com', '+1234567897', '+1234567897', '258 Spruce St, San Antonio, TX 78201', 'SMS', '{"email_notifications": false, "sms_notifications": true, "whatsapp_notifications": true, "preferred_time": "24/7", "urgent_notifications": true}', true, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert sample follow-up rules
INSERT INTO follow_up_rules (id, tenant_id, rule_name, description, trigger_type, trigger_conditions, is_active, created_at, updated_at, created_by)
VALUES 
    ('followup-rule-1', 'tenant-1', 'Payment Reminder Follow-up', 'Send payment reminders 3 days before due date', 'TIME_BASED', '{"days_before_due": 3, "time": "09:00"}', true, CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '20 days', 'admin'),
    ('followup-rule-2', 'tenant-1', 'Overdue Notice', 'Send overdue notices for unpaid invoices', 'STATUS_BASED', '{"status": "OVERDUE", "days_overdue": 1}', true, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days', 'admin'),
    ('followup-rule-3', 'tenant-1', 'Failed Delivery Retry', 'Retry failed deliveries after 1 hour', 'EVENT_BASED', '{"event": "DELIVERY_FAILED", "retry_after": 1, "max_retries": 3}', true, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days', 'admin'),
    ('followup-rule-4', 'tenant-2', 'Welcome Follow-up', 'Send welcome message to new customers', 'EVENT_BASED', '{"event": "NEW_CUSTOMER", "delay_hours": 24}', true, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days', 'admin'),
    ('followup-rule-5', 'tenant-2', 'Monthly Summary', 'Send monthly distribution summary', 'TIME_BASED', '{"schedule": "monthly", "day": 1, "time": "08:00"}', true, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Insert sample follow-up sequences
INSERT INTO follow_up_sequences (id, tenant_id, rule_id, sequence_name, description, is_active, created_at, updated_at)
VALUES 
    ('sequence-1', 'tenant-1', 'followup-rule-1', 'Payment Reminder Sequence', '3-step payment reminder sequence', true, CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '20 days'),
    ('sequence-2', 'tenant-1', 'followup-rule-2', 'Overdue Notice Sequence', 'Multi-step overdue notice sequence', true, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    ('sequence-3', 'tenant-1', 'followup-rule-3', 'Delivery Retry Sequence', 'Automatic retry sequence for failed deliveries', true, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    ('sequence-4', 'tenant-2', 'followup-rule-4', 'Welcome Sequence', 'New customer welcome sequence', true, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('sequence-5', 'tenant-2', 'followup-rule-5', 'Monthly Report Sequence', 'Monthly summary report sequence', true, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample follow-up steps
INSERT INTO follow_up_steps (id, sequence_id, step_order, step_name, channel, template_id, delay_hours, conditions, is_active, created_at, updated_at)
VALUES 
    ('step-1', 'sequence-1', 1, 'Initial Reminder', 'EMAIL', 'payment-reminder-1', 0, '{"amount_threshold": 1000}', true, CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '20 days'),
    ('step-2', 'sequence-1', 2, 'Second Reminder', 'SMS', 'payment-reminder-2', 24, '{"amount_threshold": 500}', true, CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '20 days'),
    ('step-3', 'sequence-1', 3, 'Final Reminder', 'WHATSAPP', 'payment-reminder-3', 48, '{"amount_threshold": 100}', true, CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '20 days'),
    ('step-4', 'sequence-2', 1, 'First Overdue Notice', 'EMAIL', 'overdue-notice-1', 0, '{"days_overdue": 1}', true, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    ('step-5', 'sequence-2', 2, 'Second Overdue Notice', 'SMS', 'overdue-notice-2', 72, '{"days_overdue": 3}', true, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    ('step-6', 'sequence-2', 3, 'Final Overdue Notice', 'EMAIL', 'overdue-notice-3', 168, '{"days_overdue": 7}', true, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    ('step-7', 'sequence-3', 1, 'First Retry', 'EMAIL', 'retry-1', 1, '{"retry_count": 1}', true, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    ('step-8', 'sequence-3', 2, 'Second Retry', 'SMS', 'retry-2', 2, '{"retry_count": 2}', true, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    ('step-9', 'sequence-3', 3, 'Third Retry', 'WHATSAPP', 'retry-3', 4, '{"retry_count": 3}', true, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    ('step-10', 'sequence-4', 1, 'Welcome Email', 'EMAIL', 'welcome-1', 24, NULL, true, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('step-11', 'sequence-4', 2, 'Welcome SMS', 'SMS', 'welcome-2', 48, NULL, true, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('step-12', 'sequence-5', 1, 'Monthly Summary', 'EMAIL', 'monthly-summary-1', 0, NULL, true, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample sender profiles
INSERT INTO sender_profiles (id, tenant_id, profile_name, channel, configuration, is_active, created_at, updated_at)
VALUES 
    ('sender-1', 'tenant-1', 'Default Email Profile', 'EMAIL', '{"from_email": "noreply@company.com", "from_name": "Company Name", "reply_to": "support@company.com", "provider": "sendgrid", "template_engine": "handlebars"}', true, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '30 days'),
    ('sender-2', 'tenant-1', 'Premium Email Profile', 'EMAIL', '{"from_email": "premium@company.com", "from_name": "Premium Support", "reply_to": "premium@company.com", "provider": "ses", "template_engine": "handlebars", "tracking_enabled": true}', true, CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP - INTERVAL '25 days'),
    ('sender-3', 'tenant-1', 'Default SMS Profile', 'SMS', '{"from_number": "+1234567890", "provider": "twilio", "max_length": 160, "encoding": "UTF-8"}', true, CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '20 days'),
    ('sender-4', 'tenant-1', 'WhatsApp Business Profile', 'WHATSAPP', '{"phone_number_id": "123456789", "access_token": "whatsapp_token", "template_namespace": "company_namespace"}', true, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    ('sender-5', 'tenant-1', 'EDI Profile', 'EDI', '{"sender_id": "COMPANY_ID", "receiver_id": "PARTNER_ID", "format": "X12", "version": "005010", "control_number": "auto"}', true, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    ('sender-6', 'tenant-2', 'Standard Email Profile', 'EMAIL', '{"from_email": "info@business.com", "from_name": "Business Name", "reply_to": "contact@business.com", "provider": "mailgun", "template_engine": "liquid"}', true, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('sender-7', 'tenant-2', 'Urgent SMS Profile', 'SMS', '{"from_number": "+1234567891", "provider": "sns", "max_length": 160, "encoding": "UTF-8", "priority": "high"}', true, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('sender-8', 'tenant-2', 'Multi-Channel Profile', 'WHATSAPP', '{"phone_number_id": "123456790", "access_token": "whatsapp_token_2", "template_namespace": "business_namespace"}', true, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert sample audit logs
INSERT INTO distribution_audit_log (table_name, record_id, action, new_data, changed_by, changed_at)
VALUES 
    ('distribution_rules', 'rule-1', 'INSERT', '{"rule_name": "High Value Email Distribution", "rule_type": "amount_based", "target_channel": "EMAIL"}', 'admin', CURRENT_TIMESTAMP - INTERVAL '20 days'),
    ('distribution_assignments', 'assignment-1', 'INSERT', '{"invoice_id": "invoice-001", "customer_id": "customer-1", "assigned_channel": "EMAIL"}', 'system', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
    ('distribution_assignments', 'assignment-1', 'UPDATE', '{"distribution_status": "DELIVERED", "delivered_at": CURRENT_TIMESTAMP - INTERVAL "1 hour 50 minutes"}', 'system', CURRENT_TIMESTAMP - INTERVAL '1 hour 50 minutes'),
    ('recipient_contacts', 'contact-1', 'INSERT', '{"first_name": "John", "last_name": "Doe", "email": "john.doe@company.com"}', 'admin', CURRENT_TIMESTAMP - INTERVAL '30 days'),
    ('follow_up_rules', 'followup-rule-1', 'INSERT', '{"rule_name": "Payment Reminder Follow-up", "trigger_type": "TIME_BASED"}', 'admin', CURRENT_TIMESTAMP - INTERVAL '20 days'),
    ('sender_profiles', 'sender-1', 'INSERT', '{"profile_name": "Default Email Profile", "channel": "EMAIL"}', 'admin', CURRENT_TIMESTAMP - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- Update statistics and materialized views
REFRESH MATERIALIZED VIEW distribution_analytics;
REFRESH MATERIALIZED VIEW distribution_summary_report;

-- Create sample users for testing
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
VALUES 
    ('user-1', 'admin@smeplatform.com', '$2b$12$hashed_password_here', 'Admin', 'User', 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('user-2', 'distribution@smeplatform.com', '$2b$12$hashed_password_here', 'Distribution', 'Manager', 'manager', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('user-3', 'support@smeplatform.com', '$2b$12$hashed_password_here', 'Support', 'User', 'user', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Create sample performance metrics for rules
INSERT INTO rule_performance_metrics (id, rule_id, usage_count, success_rate, avg_processing_time, total_processed, last_updated)
VALUES 
    ('metric-1', 'rule-1', 45, 95.6, 120, 450000.00, CURRENT_TIMESTAMP),
    ('metric-2', 'rule-2', 120, 98.3, 45, 30000.00, CURRENT_TIMESTAMP),
    ('metric-3', 'rule-3', 25, 92.0, 180, 1250000.00, CURRENT_TIMESTAMP),
    ('metric-4', 'rule-4', 15, 100.0, 300, 890000.00, CURRENT_TIMESTAMP),
    ('metric-5', 'rule-5', 8, 87.5, 7200, 45000.00, CURRENT_TIMESTAMP),
    ('metric-6', 'rule-6', 32, 90.6, 150, 680000.00, CURRENT_TIMESTAMP),
    ('metric-7', 'rule-7', 89, 96.6, 110, 234000.00, CURRENT_TIMESTAMP),
    ('metric-8', 'rule-8', 67, 99.2, 35, 12000.00, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Create sample channel performance data
INSERT INTO channel_performance_metrics (id, tenant_id, channel, total_sent, delivered, failed, success_rate, avg_delivery_time, last_updated)
VALUES 
    ('channel-metric-1', 'tenant-1', 'EMAIL', 156, 148, 8, 94.9, 120, CURRENT_TIMESTAMP),
    ('channel-metric-2', 'tenant-1', 'SMS', 89, 87, 2, 97.8, 45, CURRENT_TIMESTAMP),
    ('channel-metric-3', 'tenant-1', 'WHATSAPP', 34, 31, 3, 91.2, 180, CURRENT_TIMESTAMP),
    ('channel-metric-4', 'tenant-1', 'EDI', 23, 23, 0, 100.0, 300, CURRENT_TIMESTAMP),
    ('channel-metric-5', 'tenant-1', 'POSTAL', 12, 10, 2, 83.3, 7200, CURRENT_TIMESTAMP),
    ('channel-metric-6', 'tenant-2', 'EMAIL', 78, 75, 3, 96.2, 110, CURRENT_TIMESTAMP),
    ('channel-metric-7', 'tenant-2', 'SMS', 45, 44, 1, 97.8, 35, CURRENT_TIMESTAMP),
    ('channel-metric-8', 'tenant-2', 'WHATSAPP', 23, 23, 0, 100.0, 150, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Commit the seed data
-- Note: In a real application, you would wrap this in a transaction
-- and handle any potential conflicts appropriately

-- Output summary
DO $$
DECLARE
    rule_count INTEGER;
    assignment_count INTEGER;
    contact_count INTEGER;
    followup_rule_count INTEGER;
    sender_profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rule_count FROM distribution_rules;
    SELECT COUNT(*) INTO assignment_count FROM distribution_assignments;
    SELECT COUNT(*) INTO contact_count FROM recipient_contacts;
    SELECT COUNT(*) INTO followup_rule_count FROM follow_up_rules;
    SELECT COUNT(*) INTO sender_profile_count FROM sender_profiles;
    
    RAISE NOTICE 'Seed data loaded successfully:';
    RAISE NOTICE '- Distribution Rules: %', rule_count;
    RAISE NOTICE '- Distribution Assignments: %', assignment_count;
    RAISE NOTICE '- Recipient Contacts: %', contact_count;
    RAISE NOTICE '- Follow-up Rules: %', followup_rule_count;
    RAISE NOTICE '- Sender Profiles: %', sender_profile_count;
END $$;
