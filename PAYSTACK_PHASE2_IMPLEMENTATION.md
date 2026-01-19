# Phase 2 Implementation: Paystack Integration with Ghana Cedis (GHS)

## Overview
This document outlines the Phase 2 implementation of the pay-as-you-go system using Paystack as the payment gateway and Ghana Cedis (GHS) as the currency.

## Key Changes

### 1. Currency Update
- **From**: USD (US Dollars)
- **To**: GHS (Ghana Cedis)
- **Conversion**: 1 GHS = 100 pesewas (Paystack uses pesewas for amounts)

### 2. Payment Gateway
- **Provider**: Paystack
- **Features**:
  - Card payments
  - Mobile Money (MTN, Vodafone, AirtelTigo)
  - Bank transfers
  - USSD payments

### 3. Pricing (Recommended)
- **Standard Analysis (CSV/JSON)**: ₵5.00 GHS
- **Image Analysis**: ₵10.00 GHS
- **Minimum Top-up**: ₵10.00 GHS

## Implementation Components

### Backend
1. **Paystack Service** (`backend/src/services/paystack.ts`)
   - Initialize transactions
   - Verify transactions
   - Handle webhooks

2. **Top-up Endpoints**
   - `POST /facility/wallet/topup/initialize` - Initialize Paystack payment
   - `POST /facility/wallet/topup/verify` - Verify payment (manual)
   - `POST /paystack/webhook` - Webhook handler (automatic)

3. **Receipt Generation**
   - PDF receipts for successful top-ups
   - Email receipts (optional)

4. **Admin Wallet Management**
   - View all facility wallets
   - Manual adjustments
   - Refund processing

### Frontend
1. **Paystack Payment Integration**
   - Inline payment form
   - Payment status tracking
   - Success/failure handling

2. **Enhanced Wallet Page**
   - Paystack payment button
   - Payment status display
   - Receipt download

## Security Considerations
- Webhook signature verification
- Idempotency for payment verification
- Secure API key storage
- Transaction logging

## Testing
- Use Paystack test keys for development
- Test with Paystack test cards
- Verify webhook handling

