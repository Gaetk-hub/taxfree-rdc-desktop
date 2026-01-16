"""
Admin configuration for merchants app.
"""
from django.contrib import admin
from .models import Merchant, Outlet, POSDevice


class OutletInline(admin.TabularInline):
    model = Outlet
    extra = 0
    fields = ['name', 'code', 'city', 'is_active']


@admin.register(Merchant)
class MerchantAdmin(admin.ModelAdmin):
    list_display = ['name', 'registration_number', 'status', 'city', 'created_at']
    list_filter = ['status', 'country', 'city', 'created_at']
    search_fields = ['name', 'trade_name', 'registration_number', 'contact_email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'submitted_at', 'approved_at']
    inlines = [OutletInline]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'name', 'trade_name', 'registration_number', 'tax_id', 'vat_number')
        }),
        ('Address', {
            'fields': ('address_line1', 'address_line2', 'city', 'province', 'postal_code', 'country')
        }),
        ('Contact', {
            'fields': ('contact_name', 'contact_email', 'contact_phone')
        }),
        ('Banking', {
            'fields': ('bank_name', 'bank_account_number', 'bank_swift_code', 'mobile_money_number', 'mobile_money_provider')
        }),
        ('Status', {
            'fields': ('status', 'status_reason', 'submitted_at', 'approved_at', 'approved_by')
        }),
        ('Metadata', {
            'fields': ('is_deleted', 'deleted_at', 'created_at', 'updated_at')
        }),
    )


class POSDeviceInline(admin.TabularInline):
    model = POSDevice
    extra = 0
    fields = ['name', 'device_id', 'api_key_prefix', 'is_active', 'last_seen']
    readonly_fields = ['api_key_prefix', 'last_seen']


@admin.register(Outlet)
class OutletAdmin(admin.ModelAdmin):
    list_display = ['name', 'merchant', 'code', 'city', 'is_active']
    list_filter = ['is_active', 'merchant', 'city']
    search_fields = ['name', 'code', 'merchant__name']
    inlines = [POSDeviceInline]


@admin.register(POSDevice)
class POSDeviceAdmin(admin.ModelAdmin):
    list_display = ['name', 'outlet', 'device_id', 'api_key_prefix', 'is_active', 'last_seen']
    list_filter = ['is_active', 'outlet__merchant']
    search_fields = ['name', 'device_id']
    readonly_fields = ['api_key', 'api_key_prefix', 'last_seen']
