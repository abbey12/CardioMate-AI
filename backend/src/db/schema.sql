-- Database Schema for Multi-Tenant ECG Platform
-- Run this to set up your PostgreSQL database

-- Facilities (tenants)
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  country VARCHAR(100),
  facility_type VARCHAR(100),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(30),
  website VARCHAR(255),
  signup_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin users (platform administrators)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ECG Reports (facility-scoped)
CREATE TABLE IF NOT EXISTS ecg_reports (
  id VARCHAR(255) PRIMARY KEY,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE NOT NULL,
  patient_info JSONB,
  measurements JSONB NOT NULL,
  abnormalities TEXT[] DEFAULT '{}',
  clinical_impression TEXT NOT NULL,
  recommendations TEXT[],
  decision_explanations JSONB,
  source_format VARCHAR(50) NOT NULL,
  source_filename VARCHAR(255),
  signal_preview JSONB,
  image_preview JSONB,
  preprocess JSONB NOT NULL,
  raw_ai_text TEXT,
  model VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Facility Wallets (Pay-as-you-go system)
CREATE TABLE IF NOT EXISTS facility_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'GHS',
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
  currency VARCHAR(3) DEFAULT 'GHS',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Top-ups (Paystack payment records)
CREATE TABLE IF NOT EXISTS topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  amount_requested_cedis DECIMAL(10, 2) NOT NULL,
  amount_received_cedis DECIMAL(10, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'failed', 'cancelled'
  paystack_reference VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP
);

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  user_type VARCHAR(20) NOT NULL, -- 'admin' or 'facility'
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ecg_reports_facility_id ON ecg_reports(facility_id);
CREATE INDEX IF NOT EXISTS idx_ecg_reports_created_at ON ecg_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facilities_email ON facilities(email);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_facility ON wallet_transactions(facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_topups_facility ON topups(facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topups_reference ON topups(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_topups_status ON topups(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email, user_type);

-- Row-Level Security (optional, for additional protection)
-- ALTER TABLE ecg_reports ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY facility_isolation ON ecg_reports
--   FOR ALL
--   USING (facility_id = current_setting('app.current_facility_id')::UUID);

