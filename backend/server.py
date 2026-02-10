from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Weddings By Mark CRM")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== ENUMS ==============
class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUOTE_SENT = "quote_sent"
    BOOKED = "booked"
    LOST = "lost"

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    DEPOSIT_PAID = "deposit_paid"
    FULLY_PAID = "fully_paid"
    OVERDUE = "overdue"

class ContractStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    SIGNED = "signed"

class PackageType(str, Enum):
    MAIN = "main"
    ADDON = "addon"

# ============== MODELS ==============

# Business Settings
class BankDetails(BaseModel):
    account_name: str = "Mark Powell (Tide Sole Trader Business Account)"
    sort_code: str = "04-06-05"
    account_number: str = "20315075"

class SMTPSettings(BaseModel):
    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""
    from_email: str = ""
    from_name: str = "Weddings By Mark"
    use_tls: bool = True

class BusinessSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_name: str = "Weddings By Mark"
    address: str = "220 Ashurst Road, Manchester M22 5AX"
    phone: str = "07712 117357"
    email: str = "mark@perfectweddingsbymark.uk"
    website: str = "perfectweddingsbymark.uk"
    logo_url: str = "https://customer-assets.emergentagent.com/job_f11e6de5-8f7d-4dd0-865f-7fe908506ea0/artifacts/7bs8gr7j_new%20logo%202022%20White%20with%20bevel.png"
    bank_details: BankDetails = Field(default_factory=BankDetails)
    smtp_settings: SMTPSettings = Field(default_factory=SMTPSettings)
    deposit_days: int = 1
    deposit_amount: float = 100.0  # Fixed £ deposit amount (e.g., £100)
    balance_days_before: int = 45

class BusinessSettingsUpdate(BaseModel):
    business_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    bank_details: Optional[BankDetails] = None
    smtp_settings: Optional[SMTPSettings] = None
    deposit_days: Optional[int] = None
    deposit_amount: Optional[float] = None  # Fixed £ deposit amount
    balance_days_before: Optional[int] = None

# Lead Models
class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partner1_name: str
    partner2_name: str
    email: EmailStr
    phone: str
    wedding_date: Optional[str] = None
    venue: Optional[str] = None
    message: Optional[str] = None
    source: str = "website"
    status: LeadStatus = LeadStatus.NEW
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeadCreate(BaseModel):
    partner1_name: str
    partner2_name: str
    email: EmailStr
    phone: str
    wedding_date: Optional[str] = None
    venue: Optional[str] = None
    message: Optional[str] = None
    source: str = "website"

class LeadUpdate(BaseModel):
    partner1_name: Optional[str] = None
    partner2_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    wedding_date: Optional[str] = None
    venue: Optional[str] = None
    message: Optional[str] = None
    status: Optional[LeadStatus] = None

# Package Models (replaces QuoteTemplate)
class Package(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    package_type: PackageType = PackageType.MAIN
    includes: List[str] = []
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PackageCreate(BaseModel):
    name: str
    description: str
    price: float
    package_type: PackageType = PackageType.MAIN
    includes: List[str] = []
    sort_order: int = 0

class PackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    package_type: Optional[PackageType] = None
    includes: Optional[List[str]] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

# Quote Models - Now with multiple packages/addons
class QuoteItem(BaseModel):
    package_id: str
    name: str
    description: str
    price: float
    package_type: str
    quantity: int = 1
    includes: List[str] = []  # What's included in this package

class Quote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    items: List[QuoteItem] = []
    subtotal: float
    discount: float = 0
    discount_note: Optional[str] = None
    total: float
    custom_message: Optional[str] = None
    valid_until: str
    status: str = "sent"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuoteSend(BaseModel):
    lead_id: str
    package_ids: List[str]
    quantities: Optional[dict] = None  # {package_id: quantity}
    discount: float = 0
    discount_note: Optional[str] = None
    custom_message: Optional[str] = None
    valid_days: int = 14

# Email Template Models
class EmailTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "quote_email", "payment_reminder"
    subject: str
    body: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmailTemplateCreate(BaseModel):
    name: str
    subject: str
    body: str

class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    is_active: Optional[bool] = None

class SendQuoteEmail(BaseModel):
    lead_id: str
    quote_id: str
    template_id: Optional[str] = None  # If not provided, use default quote template

# Contract Template Models
class ContractTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    content: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContractTemplateCreate(BaseModel):
    name: str
    content: str

# Booking Form Models
class BookingFormField(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    field_type: str = "text"  # text, textarea, date, time, select, checkbox
    required: bool = True
    options: List[str] = []  # For select fields
    placeholder: str = ""

class BookingFormTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Default Booking Form"
    fields: List[BookingFormField] = []
    intro_text: str = "Please fill in the details below to help us prepare for your special day."
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingFormResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    responses: dict = {}  # {field_id: response_value}
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Job Models
class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    quote_id: str
    partner1_name: str
    partner2_name: str
    email: str
    phone: str
    wedding_date: str
    venue: Optional[str] = None
    package_summary: str
    package_price: float
    portal_token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_id: Optional[str] = None
    contract_id: Optional[str] = None
    booking_form_id: Optional[str] = None
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Invoice Models - Now fully editable
class InvoiceLineItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    quantity: int = 1
    unit_price: float
    amount: float

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    invoice_number: str
    partner1_name: str
    partner2_name: str
    email: str
    wedding_date: str
    line_items: List[InvoiceLineItem] = []
    subtotal: float
    discount: float = 0
    discount_note: Optional[str] = None
    total_amount: float
    deposit_amount: float = 100  # Fixed £ deposit
    deposit_due_date: str
    balance_amount: float
    balance_due_date: str
    deposit_paid: bool = False
    deposit_paid_date: Optional[str] = None
    balance_paid: bool = False
    balance_paid_date: Optional[str] = None
    status: InvoiceStatus = InvoiceStatus.SENT
    notes: Optional[str] = None
    sync_to_accounts: bool = True  # Admin checkbox - sync to accounts.weddingsbymark.co.uk
    synced_at: Optional[str] = None  # When it was synced
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceLineItemUpdate(BaseModel):
    id: Optional[str] = None
    description: str
    quantity: int = 1
    unit_price: float

class InvoiceUpdate(BaseModel):
    line_items: Optional[List[InvoiceLineItemUpdate]] = None
    discount: Optional[float] = None
    discount_note: Optional[str] = None
    deposit_amount: Optional[float] = None  # Fixed £ deposit
    deposit_due_date: Optional[str] = None
    balance_due_date: Optional[str] = None
    deposit_paid: Optional[bool] = None
    deposit_paid_date: Optional[str] = None
    balance_paid: Optional[bool] = None
    balance_paid_date: Optional[str] = None
    notes: Optional[str] = None
    wedding_date: Optional[str] = None
    sync_to_accounts: Optional[bool] = None  # Admin toggle for accounts sync

# Contract Models
class Contract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    template_id: str
    content: str
    partner1_name: str
    partner2_name: str
    wedding_date: str
    status: ContractStatus = ContractStatus.SENT
    signature_data: Optional[str] = None
    signed_at: Optional[str] = None
    signed_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContractSign(BaseModel):
    signature_data: str
    signed_by: str

# Booking Form Models
class BookingForm(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    partner1_name: str
    partner1_email: str
    partner1_phone: str
    partner2_name: str
    partner2_email: Optional[str] = None
    partner2_phone: Optional[str] = None
    wedding_date: str
    ceremony_time: Optional[str] = None
    ceremony_venue: Optional[str] = None
    ceremony_address: Optional[str] = None
    reception_venue: Optional[str] = None
    reception_address: Optional[str] = None
    getting_ready_location: Optional[str] = None
    special_requests: Optional[str] = None
    is_completed: bool = False
    completed_at: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingFormUpdate(BaseModel):
    partner1_name: Optional[str] = None
    partner1_email: Optional[str] = None
    partner1_phone: Optional[str] = None
    partner2_name: Optional[str] = None
    partner2_email: Optional[str] = None
    partner2_phone: Optional[str] = None
    wedding_date: Optional[str] = None
    ceremony_time: Optional[str] = None
    ceremony_venue: Optional[str] = None
    ceremony_address: Optional[str] = None
    reception_venue: Optional[str] = None
    reception_address: Optional[str] = None
    getting_ready_location: Optional[str] = None
    special_requests: Optional[str] = None

# ============== HELPER FUNCTIONS ==============
def serialize_doc(doc):
    """Convert MongoDB document for JSON response"""
    if doc is None:
        return None
    if isinstance(doc.get('created_at'), str):
        doc['created_at'] = datetime.fromisoformat(doc['created_at'].replace('Z', '+00:00'))
    if isinstance(doc.get('updated_at'), str):
        doc['updated_at'] = datetime.fromisoformat(doc['updated_at'].replace('Z', '+00:00'))
    
    # Handle quote items conversion
    if 'items' in doc and isinstance(doc['items'], list):
        for i, item in enumerate(doc['items']):
            if isinstance(item, dict):
                # Ensure all required fields exist with defaults
                doc['items'][i] = {
                    'package_id': item.get('package_id', ''),
                    'name': item.get('name', ''),
                    'description': item.get('description', ''),
                    'price': item.get('price', 0.0),
                    'package_type': item.get('package_type', 'main'),
                    'quantity': item.get('quantity', 1)
                }
    
    # Handle missing quote fields
    if 'lead_id' in doc and 'items' in doc:  # This looks like a quote
        if 'subtotal' not in doc:
            doc['subtotal'] = 0.0
        if 'total' not in doc:
            doc['total'] = doc.get('subtotal', 0.0) - doc.get('discount', 0.0)
        if 'valid_until' not in doc:
            doc['valid_until'] = (datetime.now(timezone.utc) + timedelta(days=14)).strftime("%Y-%m-%d")
    
    return doc

async def get_next_invoice_number():
    """Generate next invoice number"""
    count = await db.invoices.count_documents({})
    year = datetime.now().year
    return f"WBM-{year}-{str(count + 1).zfill(4)}"

async def get_settings():
    """Get business settings or create default"""
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        default_settings = BusinessSettings()
        doc = default_settings.model_dump()
        doc['created_at'] = datetime.now(timezone.utc).isoformat()
        await db.settings.insert_one(doc)
        return default_settings
    return BusinessSettings(**settings)

def recalculate_invoice(invoice_data, settings):
    """Recalculate invoice totals based on line items"""
    subtotal = sum(item['quantity'] * item['unit_price'] for item in invoice_data.get('line_items', []))
    discount = invoice_data.get('discount', 0)
    total = subtotal - discount
    deposit_amount = invoice_data.get('deposit_amount', settings.deposit_amount)
    balance_amount = total - deposit_amount
    
    return {
        'subtotal': subtotal,
        'total_amount': total,
        'deposit_amount': deposit_amount,
        'balance_amount': balance_amount
    }

async def send_email(to_email: str, subject: str, body: str, settings: BusinessSettings):
    """Send email via SMTP"""
    smtp = settings.smtp_settings
    if not smtp.host or not smtp.username or not smtp.password:
        raise HTTPException(status_code=400, detail="SMTP settings not configured. Please configure in Settings.")
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{smtp.from_name} <{smtp.from_email or smtp.username}>"
        msg['To'] = to_email
        
        # Create HTML version of the email
        html_body = body.replace('\n', '<br>')
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Georgia, serif; line-height: 1.6; color: #333; }}
                .quote-link {{ 
                    display: inline-block; 
                    background-color: #c9a962; 
                    color: white !important; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    font-weight: bold;
                    margin: 20px 0;
                }}
                .bank-details {{
                    background-color: #1a1a1a;
                    color: white;
                    padding: 20px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            {html_body}
        </body>
        </html>
        """
        
        # Attach both plain text and HTML versions
        part1 = MIMEText(body, 'plain')
        part2 = MIMEText(html_content, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        # Connect and send
        if smtp.use_tls:
            server = smtplib.SMTP(smtp.host, smtp.port)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(smtp.host, smtp.port)
        
        server.login(smtp.username, smtp.password)
        server.sendmail(smtp.from_email or smtp.username, to_email, msg.as_string())
        server.quit()
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

async def get_default_quote_template():
    """Get or create the default quote email template"""
    template = await db.email_templates.find_one({"name": "quote_email"}, {"_id": 0})
    if not template:
        default_template = EmailTemplate(
            name="quote_email",
            subject="Your Wedding Photography Quote from Weddings By Mark",
            body="""Hi %client_name%,

Thank you for considering Weddings By Mark to capture your special day. I am thrilled to let you know that I still have your date available, and I would be honoured to be a part of it.

I understand that planning a wedding can be overwhelming, but I am here to make the photography part of it as easy and stress-free as possible.

That's why I have put together a tailored quote specifically for your wedding date with all the packages available. You can view, choose, and accept this quote quickly and conveniently through my online booking system.

<a href="%quote_link%" class="quote-link">VIEW YOUR FULL QUOTE HERE</a>

*Please Note* If you are happy and go ahead with the quote :) All payment details are at the bottom of this email :)

But why should you choose Weddings By Mark? Because I believe that your wedding day is just as important to me as it is to you. I am committed to creating timeless images that will become cherished memories for years to come. With my expertise, creativity, and attention to detail, you can rest assured that every precious moment will be captured beautifully.

I am more than happy to answer any questions you may have or provide additional information. Simply drop me a message or give me a call at %phone%, and I will be delighted to help.

Lastly, I would like to take this opportunity to wish you both all the very best for your upcoming wedding day and your future together.

Remember, your quote is valid for seven days from the date of this email, and your booking and wedding/event date will only be secured upon the payment of a £%deposit_amount% deposit.

<div class="bank-details">
<strong>Bank Transfer Details:</strong><br>
Sort Code: %sort_code%<br>
Account No: %account_number%<br>
Account Name: %account_name%
</div>

Don't miss out on this opportunity to have your dream wedding photography captured by Weddings By Mark. I look forward to hearing from you soon and being a part of your special day.

Best wishes,
Mark
Weddings By Mark
%phone%
%email%"""
        )
        doc = default_template.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.email_templates.insert_one(doc)
        return default_template
    return EmailTemplate(**template)

# ============== API ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Weddings By Mark CRM API", "version": "2.0.0"}

# ---------- SETTINGS ----------
@api_router.get("/settings", response_model=BusinessSettings)
async def get_business_settings():
    return await get_settings()

@api_router.put("/settings", response_model=BusinessSettings)
async def update_business_settings(update: BusinessSettingsUpdate):
    settings = await get_settings()
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        if 'bank_details' in update_data:
            update_data['bank_details'] = update_data['bank_details'].model_dump() if hasattr(update_data['bank_details'], 'model_dump') else update_data['bank_details']
        if 'smtp_settings' in update_data:
            update_data['smtp_settings'] = update_data['smtp_settings'].model_dump() if hasattr(update_data['smtp_settings'], 'model_dump') else update_data['smtp_settings']
        await db.settings.update_one({"id": settings.id}, {"$set": update_data})
    updated = await db.settings.find_one({"id": settings.id}, {"_id": 0})
    return BusinessSettings(**updated)

@api_router.post("/settings/test-email")
async def test_email_settings():
    """Test SMTP settings by sending a test email"""
    settings = await get_settings()
    if not settings.smtp_settings.host:
        raise HTTPException(status_code=400, detail="SMTP settings not configured")
    
    await send_email(
        to_email=settings.email,
        subject="Test Email from Weddings By Mark CRM",
        body="This is a test email to verify your SMTP settings are working correctly.\n\nIf you received this, your email settings are configured properly!",
        settings=settings
    )
    return {"message": "Test email sent successfully"}

# ---------- EMAIL TEMPLATES ----------
@api_router.get("/email-templates", response_model=List[EmailTemplate])
async def get_email_templates():
    # Ensure default template exists
    await get_default_quote_template()
    templates = await db.email_templates.find({}, {"_id": 0}).to_list(100)
    return [EmailTemplate(**serialize_doc(t)) for t in templates]

@api_router.get("/email-templates/{template_id}", response_model=EmailTemplate)
async def get_email_template(template_id: str):
    template = await db.email_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return EmailTemplate(**serialize_doc(template))

@api_router.post("/email-templates", response_model=EmailTemplate)
async def create_email_template(template: EmailTemplateCreate):
    et = EmailTemplate(**template.model_dump())
    doc = et.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.email_templates.insert_one(doc)
    return et

@api_router.put("/email-templates/{template_id}", response_model=EmailTemplate)
async def update_email_template(template_id: str, update: EmailTemplateUpdate):
    template = await db.email_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.email_templates.update_one({"id": template_id}, {"$set": update_data})
    updated = await db.email_templates.find_one({"id": template_id}, {"_id": 0})
    return EmailTemplate(**serialize_doc(updated))

# ---------- LEADS ----------
@api_router.post("/leads", response_model=Lead)
async def create_lead(lead_data: LeadCreate):
    lead = Lead(**lead_data.model_dump())
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.leads.insert_one(doc)
    logger.info(f"New lead created: {lead.partner1_name} & {lead.partner2_name}")
    return lead

@api_router.get("/leads", response_model=List[Lead])
async def get_leads(status: Optional[LeadStatus] = None):
    query = {}
    if status:
        query['status'] = status.value
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Lead(**serialize_doc(l)) for l in leads]

@api_router.get("/leads/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return Lead(**serialize_doc(lead))

@api_router.put("/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, update: LeadUpdate):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        if 'status' in update_data:
            update_data['status'] = update_data['status'].value if hasattr(update_data['status'], 'value') else update_data['status']
        await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return Lead(**serialize_doc(updated))

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted"}

# ---------- PACKAGES (Main Packages & Add-ons) ----------
@api_router.post("/packages", response_model=Package)
async def create_package(package: PackageCreate):
    pkg = Package(**package.model_dump())
    doc = pkg.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['package_type'] = doc['package_type'].value if hasattr(doc['package_type'], 'value') else doc['package_type']
    await db.packages.insert_one(doc)
    return pkg

@api_router.get("/packages", response_model=List[Package])
async def get_packages(package_type: Optional[PackageType] = None, active_only: bool = True):
    query = {}
    if active_only:
        query['is_active'] = True
    if package_type:
        query['package_type'] = package_type.value
    packages = await db.packages.find(query, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return [Package(**serialize_doc(p)) for p in packages]

@api_router.get("/packages/{package_id}", response_model=Package)
async def get_package(package_id: str):
    package = await db.packages.find_one({"id": package_id}, {"_id": 0})
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return Package(**serialize_doc(package))

@api_router.put("/packages/{package_id}", response_model=Package)
async def update_package(package_id: str, update: PackageUpdate):
    package = await db.packages.find_one({"id": package_id}, {"_id": 0})
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if 'package_type' in update_data:
        update_data['package_type'] = update_data['package_type'].value if hasattr(update_data['package_type'], 'value') else update_data['package_type']
    if update_data:
        await db.packages.update_one({"id": package_id}, {"$set": update_data})
    updated = await db.packages.find_one({"id": package_id}, {"_id": 0})
    return Package(**serialize_doc(updated))

@api_router.delete("/packages/{package_id}")
async def delete_package(package_id: str):
    await db.packages.update_one({"id": package_id}, {"$set": {"is_active": False}})
    return {"message": "Package deactivated"}

# ---------- QUOTES (with Package Builder) ----------
@api_router.post("/quotes", response_model=Quote)
async def send_quote(quote_data: QuoteSend):
    lead = await db.leads.find_one({"id": quote_data.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Fetch all selected packages
    items = []
    subtotal = 0
    for pkg_id in quote_data.package_ids:
        package = await db.packages.find_one({"id": pkg_id}, {"_id": 0})
        if package:
            quantity = quote_data.quantities.get(pkg_id, 1) if quote_data.quantities else 1
            item_total = package['price'] * quantity
            items.append(QuoteItem(
                package_id=pkg_id,
                name=package['name'],
                description=package['description'],
                price=package['price'],
                package_type=package['package_type'],
                quantity=quantity,
                includes=package.get('includes', [])  # Include what's in the package
            ))
            subtotal += item_total
    
    total = subtotal - quote_data.discount
    valid_until = (datetime.now(timezone.utc) + timedelta(days=quote_data.valid_days)).strftime("%Y-%m-%d")
    
    quote = Quote(
        lead_id=quote_data.lead_id,
        items=items,
        subtotal=subtotal,
        discount=quote_data.discount,
        discount_note=quote_data.discount_note,
        total=total,
        custom_message=quote_data.custom_message,
        valid_until=valid_until
    )
    
    doc = quote.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['items'] = [item.model_dump() for item in items]
    await db.quotes.insert_one(doc)
    
    # Update lead status
    await db.leads.update_one(
        {"id": quote_data.lead_id},
        {"$set": {"status": LeadStatus.QUOTE_SENT.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    logger.info(f"Quote sent to lead {quote_data.lead_id} with {len(items)} items, total: £{total}")
    return quote

@api_router.get("/quotes", response_model=List[Quote])
async def get_quotes():
    quotes = await db.quotes.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    valid_quotes = []
    for q in quotes:
        try:
            serialized = serialize_doc(q)
            quote_obj = Quote(**serialized)
            valid_quotes.append(quote_obj)
        except Exception as e:
            logger.warning(f"Skipping invalid quote {q.get('id', 'unknown')}: {str(e)}")
            continue
    return valid_quotes

@api_router.get("/quotes/lead/{lead_id}", response_model=List[Quote])
async def get_quotes_for_lead(lead_id: str):
    quotes = await db.quotes.find({"lead_id": lead_id}, {"_id": 0}).to_list(100)
    return [Quote(**serialize_doc(q)) for q in quotes]

@api_router.get("/quotes/{quote_id}", response_model=Quote)
async def get_quote(quote_id: str):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return Quote(**serialize_doc(quote))

@api_router.post("/quotes/{quote_id}/send-email")
async def send_quote_email(quote_id: str, background_tasks: BackgroundTasks):
    """Send quote email to lead"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    lead = await db.leads.find_one({"id": quote['lead_id']}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    settings = await get_settings()
    template = await get_default_quote_template()
    
    # Generate quote view token (use quote id for now)
    quote_token = quote_id
    
    # Build the quote link - use frontend URL
    frontend_url = os.environ.get('FRONTEND_URL', 'https://booking.perfectweddingsbymark.uk')
    quote_link = f"{frontend_url}/view-quote/{quote_token}"
    
    # Replace placeholders in template
    body = template.body
    body = body.replace('%client_name%', f"{lead['partner1_name']} & {lead['partner2_name']}")
    body = body.replace('%partner1_name%', lead['partner1_name'])
    body = body.replace('%partner2_name%', lead['partner2_name'])
    body = body.replace('%wedding_date%', lead.get('wedding_date', 'TBC'))
    body = body.replace('%quote_link%', quote_link)
    body = body.replace('%phone%', settings.phone)
    body = body.replace('%email%', settings.email)
    body = body.replace('%deposit_amount%', str(int(settings.deposit_amount)))
    body = body.replace('%sort_code%', settings.bank_details.sort_code)
    body = body.replace('%account_number%', settings.bank_details.account_number)
    body = body.replace('%account_name%', settings.bank_details.account_name)
    
    subject = template.subject
    subject = subject.replace('%client_name%', f"{lead['partner1_name']} & {lead['partner2_name']}")
    
    # Send the email
    await send_email(
        to_email=lead['email'],
        subject=subject,
        body=body,
        settings=settings
    )
    
    # Update quote status
    await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat()}})
    
    # Update lead status
    await db.leads.update_one(
        {"id": lead['id']},
        {"$set": {"status": LeadStatus.QUOTE_SENT.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    logger.info(f"Quote email sent to {lead['email']} for quote {quote_id}")
    return {"message": "Quote email sent successfully", "sent_to": lead['email']}

# ---------- PUBLIC QUOTE VIEW ----------
@api_router.get("/public/quote/{quote_id}")
async def get_public_quote(quote_id: str):
    """Public endpoint for clients to view their quote"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    lead = await db.leads.find_one({"id": quote['lead_id']}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    settings = await get_settings()
    
    # Get all active packages for display
    packages = await db.packages.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    
    return {
        "quote": Quote(**serialize_doc(quote)).model_dump(),
        "lead": {
            "partner1_name": lead['partner1_name'],
            "partner2_name": lead['partner2_name'],
            "email": lead['email'],
            "wedding_date": lead.get('wedding_date'),
            "venue": lead.get('venue')
        },
        "packages": [Package(**serialize_doc(p)).model_dump() for p in packages],
        "business": {
            "name": settings.business_name,
            "address": settings.address,
            "phone": settings.phone,
            "email": settings.email,
            "website": settings.website,
            "logo_url": settings.logo_url,
            "bank_details": settings.bank_details.model_dump(),
            "deposit_amount": settings.deposit_amount
        },
        "valid_until": quote.get('valid_until')
    }

@api_router.post("/public/quote/{quote_id}/accept")
async def accept_public_quote(quote_id: str, body: dict):
    """Client accepts quote - creates job, invoice, contract and sends emails"""
    selected_packages = body.get('selected_packages', [])
    
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if quote.get('status') == 'accepted':
        raise HTTPException(status_code=400, detail="Quote has already been accepted")
    
    lead = await db.leads.find_one({"id": quote['lead_id']}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    settings = await get_settings()
    
    # Update quote with selected packages
    selected_items = [item for item in quote.get('items', []) if item.get('package_id') in selected_packages]
    if not selected_items:
        raise HTTPException(status_code=400, detail="Please select at least one package")
    
    # Calculate totals
    new_subtotal = sum(item['price'] * item.get('quantity', 1) for item in selected_items)
    discount = quote.get('discount', 0)
    new_total = new_subtotal - discount
    
    # Update quote status
    await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {
            "selected_items": selected_items,
            "selected_subtotal": new_subtotal,
            "selected_total": new_total,
            "status": "accepted",
            "accepted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create package summary for job
    package_summary = ", ".join([f"{item['name']}" + (f" x{item['quantity']}" if item.get('quantity', 1) > 1 else "") for item in selected_items])
    
    # Create the Job
    job = Job(
        lead_id=lead['id'],
        quote_id=quote_id,
        partner1_name=lead['partner1_name'],
        partner2_name=lead['partner2_name'],
        email=lead['email'],
        phone=lead.get('phone', ''),
        wedding_date=lead.get('wedding_date', ''),
        venue=lead.get('venue'),
        package_summary=package_summary,
        package_price=new_total
    )
    job_doc = job.model_dump()
    job_doc['created_at'] = job_doc['created_at'].isoformat()
    await db.jobs.insert_one(job_doc)
    
    # Create Invoice
    line_items = []
    for item in selected_items:
        qty = item.get('quantity', 1)
        line_items.append(InvoiceLineItem(
            description=item['name'],
            quantity=qty,
            unit_price=item['price'],
            amount=item['price'] * qty
        ).model_dump())
    
    # Add discount as negative line item if applicable
    if discount > 0:
        line_items.append(InvoiceLineItem(
            description=f"Discount{' - ' + quote.get('discount_note') if quote.get('discount_note') else ''}",
            quantity=1,
            unit_price=-discount,
            amount=-discount
        ).model_dump())
    
    # Calculate dates
    wedding_date = datetime.strptime(lead.get('wedding_date', datetime.now(timezone.utc).strftime('%Y-%m-%d')), '%Y-%m-%d') if lead.get('wedding_date') else datetime.now(timezone.utc)
    deposit_due = (datetime.now(timezone.utc) + timedelta(days=settings.deposit_days)).strftime('%Y-%m-%d')
    balance_due = (wedding_date - timedelta(days=settings.balance_days_before)).strftime('%Y-%m-%d')
    
    # Invoice number
    count = await db.invoices.count_documents({})
    invoice_number = f"WBM-{datetime.now().year}-{str(count + 1).zfill(4)}"
    
    invoice = Invoice(
        job_id=job.id,
        invoice_number=invoice_number,
        partner1_name=lead['partner1_name'],
        partner2_name=lead['partner2_name'],
        email=lead['email'],
        wedding_date=lead.get('wedding_date', ''),
        line_items=line_items,
        subtotal=new_subtotal,
        discount=discount,
        total_amount=new_total,
        deposit_amount=settings.deposit_amount,
        balance_amount=new_total - settings.deposit_amount,
        deposit_due_date=deposit_due,
        balance_due_date=balance_due,
        status="pending",
        sync_to_accounts=False
    )
    invoice_doc = invoice.model_dump()
    invoice_doc['created_at'] = invoice_doc['created_at'].isoformat()
    await db.invoices.insert_one(invoice_doc)
    
    # Update job with invoice ID
    await db.jobs.update_one({"id": job.id}, {"$set": {"invoice_id": invoice.id}})
    
    # Create Contract from first active template
    contract_template = await db.contract_templates.find_one({"is_active": True}, {"_id": 0})
    contract_id = None
    if contract_template:
        # Replace placeholders in contract
        contract_content = contract_template['content']
        contract_content = contract_content.replace('{{partner1_name}}', lead['partner1_name'])
        contract_content = contract_content.replace('{{partner2_name}}', lead['partner2_name'])
        contract_content = contract_content.replace('{{wedding_date}}', lead.get('wedding_date', 'TBC'))
        contract_content = contract_content.replace('{{package_name}}', package_summary)
        contract_content = contract_content.replace('{{package_price}}', f"£{new_total:,.2f}")
        contract_content = contract_content.replace('{{deposit_amount}}', f"£{settings.deposit_amount:,.2f}")
        contract_content = contract_content.replace('{{balance_amount}}', f"£{new_total - settings.deposit_amount:,.2f}")
        contract_content = contract_content.replace('{{venue}}', lead.get('venue', 'TBC'))
        
        contract_doc = {
            "id": str(uuid.uuid4()),
            "job_id": job.id,
            "template_id": contract_template['id'],
            "content": contract_content,
            "status": "pending_signature",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.contracts.insert_one(contract_doc)
        contract_id = contract_doc['id']
        await db.jobs.update_one({"id": job.id}, {"$set": {"contract_id": contract_id}})
    
    # Update lead status
    await db.leads.update_one(
        {"id": lead['id']},
        {"$set": {"status": LeadStatus.BOOKED.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Build portal URL
    frontend_url = os.environ.get('FRONTEND_URL', 'https://booking.perfectweddingsbymark.uk')
    portal_url = f"{frontend_url}/portal/{job.portal_token}"
    
    # Build items list for emails
    items_list = "\n".join([f"  • {item['name']} - £{item['price'] * item.get('quantity', 1):,.2f}" for item in selected_items])
    
    # ============ EMAIL TO MARK (Notification) ============
    notification_body = f"""🎉 NEW BOOKING ALERT! 🎉

{lead['partner1_name']} & {lead['partner2_name']} have accepted their quote and booked you for their wedding!

Wedding Date: {lead.get('wedding_date', 'TBC')}
Venue: {lead.get('venue', 'TBC')}
Email: {lead['email']}
Phone: {lead.get('phone', 'Not provided')}

Selected Package(s):
{items_list}

Subtotal: £{new_subtotal:,.2f}
Discount: -£{discount:,.2f}
Total: £{new_total:,.2f}

Deposit Due: £{settings.deposit_amount:,.2f} by {deposit_due}
Balance Due: £{new_total - settings.deposit_amount:,.2f} by {balance_due}

---
Job, Invoice, and Contract have been automatically created.
Log in to your CRM to view the details.
"""
    
    try:
        await send_email(
            to_email=settings.email,
            subject=f"🎉 NEW BOOKING: {lead['partner1_name']} & {lead['partner2_name']}",
            body=notification_body,
            settings=settings
        )
        logger.info(f"Booking notification sent to {settings.email}")
    except Exception as e:
        logger.error(f"Failed to send booking notification to Mark: {str(e)}")
    
    # ============ EMAIL TO CLIENT (Booking Confirmation + Portal Link) ============
    client_body = f"""Dear {lead['partner1_name']} & {lead['partner2_name']},

Thank you so much for booking Weddings By Mark for your wedding photography! I'm absolutely thrilled to be a part of your special day.

Here's a summary of your booking:

Wedding Date: {lead.get('wedding_date', 'TBC')}
Venue: {lead.get('venue', 'TBC')}

Your Package:
{items_list}

Total: £{new_total:,.2f}

Payment Schedule:
  • Deposit: £{settings.deposit_amount:,.2f} - due by {deposit_due}
  • Balance: £{new_total - settings.deposit_amount:,.2f} - due by {balance_due}

Bank Transfer Details:
  Sort Code: {settings.bank_details.sort_code}
  Account Number: {settings.bank_details.account_number}
  Account Name: {settings.bank_details.account_name}
  Reference: {lead['partner1_name']} & {lead['partner2_name']}

YOUR CLIENT PORTAL

You can access your personal portal to view your invoice, contract, and fill out your booking form:

{portal_url}

Please sign your contract in the portal to confirm your booking.

If you have any questions at all, please don't hesitate to get in touch. I can't wait to capture your beautiful wedding day!

Best wishes,
Mark
{settings.business_name}
{settings.phone}
{settings.email}
"""
    
    try:
        await send_email(
            to_email=lead['email'],
            subject=f"Booking Confirmed! Welcome to {settings.business_name} 💍",
            body=client_body,
            settings=settings
        )
        logger.info(f"Booking confirmation sent to client: {lead['email']}")
    except Exception as e:
        logger.error(f"Failed to send booking confirmation to client: {str(e)}")
    
    return {
        "message": "Quote accepted! Check your email for your booking confirmation and portal access.",
        "success": True,
        "portal_url": portal_url,
        "job_id": job.id
    }

# ---------- CONTRACT TEMPLATES ----------
@api_router.post("/contract-templates", response_model=ContractTemplate)
async def create_contract_template(template: ContractTemplateCreate):
    ct = ContractTemplate(**template.model_dump())
    doc = ct.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.contract_templates.insert_one(doc)
    return ct

@api_router.get("/contract-templates", response_model=List[ContractTemplate])
async def get_contract_templates(active_only: bool = True):
    query = {"is_active": True} if active_only else {}
    templates = await db.contract_templates.find(query, {"_id": 0}).to_list(100)
    return [ContractTemplate(**serialize_doc(t)) for t in templates]

@api_router.put("/contract-templates/{template_id}", response_model=ContractTemplate)
async def update_contract_template(template_id: str, template: ContractTemplateCreate):
    existing = await db.contract_templates.find_one({"id": template_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.contract_templates.update_one({"id": template_id}, {"$set": template.model_dump()})
    updated = await db.contract_templates.find_one({"id": template_id}, {"_id": 0})
    return ContractTemplate(**serialize_doc(updated))

# ---------- BOOKING FORM TEMPLATES ----------
@api_router.get("/booking-form-template")
async def get_booking_form_template():
    """Get the active booking form template"""
    template = await db.booking_form_templates.find_one({"is_active": True}, {"_id": 0})
    if not template:
        # Create default template with common wedding questions
        default_fields = [
            BookingFormField(
                label="Ceremony Start Time",
                field_type="time",
                required=True,
                placeholder="e.g., 14:00"
            ),
            BookingFormField(
                label="Where will the bride/partner 1 be getting ready?",
                field_type="text",
                required=True,
                placeholder="e.g., Home address or hotel name"
            ),
            BookingFormField(
                label="Where will the groom/partner 2 be getting ready?",
                field_type="text",
                required=True,
                placeholder="e.g., Home address or hotel name"
            ),
            BookingFormField(
                label="Reception Venue (if different from ceremony)",
                field_type="text",
                required=False,
                placeholder="Leave blank if same venue"
            ),
            BookingFormField(
                label="Approximate number of guests",
                field_type="text",
                required=True,
                placeholder="e.g., 80"
            ),
            BookingFormField(
                label="Key family members to photograph (names & relationships)",
                field_type="textarea",
                required=True,
                placeholder="e.g., John Smith (Father of Bride), Mary Smith (Mother of Bride)"
            ),
            BookingFormField(
                label="Any special moments or requests to capture?",
                field_type="textarea",
                required=False,
                placeholder="e.g., Surprise during speeches, first look, specific group shots"
            ),
            BookingFormField(
                label="Will there be confetti? If so, when?",
                field_type="text",
                required=False,
                placeholder="e.g., After ceremony outside church"
            ),
            BookingFormField(
                label="Emergency contact name and number",
                field_type="text",
                required=True,
                placeholder="e.g., Best Man - John - 07xxx"
            ),
            BookingFormField(
                label="Any dietary requirements for the photographer?",
                field_type="text",
                required=False,
                placeholder="e.g., Vegetarian, allergies"
            ),
            BookingFormField(
                label="Anything else I should know?",
                field_type="textarea",
                required=False,
                placeholder="Any other details that might help me prepare"
            ),
        ]
        
        default_template = BookingFormTemplate(
            name="Wedding Details Form",
            fields=default_fields,
            intro_text="Please fill in the details below to help me prepare for your special day. The more information you can provide, the better I can capture all your precious moments!"
        )
        doc = default_template.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        # Convert field objects to dicts
        doc['fields'] = [f.model_dump() for f in default_fields]
        await db.booking_form_templates.insert_one(doc)
        template = doc
    
    return template

@api_router.put("/booking-form-template")
async def update_booking_form_template(template_data: dict):
    """Update the booking form template"""
    existing = await db.booking_form_templates.find_one({"is_active": True}, {"_id": 0})
    if existing:
        await db.booking_form_templates.update_one(
            {"id": existing['id']},
            {"$set": {
                "name": template_data.get('name', existing['name']),
                "intro_text": template_data.get('intro_text', existing['intro_text']),
                "fields": template_data.get('fields', existing['fields'])
            }}
        )
    else:
        # Create new
        new_template = {
            "id": str(uuid.uuid4()),
            "name": template_data.get('name', 'Wedding Details Form'),
            "intro_text": template_data.get('intro_text', ''),
            "fields": template_data.get('fields', []),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.booking_form_templates.insert_one(new_template)
    
    return await get_booking_form_template()

@api_router.post("/booking-form-template/add-field")
async def add_booking_form_field(field_data: dict):
    """Add a new field to the booking form"""
    template = await db.booking_form_templates.find_one({"is_active": True}, {"_id": 0})
    if not template:
        await get_booking_form_template()  # Create default
        template = await db.booking_form_templates.find_one({"is_active": True}, {"_id": 0})
    
    new_field = {
        "id": str(uuid.uuid4()),
        "label": field_data.get('label', ''),
        "field_type": field_data.get('field_type', 'text'),
        "required": field_data.get('required', False),
        "options": field_data.get('options', []),
        "placeholder": field_data.get('placeholder', '')
    }
    
    fields = template.get('fields', [])
    fields.append(new_field)
    
    await db.booking_form_templates.update_one(
        {"id": template['id']},
        {"$set": {"fields": fields}}
    )
    
    return await get_booking_form_template()

@api_router.delete("/booking-form-template/field/{field_id}")
async def delete_booking_form_field(field_id: str):
    """Delete a field from the booking form"""
    template = await db.booking_form_templates.find_one({"is_active": True}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="No booking form template found")
    
    fields = [f for f in template.get('fields', []) if f.get('id') != field_id]
    
    await db.booking_form_templates.update_one(
        {"id": template['id']},
        {"$set": {"fields": fields}}
    )
    
    return await get_booking_form_template()

# ---------- BOOKING FORM RESPONSES (Client Portal) ----------
@api_router.get("/public/booking-form/{job_id}")
async def get_booking_form_for_job(job_id: str):
    """Get booking form for a specific job (client portal)"""
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    template = await get_booking_form_template()
    
    # Check if already submitted
    existing_response = await db.booking_form_responses.find_one({"job_id": job_id}, {"_id": 0})
    
    return {
        "template": template,
        "existing_response": existing_response,
        "job": {
            "partner1_name": job['partner1_name'],
            "partner2_name": job['partner2_name'],
            "wedding_date": job.get('wedding_date'),
            "venue": job.get('venue')
        }
    }

@api_router.post("/public/booking-form/{job_id}/submit")
async def submit_booking_form(job_id: str, responses: dict):
    """Submit booking form responses"""
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if already submitted
    existing = await db.booking_form_responses.find_one({"job_id": job_id}, {"_id": 0})
    
    if existing:
        # Update existing
        await db.booking_form_responses.update_one(
            {"job_id": job_id},
            {"$set": {
                "responses": responses.get('responses', {}),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        # Create new
        form_response = BookingFormResponse(
            job_id=job_id,
            responses=responses.get('responses', {})
        )
        doc = form_response.model_dump()
        doc['submitted_at'] = doc['submitted_at'].isoformat()
        await db.booking_form_responses.insert_one(doc)
        
        # Update job to mark form as completed
        await db.jobs.update_one(
            {"id": job_id},
            {"$set": {"booking_form_completed": True}}
        )
    
    # Send notification email to Mark
    settings = await get_settings()
    
    # Build responses summary
    template = await get_booking_form_template()
    fields_map = {f['id']: f['label'] for f in template.get('fields', [])}
    
    responses_text = "\n".join([
        f"  • {fields_map.get(k, k)}: {v}" 
        for k, v in responses.get('responses', {}).items() 
        if v
    ])
    
    notification_body = f"""📋 BOOKING FORM SUBMITTED

{job['partner1_name']} & {job['partner2_name']} have filled out their booking form!

Wedding Date: {job.get('wedding_date', 'TBC')}
Venue: {job.get('venue', 'TBC')}

Form Responses:
{responses_text}

---
Log in to your CRM to view the full details.
"""
    
    try:
        await send_email(
            to_email=settings.email,
            subject=f"📋 Booking Form: {job['partner1_name']} & {job['partner2_name']}",
            body=notification_body,
            settings=settings
        )
        logger.info(f"Booking form notification sent to {settings.email}")
    except Exception as e:
        logger.error(f"Failed to send booking form notification: {str(e)}")
    
    return {"message": "Booking form submitted successfully!", "success": True}

# ---------- JOBS ----------
@api_router.post("/jobs/accept-quote/{quote_id}")
async def accept_quote_create_job(quote_id: str, contract_template_id: str):
    """When client accepts quote, create job with invoice, contract, and booking form"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    lead = await db.leads.find_one({"id": quote['lead_id']}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    contract_template = await db.contract_templates.find_one({"id": contract_template_id}, {"_id": 0})
    if not contract_template:
        raise HTTPException(status_code=404, detail="Contract template not found")
    
    settings = await get_settings()
    wedding_date = lead.get('wedding_date') or (datetime.now(timezone.utc) + timedelta(days=180)).strftime("%Y-%m-%d")
    
    # Build package summary from quote items
    package_names = [item['name'] for item in quote.get('items', [])]
    package_summary = ", ".join(package_names) if package_names else "Custom Package"
    
    # Create Job
    job = Job(
        lead_id=lead['id'],
        quote_id=quote_id,
        partner1_name=lead['partner1_name'],
        partner2_name=lead['partner2_name'],
        email=lead['email'],
        phone=lead['phone'],
        wedding_date=wedding_date,
        venue=lead.get('venue'),
        package_summary=package_summary,
        package_price=quote['total']
    )
    
    # Calculate payment dates
    deposit_due = (datetime.now(timezone.utc) + timedelta(days=settings.deposit_days)).strftime("%Y-%m-%d")
    wedding_dt = datetime.strptime(wedding_date, "%Y-%m-%d")
    balance_due = (wedding_dt - timedelta(days=settings.balance_days_before)).strftime("%Y-%m-%d")
    
    # Create Invoice with line items from quote
    invoice_number = await get_next_invoice_number()
    deposit_amount = settings.deposit_amount  # Fixed £ deposit
    
    line_items = []
    for item in quote.get('items', []):
        line_items.append(InvoiceLineItem(
            description=f"{item['name']}" + (f" x{item['quantity']}" if item['quantity'] > 1 else ""),
            quantity=item['quantity'],
            unit_price=item['price'],
            amount=item['price'] * item['quantity']
        ))
    
    invoice = Invoice(
        job_id=job.id,
        invoice_number=invoice_number,
        partner1_name=lead['partner1_name'],
        partner2_name=lead['partner2_name'],
        email=lead['email'],
        wedding_date=wedding_date,
        line_items=line_items,
        subtotal=quote['subtotal'],
        discount=quote.get('discount', 0),
        discount_note=quote.get('discount_note'),
        total_amount=quote['total'],
        deposit_amount=deposit_amount,
        deposit_due_date=deposit_due,
        balance_amount=quote['total'] - deposit_amount,
        balance_due_date=balance_due
    )
    
    # Create Contract with replaced placeholders
    contract_content = contract_template['content']
    contract_content = contract_content.replace("{{partner1_name}}", lead['partner1_name'])
    contract_content = contract_content.replace("{{partner2_name}}", lead['partner2_name'])
    contract_content = contract_content.replace("{{wedding_date}}", wedding_date)
    contract_content = contract_content.replace("{{package_name}}", package_summary)
    contract_content = contract_content.replace("{{package_price}}", f"£{quote['total']:,.2f}")
    contract_content = contract_content.replace("{{deposit_amount}}", f"£{deposit_amount:,.2f}")
    contract_content = contract_content.replace("{{balance_amount}}", f"£{quote['total'] - deposit_amount:,.2f}")
    
    contract = Contract(
        job_id=job.id,
        template_id=contract_template_id,
        content=contract_content,
        partner1_name=lead['partner1_name'],
        partner2_name=lead['partner2_name'],
        wedding_date=wedding_date
    )
    
    # Create Booking Form
    booking_form = BookingForm(
        job_id=job.id,
        partner1_name=lead['partner1_name'],
        partner1_email=lead['email'],
        partner1_phone=lead['phone'],
        partner2_name=lead['partner2_name'],
        wedding_date=wedding_date,
        ceremony_venue=lead.get('venue')
    )
    
    # Update job with IDs
    job.invoice_id = invoice.id
    job.contract_id = contract.id
    job.booking_form_id = booking_form.id
    
    # Save all to database
    job_doc = job.model_dump()
    job_doc['created_at'] = job_doc['created_at'].isoformat()
    await db.jobs.insert_one(job_doc)
    
    invoice_doc = invoice.model_dump()
    invoice_doc['created_at'] = invoice_doc['created_at'].isoformat()
    invoice_doc['updated_at'] = invoice_doc['updated_at'].isoformat()
    invoice_doc['line_items'] = [item.model_dump() for item in line_items]
    await db.invoices.insert_one(invoice_doc)
    
    contract_doc = contract.model_dump()
    contract_doc['created_at'] = contract_doc['created_at'].isoformat()
    await db.contracts.insert_one(contract_doc)
    
    booking_form_doc = booking_form.model_dump()
    booking_form_doc['created_at'] = booking_form_doc['created_at'].isoformat()
    await db.booking_forms.insert_one(booking_form_doc)
    
    # Update lead status to booked
    await db.leads.update_one(
        {"id": lead['id']},
        {"$set": {"status": LeadStatus.BOOKED.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update quote status
    await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "accepted"}})
    
    logger.info(f"Job created for {lead['partner1_name']} & {lead['partner2_name']}")
    
    return {
        "job": job.model_dump(),
        "invoice": invoice.model_dump(),
        "contract": contract.model_dump(),
        "booking_form": booking_form.model_dump(),
        "portal_url": f"/portal/{job.portal_token}"
    }

@api_router.get("/jobs", response_model=List[Job])
async def get_jobs(status: Optional[str] = None):
    query = {}
    if status:
        query['status'] = status
    jobs = await db.jobs.find(query, {"_id": 0}).sort("wedding_date", 1).to_list(1000)
    valid_jobs = []
    for j in jobs:
        try:
            serialized = serialize_doc(j)
            job_obj = Job(**serialized)
            valid_jobs.append(job_obj)
        except Exception as e:
            logger.warning(f"Skipping invalid job {j.get('id', 'unknown')}: {str(e)}")
            continue
    return valid_jobs

@api_router.get("/jobs/{job_id}", response_model=Job)
async def get_job(job_id: str):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return Job(**serialize_doc(job))

# ---------- INVOICES (Fully Editable) ----------
@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(status: Optional[InvoiceStatus] = None):
    query = {}
    if status:
        query['status'] = status.value
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    valid_invoices = []
    for i in invoices:
        try:
            serialized = serialize_doc(i)
            invoice_obj = Invoice(**serialized)
            valid_invoices.append(invoice_obj)
        except Exception as e:
            logger.warning(f"Skipping invalid invoice {i.get('id', 'unknown')}: {str(e)}")
            continue
    return valid_invoices

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return Invoice(**serialize_doc(invoice))

@api_router.put("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(invoice_id: str, update: InvoiceUpdate):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    settings = await get_settings()
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # If line items are being updated, recalculate everything
    if 'line_items' in update_data:
        new_line_items = []
        for item in update_data['line_items']:
            new_item = {
                'id': item.get('id') or str(uuid.uuid4()),
                'description': item['description'],
                'quantity': item.get('quantity', 1),
                'unit_price': item['unit_price'],
                'amount': item.get('quantity', 1) * item['unit_price']
            }
            new_line_items.append(new_item)
        update_data['line_items'] = new_line_items
        
        # Recalculate totals
        subtotal = sum(item['amount'] for item in new_line_items)
        discount = update_data.get('discount', invoice.get('discount', 0))
        total = subtotal - discount
        deposit_amount = update_data.get('deposit_amount', invoice.get('deposit_amount', settings.deposit_amount))
        balance_amount = total - deposit_amount
        
        update_data['subtotal'] = subtotal
        update_data['total_amount'] = total
        update_data['balance_amount'] = balance_amount
    
    # If just discount changed, recalculate
    elif 'discount' in update_data:
        subtotal = invoice.get('subtotal', 0)
        total = subtotal - update_data['discount']
        deposit_amount = invoice.get('deposit_amount', settings.deposit_amount)
        balance_amount = total - deposit_amount
        
        update_data['total_amount'] = total
        update_data['balance_amount'] = balance_amount
    
    # If deposit amount changed, recalculate balance
    elif 'deposit_amount' in update_data:
        total = invoice.get('total_amount', 0)
        balance_amount = total - update_data['deposit_amount']
        update_data['balance_amount'] = balance_amount
    
    # Update status based on payments
    if update_data.get('deposit_paid') and update_data.get('balance_paid'):
        update_data['status'] = InvoiceStatus.FULLY_PAID.value
    elif update_data.get('deposit_paid'):
        update_data['status'] = InvoiceStatus.DEPOSIT_PAID.value
    elif update_data.get('balance_paid') and invoice.get('deposit_paid'):
        update_data['status'] = InvoiceStatus.FULLY_PAID.value
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if update_data:
        await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    
    updated = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return Invoice(**serialize_doc(updated))

@api_router.post("/invoices/{invoice_id}/add-item", response_model=Invoice)
async def add_invoice_item(invoice_id: str, item: InvoiceLineItemUpdate):
    """Add a single line item to an existing invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    settings = await get_settings()
    
    # Create new line item
    new_item = {
        'id': str(uuid.uuid4()),
        'description': item.description,
        'quantity': item.quantity,
        'unit_price': item.unit_price,
        'amount': item.quantity * item.unit_price
    }
    
    # Add to existing items
    line_items = invoice.get('line_items', [])
    line_items.append(new_item)
    
    # Recalculate totals
    subtotal = sum(i['amount'] for i in line_items)
    discount = invoice.get('discount', 0)
    total = subtotal - discount
    deposit_amount = invoice.get('deposit_amount', settings.deposit_amount)
    balance_amount = total - deposit_amount
    
    update_data = {
        'line_items': line_items,
        'subtotal': subtotal,
        'total_amount': total,
        'balance_amount': balance_amount,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    updated = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return Invoice(**serialize_doc(updated))

@api_router.delete("/invoices/{invoice_id}/item/{item_id}", response_model=Invoice)
async def remove_invoice_item(invoice_id: str, item_id: str):
    """Remove a line item from an invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    settings = await get_settings()
    
    # Remove item
    line_items = [i for i in invoice.get('line_items', []) if i.get('id') != item_id]
    
    # Recalculate totals
    subtotal = sum(i['amount'] for i in line_items)
    discount = invoice.get('discount', 0)
    total = subtotal - discount
    deposit_amount = invoice.get('deposit_amount', settings.deposit_amount)
    balance_amount = total - deposit_amount
    
    update_data = {
        'line_items': line_items,
        'subtotal': subtotal,
        'total_amount': total,
        'balance_amount': balance_amount,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    updated = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return Invoice(**serialize_doc(updated))

# ---------- CONTRACTS ----------
@api_router.get("/contracts", response_model=List[Contract])
async def get_contracts(status: Optional[ContractStatus] = None):
    query = {}
    if status:
        query['status'] = status.value
    contracts = await db.contracts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Contract(**serialize_doc(c)) for c in contracts]

@api_router.get("/contracts/{contract_id}", response_model=Contract)
async def get_contract(contract_id: str):
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return Contract(**serialize_doc(contract))

@api_router.post("/contracts/{contract_id}/sign", response_model=Contract)
async def sign_contract(contract_id: str, sign_data: ContractSign):
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    update_data = {
        "signature_data": sign_data.signature_data,
        "signed_by": sign_data.signed_by,
        "signed_at": datetime.now(timezone.utc).isoformat(),
        "status": ContractStatus.SIGNED.value
    }
    
    await db.contracts.update_one({"id": contract_id}, {"$set": update_data})
    updated = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    return Contract(**serialize_doc(updated))

# ---------- BOOKING FORMS ----------
@api_router.get("/booking-forms/{form_id}", response_model=BookingForm)
async def get_booking_form(form_id: str):
    form = await db.booking_forms.find_one({"id": form_id}, {"_id": 0})
    if not form:
        raise HTTPException(status_code=404, detail="Booking form not found")
    return BookingForm(**serialize_doc(form))

@api_router.put("/booking-forms/{form_id}", response_model=BookingForm)
async def update_booking_form(form_id: str, update: BookingFormUpdate):
    form = await db.booking_forms.find_one({"id": form_id}, {"_id": 0})
    if not form:
        raise HTTPException(status_code=404, detail="Booking form not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        update_data['is_completed'] = True
        update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
        await db.booking_forms.update_one({"id": form_id}, {"$set": update_data})
    
    updated = await db.booking_forms.find_one({"id": form_id}, {"_id": 0})
    return BookingForm(**serialize_doc(updated))

# ---------- CLIENT PORTAL ----------
@api_router.get("/portal/{portal_token}")
async def get_client_portal(portal_token: str):
    """Get all client portal data by token"""
    job = await db.jobs.find_one({"portal_token": portal_token}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Portal not found")
    
    settings = await get_settings()
    invoice = await db.invoices.find_one({"id": job.get('invoice_id')}, {"_id": 0}) if job.get('invoice_id') else None
    contract = await db.contracts.find_one({"id": job.get('contract_id')}, {"_id": 0}) if job.get('contract_id') else None
    
    # Get booking form template and any existing responses
    booking_form_template = await db.booking_form_templates.find_one({"is_active": True}, {"_id": 0})
    booking_form_response = await db.booking_form_responses.find_one({"job_id": job['id']}, {"_id": 0})
    
    return {
        "business": {
            "name": settings.business_name,
            "address": settings.address,
            "phone": settings.phone,
            "email": settings.email,
            "website": settings.website,
            "logo_url": settings.logo_url,
            "bank_details": settings.bank_details.model_dump()
        },
        "job": Job(**serialize_doc(job)).model_dump() if job else None,
        "invoice": Invoice(**serialize_doc(invoice)).model_dump() if invoice else None,
        "contract": Contract(**serialize_doc(contract)).model_dump() if contract else None,
        "booking_form_template": booking_form_template,
        "booking_form_response": booking_form_response
    }

# ---------- PUBLIC ENQUIRY FORM ----------
@api_router.post("/enquiry", response_model=Lead)
async def submit_enquiry(enquiry: LeadCreate):
    """Public endpoint for website enquiry form"""
    lead_data = enquiry.model_dump()
    lead_data['source'] = "website"  # Override source for public enquiries
    lead = Lead(**lead_data)
    doc = lead.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.leads.insert_one(doc)
    logger.info(f"New enquiry from website: {lead.partner1_name} & {lead.partner2_name}")
    return lead

# ---------- DASHBOARD STATS ----------
@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard overview statistics"""
    now = datetime.now(timezone.utc)
    
    # Count leads by status
    total_leads = await db.leads.count_documents({})
    new_leads = await db.leads.count_documents({"status": LeadStatus.NEW.value})
    
    # Count jobs
    total_jobs = await db.jobs.count_documents({})
    
    # Upcoming weddings (next 90 days)
    future_date = (now + timedelta(days=90)).strftime("%Y-%m-%d")
    today = now.strftime("%Y-%m-%d")
    upcoming_jobs = await db.jobs.find(
        {"wedding_date": {"$gte": today, "$lte": future_date}, "status": "active"},
        {"_id": 0}
    ).sort("wedding_date", 1).to_list(10)
    
    # Invoice stats
    total_invoiced = 0
    total_received = 0
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(1000)
    for inv in invoices:
        total_invoiced += inv.get('total_amount', 0)
        if inv.get('deposit_paid'):
            total_received += inv.get('deposit_amount', 0)
        if inv.get('balance_paid'):
            total_received += inv.get('balance_amount', 0)
    
    # Pending payments
    pending_deposits = await db.invoices.count_documents({"deposit_paid": False, "status": {"$ne": InvoiceStatus.FULLY_PAID.value}})
    
    return {
        "total_leads": total_leads,
        "new_leads": new_leads,
        "total_jobs": total_jobs,
        "upcoming_weddings": [Job(**serialize_doc(j)).model_dump() for j in upcoming_jobs],
        "total_invoiced": total_invoiced,
        "total_received": total_received,
        "outstanding": total_invoiced - total_received,
        "pending_deposits": pending_deposits
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
