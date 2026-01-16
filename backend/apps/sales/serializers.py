"""
Serializers for sales app.
"""
from rest_framework import serializers
from decimal import Decimal
from .models import SaleInvoice, SaleItem, ProductCategory


class SaleItemSerializer(serializers.ModelSerializer):
    """Serializer for sale items."""
    
    category_display = serializers.CharField(source='get_product_category_display', read_only=True)
    
    class Meta:
        model = SaleItem
        fields = [
            'id', 'product_code', 'barcode', 'product_name', 'product_category', 'category_display',
            'description', 'quantity', 'unit_price', 'line_total',
            'vat_rate', 'vat_amount', 'is_eligible', 'ineligibility_reason'
        ]
        read_only_fields = ['id', 'line_total', 'vat_amount']


class SaleItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating sale items."""
    
    class Meta:
        model = SaleItem
        fields = [
            'product_code', 'barcode', 'product_name', 'product_category',
            'description', 'quantity', 'unit_price', 'vat_rate'
        ]


class SaleInvoiceSerializer(serializers.ModelSerializer):
    """Serializer for sale invoices."""
    
    items = SaleItemSerializer(many=True, read_only=True)
    merchant_name = serializers.CharField(source='merchant.name', read_only=True)
    outlet_name = serializers.CharField(source='outlet.name', read_only=True)
    items_count = serializers.IntegerField(source='items.count', read_only=True)
    has_taxfree_form = serializers.SerializerMethodField()
    
    class Meta:
        model = SaleInvoice
        fields = [
            'id', 'merchant', 'merchant_name', 'outlet', 'outlet_name',
            'invoice_number', 'invoice_date', 'currency',
            'subtotal', 'total_vat', 'total_amount',
            'payment_method', 'payment_reference', 'notes',
            'is_cancelled', 'cancelled_at', 'cancelled_reason',
            'items', 'items_count', 'has_taxfree_form',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'subtotal', 'total_vat', 'total_amount',
            'is_cancelled', 'cancelled_at', 'created_at', 'updated_at'
        ]

    def get_has_taxfree_form(self, obj):
        return hasattr(obj, 'taxfree_form')


class SaleInvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating sale invoices with items."""
    
    items = SaleItemCreateSerializer(many=True)
    
    class Meta:
        model = SaleInvoice
        fields = [
            'id', 'outlet', 'invoice_number', 'invoice_date', 'currency',
            'payment_method', 'payment_reference', 'notes', 'items',
            'subtotal', 'total_vat', 'total_amount'
        ]
        read_only_fields = ['id', 'subtotal', 'total_vat', 'total_amount']

    def to_internal_value(self, data):
        """Debug: Log incoming data before validation."""
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"=== INVOICE CREATE === Incoming data: {data}")
        logger.warning(f"=== INVOICE CREATE === Items type: {type(data.get('items'))}")
        logger.warning(f"=== INVOICE CREATE === Items value: {data.get('items')}")
        return super().to_internal_value(data)

    def validate_items(self, value):
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"=== INVOICE CREATE === Validating items: {value}")
        if not value:
            raise serializers.ValidationError('At least one item is required')
        return value

    def validate(self, attrs):
        """Check if invoice number already exists for this merchant."""
        outlet = attrs.get('outlet')
        invoice_number = attrs.get('invoice_number')
        
        if outlet and invoice_number:
            merchant = outlet.merchant
            if SaleInvoice.objects.filter(merchant=merchant, invoice_number=invoice_number).exists():
                raise serializers.ValidationError({
                    'invoice_number': f'Une facture avec le numéro "{invoice_number}" existe déjà pour ce commerçant.'
                })
        
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        
        # Set merchant from user or outlet
        outlet = validated_data['outlet']
        validated_data['merchant'] = outlet.merchant
        validated_data['created_by'] = user
        
        # Initialize totals
        validated_data['subtotal'] = Decimal('0.00')
        validated_data['total_vat'] = Decimal('0.00')
        validated_data['total_amount'] = Decimal('0.00')
        
        invoice = SaleInvoice.objects.create(**validated_data)
        
        # Create items
        for item_data in items_data:
            SaleItem.objects.create(invoice=invoice, **item_data)
        
        # Recalculate totals
        invoice.calculate_totals()
        invoice.save()
        
        return invoice


class SaleInvoiceCancelSerializer(serializers.Serializer):
    """Serializer for cancelling invoices."""
    reason = serializers.CharField(required=True)
