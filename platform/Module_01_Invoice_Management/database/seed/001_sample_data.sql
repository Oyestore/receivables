-- Seed Data for Invoice Management Module
-- Module 01: Invoice Management
-- Created: 2025-01-12

-- Insert sample customers
INSERT INTO customers (id, name, email, phone, address, gstin, created_at, updated_at)
VALUES 
    ('customer-1', 'ABC Manufacturing Ltd', 'accounts@abcmanufacturing.com', '+91-22-12345678', '123 Industrial Area, Mumbai, Maharashtra 400001', '27AAAPL1234C1ZV', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('customer-2', 'XYZ Textiles Pvt Ltd', 'billing@xyztextiles.com', '+91-79-87654321', '456 Textile Park, Surat, Gujarat 395002', '24AAAPX5678B2ZW', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('customer-3', 'Global Services Inc', 'finance@globalservices.com', '+91-11-98765432', '789 Business Park, Delhi, Delhi 110001', '07AAAPG9012D3ZY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('customer-4', 'Tech Solutions Pvt Ltd', 'accounts@techsolutions.com', '+91-80-23456789', '321 Tech Hub, Bangalore, Karnataka 560001', '29AAAPT3456E4ZX', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('customer-5', 'Retail Chain Ltd', 'payments@retailchain.com', '+91-40-34567890', '654 Shopping Complex, Hyderabad, Telangana 500001', '36AAPUR7890F5XY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Insert sample products/services
INSERT INTO products (id, name, description, unit_price, hsn_code, sac_code, gst_rate, created_at, updated_at)
VALUES 
    ('product-1', 'Manufacturing Components', 'Industrial manufacturing components and parts', 5000.00, '84819090', NULL, 18.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('product-2', 'Textile Raw Materials', 'High-quality textile raw materials', 2500.00, '52010000', NULL, 5.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('product-3', 'Software Development', 'Custom software development services', NULL, NULL, '998313', 18.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('product-4', 'IT Consulting', 'IT infrastructure consulting services', NULL, NULL, '998314', 18.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('product-5', 'Digital Marketing', 'Digital marketing and SEO services', NULL, NULL, '998321', 18.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('product-6', 'Web Hosting', 'Annual web hosting services', NULL, NULL, '998332', 18.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('product-7', 'Cloud Storage', 'Cloud storage solutions', NULL, NULL, '998334', 18.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('product-8', 'Security Services', 'Cybersecurity assessment and implementation', NULL, NULL, '998342', 18.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Insert sample invoice templates
INSERT INTO invoice_templates (id, name, description, template_definition, is_active, user_id, created_at, updated_at)
VALUES 
    ('template-1', 'Standard Invoice', 'Standard invoice template with basic layout', 
     '{"style": "modern", "colors": ["#4285F5", "#34A853"], "layout": "standard", "sections": ["header", "items", "totals", "footer"]}', 
     true, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('template-2', 'GST Compliant', 'GST compliant invoice with tax breakdown', 
     '{"style": "professional", "colors": ["#FF6B6B", "#4ECDC4"], "layout": "gst", "sections": ["header", "gst_info", "items", "tax_breakdown", "totals", "footer"], "gst_compliant": true}', 
     true, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('template-3', 'Minimal Design', 'Clean and minimal invoice design', 
     '{"style": "minimal", "colors": ["#2C3E50", "#ECF0F1"], "layout": "minimal", "sections": ["header", "items", "totals"]}', 
     true, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('template-4', 'Corporate Invoice', 'Professional corporate invoice template', 
     '{"style": "corporate", "colors": ["#1A237E", "#FFFFFF"], "layout": "corporate", "sections": ["header", "company_info", "items", "totals", "footer"], "logo_position": "top_left"}', 
     true, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('template-5', 'Regional Template', 'Template optimized for Indian businesses', 
     '{"style": "indian", "colors": ["#FF9933", "#138808"], "layout": "regional", "sections": ["header", "pan_gstin", "items", "tax_breakdown", "totals", "footer"], "regional_compliance": true}', 
     true, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Insert sample invoices
INSERT INTO invoices (id, invoice_number, customer_id, customer_name, customer_email, customer_phone, customer_address, template_id, total, paid_amount, status, date, due_date, gstin, created_at, updated_at)
VALUES 
    ('invoice-1', 'INV-2025-001', 'customer-1', 'ABC Manufacturing Ltd', 'accounts@abcmanufacturing.com', '+91-22-12345678', '123 Industrial Area, Mumbai, Maharashtra 400001', 'template-1', 15000.00, 0.00, 'SENT', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days' + INTERVAL '30 days', '27AAAPL1234C1ZV', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    ('invoice-2', 'INV-2025-002', 'customer-2', 'XYZ Textiles Pvt Ltd', 'billing@xyztextiles.com', '+91-79-87654321', '456 Textile Park, Surat, Gujarat 395002', 'template-2', 12500.00, 12500.00, 'PAID', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '30 days' + INTERVAL '30 days', '24AAAPX5678B2ZW', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '25 days'),
    ('invoice-3', 'INV-2025-003', 'customer-3', 'Global Services Inc', 'finance@globalservices.com', '+91-11-98765432', '789 Business Park, Delhi, Delhi 110001', 'template-3', 25000.00, 15000.00, 'PARTIALLY_PAID', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days' + INTERVAL '30 days', '07AAAPG9012D3ZY', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '40 days'),
    ('invoice-4', 'INV-2025-004', 'customer-4', 'Tech Solutions Pvt Ltd', 'accounts@techsolutions.com', '+91-80-23456789', '321 Tech Hub, Bangalore, Karnataka 560001', 'template-4', 18000.00, 0.00, 'OVERDUE', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '60 days' + INTERVAL '30 days', '29AAAPT3456E4ZX', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '55 days'),
    ('invoice-5', 'INV-2025-005', 'customer-5', 'Retail Chain Ltd', 'payments@retailchain.com', '+91-40-34567890', '654 Shopping Complex, Hyderabad, Telangana 500001', 'template-5', 22000.00, 0.00, 'DRAFT', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days' + INTERVAL '30 days', '36AAPUR7890F5XY', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('invoice-6', 'INV-2025-006', 'customer-1', 'ABC Manufacturing Ltd', 'accounts@abcmanufacturing.com', '+91-22-12345678', '123 Industrial Area, Mumbai, Maharashtra 400001', 'template-1', 35000.00, 35000.00, 'PAID', CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '90 days' + INTERVAL '30 days', '27AAAPL1234C1ZV', CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '85 days'),
    ('invoice-7', 'INV-2025-007', 'customer-2', 'XYZ Textiles Pvt Ltd', 'billing@xyztextiles.com', '+91-79-87654321', '456 Textile Park, Surat, Gujarat 395002', 'template-2', 28000.00, 0.00, 'SENT', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days' + INTERVAL '30 days', '24AAAPX5678B2ZW', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days'),
    ('invoice-8', 'INV-2025-008', 'customer-3', 'Global Services Inc', 'finance@globalservices.com', '+91-11-98765432', '789 Business Park, Delhi, Delhi 110001', 'template-3', 45000.00, 0.00, 'SENT', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '30 days', '07AAAPG9012D3ZY', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample invoice line items
INSERT INTO invoice_line_items (id, invoice_id, product_id, description, quantity, unit_price, tax_rate, total, created_at, updated_at)
VALUES 
    ('item-1', 'invoice-1', 'product-1', 'Manufacturing Components - Type A', 2, 5000.00, 18.0, 11800.00, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    ('item-2', 'invoice-1', 'product-2', 'Textile Raw Materials - Premium', 1, 2500.00, 5.0, 2625.00, CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    ('item-3', 'invoice-2', 'product-2', 'Textile Raw Materials - Standard', 4, 2500.00, 5.0, 10500.00, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '30 days'),
    ('item-4', 'invoice-2', 'product-1', 'Manufacturing Components - Type B', 1, 5000.00, 18.0, 5900.00, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '30 days'),
    ('item-5', 'invoice-3', 'product-3', 'Software Development - Custom Module', 1, 15000.00, 18.0, 17700.00, CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days'),
    ('item-6', 'invoice-3', 'product-4', 'IT Consulting - Infrastructure Audit', 1, 8000.00, 18.0, 9440.00, CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days'),
    ('item-7', 'invoice-4', 'product-5', 'Digital Marketing - SEO Package', 1, 12000.00, 18.0, 14160.00, CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '60 days'),
    ('item-8', 'invoice-4', 'product-6', 'Web Hosting - Annual Plan', 1, 3000.00, 18.0, 3540.00, CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '60 days'),
    ('item-9', 'invoice-5', 'product-7', 'Cloud Storage - 1TB Plan', 1, 8000.00, 18.0, 9440.00, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('item-10', 'invoice-5', 'product-8', 'Security Services - Assessment', 1, 10000.00, 18.0, 11800.00, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('item-11', 'invoice-6', 'product-1', 'Manufacturing Components - Type C', 5, 5000.00, 18.0, 29500.00, CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '90 days'),
    ('item-12', 'invoice-6', 'product-3', 'Software Development - Maintenance', 1, 10000.00, 18.0, 11800.00, CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '90 days'),
    ('item-13', 'invoice-7', 'product-2', 'Textile Raw Materials - Bulk Order', 8, 2500.00, 5.0, 21000.00, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days'),
    ('item-14', 'invoice-7', 'product-1', 'Manufacturing Components - Type A', 1, 5000.00, 18.0, 5900.00, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days'),
    ('item-15', 'invoice-8', 'product-3', 'Software Development - Enterprise Solution', 1, 25000.00, 18.0, 29500.00, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('item-16', 'invoice-8', 'product-4', 'IT Consulting - Strategic Planning', 1, 12000.00, 18.0, 14160.00, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample recurring invoice profiles
INSERT INTO recurring_invoice_profiles (id, name, description, frequency, interval_value, day_of_month, next_run_date, is_active, customer_id, template_id, created_at, updated_at)
VALUES 
    ('recurring-1', 'Monthly Manufacturing Supply', 'Monthly supply of manufacturing components', 'monthly', 1, 1, CURRENT_TIMESTAMP + INTERVAL '15 days', true, 'customer-1', 'template-1', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '60 days'),
    ('recurring-2', 'Quarterly IT Services', 'Quarterly IT maintenance and support', 'quarterly', 3, 1, CURRENT_TIMESTAMP + INTERVAL '30 days', true, 'customer-3', 'template-3', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days'),
    ('recurring-3', 'Annual Software License', 'Annual software license renewal', 'yearly', 12, 1, CURRENT_TIMESTAMP + INTERVAL '90 days', true, 'customer-4', 'template-4', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '30 days'),
    ('recurring-4', 'Monthly Textile Supply', 'Monthly textile raw material supply', 'monthly', 1, 15, CURRENT_TIMESTAMP + INTERVAL '20 days', true, 'customer-2', 'template-2', CURRENT_TIMESTAMP - INTERVAL '75 days', CURRENT_TIMESTAMP - INTERVAL '75 days'),
    ('recurring-5', 'Bi-monthly Marketing Services', 'Marketing services every two months', 'monthly', 2, 1, CURRENT_TIMESTAMP + INTERVAL '45 days', true, 'customer-5', 'template-5', CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample recurring invoice line items
INSERT INTO recurring_invoice_line_items (id, profile_id, product_id, description, quantity, unit_price, tax_rate, created_at, updated_at)
VALUES 
    ('recurring-item-1', 'recurring-1', 'product-1', 'Manufacturing Components - Monthly Supply', 3, 5000.00, 18.0, CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '60 days'),
    ('recurring-item-2', 'recurring-2', 'product-4', 'IT Consulting - Quarterly Audit', 1, 8000.00, 18.0, CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days'),
    ('recurring-item-3', 'recurring-3', 'product-3', 'Software License - Enterprise', 1, 25000.00, 18.0, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '30 days'),
    ('recurring-item-4', 'recurring-4', 'product-2', 'Textile Raw Materials - Monthly Batch', 5, 2500.00, 5.0, CURRENT_TIMESTAMP - INTERVAL '75 days', CURRENT_TIMESTAMP - INTERVAL '75 days'),
    ('recurring-item-5', 'recurring-5', 'product-5', 'Digital Marketing - Bi-monthly Campaign', 1, 12000.00, 18.0, CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample message templates
INSERT INTO message_templates (id, name, type, subject, body, language, is_active, created_at, updated_at)
VALUES 
    ('msg-template-1', 'Invoice Sent Notification', 'email', 'Invoice {{invoice_number}} from {{company_name}}', 
     'Dear {{customer_name}},\n\nPlease find attached invoice {{invoice_number}} for {{amount}}.\n\nDue date: {{due_date}}\n\nThank you for your business.\n\nBest regards,\n{{company_name}}', 
     'en', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('msg-template-2', 'Payment Reminder', 'email', 'Payment Reminder for Invoice {{invoice_number}}', 
     'Dear {{customer_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} for {{amount}} is due on {{due_date}}.\n\nPlease arrange for payment at your earliest convenience.\n\nThank you,\n{{company_name}}', 
     'en', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('msg-template-3', 'Overdue Notice', 'email', 'Overdue Invoice {{invoice_number}}', 
     'Dear {{customer_name}},\n\nInvoice {{invoice_number}} for {{amount}} is now overdue by {{days_overdue}} days.\n\nPlease make payment as soon as possible to avoid late fees.\n\nIf you have already paid, please disregard this notice.\n\nRegards,\n{{company_name}}', 
     'en', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('msg-template-4', 'Payment Confirmation', 'email', 'Payment Received for Invoice {{invoice_number}}', 
     'Dear {{customer_name}},\n\nThank you for your payment of {{amount}} for invoice {{invoice_number}}.\n\nPayment date: {{payment_date}}\n\nWe appreciate your prompt payment.\n\nBest regards,\n{{company_name}}', 
     'en', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('msg-template-5', 'SMS Reminder', 'sms', 'Inv {{invoice_number}} due {{due_date}}. Amount: {{amount}}. Pay: {{payment_link}}', 
     'Invoice {{invoice_number}} due {{due_date}}. Amount: {{amount}}. Pay: {{payment_link}}', 
     'en', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Insert sample message history
INSERT INTO message_history (id, invoice_id, template_id, type, recipient, subject, body, status, sent_at, created_at, updated_at)
VALUES 
    ('msg-1', 'invoice-1', 'msg-template-1', 'email', 'accounts@abcmanufacturing.com', 'Invoice INV-2025-001 from SME Platform', 
     'Dear ABC Manufacturing Ltd,\n\nPlease find attached invoice INV-2025-001 for ₹15,000.00.\n\nDue date: 2025-02-11\n\nThank you for your business.\n\nBest regards,\nSME Platform', 
     'sent', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '14 days'),
    ('msg-2', 'invoice-2', 'msg-template-1', 'email', 'billing@xyztextiles.com', 'Invoice INV-2025-002 from SME Platform', 
     'Dear XYZ Textiles Pvt Ltd,\n\nPlease find attached invoice INV-2025-002 for ₹12,500.00.\n\nDue date: 2025-01-30\n\nThank you for your business.\n\nBest regards,\nSME Platform', 
     'sent', CURRENT_TIMESTAMP - INTERVAL '29 days', CURRENT_TIMESTAMP - INTERVAL '29 days', CURRENT_TIMESTAMP - INTERVAL '29 days'),
    ('msg-3', 'invoice-4', 'msg-template-3', 'email', 'accounts@techsolutions.com', 'Overdue Invoice INV-2025-004', 
     'Dear Tech Solutions Pvt Ltd,\n\nInvoice INV-2025-004 for ₹18,000.00 is now overdue by 30 days.\n\nPlease make payment as soon as possible to avoid late fees.\n\nIf you have already paid, please disregard this notice.\n\nRegards,\nSME Platform', 
     'sent', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    ('msg-4', 'invoice-2', 'msg-template-4', 'email', 'billing@xyztextiles.com', 'Payment Received for Invoice INV-2025-002', 
     'Dear XYZ Textiles Pvt Ltd,\n\nThank you for your payment of ₹12,500.00 for invoice INV-2025-002.\n\nPayment date: 2025-01-15\n\nWe appreciate your prompt payment.\n\nBest regards,\nSME Platform', 
     'sent', CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP - INTERVAL '25 days'),
    ('msg-5', 'invoice-7', 'msg-template-2', 'email', 'billing@xyztextiles.com', 'Payment Reminder for Invoice INV-2025-007', 
     'Dear XYZ Textiles Pvt Ltd,\n\nThis is a friendly reminder that invoice INV-2025-007 for ₹28,000.00 is due on 2025-02-06.\n\nPlease arrange for payment at your earliest convenience.\n\nThank you,\nSME Platform', 
     'sent', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample trade compliance records
INSERT INTO trade_compliance (id, entity_type, entity_id, compliance_type, status, performed_by, performed_at, notes, created_at, updated_at)
VALUES 
    ('compliance-1', 'invoice', 'invoice-1', 'sanctions_check', 'passed', 'system', CURRENT_TIMESTAMP - INTERVAL '15 days', 'No sanctions violations detected', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    ('compliance-2', 'invoice', 'invoice-2', 'sanctions_check', 'passed', 'system', CURRENT_TIMESTAMP - INTERVAL '30 days', 'No sanctions violations detected', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '30 days'),
    ('compliance-3', 'invoice', 'invoice-3', 'sanctions_check', 'passed', 'system', CURRENT_TIMESTAMP - INTERVAL '45 days', 'No sanctions violations detected', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days'),
    ('compliance-4', 'invoice', 'invoice-4', 'sanctions_check', 'passed', 'system', CURRENT_TIMESTAMP - INTERVAL '60 days', 'No sanctions violations detected', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '60 days'),
    ('compliance-5', 'invoice', 'invoice-5', 'sanctions_check', 'passed', 'system', CURRENT_TIMESTAMP - INTERVAL '5 days', 'No sanctions violations detected', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('compliance-6', 'invoice', 'invoice-1', 'aml_check', 'passed', 'system', CURRENT_TIMESTAMP - INTERVAL '15 days', 'No AML violations detected', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    ('compliance-7', 'invoice', 'invoice-2', 'aml_check', 'passed', 'system', CURRENT_TIMESTAMP - INTERVAL '30 days', 'No AML violations detected', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '30 days'),
    ('compliance-8', 'invoice', 'invoice-3', 'kyc_check', 'passed', 'system', CURRENT_TIMESTAMP - INTERVAL '45 days', 'KYC verification completed successfully', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '45 days'),
    ('compliance-9', 'invoice', 'invoice-4', 'kyc_check', 'passed', 'system', CURRENT_TIMESTAMP - INTERVAL '60 days', 'KYC verification completed successfully', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '60 days'),
    ('compliance-10', 'invoice', 'invoice-5', 'kyc_check', 'passed', 'system', CURRENT_TIMESTAMP - INTERVAL '5 days', 'KYC verification completed successfully', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample client preferences
INSERT INTO client_preferences (id, customer_id, preferred_language, preferred_currency, invoice_delivery_method, payment_terms, auto_reminders, created_at, updated_at)
VALUES 
    ('pref-1', 'customer-1', 'en', 'INR', 'email', '30', true, CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '90 days'),
    ('pref-2', 'customer-2', 'en', 'INR', 'email', '30', true, CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '90 days'),
    ('pref-3', 'customer-3', 'en', 'INR', 'email', '45', false, CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '90 days'),
    ('pref-4', 'customer-4', 'en', 'INR', 'email', '15', true, CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '90 days'),
    ('pref-5', 'customer-5', 'en', 'INR', 'email', '30', true, CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

-- Update statistics and materialized views
REFRESH MATERIALIZED VIEW invoice_summary_report;

-- Create sample users for testing
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
VALUES 
    ('user-1', 'admin@smeplatform.com', '$2b$12$hashed_password_here', 'Admin', 'User', 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('user-2', 'invoice@smeplatform.com', '$2b$12$hashed_password_here', 'Invoice', 'Manager', 'manager', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('user-3', 'finance@smeplatform.com', '$2b$12$hashed_password_here', 'Finance', 'User', 'user', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Create sample audit logs
INSERT INTO invoice_audit_log (table_name, record_id, action, new_data, changed_by, changed_at)
VALUES 
    ('invoices', 'invoice-1', 'INSERT', '{"invoice_number": "INV-2025-001", "customer_id": "customer-1", "total": 15000.00}', 'system', CURRENT_TIMESTAMP - INTERVAL '15 days'),
    ('invoices', 'invoice-2', 'INSERT', '{"invoice_number": "INV-2025-002", "customer_id": "customer-2", "total": 12500.00}', 'system', CURRENT_TIMESTAMP - INTERVAL '30 days'),
    ('invoices', 'invoice-2', 'UPDATE', '{"status": "PAID", "paid_amount": 12500.00}', 'system', CURRENT_TIMESTAMP - INTERVAL '25 days'),
    ('invoices', 'invoice-3', 'INSERT', '{"invoice_number": "INV-2025-003", "customer_id": "customer-3", "total": 25000.00}', 'system', CURRENT_TIMESTAMP - INTERVAL '45 days'),
    ('invoices', 'invoice-3', 'UPDATE', '{"status": "PARTIALLY_PAID", "paid_amount": 15000.00}', 'system', CURRENT_TIMESTAMP - INTERVAL '40 days')
ON CONFLICT (id) DO NOTHING;

-- Create sample performance metrics for templates
INSERT INTO template_performance_metrics (id, template_id, usage_count, success_rate, average_payment_days, total_amount, last_updated)
VALUES 
    ('metric-1', 'template-1', 3, 66.67, 35, 68000.00, CURRENT_TIMESTAMP),
    ('metric-2', 'template-2', 2, 100.00, 30, 40500.00, CURRENT_TIMESTAMP),
    ('metric-3', 'template-3', 2, 50.00, 40, 70000.00, CURRENT_TIMESTAMP),
    ('metric-4', 'template-4', 1, 100.00, 30, 35000.00, CURRENT_TIMESTAMP),
    ('metric-5', 'template-5', 2, 0.00, 0, 40000.00, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Commit the seed data
-- Note: In a real application, you would wrap this in a transaction
-- and handle any potential conflicts appropriately

-- Output summary
DO $$
DECLARE
    customer_count INTEGER;
    invoice_count INTEGER;
    template_count INTEGER;
    recurring_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO customer_count FROM customers;
    SELECT COUNT(*) INTO invoice_count FROM invoices;
    SELECT COUNT(*) INTO template_count FROM invoice_templates;
    SELECT COUNT(*) INTO recurring_count FROM recurring_invoice_profiles;
    
    RAISE NOTICE 'Seed data loaded successfully:';
    RAISE NOTICE '- Customers: %', customer_count;
    RAISE NOTICE '- Invoices: %', invoice_count;
    RAISE NOTICE '- Templates: %', template_count;
    RAISE NOTICE '- Recurring Profiles: %', recurring_count;
END $$;
