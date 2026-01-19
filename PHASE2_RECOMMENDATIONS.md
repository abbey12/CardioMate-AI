# Phase 2 Recommendations: Paystack Integration with Ghana Cedis

## ✅ Completed Backend Implementation

### Core Features Implemented
1. **Currency Migration**: All systems updated from USD to GHS (Ghana Cedis)
2. **Paystack Integration**: Full payment gateway integration
3. **Webhook Handling**: Automatic payment verification via webhooks
4. **Top-Up Management**: Complete top-up lifecycle management
5. **Database Schema**: New `topups` table for payment tracking
6. **Security**: Webhook signature verification, idempotent processing

## 📋 Frontend Implementation Required

### Priority 1: Paystack Payment Integration

#### 1. Install Paystack Inline JS
```bash
cd frontend
npm install @paystack/inline-js
```

#### 2. Update Wallet Page (`frontend/src/pages/facility/FacilityWallet.tsx`)

**Key Changes:**
- Replace manual top-up form with Paystack payment button
- Add Paystack inline payment handler
- Update currency display to GHS (₵)
- Add payment status tracking
- Show top-up history with Paystack references

**Implementation Steps:**
1. Import Paystack inline JS
2. Add payment initialization handler
3. Handle payment success/failure callbacks
4. Poll for payment status if webhook is delayed
5. Update UI to show payment in progress

#### 3. Update API Client (`frontend/src/lib/api.ts`)

Add new functions:
```typescript
export async function initializePaystackTopUp(
  token: string,
  amount: number,
  onTokenRefresh?: (newToken: string) => void
): Promise<{
  success: boolean;
  authorizationUrl: string;
  reference: string;
  topUpId: string;
}>;

export async function verifyPaystackTopUp(
  token: string,
  reference: string,
  onTokenRefresh?: (newToken: string) => void
): Promise<{
  success: boolean;
  topUp: TopUp;
  newBalance: number;
}>;

export async function getFacilityTopUps(
  token: string,
  options?: { limit?: number; offset?: number },
  onTokenRefresh?: (newToken: string) => void
): Promise<{ topUps: TopUp[]; total: number }>;
```

### Priority 2: Receipt Generation

#### Backend Receipt Service
Create `backend/src/services/receipt.ts`:
- Generate PDF receipts for successful top-ups
- Include: Facility info, amount, reference, date, transaction ID
- Use Puppeteer (already installed) for PDF generation

#### Frontend Receipt Download
- Add "Download Receipt" button for verified top-ups
- Generate receipt on-demand or store pre-generated

### Priority 3: Email Notifications (Optional)

#### Recommended Email Service
- **SendGrid** (recommended for Ghana)
- **AWS SES** (cost-effective)
- **Nodemailer** with SMTP

#### Email Templates Needed
1. **Top-up Success Email**
   - Confirmation of payment
   - Receipt attachment
   - Updated balance

2. **Top-up Failure Email**
   - Payment failed notification
   - Retry instructions

3. **Low Balance Alert**
   - When balance < ₵20
   - Reminder to top up

### Priority 4: Admin Wallet Management

#### Admin Dashboard Features
1. **View All Wallets**
   - List all facility wallets
   - Current balances
   - Total platform revenue

2. **Manual Adjustments**
   - Add/remove funds manually
   - Adjustment reasons
   - Audit trail

3. **Refund Processing**
   - Process refunds for failed analyses
   - Refund to wallet or original payment method

4. **Transaction Monitoring**
   - View all transactions
   - Filter by facility, date, type
   - Export reports

## 🎯 Recommended Pricing Strategy

### Current Pricing (GHS)
- **Standard Analysis**: ₵5.00
- **Image Analysis**: ₵10.00
- **Minimum Top-up**: ₵10.00

### Pricing Considerations
1. **Paystack Fees**: ~1.5% + ₵0.50 per transaction
   - Consider absorbing fees or passing to customer
   - Factor into pricing

2. **Volume Discounts** (Future)
   - 10% off for 100+ analyses/month
   - 20% off for 500+ analyses/month

3. **Subscription Plans** (Future)
   - Monthly plans with discounted rates
   - Annual plans with best value

## 🔒 Security Best Practices

### Implemented
- ✅ Webhook signature verification
- ✅ Idempotent payment processing
- ✅ Atomic database transactions
- ✅ Payment reference tracking

### Additional Recommendations
1. **Rate Limiting**
   - Limit top-up attempts per hour
   - Prevent abuse

2. **Fraud Detection**
   - Monitor unusual payment patterns
   - Flag suspicious transactions

3. **Audit Logging**
   - Log all wallet operations
   - Track admin actions
   - Maintain audit trail

4. **PCI Compliance**
   - Never store card details
   - Use Paystack's secure payment forms
   - Follow Paystack security guidelines

## 📊 Analytics & Reporting

### Recommended Metrics
1. **Revenue Metrics**
   - Total revenue
   - Revenue by facility
   - Revenue trends (daily/weekly/monthly)

2. **Payment Metrics**
   - Success rate
   - Average top-up amount
   - Payment method distribution

3. **Usage Metrics**
   - Analyses per facility
   - Average spend per facility
   - Top customers

## 🚀 Deployment Checklist

### Pre-Production
- [ ] Update Paystack keys to live keys
- [ ] Configure production webhook URL
- [ ] Test payment flow end-to-end
- [ ] Verify webhook handling
- [ ] Test error scenarios
- [ ] Load testing
- [ ] Security audit

### Production
- [ ] SSL certificate (HTTPS required for webhooks)
- [ ] Webhook URL accessible from Paystack
- [ ] Monitor webhook delivery
- [ ] Set up error alerting
- [ ] Backup database regularly
- [ ] Monitor payment success rates

## 📱 Mobile Money Integration

### Paystack Mobile Money Support
Paystack supports:
- MTN Mobile Money
- Vodafone Cash
- AirtelTigo Money

**No additional integration needed** - Paystack handles this automatically when user selects mobile money option.

## 💡 Future Enhancements

### Phase 3 Features
1. **Auto Top-up**
   - Automatic top-up when balance low
   - Set threshold and amount

2. **Promotional Codes**
   - Discount codes for top-ups
   - Referral bonuses

3. **Bulk Pricing**
   - Volume discounts
   - Enterprise pricing

4. **Multi-Currency** (if expanding)
   - Support other currencies
   - Currency conversion

5. **Invoice Generation**
   - Generate invoices for top-ups
   - Tax handling
   - Accounting integration

## 🔧 Testing Guide

### Test Cards (Paystack)
- **Success**: 4084084084084081
- **Decline**: 5060666666666666666
- **Insufficient Funds**: 5060666666666666667

### Test Mobile Money
- Use Paystack test mode
- Test with test phone numbers

### Webhook Testing
1. Use Paystack webhook testing tool
2. Test with ngrok for local development
3. Verify signature validation
4. Test duplicate webhook handling

## 📞 Support & Documentation

### Paystack Resources
- Documentation: https://paystack.com/docs
- Support: support@paystack.com
- Status: https://status.paystack.com

### Implementation Notes
- All amounts in GHS (except Paystack API which uses pesewas)
- 1 GHS = 100 pesewas
- Minimum top-up: ₵10.00 (1000 pesewas)
- Webhook must be HTTPS in production

## ✅ Next Immediate Steps

1. **Update Frontend Wallet Page** (2-3 hours)
   - Integrate Paystack inline payment
   - Update currency display
   - Add payment status tracking

2. **Test Payment Flow** (1-2 hours)
   - Test with Paystack test keys
   - Verify webhook handling
   - Test error scenarios

3. **Configure Production** (1 hour)
   - Get Paystack live keys
   - Set up webhook URL
   - Update environment variables

4. **Receipt Generation** (2-3 hours)
   - Create PDF receipt template
   - Generate receipts on successful top-up
   - Add download functionality

5. **Admin Features** (4-6 hours)
   - Create admin wallet dashboard
   - Add manual adjustment features
   - Add transaction monitoring

## 🎉 Summary

**Backend is 100% complete** and ready for frontend integration. The system supports:
- ✅ Paystack payment processing
- ✅ Automatic webhook verification
- ✅ Ghana Cedis (GHS) currency
- ✅ Secure payment handling
- ✅ Complete transaction tracking

**Frontend integration** is the next critical step to complete Phase 2.

