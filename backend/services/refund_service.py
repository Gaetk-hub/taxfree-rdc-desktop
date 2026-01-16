"""
Refund business logic service.
"""
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db import transaction

from apps.refunds.models import Refund, PaymentAttempt, RefundStatus, RefundMethod, PaymentAttemptStatus
from apps.taxfree.models import TaxFreeForm, TaxFreeFormStatus
from apps.audit.services import AuditService


class RefundService:
    """Service for refund operations."""
    
    @classmethod
    def create_refund(cls, form, method, payment_details, user, payout_currency_code=None):
        """
        Create a refund for a validated form.
        
        Args:
            form: TaxFreeForm instance (must be VALIDATED)
            method: RefundMethod choice
            payment_details: dict with payment info
            user: User initiating the refund
            payout_currency_code: Optional currency code for payout (default: CDF)
            
        Returns:
            Refund instance
        """
        from apps.rules.models import Currency
        
        if form.status != TaxFreeFormStatus.VALIDATED:
            raise ValueError("Form must be validated")
        
        if hasattr(form, 'refund'):
            raise ValueError("Refund already exists for this form")
        
        # Handle currency conversion
        payout_currency = 'CDF'
        exchange_rate = Decimal('1.000000')
        payout_amount = form.refund_amount
        
        if payout_currency_code and payout_currency_code != 'CDF':
            try:
                currency = Currency.objects.get(code=payout_currency_code, is_active=True)
                payout_currency = currency.code
                exchange_rate = currency.exchange_rate
                payout_amount = currency.convert_from_base(form.refund_amount)
            except Currency.DoesNotExist:
                raise ValueError(f"Currency {payout_currency_code} not found or not active")
        
        refund = Refund.objects.create(
            form=form,
            currency=form.currency,
            gross_amount=form.vat_amount,
            operator_fee=form.operator_fee,
            net_amount=form.refund_amount,
            method=method,
            payment_details=payment_details,
            status=RefundStatus.PENDING,
            initiated_by=user,
            # Currency conversion fields
            payout_currency=payout_currency,
            exchange_rate_applied=exchange_rate,
            payout_amount=payout_amount
        )
        
        return refund
    
    @classmethod
    def process_refund(cls, refund):
        """
        Process a refund payment.
        
        Args:
            refund: Refund instance
            
        Returns:
            bool indicating success
        """
        from providers.payment_provider import get_payment_provider
        
        if refund.status not in [RefundStatus.PENDING, RefundStatus.FAILED]:
            raise ValueError("Refund cannot be processed in current status")
        
        # Update status to initiated
        refund.status = RefundStatus.INITIATED
        refund.initiated_at = timezone.now()
        refund.save()
        
        # Get appropriate provider
        provider = get_payment_provider(refund.method)
        
        # Create payment attempt
        attempt = PaymentAttempt.objects.create(
            refund=refund,
            provider=provider.name,
            status=PaymentAttemptStatus.PENDING
        )
        
        try:
            # Process payment
            result = provider.process_payment(
                amount=refund.net_amount,
                currency=refund.currency,
                payment_details=refund.payment_details,
                reference=str(refund.id)
            )
            
            # Update attempt
            attempt.provider_request_id = result.get('request_id', '')
            attempt.provider_response_id = result.get('response_id', '')
            attempt.request_payload = result.get('request', {})
            attempt.response_payload = result.get('response', {})
            
            if result['success']:
                attempt.status = PaymentAttemptStatus.SUCCESS
                attempt.completed_at = timezone.now()
                attempt.save()
                
                # For CASH payments, keep status as INITIATED until manual collection
                if refund.method == RefundMethod.CASH:
                    # Cash stays INITIATED - will be marked PAID when collected
                    return True
                
                # For other methods, mark as PAID immediately
                refund.status = RefundStatus.PAID
                refund.paid_at = timezone.now()
                refund.save()
                
                # Update form status to REFUNDED
                refund.form.status = TaxFreeFormStatus.REFUNDED
                refund.form.save(update_fields=['status'])
                
                # Send notification
                cls._send_refund_notification(refund, 'paid')
                
                return True
            else:
                attempt.status = PaymentAttemptStatus.FAILED
                attempt.error_code = result.get('error_code', 'UNKNOWN')
                attempt.error_message = result.get('error_message', 'Unknown error')
                attempt.completed_at = timezone.now()
                attempt.save()
                
                # Update refund
                refund.status = RefundStatus.FAILED
                refund.retry_count += 1
                refund.next_retry_at = timezone.now() + timedelta(hours=4)
                refund.save()
                
                return False
                
        except Exception as e:
            attempt.status = PaymentAttemptStatus.FAILED
            attempt.error_code = 'EXCEPTION'
            attempt.error_message = str(e)
            attempt.completed_at = timezone.now()
            attempt.save()
            
            refund.status = RefundStatus.FAILED
            refund.retry_count += 1
            refund.next_retry_at = timezone.now() + timedelta(hours=4)
            refund.save()
            
            return False
    
    @classmethod
    def _send_refund_notification(cls, refund, event):
        """Send notification about refund status."""
        from apps.notifications.models import OutboundNotification, NotificationType, NotificationStatus
        from services.settings_service import SettingsService
        
        # Check if notifications are enabled
        if not SettingsService.should_notify_on_refund():
            return
        
        traveler = refund.form.traveler
        
        if event == 'paid':
            subject = f"Votre remboursement Tax Free {refund.form.form_number}"
            body = f"""
Bonjour {traveler.full_name},

Votre remboursement Tax Free a été effectué avec succès.

Numéro de bordereau: {refund.form.form_number}
Montant remboursé: {refund.net_amount} {refund.currency}
Méthode: {refund.get_method_display()}

Merci d'avoir utilisé notre service Tax Free.
            """.strip()
        else:
            return
        
        # Create email notification
        if traveler.email:
            OutboundNotification.objects.create(
                user=None,
                email=traveler.email,
                type=NotificationType.EMAIL,
                subject=subject,
                body=body,
                related_entity='Refund',
                related_entity_id=str(refund.id)
            )
        
        # Create SMS notification (only if SMS is enabled)
        if traveler.phone and SettingsService.is_sms_notifications_enabled():
            sms_body = f"Tax Free: Remboursement {refund.form.form_number} effectué. Montant: {refund.net_amount} {refund.currency}"
            OutboundNotification.objects.create(
                user=None,
                phone=traveler.phone,
                type=NotificationType.SMS,
                body=sms_body,
                related_entity='Refund',
                related_entity_id=str(refund.id)
            )
