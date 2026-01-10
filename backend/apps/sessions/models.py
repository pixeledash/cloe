"""
Class Session Models
Tracks individual class meetings for attendance tracking
"""
import uuid
from datetime import timedelta
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class ClassSession(models.Model):
    """
    Represents a single class meeting/session
    
    Business Rules:
    - Only one ACTIVE session per class at a time
    - Only the teacher who started can end it (or admin)
    - ENDED sessions are immutable
    """
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('ENDED', 'Ended'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Foreign keys to existing models
    class_ref = models.ForeignKey(
        'classes.Class',
        on_delete=models.CASCADE,
        related_name='sessions',
        help_text='The class section this session belongs to'
    )
    
    # Denormalized fields to preserve historical accuracy
    # (in case class teacher or subject changes later)
    subject = models.ForeignKey(
        'classes.Subject',
        on_delete=models.CASCADE,
        related_name='sessions',
        help_text='Subject at time of session creation'
    )
    
    teacher = models.ForeignKey(
        'classes.Teacher',
        on_delete=models.CASCADE,
        related_name='sessions',
        help_text='Teacher who started this session'
    )
    
    # Session timing
    start_time = models.DateTimeField(
        auto_now_add=True,
        help_text='When the session started'
    )
    
    end_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the session ended (null = still active)'
    )
    
    # Session status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ACTIVE',
        help_text='Current session status'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'class_sessions'
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['start_time']),
            models.Index(fields=['class_ref', 'status']),
        ]
        # Ensure only one active session per class
        constraints = [
            models.UniqueConstraint(
                fields=['class_ref', 'status'],
                condition=models.Q(status='ACTIVE'),
                name='one_active_session_per_class'
            )
        ]
    
    def __str__(self):
        return f"{self.class_ref.name} - {self.start_time.strftime('%Y-%m-%d %H:%M')}"
    
    def clean(self):
        """Validate model before saving"""
        super().clean()
        
        # Rule 1: Check for existing active session (if creating new)
        if not self.pk and self.status == 'ACTIVE':
            existing_active = ClassSession.objects.filter(
                class_ref=self.class_ref,
                status='ACTIVE'
            ).exists()
            if existing_active:
                raise ValidationError(
                    f"Class '{self.class_ref.name}' already has an active session"
                )
        
        # Rule 2: Cannot modify ended sessions (immutability)
        if self.pk:
            try:
                old_instance = ClassSession.objects.get(pk=self.pk)
                if old_instance.status == 'ENDED' and old_instance.status != self.status:
                    raise ValidationError("Cannot modify ended sessions")
                
                # Additional checks for ended sessions
                if old_instance.status == 'ENDED':
                    # Allow admin to modify, but check other fields haven't changed
                    fields_to_check = ['class_ref_id', 'subject_id', 'teacher_id', 'start_time']
                    for field in fields_to_check:
                        if getattr(old_instance, field) != getattr(self, field):
                            raise ValidationError(
                                f"Cannot modify {field} of ended sessions"
                            )
            except ClassSession.DoesNotExist:
                pass
        
        # Rule 3: end_time must be after start_time
        if self.end_time and self.start_time:
            if self.end_time <= self.start_time:
                raise ValidationError("End time must be after start time")
        
        # Rule 4: If status is ENDED, end_time must be set
        if self.status == 'ENDED' and not self.end_time:
            raise ValidationError("ENDED sessions must have an end_time")
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def duration(self):
        """
        Calculate session duration
        Returns timedelta if ended, or current duration if active
        """
        if self.end_time:
            return self.end_time - self.start_time
        else:
            # Still active - calculate current duration
            return timezone.now() - self.start_time
    
    @property
    def duration_formatted(self):
        """Return human-readable duration"""
        duration = self.duration
        hours = int(duration.total_seconds() // 3600)
        minutes = int((duration.total_seconds() % 3600) // 60)
        
        if hours > 0:
            return f"{hours} hour{'s' if hours != 1 else ''} {minutes} minute{'s' if minutes != 1 else ''}"
        else:
            return f"{minutes} minute{'s' if minutes != 1 else ''}"
    
    @property
    def is_active(self):
        """Check if session is currently active"""
        return self.status == 'ACTIVE'
    
    def end_session(self, user=None):
        """
        End an active session
        
        Args:
            user: The user attempting to end the session (for authorization check)
        
        Raises:
            ValidationError: If session already ended or user not authorized
        """
        if self.status == 'ENDED':
            raise ValidationError("Session already ended")
        
        # Check authorization (if user provided)
        if user:
            # Admin can end any session
            if not user.has_role('ADMIN'):
                # Teacher can only end their own session
                if self.teacher.user != user:
                    raise ValidationError(
                        "Only the teacher who started this session can end it"
                    )
        
        self.end_time = timezone.now()
        self.status = 'ENDED'
        self.save()
    
    @classmethod
    def get_active_sessions(cls, class_ref=None, teacher=None, subject=None):
        """
        Get all active sessions with optional filters
        
        Args:
            class_ref: Filter by specific class
            teacher: Filter by specific teacher
            subject: Filter by specific subject
        
        Returns:
            QuerySet of active sessions
        """
        queryset = cls.objects.filter(status='ACTIVE')
        
        if class_ref:
            queryset = queryset.filter(class_ref=class_ref)
        if teacher:
            queryset = queryset.filter(teacher=teacher)
        if subject:
            queryset = queryset.filter(subject=subject)
        
        return queryset.select_related('class_ref', 'teacher', 'subject')
    
    @classmethod
    def get_session_history(cls, class_ref=None, teacher=None, date_from=None, date_to=None, status=None):
        """
        Get session history with filters
        
        Args:
            class_ref: Filter by specific class
            teacher: Filter by specific teacher
            date_from: Start date filter
            date_to: End date filter
            status: Filter by status (ACTIVE or ENDED)
        
        Returns:
            QuerySet of sessions
        """
        queryset = cls.objects.all()
        
        if class_ref:
            queryset = queryset.filter(class_ref=class_ref)
        if teacher:
            queryset = queryset.filter(teacher=teacher)
        if date_from:
            queryset = queryset.filter(start_time__gte=date_from)
        if date_to:
            queryset = queryset.filter(start_time__lte=date_to)
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset.select_related('class_ref', 'teacher', 'subject')
