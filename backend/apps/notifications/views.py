"""
Views for email notification API endpoints.
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from apps.users.permissions import IsAdmin, IsTeacher
from apps.classes.models import Student
from .models import EmailNotification
from .serializers import (
    EmailNotificationSerializer,
    EmailNotificationListSerializer,
    TriggerWeeklyReportSerializer,
    TriggerLowAttendanceAlertSerializer
)
from .tasks import send_weekly_reports_task, send_low_attendance_alerts_task, send_email_task
from .services import EmailService

logger = logging.getLogger(__name__)


class TriggerWeeklyReportView(APIView):
    """
    API endpoint to trigger weekly attendance report emails.
    
    POST /api/notifications/trigger-weekly-report/
    
    Only admins and teachers can trigger reports.
    """
    
    permission_classes = [IsAuthenticated, IsAdmin | IsTeacher]
    
    def post(self, request):
        """Trigger weekly report email delivery."""
        serializer = TriggerWeeklyReportSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        send_to_all = serializer.validated_data.get('send_to_all', True)
        student_emails = serializer.validated_data.get('student_emails', [])
        
        try:
            if send_to_all:
                # Queue task to send reports to all active students
                task = send_weekly_reports_task.delay()
                
                return Response({
                    'message': 'Weekly reports queued for all active students',
                    'task_id': task.id,
                    'status': 'queued'
                }, status=status.HTTP_202_ACCEPTED)
            else:
                # Send reports to specific students
                students = Student.objects.filter(
                    email__in=student_emails
                )
                
                if not students.exists():
                    return Response({
                        'error': 'No students found with provided emails'
                    }, status=status.HTTP_404_NOT_FOUND)
                
                sent_count = 0
                failed_count = 0
                
                for student in students:
                    try:
                        context = EmailService.prepare_weekly_report_context(student)
                        
                        notification = EmailNotification.objects.create(
                            notification_type=EmailNotification.NotificationType.WEEKLY_REPORT,
                            recipient_email=student.email,
                            recipient_name=student.get_full_name(),
                            subject=f"Your Weekly Attendance Report - {context['start_date']} to {context['end_date']}",
                            status=EmailNotification.DeliveryStatus.PENDING,
                            scheduled_at=timezone.now(),
                            context_data=context
                        )
                        
                        send_email_task.delay(str(notification.id))
                        sent_count += 1
                        
                    except Exception as e:
                        logger.error(f"Failed to queue report for {student.email}: {str(e)}")
                        failed_count += 1
                
                return Response({
                    'message': f'Weekly reports queued for {sent_count} students',
                    'sent_count': sent_count,
                    'failed_count': failed_count,
                    'status': 'queued'
                }, status=status.HTTP_202_ACCEPTED)
        
        except Exception as e:
            logger.error(f"Error triggering weekly reports: {str(e)}")
            return Response({
                'error': 'Failed to trigger weekly reports',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TriggerLowAttendanceAlertView(APIView):
    """
    API endpoint to trigger low attendance alert emails.
    
    POST /api/notifications/trigger-low-attendance-alert/
    
    Only admins and teachers can trigger alerts.
    """
    
    permission_classes = [IsAuthenticated, IsAdmin | IsTeacher]
    
    def post(self, request):
        """Trigger low attendance alert email delivery."""
        serializer = TriggerLowAttendanceAlertSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        threshold = serializer.validated_data.get('threshold', 75.0)
        
        try:
            # Queue task to send alerts to students below threshold
            task = send_low_attendance_alerts_task.delay(threshold=threshold)
            
            return Response({
                'message': f'Low attendance alerts queued for students below {threshold}%',
                'task_id': task.id,
                'threshold': threshold,
                'status': 'queued'
            }, status=status.HTTP_202_ACCEPTED)
        
        except Exception as e:
            logger.error(f"Error triggering low attendance alerts: {str(e)}")
            return Response({
                'error': 'Failed to trigger low attendance alerts',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ListNotificationsView(APIView):
    """
    API endpoint to list email notifications.
    
    GET /api/notifications/
    
    Admins can see all notifications.
    Teachers can see notifications for their students.
    Students can see only their own notifications.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """List email notifications based on user role."""
        user = request.user
        
        # Get query parameters
        notification_type = request.query_params.get('type')
        status_filter = request.query_params.get('status')
        limit = int(request.query_params.get('limit', 50))
        
        # Base queryset
        queryset = EmailNotification.objects.all()
        
        # Filter by user role
        if user.has_role('ADMIN'):
            # Admins see all notifications
            pass
        elif user.has_role('TEACHER'):
            # Teachers see notifications for their students
            from apps.classes.models import Teacher
            try:
                teacher = Teacher.objects.get(user=user)
                # Get emails of students enrolled in teacher's classes
                student_emails = Student.objects.filter(
                    enrolled_classes__class_instance__teacher=teacher
                ).values_list('email', flat=True).distinct()
                queryset = queryset.filter(recipient_email__in=student_emails)
            except Teacher.DoesNotExist:
                queryset = queryset.none()
        elif user.has_role('STUDENT'):
            # Students see only their own notifications
            queryset = queryset.filter(recipient_email=user.email)
        else:
            queryset = queryset.none()
        
        # Apply filters
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Limit results
        queryset = queryset[:limit]
        
        # Serialize and return
        serializer = EmailNotificationListSerializer(queryset, many=True)
        
        return Response({
            'count': len(serializer.data),
            'notifications': serializer.data
        }, status=status.HTTP_200_OK)


class NotificationDetailView(APIView):
    """
    API endpoint to get details of a specific email notification.
    
    GET /api/notifications/{id}/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, notification_id):
        """Get notification details."""
        try:
            notification = EmailNotification.objects.get(id=notification_id)
            
            # Check permissions
            user = request.user
            if not user.has_role('ADMIN'):
                if user.has_role('STUDENT'):
                    if notification.recipient_email != user.email:
                        return Response({
                            'error': 'You do not have permission to view this notification'
                        }, status=status.HTTP_403_FORBIDDEN)
                elif user.has_role('TEACHER'):
                    from apps.classes.models import Teacher
                    try:
                        teacher = Teacher.objects.get(user=user)
                        student_emails = Student.objects.filter(
                            enrolled_classes__teacher=teacher
                        ).values_list('email', flat=True)
                        if notification.recipient_email not in student_emails:
                            return Response({
                                'error': 'You do not have permission to view this notification'
                            }, status=status.HTTP_403_FORBIDDEN)
                    except Teacher.DoesNotExist:
                        return Response({
                            'error': 'Teacher profile not found'
                        }, status=status.HTTP_404_NOT_FOUND)
            
            serializer = EmailNotificationSerializer(notification)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except EmailNotification.DoesNotExist:
            return Response({
                'error': 'Notification not found'
            }, status=status.HTTP_404_NOT_FOUND)
