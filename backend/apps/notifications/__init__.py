"""
Email notifications app for Smart Classroom Attendance System.

This module handles:
- Weekly attendance report emails
- Low attendance alert emails
- Email template rendering
- Asynchronous email delivery with Celery
- Email status tracking
"""

default_app_config = 'apps.notifications.apps.NotificationsConfig'
