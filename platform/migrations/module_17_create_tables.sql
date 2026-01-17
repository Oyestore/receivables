-- Module 17: Reconciliation & GL Tables
-- Run this migration to create all Module 17 database tables

-- 1. GL Accounts (Chart of Accounts)
CREATE TABLE IF NOT EXISTS gl_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    parent_account_id UUID REFERENCES gl_accounts(id),
    level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_system_account BOOLEAN DEFAULT FALSE,
    current_balance DECIMAL(15, 2) DEFAULT 0,
    opening_balance DECIMAL(15, 2) DEFAULT 0,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gl_accounts_tenant ON gl_accounts(tenant_id, is_active);
CREATE INDEX idx_gl_accounts_code ON gl_accounts(account_code);
CREATE INDEX idx_gl_accounts_type ON gl_accounts(account_type);

-- 2. Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    entry_type VARCHAR(20) DEFAULT 'manual' CHECK (entry_type IN ('system', 'manual', 'adjustment', 'closing', 'reversal')),
    description TEXT NOT NULL,
    total_debit DECIMAL(15, 2) DEFAULT 0,
    total_credit DECIMAL(15, 2) DEFAULT 0,
    is_balanced BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
    posted_at TIMESTAMPTZ,
    posted_by VARCHAR(255),
    reversed_by_entry_id UUID REFERENCES journal_entries(id),
    reference_type VARCHAR(50),
    reference_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255)
);

CREATE INDEX idx_journal_entries_tenant ON journal_entries(tenant_id, entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
CREATE INDEX idx_journal_entries_number ON journal_entries(entry_number);

-- 3. GL Entries (Individual debit/credit lines)
CREATE TABLE IF NOT EXISTS gl_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    gl_account_id UUID NOT NULL REFERENCES gl_accounts(id),
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('debit', 'credit')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    reference_type VARCHAR(50),
    reference_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gl_entries_tenant ON gl_entries(tenant_id);
CREATE INDEX idx_gl_entries_journal ON gl_entries(journal_entry_id);
CREATE INDEX idx_gl_entries_account ON gl_entries(gl_account_id);
CREATE INDEX idx_gl_entries_reference ON gl_entries(reference_type, reference_id);

-- 4. Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    account_number_masked VARCHAR(50),
    bank_name VARCHAR(255),
    ifsc_code VARCHAR(20),
    sync_method VARCHAR(30) DEFAULT 'manual_upload' CHECK (sync_method IN ('account_aggregator', 'manual_upload', 'direct_api')),
    is_active BOOLEAN DEFAULT TRUE,
    current_balance DECIMAL(15, 2) DEFAULT 0,
    last_reconciled_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    gl_account_id UUID REFERENCES gl_accounts(id),
    api_credentials JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_tenant ON bank_accounts(tenant_id, is_active);

-- 5. Bank Transactions
CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    transaction_id VARCHAR(255),
    transaction_date DATE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    amount DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2),
    description TEXT,
    utr_number VARCHAR(50),
    cheque_number VARCHAR(50),
    reconciliation_status VARCHAR(20) DEFAULT 'pending' CHECK (reconciliation_status IN ('pending', 'matched', 'unmatched', 'suspended', 'ignored')),
    parsed_data JSONB,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    reconciled_at TIMESTAMPTZ,
    reconciled_by VARCHAR(255),
    matched_invoice_id UUID,
    matched_gl_entry_id UUID,
    suspense_entry_id UUID REFERENCES journal_entries(id),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_bank_txn_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_txn_status ON bank_transactions(reconciliation_status);
CREATE INDEX idx_bank_txn_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_txn_utr ON bank_transactions(utr_number);

-- 6. Reconciliation Matches
CREATE TABLE IF NOT EXISTS reconciliation_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL,
    match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
    match_criteria JSONB,
    match_type VARCHAR(20) CHECK (match_type IN ('auto', 'ai_suggested', 'manual')),
    payment_type VARCHAR(10) CHECK (payment_type IN ('exact', 'short', 'over')),
    discrepancy DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'auto_approved', 'rejected')),
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    gl_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recon_matches_txn ON reconciliation_matches(bank_transaction_id);
CREATE INDEX idx_recon_matches_invoice ON reconciliation_matches(invoice_id);
CREATE INDEX idx_recon_matches_status ON reconciliation_matches(status);

-- Insert default GL accounts
INSERT INTO gl_accounts (tenant_id, account_code, account_name, account_type, normal_balance, is_system_account, opening_balance)
SELECT 
    t.id,
    '1050',
    'Bank Account',
    'asset',
    'debit',
    TRUE,
    0
FROM tenants t
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO gl_accounts (tenant_id, account_code, account_name, account_type, normal_balance, is_system_account, opening_balance)
SELECT 
    t.id,
    '1100',
    'Accounts Receivable',
    'asset',
    'debit',
    TRUE,
    0
FROM tenants t
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO gl_accounts (tenant_id, account_code, account_name, account_type, normal_balance, is_system_account, opening_balance)
SELECT 
    t.id,
    '1999',
    'Suspense Account',
    'asset',
    'debit',
    TRUE,
    0
FROM tenants t
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO gl_accounts (tenant_id, account_code, account_name, account_type, normal_balance, is_system_account, opening_balance)
SELECT 
    t.id,
    '4000',
    'Sales Revenue',
    'revenue',
    'credit',
    TRUE,
    0
FROM tenants t
ON CONFLICT (account_code) DO NOTHING;

INSERT INTO gl_accounts (tenant_id, account_code, account_name, account_type, normal_balance, is_system_account, opening_balance)
SELECT 
    t.id,
    '5100',
    'Bank Charges',
    'expense',
    'debit',
    FALSE,
    0
FROM tenants t
ON CONFLICT (account_code) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Module 17 tables created successfully!';
    RAISE NOTICE 'Tables: gl_accounts, journal_entries, gl_entries, bank_accounts, bank_transactions, reconciliation_matches';
    RAISE NOTICE 'Default GL accounts created for all tenants';
END $$;
