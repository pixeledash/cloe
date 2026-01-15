"""
Report Admin Configuration
"""
from django.contrib import admin
from apps.reports.models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    """Admin interface for Report model"""
    
    list_display = [
        'id',
        'report_type',
        'format',
        'status',
        'class_instance',
        'student',
        'start_date',
        'end_date',
        'generated_by',
        'created_at'
    ]
    
    list_filter = [
        'report_type',
        'format',
        'status',
        'created_at'
    ]
    
    search_fields = [
        'id',
        'student__full_name',
        'class_instance__name',
        'generated_by__email'
    ]
    
    readonly_fields = [
        'id',
        'file_path',
        'file_size',
        'created_at',
        'completed_at'
    ]
    
    ordering = ['-created_at']
