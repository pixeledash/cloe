"""
Custom permissions for class sessions
"""
from rest_framework import permissions


class CanStartSession(permissions.BasePermission):
    """
    Permission to start a class session
    - User must be a teacher
    - User must be assigned to the class
    """
    
    def has_permission(self, request, view):
        """Check if user can start sessions"""
        # Must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Must be a teacher
        if not hasattr(request.user, 'teacher_profile'):
            return False
        
        return True


class CanEndSession(permissions.BasePermission):
    """
    Permission to end a class session
    - User must be the teacher who started it, OR
    - User must be an admin
    """
    
    def has_object_permission(self, request, view, obj):
        """Check if user can end this specific session"""
        # Admins can end any session
        if request.user.has_role('ADMIN'):
            return True
        
        # Teachers can only end their own sessions
        if hasattr(request.user, 'teacher_profile'):
            return obj.teacher.user == request.user
        
        return False


class CanViewSession(permissions.BasePermission):
    """
    Permission to view session details
    - Teachers can view their own sessions
    - Admins can view all sessions
    """
    
    def has_permission(self, request, view):
        """Check if user can view sessions"""
        # Must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Teachers and admins can view
        return (
            hasattr(request.user, 'teacher_profile') or 
            request.user.has_role('ADMIN')
        )
    
    def has_object_permission(self, request, view, obj):
        """Check if user can view this specific session"""
        # Admins can view all
        if request.user.has_role('ADMIN'):
            return True
        
        # Teachers can view their own sessions
        if hasattr(request.user, 'teacher_profile'):
            return obj.teacher.user == request.user
        
        return False


class IsTeacherOrAdmin(permissions.BasePermission):
    """
    General permission for teacher or admin access
    """
    
    def has_permission(self, request, view):
        """Check if user is teacher or admin"""
        if not request.user or not request.user.is_authenticated:
            return False
        
        return (
            hasattr(request.user, 'teacher_profile') or 
            request.user.has_role('ADMIN')
        )
