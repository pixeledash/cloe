from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allow admins full access, others read-only
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.roles.filter(name='ADMIN').exists()


class IsTeacherOrAdmin(permissions.BasePermission):
    """
    Allow teachers and admins access
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.roles.filter(name__in=['TEACHER', 'ADMIN']).exists()


class IsClassOwnerOrAdmin(permissions.BasePermission):
    """
    Allow class owner (teacher) or admin to modify class
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admins have full access
        if request.user.roles.filter(name='ADMIN').exists():
            return True
        
        # Teachers can only modify their own classes
        if hasattr(request.user, 'teacher_profile'):
            return obj.teacher == request.user.teacher_profile
        
        return False


class CanManageEnrollment(permissions.BasePermission):
    """
    Allow admins or class teacher to manage enrollment
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.roles.filter(name__in=['TEACHER', 'ADMIN']).exists()
    
    def has_object_permission(self, request, view, obj):
        # Admins can manage all enrollments
        if request.user.roles.filter(name='ADMIN').exists():
            return True
        
        # Teachers can manage their own class enrollments
        if hasattr(request.user, 'teacher_profile'):
            return obj.teacher == request.user.teacher_profile
        
        return False
