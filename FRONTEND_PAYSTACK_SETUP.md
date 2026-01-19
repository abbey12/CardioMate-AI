# Frontend Paystack Integration Setup

## ✅ Completed

1. **Paystack Inline JS Library** - Installed `@paystack/inline-js`
2. **API Functions** - Added Paystack API functions to `api.ts`
3. **Wallet Page** - Updated with Paystack payment integration
4. **Currency Display** - Updated to show GHS (₵) instead of USD ($)
5. **Payment Status Tracking** - Added payment progress indicators
6. **Top-Up History** - Display recent Paystack top-ups

## 🔧 Configuration Required

### 1. Environment Variables

Add to `frontend/.env` (or `frontend/.env.local`):

```env
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
```

**Note**: Get your Paystack public key from:
- Paystack Dashboard → Settings → API Keys & Webhooks
- Use test key for development: `pk_test_...`
- Use live key for production: `pk_live_...`

### 2. Paystack Public Key

The frontend needs the Paystack public key to initialize payments. You can:

**Option A: Environment Variable (Recommended)**
- Add `VITE_PAYSTACK_PUBLIC_KEY` to `.env`
- Restart dev server after adding

**Option B: Backend Configuration**
- Backend can return public key in pricing/wallet endpoint
- Frontend fetches it from backend

**Option C: Hardcode for Testing**
- Temporarily hardcode test key in `FacilityWallet.tsx`
- **NOT recommended for production**

## 🎯 Payment Flow

1. **User enters amount** (minimum ₵10.00)
2. **Clicks "Pay with Paystack"**
3. **Backend initializes payment** → Returns authorization URL and reference
4. **Frontend opens Paystack popup** (or redirects if JS not loaded)
5. **User completes payment** via Paystack
6. **Paystack callback** → Frontend verifies payment
7. **Webhook** → Backend automatically verifies and credits wallet
8. **Frontend polls** → Updates balance when payment verified

## 🔄 Payment Status Handling

The wallet page automatically:
- Shows "Payment in progress" indicator
- Polls wallet balance every 3 seconds during payment
- Verifies payment on callback
- Falls back to polling if verification fails
- Updates UI when payment succeeds

## 📱 Mobile Money Support

Paystack automatically supports:
- MTN Mobile Money
- Vodafone Cash
- AirtelTigo Money
- Bank transfers
- Card payments

No additional frontend code needed - Paystack handles payment method selection.

## 🧪 Testing

### Test Cards (Paystack)
- **Success**: `4084084084084081`
- **Decline**: `5060666666666666666`
- **Insufficient Funds**: `5060666666666666667`

### Test Flow
1. Enter amount (e.g., ₵10.00)
2. Click "Pay with Paystack"
3. Use test card: `4084084084084081`
4. CVV: Any 3 digits
5. Expiry: Any future date
6. Verify wallet balance updates

## 🐛 Troubleshooting

### Payment popup doesn't open
- Check Paystack JS is loaded (check browser console)
- Verify `VITE_PAYSTACK_PUBLIC_KEY` is set
- Check browser popup blocker
- Fallback: Payment redirects to Paystack page

### Payment not verifying
- Check webhook is configured in Paystack dashboard
- Verify webhook URL is accessible
- Check backend logs for webhook errors
- Frontend will poll and verify manually if needed

### Currency not showing correctly
- Verify backend returns `currency: "GHS"` in wallet response
- Check `WalletBalance` component uses currency from wallet
- All currency displays should use `currencySymbol` variable

## 📝 Next Steps

1. **Set Paystack Public Key** in environment variables
2. **Test payment flow** with test cards
3. **Configure webhook** in Paystack dashboard
4. **Test webhook** delivery
5. **Update low balance threshold** (currently ₵20, adjust as needed)

## 🎉 Features Implemented

- ✅ Paystack payment initialization
- ✅ Inline payment popup
- ✅ Payment status tracking
- ✅ Automatic balance polling during payment
- ✅ Payment verification (manual + webhook)
- ✅ Top-up history display
- ✅ Currency display (GHS with ₵ symbol)
- ✅ Error handling
- ✅ Payment callback handling
- ✅ Fallback to redirect if JS not loaded

