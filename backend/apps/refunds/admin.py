"""
Admin configuration for refunds app.
"""
from django.contrib import admin
from .models import Refund, PaymentAttempt


class PaymentAttemptInline(admin.TabularInline):
    model = PaymentAttempt
    extra = 0
    readonly_fields = ['id', 'started_at', 'completed_at']
    fields = ['provider', 'status', 'error_code', 'error_message', 'started_at', 'completed_at']


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ['form', 'method', 'net_amount', 'status', 'created_at']
    list_filter = ['status', 'method', 'created_at']
    search_fields = ['form__form_number']
    raw_id_fields = ['form', 'initiated_by', 'cancelled_by', 'cash_collected_by']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [PaymentAttemptInline]
    
    fieldsets = (
        ('Form', {
            'fields': ('id', 'form')
        }),
        ('Amount', {
            'fields': ('currency', 'gross_amount', 'operator_fee', 'net_amount')
        }),
        ('Payment', {
            'fields': ('method', 'payment_details')
        }),
        ('Status', {
            'fields': ('status', 'initiated_at', 'initiated_by', 'paid_at')
        }),
        ('Cash Collection', {
            'fields': ('cash_collected', 'cash_collected_at', 'cash_collected_by'),
            'classes': ('collapse',)
        }),
        ('Retry', {
            'fields': ('retry_count', 'max_retries', 'next_retry_at'),
            'classes': ('collapse',)
        }),
        ('Cancellation', {
            'fields': ('cancelled_at', 'cancelled_by', 'cancellation_reason'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(PaymentAttempt)
class PaymentAttemptAdmin(admin.ModelAdmin):
    list_display = ['refund', 'provider', 'status', 'started_at', 'completed_at']
    list_filter = ['status', 'provider', 'started_at']
    search_fields = ['refund__form__form_number', 'provider_request_id']
    readonly_fields = ['id', 'started_at']
