"""
Attendance models for tracking student attendance in class sessions
"""
import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class Attendance(models.Model):
    """
    Attendance record for a student in a specific class session
    
    Business Rules:
    - Unique (session, student) - One attendance record per student per session
    - Session must be ACTIVE when marking attendance
    - No updates after session ENDED (locked)
    - Student must be enrolled in the session's class
    """
    
    STATUS_CHOICES = [
        ('PRESENT', 'Present'),
        ('ABSENT', 'Absent'),
        ('LATE', 'Late'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Foreign Keys
    session = models.ForeignKey(
        'class_sessions.ClassSession',
        on_delete=models.CASCADE,
        related_name='attendance_records',
        help_text='The class session this attendance belongs to'
    )
    student = models.ForeignKey(
        'classes.Student',
        on_delete=models.CASCADE,
        related_name='attendance_records',
        help_text='The student whose attendance is being recorded'
    )
    
    # Attendance Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        help_text='Attendance status (PRESENT, ABSENT, or LATE)'
    )
    
    # Tracking fields
    marked_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the attendance was marked'
    )
    marked_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='marked_attendance',
        help_text='The user who marked the attendance'
    )
    notes = models.TextField(
        blank=True,
        help_text='Optional notes about the attendance (e.g., reason for lateness)'
    )
    
    # Audit timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'attendance'
        constraints = [
            models.UniqueConstraint(
                fields=['session', 'student'],
                name='unique_attendance_per_session'
            )
        ]
        indexes = [
            models.Index(fields=['session']),
            models.Index(fields=['student']),
            models.Index(fields=['status']),
            models.Index(fields=['marked_at']),
            models.Index(fields=['session', 'student']),
        ]
        ordering = ['-marked_at']
        verbose_name = 'Attendance Record'
        verbose_name_plural = 'Attendance Records'
    
    def __str__(self):
        return f"{self.student.student_id} - {self.session.class_ref.name} - {self.get_status_display()}"
    
    def clean(self):
        """
        Validate attendance record
        
        Rules:
        1. Session must be ACTIVE when creating new records
        2. Student must be enrolled in the session's class
        3. Cannot modify attendance after session is ENDED
        """
        super().clean()
        errors = {}
        
        # Rule 1: Session must be ACTIVE for new records
        if not self.pk and self.session.status != 'ACTIVE':
            errors['session'] = f"Cannot mark attendance - session ended at {self.session.end_time.strftime('%H:%M on %b %d, %Y') if self.session.end_time else 'unknown time'}"
        
        # Rule 3: Cannot modify after session ENDED
        if self.pk and self.session.status == 'ENDED':
            try:
                old = Attendance.objects.get(pk=self.pk)
                if old.status != self.status or old.notes != self.notes:
                    errors['session'] = 'Cannot modify attendance - session ended and is locked'
            except Attendance.DoesNotExist:
                pass
        
        # Rule 2: Student must be enrolled in the class
        if self.session and self.student:
            enrolled_students = self.session.class_ref.enrolled_students.filter(
                student=self.student
            )
            if not enrolled_students.exists():
                errors['student'] = f"Student '{self.student.student_id}' is not enrolled in '{self.session.class_ref.name}'"
        
        if errors:
            raise ValidationError(errors)
    
    def save(self, *args, **kwargs):
        """Save with full validation"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def is_locked(self):
        """Check if attendance record is locked (session ended)"""
        return self.session.status == 'ENDED'
    
    @classmethod
    def get_session_statistics(cls, session):
        """
        Get attendance statistics for a session
        
        Returns dict with counts and percentages
        """
        total_enrolled = session.class_ref.enrolled_students.count()
        records = cls.objects.filter(session=session)
        
        present_count = records.filter(status='PRESENT').count()
        absent_count = records.filter(status='ABSENT').count()
        late_count = records.filter(status='LATE').count()
        marked_count = records.count()
        not_marked_count = total_enrolled - marked_count
        
        # Calculate attendance rate (PRESENT + LATE as attended)
        attended = present_count + late_count
        attendance_rate = round((attended / total_enrolled * 100), 2) if total_enrolled > 0 else 0.0
        
        return {
            'total_enrolled': total_enrolled,
            'present': present_count,
            'absent': absent_count,
            'late': late_count,
            'not_marked': not_marked_count,
            'marked': marked_count,
            'attendance_rate': attendance_rate,
        }
    
    @classmethod
    def get_student_statistics(cls, student, date_from=None, date_to=None):
        """
        Get attendance statistics for a student
        
        Args:
            student: Student instance
            date_from: Optional start date filter
            date_to: Optional end date filter
        
        Returns dict with counts and percentages
        """
        queryset = cls.objects.filter(student=student)
        
        if date_from:
            queryset = queryset.filter(marked_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(marked_at__date__lte=date_to)
        
        total_sessions = queryset.count()
        present_count = queryset.filter(status='PRESENT').count()
        absent_count = queryset.filter(status='ABSENT').count()
        late_count = queryset.filter(status='LATE').count()
        
        # Calculate attendance rate
        attended = present_count + late_count
        attendance_rate = round((attended / total_sessions * 100), 2) if total_sessions > 0 else 0.0
        
        return {
            'total_sessions': total_sessions,
            'present': present_count,
            'absent': absent_count,
            'late': late_count,
            'attendance_rate': attendance_rate,
        }
