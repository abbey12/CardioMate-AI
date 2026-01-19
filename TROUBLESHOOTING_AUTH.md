# Troubleshooting 401 Authentication Errors

## Console Warnings (Harmless)
The following console messages are **NOT errors** and can be ignored:
- `chrome-extension://gomekmidlodglbbmalcneegieacbdmki/...` - Browser extension warning (GPC extension)
- `Unchecked runtime.lastError` - Browser extension related
- React DevTools message - Just informational

## If You're Still Getting 401 Errors

### Solution 1: Log Out and Log Back In
The most common fix is to get fresh tokens:

1. Click the **Logout** button in the top right
2. Log back in with your facility credentials
3. This will generate new access and refresh tokens

### Solution 2: Clear Browser Storage
If logout/login doesn't work:

1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Find **Local Storage** → `http://localhost:5173` (or your frontend URL)
4. Delete these keys:
   - `accessToken`
   - `refreshToken`
   - `user`
5. Refresh the page and log in again

### Solution 3: Check Token Expiration
Access tokens expire after **15 minutes** by default. The system should automatically refresh them, but if you've been logged in for a long time, try logging out and back in.

## How Token Refresh Works

1. **Access Token**: Valid for 15 minutes
2. **Refresh Token**: Valid for 7 days
3. **Automatic Refresh**: When access token expires, system automatically:
   - Uses refresh token to get new access token
   - Retries the failed request
   - Updates localStorage

## Verify It's Working

After logging in, check the browser console:
- You should see successful API calls (200 status)
- No 401 errors
- If you see 401, check if refresh token exists in localStorage

## Still Having Issues?

1. **Check Backend is Running**: `cd backend && npm run dev`
2. **Check Frontend is Running**: `cd frontend && npm run dev`
3. **Check Database Connection**: Verify PostgreSQL is running
4. **Check Environment Variables**: Ensure `.env` file has correct values

## Testing Token Refresh

To test if token refresh works:
1. Login successfully
2. Wait 15+ minutes (or temporarily change `JWT_EXPIRES_IN=1m` in backend `.env`)
3. Make any API call (e.g., view dashboard)
4. Check browser Network tab - you should see:
   - First request: 401
   - Refresh request: 200 (new token)
   - Retry request: 200 (success)

If this doesn't happen, there may be an issue with the refresh token endpoint.

