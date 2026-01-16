"""
Admin configuration for taxfree app.
"""
from django.contrib import admin
from .models import Traveler, TaxFreeForm


@admin.register(Traveler)
class TravelerAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'passport_number_last4', 'nationality', 'residence_country', 'created_at']
    list_filter = ['nationality', 'residence_country', 'created_at']
    search_fields = ['first_name', 'last_name', 'email', 'passport_number_last4']
    readonly_fields = ['id', 'passport_number_hash', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Identity', {
            'fields': ('id', 'passport_number_hash', 'passport_number_last4', 'passport_country')
        }),
        ('Personal Info', {
            'fields': ('first_name', 'last_name', 'date_of_birth')
        }),
        ('Residence', {
            'fields': ('nationality', 'residence_country', 'residence_address')
        }),
        ('Contact', {
            'fields': ('email', 'phone')
        }),
        ('Refund Preferences', {
            'fields': ('preferred_refund_method', 'refund_details')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(TaxFreeForm)
class TaxFreeFormAdmin(admin.ModelAdmin):
    list_display = ['form_number', 'traveler', 'status', 'refund_amount', 'expires_at', 'created_at']
    list_filter = ['status', 'requires_control', 'created_at', 'expires_at']
    search_fields = ['form_number', 'traveler__first_name', 'traveler__last_name']
    readonly_fields = [
        'id', 'form_number', 'qr_payload', 'qr_signature', 
        'created_at', 'updated_at', 'issued_at', 'validated_at'
    ]
    raw_id_fields = ['invoice', 'traveler', 'created_by', 'cancelled_by']
    
    fieldsets = (
        ('Form Info', {
            'fields': ('id', 'form_number', 'invoice', 'traveler')
        }),
        ('Amounts', {
            'fields': ('currency', 'eligible_amount', 'vat_amount', 'refund_amount', 'operator_fee')
        }),
        ('Status', {
            'fields': ('status', 'issued_at', 'expires_at', 'validated_at')
        }),
        ('Risk', {
            'fields': ('risk_score', 'risk_flags', 'requires_control')
        }),
        ('QR Code', {
            'fields': ('qr_payload', 'qr_signature'),
            'classes': ('collapse',)
        }),
        ('Rules', {
            'fields': ('rule_snapshot',),
            'classes': ('collapse',)
        }),
        ('Cancellation', {
            'fields': ('cancelled_at', 'cancelled_by', 'cancellation_reason'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )
