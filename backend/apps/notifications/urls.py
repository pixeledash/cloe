"""
URL configuration for notifications API.
"""

from django.urls import path
from .views import (
    TriggerWeeklyReportView,
    TriggerLowAttendanceAlertView,
    ListNotificationsView,
    NotificationDetailView
)

app_name = 'notifications'

urlpatterns = [
    # Trigger endpoints (Admin/Teacher only)
    path(
        'trigger-weekly-report/',
        TriggerWeeklyReportView.as_view(),
        name='trigger-weekly-report'
    ),
    path(
        'trigger-low-attendance-alert/',
        TriggerLowAttendanceAlertView.as_view(),
        name='trigger-low-attendance-alert'
    ),
    
    # List and detail endpoints
    path(
        '',
        ListNotificationsView.as_view(),
        name='list-notifications'
    ),
    path(
        '<uuid:notification_id>/',
        NotificationDetailView.as_view(),
        name='notification-detail'
    ),
]
