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
    account_name: str = "Weddings By Mark"
    sort_code: str = ""
    account_number: str = ""

class BusinessSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_name: str = "Weddings By Mark"
    address: str = "220 Ashurst Road, Manchester M22 5AX"
    phone: str = "07712 117357"
    email: str = "mark@perfectweddingsbymark.uk"
    website: str = "perfectweddingsbymark.uk"
    logo_url: str = "https://customer-assets.emergentagent.com/job_wedshutter/artifacts/3j0bbqt5_new%20logo%202022%20White%20with%20bevel.png"
    bank_details: BankDetails = Field(default_factory=BankDetails)
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
        await db.settings.update_one({"id": settings.id}, {"$set": update_data})
    updated = await db.settings.find_one({"id": settings.id}, {"_id": 0})
    return BusinessSettings(**updated)

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
                quantity=quantity
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
    booking_form = await db.booking_forms.find_one({"id": job.get('booking_form_id')}, {"_id": 0}) if job.get('booking_form_id') else None
    
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
        "booking_form": BookingForm(**serialize_doc(booking_form)).model_dump() if booking_form else None
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
