"""
Admin configuration for customs app.
"""
from django.contrib import admin
from .models import PointOfExit, CustomsValidation, OfflineSyncBatch


@admin.register(PointOfExit)
class PointOfExitAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'type', 'city', 'is_active']
    list_filter = ['type', 'is_active', 'province']
    search_fields = ['code', 'name', 'city']


@admin.register(CustomsValidation)
class CustomsValidationAdmin(admin.ModelAdmin):
    list_display = ['form', 'decision', 'agent', 'point_of_exit', 'decided_at', 'is_offline']
    list_filter = ['decision', 'point_of_exit', 'is_offline', 'decided_at']
    search_fields = ['form__form_number', 'agent__email']
    raw_id_fields = ['form', 'agent']
    readonly_fields = ['id', 'created_at']


@admin.register(OfflineSyncBatch)
class OfflineSyncBatchAdmin(admin.ModelAdmin):
    list_display = ['batch_id', 'agent', 'point_of_exit', 'validations_count', 'successful_count', 'failed_count', 'synced_at']
    list_filter = ['point_of_exit', 'synced_at']
    search_fields = ['batch_id', 'agent__email']
    readonly_fields = ['id', 'synced_at']
