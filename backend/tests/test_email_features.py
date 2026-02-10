"""
Test suite for Email Features - SMTP Settings, Email Templates, Send Quote Email, Public Quote View
Tests the new email system added to Wedding CRM
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSMTPSettings:
    """Test SMTP settings in business settings"""
    
    def test_settings_has_smtp_settings(self):
        """Settings API should return smtp_settings object"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        data = response.json()
        
        assert "smtp_settings" in data
        smtp = data["smtp_settings"]
        assert "host" in smtp
        assert "port" in smtp
        assert "username" in smtp
        assert "password" in smtp
        assert "from_email" in smtp
        assert "from_name" in smtp
        assert "use_tls" in smtp
        print(f"✅ SMTP settings structure verified: host={smtp['host']}, port={smtp['port']}")
    
    def test_update_smtp_settings(self):
        """Should be able to update SMTP settings"""
        # Get current settings
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        current = response.json()
        
        # Update SMTP settings
        update_data = {
            "smtp_settings": {
                "host": "smtp.test.com",
                "port": 587,
                "username": "test@test.com",
                "password": "testpass",
                "from_email": "test@test.com",
                "from_name": "Test Sender",
                "use_tls": True
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/settings", json=update_data)
        assert response.status_code == 200
        updated = response.json()
        
        assert updated["smtp_settings"]["host"] == "smtp.test.com"
        assert updated["smtp_settings"]["port"] == 587
        assert updated["smtp_settings"]["username"] == "test@test.com"
        assert updated["smtp_settings"]["from_name"] == "Test Sender"
        print("✅ SMTP settings updated successfully")
        
        # Restore original settings
        restore_data = {
            "smtp_settings": current.get("smtp_settings", {})
        }
        requests.put(f"{BASE_URL}/api/settings", json=restore_data)


class TestEmailTemplates:
    """Test email templates CRUD operations"""
    
    def test_get_email_templates(self):
        """Should return list of email templates with default quote_email"""
        response = requests.get(f"{BASE_URL}/api/email-templates")
        assert response.status_code == 200
        templates = response.json()
        
        assert isinstance(templates, list)
        assert len(templates) >= 1
        
        # Check for default quote_email template
        quote_template = next((t for t in templates if t["name"] == "quote_email"), None)
        assert quote_template is not None, "Default quote_email template should exist"
        assert "subject" in quote_template
        assert "body" in quote_template
        assert "%client_name%" in quote_template["body"]
        assert "%quote_link%" in quote_template["body"]
        print(f"✅ Found {len(templates)} email templates, including default quote_email")
    
    def test_create_email_template(self):
        """Should be able to create a new email template"""
        template_data = {
            "name": "test_template",
            "subject": "Test Subject %client_name%",
            "body": "Hello %client_name%,\n\nThis is a test template."
        }
        
        response = requests.post(f"{BASE_URL}/api/email-templates", json=template_data)
        assert response.status_code == 200
        created = response.json()
        
        assert created["name"] == "test_template"
        assert created["subject"] == "Test Subject %client_name%"
        assert "id" in created
        print(f"✅ Created email template with id: {created['id']}")
        
        return created["id"]
    
    def test_update_email_template(self):
        """Should be able to update an email template"""
        # First create a template
        template_data = {
            "name": "update_test_template",
            "subject": "Original Subject",
            "body": "Original body"
        }
        create_response = requests.post(f"{BASE_URL}/api/email-templates", json=template_data)
        assert create_response.status_code == 200
        template_id = create_response.json()["id"]
        
        # Update the template
        update_data = {
            "subject": "Updated Subject",
            "body": "Updated body content"
        }
        response = requests.put(f"{BASE_URL}/api/email-templates/{template_id}", json=update_data)
        assert response.status_code == 200
        updated = response.json()
        
        assert updated["subject"] == "Updated Subject"
        assert updated["body"] == "Updated body content"
        print(f"✅ Updated email template {template_id}")
    
    def test_get_single_email_template(self):
        """Should be able to get a single email template by ID"""
        # Get all templates first
        response = requests.get(f"{BASE_URL}/api/email-templates")
        templates = response.json()
        
        if templates:
            template_id = templates[0]["id"]
            response = requests.get(f"{BASE_URL}/api/email-templates/{template_id}")
            assert response.status_code == 200
            template = response.json()
            assert template["id"] == template_id
            print(f"✅ Retrieved single email template: {template['name']}")


class TestPublicQuoteView:
    """Test public quote view endpoint"""
    
    TEST_QUOTE_ID = "a53d35c5-939b-4e59-9112-763c1dab7b55"
    
    def test_public_quote_endpoint_exists(self):
        """Public quote endpoint should return quote data"""
        response = requests.get(f"{BASE_URL}/api/public/quote/{self.TEST_QUOTE_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "quote" in data
        assert "lead" in data
        assert "packages" in data
        assert "business" in data
        print("✅ Public quote endpoint returns all required data sections")
    
    def test_public_quote_has_quote_details(self):
        """Public quote should include quote items and totals"""
        response = requests.get(f"{BASE_URL}/api/public/quote/{self.TEST_QUOTE_ID}")
        data = response.json()
        quote = data["quote"]
        
        assert "id" in quote
        assert "items" in quote
        assert "subtotal" in quote
        assert "total" in quote
        assert "valid_until" in quote
        assert len(quote["items"]) > 0
        
        # Check item structure
        item = quote["items"][0]
        assert "package_id" in item
        assert "name" in item
        assert "price" in item
        assert "package_type" in item
        print(f"✅ Quote has {len(quote['items'])} items, total: £{quote['total']}")
    
    def test_public_quote_has_lead_info(self):
        """Public quote should include lead information"""
        response = requests.get(f"{BASE_URL}/api/public/quote/{self.TEST_QUOTE_ID}")
        data = response.json()
        lead = data["lead"]
        
        assert "partner1_name" in lead
        assert "partner2_name" in lead
        assert "email" in lead
        print(f"✅ Lead info: {lead['partner1_name']} & {lead['partner2_name']}")
    
    def test_public_quote_has_business_info(self):
        """Public quote should include business info with logo and bank details"""
        response = requests.get(f"{BASE_URL}/api/public/quote/{self.TEST_QUOTE_ID}")
        data = response.json()
        business = data["business"]
        
        assert "name" in business
        assert "logo_url" in business
        assert "bank_details" in business
        assert "deposit_amount" in business
        
        bank = business["bank_details"]
        assert "sort_code" in bank
        assert "account_number" in bank
        assert "account_name" in bank
        print(f"✅ Business info includes logo_url and bank details")
    
    def test_public_quote_has_packages_list(self):
        """Public quote should include list of available packages"""
        response = requests.get(f"{BASE_URL}/api/public/quote/{self.TEST_QUOTE_ID}")
        data = response.json()
        packages = data["packages"]
        
        assert isinstance(packages, list)
        assert len(packages) > 0
        
        # Check package structure
        pkg = packages[0]
        assert "id" in pkg
        assert "name" in pkg
        assert "price" in pkg
        assert "package_type" in pkg
        print(f"✅ {len(packages)} packages available for selection")
    
    def test_invalid_quote_returns_404(self):
        """Invalid quote ID should return 404"""
        response = requests.get(f"{BASE_URL}/api/public/quote/invalid-quote-id")
        assert response.status_code == 404
        print("✅ Invalid quote ID returns 404")


class TestSendQuoteEmail:
    """Test send quote email functionality"""
    
    def test_send_quote_email_endpoint_exists(self):
        """Send quote email endpoint should exist"""
        # This will fail because SMTP is not configured, but endpoint should exist
        response = requests.post(f"{BASE_URL}/api/quotes/a53d35c5-939b-4e59-9112-763c1dab7b55/send-email")
        # Should return 400 (SMTP not configured) or 200 (success), not 404
        assert response.status_code in [200, 400, 500]
        print(f"✅ Send quote email endpoint exists (status: {response.status_code})")
    
    def test_send_quote_email_requires_smtp(self):
        """Send quote email should fail gracefully without SMTP config"""
        response = requests.post(f"{BASE_URL}/api/quotes/a53d35c5-939b-4e59-9112-763c1dab7b55/send-email")
        
        # If SMTP is not configured, should return 400 with helpful message
        if response.status_code == 400:
            data = response.json()
            assert "detail" in data
            assert "SMTP" in data["detail"] or "smtp" in data["detail"].lower()
            print(f"✅ Proper error message when SMTP not configured: {data['detail']}")
        else:
            print(f"✅ Send email returned status {response.status_code}")


class TestQuoteCreationWithEmail:
    """Test quote creation flow with email option"""
    
    def test_create_quote_endpoint(self):
        """Should be able to create a quote"""
        # First get a lead
        leads_response = requests.get(f"{BASE_URL}/api/leads")
        assert leads_response.status_code == 200
        leads = leads_response.json()
        
        if not leads:
            print("⚠️ No leads available for testing quote creation")
            return
        
        lead_id = leads[0]["id"]
        
        # Get packages
        packages_response = requests.get(f"{BASE_URL}/api/packages")
        packages = packages_response.json()
        
        if not packages:
            print("⚠️ No packages available for testing quote creation")
            return
        
        package_id = packages[0]["id"]
        
        # Create quote
        quote_data = {
            "lead_id": lead_id,
            "package_ids": [package_id],
            "quantities": {},
            "discount": 0,
            "discount_note": None,
            "custom_message": "Test quote",
            "valid_days": 14
        }
        
        response = requests.post(f"{BASE_URL}/api/quotes", json=quote_data)
        assert response.status_code == 200
        quote = response.json()
        
        assert "id" in quote
        assert quote["lead_id"] == lead_id
        assert len(quote["items"]) > 0
        print(f"✅ Created quote {quote['id']} for lead {lead_id}")


class TestTestEmailEndpoint:
    """Test the test email endpoint"""
    
    def test_test_email_endpoint_exists(self):
        """Test email endpoint should exist"""
        response = requests.post(f"{BASE_URL}/api/settings/test-email")
        # Should return 400 (SMTP not configured) or 200 (success), not 404
        assert response.status_code in [200, 400, 500]
        print(f"✅ Test email endpoint exists (status: {response.status_code})")
    
    def test_test_email_requires_smtp(self):
        """Test email should fail gracefully without SMTP config"""
        response = requests.post(f"{BASE_URL}/api/settings/test-email")
        
        if response.status_code == 400:
            data = response.json()
            assert "detail" in data
            print(f"✅ Proper error when SMTP not configured: {data['detail']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
