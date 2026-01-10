"""
Permissions for Attendance app
"""
from rest_framework.permissions import BasePermission


class CanMarkAttendance(BasePermission):
    """
    Permission to mark attendance
    
    Rules:
    - Must be a teacher OR admin
    - If teacher, must be assigned to the session's class
    """
    
    def has_permission(self, request, view):
        """Check user is teacher or admin"""
        return (
            request.user.is_authenticated and
            (request.user.has_role('TEACHER') or request.user.has_role('ADMIN'))
        )
    
    def has_object_permission(self, request, view, obj):
        """
        Check teacher is assigned to the session's class
        obj is an Attendance instance
        """
        # Admins can mark any attendance
        if request.user.has_role('ADMIN'):
            return True
        
        # Teachers can only mark for their own classes
        if hasattr(request.user, 'teacher_profile'):
            return obj.session.teacher == request.user.teacher_profile
        
        return False


class CanViewAttendance(BasePermission):
    """
    Permission to view attendance records
    
    Rules:
    - Teachers can view attendance for their classes
    - Students can view their own attendance records
    - Admins can view all attendance
    """
    
    def has_permission(self, request, view):
        """All authenticated users can attempt to view"""
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """
        Check user can view this specific attendance record
        obj is an Attendance instance
        """
        # Admins can view all
        if request.user.has_role('ADMIN'):
            return True
        
        # Teachers can view their class attendance
        if hasattr(request.user, 'teacher_profile'):
            return obj.session.teacher == request.user.teacher_profile
        
        # Students can view their own attendance
        if hasattr(request.user, 'student_profile'):
            return obj.student == request.user.student_profile
        
        return False


class IsTeacherOrAdmin(BasePermission):
    """
    General permission for teacher or admin access
    """
    
    def has_permission(self, request, view):
        """Check user is teacher or admin"""
        return (
            request.user.is_authenticated and
            (request.user.has_role('TEACHER') or request.user.has_role('ADMIN'))
        )
