-- Wallet System Migration
-- Run this to add wallet functionality to your database

-- Facility Wallets (Pay-as-you-go system)
CREATE TABLE IF NOT EXISTS facility_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(facility_id)
);

-- Wallet Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'topup', 'deduction', 'refund', 'adjustment'
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  description TEXT,
  reference_id VARCHAR(255), -- Payment ID, Report ID, etc.
  status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
  metadata JSONB, -- Additional data (payment method, analysis type, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pricing Configuration
CREATE TABLE IF NOT EXISTS pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type VARCHAR(50) NOT NULL, -- 'standard', 'image'
  price_per_analysis DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_facility ON wallet_transactions(facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference_id);

-- Initialize default pricing
INSERT INTO pricing_config (analysis_type, price_per_analysis, currency, is_active)
VALUES 
  ('standard', 1.00, 'USD', true),
  ('image', 2.00, 'USD', true)
ON CONFLICT DO NOTHING;

-- Create wallets for existing facilities (if any)
INSERT INTO facility_wallets (facility_id, balance, currency)
SELECT id, 0.00, 'USD'
FROM facilities
WHERE id NOT IN (SELECT facility_id FROM facility_wallets WHERE facility_id IS NOT NULL)
ON CONFLICT (facility_id) DO NOTHING;

