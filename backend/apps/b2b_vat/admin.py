"""
Admin configuration for B2B VAT app.
"""
from django.contrib import admin
from .models import VATClaim, ClaimLine, ClaimAttachment, ClaimRFI, VATPaymentOrder


class ClaimLineInline(admin.TabularInline):
    model = ClaimLine
    extra = 0


class ClaimAttachmentInline(admin.TabularInline):
    model = ClaimAttachment
    extra = 0


@admin.register(VATClaim)
class VATClaimAdmin(admin.ModelAdmin):
    list_display = ['claim_number', 'company_name', 'status', 'total_vat_claimed', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['claim_number', 'company_name', 'company_tax_id']
    inlines = [ClaimLineInline, ClaimAttachmentInline]


@admin.register(VATPaymentOrder)
class VATPaymentOrderAdmin(admin.ModelAdmin):
    list_display = ['claim', 'amount', 'status', 'created_at']
    list_filter = ['status']
