# Quick Start: Testing Paystack Integration

## ✅ Configuration Status

Your Paystack configuration is complete! Here's what's set up:

### Backend ✅
- ✅ PAYSTACK_SECRET_KEY: Configured
- ✅ PAYSTACK_PUBLIC_KEY: Configured
- ✅ PAYSTACK_WEBHOOK_SECRET: Configured

### Frontend ✅
- ✅ VITE_PAYSTACK_PUBLIC_KEY: Configured (auto-created from backend)

## 🚀 Quick Test

### 1. Start Backend
```bash
cd backend
npm run dev
```

You should see:
```
✅ Backend listening on http://localhost:4000
📊 Database connected
💰 Wallet system initialized
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### 3. Test Payment Flow

1. **Login** as a facility user
2. **Navigate** to Wallet page (sidebar → Wallet)
3. **Enter amount** (minimum ₵10.00)
4. **Click** "Pay with Paystack"
5. **Use test card**:
   - Card: `4084084084084081`
   - CVV: `123` (any 3 digits)
   - Expiry: `12/25` (any future date)
6. **Complete payment**
7. **Verify** wallet balance updates

## 🎯 Expected Behavior

### Payment Popup
- Paystack payment popup should open
- If popup is blocked, it will redirect to Paystack page
- Payment form should load correctly

### After Payment
- ✅ Wallet balance updates immediately
- ✅ Transaction appears in history
- ✅ Top-up shows as "verified"
- ✅ Success message displayed

## 🐛 Troubleshooting

### Payment Popup Doesn't Open
- Check browser console for errors
- Verify `VITE_PAYSTACK_PUBLIC_KEY` is in `frontend/.env`
- Restart frontend dev server after adding .env
- Check popup blocker settings

### Payment Not Verifying
- Check backend logs for errors
- Verify webhook is configured (optional)
- Frontend will poll and verify automatically
- Check transaction history for status

### Currency Issues
- Verify database has `currency = 'GHS'`
- Check backend returns `currency: "GHS"`
- Clear browser cache

## 📊 Test Cards

| Card Number | Result |
|------------|--------|
| `4084084084084081` | ✅ Success |
| `5060666666666666666` | ❌ Decline |
| `5060666666666666667` | ❌ Insufficient Funds |

## 🔍 Verification Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can login as facility
- [ ] Wallet page loads
- [ ] Balance shows in GHS (₵)
- [ ] Payment popup opens
- [ ] Payment completes successfully
- [ ] Wallet balance updates
- [ ] Transaction appears in history

## 🎉 Success!

If all checks pass, your Paystack integration is working correctly!

For detailed testing instructions, see `PAYSTACK_TESTING_GUIDE.md`

