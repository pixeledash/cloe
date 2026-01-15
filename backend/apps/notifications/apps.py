"""
Django app configuration for notifications.
"""

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """Configuration for the notifications app."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notifications'
    verbose_name = 'Email Notifications'
    
    def ready(self):
        """Import signals and tasks when the app is ready."""
        # Import tasks to register them with Celery
        try:
            import apps.notifications.tasks  # noqa
        except ImportError:
            pass
