"""
Views for refunds app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import models
from django.db.models import Q
from django.http import HttpResponse

from apps.accounts.permissions import IsAdmin, IsOperator, IsCustomsAgent, IsOperatorOrCustomsAgent
from apps.audit.services import AuditService
from apps.taxfree.models import TaxFreeForm, TaxFreeFormStatus
from .models import Refund, PaymentAttempt, RefundStatus, RefundMethod
from .serializers import (
    RefundSerializer, RefundDetailSerializer,
    RefundInitiateSerializer, RefundRetrySerializer,
    CashCollectionSerializer, PaymentAttemptSerializer
)
from services.refund_service import RefundService
from services.receipt_service import ReceiptService


class RefundViewSet(viewsets.ModelViewSet):
    """ViewSet for refund management."""
    
    queryset = Refund.objects.all()
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'method']
    search_fields = ['form__form_number', 'form__traveler__first_name', 'form__traveler__last_name']
    ordering_fields = ['created_at', 'net_amount', 'status']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RefundDetailSerializer
        if self.action == 'initiate':
            return RefundInitiateSerializer
        if self.action == 'retry':
            return RefundRetrySerializer
        if self.action == 'collect_cash':
            return CashCollectionSerializer
        return RefundSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_merchant_user() and user.merchant:
            queryset = queryset.filter(form__invoice__merchant=user.merchant)
        elif user.is_customs_agent() or user.is_operator():
            # Customs agents and operators see refunds at their assigned point of exit
            if user.point_of_exit_id:
                # Filter by point of exit (validations done at this exit point)
                queryset = queryset.filter(
                    Q(form__customs_validation__point_of_exit_id=user.point_of_exit_id) |
                    Q(initiated_by=user) |
                    Q(cash_collected_by=user)
                ).distinct()
            else:
                # No point of exit assigned - only see their own refunds
                queryset = queryset.filter(
                    Q(initiated_by=user) |
                    Q(cash_collected_by=user)
                ).distinct()
        elif not user.is_admin() and not user.is_auditor():
            queryset = queryset.none()
        
        return queryset.select_related(
            'form', 'form__traveler', 'form__invoice__merchant',
            'form__customs_validation', 'initiated_by', 'cash_collected_by', 'cancelled_by'
        )

    def get_permissions(self):
        if self.action in ['initiate', 'collect_cash']:
            # Both operators and customs agents can initiate and collect cash refunds
            return [IsAuthenticated(), IsOperatorOrCustomsAgent()]
        if self.action in ['retry', 'cancel']:
            return [IsAuthenticated(), IsOperator()]
        return super().get_permissions()

    @action(detail=False, methods=['post'], url_path='initiate/(?P<form_id>[^/.]+)')
    def initiate(self, request, form_id=None):
        """Initiate a refund for a validated form."""
        try:
            form = TaxFreeForm.objects.get(id=form_id)
        except TaxFreeForm.DoesNotExist:
            return Response(
                {'error': 'Form not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if form is validated
        if form.status != TaxFreeFormStatus.VALIDATED:
            return Response(
                {'error': 'Form must be validated to initiate refund'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if refund already exists
        if hasattr(form, 'refund'):
            return Response(
                {'error': 'Refund already exists for this form'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = RefundInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Create refund with currency conversion
        refund = RefundService.create_refund(
            form=form,
            method=data['method'],
            payment_details=data.get('payment_details', {}),
            user=request.user,
            payout_currency_code=data.get('payout_currency', 'CDF')
        )
        
        # Process payment (async in production)
        RefundService.process_refund(refund)
        
        # Refresh from DB
        refund.refresh_from_db()
        
        AuditService.log(
            actor=request.user,
            action='REFUND_INITIATED',
            entity='Refund',
            entity_id=str(refund.id),
            metadata={
                'form_number': form.form_number,
                'method': data['method'],
                'amount_cdf': str(refund.net_amount),
                'payout_currency': refund.payout_currency,
                'exchange_rate': str(refund.exchange_rate_applied),
                'payout_amount': str(refund.payout_amount)
            }
        )
        
        return Response(RefundDetailSerializer(refund).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry a failed refund."""
        refund = self.get_object()
        
        if not refund.can_retry():
            return Response(
                {'error': 'Refund cannot be retried'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process retry
        RefundService.process_refund(refund)
        
        # Refresh from DB
        refund.refresh_from_db()
        
        AuditService.log(
            actor=request.user,
            action='REFUND_RETRY',
            entity='Refund',
            entity_id=str(refund.id),
            metadata={
                'form_number': refund.form.form_number,
                'retry_count': refund.retry_count
            }
        )
        
        return Response(RefundDetailSerializer(refund).data)

    @action(detail=True, methods=['post'])
    def collect_cash(self, request, pk=None):
        """Mark cash refund as collected."""
        from decimal import Decimal
        
        refund = self.get_object()
        
        if refund.method != RefundMethod.CASH:
            return Response(
                {'error': 'Only cash refunds can be collected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if refund.status != RefundStatus.INITIATED:
            return Response(
                {'error': 'Refund must be initiated to collect'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = CashCollectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get actual amount given to traveler
        actual_amount = serializer.validated_data.get('actual_amount')
        expected_amount = refund.payout_amount or refund.net_amount
        
        # Calculate service gain if actual amount is provided and less than expected
        service_gain = Decimal('0.00')
        service_gain_cdf = Decimal('0.00')
        
        if actual_amount is not None:
            actual_amount = Decimal(str(actual_amount))
            # Validate that actual amount is not more than expected
            if actual_amount > expected_amount:
                return Response(
                    {'error': f'Le montant donné ({actual_amount}) ne peut pas dépasser le montant prévu ({expected_amount})'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Calculate service gain
            service_gain = expected_amount - actual_amount
            
            # Convert service gain to CDF for reporting
            if refund.exchange_rate_applied and refund.exchange_rate_applied > 0:
                # service_gain is in payout_currency, convert to CDF
                # If 1 CDF = exchange_rate payout_currency, then 1 payout_currency = 1/exchange_rate CDF
                service_gain_cdf = service_gain / refund.exchange_rate_applied
            else:
                service_gain_cdf = service_gain
            
            refund.actual_payout_amount = actual_amount
        else:
            # If no actual amount provided, assume full amount was given
            refund.actual_payout_amount = expected_amount
        
        refund.service_gain = service_gain
        refund.service_gain_cdf = service_gain_cdf
        refund.cash_collected = True
        refund.cash_collected_at = timezone.now()
        refund.cash_collected_by = request.user
        refund.status = RefundStatus.PAID
        refund.paid_at = timezone.now()
        refund.save()
        
        # Update form status to REFUNDED
        from apps.taxfree.models import TaxFreeFormStatus
        refund.form.status = TaxFreeFormStatus.REFUNDED
        refund.form.save(update_fields=['status'])
        
        AuditService.log(
            actor=request.user,
            action='CASH_COLLECTED',
            entity='Refund',
            entity_id=str(refund.id),
            metadata={
                'form_number': refund.form.form_number,
                'expected_amount': str(expected_amount),
                'actual_amount': str(refund.actual_payout_amount),
                'service_gain': str(service_gain),
                'service_gain_cdf': str(service_gain_cdf),
                'payout_currency': refund.payout_currency
            }
        )
        
        return Response(RefundSerializer(refund).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pending refund."""
        refund = self.get_object()
        
        if refund.status not in [RefundStatus.PENDING, RefundStatus.FAILED]:
            return Response(
                {'error': 'Only pending or failed refunds can be cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '')
        
        refund.status = RefundStatus.CANCELLED
        refund.cancelled_at = timezone.now()
        refund.cancelled_by = request.user
        refund.cancellation_reason = reason
        refund.save()
        
        AuditService.log(
            actor=request.user,
            action='REFUND_CANCELLED',
            entity='Refund',
            entity_id=str(refund.id),
            metadata={
                'form_number': refund.form.form_number,
                'reason': reason
            }
        )
        
        return Response(RefundSerializer(refund).data)

    @action(detail=True, methods=['get'])
    def download_receipt(self, request, pk=None):
        """Download receipt PDF for a paid refund."""
        refund = self.get_object()
        
        if refund.status != RefundStatus.PAID:
            return Response(
                {'error': 'Receipt only available for paid refunds'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            pdf_buffer = ReceiptService.generate_receipt_pdf(refund)
            
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="recu_{refund.form.form_number}.pdf"'
            
            return response
        except Exception as e:
            return Response(
                {'error': f'Failed to generate receipt: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def send_receipt(self, request, pk=None):
        """Send receipt PDF to traveler by email."""
        refund = self.get_object()
        
        if refund.status != RefundStatus.PAID:
            return Response(
                {'error': 'Receipt only available for paid refunds'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not refund.form.traveler.email:
            return Response(
                {'error': 'Traveler has no email address'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success = ReceiptService.send_receipt_email(refund)
        
        if success:
            AuditService.log(
                actor=request.user,
                action='RECEIPT_SENT',
                entity='Refund',
                entity_id=str(refund.id),
                metadata={
                    'form_number': refund.form.form_number,
                    'email': refund.form.traveler.email
                }
            )
            return Response({'message': 'Receipt sent successfully'})
        else:
            return Response(
                {'error': 'Failed to send receipt email'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def queue(self, request):
        """Get refunds queue for operators."""
        queryset = self.get_queryset().filter(
            Q(status=RefundStatus.PENDING) |
            Q(status=RefundStatus.FAILED, retry_count__lt=models.F('max_retries'))
        ).order_by('created_at')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = RefundSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = RefundSerializer(queryset, many=True)
        return Response(serializer.data)


class PaymentAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for payment attempts (read-only)."""
    
    queryset = PaymentAttempt.objects.all()
    serializer_class = PaymentAttemptSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['refund', 'status', 'provider']
    ordering_fields = ['started_at']
