# Paystack Configuration Testing Guide

## ✅ Configuration Verification

Your Paystack configuration has been set up. Here's how to test it:

## 🧪 Testing Steps

### 1. Start Backend Server

```bash
cd backend
npm run dev
```

**Expected output:**
- ✅ Backend listening on http://localhost:4000
- ✅ Database connected
- ✅ Wallet system initialized

**If you see errors:**
- Check that Paystack keys are correctly set in `backend/.env`
- Verify database connection
- Check for any missing environment variables

### 2. Start Frontend Server

```bash
cd frontend
npm run dev
```

**Expected output:**
- ✅ Vite dev server running on http://localhost:5173
- ✅ No console errors

**If you see errors:**
- Check that `VITE_PAYSTACK_PUBLIC_KEY` is set in `frontend/.env` or `frontend/.env.local`
- Restart dev server after adding environment variables

### 3. Test Payment Flow

1. **Login as Facility**
   - Go to http://localhost:5173
   - Login with facility credentials

2. **Navigate to Wallet Page**
   - Click "Wallet" in the sidebar
   - You should see your current balance in GHS (₵)

3. **Initiate Top-Up**
   - Enter amount (minimum ₵10.00)
   - Click "Pay with Paystack"
   - Paystack popup should open

4. **Test Payment**
   - Use Paystack test card: `4084084084084081`
   - CVV: Any 3 digits (e.g., `123`)
   - Expiry: Any future date (e.g., `12/25`)
   - Complete payment

5. **Verify Success**
   - Wallet balance should update
   - Transaction should appear in history
   - Top-up should show as "verified"

## 🔍 Troubleshooting

### Payment Popup Doesn't Open

**Possible causes:**
1. Paystack JS not loaded
   - Check browser console for errors
   - Verify `VITE_PAYSTACK_PUBLIC_KEY` is set
   - Check network tab for Paystack JS loading

2. Popup blocked
   - Check browser popup blocker settings
   - Allow popups for localhost

3. Public key invalid
   - Verify key starts with `pk_test_` or `pk_live_`
   - Check key is correct in `.env` file

**Solution:**
- Payment will fallback to redirect if popup fails
- Check that authorization URL is returned from backend

### Payment Not Verifying

**Possible causes:**
1. Webhook not configured
   - Webhook is optional - manual verification will work
   - Frontend polls and verifies automatically

2. Backend not receiving webhook
   - Check webhook URL in Paystack dashboard
   - Verify webhook secret matches
   - Check backend logs for webhook errors

**Solution:**
- Frontend automatically verifies payment on callback
- If webhook fails, frontend will poll and verify manually
- Check transaction history for status

### Currency Not Showing Correctly

**Check:**
1. Backend returns `currency: "GHS"` in wallet response
2. Database has correct currency (should be GHS)
3. Frontend displays ₵ symbol

**Solution:**
- Verify database: `SELECT currency FROM facility_wallets;`
- Should return `GHS`
- If not, update: `UPDATE facility_wallets SET currency = 'GHS';`

### Backend Errors

**Common errors:**

1. **"Paystack secret key not configured"**
   - Check `PAYSTACK_SECRET_KEY` in `backend/.env`
   - Restart backend after adding

2. **"Failed to initialize Paystack payment"**
   - Check Paystack secret key is valid
   - Verify network connectivity
   - Check Paystack API status

3. **"Invalid signature" (webhook)**
   - Check `PAYSTACK_WEBHOOK_SECRET` matches Paystack dashboard
   - Verify webhook URL is correct

## 📊 Test Cards (Paystack)

### Success
- **Card**: `4084084084084081`
- **CVV**: Any 3 digits
- **Expiry**: Any future date
- **Result**: Payment succeeds, wallet credited

### Decline
- **Card**: `5060666666666666666`
- **Result**: Payment declined, no wallet credit

### Insufficient Funds
- **Card**: `5060666666666666667`
- **Result**: Payment fails, no wallet credit

## 🔐 Security Checklist

- ✅ Paystack secret key stored in `.env` (not committed to git)
- ✅ Webhook secret configured
- ✅ Webhook URL uses HTTPS in production
- ✅ Public key only in frontend (safe to expose)
- ✅ Secret key only in backend (never exposed)

## 🚀 Production Checklist

Before going live:

1. **Switch to Live Keys**
   - Replace `sk_test_` with `sk_live_`
   - Replace `pk_test_` with `pk_live_`
   - Update webhook secret

2. **Configure Production Webhook**
   - Set webhook URL: `https://your-domain.com/paystack/webhook`
   - Enable HTTPS (required for webhooks)
   - Test webhook delivery

3. **Update Environment Variables**
   - Set `FRONTEND_URL` to production URL
   - Set `PAYSTACK_CALLBACK_URL` to production URL
   - Update all URLs to production

4. **Test End-to-End**
   - Test with real payment (small amount)
   - Verify webhook delivery
   - Check transaction recording
   - Verify wallet balance updates

5. **Monitor**
   - Set up error alerting
   - Monitor payment success rates
   - Track webhook delivery
   - Review transaction logs

## 📝 Next Steps

1. ✅ Test payment flow with test card
2. ✅ Verify wallet balance updates
3. ✅ Check transaction history
4. ✅ Test error scenarios
5. ✅ Configure production webhook (when ready)

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Payment popup opens
- ✅ Payment completes successfully
- ✅ Wallet balance updates immediately
- ✅ Transaction appears in history
- ✅ Top-up shows as "verified"

If all these work, your Paystack integration is successful! 🎊

