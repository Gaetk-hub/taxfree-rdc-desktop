"""
Tests for tax free form creation and validation.
"""
import pytest
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone

from apps.sales.models import SaleInvoice, SaleItem, ProductCategory
from apps.taxfree.models import Traveler, TaxFreeForm, TaxFreeFormStatus
from apps.customs.models import CustomsValidation, ValidationDecision
from apps.refunds.models import Refund, RefundStatus, RefundMethod
from services.taxfree_service import TaxFreeService
from services.refund_service import RefundService


@pytest.mark.django_db
class TestTaxFreeFormCreation:
    """Tests for tax free form creation."""
    
    def test_create_invoice(self, merchant, outlet, merchant_user):
        """Test creating a sale invoice."""
        invoice = SaleInvoice.objects.create(
            merchant=merchant,
            outlet=outlet,
            invoice_number='INV-001',
            invoice_date=date.today(),
            currency='CDF',
            subtotal=Decimal('100000.00'),
            total_vat=Decimal('16000.00'),
            total_amount=Decimal('116000.00'),
            created_by=merchant_user
        )
        
        SaleItem.objects.create(
            invoice=invoice,
            product_name='Test Product',
            product_category=ProductCategory.GENERAL,
            quantity=Decimal('1'),
            unit_price=Decimal('100000.00'),
            vat_rate=Decimal('16.00')
        )
        
        assert invoice.id is not None
        assert invoice.items.count() == 1
    
    def test_create_traveler(self):
        """Test creating a traveler."""
        traveler = Traveler(
            first_name='Jean',
            last_name='Dupont',
            date_of_birth=date(1990, 1, 1),
            nationality='FR',
            residence_country='FR',
            passport_country='FR'
        )
        traveler.set_passport_number('FR123456789')
        traveler.save()
        
        assert traveler.id is not None
        assert traveler.passport_number_last4 == '6789'
        assert traveler.verify_passport('FR123456789')
        assert not traveler.verify_passport('WRONG')
    
    def test_create_taxfree_form(self, merchant, outlet, merchant_user, active_ruleset):
        """Test creating a tax free form."""
        # Create invoice
        invoice = SaleInvoice.objects.create(
            merchant=merchant,
            outlet=outlet,
            invoice_number='INV-002',
            invoice_date=date.today(),
            currency='CDF',
            subtotal=Decimal('100000.00'),
            total_vat=Decimal('16000.00'),
            total_amount=Decimal('116000.00'),
            created_by=merchant_user
        )
        
        SaleItem.objects.create(
            invoice=invoice,
            product_name='Electronics',
            product_category=ProductCategory.ELECTRONICS,
            quantity=Decimal('1'),
            unit_price=Decimal('100000.00'),
            vat_rate=Decimal('16.00')
        )
        
        # Create traveler
        traveler = Traveler(
            first_name='Jean',
            last_name='Dupont',
            date_of_birth=date(1990, 1, 1),
            nationality='FR',
            residence_country='FR',
            passport_country='FR'
        )
        traveler.set_passport_number('FR123456789')
        traveler.save()
        
        # Create form
        form = TaxFreeService.create_form(invoice, traveler, merchant_user)
        
        assert form.id is not None
        assert form.form_number is not None
        assert form.status == TaxFreeFormStatus.CREATED
        assert form.eligible_amount == Decimal('100000.00')
        assert form.vat_amount == Decimal('16000.00')
        assert form.refund_amount > 0
        assert form.rule_snapshot is not None
    
    def test_ineligible_residence_country(self, merchant, outlet, merchant_user, active_ruleset):
        """Test that residents of excluded countries are rejected."""
        invoice = SaleInvoice.objects.create(
            merchant=merchant,
            outlet=outlet,
            invoice_number='INV-003',
            invoice_date=date.today(),
            currency='CDF',
            subtotal=Decimal('100000.00'),
            total_vat=Decimal('16000.00'),
            total_amount=Decimal('116000.00'),
            created_by=merchant_user
        )
        
        SaleItem.objects.create(
            invoice=invoice,
            product_name='Test',
            quantity=Decimal('1'),
            unit_price=Decimal('100000.00'),
            vat_rate=Decimal('16.00')
        )
        
        # Traveler from CD (excluded)
        traveler = Traveler(
            first_name='Local',
            last_name='Resident',
            date_of_birth=date(1990, 1, 1),
            nationality='CD',
            residence_country='CD',
            passport_country='CD'
        )
        traveler.set_passport_number('CD123456789')
        traveler.save()
        
        with pytest.raises(ValueError) as exc_info:
            TaxFreeService.create_form(invoice, traveler, merchant_user)
        
        assert 'not eligible' in str(exc_info.value).lower()


@pytest.mark.django_db
class TestCustomsValidation:
    """Tests for customs validation."""
    
    def test_validate_form(self, merchant, outlet, merchant_user, customs_agent, point_of_exit, active_ruleset):
        """Test validating a tax free form."""
        # Create invoice and form
        invoice = SaleInvoice.objects.create(
            merchant=merchant,
            outlet=outlet,
            invoice_number='INV-004',
            invoice_date=date.today(),
            currency='CDF',
            subtotal=Decimal('100000.00'),
            total_vat=Decimal('16000.00'),
            total_amount=Decimal('116000.00'),
            created_by=merchant_user
        )
        
        SaleItem.objects.create(
            invoice=invoice,
            product_name='Test',
            quantity=Decimal('1'),
            unit_price=Decimal('100000.00'),
            vat_rate=Decimal('16.00')
        )
        
        traveler = Traveler(
            first_name='Jean',
            last_name='Dupont',
            date_of_birth=date(1990, 1, 1),
            nationality='FR',
            residence_country='FR',
            passport_country='FR'
        )
        traveler.set_passport_number('FR123456789')
        traveler.save()
        
        form = TaxFreeService.create_form(invoice, traveler, merchant_user)
        
        # Issue the form
        form.status = TaxFreeFormStatus.ISSUED
        form.issued_at = timezone.now()
        form.generate_qr_payload()
        form.save()
        
        # Validate
        validation = CustomsValidation.objects.create(
            form=form,
            agent=customs_agent,
            point_of_exit=point_of_exit,
            decision=ValidationDecision.VALIDATED,
            decided_at=timezone.now()
        )
        
        form.status = TaxFreeFormStatus.VALIDATED
        form.validated_at = timezone.now()
        form.save()
        
        assert validation.id is not None
        assert form.status == TaxFreeFormStatus.VALIDATED


@pytest.mark.django_db
class TestRefund:
    """Tests for refund processing."""
    
    def test_create_and_process_refund(self, merchant, outlet, merchant_user, customs_agent, 
                                        point_of_exit, operator_user, active_ruleset):
        """Test creating and processing a refund."""
        # Create validated form
        invoice = SaleInvoice.objects.create(
            merchant=merchant,
            outlet=outlet,
            invoice_number='INV-005',
            invoice_date=date.today(),
            currency='CDF',
            subtotal=Decimal('100000.00'),
            total_vat=Decimal('16000.00'),
            total_amount=Decimal('116000.00'),
            created_by=merchant_user
        )
        
        SaleItem.objects.create(
            invoice=invoice,
            product_name='Test',
            quantity=Decimal('1'),
            unit_price=Decimal('100000.00'),
            vat_rate=Decimal('16.00')
        )
        
        traveler = Traveler(
            first_name='Jean',
            last_name='Dupont',
            date_of_birth=date(1990, 1, 1),
            nationality='FR',
            residence_country='FR',
            passport_country='FR',
            email='jean@example.com'
        )
        traveler.set_passport_number('FR123456789')
        traveler.save()
        
        form = TaxFreeService.create_form(invoice, traveler, merchant_user)
        form.status = TaxFreeFormStatus.VALIDATED
        form.validated_at = timezone.now()
        form.save()
        
        # Create refund
        refund = RefundService.create_refund(
            form=form,
            method=RefundMethod.MOBILE_MONEY,
            payment_details={
                'phone_number': '+33612345678',
                'provider': 'ORANGE'
            },
            user=operator_user
        )
        
        assert refund.id is not None
        assert refund.status == RefundStatus.PENDING
        assert refund.net_amount == form.refund_amount
        
        # Process refund (mock will succeed most of the time)
        RefundService.process_refund(refund)
        refund.refresh_from_db()
        
        # Status should be either PAID or FAILED (mock has random success)
        assert refund.status in [RefundStatus.PAID, RefundStatus.FAILED]
        assert refund.attempts.count() == 1
