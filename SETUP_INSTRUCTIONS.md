# Localhost PostgreSQL Setup - Complete ✅

## Database Status

✅ **Database created**: `cardio`  
✅ **Tables created**: `admins`, `facilities`, `ecg_reports`  
✅ **Indexes created**: Performance indexes added  
✅ **PostgreSQL running**: localhost:5432

## Update Your .env File

Your `backend/.env` file should have:

```env
# Database (Localhost - no password needed for local user)
DATABASE_URL=postgresql://user@localhost:5432/cardio
DATABASE_SSL=false

# JWT Secrets
JWT_SECRET=change-me-in-production-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-in-production-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=4000
CORS_ORIGIN=http://localhost:5173

# Gemini API (optional)
GEMINI_API_KEY=your-key-here
```

**Note**: If your local PostgreSQL requires a password, use:
```env
DATABASE_URL=postgresql://user:yourpassword@localhost:5432/cardio
```

## Test the Connection

Start the backend server:

```bash
cd backend
npm run dev
```

You should see:
```
✅ Database connected
✅ Backend listening on http://localhost:4000
```

## Create Your First Admin

Once the server is running, create an admin account:

```bash
curl -X POST http://localhost:4000/auth/admin/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123456",
    "name": "Admin User"
  }'
```

This will return:
```json
{
  "admin": { "id": "...", "email": "admin@example.com", "name": "Admin User" },
  "accessToken": "...",
  "refreshToken": "..."
}
```

## Verify Database Tables

Check that tables exist:

```bash
psql -d cardio -c "\dt"
```

Should show:
- admins
- facilities
- ecg_reports

## Next Steps

1. ✅ Database ready
2. ✅ Backend ready
3. 🔄 Test backend: `cd backend && npm run dev`
4. 🔄 Create admin account
5. 🔄 Build frontend portals

