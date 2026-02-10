# Weddings By Mark - CRM & Client Portal v2.4

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
9. Accordions for packages showing what's included
10. Auto job/invoice/contract creation when quote accepted
11. Email notifications to Mark when booked

## What's Been Implemented

### v2.4 Updates (Feb 2026) - Quote Acceptance Flow
- [x] Accordions for packages with "What's Included" bullet points
- [x] Parses * bullet points from package includes
- [x] Auto-creates Job when client accepts quote
- [x] Auto-creates Invoice with correct totals
- [x] Auto-creates Contract from template
- [x] Email notification to Mark on booking
- [x] Email to client with portal link
- [x] Redirect to portal after acceptance
- [x] Removed "Made with Emergent" badge
- [x] Added Booking Form tab to Settings (placeholder)

### v2.3 Updates (Feb 2026) - Email System
- [x] SMTP settings in Settings page (Hostinger support)
- [x] Email templates with placeholders
- [x] "Save & Send Email" button on quote builder
- [x] Public quote view page (/view-quote/:quoteId)
- [x] Clients can view packages and select options
- [x] Bank details displayed on quote page
- [x] Default quote email template

### v2.2 Updates (Feb 2026)
- [x] Fixed deposit amount (£ instead of percentage)
- [x] Business logo on invoices
- [x] Logo URL management in Settings

### Core Features
- [x] Lead management (enquiry capture)
- [x] Package builder (main packages + add-ons with includes)
- [x] Quote generation with package selection
- [x] Job creation from accepted quotes
- [x] Editable invoices
- [x] Contract templates with e-signatures
- [x] Client portal with unique token access
- [x] Dashboard with statistics

## Quote → Booking Flow

1. **Admin creates quote** (Leads → Build Quote) - All packages auto-selected
2. **Admin sends email** ("Save & Send Email" button)
3. **Client receives email** with "VIEW YOUR FULL QUOTE HERE" link
4. **Client views quote page** - Accordions show package details
5. **Client selects package + add-ons** - Nothing pre-selected
6. **Client clicks "Accept Quote & Book"**
7. **System automatically:**
   - Creates Job
   - Creates Invoice with correct totals
   - Creates Contract from template
   - Sends notification email to Mark
   - Sends confirmation email to client with portal link
   - Redirects client to their portal

## Package Includes Format

In Settings → Packages, use * for bullet points in the "Includes" field:
```
* Full day coverage (8 hours)
* 500+ edited digital images
* Online gallery for sharing
* Pre-wedding consultation
* Second photographer included
```

## TrueNAS Deployment
- **Frontend Port:** 3005
- **Backend Port:** 8005
- **Domain:** booking.perfectweddingsbymark.uk
- **NPM Advanced Config:**
```nginx
location /api/ {
    proxy_pass http://192.168.24.10:8005;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Next Tasks (P1)
1. PDF Invoice Generation - Download invoices as PDF
2. Customizable Booking Form in Settings

## Future Tasks (P2)
1. Accounting App Integration - Sync to accounts.weddingsbymark.co.uk
2. Payment reminder emails
3. Calendar view for upcoming weddings
