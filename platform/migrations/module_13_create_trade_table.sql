-- Module 13: Cross-Border Trade - Database Migration
-- Create cross_border_trades table with all necessary fields and indexes

-- Drop table if exists (for development)
DROP TABLE IF EXISTS cross_border_trades CASCADE;

-- Create main table
CREATE TABLE cross_border_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    trade_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL,
    invoice_id UUID,
    
    -- Trade Details
    type VARCHAR(20) NOT NULL CHECK (type IN ('export', 'import')),
    origin_country VARCHAR(100) NOT NULL,
    destination_country VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    incoterm VARCHAR(20) NOT NULL, -- EXW, FOB, CIF, etc.
    
    -- Shipping Details
    shipping_method VARCHAR(20) NOT NULL CHECK (shipping_method IN ('air', 'sea', 'land', 'courier')),
    estimated_shipping_date DATE,
    actual_shipping_date DATE,
    estimated_arrival_date DATE,
    actual_arrival_date DATE,
    tracking_number VARCHAR(100),
    
    -- Customs & Compliance
    hs_code VARCHAR(50), -- Harmonized System Code
    customs_status VARCHAR(20) DEFAULT 'pending' CHECK (customs_status IN ('pending', 'submitted', 'approved', 'rejected', 'cleared')),
    customs_reference VARCHAR(100),
    duty_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'in_transit', 'customs_clearance', 'delivered', 'cancelled')),
    
    -- Documents (JSON storage for flexibility)
    documents JSONB,
    
    -- Metadata
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

-- Create indexes for better query performance
CREATE INDEX idx_cross_border_trades_tenant ON cross_border_trades(tenant_id);
CREATE INDEX idx_cross_border_trades_type ON cross_border_trades(type);
CREATE INDEX idx_cross_border_trades_status ON cross_border_trades(status);
CREATE INDEX idx_cross_border_trades_customs_status ON cross_border_trades(customs_status);
CREATE INDEX idx_cross_border_trades_customer ON cross_border_trades(customer_id);
CREATE INDEX idx_cross_border_trades_created_at ON cross_border_trades(created_at DESC);
CREATE INDEX idx_cross_border_trades_origin ON cross_border_trades(origin_country);
CREATE INDEX idx_cross_border_trades_destination ON cross_border_trades(destination_country);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_cross_border_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cross_border_trades_updated_at
    BEFORE UPDATE ON cross_border_trades
    FOR EACH ROW
    EXECUTE FUNCTION update_cross_border_trades_updated_at();

-- Insert sample data for demonstration (optional)
-- This would be for a demo tenant only
INSERT INTO cross_border_trades (
    tenant_id,
    trade_number,
    customer_id,
    type,
    origin_country,
    destination_country,
    amount,
    currency,
    incoterm,
    shipping_method,
    estimated_arrival_date,
    hs_code,
    customs_status,
    status,
    created_by
) VALUES
    (
        '00000000-0000-0000-0000-000000000001', -- Demo tenant
        'TR-2025-000001',
        '00000000-0000-0000-0000-000000000002', -- Demo customer
        'export',
        'India',
        'United States',
        125000.00,
        'USD',
        'FOB',
        'sea',
        '2025-02-15',
        '8517.12.00',
        'cleared',
        'in_transit',
        '00000000-0000-0000-0000-000000000001'
    ),
    (
        '00000000-0000-0000-0000-000000000001',
        'TR-2025-000002',
        '00000000-0000-0000-0000-000000000003',
        'import',
        'China',
        'India',
        85000.00,
        'USD',
        'CIF',
        'air',
        '2025-01-28',
        '8471.30.00',
        'submitted',
        'customs_clearance',
        '00000000-0000-0000-0000-000000000001'
    );

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON cross_border_trades TO sme_app_user;

-- Verification query
SELECT 
    COUNT(*) as total_trades,
    SUM(CASE WHEN type = 'export' THEN 1 ELSE 0 END) as exports,
    SUM(CASE WHEN type = 'import' THEN 1 ELSE 0 END) as imports
FROM cross_border_trades;
