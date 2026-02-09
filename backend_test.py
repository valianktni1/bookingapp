#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class WeddingCRMTester:
    def __init__(self, base_url="https://wedshutter.preview.emergentagent.com/api"):
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

    def test_create_quote_template(self):
        """Test creating a quote template"""
        template_data = {
            "name": "Full Day Coverage Test",
            "description": "Complete wedding day photography package",
            "price": 1500.0,
            "includes": [
                "8 hours coverage",
                "500+ edited photos",
                "Online gallery",
                "USB drive"
            ]
        }
        success, response = self.run_test("Create Quote Template", "POST", "quote-templates", 200, template_data)
        if success and response.get('id'):
            self.created_quote_template_id = response['id']
        return success, response

    def test_get_quote_templates(self):
        """Test getting quote templates"""
        return self.run_test("Get Quote Templates", "GET", "quote-templates", 200)

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
        """Test sending a quote to a lead"""
        if not self.created_lead_id or not self.created_quote_template_id:
            self.log_test("Send Quote", False, error="Missing lead or template ID")
            return False, {}
        
        quote_data = {
            "lead_id": self.created_lead_id,
            "template_id": self.created_quote_template_id,
            "valid_days": 14
        }
        success, response = self.run_test("Send Quote", "POST", "quotes", 200, quote_data)
        if success and response.get('id'):
            self.created_quote_id = response['id']
        return success, response

    def test_get_quotes(self):
        """Test getting all quotes"""
        return self.run_test("Get Quotes", "GET", "quotes", 200)

    def test_accept_quote(self):
        """Test accepting a quote to create a job"""
        if not self.created_quote_id or not self.created_contract_template_id:
            self.log_test("Accept Quote", False, error="Missing quote or contract template ID")
            return False, {}
        
        endpoint = f"jobs/accept-quote/{self.created_quote_id}?contract_template_id={self.created_contract_template_id}"
        success, response = self.run_test("Accept Quote", "POST", endpoint, 200)
        if success and response.get('job', {}).get('id'):
            self.created_job_id = response['job']['id']
            self.portal_token = response['job'].get('portal_token')
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
        print("🚀 Starting Wedding CRM Backend API Tests")
        print("=" * 50)
        
        # Basic API tests
        self.test_api_root()
        self.test_dashboard_stats()
        
        # Settings tests
        self.test_settings_get()
        self.test_settings_update()
        
        # Lead management tests
        self.test_create_lead()
        self.test_get_leads()
        
        # Template tests
        self.test_create_quote_template()
        self.test_get_quote_templates()
        self.test_create_contract_template()
        self.test_get_contract_templates()
        
        # Quote workflow tests
        self.test_send_quote()
        self.test_get_quotes()
        self.test_accept_quote()
        
        # Job and related data tests
        self.test_get_jobs()
        self.test_get_invoices()
        self.test_get_contracts()
        
        # Client portal test
        self.test_client_portal()
        
        # Public enquiry test
        self.test_enquiry_form()
        
        # Print summary
        print("\n" + "=" * 50)
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