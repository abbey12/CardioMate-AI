-- Referral System and Signup Bonus Migration
-- Run this to add referral system and signup bonus functionality

-- Add referral fields to facilities table
ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by_facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL;

-- Create index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_facilities_referral_code ON facilities(referral_code);
CREATE INDEX IF NOT EXISTS idx_facilities_referred_by ON facilities(referred_by_facility_id);

-- Referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referring_facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  referred_facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  referral_bonus_amount DECIMAL(10, 2) NOT NULL,
  signup_bonus_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referred_facility_id) -- A facility can only be referred once
);

-- Platform settings table (for signup bonus and referral bonus amounts)
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES admins(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referring ON referrals(referring_facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_facility_id);
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(setting_key);

-- Initialize default platform settings
INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES 
  ('signup_bonus_amount', '{"amount": 50.00, "currency": "GHS", "enabled": true}', 'Default signup bonus amount for new facilities'),
  ('referral_bonus_amount', '{"amount": 25.00, "currency": "GHS", "enabled": true}', 'Bonus amount for referring facility when a new facility signs up using their referral code')
ON CONFLICT (setting_key) DO NOTHING;

-- Generate referral codes for existing facilities (if any)
-- This will be handled by the application on first access

