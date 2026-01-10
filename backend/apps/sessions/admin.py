"""
Admin interface for class sessions
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import ClassSession


@admin.register(ClassSession)
class ClassSessionAdmin(admin.ModelAdmin):
    """
    Admin interface for ClassSession model
    """
    list_display = [
        'id_short',
        'class_name',
        'subject_code',
        'teacher_name',
        'start_time',
        'end_time',
        'status_badge',
        'duration_display'
    ]
    
    list_filter = [
        'status',
        'subject',
        'teacher',
        'start_time'
    ]
    
    search_fields = [
        'class_ref__name',
        'subject__code',
        'subject__name',
        'teacher__user__first_name',
        'teacher__user__last_name',
        'teacher__user__email'
    ]
    
    readonly_fields = [
        'id',
        'start_time',
        'created_at',
        'updated_at',
        'duration_display'
    ]
    
    fieldsets = (
        ('Session Information', {
            'fields': ('id', 'status', 'start_time', 'end_time', 'duration_display')
        }),
        ('Class Details', {
            'fields': ('class_ref', 'subject', 'teacher')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    date_hierarchy = 'start_time'
    ordering = ['-start_time']
    
    def id_short(self, obj):
        """Display shortened UUID"""
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def class_name(self, obj):
        """Display class name"""
        return obj.class_ref.name
    class_name.short_description = 'Class'
    class_name.admin_order_field = 'class_ref__name'
    
    def subject_code(self, obj):
        """Display subject code"""
        return obj.subject.code
    subject_code.short_description = 'Subject'
    subject_code.admin_order_field = 'subject__code'
    
    def teacher_name(self, obj):
        """Display teacher name"""
        return obj.teacher.user.get_full_name()
    teacher_name.short_description = 'Teacher'
    teacher_name.admin_order_field = 'teacher__user__last_name'
    
    def status_badge(self, obj):
        """Display status with color badge"""
        if obj.status == 'ACTIVE':
            color = '#28a745'  # Green
            icon = '🟢'
        else:
            color = '#6c757d'  # Gray
            icon = '🔴'
        
        return format_html(
            '<span style="color: {};">{} {}</span>',
            color,
            icon,
            obj.status
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def duration_display(self, obj):
        """Display formatted duration"""
        return obj.duration_formatted
    duration_display.short_description = 'Duration'
    
    def has_delete_permission(self, request, obj=None):
        """
        Restrict deletion of ended sessions
        Only admins can delete ended sessions
        """
        if obj and obj.status == 'ENDED':
            return request.user.is_superuser
        return True
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        queryset = super().get_queryset(request)
        return queryset.select_related('class_ref', 'subject', 'teacher__user')
