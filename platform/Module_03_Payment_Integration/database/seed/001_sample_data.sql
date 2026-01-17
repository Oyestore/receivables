-- Module 03: Payment Integration - Seed Data
-- Created: 2025-01-12
-- Purpose: Sample data for testing and development

-- Insert Payment Gateways
INSERT INTO payment_gateways (id, name, provider, api_key_encrypted, environment, is_active, priority, supported_methods, configuration) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Razorpay Production', 'RAZORPAY', 'encrypted_rzp_live_key', 'production', true, 1, '["credit_card", "debit_card", "net_banking", "upi", "wallet"]', '{"webhook_url": "https://api.example.com/webhooks/razorpay", "auto_capture": true}'),
('550e8400-e29b-41d4-a716-446655440002', 'Razorpay Sandbox', 'RAZORPAY', 'encrypted_rzp_test_key', 'sandbox', true, 2, '["credit_card", "debit_card", "net_banking", "upi", "wallet"]', '{"webhook_url": "https://api.example.com/webhooks/razorpay", "auto_capture": true}'),
('550e8400-e29b-41d4-a716-446655440003', 'PayU Production', 'PAYU', 'encrypted_payu_live_key', 'production', true, 3, '["credit_card", "debit_card", "net_banking"]', '{"webhook_url": "https://api.example.com/webhooks/payu"}'),
('550e8400-e29b-41d4-a716-446655440004', 'PayU Sandbox', 'PAYU', 'encrypted_payu_test_key', 'sandbox', true, 4, '["credit_card", "debit_card", "net_banking"]', '{"webhook_url": "https://api.example.com/webhooks/payu"}'),
('550e8400-e29b-41d4-a716-446655440005', 'CCAvenue Production', 'CCAVENUE', 'encrypted_ccav_live_key', 'production', true, 5, '["credit_card", "debit_card", "net_banking", "wallet"]', '{"webhook_url": "https://api.example.com/webhooks/ccavenue"}'),
('550e8400-e29b-41d4-a716-446655440006', 'UPI Provider', 'UPI_PROVIDER', 'encrypted_upi_key', 'production', true, 6, '["upi"]', '{"supported_banks": ["HDFC", "ICICI", "SBI", "PNB"]}'),
('550e8400-e29b-41d4-a716-446655440007', 'Voice Provider', 'VOICE_PROVIDER', 'encrypted_voice_key', 'production', true, 7, '["voice_payment"]', '{"languages": ["en", "hi", "bn", "te", "mr"], "max_duration": 300}'),
('550e8400-e29b-41d4-a716-446655440008', 'SMS Provider', 'SMS_PROVIDER', 'encrypted_sms_key', 'production', true, 8, '["sms_payment"]', '{"provider": "twilio", "rate_limit": 10}');

-- Insert Payment Methods
INSERT INTO payment_methods (id, gateway_id, method, display_name, is_enabled, configuration, fees, limits) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'CREDIT_CARD', 'Credit Card', true, '{"supported_brands": ["VISA", "MC", "AMEX"], "3ds_enabled": true}', '{"percentage": 2.0, "fixed": 0}', '{"min": 100, "max": 1000000}'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'DEBIT_CARD', 'Debit Card', true, '{"supported_brands": ["VISA", "MC", "RUPAY"], "3ds_enabled": false}', '{"percentage": 1.5, "fixed": 0}', '{"min": 100, "max": 500000}'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'NET_BANKING', 'Net Banking', true, '{"supported_banks": ["HDFC", "ICICI", "SBI", "PNB", "AXIS"]}', '{"percentage": 1.0, "fixed": 5}', '{"min": 100, "max": 200000}'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'UPI', 'UPI Payment', true, '{"supported_apps": ["gpay", "phonepe", "paytm"]}', '{"percentage": 0.5, "fixed": 0}', '{"min": 1, "max": 100000}'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'WALLET', 'Mobile Wallet', true, '{"supported_wallets": ["paytm", "phonepe", "amazonpay"]}', '{"percentage": 1.5, "fixed": 0}', '{"min": 100, "max": 100000}'),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 'UPI', 'UPI Payment', true, '{"supported_banks": ["HDFC", "ICICI", "SBI", "PNB"]}', '{"percentage": 0.0, "fixed": 0}', '{"min": 1, "max": 100000}'),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', 'VOICE_PAYMENT', 'Voice Payment', true, '{"languages": ["en", "hi", "bn"], "verification_required": true}', '{"percentage": 2.5, "fixed": 10}', '{"min": 100, "max": 50000}'),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440008', 'SMS_PAYMENT', 'SMS Payment', true, '{"otp_required": true, "session_timeout": 300}', '{"percentage": 1.0, "fixed": 5}', '{"min": 100, "max": 25000}');

-- Insert Sample Payment Transactions
INSERT INTO payment_transactions (id, transaction_id, gateway_id, gateway_transaction_id, method, amount, currency, status, customer_id, invoice_id, order_id, description, metadata, fraud_score, fraud_risk_level, processed_at, completed_at, fees, taxes) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'TXN_001', '550e8400-e29b-41d4-a716-446655440001', 'RZP_TXN_001', 'CREDIT_CARD', 15000.00, 'INR', 'COMPLETED', 'CUST_001', 'INV_001', 'ORD_001', 'Payment for invoice #001', '{"product": "software_license", "category": "B2B"}', 5.2, 'LOW', '2025-01-12 10:30:00', '2025-01-12 10:30:45', '{"gateway_fee": 300.00, "processing_fee": 0}', '{"gst": 54.00, "service_tax": 0}'),
('770e8400-e29b-41d4-a716-446655440002', 'TXN_002', '550e8400-e29b-41d4-a716-446655440002', 'RZP_TXN_002', 'UPI', 2500.00, 'INR', 'COMPLETED', 'CUST_002', 'INV_002', 'ORD_002', 'Payment for invoice #002', '{"product": "consulting_service", "category": "B2B"}', 3.1, 'LOW', '2025-01-12 11:15:00', '2025-01-12 11:15:20', '{"gateway_fee": 12.50, "processing_fee": 0}', '{"gst": 2.25, "service_tax": 0}'),
('770e8400-e29b-41d4-a716-446655440003', 'TXN_003', '550e8400-e29b-41d4-a716-446655440003', 'PAYU_TXN_003', 'NET_BANKING', 50000.00, 'INR', 'FAILED', 'CUST_003', 'INV_003', 'ORD_003', 'Payment for invoice #003', '{"product": "hardware_purchase", "category": "B2B"}', 15.8, 'MEDIUM', '2025-01-12 12:00:00', NULL, '{"gateway_fee": 0, "processing_fee": 0}', '{"gst": 0, "service_tax": 0}'),
('770e8400-e29b-41d4-a716-446655440004', 'TXN_004', '550e8400-e29b-41d4-a716-446655440006', 'UPI_TXN_004', 'UPI', 7500.00, 'INR', 'COMPLETED', 'CUST_004', 'INV_004', 'ORD_004', 'Payment for invoice #004', '{"product": "subscription_fee", "category": "B2B"}', 2.3, 'LOW', '2025-01-12 13:45:00', '2025-01-12 13:45:15', '{"gateway_fee": 0, "processing_fee": 0}', '{"gst": 0, "service_tax": 0}'),
('770e8400-e29b-41d4-a716-446655440005', 'TXN_005', '550e8400-e29b-41d4-a716-446655440007', 'VOICE_TXN_005', 'VOICE_PAYMENT', 12000.00, 'INR', 'COMPLETED', 'CUST_005', 'INV_005', 'ORD_005', 'Voice payment for invoice #005', '{"product": "training_service", "category": "B2B"}', 8.7, 'MEDIUM', '2025-01-12 14:30:00', '2025-01-12 14:32:10', '{"gateway_fee": 310.00, "processing_fee": 10}', '{"gst": 55.80, "service_tax": 0}'),
('770e8400-e29b-41d4-a716-446655440006', 'TXN_006', '550e8400-e29b-41d4-a716-446655440008', 'SMS_TXN_006', 'SMS_PAYMENT', 3500.00, 'INR', 'COMPLETED', 'CUST_006', 'INV_006', 'ORD_006', 'SMS payment for invoice #006', '{"product": "maintenance_fee", "category": "B2B"}', 4.5, 'LOW', '2025-01-12 15:20:00', '2025-01-12 15:21:30', '{"gateway_fee": 40.00, "processing_fee": 5}', '{"gst": 7.20, "service_tax": 0}'),
('770e8400-e29b-41d4-a716-446655440007', 'TXN_007', '550e8400-e29b-41d4-a716-446655440001', 'RZP_TXN_007', 'DEBIT_CARD', 18000.00, 'INR', 'PROCESSING', 'CUST_007', 'INV_007', 'ORD_007', 'Payment for invoice #007', '{"product": "software_upgrade", "category": "B2B"}', 6.2, 'LOW', '2025-01-12 16:00:00', NULL, '{"gateway_fee": 270.00, "processing_fee": 0}', '{"gst": 48.60, "service_tax": 0}'),
('770e8400-e29b-41d4-a716-446655440008', 'TXN_008', '550e8400-e29b-41d4-a716-446655440004', 'RZP_TXN_008', 'WALLET', 4500.00, 'INR', 'COMPLETED', 'CUST_008', 'INV_008', 'ORD_008', 'Payment for invoice #008', '{"product": "addon_service", "category": "B2B"}', 3.8, 'LOW', '2025-01-12 16:45:00', '2025-01-12 16:45:25', '{"gateway_fee": 67.50, "processing_fee": 0}', '{"gst": 12.15, "service_tax": 0}');

-- Insert Payment History
INSERT INTO payment_history (id, transaction_id, old_status, new_status, changed_by, change_reason, metadata) VALUES
('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'PENDING', 'PROCESSING', 'system', 'Payment initiated', '{"timestamp": "2025-01-12 10:30:00"}'),
('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'PROCESSING', 'COMPLETED', 'system', 'Payment successful', '{"timestamp": "2025-01-12 10:30:45"}'),
('880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', 'PENDING', 'PROCESSING', 'system', 'Payment initiated', '{"timestamp": "2025-01-12 12:00:00"}'),
('880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440003', 'PROCESSING', 'FAILED', 'system', 'Bank declined transaction', '{"timestamp": "2025-01-12 12:01:30", "error_code": "BANK_DECLINED"}');

-- Insert Voice Payment Records
INSERT INTO voice_payments (id, transaction_id, customer_phone, voice_file_path, transcript, confidence_score, language, duration_seconds, verified_at, verification_method) VALUES
('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440005', '+919876543210', '/voices/txn_005_voice.wav', 'I confirm payment of twelve thousand rupees for invoice zero zero five', 94.5, 'en', 45, '2025-01-12 14:32:00', 'voice_biometric'),
('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440009', '+919876543211', '/voices/txn_009_voice.wav', 'Haan main payment karunga fifteen thousand rupees', 89.2, 'hi', 62, '2025-01-12 17:15:00', 'otp_verification');

-- Insert SMS Payment Records
INSERT INTO sms_payments (id, transaction_id, customer_phone, sms_message, sms_id, delivery_status, delivered_at) VALUES
('AA0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440006', '+919876543212', 'Please confirm payment of Rs.3500 for INV006. Reply YES to confirm.', 'SMS_001', 'delivered', '2025-01-12 15:21:00'),
('AA0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440010', '+919876543213', 'Your OTP for payment confirmation is 123456. Valid for 5 minutes.', 'SMS_002', 'delivered', '2025-01-12 18:30:00');

-- Insert Installment Plans
INSERT INTO installment_plans (id, transaction_id, total_amount, number_of_installments, installment_amount, frequency, next_due_date, completed_installments, status) VALUES
('BB0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440009', 60000.00, 6, 10000.00, 'monthly', '2025-02-12', 0, 'active'),
('BB0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440010', 30000.00, 3, 10000.00, 'monthly', '2025-02-15', 1, 'active');

-- Insert Installment Payments
INSERT INTO installment_payments (id, plan_id, installment_number, amount, due_date, paid_date, status, transaction_id) VALUES
('CC0e8400-e29b-41d4-a716-446655440001', 'BB0e8400-e29b-41d4-a716-446655440002', 1, 10000.00, '2025-01-15', '2025-01-14', 'paid', '770e8400-e29b-41d4-a716-446655440010'),
('CC0e8400-e29b-41d4-a716-446655440002', 'BB0e8400-e29b-41d4-a716-446655440002', 2, 10000.00, '2025-02-15', NULL, 'pending', NULL),
('CC0e8400-e29b-41d4-a716-446655440003', 'BB0e8400-e29b-41d4-a716-446655440001', 1, 10000.00, '2025-02-12', NULL, 'pending', NULL);

-- Insert Discount Applications
INSERT INTO discount_applications (id, transaction_id, discount_code, discount_type, discount_value, original_amount, discounted_amount, applied_at, expires_at, is_active) VALUES
('DD0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440004', 'EARLY2025', 'percentage', 5.0, 7894.74, 7500.00, '2025-01-12 13:45:00', '2025-01-31 23:59:59', true),
('DD0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440008', 'WELCOME10', 'fixed', 500.00, 5000.00, 4500.00, '2025-01-12 16:45:00', '2025-02-12 16:45:00', true);

-- Insert Late Fee Applications
INSERT INTO late_fee_applications (id, transaction_id, fee_type, fee_value, base_amount, fee_amount, applied_at, due_date, is_paid) VALUES
('EE0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440011', 'percentage', 2.0, 25000.00, 500.00, '2025-01-12 09:00:00', '2025-01-20', false),
('EE0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440012', 'fixed', 100.00, 15000.00, 100.00, '2025-01-12 10:30:00', '2025-01-25', true);

-- Insert Payment Patterns
INSERT INTO payment_patterns (id, customer_id, pattern_type, pattern_data, confidence_score, last_updated) VALUES
('FF0e8400-e29b-41d4-a716-446655440001', 'CUST_001', 'payment_frequency', '{"avg_days_between_payments": 30, "preferred_time": "10:00-12:00", "consistency_score": 0.85}', 85.5, '2025-01-12 10:30:45'),
('FF0e8400-e29b-41d4-a716-446655440002', 'CUST_002', 'amount_range', '{"min_amount": 2000, "max_amount": 5000, "avg_amount": 3200, "std_dev": 800}', 78.2, '2025-01-12 11:15:20'),
('FF0e8400-e29b-41d4-a716-446655440003', 'CUST_003', 'preferred_method', '{"methods": [{"name": "UPI", "usage": 60}, {"name": "credit_card", "usage": 30}, {"name": "net_banking", "usage": 10}]}', 92.1, '2025-01-12 12:01:30'),
('FF0e8400-e29b-41d4-a716-446655440004', 'CUST_004', 'payment_frequency', '{"avg_days_between_payments": 15, "preferred_time": "14:00-16:00", "consistency_score": 0.92}', 91.8, '2025-01-12 13:45:15');

-- Insert Payment Metrics
INSERT INTO payment_metrics (id, metric_date, total_transactions, successful_transactions, failed_transactions, total_amount, average_transaction_value, success_rate, gateway_breakdown, method_breakdown) VALUES
('GG0e8400-e29b-41d4-a716-446655440001', '2025-01-12', 8, 6, 1, 95500.00, 11937.50, 85.71, '{"razorpay": 4, "upi_provider": 1, "voice_provider": 1, "sms_provider": 1}', '{"credit_card": 2, "upi": 2, "net_banking": 1, "voice_payment": 1, "sms_payment": 1, "wallet": 1}'),
('GG0e8400-e29b-41d4-a716-446655440002', '2025-01-11', 15, 13, 2, 125000.00, 8333.33, 86.67, '{"razorpay": 8, "payu": 4, "ccavenue": 3}', '{"credit_card": 6, "debit_card": 4, "upi": 3, "net_banking": 2}'),
('GG0e8400-e29b-41d4-a716-446655440003', '2025-01-10', 12, 11, 1, 98000.00, 8166.67, 91.67, '{"razorpay": 7, "upi_provider": 3, "payu": 2}', '{"upi": 5, "credit_card": 4, "net_banking": 2, "wallet": 1}');

-- Insert AI Intelligence Records
INSERT INTO ai_intelligence (id, entity_type, entity_id, intelligence_type, prediction, confidence_score, model_version, created_at, expires_at) VALUES
('HH0e8400-e29b-41d4-a716-446655440001', 'transaction', '770e8400-e29b-41d4-a716-446655440003', 'fraud_prediction', '{"risk_score": 15.8, "risk_factors": ["high_amount", "new_customer"], "recommendation": "manual_review"}', 87.3, 'v2.1.0', '2025-01-12 12:00:00', '2025-01-19 12:00:00'),
('HH0e8400-e29b-41d4-a716-446655440002', 'customer', 'CUST_001', 'payment_forecast', '{"next_payment_date": "2025-02-10", "predicted_amount": 18000, "probability": 0.92}', 92.0, 'v2.1.0', '2025-01-12 10:30:45', '2025-02-12 10:30:45'),
('HH0e8400-e29b-41d4-a716-446655440003', 'customer', 'CUST_003', 'recommendation', '{"recommended_method": "UPI", "discount_offer": "5%", "payment_reminder": "2025-01-15"}', 78.5, 'v2.1.0', '2025-01-12 12:01:30', '2025-01-19 12:01:30'),
('HH0e8400-e29b-41d4-a716-446655440004', 'transaction', '770e8400-e29b-41d4-a716-446655440007', 'fraud_prediction', '{"risk_score": 6.2, "risk_factors": [], "recommendation": "proceed"}', 94.1, 'v2.1.0', '2025-01-12 16:00:00', '2025-01-19 16:00:00');

-- Insert Accounting Systems
INSERT INTO accounting_systems (id, name, type, api_endpoint, api_key_encrypted, company_id, is_active, last_sync_at, configuration) VALUES
('II0e8400-e29b-41d4-a716-446655440001', 'Zoho Books India', 'zoho', 'https://books.zoho.in/api/v3', 'encrypted_zoho_key', '12345678901', true, '2025-01-12 06:00:00', '{"auto_sync": true, "sync_frequency": "hourly", "sync_entities": ["payments", "customers", "invoices"]}'),
('II0e8400-e29b-41d4-a716-446655440002', 'Busy Accounting', 'busy', 'odbc://localhost:3306/business', 'encrypted_busy_credentials', 'COMPANY_001', true, '2025-01-12 06:30:00', '{"database": "business_db", "auto_sync": true, "sync_frequency": "daily"}'),
('II0e8400-e29b-41d4-a716-446655440003', 'QuickBooks India', 'quickbooks', 'https://quickbooks.api.intuit.com/v3/company', 'encrypted_qb_key', '98765432109', true, '2025-01-12 07:00:00', '{"realm_id": "1234567890", "auto_sync": true, "sync_frequency": "daily"}'),
('II0e8400-e29b-41d4-a716-446655440004', 'Marg ERP', 'marg', 'https://api.margerp.com/v1', 'encrypted_marg_key', 'MARG_001', false, '2025-01-11 18:00:00', '{"version": "9.0", "auto_sync": false, "sync_frequency": "manual"}');

-- Insert Accounting Mappings
INSERT INTO accounting_mappings (id, accounting_system_id, local_entity, remote_entity, field_mappings, sync_direction, is_active, last_sync_at) VALUES
('JJ0e8400-e29b-41d4-a716-446655440001', 'II0e8400-e29b-41d4-a716-446655440001', 'payment_transaction', 'payment', '{"transaction_id": "payment_id", "amount": "amount", "status": "status", "customer_id": "customer_id"}', 'bidirectional', true, '2025-01-12 06:00:00'),
('JJ0e8400-e29b-41d4-a716-446655440002', 'II0e8400-e29b-41d4-a716-446655440002', 'customer', 'customer', '{"customer_id": "customer_code", "name": "customer_name", "email": "email", "phone": "phone"}', 'bidirectional', true, '2025-01-12 06:30:00'),
('JJ0e8400-e29b-41d4-a716-446655440003', 'II0e8400-e29b-41d4-a716-446655440003', 'invoice', 'invoice', '{"invoice_id": "invoice_number", "amount": "total_amount", "due_date": "due_date"}', 'bidirectional', true, '2025-01-12 07:00:00');

-- Insert Accounting Sync Logs
INSERT INTO accounting_sync_logs (id, accounting_system_id, sync_type, entity_type, entity_id, status, records_processed, records_success, records_failed, error_details, sync_started_at, sync_completed_at) VALUES
('KK0e8400-e29b-41d4-a716-446655440001', 'II0e8400-e29b-41d4-a716-446655440001', 'incremental', 'payment_transaction', NULL, 'success', 25, 24, 1, '{"failed_records": [{"id": "TXN_003", "error": "Invalid customer ID"}]}', '2025-01-12 06:00:00', '2025-01-12 06:02:15'),
('KK0e8400-e29b-41d4-a716-446655440002', 'II0e8400-e29b-41d4-a716-446655440002', 'full', 'customer', NULL, 'success', 150, 148, 2, '{"failed_records": [{"id": "CUST_999", "error": "Missing email"}, {"id": "CUST_998", "error": "Invalid phone"}]}', '2025-01-12 06:30:00', '2025-01-12 06:35:42'),
('KK0e8400-e29b-41d4-a716-446655440003', 'II0e8400-e29b-41d4-a716-446655440003', 'entity', 'invoice', 'INV_001', 'success', 1, 1, 0, '{}', '2025-01-12 07:00:00', '2025-01-12 07:00:25');

-- Refresh materialized views
SELECT refresh_payment_analytics();

-- Output summary
DO $$
BEGIN
    RAISE NOTICE 'Module 03 Payment Integration seed data inserted successfully';
    RAISE NOTICE 'Payment Gateways: %', (SELECT COUNT(*) FROM payment_gateways);
    RAISE NOTICE 'Payment Methods: %', (SELECT COUNT(*) FROM payment_methods);
    RAISE NOTICE 'Payment Transactions: %', (SELECT COUNT(*) FROM payment_transactions);
    RAISE NOTICE 'Voice Payments: %', (SELECT COUNT(*) FROM voice_payments);
    RAISE NOTICE 'SMS Payments: %', (SELECT COUNT(*) FROM sms_payments);
    RAISE NOTICE 'Installment Plans: %', (SELECT COUNT(*) FROM installment_plans);
    RAISE NOTICE 'AI Intelligence Records: %', (SELECT COUNT(*) FROM ai_intelligence);
    RAISE NOTICE 'Accounting Systems: %', (SELECT COUNT(*) FROM accounting_systems);
END $$;
