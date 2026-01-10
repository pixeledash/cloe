"""
Admin interface for Attendance app
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    """
    Admin interface for Attendance model
    """
    
    list_display = [
        'id_short',
        'session_info',
        'student_info',
        'status_badge',
        'marked_at',
        'marked_by_name',
        'is_locked_badge'
    ]
    
    list_filter = [
        'status',
        'marked_at',
    ]
    
    search_fields = [
        'student__student_id',
        'student__user__first_name',
        'student__user__last_name',
        'student__user__email',
        'session__class_ref__name',
        'session__subject__code',
    ]
    
    readonly_fields = [
        'id',
        'marked_at',
        'created_at',
        'updated_at',
        'is_locked'
    ]
    
    fieldsets = [
        ('Session Information', {
            'fields': ['session']
        }),
        ('Student Information', {
            'fields': ['student', 'status', 'notes']
        }),
        ('Tracking', {
            'fields': ['marked_by', 'marked_at', 'is_locked']
        }),
        ('Audit', {
            'fields': ['id', 'created_at', 'updated_at'],
            'classes': ['collapse']
        })
    ]
    
    date_hierarchy = 'marked_at'
    
    ordering = ['-marked_at']
    
    def get_queryset(self, request):
        """Optimize queries with select_related"""
        qs = super().get_queryset(request)
        return qs.select_related(
            'session',
            'session__class_ref',
            'session__subject',
            'session__teacher',
            'student',
            'marked_by'
        )
    
    def id_short(self, obj):
        """Display shortened UUID"""
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def session_info(self, obj):
        """Display session information"""
        return format_html(
            '<strong>{}</strong><br><small>{}</small>',
            obj.session.class_ref.name,
            obj.session.start_time.strftime('%b %d, %Y %H:%M')
        )
    session_info.short_description = 'Session'
    
    def student_info(self, obj):
        """Display student information"""
        return format_html(
            '<strong>{}</strong><br><small>{}</small>',
            obj.student.user.get_full_name(),
            obj.student.student_id
        )
    student_info.short_description = 'Student'
    
    def status_badge(self, obj):
        """Display color-coded status badge"""
        colors = {
            'PRESENT': '#28a745',  # Green
            'ABSENT': '#dc3545',   # Red
            'LATE': '#ffc107',     # Yellow/Orange
        }
        color = colors.get(obj.status, '#6c757d')  # Default gray
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">● {}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def marked_by_name(self, obj):
        """Display who marked the attendance"""
        if obj.marked_by:
            return obj.marked_by.get_full_name()
        return '-'
    marked_by_name.short_description = 'Marked By'
    
    def is_locked_badge(self, obj):
        """Display lock status"""
        if obj.is_locked:
            return format_html(
                '<span style="color: #dc3545;">🔒 Locked</span>'
            )
        return format_html(
            '<span style="color: #28a745;">🔓 Editable</span>'
        )
    is_locked_badge.short_description = 'Lock Status'
    
    def has_delete_permission(self, request, obj=None):
        """
        Restrict deletion of attendance records
        - Only superusers can delete locked (ended session) records
        - Regular admins can delete unlocked records
        """
        if obj and obj.is_locked:
            return request.user.is_superuser
        return True
    
    def has_change_permission(self, request, obj=None):
        """
        Locked records (ended sessions) cannot be edited
        Display warning message
        """
        if obj and obj.is_locked:
            # Still return True to allow viewing, but validation will prevent edits
            return True
        return True
    
    def save_model(self, request, obj, form, change):
        """
        Set marked_by to current user if not set
        Validate before saving
        """
        if not obj.marked_by:
            obj.marked_by = request.user
        
        try:
            super().save_model(request, obj, form, change)
        except Exception as e:
            # Re-raise with user-friendly message
            from django.contrib import messages
            messages.error(request, f"Error saving attendance: {str(e)}")
            raise
    
    # Custom actions
    actions = ['mark_as_present', 'mark_as_absent', 'mark_as_late']
    
    def mark_as_present(self, request, queryset):
        """Bulk action to mark selected as PRESENT"""
        unlocked = queryset.filter(session__status='ACTIVE')
        count = unlocked.update(status='PRESENT')
        self.message_user(request, f'{count} attendance records marked as PRESENT')
    mark_as_present.short_description = 'Mark selected as PRESENT'
    
    def mark_as_absent(self, request, queryset):
        """Bulk action to mark selected as ABSENT"""
        unlocked = queryset.filter(session__status='ACTIVE')
        count = unlocked.update(status='ABSENT')
        self.message_user(request, f'{count} attendance records marked as ABSENT')
    mark_as_absent.short_description = 'Mark selected as ABSENT'
    
    def mark_as_late(self, request, queryset):
        """Bulk action to mark selected as LATE"""
        unlocked = queryset.filter(session__status='ACTIVE')
        count = unlocked.update(status='LATE')
        self.message_user(request, f'{count} attendance records marked as LATE')
    mark_as_late.short_description = 'Mark selected as LATE'
