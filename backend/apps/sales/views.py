"""
Views for sales app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from apps.accounts.permissions import IsAdmin, IsMerchant
from apps.audit.services import AuditService
from .models import SaleInvoice, SaleItem
from .serializers import (
    SaleInvoiceSerializer, SaleInvoiceCreateSerializer,
    SaleInvoiceCancelSerializer, SaleItemSerializer
)


class SaleInvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for sale invoice management."""
    
    queryset = SaleInvoice.objects.all()
    permission_classes = [IsAuthenticated]
    filterset_fields = ['merchant', 'outlet', 'is_cancelled', 'invoice_date']
    search_fields = ['invoice_number', 'merchant__name']
    ordering_fields = ['created_at', 'invoice_date', 'total_amount']

    def get_serializer_class(self):
        if self.action == 'create':
            return SaleInvoiceCreateSerializer
        if self.action == 'cancel':
            return SaleInvoiceCancelSerializer
        return SaleInvoiceSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_merchant_user() and user.merchant:
            queryset = queryset.filter(merchant=user.merchant)
            # If employee, further filter by their assigned outlet
            if user.is_merchant_employee() and user.outlet_id:
                queryset = queryset.filter(outlet_id=user.outlet_id)
        elif not user.is_admin() and not user.is_auditor():
            queryset = queryset.none()
        
        return queryset

    def perform_create(self, serializer):
        invoice = serializer.save()
        AuditService.log(
            actor=self.request.user,
            action='INVOICE_CREATED',
            entity='SaleInvoice',
            entity_id=str(invoice.id),
            metadata={
                'invoice_number': invoice.invoice_number,
                'total_amount': str(invoice.total_amount),
                'merchant': invoice.merchant.name
            }
        )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an invoice."""
        invoice = self.get_object()
        serializer = SaleInvoiceCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if invoice.is_cancelled:
            return Response(
                {'error': 'Invoice is already cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's a tax free form
        if hasattr(invoice, 'taxfree_form'):
            form = invoice.taxfree_form
            if form.status not in ['CREATED', 'ISSUED']:
                return Response(
                    {'error': 'Cannot cancel invoice with processed tax free form'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        invoice.is_cancelled = True
        invoice.cancelled_at = timezone.now()
        invoice.cancelled_reason = serializer.validated_data['reason']
        invoice.save()
        
        AuditService.log(
            actor=request.user,
            action='INVOICE_CANCELLED',
            entity='SaleInvoice',
            entity_id=str(invoice.id),
            metadata={
                'invoice_number': invoice.invoice_number,
                'reason': invoice.cancelled_reason
            }
        )
        
        return Response(SaleInvoiceSerializer(invoice).data)


class SaleItemViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for sale items (read-only)."""
    
    queryset = SaleItem.objects.all()
    serializer_class = SaleItemSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['invoice', 'product_category', 'is_eligible']
