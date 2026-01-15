"""
Serializers for email notification API.
"""

from rest_framework import serializers
from .models import EmailNotification


class EmailNotificationSerializer(serializers.ModelSerializer):
    """Serializer for EmailNotification model."""
    
    notification_type_display = serializers.CharField(
        source='get_notification_type_display',
        read_only=True
    )
    
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    
    class Meta:
        model = EmailNotification
        fields = [
            'id',
            'notification_type',
            'notification_type_display',
            'recipient_email',
            'recipient_name',
            'subject',
            'status',
            'status_display',
            'retry_count',
            'max_retries',
            'error_message',
            'scheduled_at',
            'sent_at',
            'failed_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'status',
            'retry_count',
            'error_message',
            'sent_at',
            'failed_at',
            'created_at',
            'updated_at'
        ]


class TriggerWeeklyReportSerializer(serializers.Serializer):
    """Serializer for triggering weekly report emails."""
    
    send_to_all = serializers.BooleanField(
        default=True,
        help_text="Send reports to all active students"
    )
    
    student_emails = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        allow_empty=True,
        help_text="Specific student emails to send reports to (if send_to_all=False)"
    )
    
    def validate(self, data):
        """Validate that either send_to_all is True or student_emails is provided."""
        if not data.get('send_to_all') and not data.get('student_emails'):
            raise serializers.ValidationError(
                "Either set send_to_all=true or provide student_emails"
            )
        return data


class TriggerLowAttendanceAlertSerializer(serializers.Serializer):
    """Serializer for triggering low attendance alert emails."""
    
    threshold = serializers.FloatField(
        default=75.0,
        min_value=0.0,
        max_value=100.0,
        help_text="Attendance threshold percentage (default: 75%)"
    )


class EmailNotificationListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing notifications."""
    
    notification_type_display = serializers.CharField(
        source='get_notification_type_display',
        read_only=True
    )
    
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    
    class Meta:
        model = EmailNotification
        fields = [
            'id',
            'notification_type',
            'notification_type_display',
            'recipient_email',
            'recipient_name',
            'subject',
            'status',
            'status_display',
            'scheduled_at',
            'sent_at',
            'created_at'
        ]
