# Weddings By Mark - CRM & Client Portal v2.2

## Original Problem Statement
Build a Studio Ninja-style CRM for wedding photography with:
1. Self-hosted on TrueNAS via Docker/Dockge (port 3005)
2. Portal at booking.perfectweddingsbymark.uk
3. Editable invoices (couples change their minds)
4. Package builder with main packages + add-ons
5. Accounts sync toggle (for accounts.weddingsbymark.co.uk integration)
6. Fixed deposit amount (£100, not percentage)
7. Business logo on invoices

## Business Details
- **Business Name:** Weddings By Mark
- **Address:** 220 Ashurst Road, Manchester M22 5AX
- **Phone:** 07712 117357
- **Email:** mark@perfectweddingsbymark.uk
- **Accounts System:** accounts.weddingsbymark.co.uk
- **Logo:** https://customer-assets.emergentagent.com/job_f11e6de5-8f7d-4dd0-865f-7fe908506ea0/artifacts/7bs8gr7j_new%20logo%202022%20White%20with%20bevel.png

## TrueNAS Deployment
- **Frontend Port:** 3005
- **Backend Port:** 8005
- **App Data:** /mnt/apps/appdata/weddings-by-mark/
- **Backups:** /mnt/weddings_backups/bookings_data/

## What's Been Implemented

### v2.2 Updates (Feb 2026)
- [x] Fixed deposit amount (£ instead of percentage)
- [x] Business logo on invoices
- [x] Logo URL management in Settings
- [x] Logo preview in Settings page

### v2.1 Updates (Jan 2026)
- [x] Port changed to 3005/8005
- [x] Dockge-compatible compose file
- [x] TrueNAS volume paths configured
- [x] Accounts sync checkbox on invoices (admin-only)

### Core Features
- [x] Lead management (enquiry capture)
- [x] Package builder (main packages + add-ons)
- [x] Quote generation with package selection
- [x] Job creation from accepted quotes
- [x] Editable invoices
- [x] Contract templates with e-signatures
- [x] Client portal with unique token access
- [x] Dashboard with statistics

### Payment System
- Fixed deposit amount (default £100, configurable per invoice)
- Deposit due: 1 day after booking
- Balance due: 45 days before wedding
- Bank transfer details on invoices
- Sync to accounts toggle (admin-only)

## Technical Architecture

### Backend
- FastAPI with async MongoDB (Motor)
- Pydantic models for validation
- All routes prefixed with /api

### Frontend
- React with Tailwind CSS
- shadcn/ui components
- Responsive design

### Database Schema
- **settings**: business info, bank details, deposit_amount, logo_url
- **packages**: service packages and add-ons
- **leads**: enquiry information
- **quotes**: package selections and totals
- **jobs**: booked weddings
- **invoices**: line items, deposit/balance amounts, sync flag
- **contracts**: templates and signed documents

## Docker Files
- docker-compose.yml (standard)
- dockge-compose.yaml (Dockge-optimized)
- backend/Dockerfile
- frontend/Dockerfile
- frontend/nginx.conf
- DEPLOYMENT.md

## Next Tasks (P1)
1. PDF Invoice Generation - Download invoices as PDF
2. Email notifications for new enquiries, quotes, payments

## Future Tasks (P2)
1. Accounting App Integration - Sync to accounts.weddingsbymark.co.uk
2. SMS/Push Notifications via Twilio
3. Calendar view for upcoming weddings
