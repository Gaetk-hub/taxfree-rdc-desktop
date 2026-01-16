"""
Pytest configuration and fixtures.
"""
import pytest
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone

from apps.accounts.models import User, UserRole
from apps.merchants.models import Merchant, Outlet, MerchantStatus
from apps.customs.models import PointOfExit
from apps.rules.models import RuleSet


@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    return User.objects.create_user(
        email='admin@taxfree.cd',
        password='admin123',
        first_name='Admin',
        last_name='User',
        role=UserRole.ADMIN,
        is_staff=True
    )


@pytest.fixture
def merchant_user(db, merchant):
    """Create a merchant user."""
    return User.objects.create_user(
        email='merchant@example.com',
        password='merchant123',
        first_name='Merchant',
        last_name='User',
        role=UserRole.MERCHANT,
        merchant=merchant
    )


@pytest.fixture
def customs_agent(db, point_of_exit):
    """Create a customs agent."""
    return User.objects.create_user(
        email='customs@dgda.cd',
        password='customs123',
        first_name='Customs',
        last_name='Agent',
        role=UserRole.CUSTOMS_AGENT,
        point_of_exit=point_of_exit
    )


@pytest.fixture
def operator_user(db):
    """Create an operator user."""
    return User.objects.create_user(
        email='operator@taxfree.cd',
        password='operator123',
        first_name='Operator',
        last_name='User',
        role=UserRole.OPERATOR
    )


@pytest.fixture
def merchant(db):
    """Create an approved merchant."""
    return Merchant.objects.create(
        name='Test Merchant',
        registration_number='RC-12345',
        tax_id='TAX-12345',
        address_line1='123 Commerce Street',
        city='Kinshasa',
        country='CD',
        contact_name='John Doe',
        contact_email='contact@merchant.com',
        contact_phone='+243123456789',
        status=MerchantStatus.APPROVED,
        approved_at=timezone.now()
    )


@pytest.fixture
def outlet(db, merchant):
    """Create an outlet for the merchant."""
    return Outlet.objects.create(
        merchant=merchant,
        name='Main Store',
        code='MAIN001',
        address_line1='123 Commerce Street',
        city='Kinshasa'
    )


@pytest.fixture
def point_of_exit(db):
    """Create a point of exit."""
    return PointOfExit.objects.create(
        code='FIH',
        name='Aéroport International de Ndjili',
        type='AIRPORT',
        city='Kinshasa',
        country='CD'
    )


@pytest.fixture
def active_ruleset(db):
    """Create an active ruleset."""
    ruleset = RuleSet.objects.create(
        version='1.0.0',
        name='Default Rules',
        min_purchase_amount=Decimal('50000.00'),
        min_age=16,
        exit_deadline_months=3,
        default_vat_rate=Decimal('16.00'),
        operator_fee_percentage=Decimal('15.00'),
        allowed_refund_methods=['CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CASH'],
        excluded_residence_countries=['CD'],
        is_active=True,
        activated_at=timezone.now()
    )
    return ruleset


@pytest.fixture
def api_client():
    """Create API client."""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, admin_user):
    """Create authenticated API client."""
    api_client.force_authenticate(user=admin_user)
    return api_client
