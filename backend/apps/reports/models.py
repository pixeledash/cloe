"""
Report Models
Stores metadata about generated attendance reports
"""
import uuid
from django.db import models
from django.conf import settings


class Report(models.Model):
    """
    Represents a generated attendance report
    
    Business Rules:
    - Teachers can only generate reports for their own classes
    - Students can only generate their own reports
    - Admins can generate any report
    - Reports are generated asynchronously and stored
    """
    
    REPORT_TYPES = [
        ('STUDENT', 'Student Report'),
        ('CLASS', 'Class Report'),
    ]
    
    FORMATS = [
        ('CSV', 'CSV'),
        ('PDF', 'PDF'),  # Future enhancement
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    report_type = models.CharField(
        max_length=20,
        choices=REPORT_TYPES,
        help_text='Type of report to generate'
    )
    
    format = models.CharField(
        max_length=10,
        choices=FORMATS,
        default='CSV',
        help_text='Export format'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        help_text='Report generation status'
    )
    
    # Filter parameters
    class_instance = models.ForeignKey(
        'classes.Class',
        on_delete=models.CASCADE,
        related_name='reports',
        null=True,
        blank=True,
        help_text='Class for class reports'
    )
    
    student = models.ForeignKey(
        'classes.Student',
        on_delete=models.CASCADE,
        related_name='reports',
        null=True,
        blank=True,
        help_text='Student for student reports'
    )
    
    start_date = models.DateField(
        help_text='Report start date (inclusive)'
    )
    
    end_date = models.DateField(
        help_text='Report end date (inclusive)'
    )
    
    # File storage
    file_path = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text='Path to generated report file'
    )
    
    file_size = models.IntegerField(
        null=True,
        blank=True,
        help_text='File size in bytes'
    )
    
    # Metadata
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='generated_reports',
        help_text='User who requested the report'
    )
    
    error_message = models.TextField(
        null=True,
        blank=True,
        help_text='Error message if generation failed'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When report generation completed'
    )
    
    class Meta:
        db_table = 'reports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['generated_by', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['report_type']),
        ]
    
    def __str__(self):
        if self.report_type == 'STUDENT' and self.student:
            return f"Student Report: {self.student.full_name} ({self.start_date} to {self.end_date})"
        elif self.report_type == 'CLASS' and self.class_instance:
            return f"Class Report: {self.class_instance.name} ({self.start_date} to {self.end_date})"
        return f"Report {self.id}"
    
    def clean(self):
        """Validate report parameters"""
        from django.core.exceptions import ValidationError
        
        if self.report_type == 'STUDENT' and not self.student:
            raise ValidationError("Student is required for student reports")
        
        if self.report_type == 'CLASS' and not self.class_instance:
            raise ValidationError("Class is required for class reports")
        
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("Start date must be before or equal to end date")
