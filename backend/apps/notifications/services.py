"""
Email service for sending notification emails.
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.utils import timezone

from apps.classes.models import Student, Teacher
from apps.attendance.models import Attendance
from .models import EmailNotification

logger = logging.getLogger(__name__)


class EmailService:
    """
    Service for sending email notifications.
    
    Handles:
    - Email composition from templates
    - SMTP delivery
    - Error handling and logging
    """
    
    @staticmethod
    def send_email(
        notification_type: str,
        recipient_email: str,
        recipient_name: str,
        subject: str,
        template_name: str,
        context: Dict,
        notification_id: Optional[str] = None
    ) -> bool:
        """
        Send an email using Django's email backend.
        
        Args:
            notification_type: Type of notification
            recipient_email: Email address of recipient
            recipient_name: Name of recipient
            subject: Email subject line
            template_name: Name of HTML template (without .html)
            context: Template context dictionary
            notification_id: Optional EmailNotification ID for tracking
        
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Add recipient name to context
            context['recipient_name'] = recipient_name
            
            # Render HTML content
            html_content = render_to_string(
                f'notifications/emails/{template_name}.html',
                context
            )
            
            # Create plain text version
            text_content = strip_tags(html_content)
            
            # Create email message
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient_email]
            )
            
            # Attach HTML alternative
            email.attach_alternative(html_content, "text/html")
            
            # Send email
            email.send(fail_silently=False)
            
            logger.info(
                f"Email sent successfully: {notification_type} to {recipient_email}"
            )
            
            return True
            
        except Exception as e:
            error_msg = f"Failed to send email to {recipient_email}: {str(e)}"
            logger.error(error_msg)
            return False
    
    @staticmethod
    def prepare_weekly_report_context(student: Student) -> Dict:
        """
        Prepare context data for weekly attendance report email.
        
        Args:
            student: Student object
        
        Returns:
            Dictionary with template context
        """
        # Get attendance data for the past week
        end_date = timezone.now()
        start_date = end_date - timedelta(days=7)
        
        records = Attendance.objects.filter(
            student=student,
            session__start_time__range=[start_date, end_date]
        ).select_related('session', 'session__class_ref').order_by('session__start_time')
        
        # Calculate statistics
        total_sessions = records.count()
        present_count = records.filter(status='PRESENT').count()
        absent_count = records.filter(status='ABSENT').count()
        late_count = records.filter(status='LATE').count()
        
        attendance_rate = (present_count / total_sessions * 100) if total_sessions > 0 else 0
        
        # Group records by class
        classes_data = {}
        for record in records:
            class_name = record.session.class_ref.name
            if class_name not in classes_data:
                classes_data[class_name] = {
                    'name': class_name,
                    'sessions': [],
                    'present': 0,
                    'absent': 0,
                    'late': 0
                }
            
            classes_data[class_name]['sessions'].append({
                'date': record.session.start_time.strftime('%Y-%m-%d'),
                'status': record.status,
                'marked_at': record.marked_at.strftime('%Y-%m-%d %H:%M:%S') if record.marked_at else None
            })
            
            if record.status == 'PRESENT':
                classes_data[class_name]['present'] += 1
            elif record.status == 'ABSENT':
                classes_data[class_name]['absent'] += 1
            elif record.status == 'LATE':
                classes_data[class_name]['late'] += 1
        
        # Calculate per-class attendance rates
        for class_data in classes_data.values():
            total = len(class_data['sessions'])
            class_data['attendance_rate'] = (
                class_data['present'] / total * 100
            ) if total > 0 else 0
        
        return {
            'student_name': student.get_full_name(),
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
            'total_sessions': total_sessions,
            'present_count': present_count,
            'absent_count': absent_count,
            'late_count': late_count,
            'attendance_rate': round(attendance_rate, 1),
            'classes': list(classes_data.values()),
            'low_attendance_warning': attendance_rate < 75.0
        }
    
    @staticmethod
    def prepare_low_attendance_alert_context(
        student: Student,
        attendance_rate: float,
        threshold: float = 75.0
    ) -> Dict:
        """
        Prepare context data for low attendance alert email.
        
        Args:
            student: Student object
            attendance_rate: Current attendance percentage
            threshold: Threshold percentage that triggered the alert
        
        Returns:
            Dictionary with template context
        """
        # Get recent absence data
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        absent_records = Attendance.objects.filter(
            student=student,
            session__start_time__range=[start_date, end_date],
            status='ABSENT'
        ).select_related(
            'session',
            'session__class_ref'
        ).order_by('-session__start_time')[:10]
        
        recent_absences = [
            {
                'date': record.session.start_time.strftime('%Y-%m-%d'),
                'class_name': record.session.class_ref.name,
            }
            for record in absent_records
        ]
        
        return {
            'student_name': student.get_full_name(),
            'attendance_rate': round(attendance_rate, 1),
            'threshold': threshold,
            'percentage_below': round(threshold - attendance_rate, 1),
            'recent_absences': recent_absences,
            'total_absences': len(recent_absences)
        }
    
    @staticmethod
    def get_students_with_low_attendance(threshold: float = 75.0) -> List[Dict]:
        """
        Get all students with attendance below the threshold.
        
        Args:
            threshold: Minimum acceptable attendance percentage
        
        Returns:
            List of dictionaries with student and attendance rate
        """
        from apps.analytics.services import StudentAnalyticsService
        
        students_data = []
        students = Student.objects.all()
        
        for student in students:
            attendance_rate = StudentAnalyticsService.student_attendance_percentage(student.id)
            
            if attendance_rate < threshold:
                students_data.append({
                    'student': student,
                    'attendance_rate': attendance_rate
                })
        
        return students_data
