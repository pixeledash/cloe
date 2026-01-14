"""
Analytics Views

API endpoints for attendance analytics.
All endpoints are read-only (GET only).
"""
from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.classes.models import Student, Class
from .services import StudentAnalyticsService, ClassAnalyticsService
from .serializers import (
    StudentAnalyticsSerializer,
    ClassAnalyticsSerializer,
    QuickStatsSerializer
)
from .permissions import CanViewStudentAnalytics, CanViewClassAnalytics


class StudentAnalyticsView(views.APIView):
    """Get comprehensive analytics for a student"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, student_id):
        """GET /api/analytics/student/{id}/"""
        # Get student object
        student = get_object_or_404(Student, id=student_id)
        
        # Check permissions
        permission = CanViewStudentAnalytics()
        if not permission.has_object_permission(request, self, student):
            return Response(
                {'error': 'You do not have permission to view this student\'s analytics.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get analytics from service
        analytics_data = StudentAnalyticsService.student_detailed_stats(student_id)
        
        # Add student info to response
        response_data = {
            'student_id': str(student.id),
            'student_name': student.get_full_name(),
            'student_email': student.email,
            **analytics_data
        }
        
        # Serialize and return
        serializer = StudentAnalyticsSerializer(data=response_data)
        serializer.is_valid(raise_exception=True)
        
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class StudentQuickStatsView(views.APIView):
    """Get quick stats for a student"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, student_id):
        """GET /api/analytics/student/{id}/quick/"""
        # Get student object
        student = get_object_or_404(Student, id=student_id)
        
        # Check permissions
        permission = CanViewStudentAnalytics()
        if not permission.has_object_permission(request, self, student):
            return Response(
                {'error': 'You do not have permission to view this student\'s analytics.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get basic stats from service
        analytics_data = StudentAnalyticsService.student_detailed_stats(student_id)
        
        # Extract quick stats
        quick_stats = {
            'total_sessions': analytics_data['total_sessions'],
            'attendance_rate': analytics_data['attendance_rate'],
            'present_count': analytics_data['present_count'],
            'absent_count': analytics_data['absent_count'],
            'late_count': analytics_data['late_count']
        }
        
        serializer = QuickStatsSerializer(data=quick_stats)
        serializer.is_valid(raise_exception=True)
        
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class ClassAnalyticsView(views.APIView):
    """Get comprehensive analytics for a class"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, class_id):
        """GET /api/analytics/class/{id}/"""
        # Get class object
        class_obj = get_object_or_404(Class, id=class_id)
        
        # Check permissions
        permission = CanViewClassAnalytics()
        if not permission.has_object_permission(request, self, class_obj):
            return Response(
                {'error': 'You do not have permission to view this class\'s analytics.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get analytics from service
        analytics_data = ClassAnalyticsService.class_attendance_overview(class_id)
        
        # Serialize and return
        serializer = ClassAnalyticsSerializer(data=analytics_data)
        serializer.is_valid(raise_exception=True)
        
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class ClassQuickStatsView(views.APIView):
    """Get quick stats for a class"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, class_id):
        """GET /api/analytics/class/{id}/quick/"""
        # Get class object
        class_obj = get_object_or_404(Class, id=class_id)
        
        # Check permissions
        permission = CanViewClassAnalytics()
        if not permission.has_object_permission(request, self, class_obj):
            return Response(
                {'error': 'You do not have permission to view this class\'s analytics.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get analytics from service
        analytics_data = ClassAnalyticsService.class_attendance_overview(class_id)
        
        # Extract quick stats
        quick_stats = {
            'total_students': analytics_data['total_students'],
            'total_sessions': analytics_data['total_sessions'],
            'overall_attendance_rate': analytics_data['overall_attendance_rate']
        }
        
        return Response(quick_stats, status=status.HTTP_200_OK)
