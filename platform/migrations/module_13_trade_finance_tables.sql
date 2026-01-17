-- ============================================================================
-- Module 13: Cross-Border Trade - Trade Finance Marketplace Migration
-- ============================================================================
-- Description: Creates 4 new tables for the Trade Finance Orchestrator:
--   1. financing_opportunities - Tracks financing needs and marketplace opportunities
--   2. lenders - Lender profiles with risk appetite and performance metrics
--   3. financing_offers - Lender bids on financing opportunities
--   4. escrow_agreements - Smart escrow with milestone-based payments
--
-- Author: Module 13 Implementation
-- Date: 2024-12-28
-- Version: 1.0
-- ============================================================================

-- ============================================================================
-- Table 1: financing_opportunities
-- ============================================================================
CREATE TABLE IF NOT EXISTS financing_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES cross_border_trades(id) ON DELETE CASCADE,
    
    -- Financing Needs
    exporter_need VARCHAR(50) NOT NULL DEFAULT 'none'
        CHECK (exporter_need IN ('immediate_cash', 'working_capital', 'forex_hedge', 'none')),
    importer_need VARCHAR(50) NOT NULL DEFAULT 'none'
        CHECK (importer_need IN ('immediate_cash', 'working_capital', 'forex_hedge', 'none')),
    financing_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    tenure_days INTEGER NOT NULL,
    
    -- AI-Generated Scores
    credit_risk_score DECIMAL(5,2),
    financing_eligibility_score DECIMAL(5,2),
    trade_risk_score DECIMAL(5,2),
    
    -- Recommended Products (JSONB array)
    recommended_products JSONB,
    
    -- Marketplace Status
    status VARCHAR(50) NOT NULL DEFAULT 'analyzing'
        CHECK (status IN ('analyzing', 'open_for_bids', 'matched', 'funded', 'closed', 'rejected')),
    published_at TIMESTAMP,
    matched_at TIMESTAMP,
    
    -- Matched Offer
    selected_offer_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT financing_amount_positive CHECK (financing_amount > 0),
    CONSTRAINT tenure_positive CHECK (tenure_days > 0),
    CONSTRAINT scores_range CHECK (
        (credit_risk_score IS NULL OR credit_risk_score BETWEEN 0 AND 100) AND
        (financing_eligibility_score IS NULL OR financing_eligibility_score BETWEEN 0 AND 100) AND
        (trade_risk_score IS NULL OR trade_risk_score BETWEEN 0 AND 100)
    )
);

-- Indexes for financing_opportunities
CREATE INDEX idx_financing_opp_trade ON financing_opportunities(trade_id);
CREATE INDEX idx_financing_opp_status ON financing_opportunities(status);
CREATE INDEX idx_financing_opp_published ON financing_opportunities(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_financing_opp_amount ON financing_opportunities(financing_amount);
CREATE INDEX idx_financing_opp_eligibility ON financing_opportunities(financing_eligibility_score) WHERE financing_eligibility_score IS NOT NULL;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_financing_opportunity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER financing_opportunity_updated_at
    BEFORE UPDATE ON financing_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_financing_opportunity_timestamp();

-- ============================================================================
-- Table 2: lenders
-- ============================================================================
CREATE TABLE IF NOT EXISTS lenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL
        CHECK (type IN ('bank', 'nbfc', 'factor', 'supply_chain_financier', 'peer_to_peer')),
    email VARCHAR(255) NOT NULL UNIQUE,
    license_number VARCHAR(100) NOT NULL,
    regulatory_authority VARCHAR(100) NOT NULL,
    country VARCHAR(2),
    
    -- Risk Appetite (JSONB)
    risk_appetite JSONB NOT NULL,
    
    -- Pricing
    base_rate DECIMAL(5,2) NOT NULL,
    platform_fee_share DECIMAL(5,2) DEFAULT 0,
    
    -- Performance Metrics
    total_funded DECIMAL(15,2) DEFAULT 0,
    total_deals INTEGER DEFAULT 0,
    avg_funding_speed_hours DECIMAL(5,2),
    default_rate DECIMAL(5,2) DEFAULT 0,
    approval_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending_verification'
        CHECK (status IN ('pending_verification', 'active', 'suspended', 'inactive')),
    verified_at TIMESTAMP,
    last_active_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT base_rate_valid CHECK (base_rate >= 0 AND base_rate <= 100),
    CONSTRAINT platform_fee_valid CHECK (platform_fee_share >= 0 AND platform_fee_share <= 100),
    CONSTRAINT performance_valid CHECK (
        total_funded >= 0 AND
        total_deals >= 0 AND
        (avg_funding_speed_hours IS NULL OR avg_funding_speed_hours >= 0) AND
        default_rate >= 0 AND default_rate <= 100 AND
        approval_rate >= 0 AND approval_rate <= 100
    )
);

-- Indexes for lenders
CREATE INDEX idx_lenders_email ON lenders(email);
CREATE INDEX idx_lenders_status ON lenders(status);
CREATE INDEX idx_lenders_type ON lenders(type);
CREATE INDEX idx_lenders_verified ON lenders(verified_at) WHERE verified_at IS NOT NULL;
CREATE INDEX idx_lenders_country ON lenders(country) WHERE country IS NOT NULL;
CREATE INDEX idx_lenders_risk_appetite ON lenders USING GIN (risk_appetite);

-- ============================================================================
-- Table 3: financing_offers
-- ============================================================================
CREATE TABLE IF NOT EXISTS financing_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES financing_opportunities(id) ON DELETE CASCADE,
    lender_id UUID NOT NULL REFERENCES lenders(id) ON DELETE CASCADE,
    
    -- Offer Terms
    rate DECIMAL(5,2) NOT NULL,
    fees DECIMAL(15,2) NOT NULL,
    advance_percentage DECIMAL(5,2) NOT NULL,
    funding_speed VARCHAR(20) NOT NULL
        CHECK (funding_speed IN ('24h', '48h', '72h', '1week')),
    conditions TEXT,
    
    -- Calculated Amounts
    funded_amount DECIMAL(15,2) NOT NULL,
    total_repayment DECIMAL(15,2) NOT NULL,
    
    -- AI Recommendation Score
    recommendation_score DECIMAL(5,2),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'accepted', 'rejected', 'expired', 'withdrawn')),
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT offer_amounts_positive CHECK (
        rate >= 0 AND
        fees >= 0 AND
        advance_percentage > 0 AND advance_percentage <= 100 AND
        funded_amount > 0 AND
        total_repayment > 0
    ),
    CONSTRAINT one_lender_per_opportunity UNIQUE (opportunity_id, lender_id)
);

-- Indexes for financing_offers
CREATE INDEX idx_offers_opportunity ON financing_offers(opportunity_id);
CREATE INDEX idx_offers_lender ON financing_offers(lender_id);
CREATE INDEX idx_offers_status ON financing_offers(status);
CREATE INDEX idx_offers_expires ON financing_offers(expires_at);
CREATE INDEX idx_offers_created ON financing_offers(created_at);
CREATE INDEX idx_offers_recommendation ON financing_offers(recommendation_score) WHERE recommendation_score IS NOT NULL;

-- ============================================================================
-- Table 4: escrow_agreements
-- ============================================================================
CREATE TABLE IF NOT EXISTS escrow_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES cross_border_trades(id) ON DELETE CASCADE,
    financing_opportunity_id UUID REFERENCES financing_opportunities(id),
    
    -- Parties
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    lender_id UUID,
    platform_wallet_id VARCHAR(100),
    
    -- Escrow Amount
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    -- Payment Waterfall (Milestone-Based Releases) - JSONB
    milestones JSONB NOT NULL,
    
    -- Verification Settings
    auto_release BOOLEAN DEFAULT FALSE,
    blockchain_enabled BOOLEAN DEFAULT FALSE,
    smart_contract_address VARCHAR(255),
    blockchain_network VARCHAR(50),
    
    -- Escrow Account Details
    escrow_account_id VARCHAR(100),
    escrow_account_number VARCHAR(50),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'funded', 'in_progress', 'completed', 'disputed', 'cancelled')),
    funded_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    -- Amounts Tracking
    amount_released DECIMAL(15,2) DEFAULT 0,
    amount_pending DECIMAL(15,2) NOT NULL,
    
    -- Dispute Management
    dispute_raised_at TIMESTAMP,
    dispute_raised_by UUID,
    dispute_reason TEXT,
    dispute_resolved_at TIMESTAMP,
    dispute_resolution TEXT,
    
    -- Audit & Compliance
    terms_hash VARCHAR(64),
    buyer_signature TEXT,
    seller_signature TEXT,
    lender_signature TEXT,
    
    -- Metadata
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    
    -- Constraints
    CONSTRAINT escrow_amount_positive CHECK (amount > 0),
    CONSTRAINT escrow_amounts_valid CHECK (
        amount_released >= 0 AND
        amount_pending >= 0 AND
        amount_released + amount_pending = amount
    )
);

-- Indexes for escrow_agreements
CREATE INDEX idx_escrow_trade ON escrow_agreements(trade_id);
CREATE INDEX idx_escrow_opportunity ON escrow_agreements(financing_opportunity_id) WHERE financing_opportunity_id IS NOT NULL;
CREATE INDEX idx_escrow_buyer ON escrow_agreements(buyer_id);
CREATE INDEX idx_escrow_seller ON escrow_agreements(seller_id);
CREATE INDEX idx_escrow_lender ON escrow_agreements(lender_id) WHERE lender_id IS NOT NULL;
CREATE INDEX idx_escrow_status ON escrow_agreements(status);
CREATE INDEX idx_escrow_funded ON escrow_agreements(funded_at) WHERE funded_at IS NOT NULL;
CREATE INDEX idx_escrow_milestones ON escrow_agreements USING GIN (milestones);
CREATE INDEX idx_escrow_blockchain ON escrow_agreements(smart_contract_address) WHERE smart_contract_address IS NOT NULL;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_escrow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escrow_updated_at
    BEFORE UPDATE ON escrow_agreements
    FOR EACH ROW
    EXECUTE FUNCTION update_escrow_timestamp();

-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================

-- Sample Lender
INSERT INTO lenders (
    name, type, email, license_number, regulatory_authority, country,
    risk_appetite, base_rate, platform_fee_share, status, verified_at
) VALUES (
    'Global Trade Finance Ltd',
    'bank',
    'contact@gtf.com',
    'FCA-2024-12345',
    'Financial Conduct Authority (UK)',
    'GB',
    '{
        "minCreditScore": 30,
        "maxCreditScore": 70,
        "minTradeValue": 10000,
        "maxTradeValue": 5000000,
        "preferredCountries": ["US", "GB", "AE", "IN", "SG"],
        "excludedCountries": ["VE", "SY", "AF"],
        "preferredIndustries": ["manufacturing", "technology", "retail"],
        "maxTenureDays": 180
    }'::jsonb,
    9.5,
    0.5,
    'active',
    CURRENT_TIMESTAMP - INTERVAL '30 days'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================
COMMENT ON TABLE financing_opportunities IS 'Tracks cross-border trade financing opportunities for the marketplace';
COMMENT ON TABLE lenders IS 'Lender profiles with risk appetite and performance metrics';
COMMENT ON TABLE financing_offers IS 'Lender bids/offers on financing opportunities';
COMMENT ON TABLE escrow_agreements IS 'Smart escrow agreements with milestone-based payment releases';

COMMENT ON COLUMN financing_opportunities.recommended_products IS 'AI-generated array of recommended financing products with suitability scores';
COMMENT ON COLUMN lenders.risk_appetite IS 'Lender risk appetite configuration including credit score range, trade value limits, and country preferences';
COMMENT ON COLUMN escrow_agreements.milestones IS 'Array of milestone objects defining payment waterfall triggers and release percentages';
COMMENT ON COLUMN escrow_agreements.terms_hash IS 'SHA-256 hash of escrow terms for integrity verification';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Total Tables: 4
-- Total Indexes: 31
-- Total Triggers: 2
-- Total Functions: 2
-- ============================================================================
