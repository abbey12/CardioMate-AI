# Wallet System Database Migration

## Overview
The pay-as-you-go wallet system requires new database tables. Run this migration to add the wallet functionality.

## Migration Steps

### 1. Connect to your PostgreSQL database

```bash
psql $DATABASE_URL
```

Or if using localhost:
```bash
psql -h localhost -U your_username -d your_database_name
```

### 2. Run the migration SQL

Copy and paste the following SQL into your psql session:

```sql
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
WHERE id NOT IN (SELECT facility_id FROM facility_wallets)
ON CONFLICT (facility_id) DO NOTHING;
```

### 3. Verify the migration

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('facility_wallets', 'wallet_transactions', 'pricing_config');

-- Check pricing is set
SELECT * FROM pricing_config;

-- Check wallets created
SELECT f.name, f.email, w.balance, w.currency 
FROM facilities f 
LEFT JOIN facility_wallets w ON f.id = w.facility_id;
```

### 4. Restart the backend server

After running the migration, restart your backend server:

```bash
cd backend
npm run dev
```

The backend will automatically initialize default pricing on startup if it doesn't exist.

## Troubleshooting

### Error: relation "facilities" does not exist
- Make sure you've run the initial database schema first (from `DATABASE_SETUP.md`)

### Error: duplicate key value violates unique constraint
- This is normal if wallets already exist. The migration uses `ON CONFLICT DO NOTHING` to handle this.

### Error: function gen_random_uuid() does not exist
- Your PostgreSQL version might be too old. Use `uuid_generate_v4()` instead:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  ```
  Then replace `gen_random_uuid()` with `uuid_generate_v4()` in the migration.

## Next Steps

After migration:
1. Facilities can view their wallet balance (starts at $0.00)
2. Facilities can top up manually via the Wallet page
3. Each ECG analysis will automatically deduct from the wallet
4. Transaction history will be recorded

