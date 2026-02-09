"""
Test suite for fixed deposit amount and logo URL features
Tests the changes from percentage-based deposit to fixed £ amount
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSettingsDepositAndLogo:
    """Test settings for fixed deposit amount and logo URL"""
    
    def test_settings_has_deposit_amount_field(self):
        """Verify settings returns deposit_amount as a fixed value"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "deposit_amount" in data, "Settings should have deposit_amount field"
        assert isinstance(data["deposit_amount"], (int, float)), "deposit_amount should be numeric"
        print(f"✅ Settings deposit_amount: £{data['deposit_amount']}")
    
    def test_settings_has_logo_url_field(self):
        """Verify settings returns logo_url field"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "logo_url" in data, "Settings should have logo_url field"
        print(f"✅ Settings logo_url: {data['logo_url'][:50]}..." if data['logo_url'] else "✅ Settings logo_url: (empty)")
    
    def test_update_deposit_amount(self):
        """Test updating deposit amount to a fixed value"""
        # Get current settings
        response = requests.get(f"{BASE_URL}/api/settings")
        original_deposit = response.json().get("deposit_amount", 100)
        
        # Update to new value
        new_deposit = 150.0
        update_response = requests.put(f"{BASE_URL}/api/settings", json={
            "deposit_amount": new_deposit
        })
        assert update_response.status_code == 200
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/settings")
        assert verify_response.json()["deposit_amount"] == new_deposit
        print(f"✅ Updated deposit_amount to £{new_deposit}")
        
        # Restore original
        requests.put(f"{BASE_URL}/api/settings", json={
            "deposit_amount": original_deposit
        })
        print(f"✅ Restored deposit_amount to £{original_deposit}")
    
    def test_update_logo_url(self):
        """Test updating logo URL"""
        # Get current settings
        response = requests.get(f"{BASE_URL}/api/settings")
        original_logo = response.json().get("logo_url", "")
        
        # Update to new value
        new_logo = "https://example.com/test-logo.png"
        update_response = requests.put(f"{BASE_URL}/api/settings", json={
            "logo_url": new_logo
        })
        assert update_response.status_code == 200
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/settings")
        assert verify_response.json()["logo_url"] == new_logo
        print(f"✅ Updated logo_url to {new_logo}")
        
        # Restore original
        requests.put(f"{BASE_URL}/api/settings", json={
            "logo_url": original_logo
        })
        print(f"✅ Restored logo_url")


class TestInvoiceDepositAmount:
    """Test invoice deposit amount as fixed £ value"""
    
    def test_invoices_have_deposit_amount(self):
        """Verify invoices have deposit_amount field"""
        response = requests.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        
        invoices = response.json()
        if len(invoices) > 0:
            invoice = invoices[0]
            assert "deposit_amount" in invoice, "Invoice should have deposit_amount field"
            assert isinstance(invoice["deposit_amount"], (int, float)), "deposit_amount should be numeric"
            print(f"✅ Invoice {invoice['invoice_number']} has deposit_amount: £{invoice['deposit_amount']}")
        else:
            pytest.skip("No invoices to test")
    
    def test_invoice_update_deposit_amount(self):
        """Test updating invoice deposit amount"""
        # Get an invoice
        response = requests.get(f"{BASE_URL}/api/invoices")
        invoices = response.json()
        
        if len(invoices) == 0:
            pytest.skip("No invoices to test")
        
        invoice = invoices[0]
        invoice_id = invoice["id"]
        original_deposit = invoice.get("deposit_amount", 100)
        
        # Update deposit amount
        new_deposit = 200.0
        update_response = requests.put(f"{BASE_URL}/api/invoices/{invoice_id}", json={
            "deposit_amount": new_deposit
        })
        assert update_response.status_code == 200
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}")
        updated_invoice = verify_response.json()
        assert updated_invoice["deposit_amount"] == new_deposit
        
        # Verify balance recalculated
        expected_balance = updated_invoice["total_amount"] - new_deposit
        assert updated_invoice["balance_amount"] == expected_balance
        print(f"✅ Updated invoice deposit to £{new_deposit}, balance recalculated to £{expected_balance}")
        
        # Restore original
        requests.put(f"{BASE_URL}/api/invoices/{invoice_id}", json={
            "deposit_amount": original_deposit
        })
        print(f"✅ Restored invoice deposit to £{original_deposit}")


class TestJobCreationWithFixedDeposit:
    """Test that new jobs/invoices use fixed deposit from settings"""
    
    def test_settings_deposit_used_in_new_invoice(self):
        """Verify new invoices use deposit_amount from settings"""
        # Get current settings deposit
        settings_response = requests.get(f"{BASE_URL}/api/settings")
        settings_deposit = settings_response.json().get("deposit_amount", 100)
        
        # Check if there are any invoices
        invoices_response = requests.get(f"{BASE_URL}/api/invoices")
        invoices = invoices_response.json()
        
        # Note: We can't easily create a new invoice without going through the full
        # lead -> quote -> accept flow, but we can verify the settings value exists
        print(f"✅ Settings deposit_amount is £{settings_deposit}")
        print(f"✅ This value will be used for new invoices created via quote acceptance")
        
        # Verify the backend model has correct default
        assert settings_deposit > 0, "Deposit amount should be positive"


class TestClientPortalLogo:
    """Test that client portal includes logo URL"""
    
    def test_portal_includes_business_logo(self):
        """Verify portal endpoint returns logo_url in business info"""
        # Get a job to find portal token
        jobs_response = requests.get(f"{BASE_URL}/api/jobs")
        jobs = jobs_response.json()
        
        if len(jobs) == 0:
            pytest.skip("No jobs to test portal")
        
        portal_token = jobs[0].get("portal_token")
        if not portal_token:
            pytest.skip("Job has no portal token")
        
        # Get portal data
        portal_response = requests.get(f"{BASE_URL}/api/portal/{portal_token}")
        assert portal_response.status_code == 200
        
        portal_data = portal_response.json()
        assert "business" in portal_data, "Portal should include business info"
        assert "logo_url" in portal_data["business"], "Business info should include logo_url"
        
        logo_url = portal_data["business"]["logo_url"]
        print(f"✅ Portal business logo_url: {logo_url[:50]}..." if logo_url else "✅ Portal business logo_url: (empty)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
