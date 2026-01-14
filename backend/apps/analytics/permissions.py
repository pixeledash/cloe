"""
Analytics Permissions

Permission classes for analytics endpoints.
"""
from rest_framework import permissions
from apps.users.models import User


class CanViewStudentAnalytics(permissions.BasePermission):
    """
    Permission to view student analytics.
    
    Rules:
    - Admins: Can view all students
    - Teachers: Can view students in their classes
    - Students: Can only view their own analytics
    """
    
    def has_permission(self, request, view):
        """All authenticated users have base permission"""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permissions for student analytics"""
        user = request.user
        
        # Admins can view all
        if user.has_role('ADMIN'):
            return True
        
        # Students can only view their own stats
        # obj here is the Student instance
        if user.has_role('STUDENT'):
            # Check if this user is associated with the student
            from apps.classes.models import Student
            try:
                student = Student.objects.get(user=user)
                return student.id == obj.id
            except Student.DoesNotExist:
                return False
        
        # Teachers can view students in their classes
        if user.has_role('TEACHER'):
            from apps.classes.models import Teacher, ClassStudent
            try:
                teacher = Teacher.objects.get(user=user)
                # Check if student is in any of teacher's classes
                teacher_classes = teacher.classes.all()
                student_classes = ClassStudent.objects.filter(
                    student_id=obj.id
                ).values_list('class_instance_id', flat=True)
                
                return any(c.id in student_classes for c in teacher_classes)
            except Teacher.DoesNotExist:
                return False
        
        return False


class CanViewClassAnalytics(permissions.BasePermission):
    """
    Permission to view class analytics.
    
    Rules:
    - Admins: Can view all classes
    - Teachers: Can only view their own classes
    - Students: Cannot view class-level analytics
    """
    
    def has_permission(self, request, view):
        """All authenticated users have base permission"""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permissions for class analytics"""
        user = request.user
        
        # Admins can view all
        if user.has_role('ADMIN'):
            return True
        
        # Teachers can only view their own classes
        # obj here is the Class instance
        if user.has_role('TEACHER'):
            from apps.classes.models import Teacher
            try:
                teacher = Teacher.objects.get(user=user)
                return obj.teacher_id == teacher.id
            except Teacher.DoesNotExist:
                return False
        
        # Students cannot view class-level analytics
        return False
