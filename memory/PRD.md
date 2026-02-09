# Weddings By Mark - CRM & Client Portal

## Original Problem Statement
Build a Studio Ninja-style CRM/booking management app for a wedding photographer small business. Key workflow: Website enquiry form → Lead created → Send quote from templates → Client accepts → Auto-generate job, invoice, contract, booking form → Client portal with unique link → E-signature → Payment tracking (bank transfers, deposit +1 day, balance -45 days before wedding).

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
- Lead management with status tracking
- Quote templates with pricing
- Contract templates with e-signature
- Invoice generation with deposit/balance schedule
- Client portal with unique access link
- Bank transfer payments only (no Stripe)
- Booking form for wedding details

## Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI + MongoDB
- **Authentication:** None required (single user admin)

## What's Been Implemented (January 2026)
### Admin Dashboard
- [x] Stats overview (leads, jobs, invoiced, outstanding)
- [x] Upcoming weddings list
- [x] Quick action cards

### Lead Management
- [x] Add/edit/delete leads
- [x] Status tracking (new, contacted, quote_sent, booked, lost)
- [x] Search and filter
- [x] Send quotes from templates

### Quotes System
- [x] Quote templates CRUD
- [x] Send quotes to leads
- [x] Accept quotes → creates job + invoice + contract + booking form

### Invoice Management
- [x] Auto-generated invoices with branding
- [x] Deposit (25%) + Balance (75%) schedule
- [x] Mark payments as received
- [x] Print/view invoice

### Contract System
- [x] Contract templates with placeholders
- [x] E-signature via canvas
- [x] Signature tracking

### Client Portal
- [x] Unique access link per job
- [x] View invoice with bank details
- [x] Sign contract electronically
- [x] Fill booking form with wedding details

### Settings
- [x] Business info management
- [x] Bank details for invoices
- [x] Payment schedule config (deposit days, balance days)
- [x] Quote templates management
- [x] Contract templates management

### Public Enquiry Form
- [x] Embeddable form at /enquiry
- [x] Auto-creates leads

## Prioritized Backlog
### P0 (Critical) - DONE
- All core features implemented

### P1 (Important)
- Email notifications (new lead alert, quote sent, payment reminders)
- PDF export for invoices/contracts
- Calendar view for upcoming weddings

### P2 (Nice to Have)
- Gallery integration (Pic-Time, ShootProof)
- Automated reminder emails
- Financial reports/analytics
- Mobile app

## Next Tasks
1. Add email notification system for new enquiries
2. Implement PDF generation for invoices
3. Add calendar view for job scheduling
4. Consider adding automated payment reminders
