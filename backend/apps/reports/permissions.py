"""
Report Permissions
Controls who can generate and download reports
"""
from rest_framework import permissions
from apps.classes.models import Teacher, Student, ClassStudent


class CanGenerateReport(permissions.BasePermission):
    """
    Permission to generate reports
    
    Rules:
    - ADMIN: Can generate any report
    - TEACHER: Can generate reports for own classes only
    - STUDENT: Can generate own reports only
    """
    
    def has_permission(self, request, view):
        """Check if user can generate reports at all"""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """Check specific report access"""
        user = request.user
        
        # Admins can access all reports
        if user.has_role('ADMIN'):
            return True
        
        # Check based on report type
        if obj.report_type == 'STUDENT':
            # Teachers can access reports for students in their classes
            if user.has_role('TEACHER'):
                teacher = Teacher.objects.get(user=user)
                # Check if student is in any of teacher's classes
                student_classes = ClassStudent.objects.filter(
                    student_id=obj.student_id
                ).values_list('class_instance_id', flat=True)
                
                teacher_classes = teacher.classes.values_list('id', flat=True)
                
                return bool(set(student_classes) & set(teacher_classes))
            
            # Students can access their own reports (linked by email)
            if user.has_role('STUDENT'):
                try:
                    student = Student.objects.get(email=user.email)
                    return obj.student_id == student.id
                except Student.DoesNotExist:
                    return False
        
        elif obj.report_type == 'CLASS':
            # Teachers can access reports for their own classes
            if user.has_role('TEACHER'):
                teacher = Teacher.objects.get(user=user)
                return obj.class_instance.teacher_id == teacher.id
            
            # Students cannot access class reports
            return False
        
        return False


class CanDownloadReport(permissions.BasePermission):
    """
    Permission to download generated reports
    
    Same rules as CanGenerateReport
    """
    
    def has_object_permission(self, request, view, obj):
        """Check if user can download this report"""
        user = request.user
        
        # Admins can download all reports
        if user.has_role('ADMIN'):
            return True
        
        # Check based on report type
        if obj.report_type == 'STUDENT':
            # Teachers can download reports for students in their classes
            if user.has_role('TEACHER'):
                try:
                    teacher = Teacher.objects.get(user=user)
                    # Check if student is in any of teacher's classes
                    student_classes = ClassStudent.objects.filter(
                        student_id=obj.student_id
                    ).values_list('class_instance_id', flat=True)
                    
                    teacher_classes = teacher.classes.values_list('id', flat=True)
                    
                    return bool(set(student_classes) & set(teacher_classes))
                except Teacher.DoesNotExist:
                    return False
            
            # Students can download their own reports (linked by email)
            if user.has_role('STUDENT'):
                try:
                    student = Student.objects.get(email=user.email)
                    return obj.student_id == student.id
                except Student.DoesNotExist:
                    return False
        
        elif obj.report_type == 'CLASS':
            # Teachers can download reports for their own classes
            if user.has_role('TEACHER'):
                try:
                    teacher = Teacher.objects.get(user=user)
                    return obj.class_instance.teacher_id == teacher.id
                except Teacher.DoesNotExist:
                    return False
            
            # Students cannot download class reports
            return False
        
        return False
