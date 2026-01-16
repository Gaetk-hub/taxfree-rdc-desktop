"""
Admin configuration for Support app.
"""
from django.contrib import admin
from .models import (
    Conversation, ChatMessage, ChatAttachment,
    TrainingCategory, TrainingContent, TrainingProgress
)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['reference', 'user', 'subject', 'category', 'status', 'assigned_to', 'created_at']
    list_filter = ['status', 'category', 'created_at']
    search_fields = ['reference', 'subject', 'user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['reference', 'created_at', 'updated_at', 'last_message_at']
    raw_id_fields = ['user', 'assigned_to', 'related_form', 'related_merchant']
    ordering = ['-created_at']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['conversation', 'sender', 'is_from_support', 'is_read', 'created_at']
    list_filter = ['is_from_support', 'is_system_message', 'is_read', 'created_at']
    search_fields = ['content', 'conversation__reference', 'sender__email']
    readonly_fields = ['created_at']
    raw_id_fields = ['conversation', 'sender']


@admin.register(ChatAttachment)
class ChatAttachmentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'message', 'file_type', 'file_size', 'created_at']
    list_filter = ['file_type', 'created_at']
    search_fields = ['filename']
    readonly_fields = ['created_at']


@admin.register(TrainingCategory)
class TrainingCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'order', 'is_active', 'content_count']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['order', 'name']

    def content_count(self, obj):
        return obj.contents.count()
    content_count.short_description = 'Contenus'


@admin.register(TrainingContent)
class TrainingContentAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'content_type', 'is_published', 'is_featured', 'view_count', 'published_at']
    list_filter = ['content_type', 'is_published', 'is_featured', 'category']
    search_fields = ['title', 'description', 'body']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['view_count', 'created_at', 'updated_at']
    raw_id_fields = ['author']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {
            'fields': ('category', 'title', 'slug', 'description', 'content_type')
        }),
        ('Contenu', {
            'fields': ('body', 'video_url', 'video_duration', 'thumbnail', 'reading_time')
        }),
        ('Ciblage', {
            'fields': ('target_roles', 'related_feature')
        }),
        ('Publication', {
            'fields': ('is_published', 'published_at', 'is_featured', 'order')
        }),
        ('Métadonnées', {
            'fields': ('author', 'view_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TrainingProgress)
class TrainingProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'content', 'is_completed', 'progress_percent', 'last_viewed_at']
    list_filter = ['is_completed', 'last_viewed_at']
    search_fields = ['user__email', 'content__title']
    readonly_fields = ['first_viewed_at', 'last_viewed_at']
    raw_id_fields = ['user', 'content']
