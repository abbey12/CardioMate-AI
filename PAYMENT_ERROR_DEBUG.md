# Payment Initialization Error Debug Guide

## Issue
Getting 500 Internal Server Error when calling `/facility/wallet/topup/initialize`

## Enhanced Error Handling Added

I've added better error logging to help identify the issue:

1. **Enhanced error logging in route handler**
   - Logs full error stack
   - Logs error message
   - Includes stack trace in development mode

2. **Enhanced Paystack API error logging**
   - Logs HTTP status
   - Logs response data
   - Logs error details

3. **Response validation**
   - Validates Paystack response structure
   - Checks for required fields

## How to Debug

### 1. Check Backend Console
When you try to initialize a payment, check the backend console for:
- Error messages
- Error stack traces
- Paystack API responses

### 2. Check Browser Network Tab
- Look at the request to `/facility/wallet/topup/initialize`
- Check the response body for error details
- Verify request payload

### 3. Common Issues

#### Issue: Facility email missing
**Error**: "Facility email is required for payment"
**Fix**: Ensure facility has email in database

#### Issue: Paystack API error
**Error**: Paystack API error message
**Check**: 
- Secret key is correct
- Network connectivity
- Paystack API status

#### Issue: Invalid response structure
**Error**: "Invalid response from Paystack API"
**Check**: Paystack API response format

#### Issue: Database error
**Error**: Database-related error
**Check**: 
- Database connection
- `topups` table exists
- Database permissions

## Next Steps

1. **Restart backend** to pick up changes:
   ```bash
   cd backend
   npm run dev
   ```

2. **Try payment again** and check:
   - Backend console output
   - Browser network tab response
   - Error message details

3. **Share error details**:
   - Backend console error
   - Network tab response
   - Any specific error message

## Expected Behavior

When working correctly:
1. Request sent to `/facility/wallet/topup/initialize`
2. Backend validates amount
3. Backend fetches facility
4. Backend calls Paystack API
5. Backend creates top-up record
6. Backend returns authorization URL

If any step fails, you'll see detailed error logs in the backend console.

