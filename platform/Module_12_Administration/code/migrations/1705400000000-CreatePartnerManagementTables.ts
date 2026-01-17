import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePartnerManagementTables1705400000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension if not already enabled
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // ===== Partners Table =====
        await queryRunner.query(`
      CREATE TABLE partners (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        partner_code VARCHAR(50) UNIQUE NOT NULL,
        partner_name VARCHAR(255) NOT NULL,
        partner_type VARCHAR(50) NOT NULL CHECK (partner_type IN ('reseller', 'referral', 'integration', 'affiliate')),
        contact_email VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(50),
        contact_person VARCHAR(255),
        company_details JSONB,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
        onboarded_at TIMESTAMP,
        onboarded_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_email CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partners_code ON partners(partner_code);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partners_status ON partners(status);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partners_type ON partners(partner_type);
    `);

        // ===== Partner Contracts Table =====
        await queryRunner.query(`
      CREATE TABLE partner_contracts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        contract_number VARCHAR(100) UNIQUE NOT NULL,
        contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('reseller', 'referral', 'revenue_share', 'affiliate')),
        commission_rate DECIMAL(5,2) CHECK (commission_rate >= 0 AND commission_rate <= 100),
        revenue_share_rate DECIMAL(5,2) CHECK (revenue_share_rate >= 0 AND revenue_share_rate <= 100),
        flat_fee_per_referral DECIMAL(10,2) CHECK (flat_fee_per_referral >= 0),
        minimum_commitment INTEGER DEFAULT 0,
        contract_start DATE NOT NULL,
        contract_end DATE,
        terms JSONB,
        payment_terms VARCHAR(50) DEFAULT 'net-30' CHECK (payment_terms IN ('net-15', 'net-30', 'net-45', 'net-60')),
        status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID,
        CONSTRAINT valid_contract_dates CHECK (contract_start < contract_end OR contract_end IS NULL),
        CONSTRAINT at_least_one_commission CHECK (
          commission_rate IS NOT NULL OR 
          revenue_share_rate IS NOT NULL OR 
          flat_fee_per_referral IS NOT NULL
        )
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_contracts_partner ON partner_contracts(partner_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_contracts_status ON partner_contracts(status);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_contracts_dates ON partner_contracts(contract_start, contract_end);
    `);

        // ===== Partner Referrals Table =====
        await queryRunner.query(`
      CREATE TABLE partner_referrals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        referral_code VARCHAR(100) UNIQUE NOT NULL,
        referred_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
        referred_email VARCHAR(255) NOT NULL,
        referred_company VARCHAR(255),
        referral_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        conversion_date TIMESTAMP,
        first_payment_date TIMESTAMP,
        first_payment_amount DECIMAL(12,2),
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'qualified', 'converted', 'paid', 'cancelled')),
        rejection_reason TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_referrals_partner ON partner_referrals(partner_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_referrals_tenant ON partner_referrals(referred_tenant_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_referrals_status ON partner_referrals(status);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_referrals_code ON partner_referrals(referral_code);
    `);

        // ===== Partner Commissions Table =====
        await queryRunner.query(`
      CREATE TABLE partner_commissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        contract_id UUID NOT NULL REFERENCES partner_contracts(id),
        referral_id UUID REFERENCES partner_referrals(id) ON DELETE SET NULL,
        tenant_id UUID REFERENCES tenants(id),
        commission_type VARCHAR(50) NOT NULL CHECK (commission_type IN ('referral', 'revenue_share', 'flat_fee', 'recurring')),
        base_amount DECIMAL(12,2) NOT NULL CHECK (base_amount >= 0),
        commission_rate DECIMAL(5,2),
        commission_amount DECIMAL(12,2) NOT NULL CHECK (commission_amount >= 0),
        currency VARCHAR(3) DEFAULT 'USD',
        period_start DATE,
        period_end DATE,
        commission_date DATE NOT NULL DEFAULT CURRENT_DATE,
        payout_date DATE,
        payout_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'approved', 'processing', 'paid', 'failed', 'cancelled')),
        payout_reference VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_commissions_partner ON partner_commissions(partner_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_commissions_status ON partner_commissions(payout_status);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_commissions_date ON partner_commissions(commission_date DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_commissions_payout ON partner_commissions(payout_date DESC);
    `);

        // ===== Partner Payouts Table =====
        await queryRunner.query(`
      CREATE TABLE partner_payouts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        payout_batch_number VARCHAR(100) UNIQUE NOT NULL,
        total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
        currency VARCHAR(3) DEFAULT 'USD',
        commission_count INTEGER NOT NULL CHECK (commission_count > 0),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        payout_method VARCHAR(50) CHECK (payout_method IN ('bank_transfer', 'paypal', 'stripe', 'check', 'wire')),
        payout_details JSONB,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled')),
        initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        failure_reason TEXT,
        processed_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_payout_period CHECK (period_start <= period_end)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_payouts_partner ON partner_payouts(partner_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_payouts_status ON partner_payouts(status);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_payouts_dates ON partner_payouts(period_start, period_end);
    `);

        // ===== Partner Performance Metrics Table =====
        await queryRunner.query(`
      CREATE TABLE partner_performance (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        metric_date DATE NOT NULL,
        referrals_count INTEGER DEFAULT 0 CHECK (referrals_count >= 0),
        conversions_count INTEGER DEFAULT 0 CHECK (conversions_count >= 0),
        conversion_rate DECIMAL(5,2),
        total_revenue DECIMAL(12,2) DEFAULT 0 CHECK (total_revenue >= 0),
        total_commissions DECIMAL(12,2) DEFAULT 0 CHECK (total_commissions >= 0),
        active_customers INTEGER DEFAULT 0 CHECK (active_customers >= 0),
        churned_customers INTEGER DEFAULT 0 CHECK (churned_customers >= 0),
        average_customer_value DECIMAL(12,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_partner_metric_date UNIQUE(partner_id, metric_date)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_performance_partner ON partner_performance(partner_id, metric_date DESC);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_performance_date ON partner_performance(metric_date DESC);
    `);

        // ===== Partner Portal Access Table =====
        await queryRunner.query(`
      CREATE TABLE partner_portal_access (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        access_level VARCHAR(50) DEFAULT 'view' CHECK (access_level IN ('view', 'report', 'admin')),
        is_primary BOOLEAN DEFAULT false,
        last_login TIMESTAMP,
        login_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_partner_user UNIQUE(partner_id, user_id)
      )
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_portal_partner ON partner_portal_access(partner_id);
    `);

        await queryRunner.query(`
      CREATE INDEX idx_partner_portal_user ON partner_portal_access(user_id);
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS partner_portal_access CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS partner_performance CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS partner_payouts CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS partner_commissions CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS partner_referrals CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS partner_contracts CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS partners CASCADE`);
    }
}
