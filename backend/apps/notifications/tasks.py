"""
Celery tasks for asynchronous email delivery.
"""

import logging
from celery import shared_task
from django.utils import timezone
from django.conf import settings

from .models import EmailNotification
from .services import EmailService
from apps.classes.models import Student

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_email_task(self, notification_id: str):
    """
    Celery task to send an email notification.
    
    Args:
        notification_id: UUID of the EmailNotification
    
    Returns:
        Success status
    """
    try:
        notification = EmailNotification.objects.get(id=notification_id)
        
        # Check if notification has already been sent
        if notification.status == EmailNotification.DeliveryStatus.SENT:
            logger.info(f"Email {notification_id} already sent, skipping")
            return True
        
        # Determine template name based on notification type
        template_map = {
            EmailNotification.NotificationType.WEEKLY_REPORT: 'weekly_report',
            EmailNotification.NotificationType.LOW_ATTENDANCE_ALERT: 'low_attendance_alert',
            EmailNotification.NotificationType.SYSTEM_NOTIFICATION: 'system_notification',
        }
        
        template_name = template_map.get(notification.notification_type, 'system_notification')
        
        # Send email
        success = EmailService.send_email(
            notification_type=notification.notification_type,
            recipient_email=notification.recipient_email,
            recipient_name=notification.recipient_name,
            subject=notification.subject,
            template_name=template_name,
            context=notification.context_data,
            notification_id=str(notification_id)
        )
        
        if success:
            notification.mark_as_sent()
            logger.info(f"Email {notification_id} sent successfully")
            return True
        else:
            raise Exception("Email delivery failed")
    
    except EmailNotification.DoesNotExist:
        logger.error(f"EmailNotification {notification_id} not found")
        return False
    
    except Exception as exc:
        logger.error(f"Error sending email {notification_id}: {str(exc)}")
        
        try:
            notification = EmailNotification.objects.get(id=notification_id)
            notification.increment_retry()
            
            # Retry if attempts remaining
            if notification.can_retry():
                logger.info(
                    f"Retrying email {notification_id} "
                    f"(attempt {notification.retry_count}/{notification.max_retries})"
                )
                raise self.retry(exc=exc, countdown=60 * notification.retry_count)
            else:
                notification.mark_as_failed(str(exc))
                logger.error(f"Email {notification_id} failed after max retries")
        except EmailNotification.DoesNotExist:
            pass
        
        return False


@shared_task
def send_weekly_reports_task():
    """
    Celery task to send weekly attendance reports to all active students.
    
    This task should be scheduled to run weekly (e.g., every Sunday).
    """
    logger.info("Starting weekly reports task")
    
    students = Student.objects.all()
    sent_count = 0
    failed_count = 0
    
    for student in students:
        try:
            # Prepare email context
            context = EmailService.prepare_weekly_report_context(student)
            
            # Create notification record
            notification = EmailNotification.objects.create(
                notification_type=EmailNotification.NotificationType.WEEKLY_REPORT,
                recipient_email=student.email,
                recipient_name=student.get_full_name(),
                subject=f"Your Weekly Attendance Report - {context['start_date']} to {context['end_date']}",
                status=EmailNotification.DeliveryStatus.PENDING,
                scheduled_at=timezone.now(),
                context_data=context
            )
            
            # Queue email for delivery
            send_email_task.delay(str(notification.id))
            sent_count += 1
            
        except Exception as e:
            logger.error(f"Failed to queue weekly report for {student.email}: {str(e)}")
            failed_count += 1
    
    logger.info(
        f"Weekly reports task completed: {sent_count} queued, {failed_count} failed"
    )
    
    return {
        'queued': sent_count,
        'failed': failed_count
    }


@shared_task
def send_low_attendance_alerts_task(threshold: float = 75.0):
    """
    Celery task to send low attendance alerts to students below threshold.
    
    Args:
        threshold: Minimum acceptable attendance percentage (default: 75%)
    """
    logger.info(f"Starting low attendance alerts task (threshold: {threshold}%)")
    
    students_data = EmailService.get_students_with_low_attendance(threshold)
    sent_count = 0
    failed_count = 0
    
    for data in students_data:
        student = data['student']
        attendance_rate = data['attendance_rate']
        
        try:
            # Prepare email context
            context = EmailService.prepare_low_attendance_alert_context(
                student,
                attendance_rate,
                threshold
            )
            
            # Create notification record
            notification = EmailNotification.objects.create(
                notification_type=EmailNotification.NotificationType.LOW_ATTENDANCE_ALERT,
                recipient_email=student.email,
                recipient_name=student.get_full_name(),
                subject=f"⚠️ Low Attendance Alert - Action Required ({attendance_rate:.1f}%)",
                status=EmailNotification.DeliveryStatus.PENDING,
                scheduled_at=timezone.now(),
                context_data=context
            )
            
            # Queue email for delivery
            send_email_task.delay(str(notification.id))
            sent_count += 1
            
        except Exception as e:
            logger.error(f"Failed to queue alert for {student.email}: {str(e)}")
            failed_count += 1
    
    logger.info(
        f"Low attendance alerts task completed: {sent_count} queued, {failed_count} failed"
    )
    
    return {
        'queued': sent_count,
        'failed': failed_count,
        'threshold': threshold
    }


@shared_task
def cleanup_old_notifications_task(days: int = 30):
    """
    Celery task to clean up old notification records.
    
    Args:
        days: Delete notifications older than this many days
    """
    from datetime import timedelta
    
    cutoff_date = timezone.now() - timedelta(days=days)
    
    deleted_count, _ = EmailNotification.objects.filter(
        created_at__lt=cutoff_date,
        status=EmailNotification.DeliveryStatus.SENT
    ).delete()
    
    logger.info(f"Cleaned up {deleted_count} old email notifications")
    
    return {
        'deleted_count': deleted_count,
        'cutoff_date': cutoff_date.isoformat()
    }
