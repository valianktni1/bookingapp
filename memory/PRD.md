# Weddings By Mark - CRM & Client Portal v2.0

## Original Problem Statement
Build a Studio Ninja-style CRM/booking management app for wedding photography business with:
1. Self-hosted on TrueNAS via Docker
2. Portal at booking.perfectweddingsbymark.uk
3. Editable invoices (couples change their minds)
4. Package builder with main packages + add-ons (extra hours, selfie booth, albums, travel charge)

## Business Details
- **Business Name:** Weddings By Mark
- **Address:** 220 Ashurst Road, Manchester M22 5AX
- **Phone:** 07712 117357
- **Email:** mark@perfectweddingsbymark.uk
- **Website:** perfectweddingsbymark.uk

## User Personas
1. **Mark (Admin)** - Wedding photographer managing leads, quotes, jobs, payments
2. **Couples (Clients)** - Access client portal to view invoice, sign contract, fill booking details

## Core Requirements
- Lead management with enquiry form
- Package builder (main packages + add-ons)
- Quote builder with pick & choose
- Editable invoices after creation
- E-signature contracts
- Client portal with unique link
- Bank transfer payments only
- Self-hosted Docker deployment

## Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI + MongoDB
- **Deployment:** Docker Compose for TrueNAS

## What's Been Implemented (January 2026)

### v2.0 Updates
- [x] Package system (main packages + add-ons)
- [x] Quote builder with multi-select
- [x] Editable invoices (add/remove/edit line items)
- [x] Docker deployment files for TrueNAS
- [x] DEPLOYMENT.md with instructions

### Package System
- [x] Main packages (Full Day, Half Day, etc.)
- [x] Add-ons (Extra Hour, Selfie Booth, Album, Travel Charge)
- [x] Quantity selector for add-ons
- [x] Package type filtering

### Invoice Editing
- [x] Add new line items
- [x] Remove line items
- [x] Edit quantities and prices
- [x] Change discount
- [x] Adjust deposit percentage
- [x] Change due dates
- [x] Auto-recalculate totals

### Docker Deployment
- [x] docker-compose.yml
- [x] backend/Dockerfile
- [x] frontend/Dockerfile
- [x] frontend/nginx.conf
- [x] DEPLOYMENT.md

## File Structure
```
/app/
├── docker-compose.yml
├── DEPLOYMENT.md
├── backend/
│   ├── Dockerfile
│   ├── server.py
│   └── requirements.txt
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
```

## Deployment Steps (TrueNAS)
1. Copy app to TrueNAS
2. Run `docker-compose up -d`
3. Configure Nginx Proxy Manager for booking.perfectweddingsbymark.uk
4. Enable SSL via Let's Encrypt

## Next Tasks
1. Set up email notifications (new enquiries, payment reminders)
2. Add PDF export for invoices
3. Calendar integration
4. Automated reminder emails
