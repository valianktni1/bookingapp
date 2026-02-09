# Weddings By Mark - CRM & Client Portal v2.1

## Original Problem Statement
Build a Studio Ninja-style CRM for wedding photography with:
1. Self-hosted on TrueNAS via Docker/Dockge (port 3005)
2. Portal at booking.perfectweddingsbymark.uk
3. Editable invoices (couples change their minds)
4. Package builder with main packages + add-ons
5. Accounts sync toggle (for accounts.weddingsbymark.co.uk integration)

## Business Details
- **Business Name:** Weddings By Mark
- **Address:** 220 Ashurst Road, Manchester M22 5AX
- **Phone:** 07712 117357
- **Email:** mark@perfectweddingsbymark.uk
- **Accounts System:** accounts.weddingsbymark.co.uk

## TrueNAS Deployment
- **Frontend Port:** 3005
- **Backend Port:** 8001
- **App Data:** /mnt/apps/appdata/weddings-by-mark/
- **Backups:** /mnt/weddings_backups/bookings_data/

## What's Been Implemented (January 2026)

### v2.1 Updates
- [x] Port changed to 3005
- [x] Dockge-compatible compose file
- [x] TrueNAS volume paths configured
- [x] Accounts sync checkbox on invoices (admin-only)

### Accounts Sync Feature
- [x] sync_to_accounts field on Invoice model
- [x] Defaults to TRUE for new invoices
- [x] Admin can toggle OFF for existing bookings
- [x] Status indicator on invoice cards (Sync/No Sync)
- [x] NOT visible on client portal

### Docker Files
- docker-compose.yml (standard)
- dockge-compose.yaml (Dockge-optimized)
- backend/Dockerfile
- frontend/Dockerfile
- frontend/nginx.conf
- DEPLOYMENT.md

## Volume Structure
```
/mnt/apps/appdata/weddings-by-mark/
├── mongodb/           # Database
└── backend/           # App data

/mnt/weddings_backups/bookings_data/
├── invoices/          # Invoice PDFs
├── contracts/         # Signed contracts
└── exports/           # Data exports
```

## Next Tasks
1. Build actual integration with accounts.weddingsbymark.co.uk API
2. Add PDF generation for invoices
3. Email notifications
4. Calendar view
