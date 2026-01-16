"""
API endpoint tests.
"""
import pytest
from rest_framework import status
from django.urls import reverse


@pytest.mark.django_db
class TestAuthAPI:
    """Tests for authentication endpoints."""
    
    def test_login_success(self, api_client, admin_user):
        """Test successful login."""
        response = api_client.post('/api/auth/login/', {
            'email': 'admin@taxfree.cd',
            'password': 'admin123'
        })
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert 'user' in response.data
    
    def test_login_invalid_credentials(self, api_client, admin_user):
        """Test login with invalid credentials."""
        response = api_client.post('/api/auth/login/', {
            'email': 'admin@taxfree.cd',
            'password': 'wrongpassword'
        })
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_current_user(self, authenticated_client, admin_user):
        """Test getting current user info."""
        response = authenticated_client.get('/api/auth/users/me/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == admin_user.email


@pytest.mark.django_db
class TestMerchantAPI:
    """Tests for merchant endpoints."""
    
    def test_list_merchants(self, authenticated_client, merchant):
        """Test listing merchants."""
        response = authenticated_client.get('/api/merchants/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1
    
    def test_create_merchant(self, authenticated_client):
        """Test creating a merchant."""
        response = authenticated_client.post('/api/merchants/', {
            'name': 'New Merchant',
            'registration_number': 'RC-NEW-001',
            'address_line1': '456 New Street',
            'city': 'Lubumbashi',
            'country': 'CD',
            'contact_name': 'Jane Doe',
            'contact_email': 'jane@newmerchant.com',
            'contact_phone': '+243987654321'
        })
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Merchant'
        assert response.data['status'] == 'DRAFT'
    
    def test_approve_merchant(self, authenticated_client, merchant):
        """Test approving a merchant."""
        # First submit
        merchant.status = 'SUBMITTED'
        merchant.save()
        
        response = authenticated_client.post(f'/api/merchants/{merchant.id}/approve/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'APPROVED'


@pytest.mark.django_db
class TestRulesAPI:
    """Tests for rules endpoints."""
    
    def test_get_active_ruleset(self, authenticated_client, active_ruleset):
        """Test getting active ruleset."""
        response = authenticated_client.get('/api/rules/rulesets/active/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['version'] == '1.0.0'
        assert response.data['is_active'] is True
    
    def test_create_ruleset(self, authenticated_client):
        """Test creating a new ruleset."""
        response = authenticated_client.post('/api/rules/rulesets/', {
            'version': '2.0.0',
            'name': 'New Rules',
            'min_purchase_amount': '75000.00',
            'min_age': 18,
            'exit_deadline_months': 2,
            'default_vat_rate': '16.00',
            'operator_fee_percentage': '10.00',
            'allowed_refund_methods': ['CARD', 'MOBILE_MONEY']
        })
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['version'] == '2.0.0'


@pytest.mark.django_db
class TestReportsAPI:
    """Tests for reporting endpoints."""
    
    def test_get_summary_report(self, authenticated_client):
        """Test getting summary report."""
        response = authenticated_client.get('/api/reports/summary/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'forms' in response.data
        assert 'refunds' in response.data
        assert 'merchants' in response.data
