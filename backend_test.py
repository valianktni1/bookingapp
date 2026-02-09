#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class WeddingCRMTester:
    def __init__(self, base_url="https://photo-manager-17.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Store created IDs for cleanup and further testing
        self.created_lead_id = None
        self.created_main_package_id = None
        self.created_addon_ids = []
        self.created_contract_template_id = None
        self.created_quote_id = None
        self.created_job_id = None
        self.created_invoice_id = None
        self.portal_token = None

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {error}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "error": error
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return True, response_data
                except:
                    self.log_test(name, True, f"Status: {response.status_code} (No JSON)")
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                self.log_test(name, False, error=error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, error=f"Exception: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        return self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)

    def test_settings_get(self):
        """Test getting business settings"""
        return self.run_test("Get Settings", "GET", "settings", 200)

    def test_settings_update(self):
        """Test updating business settings"""
        settings_data = {
            "business_name": "Weddings By Mark Test",
            "email": "test@perfectweddingsbymark.uk",
            "phone": "07712 117357",
            "bank_details": {
                "account_name": "Weddings By Mark",
                "sort_code": "12-34-56",
                "account_number": "12345678"
            }
        }
        return self.run_test("Update Settings", "PUT", "settings", 200, settings_data)

    def test_create_lead(self):
        """Test creating a new lead"""
        lead_data = {
            "partner1_name": "John",
            "partner2_name": "Jane",
            "email": "john.jane@example.com",
            "phone": "07123456789",
            "wedding_date": (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d"),
            "venue": "Test Venue",
            "message": "Test enquiry message"
        }
        success, response = self.run_test("Create Lead", "POST", "leads", 200, lead_data)
        if success and response.get('id'):
            self.created_lead_id = response['id']
        return success, response

    def test_get_leads(self):
        """Test getting all leads"""
        return self.run_test("Get Leads", "GET", "leads", 200)

    def test_create_main_package(self):
        """Test creating a main package"""
        package_data = {
            "name": "Full Day Coverage",
            "description": "Complete wedding day photography package",
            "price": 1500.0,
            "package_type": "main",
            "includes": [
                "8 hours coverage",
                "500+ edited photos",
                "Online gallery",
                "USB drive"
            ],
            "sort_order": 1
        }
        success, response = self.run_test("Create Main Package", "POST", "packages", 200, package_data)
        if success and response.get('id'):
            self.created_main_package_id = response['id']
        return success, response

    def test_create_addons(self):
        """Test creating multiple add-ons"""
        addons = [
            {
                "name": "Extra Hour",
                "description": "Additional hour of photography coverage",
                "price": 150.0,
                "package_type": "addon",
                "sort_order": 1
            },
            {
                "name": "Selfie Booth",
                "description": "Fun selfie booth for guests",
                "price": 300.0,
                "package_type": "addon",
                "sort_order": 2
            },
            {
                "name": "Wedding Album",
                "description": "Premium wedding photo album",
                "price": 400.0,
                "package_type": "addon",
                "sort_order": 3
            },
            {
                "name": "Travel Charge",
                "description": "Additional travel costs for distant venues",
                "price": 50.0,
                "package_type": "addon",
                "sort_order": 4
            }
        ]
        
        for addon in addons:
            success, response = self.run_test(f"Create Add-on: {addon['name']}", "POST", "packages", 200, addon)
            if success and response.get('id'):
                self.created_addon_ids.append(response['id'])
        
        return len(self.created_addon_ids) == len(addons), {}

    def test_get_packages_by_type(self):
        """Test filtering packages by type"""
        # Test main packages
        success1, response1 = self.run_test("Get Main Packages", "GET", "packages?package_type=main", 200)
        
        # Test add-ons
        success2, response2 = self.run_test("Get Add-ons", "GET", "packages?package_type=addon", 200)
        
        # Test all packages
        success3, response3 = self.run_test("Get All Packages", "GET", "packages", 200)
        
        return success1 and success2 and success3, {}

    def test_send_quote_with_packages(self):
        """Test sending a quote with packages and add-ons"""
        if not self.created_lead_id or not self.created_main_package_id or not self.created_addon_ids:
            self.log_test("Send Quote with Packages", False, error="Missing lead, package, or addon IDs")
            return False, {}
        
        # Select main package + 2 add-ons with quantities
        package_ids = [self.created_main_package_id] + self.created_addon_ids[:2]
        quantities = {
            self.created_addon_ids[0]: 2,  # 2x Extra Hour
            self.created_addon_ids[1]: 1   # 1x Selfie Booth
        }
        
        quote_data = {
            "lead_id": self.created_lead_id,
            "package_ids": package_ids,
            "quantities": quantities,
            "discount": 100.0,
            "discount_note": "Early booking discount",
            "custom_message": "Thank you for choosing Weddings By Mark!",
            "valid_days": 14
        }
        success, response = self.run_test("Send Quote with Packages", "POST", "quotes", 200, quote_data)
        if success and response.get('id'):
            self.created_quote_id = response['id']
        return success, response

    def test_accept_quote_creates_invoice(self):
        """Test accepting quote creates job with detailed invoice"""
        if not self.created_quote_id or not self.created_contract_template_id:
            self.log_test("Accept Quote Creates Invoice", False, error="Missing quote or contract template ID")
            return False, {}
        
        endpoint = f"jobs/accept-quote/{self.created_quote_id}?contract_template_id={self.created_contract_template_id}"
        success, response = self.run_test("Accept Quote Creates Invoice", "POST", endpoint, 200)
        if success:
            self.created_job_id = response.get('job', {}).get('id')
            self.portal_token = response.get('job', {}).get('portal_token')
            self.created_invoice_id = response.get('invoice', {}).get('id')
            
            # Verify invoice has line items from packages
            invoice = response.get('invoice', {})
            line_items = invoice.get('line_items', [])
            if len(line_items) == 0:
                self.log_test("Invoice Line Items Check", False, error="Invoice created without line items")
                return False, {}
            else:
                self.log_test("Invoice Line Items Check", True, f"Invoice has {len(line_items)} line items")
        
        return success, response

    def test_invoice_edit_add_item(self):
        """Test adding a line item to an existing invoice"""
        if not self.created_invoice_id:
            self.log_test("Invoice Edit - Add Item", False, error="Missing invoice ID")
            return False, {}
        
        new_item = {
            "description": "Additional Service - Drone Photography",
            "quantity": 1,
            "unit_price": 200.0
        }
        
        endpoint = f"invoices/{self.created_invoice_id}/add-item"
        return self.run_test("Invoice Edit - Add Item", "POST", endpoint, 200, new_item)

    def test_invoice_edit_update_items(self):
        """Test updating invoice line items, discount, and payment schedule"""
        if not self.created_invoice_id:
            self.log_test("Invoice Edit - Update Items", False, error="Missing invoice ID")
            return False, {}
        
        # First get the current invoice
        success, current_invoice = self.run_test("Get Current Invoice", "GET", f"invoices/{self.created_invoice_id}", 200)
        if not success:
            return False, {}
        
        # Update line items, discount, and deposit percentage
        line_items = current_invoice.get('line_items', [])
        if len(line_items) > 0:
            # Modify first item
            line_items[0]['description'] = "Updated: " + line_items[0]['description']
            line_items[0]['unit_price'] = float(line_items[0]['unit_price']) + 50.0
        
        update_data = {
            "line_items": line_items,
            "discount": 150.0,
            "discount_note": "Updated early booking discount",
            "deposit_percentage": 30,
            "notes": "Invoice updated during testing"
        }
        
        endpoint = f"invoices/{self.created_invoice_id}"
        return self.run_test("Invoice Edit - Update Items", "PUT", endpoint, 200, update_data)

    def test_invoice_sync_to_accounts_default(self):
        """Test that new invoices have sync_to_accounts defaulting to true"""
        if not self.created_invoice_id:
            self.log_test("Invoice Sync Default Check", False, error="Missing invoice ID")
            return False, {}
        
        success, invoice = self.run_test("Get Invoice for Sync Check", "GET", f"invoices/{self.created_invoice_id}", 200)
        if success:
            sync_to_accounts = invoice.get('sync_to_accounts', False)
            if sync_to_accounts is True:
                self.log_test("Invoice Sync Default Check", True, "sync_to_accounts defaults to true")
                return True, invoice
            else:
                self.log_test("Invoice Sync Default Check", False, error=f"sync_to_accounts is {sync_to_accounts}, expected True")
                return False, {}
        return False, {}

    def test_invoice_sync_to_accounts_toggle(self):
        """Test toggling sync_to_accounts field"""
        if not self.created_invoice_id:
            self.log_test("Invoice Sync Toggle", False, error="Missing invoice ID")
            return False, {}
        
        # First, set sync_to_accounts to false
        update_data = {"sync_to_accounts": False}
        success1, response1 = self.run_test("Invoice Sync - Set False", "PUT", f"invoices/{self.created_invoice_id}", 200, update_data)
        
        if success1:
            # Verify it was set to false
            success2, invoice = self.run_test("Invoice Sync - Verify False", "GET", f"invoices/{self.created_invoice_id}", 200)
            if success2 and invoice.get('sync_to_accounts') is False:
                self.log_test("Invoice Sync Toggle - False", True, "sync_to_accounts set to false")
                
                # Now set it back to true
                update_data = {"sync_to_accounts": True}
                success3, response3 = self.run_test("Invoice Sync - Set True", "PUT", f"invoices/{self.created_invoice_id}", 200, update_data)
                
                if success3:
                    # Verify it was set to true
                    success4, invoice2 = self.run_test("Invoice Sync - Verify True", "GET", f"invoices/{self.created_invoice_id}", 200)
                    if success4 and invoice2.get('sync_to_accounts') is True:
                        self.log_test("Invoice Sync Toggle - True", True, "sync_to_accounts set to true")
                        return True, invoice2
                    else:
                        self.log_test("Invoice Sync Toggle - True", False, error="Failed to verify sync_to_accounts = true")
                else:
                    self.log_test("Invoice Sync Toggle - True", False, error="Failed to set sync_to_accounts = true")
            else:
                self.log_test("Invoice Sync Toggle - False", False, error="Failed to verify sync_to_accounts = false")
        
        return False, {}

    def test_invoice_edit_remove_item(self):
        """Test removing a line item from invoice"""
        if not self.created_invoice_id:
            self.log_test("Invoice Edit - Remove Item", False, error="Missing invoice ID")
            return False, {}
        
        # Get current invoice to find an item to remove
        success, current_invoice = self.run_test("Get Invoice for Item Removal", "GET", f"invoices/{self.created_invoice_id}", 200)
        if not success:
            return False, {}
        
        line_items = current_invoice.get('line_items', [])
        if len(line_items) > 1:  # Only remove if there are multiple items
            item_to_remove = line_items[-1]  # Remove last item
            item_id = item_to_remove.get('id')
            if item_id:
                endpoint = f"invoices/{self.created_invoice_id}/item/{item_id}"
                return self.run_test("Invoice Edit - Remove Item", "DELETE", endpoint, 200)
        
        self.log_test("Invoice Edit - Remove Item", True, "Skipped - not enough items to remove safely")
        return True, {}

    def test_client_portal_updated_invoice(self):
        """Test client portal displays updated invoice"""
        if not self.portal_token:
            self.log_test("Client Portal Updated Invoice", False, error="Missing portal token")
            return False, {}
        
        success, response = self.run_test("Client Portal Updated Invoice", "GET", f"portal/{self.portal_token}", 200)
        if success:
            invoice = response.get('invoice', {})
            line_items = invoice.get('line_items', [])
            if len(line_items) > 0:
                self.log_test("Portal Invoice Line Items", True, f"Portal shows {len(line_items)} line items")
            else:
                self.log_test("Portal Invoice Line Items", False, error="Portal invoice missing line items")
        
        return success, response

    def test_create_contract_template(self):
        """Test creating a contract template"""
        template_data = {
            "name": "Standard Wedding Contract Test",
            "content": """WEDDING PHOTOGRAPHY CONTRACT

This agreement is between {{partner1_name}} and {{partner2_name}} (the "Clients") and Weddings By Mark (the "Photographer").

Wedding Date: {{wedding_date}}
Package: {{package_name}}
Total Fee: {{package_price}}

Payment Schedule:
- Deposit: {{deposit_amount}} (due upon signing)
- Balance: {{balance_amount}} (due 45 days before wedding)

Terms and Conditions:
1. The Photographer will provide professional wedding photography services.
2. All images remain the copyright of the Photographer.
3. Clients receive usage rights for personal use.

Signed: ___________________ Date: ___________
{{partner1_name}} & {{partner2_name}}"""
        }
        success, response = self.run_test("Create Contract Template", "POST", "contract-templates", 200, template_data)
        if success and response.get('id'):
            self.created_contract_template_id = response['id']
        return success, response

    def test_get_contract_templates(self):
        """Test getting contract templates"""
        return self.run_test("Get Contract Templates", "GET", "contract-templates", 200)

    def test_send_quote(self):
        """Test sending a quote to a lead (legacy method for compatibility)"""
        if not self.created_lead_id or not self.created_main_package_id:
            self.log_test("Send Quote (Legacy)", False, error="Missing lead or package ID")
            return False, {}
        
        quote_data = {
            "lead_id": self.created_lead_id,
            "package_ids": [self.created_main_package_id],
            "valid_days": 14
        }
        success, response = self.run_test("Send Quote (Legacy)", "POST", "quotes", 200, quote_data)
        return success, response

    def test_get_quotes(self):
        """Test getting all quotes"""
        return self.run_test("Get Quotes", "GET", "quotes", 200)

    def test_accept_quote(self):
        """Test accepting a quote to create a job (legacy method)"""
        if not self.created_quote_id or not self.created_contract_template_id:
            self.log_test("Accept Quote (Legacy)", False, error="Missing quote or contract template ID")
            return False, {}
        
        endpoint = f"jobs/accept-quote/{self.created_quote_id}?contract_template_id={self.created_contract_template_id}"
        success, response = self.run_test("Accept Quote (Legacy)", "POST", endpoint, 200)
        return success, response

    def test_get_jobs(self):
        """Test getting all jobs"""
        return self.run_test("Get Jobs", "GET", "jobs", 200)

    def test_get_invoices(self):
        """Test getting all invoices"""
        return self.run_test("Get Invoices", "GET", "invoices", 200)

    def test_get_contracts(self):
        """Test getting all contracts"""
        return self.run_test("Get Contracts", "GET", "contracts", 200)

    def test_client_portal(self):
        """Test client portal access"""
        if not self.portal_token:
            self.log_test("Client Portal", False, error="Missing portal token")
            return False, {}
        
        return self.run_test("Client Portal", "GET", f"portal/{self.portal_token}", 200)

    def test_enquiry_form(self):
        """Test public enquiry form submission"""
        enquiry_data = {
            "partner1_name": "Alice",
            "partner2_name": "Bob",
            "email": "alice.bob@example.com",
            "phone": "07987654321",
            "wedding_date": (datetime.now() + timedelta(days=200)).strftime("%Y-%m-%d"),
            "venue": "Public Enquiry Venue",
            "message": "Public enquiry test message"
        }
        return self.run_test("Enquiry Form", "POST", "enquiry", 200, enquiry_data)

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Wedding CRM Backend API Tests - Package System & Invoice Editing")
        print("=" * 70)
        
        # Basic API tests
        self.test_api_root()
        self.test_dashboard_stats()
        
        # Settings tests
        self.test_settings_get()
        self.test_settings_update()
        
        # Lead management tests
        self.test_create_lead()
        self.test_get_leads()
        
        # NEW: Package system tests
        self.test_create_main_package()
        self.test_create_addons()
        self.test_get_packages_by_type()
        
        # Contract template test (needed for job creation)
        self.test_create_contract_template()
        self.test_get_contract_templates()
        
        # NEW: Quote workflow with packages
        self.test_send_quote_with_packages()
        self.test_get_quotes()
        
        # NEW: Job creation with detailed invoice
        self.test_accept_quote_creates_invoice()
        
        # Job and related data tests
        self.test_get_jobs()
        self.test_get_invoices()
        self.test_get_contracts()
        
        # NEW: Invoice editing functionality
        self.test_invoice_edit_add_item()
        self.test_invoice_edit_update_items()
        
        # NEW: Sync to Accounts functionality tests
        self.test_invoice_sync_to_accounts_default()
        self.test_invoice_sync_to_accounts_toggle()
        
        self.test_invoice_edit_remove_item()
        
        # NEW: Client portal with updated invoice
        self.test_client_portal_updated_invoice()
        
        # Public enquiry test
        self.test_enquiry_form()
        
        # Print summary
        print("\n" + "=" * 70)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1

    def get_failed_tests(self):
        """Get list of failed tests"""
        return [test for test in self.test_results if not test['success']]

    def get_passed_tests(self):
        """Get list of passed tests"""
        return [test for test in self.test_results if test['success']]

def main():
    tester = WeddingCRMTester()
    exit_code = tester.run_all_tests()
    
    # Print detailed results for debugging
    failed_tests = tester.get_failed_tests()
    if failed_tests:
        print("\n🔍 Failed Test Details:")
        for test in failed_tests:
            print(f"  - {test['name']}: {test['error']}")
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())