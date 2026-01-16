"""
Admin configuration for sales app.
"""
from django.contrib import admin
from .models import SaleInvoice, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = ['line_total', 'vat_amount']


@admin.register(SaleInvoice)
class SaleInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'merchant', 'outlet', 'total_amount', 'invoice_date', 'is_cancelled']
    list_filter = ['is_cancelled', 'merchant', 'invoice_date']
    search_fields = ['invoice_number', 'merchant__name']
    readonly_fields = ['id', 'subtotal', 'total_vat', 'total_amount', 'created_at', 'updated_at']
    inlines = [SaleItemInline]
    
    fieldsets = (
        ('Invoice Info', {
            'fields': ('id', 'merchant', 'outlet', 'invoice_number', 'invoice_date')
        }),
        ('Amounts', {
            'fields': ('currency', 'subtotal', 'total_vat', 'total_amount')
        }),
        ('Payment', {
            'fields': ('payment_method', 'payment_reference')
        }),
        ('Status', {
            'fields': ('is_cancelled', 'cancelled_at', 'cancelled_reason')
        }),
        ('Metadata', {
            'fields': ('notes', 'created_by', 'created_at', 'updated_at')
        }),
    )


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ['product_name', 'invoice', 'quantity', 'unit_price', 'vat_rate', 'line_total']
    list_filter = ['product_category', 'is_eligible']
    search_fields = ['product_name', 'product_code']
