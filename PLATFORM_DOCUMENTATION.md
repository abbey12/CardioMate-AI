# CardioAI - AI-Powered ECG Interpretation Platform

## Executive Summary

CardioAI is a comprehensive, multi-tenant healthcare platform that leverages CardioMate AI to provide automated Electrocardiogram (ECG) interpretation services. The platform enables medical facilities to upload ECG data in various formats, receive AI-generated clinical reports, and manage patient data efficiently through an intuitive web interface.

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Key Features](#key-features)
3. [Technical Architecture](#technical-architecture)
4. [User Roles & Access Control](#user-roles--access-control)
5. [Core Functionalities](#core-functionalities)
6. [Payment & Billing System](#payment--billing-system)
7. [Data Management](#data-management)
8. [Security & Compliance](#security--compliance)
9. [API Documentation](#api-documentation)
10. [Deployment & Infrastructure](#deployment--infrastructure)

---

## Platform Overview

### Purpose
CardioAI addresses the critical need for rapid, accurate ECG interpretation in healthcare settings. By combining advanced AI technology with a user-friendly interface, the platform helps medical facilities:

- Reduce interpretation time from hours to minutes
- Provide consistent, evidence-based ECG analysis
- Maintain comprehensive digital records
- Generate clinical-grade reports for documentation
- Track facility performance and patient trends

### Target Users
- **Medical Facilities**: Hospitals, clinics, diagnostic centers, and healthcare institutions
- **Administrators**: Platform managers who oversee facility operations
- **Healthcare Providers**: Physicians and medical staff who need ECG interpretation services

---

## Key Features

### 1. Multi-Format ECG Upload
- **Digital Signal Formats**: CSV, JSON, XML
- **Image Formats**: JPG, PNG, PDF
- **Drag-and-Drop Interface**: Intuitive file upload experience
- **Real-time Validation**: Immediate feedback on file compatibility
- **Sample Rate Configuration**: Customizable for different ECG devices

### 2. AI-Powered Interpretation
- **CardioMate AI Integration**: State-of-the-art multimodal AI model
- **Comprehensive Analysis**: 
  - Heart rate calculation
  - Rhythm identification
  - Interval measurements (PR, QRS, QT, QTc)
  - Axis determination (P, QRS, T)
  - Abnormality detection
  - Clinical impression generation
- **Explainable AI**: Decision explanations with evidence, confidence levels, and normal ranges
- **Waveform Visualization**: SVG-based ECG signal rendering

### 3. Clinical Report Generation
- **Structured Reports**: Standardized clinical format
- **PDF Export**: Professional, printable reports
- **Patient Information**: Complete demographic and clinical data
- **Technical Details**: Signal quality, preprocessing information
- **Abnormality Documentation**: Detailed findings with explanations
- **Recommendations**: AI-suggested clinical actions

### 4. Multi-Tenant Architecture
- **Facility Isolation**: Complete data separation between facilities
- **Role-Based Access**: Admin and Facility user roles
- **Facility Management**: Admin portal for facility oversight
- **Scalable Design**: Support for unlimited facilities

### 5. Wallet & Payment System
- **Pay-as-You-Go Model**: Flexible pricing based on usage
- **Paystack Integration**: Secure payment processing (Ghana Cedis)
- **Wallet Management**: 
  - Real-time balance tracking
  - Transaction history
  - Top-up functionality (₵100 - ₵500 range)
  - Automatic deductions per analysis
- **Pricing Tiers**:
  - Standard ECG Analysis (CSV/JSON): ₵10.00
  - Image ECG Analysis (JPG/PNG): ₵16.00

### 6. Analytics & Reporting
- **Dashboard Overview**: 
  - Total reports count
  - Normal vs. abnormal reports
  - Recent activity trends
  - Wallet balance and usage
  - Quick insights
- **Advanced Analytics**:
  - Report volume trends (daily, weekly, monthly)
  - Abnormality distribution charts
  - Demographic analysis (age groups, sex distribution)
  - Average heart rate tracking
  - Most common abnormalities
- **Date Range Filtering**: Customizable time periods
- **CSV Export**: Bulk data export for external analysis

### 7. Report Management
- **Comprehensive List View**: All reports with filtering and search
- **Advanced Filtering**: 
  - Date range selection
  - Patient name search
  - Rhythm type filtering
  - Abnormality status
- **Pagination**: Efficient handling of large datasets
- **Bulk Actions**: Multiple report operations
- **Quick Actions**: View, download, share reports

### 8. Communication Features
- **WhatsApp Integration**: Direct report sharing to physicians
- **Report Forwarding**: Pre-filled WhatsApp messages with report summaries
- **Secure Sharing**: Reference-based report access

### 9. User Management
- **Authentication System**: JWT-based secure authentication
- **Password Management**: Secure password hashing (bcrypt)
- **Token Refresh**: Automatic session renewal
- **Profile Management**: Facility information updates
- **Session Security**: Automatic logout on expiry

### 10. Settings & Configuration
- **Account Settings**: Facility name, email management
- **Password Change**: Secure password updates
- **Preferences**: User-specific configurations
- **Notification Settings**: Alert preferences

---

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: 
  - React Query (TanStack Query) for server state
  - React Context for authentication
- **UI Components**: Custom-built with modern design principles
- **Charts**: Recharts for data visualization
- **Styling**: Inline styles with CSS-in-JS approach
- **Icons**: Lucide React

### Backend Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer for multipart/form-data
- **PDF Generation**: Puppeteer for HTML-to-PDF conversion
- **AI Integration**: CardioMate AI
- **Payment Processing**: Paystack API integration

### Database Schema
- **Users & Authentication**:
  - `admins`: Platform administrators
  - `facilities`: Medical facility accounts
- **ECG Data**:
  - `ecg_reports`: Complete ECG analysis reports
  - Patient information stored as JSONB
  - Measurements and abnormalities as structured data
- **Financial**:
  - `facility_wallets`: Wallet balances per facility
  - `wallet_transactions`: Transaction history
  - `pricing_config`: Analysis pricing configuration
  - `topups`: Paystack top-up records
- **Indexes**: Optimized for query performance

### API Architecture
- **RESTful Design**: Standard HTTP methods and status codes
- **Authentication Middleware**: JWT token validation
- **Role-Based Routes**: Separate endpoints for Admin and Facility
- **Error Handling**: Comprehensive error responses
- **CORS Configuration**: Secure cross-origin resource sharing

### AI Integration
- **Model**: CardioMate AI
- **Multimodal Support**: Text and image inputs
- **Prompt Engineering**: Structured prompts for consistent outputs
- **Response Parsing**: JSON extraction from AI responses
- **Fallback Mechanism**: Mock responses when API unavailable
- **Rate Limiting**: Built-in API rate limit handling

---

## User Roles & Access Control

### Admin Role
**Capabilities**:
- Create and manage facilities
- View all facilities and their reports
- Access system-wide analytics
- Manage platform settings
- View financial transactions across facilities

**Access Points**:
- Admin Dashboard
- Facility Management
- System Analytics
- User Management

### Facility Role
**Capabilities**:
- Upload and analyze ECGs
- View own reports only
- Manage wallet and payments
- Access facility-specific analytics
- Export and share reports
- Manage facility profile

**Access Points**:
- Facility Dashboard
- ECG Upload
- Reports Management
- Analytics Dashboard
- Wallet Management
- Settings

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Token Expiration**: 15-minute access tokens, 7-day refresh tokens
- **Automatic Refresh**: Seamless token renewal
- **Session Management**: Secure session handling
- **Data Isolation**: Database-level facility separation

---

## Core Functionalities

### ECG Upload & Processing

#### Supported Formats
1. **CSV Format**:
   - Single or multi-lead ECG signals
   - Time-series voltage data
   - Configurable sample rate (default: 250 Hz)
   - Automatic lead detection

2. **JSON Format**:
   - Structured ECG data
   - Metadata support
   - Multi-lead configurations
   - Flexible schema

3. **Image Formats**:
   - JPG/PNG: Scanned ECG printouts
   - PDF: Multi-page ECG documents
   - Automatic image preprocessing
   - OCR capabilities for text extraction

#### Processing Pipeline
1. **File Upload**: Secure multipart upload
2. **Format Detection**: Automatic format identification
3. **Data Parsing**: Extraction of ECG signals
4. **Preprocessing**:
   - Signal cleaning (noise removal)
   - Normalization
   - R-peak detection
   - Heart rate estimation
5. **AI Analysis**: CardioMate AI interpretation
6. **Report Generation**: Structured clinical report
7. **Storage**: Database persistence
8. **Deduction**: Automatic wallet charge

### Report Structure

#### Patient Information
- Name
- Age
- Sex (Male/Female/Other/Unknown)
- Medical Record Number
- Clinical Indication
- Medications
- Prior ECG Date

#### Measurements
- Heart Rate (bpm)
- Rhythm
- PR Interval (ms)
- QRS Duration (ms)
- QT Interval (ms)
- QTc (corrected QT)
- P Axis (degrees)
- QRS Axis (degrees)
- T Axis (degrees)

#### Findings
- Abnormality List: Array of detected abnormalities
- Clinical Impression: AI-generated summary
- Recommendations: Suggested clinical actions
- Decision Explanations: Evidence-based reasoning

#### Technical Details
- Signal Quality Metrics
- Preprocessing Summary
- Sample Rate
- Duration
- Signal Statistics

### PDF Report Features
- **Professional Layout**: Clinical standard formatting
- **Header Information**: Facility and patient details
- **Waveform Visualization**: SVG ECG signals
- **Structured Sections**: Organized findings
- **Footer Information**: Disclaimers and notes
- **Print-Ready**: Optimized for printing

---

## Payment & Billing System

### Wallet System
- **Initialization**: Automatic wallet creation for new facilities
- **Balance Tracking**: Real-time balance updates
- **Currency**: Ghana Cedis (GHS)
- **Transaction Types**:
  - Top-up: Fund additions
  - Deduction: Analysis charges
  - Refund: Reversals (if applicable)
  - Adjustment: Manual corrections

### Payment Processing
- **Gateway**: Paystack
- **Payment Methods**: 
  - Credit/Debit Cards
  - Mobile Money (MTN, Vodafone, AirtelTigo)
  - Bank Transfers
- **Top-Up Range**: ₵100.00 - ₵500.00
- **Minimum Top-Up**: ₵100.00
- **Maximum Top-Up**: ₵500.00

### Transaction Flow
1. **Top-Up Request**: Facility initiates payment
2. **Paystack Initialization**: Payment gateway setup
3. **Payment Processing**: User completes payment
4. **Webhook Verification**: Secure payment confirmation
5. **Wallet Update**: Automatic balance addition
6. **Transaction Record**: Complete audit trail

### Pricing Model
- **Per-Analysis Pricing**:
  - Standard (CSV/JSON): ₵10.00 per analysis
  - Image (JPG/PNG): ₵16.00 per analysis
- **Automatic Deduction**: Charges applied on successful analysis
- **Balance Validation**: Pre-analysis balance check
- **Insufficient Funds**: Clear error messaging with top-up prompts

### Transaction History
- **Complete Audit Trail**: All transactions logged
- **Filtering Options**: Date range, transaction type
- **Export Capability**: CSV export for accounting
- **Status Tracking**: Pending, completed, failed states

---

## Data Management

### Report Storage
- **Database**: PostgreSQL with JSONB for flexible data
- **File Storage**: In-memory processing (no persistent file storage)
- **Data Retention**: Configurable retention policies
- **Backup Strategy**: Database-level backups

### Data Export
- **CSV Export**: Bulk report export
- **PDF Export**: Individual report downloads
- **Date Filtering**: Customizable export ranges
- **Format Options**: Multiple export formats

### Search & Filtering
- **Global Search**: Patient name, report ID, rhythm
- **Date Range**: From/To date selection
- **Status Filtering**: Normal, abnormal, all
- **Pagination**: Efficient large dataset handling
- **Sorting**: Multiple column sorting options

### Data Privacy
- **Facility Isolation**: Complete data separation
- **Access Control**: Role-based data access
- **Audit Logging**: Transaction and access logs
- **Data Encryption**: Secure data transmission (HTTPS)

---

## Security & Compliance

### Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Token Expiration**: Short-lived access tokens
- **Refresh Tokens**: Long-lived refresh mechanism
- **Password Security**: 
  - bcrypt hashing (10 salt rounds)
  - Minimum 8 characters
  - No plaintext storage

### Data Security
- **HTTPS**: Encrypted data transmission
- **CORS**: Configured cross-origin policies
- **Input Validation**: Comprehensive data validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization

### API Security
- **Rate Limiting**: Protection against abuse
- **Token Validation**: Middleware-based validation
- **Error Handling**: Secure error messages (no sensitive data)
- **Webhook Security**: Paystack signature verification

### Compliance Considerations
- **Data Privacy**: Facility-level data isolation
- **Audit Trails**: Complete transaction logging
- **Access Logs**: User activity tracking
- **Data Retention**: Configurable retention policies

---

## API Documentation

### Authentication Endpoints

#### Admin Signup
```
POST /auth/admin/signup
Body: { email, password, name? }
Response: { admin, accessToken, refreshToken }
```

#### Admin Login
```
POST /auth/admin/login
Body: { email, password }
Response: { admin, accessToken, refreshToken }
```

#### Facility Signup (Admin Only)
```
POST /auth/facility/signup
Headers: { Authorization: Bearer <token> }
Body: { name, email, password }
Response: { facility }
```

#### Facility Login
```
POST /auth/facility/login
Body: { email, password }
Response: { facility, accessToken, refreshToken }
```

#### Token Refresh
```
POST /auth/refresh
Body: { refreshToken }
Response: { accessToken }
```

### Facility Endpoints

#### Dashboard
```
GET /facility/dashboard
Headers: { Authorization: Bearer <token> }
Response: { totalReports, recentReports[] }
```

#### Upload ECG
```
POST /facility/reports/upload
Headers: { Authorization: Bearer <token> }
Body: FormData { file, sampleRateHz?, patient? }
Response: EcgStructuredReport
```

#### Get Reports
```
GET /facility/reports?limit=50&offset=0&fromDate=&toDate=
Headers: { Authorization: Bearer <token> }
Response: { reports[], total, limit, offset }
```

#### Get Report
```
GET /facility/reports/:id
Headers: { Authorization: Bearer <token> }
Response: EcgStructuredReport
```

#### Export CSV
```
GET /facility/reports/export/csv?fromDate=&toDate=
Headers: { Authorization: Bearer <token> }
Response: CSV file download
```

#### Download PDF
```
GET /facility/reports/:id/pdf
Headers: { Authorization: Bearer <token> }
Response: PDF file download
```

#### Analytics Summary
```
GET /facility/analytics/summary?fromDate=&toDate=
Headers: { Authorization: Bearer <token> }
Response: AnalyticsSummary
```

#### Volume Data
```
GET /facility/analytics/volume?period=daily&fromDate=&toDate=
Headers: { Authorization: Bearer <token> }
Response: VolumeDataPoint[]
```

#### Abnormality Distribution
```
GET /facility/analytics/abnormalities?fromDate=&toDate=
Headers: { Authorization: Bearer <token> }
Response: AbnormalityDistribution[]
```

#### Demographics Data
```
GET /facility/analytics/demographics?fromDate=&toDate=
Headers: { Authorization: Bearer <token> }
Response: DemographicsData
```

#### Wallet Balance
```
GET /facility/wallet
Headers: { Authorization: Bearer <token> }
Response: { balance, currency, updatedAt }
```

#### Wallet Transactions
```
GET /facility/wallet/transactions?limit=50&offset=0&fromDate=&toDate=
Headers: { Authorization: Bearer <token> }
Response: { transactions[], total }
```

#### Initialize Top-Up
```
POST /facility/wallet/topup/initialize
Headers: { Authorization: Bearer <token> }
Body: { amount }
Response: { authorizationUrl, reference, topUpId }
```

#### Verify Top-Up
```
POST /facility/wallet/topup/verify
Headers: { Authorization: Bearer <token> }
Body: { reference }
Response: { success, topUp, newBalance }
```

#### Get Top-Ups
```
GET /facility/wallet/topups?limit=50&offset=0
Headers: { Authorization: Bearer <token> }
Response: { topUps[], total }
```

#### Cancel Top-Up
```
DELETE /facility/wallet/topups/:topUpId
Headers: { Authorization: Bearer <token> }
Response: { success, message }
```

#### Retry Payment
```
POST /facility/wallet/topups/:topUpId/retry
Headers: { Authorization: Bearer <token> }
Response: { authorizationUrl, reference, topUpId }
```

#### Update Profile
```
PATCH /facility/profile
Headers: { Authorization: Bearer <token> }
Body: { name?, email? }
Response: { facility }
```

#### Change Password
```
PATCH /facility/password
Headers: { Authorization: Bearer <token> }
Body: { currentPassword, newPassword }
Response: { success, message }
```

### Admin Endpoints

#### Get Facilities
```
GET /admin/facilities
Headers: { Authorization: Bearer <token> }
Response: Facility[]
```

#### Get Facility
```
GET /admin/facilities/:id
Headers: { Authorization: Bearer <token> }
Response: Facility
```

#### Delete Facility
```
DELETE /admin/facilities/:id
Headers: { Authorization: Bearer <token> }
Response: { success }
```

#### Get All Reports
```
GET /admin/reports
Headers: { Authorization: Bearer <token> }
Response: EcgStructuredReport[]
```

#### Get Stats
```
GET /admin/stats
Headers: { Authorization: Bearer <token> }
Response: { totalFacilities, totalReports, facilities[] }
```

### Webhook Endpoints

#### Paystack Webhook
```
POST /paystack/webhook
Headers: { x-paystack-signature }
Body: Paystack event payload
Response: { received: true }
```

---

## Deployment & Infrastructure

### Environment Variables

#### Backend (.env)
```env
PORT=4000
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cardio
DATABASE_SSL=false

# JWT Secrets
JWT_SECRET=change-me-in-production-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-in-production-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-pro

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
PAYSTACK_CALLBACK_URL=http://localhost:5173/facility/wallet?payment=success
```

#### Frontend (.env)
```env
VITE_API_BASE=http://localhost:4000
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
```

### Database Setup
1. **PostgreSQL Installation**: Version 12+ required
2. **Database Creation**: Create `cardio` database
3. **Schema Initialization**: Run `schema.sql`
4. **Migration Scripts**: Run wallet migration if needed

### Development Setup
1. **Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Production Considerations
- **HTTPS**: SSL/TLS certificates required
- **Environment Variables**: Secure secret management
- **Database Backups**: Regular backup strategy
- **Monitoring**: Application and error monitoring
- **Scaling**: Horizontal scaling capabilities
- **CDN**: Static asset delivery
- **Load Balancing**: Multiple server instances

### Performance Optimizations
- **Database Indexing**: Optimized query performance
- **Caching**: Query result caching where appropriate
- **Pagination**: Efficient large dataset handling
- **Lazy Loading**: On-demand data loading
- **Image Optimization**: Compressed image handling

---

## Future Enhancements

### Planned Features
1. **Multi-Lead Support**: Enhanced multi-lead ECG analysis
2. **Historical Comparison**: Compare ECGs over time
3. **Mobile App**: Native mobile applications
4. **Telemedicine Integration**: Direct physician connections
5. **Advanced Analytics**: Machine learning insights
6. **API Access**: Third-party integrations
7. **Bulk Upload**: Multiple file processing
8. **Custom Templates**: Facility-specific report formats
9. **Notification System**: Email/SMS alerts
10. **Multi-Language Support**: Internationalization

### Scalability Roadmap
- **Microservices Architecture**: Service decomposition
- **Containerization**: Docker deployment
- **Kubernetes**: Orchestration and scaling
- **Message Queue**: Async processing
- **Caching Layer**: Redis integration
- **CDN Integration**: Global content delivery

---

## Support & Documentation

### Technical Support
- **Documentation**: Comprehensive platform documentation
- **API Reference**: Complete API documentation
- **Code Examples**: Sample integrations
- **Troubleshooting**: Common issues and solutions

### User Resources
- **User Guides**: Step-by-step tutorials
- **Video Tutorials**: Visual learning resources
- **FAQ**: Frequently asked questions
- **Contact Support**: Direct support channels

---

## Conclusion

CardioAI represents a comprehensive solution for automated ECG interpretation, combining cutting-edge AI technology with practical healthcare workflows. The platform's multi-tenant architecture, flexible payment system, and comprehensive analytics make it suitable for facilities of all sizes, from small clinics to large hospital networks.

With its focus on security, usability, and clinical accuracy, CardioAI empowers healthcare providers to deliver faster, more consistent ECG interpretation services while maintaining the highest standards of data privacy and clinical documentation.

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Platform Status**: Production Ready

