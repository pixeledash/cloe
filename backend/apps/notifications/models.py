"""
Models for tracking email notifications.
"""

import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailNotification(models.Model):
    """
    Model for tracking all email notifications sent by the system.
    
    Stores email metadata, delivery status, and error tracking for debugging.
    """
    
    class NotificationType(models.TextChoices):
        """Types of email notifications."""
        WEEKLY_REPORT = 'WEEKLY_REPORT', 'Weekly Attendance Report'
        LOW_ATTENDANCE_ALERT = 'LOW_ATTENDANCE_ALERT', 'Low Attendance Alert'
        SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION', 'System Notification'
    
    class DeliveryStatus(models.TextChoices):
        """Email delivery status."""
        PENDING = 'PENDING', 'Pending'
        SENT = 'SENT', 'Sent'
        FAILED = 'FAILED', 'Failed'
        RETRYING = 'RETRYING', 'Retrying'
    
    # Primary key
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Email details
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        help_text="Type of notification email"
    )
    
    recipient_email = models.EmailField(
        help_text="Email address of the recipient"
    )
    
    recipient_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Name of the recipient for personalization"
    )
    
    subject = models.CharField(
        max_length=255,
        help_text="Email subject line"
    )
    
    # Delivery tracking
    status = models.CharField(
        max_length=20,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.PENDING,
        help_text="Current delivery status"
    )
    
    retry_count = models.IntegerField(
        default=0,
        help_text="Number of delivery attempts"
    )
    
    max_retries = models.IntegerField(
        default=3,
        help_text="Maximum number of retry attempts"
    )
    
    # Error tracking
    error_message = models.TextField(
        blank=True,
        help_text="Error message if delivery failed"
    )
    
    # Metadata
    scheduled_at = models.DateTimeField(
        help_text="When the email was scheduled for delivery"
    )
    
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the email was successfully sent"
    )
    
    failed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the final delivery failure occurred"
    )
    
    # Optional context data (stored as JSON)
    context_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional context data for the email template"
    )
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'email_notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient_email', '-created_at']),
            models.Index(fields=['notification_type', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_notification_type_display()} to {self.recipient_email}"
    
    def mark_as_sent(self):
        """Mark the notification as successfully sent."""
        from django.utils import timezone
        self.status = self.DeliveryStatus.SENT
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at', 'updated_at'])
    
    def mark_as_failed(self, error_message: str):
        """Mark the notification as failed with error details."""
        from django.utils import timezone
        self.status = self.DeliveryStatus.FAILED
        self.error_message = error_message
        self.failed_at = timezone.now()
        self.save(update_fields=['status', 'error_message', 'failed_at', 'updated_at'])
    
    def increment_retry(self):
        """Increment retry count and update status."""
        self.retry_count += 1
        if self.retry_count < self.max_retries:
            self.status = self.DeliveryStatus.RETRYING
        else:
            self.status = self.DeliveryStatus.FAILED
        self.save(update_fields=['retry_count', 'status', 'updated_at'])
    
    def can_retry(self) -> bool:
        """Check if the notification can be retried."""
        return self.retry_count < self.max_retries and self.status in [
            self.DeliveryStatus.PENDING,
            self.DeliveryStatus.RETRYING
        ]
