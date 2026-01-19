# Database Setup Complete ✅

## What Was Done

1. ✅ Created PostgreSQL database: `cardio`
2. ✅ Ran schema to create tables:
   - `facilities` - Facility accounts
   - `admins` - Admin users
   - `ecg_reports` - ECG reports (with facility isolation)
3. ✅ Created indexes for performance

## Database Connection

**Localhost PostgreSQL is ready!**

Connection details:
- **Host**: localhost
- **Port**: 5432
- **Database**: cardio
- **User**: user (your system user)

## Update Your .env File

Make sure your `backend/.env` file includes:

```env
# Database (Localhost PostgreSQL)
DATABASE_URL=postgresql://user@localhost:5432/cardio
DATABASE_SSL=false

# JWT Secrets (change these in production!)
JWT_SECRET=change-me-in-production-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-in-production-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Existing settings
PORT=4000
CORS_ORIGIN=http://localhost:5173
GEMINI_API_KEY=your-key-here
```

**Note**: If your PostgreSQL requires a password, use:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/cardio
```

## Verify Database

You can verify the tables were created:

```bash
psql -d cardio -c "\dt"
```

Should show:
- admins
- facilities  
- ecg_reports

## Next Steps

1. ✅ Database is ready
2. ✅ Backend code is ready
3. 🔄 Start the backend server: `cd backend && npm run dev`
4. 🔄 Create your first admin account via API or manually
5. 🔄 Build frontend portals

## Create First Admin (Optional)

You can create the first admin via API:

```bash
curl -X POST http://localhost:4000/auth/admin/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123456",
    "name": "Admin User"
  }'
```

Or manually in the database:

```sql
-- Hash password first (use bcrypt, or use the API)
-- Then insert:
INSERT INTO admins (email, password_hash, name)
VALUES ('admin@example.com', '$2b$12$...', 'Admin User');
```

