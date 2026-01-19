-- Country-Specific Pricing Migration
-- Run this to add country-specific pricing functionality

-- Country Pricing Configuration
CREATE TABLE IF NOT EXISTS country_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country VARCHAR(100) NOT NULL,
  analysis_type VARCHAR(50) NOT NULL, -- 'standard', 'image'
  price_per_analysis DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GHS',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(country, analysis_type, is_active) -- Only one active pricing per country/type
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_country_pricing_country ON country_pricing(country);
CREATE INDEX IF NOT EXISTS idx_country_pricing_active ON country_pricing(is_active, country, analysis_type);
CREATE INDEX IF NOT EXISTS idx_country_pricing_type ON country_pricing(analysis_type, is_active);

-- Initialize default pricing for Ghana (if not exists)
INSERT INTO country_pricing (country, analysis_type, price_per_analysis, currency, is_active)
VALUES 
  ('Ghana', 'standard', 10.00, 'GHS', true),
  ('Ghana', 'image', 16.00, 'GHS', true)
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE country_pricing IS 'Country-specific pricing configuration for ECG analysis';
COMMENT ON COLUMN country_pricing.country IS 'Country name (must match facility.country)';
COMMENT ON COLUMN country_pricing.analysis_type IS 'Type of analysis: standard (CSV/JSON) or image';
COMMENT ON COLUMN country_pricing.price_per_analysis IS 'Price per analysis in the specified currency';
COMMENT ON COLUMN country_pricing.is_active IS 'Only one active pricing per country/type combination';

