# Weddings By Mark - CRM & Client Portal v2.3

## Original Problem Statement
Build a Studio Ninja-style CRM for wedding photography with:
1. Self-hosted on TrueNAS via Docker/Dockge (port 3005)
2. Portal at booking.perfectweddingsbymark.uk
3. Editable invoices (couples change their minds)
4. Package builder with main packages + add-ons
5. Accounts sync toggle (for accounts.weddingsbymark.co.uk integration)
6. Fixed deposit amount (£100, not percentage)
7. Business logo on invoices
8. Email quotes via SMTP with customizable templates

## Business Details
- **Business Name:** Weddings By Mark
- **Address:** 220 Ashurst Road, Manchester M22 5AX
- **Phone:** 07712 117357
- **Email:** mark@perfectweddingsbymark.uk
- **Accounts System:** accounts.weddingsbymark.co.uk
- **Logo:** https://customer-assets.emergentagent.com/job_f11e6de5-8f7d-4dd0-865f-7fe908506ea0/artifacts/7bs8gr7j_new%20logo%202022%20White%20with%20bevel.png

## What's Been Implemented

### v2.3 Updates (Feb 2026) - Email System
- [x] SMTP settings in Settings page (Hostinger support)
- [x] Email templates with placeholders
- [x] "Save & Send Email" button on quote builder
- [x] Public quote view page (/view-quote/:quoteId)
- [x] Clients can view packages and select options
- [x] Bank details displayed on quote page
- [x] Default quote email template with your exact wording

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

## Email System

### SMTP Configuration (Settings > Email Settings)
- Host: smtp.hostinger.com (or your provider)
- Port: 587
- Username: mark@perfectweddingsbymark.uk
- Password: Your email password
- From Email: mark@perfectweddingsbymark.uk
- From Name: Weddings By Mark
- TLS: Enabled (recommended)

### Email Template Placeholders
- `%client_name%` - Partner names (e.g., "John & Jane")
- `%partner1_name%` - First partner name
- `%partner2_name%` - Second partner name
- `%wedding_date%` - Wedding date
- `%quote_link%` - Link to view/accept quote
- `%phone%` - Your phone number
- `%email%` - Your email
- `%deposit_amount%` - Deposit amount
- `%sort_code%` - Bank sort code
- `%account_number%` - Bank account number
- `%account_name%` - Bank account name

### Quote Email Flow
1. Create quote in Leads section
2. Click "Save & Send Email"
3. Client receives email with "VIEW YOUR FULL QUOTE HERE" link
4. Client views packages, selects options, accepts quote
5. Job, invoice, and contract are created

## Bank Details
- **Sort Code:** 04-06-05
- **Account Number:** 20315075
- **Account Name:** Mark Powell (Tide Sole Trader Business Account)

## Payment System
- Fixed deposit amount (default £100, configurable per invoice)
- Deposit due: 1 day after booking
- Balance due: 45 days before wedding
- Bank transfer details on invoices and quote page
- Sync to accounts toggle (admin-only)

## Technical Architecture

### Backend
- FastAPI with async MongoDB (Motor)
- SMTP email via Python smtplib
- Pydantic models for validation
- All routes prefixed with /api

### Frontend
- React with Tailwind CSS
- shadcn/ui components
- Responsive design

### API Endpoints (New)
- `GET /api/email-templates` - List templates
- `POST /api/email-templates` - Create template
- `PUT /api/email-templates/:id` - Update template
- `POST /api/quotes/:id/send-email` - Send quote email
- `GET /api/public/quote/:id` - Public quote view
- `POST /api/settings/test-email` - Test SMTP settings

### Public Pages
- `/view-quote/:quoteId` - Client quote view
- `/portal/:token` - Client portal
- `/enquiry` - Public enquiry form

## TrueNAS Deployment
- **Frontend Port:** 3005
- **Backend Port:** 8005
- **App Data:** /mnt/apps/appdata/weddings-by-mark/

## Next Tasks (P1)
1. PDF Invoice Generation - Download invoices as PDF
2. Client can accept quote from public page (creates job automatically)

## Future Tasks (P2)
1. Accounting App Integration - Sync to accounts.weddingsbymark.co.uk
2. Payment reminder emails
3. Calendar view for upcoming weddings
