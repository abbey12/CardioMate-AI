# Referral System & Signup Bonus Implementation

## Overview
This document describes the implementation of the automatic signup bonus and referral system for the CardioMate AI platform.

## Features Implemented

### 1. Automatic Signup Bonus
- **Default Amount**: ₵50.00 GHS (configurable by admin)
- **When Applied**: Automatically credited to new facilities when they sign up
- **Configuration**: Admin can enable/disable and set the amount in Settings > Bonuses

### 2. Referral System
- **Referral Codes**: Each facility gets a unique 8-character referral code (e.g., "ABC12345")
- **Referral Bonus**: Configurable amount (default ₵25.00 GHS) credited to referring facility
- **How It Works**:
  1. Facility A shares their referral code
  2. Facility B signs up using Facility A's referral code
  3. Facility B receives signup bonus (if enabled)
  4. Facility A receives referral bonus (if enabled)
  5. Both transactions are recorded in wallet_transactions

## Database Changes

### New Tables
1. **referrals** - Tracks referral relationships and bonuses
2. **platform_settings** - Stores configurable platform settings (bonus amounts)

### Modified Tables
1. **facilities** - Added:
   - `referral_code` (VARCHAR(20), UNIQUE)
   - `referred_by_facility_id` (UUID, FK to facilities)

### Migration Script
Run `/backend/src/db/migrate_referrals.sql` to apply database changes.

## Backend Implementation

### New Functions (db.ts)
- `getPlatformSetting(settingKey)` - Get platform setting
- `updatePlatformSetting(settingKey, value, updatedBy)` - Update platform setting
- `getFacilityReferralCode(facilityId)` - Get or generate referral code
- `getFacilityReferralStats(facilityId)` - Get referral statistics for facility
- `getAdminReferralStats()` - Get platform-wide referral statistics

### Updated Functions
- `createFacility()` - Now handles:
  - Automatic referral code generation
  - Referral code validation (if provided)
  - Signup bonus crediting
  - Referral bonus crediting
  - Referral record creation

### New API Endpoints

#### Admin Endpoints
- `GET /admin/settings/bonuses` - Get bonus settings
- `PUT /admin/settings/bonuses` - Update bonus settings
- `GET /admin/referrals/stats` - Get referral statistics

#### Facility Endpoints
- `GET /facility/referral/code` - Get facility's referral code
- `GET /facility/referral/stats` - Get facility's referral statistics

## Frontend Implementation

### Admin Pages
1. **AdminSettings** - New "Bonuses" tab:
   - Configure signup bonus amount and enable/disable
   - Configure referral bonus amount and enable/disable

2. **AdminFacilities** - Updated signup form:
   - Optional referral code field when creating new facilities

3. **AdminDashboard** - (Future enhancement)
   - Display referral statistics
   - Top referring facilities

### Facility Pages
1. **FacilityDashboard** - (To be implemented)
   - Display referral code
   - Show referral statistics
   - Copy referral code button

## Usage

### For Admins
1. Go to Settings > Bonuses
2. Configure signup bonus (amount and enable/disable)
3. Configure referral bonus (amount and enable/disable)
4. When creating facilities, optionally provide a referral code

### For Facilities
1. View your referral code in the dashboard
2. Share your referral code with other facilities
3. Earn referral bonuses when facilities sign up using your code
4. View referral statistics (total referrals, earnings, etc.)

## Transaction Flow

### New Facility Signup (with referral)
1. Admin creates facility with referral code (optional)
2. System generates unique referral code for new facility
3. System validates referral code (if provided)
4. System credits signup bonus to new facility wallet
5. If referred, system credits referral bonus to referring facility
6. System creates referral record
7. Both transactions recorded in wallet_transactions with type='bonus'

## Default Values
- Signup Bonus: ₵50.00 GHS (enabled)
- Referral Bonus: ₵25.00 GHS (enabled)

## Security Considerations
- Referral codes are unique and auto-generated
- Only admins can create facilities
- Referral bonuses are only credited when facility signup is successful
- All transactions are recorded for audit purposes

## Future Enhancements
- Referral code sharing via link/QR code
- Referral analytics dashboard
- Multi-level referral system
- Referral bonus tiers based on number of referrals
- Email notifications for referral bonuses

