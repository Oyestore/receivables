-- Module 14: Globalization & Localization - Database Migration
-- Create currency_exchange_rates, localization_settings, and translations tables

-- Drop tables if exist (for development)
DROP TABLE IF EXISTS translations CASCADE;
DROP TABLE IF EXISTS localization_settings CASCADE;
DROP TABLE IF EXISTS currency_exchange_rates CASCADE;

-- Create currency_exchange_rates table
CREATE TABLE currency_exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15,6) NOT NULL,
    rate_date DATE NOT NULL,
    source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'api', 'bank')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create localization_settings table
CREATE TABLE localization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    language_code VARCHAR(10) DEFAULT 'en_US',
    country_code VARCHAR(2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(20) DEFAULT 'HH:mm:ss',
    number_format JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create translations table
CREATE TABLE translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    language_code VARCHAR(10) NOT NULL,
    translation_key VARCHAR(200) NOT NULL,
    translated_text TEXT NOT NULL,
    context TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_exchange_rates_tenant ON currency_exchange_rates(tenant_id);
CREATE INDEX idx_exchange_rates_from ON currency_exchange_rates(from_currency);
CREATE INDEX idx_exchange_rates_to ON currency_exchange_rates(to_currency);
CREATE INDEX idx_exchange_rates_date ON currency_exchange_rates(rate_date DESC);
CREATE INDEX idx_exchange_rates_active ON currency_exchange_rates(is_active);

CREATE INDEX idx_localization_tenant ON localization_settings(tenant_id);
CREATE INDEX idx_localization_language ON localization_settings(language_code);

CREATE INDEX idx_translations_language ON translations(language_code);
CREATE INDEX idx_translations_key ON translations(translation_key);
CREATE UNIQUE INDEX idx_translations_unique ON translations(language_code, translation_key);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_exchange_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_exchange_rates_updated_at
    BEFORE UPDATE ON currency_exchange_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_exchange_rates_updated_at();

CREATE OR REPLACE FUNCTION update_localization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_localization_updated_at
    BEFORE UPDATE ON localization_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_localization_updated_at();

CREATE OR REPLACE FUNCTION update_translations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_translations_updated_at
    BEFORE UPDATE ON translations
    FOR EACH ROW
    EXECUTE FUNCTION update_translations_updated_at();

-- Insert sample exchange rates
INSERT INTO currency_exchange_rates (tenant_id, from_currency, to_currency, rate, rate_date, source) VALUES
    ('00000000-0000-0000-0000-000000000001', 'USD', 'EUR', 0.92, CURRENT_DATE, 'api'),
    ('00000000-0000-0000-0000-000000000001', 'USD', 'GBP', 0.79, CURRENT_DATE, 'api'),
    ('00000000-0000-0000-0000-000000000001', 'USD', 'INR', 83.25, CURRENT_DATE, 'api'),
    ('00000000-0000-0000-0000-000000000001', 'USD', 'JPY', 149.50, CURRENT_DATE, 'api');

-- Insert sample localization settings
INSERT INTO localization_settings (tenant_id, language_code, country_code, currency_code, timezone) VALUES
    ('00000000-0000-0000-0000-000000000001', 'en_US', 'US', 'USD', 'America/New_York');

-- Insert sample translations
INSERT INTO translations (language_code, translation_key, translated_text, is_verified) VALUES
    ('en_US', 'dashboard.welcome', 'Welcome', true),
    ('en_US', 'invoice.title', 'Invoice', true),
    ('hi_IN', 'dashboard.welcome', 'स्वागत है', true),
    ('hi_IN', 'invoice.title', 'चालान', true);

-- Verification query
SELECT 
    (SELECT COUNT(*) FROM currency_exchange_rates) as exchange_rates,
    (SELECT COUNT(*) FROM localization_settings) as localization_settings,
    (SELECT COUNT(*) FROM translations) as translations;
