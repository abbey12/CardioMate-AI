# Pay-As-You-Go AI Analysis System - Recommendations

## Overview
Implement a wallet-based payment system where facilities top up funds and each AI analysis deducts a fixed amount from their balance.

## Core Requirements

### 1. **Wallet System**
- Each facility has a wallet balance
- Balance stored in database (decimal/float for precision)
- Real-time balance updates
- Balance cannot go negative (prevent analysis if insufficient funds)

### 2. **Top-Up System**
- Facilities can add funds to their wallet
- Multiple payment methods:
  - Credit/Debit Card (Stripe, PayPal)
  - Bank Transfer
  - Manual Top-Up (Admin can add funds)
- Minimum top-up amount
- Maximum top-up amount (optional)
- Top-up confirmation and receipts

### 3. **Pricing Model**
- Fixed price per AI analysis (e.g., $0.50, $1.00, $2.00)
- Different pricing tiers (optional):
  - Basic Analysis: Lower price
  - Premium Analysis: Higher price with more features
- Pricing configurable by admin
- Display pricing before analysis

### 4. **Deduction System**
- Automatic deduction when AI analysis is performed
- Transaction record for each deduction
- Balance check before analysis
- Error handling for insufficient funds
- Refund mechanism (optional, for failed analyses)

### 5. **Transaction History**
- Complete transaction log:
  - Top-ups (credits)
  - AI Analysis deductions (debits)
  - Refunds (if applicable)
  - Admin adjustments
- Filterable by date, type, amount
- Export to CSV/PDF
- Transaction IDs for reference

## Database Schema

### New Tables Needed:

```sql
-- Facility Wallet
CREATE TABLE facility_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(facility_id)
);

-- Transactions
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'topup', 'deduction', 'refund', 'adjustment'
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  description TEXT,
  reference_id VARCHAR(255), -- Payment ID, Report ID, etc.
  status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
  metadata JSONB, -- Additional data (payment method, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_facility_transactions (facility_id, created_at DESC),
  INDEX idx_transaction_type (type, created_at DESC)
);

-- Pricing Configuration
CREATE TABLE pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type VARCHAR(50) NOT NULL, -- 'standard', 'premium', 'image', 'signal'
  price_per_analysis DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Backend Implementation

### 1. **Database Functions**

**Wallet Management:**
- `getFacilityWallet(facilityId)` - Get current balance
- `updateWalletBalance(facilityId, amount, type)` - Update balance atomically
- `checkSufficientBalance(facilityId, amount)` - Check if balance is sufficient
- `deductForAnalysis(facilityId, amount, reportId)` - Deduct and create transaction
- `addTopUp(facilityId, amount, paymentId)` - Add funds and create transaction

**Transaction Management:**
- `getTransactions(facilityId, filters)` - Get transaction history
- `createTransaction(data)` - Create transaction record
- `getTransactionById(id)` - Get specific transaction

**Pricing:**
- `getPricingConfig()` - Get current pricing
- `updatePricingConfig(type, price)` - Update pricing (admin only)
- `calculateAnalysisCost(format, type)` - Calculate cost for analysis

### 2. **API Endpoints**

**Wallet Endpoints:**
```
GET  /facility/wallet                    - Get wallet balance
GET  /facility/wallet/transactions      - Get transaction history
POST /facility/wallet/topup             - Initiate top-up
GET  /facility/wallet/topup/:id/status  - Check top-up status
```

**Pricing Endpoints:**
```
GET  /facility/pricing                  - Get current pricing
GET  /admin/pricing                     - Get pricing (admin)
PUT  /admin/pricing                     - Update pricing (admin)
```

**Modified Endpoints:**
```
POST /facility/reports/upload           - Check balance before analysis
                                         - Deduct after successful analysis
                                         - Return error if insufficient funds
```

### 3. **Payment Integration**

**Payment Providers:**
1. **Stripe** (Recommended)
   - Credit/Debit cards
   - International support
   - Webhooks for payment confirmation
   - PCI compliance handled by Stripe

2. **PayPal**
   - Alternative payment method
   - Good for international users

3. **Manual Top-Up**
   - Admin can manually add funds
   - For bank transfers or other methods
   - Requires admin approval

**Payment Flow:**
1. User initiates top-up
2. Create pending transaction
3. Redirect to payment provider
4. Payment provider callback/webhook
5. Update transaction status
6. Update wallet balance
7. Send confirmation email

### 4. **Analysis Deduction Flow**

```
1. User uploads ECG
2. Check wallet balance
3. If insufficient: Return error with top-up prompt
4. If sufficient:
   - Lock balance (optional, for concurrent requests)
   - Process AI analysis
   - On success: Deduct amount and create transaction
   - On failure: Don't deduct (or refund if already deducted)
   - Return report
```

## Frontend Implementation

### 1. **Wallet Dashboard Page**
- Current balance display (prominent)
- Quick top-up button
- Recent transactions table
- Balance history chart (optional)
- Low balance warning (< $10 or configurable)

### 2. **Top-Up Page**
- Top-up amount input
- Payment method selection
- Pricing display
- Top-up history
- Payment status tracking

### 3. **Transaction History Page**
- Filterable transaction table
- Export functionality
- Transaction details modal
- Receipt download

### 4. **Balance Display**
- Show balance in:
  - Dashboard header
  - NavBar (optional)
  - Upload page (before analysis)
  - Settings page

### 5. **Upload Page Enhancements**
- Show current balance
- Show analysis cost
- Warning if insufficient balance
- Top-up prompt if balance low
- Balance check before upload

### 6. **Admin Features**
- View all facility wallets
- Manual top-up/adjustment
- Pricing configuration
- Transaction monitoring
- Refund processing

## UI/UX Design

### Wallet Components:

1. **Balance Card**
   - Large balance display
   - Currency indicator
   - Last updated timestamp
   - Quick top-up button

2. **Top-Up Modal/Page**
   - Amount input with presets ($10, $25, $50, $100, Custom)
   - Payment method selection
   - Terms and conditions
   - Security badges

3. **Transaction Table**
   - Date, Type, Amount, Balance After, Status
   - Color-coded (green for credits, red for debits)
   - Expandable rows for details
   - Receipt download

4. **Low Balance Warning**
   - Banner when balance < threshold
   - Inline warning on upload page
   - Email notification (optional)

5. **Pricing Display**
   - Clear pricing per analysis
   - Estimated cost calculator
   - Bulk analysis pricing (if applicable)

## Security & Compliance

### 1. **Security Measures**
- Balance updates must be atomic (database transactions)
- Prevent race conditions (locking mechanism)
- Validate all transactions server-side
- Secure payment processing (PCI compliance)
- Audit trail for all balance changes

### 2. **Fraud Prevention**
- Rate limiting on top-ups
- Maximum top-up per day
- Transaction monitoring
- Suspicious activity alerts
- Manual review for large transactions

### 3. **Data Protection**
- Encrypt sensitive payment data
- Secure storage of payment IDs
- GDPR compliance for transaction data
- Data retention policies

## Pricing Strategy Recommendations

### Suggested Pricing:
- **Standard Analysis (CSV/JSON)**: $0.50 - $1.00 per analysis
- **Image Analysis**: $1.00 - $2.00 per analysis (more complex)
- **Bulk Discount**: 10-20% off for 100+ analyses/month

### Pricing Factors:
- Processing complexity (image vs signal)
- Response time (standard vs priority)
- Report features (basic vs detailed)

## Implementation Phases

### Phase 1 (MVP):
1. Database schema (wallet, transactions)
2. Basic wallet balance display
3. Manual top-up (admin only)
4. Automatic deduction on analysis
5. Transaction history

### Phase 2:
1. Payment gateway integration (Stripe)
2. Top-up page with payment
3. Balance warnings
4. Receipt generation
5. Admin wallet management

### Phase 3:
1. Pricing configuration UI
2. Advanced transaction filtering
3. Balance analytics
4. Email notifications
5. Refund system

### Phase 4:
1. Multiple payment methods
2. Subscription options (optional)
3. Bulk pricing
4. Promotional codes
5. Invoice generation

## Technical Considerations

### 1. **Database Transactions**
- Use database transactions for balance updates
- Prevent double-deduction
- Handle concurrent requests

### 2. **Payment Webhooks**
- Handle payment confirmations asynchronously
- Retry failed webhook processing
- Idempotency keys for webhooks

### 3. **Error Handling**
- Insufficient balance errors
- Payment processing errors
- Network failures during payment
- Failed analysis refunds

### 4. **Performance**
- Cache wallet balance (with invalidation)
- Optimize transaction queries
- Index transaction table properly

### 5. **Monitoring**
- Track top-up success rates
- Monitor average balance
- Alert on low balances
- Track analysis costs

## User Experience Flow

### Top-Up Flow:
1. User clicks "Top Up" button
2. Selects amount or enters custom
3. Chooses payment method
4. Redirected to payment provider
5. Completes payment
6. Returns to platform
7. Balance updated
8. Confirmation shown

### Analysis Flow:
1. User uploads ECG
2. System checks balance
3. If sufficient:
   - Shows "Processing..." with cost
   - Performs analysis
   - Deducts amount
   - Shows updated balance
4. If insufficient:
   - Shows error message
   - Prompts to top up
   - Redirects to top-up page

## Admin Features

### Admin Dashboard:
- View all facility wallets
- Total platform revenue
- Top-up statistics
- Analysis usage statistics
- Pricing management
- Manual adjustments
- Refund processing

## Reporting & Analytics

### Metrics to Track:
- Total revenue
- Average top-up amount
- Analysis usage per facility
- Low balance facilities
- Payment success rate
- Refund rate
- Revenue trends

## Legal & Compliance

### 1. **Terms of Service**
- Payment terms
- Refund policy
- Service usage terms
- Liability disclaimers

### 2. **Billing**
- Invoice generation
- Tax handling (if applicable)
- Receipt generation
- Accounting integration

### 3. **Regulations**
- PCI DSS compliance (if handling cards directly)
- GDPR compliance
- Regional payment regulations

## Recommended Tech Stack

### Payment Processing:
- **Stripe** (Primary) - Most popular, well-documented
- **PayPal** (Secondary) - Alternative option
- **Stripe Elements** - For secure card input

### Backend:
- Database transactions for atomicity
- Queue system for payment webhooks (optional)
- Background jobs for notifications

### Frontend:
- Payment form components
- Balance display components
- Transaction history components
- Toast notifications for balance updates

## Cost Considerations

### Development:
- Payment gateway integration: 2-3 days
- Wallet system: 3-4 days
- Transaction system: 2-3 days
- UI components: 2-3 days
- Testing: 2-3 days
**Total: ~2 weeks**

### Ongoing Costs:
- Payment gateway fees (2.9% + $0.30 per transaction typical)
- Infrastructure (minimal)
- Support overhead

## Success Metrics

### KPIs:
- Top-up conversion rate
- Average top-up amount
- Analysis usage per facility
- Payment success rate
- Customer retention
- Revenue per facility

## Future Enhancements

1. **Subscription Plans**: Monthly/annual plans with discounts
2. **Credit System**: Give credits for referrals
3. **Promotional Codes**: Discount codes for top-ups
4. **Bulk Pricing**: Volume discounts
5. **Enterprise Plans**: Custom pricing for large facilities
6. **Auto Top-Up**: Automatic top-up when balance low
7. **Multi-Currency**: Support for different currencies
8. **Invoice System**: Generate invoices for top-ups

