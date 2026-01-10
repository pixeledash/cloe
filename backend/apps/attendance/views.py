"""
Views for Attendance app
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from datetime import datetime

from .models import Attendance
from .serializers import (
    AttendanceDetailSerializer,
    AttendanceListSerializer,
    MarkAttendanceSerializer,
    BulkMarkAttendanceSerializer,
    UpdateAttendanceSerializer,
    SessionAttendanceStatsSerializer,
    StudentAttendanceStatsSerializer,
)
from .permissions import CanMarkAttendance, CanViewAttendance, IsTeacherOrAdmin
from apps.sessions.models import ClassSession
from apps.classes.models import Student


class AttendanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for attendance management
    
    Provides:
    - mark: Mark attendance for a single student
    - bulk_mark: Mark attendance for multiple students
    - session_attendance: View all attendance for a session
    - student_history: View attendance history for a student
    - update: Update existing attendance record
    """
    
    queryset = Attendance.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter queryset based on user role
        - Admins see all
        - Teachers see their class attendance
        - Students see their own attendance
        """
        user = self.request.user
        queryset = Attendance.objects.select_related(
            'session',
            'session__class_ref',
            'session__teacher',
            'student',
            'marked_by'
        )
        
        # Admins see all
        if user.has_role('ADMIN'):
            return queryset
        
        # Teachers see their class attendance
        if hasattr(user, 'teacher_profile'):
            return queryset.filter(session__teacher=user.teacher_profile)
        
        # Students see their own attendance
        if hasattr(user, 'student_profile'):
            return queryset.filter(student=user.student_profile)
        
        # Others see nothing
        return queryset.none()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return AttendanceListSerializer
        elif self.action in ['retrieve']:
            return AttendanceDetailSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return UpdateAttendanceSerializer
        return AttendanceDetailSerializer
    
    @action(detail=False, methods=['post'], permission_classes=[CanMarkAttendance])
    def mark(self, request):
        """
        Mark attendance for a single student
        
        POST /api/attendance/mark/
        Body: {
            "session_id": "uuid",
            "student_id": "uuid",
            "status": "PRESENT|ABSENT|LATE",
            "notes": "optional"
        }
        
        Returns:
        - 201: Attendance marked successfully
        - 400: Validation error
        - 403: Not authorized
        """
        serializer = MarkAttendanceSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            attendance = serializer.save()
            response_serializer = AttendanceDetailSerializer(attendance)
            
            return Response({
                'message': 'Attendance marked successfully',
                'attendance': response_serializer.data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[CanMarkAttendance])
    def bulk_mark(self, request):
        """
        Mark attendance for multiple students
        
        POST /api/attendance/bulk-mark/
        Body: {
            "session_id": "uuid",
            "records": [
                {"student_id": "uuid1", "status": "PRESENT"},
                {"student_id": "uuid2", "status": "ABSENT", "notes": "Sick"},
                ...
            ]
        }
        
        Returns:
        - 201: Bulk attendance marked
        - 400: Validation error
        - 403: Not authorized
        """
        serializer = BulkMarkAttendanceSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            attendance_records = serializer.save()
            errors = serializer.context.get('errors', [])
            
            response_data = {
                'message': 'Bulk attendance marked successfully',
                'count': len(attendance_records),
                'attendance_records': [
                    {
                        'id': str(record.id),
                        'student_id': record.student.student_id,
                        'status': record.status
                    }
                    for record in attendance_records
                ]
            }
            
            if errors:
                response_data['errors'] = errors
                response_data['message'] = 'Bulk attendance marked with some errors'
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='session/(?P<session_id>[^/.]+)',
            permission_classes=[IsTeacherOrAdmin])
    def session_attendance(self, request, session_id=None):
        """
        View all attendance records for a session
        
        GET /api/attendance/session/{session_id}/
        
        Query params:
        - status: Filter by PRESENT|ABSENT|LATE
        - marked_after: Filter by timestamp
        
        Returns:
        - 200: Session attendance data with statistics
        - 404: Session not found
        - 403: Not authorized
        """
        session = get_object_or_404(ClassSession, id=session_id)
        
        # Check authorization
        if not request.user.has_role('ADMIN'):
            if hasattr(request.user, 'teacher_profile'):
                if session.teacher != request.user.teacher_profile:
                    return Response(
                        {'detail': 'You are not authorized to view this session'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                return Response(
                    {'detail': 'Only teachers and admins can view session attendance'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get attendance records
        records = Attendance.objects.filter(session=session).select_related(
            'student', 'marked_by'
        )
        
        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter:
            records = records.filter(status=status_filter.upper())
        
        marked_after = request.query_params.get('marked_after')
        if marked_after:
            try:
                marked_after_dt = datetime.fromisoformat(marked_after)
                records = records.filter(marked_at__gte=marked_after_dt)
            except ValueError:
                pass
        
        # Get statistics
        stats = Attendance.get_session_statistics(session)
        
        # Serialize data
        records_serializer = AttendanceListSerializer(records, many=True)
        stats_serializer = SessionAttendanceStatsSerializer(stats)
        
        from apps.sessions.serializers import ClassSessionListSerializer
        session_serializer = ClassSessionListSerializer(session)
        
        return Response({
            'session': session_serializer.data,
            'statistics': stats_serializer.data,
            'records': records_serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='student/(?P<student_id>[^/.]+)')
    def student_history(self, request, student_id=None):
        """
        View attendance history for a specific student
        
        GET /api/attendance/student/{student_id}/
        
        Query params:
        - date_from: Start date (YYYY-MM-DD)
        - date_to: End date (YYYY-MM-DD)
        - subject_id: Filter by subject
        - status: Filter by status
        
        Returns:
        - 200: Student attendance history with statistics
        - 404: Student not found
        - 403: Not authorized
        """
        student = get_object_or_404(Student, id=student_id)
        
        # Check authorization
        if not request.user.has_role('ADMIN'):
            # Teachers can view their students
            if hasattr(request.user, 'teacher_profile'):
                # Check if student is in any of teacher's classes
                teacher_classes = ClassSession.objects.filter(
                    teacher=request.user.teacher_profile
                ).values_list('class_ref', flat=True)
                
                student_classes = student.enrolled_classes.values_list('class_instance', flat=True)
                
                if not set(teacher_classes).intersection(set(student_classes)):
                    return Response(
                        {'detail': 'You are not authorized to view this student'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Students can only view their own records
            elif hasattr(request.user, 'student_profile'):
                if student != request.user.student_profile:
                    return Response(
                        {'detail': 'You can only view your own attendance'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                return Response(
                    {'detail': 'Not authorized'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get attendance records
        records = Attendance.objects.filter(student=student).select_related(
            'session', 'session__class_ref', 'session__subject', 'marked_by'
        ).order_by('-marked_at')
        
        # Apply filters
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        subject_id = request.query_params.get('subject_id')
        status_filter = request.query_params.get('status')
        
        if date_from:
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
                records = records.filter(marked_at__date__gte=date_from_obj)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
                records = records.filter(marked_at__date__lte=date_to_obj)
            except ValueError:
                pass
        
        if subject_id:
            records = records.filter(session__subject_id=subject_id)
        
        if status_filter:
            records = records.filter(status=status_filter.upper())
        
        # Get statistics
        stats = Attendance.get_student_statistics(
            student,
            date_from=date_from,
            date_to=date_to
        )
        
        # Serialize data
        records_serializer = AttendanceListSerializer(records, many=True)
        stats_serializer = StudentAttendanceStatsSerializer(stats)
        
        from apps.classes.serializers import StudentSerializer
        student_serializer = StudentSerializer(student)
        
        return Response({
            'student': student_serializer.data,
            'statistics': stats_serializer.data,
            'records': records_serializer.data
        }, status=status.HTTP_200_OK)
    
    def update(self, request, *args, **kwargs):
        """
        Update existing attendance record
        
        PUT /api/attendance/{id}/
        Body: {
            "status": "LATE",
            "notes": "Arrived 10 minutes late"
        }
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Check if session is locked
        if instance.is_locked:
            return Response(
                {'detail': 'Cannot modify attendance - session ended and is locked'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            serializer.save()
            response_serializer = AttendanceDetailSerializer(instance)
            return Response({
                'message': 'Attendance updated successfully',
                'attendance': response_serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
