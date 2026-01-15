"""
Admin configuration for notifications app.
"""

from django.contrib import admin
from .models import EmailNotification


@admin.register(EmailNotification)
class EmailNotificationAdmin(admin.ModelAdmin):
    """Admin interface for EmailNotification model."""
    
    list_display = [
        'id',
        'notification_type',
        'recipient_email',
        'recipient_name',
        'status',
        'retry_count',
        'scheduled_at',
        'sent_at',
        'created_at'
    ]
    
    list_filter = [
        'notification_type',
        'status',
        'created_at',
        'scheduled_at'
    ]
    
    search_fields = [
        'recipient_email',
        'recipient_name',
        'subject',
        'id'
    ]
    
    readonly_fields = [
        'id',
        'created_at',
        'updated_at',
        'sent_at',
        'failed_at'
    ]
    
    ordering = ['-created_at']
    
    fieldsets = (
        ('Email Details', {
            'fields': (
                'id',
                'notification_type',
                'recipient_email',
                'recipient_name',
                'subject'
            )
        }),
        ('Delivery Status', {
            'fields': (
                'status',
                'retry_count',
                'max_retries',
                'error_message'
            )
        }),
        ('Timestamps', {
            'fields': (
                'scheduled_at',
                'sent_at',
                'failed_at',
                'created_at',
                'updated_at'
            )
        }),
        ('Context Data', {
            'fields': ('context_data',),
            'classes': ('collapse',)
        }),
    )
