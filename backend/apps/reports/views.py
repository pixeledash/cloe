"""
Report Views
Handles report generation and download requests
"""
import os
from datetime import datetime
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.reports.models import Report
from apps.reports.serializers import (
    ReportRequestSerializer,
    ReportResponseSerializer,
    ReportListSerializer
)
from apps.reports.services import ReportGenerationService
from apps.reports.permissions import CanGenerateReport, CanDownloadReport
from apps.classes.models import Teacher, Student, Class


class GenerateReportView(APIView):
    """
    POST /api/reports/generate/
    Generate a new attendance report
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Generate a new report"""
        serializer = ReportRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = serializer.validated_data
        user = request.user
        
        # Validate permissions
        report_type = data['report_type'].upper()
        
        # Check if user can generate this type of report
        if report_type == 'STUDENT':
            student_id = data['student_id']
            
            # Admins can generate any report
            if not user.has_role('ADMIN'):
                # Teachers can generate reports for students in their classes
                if user.has_role('TEACHER'):
                    teacher = Teacher.objects.get(user=user)
                    from apps.classes.models import ClassStudent
                    
                    # Check if student is in any of teacher's classes
                    student_in_teacher_class = ClassStudent.objects.filter(
                        student_id=student_id,
                        class_instance__teacher_id=teacher.id
                    ).exists()
                    
                    if not student_in_teacher_class:
                        return Response(
                            {'error': 'You can only generate reports for students in your classes'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                
                # Students can only generate their own reports
                elif user.has_role('STUDENT'):
                    # Students are linked by email, not user FK
                    try:
                        student = Student.objects.get(email=user.email)
                        if student.id != student_id:
                            return Response(
                                {'error': 'You can only generate reports for yourself'},
                                status=status.HTTP_403_FORBIDDEN
                            )
                    except Student.DoesNotExist:
                        return Response(
                            {'error': 'Student profile not found'},
                            status=status.HTTP_404_NOT_FOUND
                        )
                else:
                    return Response(
                        {'error': 'You do not have permission to generate student reports'},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        elif report_type == 'CLASS':
            class_id = data['class_id']
            
            # Students cannot generate class reports
            if user.has_role('STUDENT'):
                return Response(
                    {'error': 'Students cannot generate class reports'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Teachers can only generate reports for their own classes
            if user.has_role('TEACHER'):
                teacher = Teacher.objects.get(user=user)
                class_instance = Class.objects.get(id=class_id)
                
                if class_instance.teacher_id != teacher.id:
                    return Response(
                        {'error': 'You can only generate reports for your own classes'},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        # Create report record
        report = Report.objects.create(
            report_type=report_type,
            format=data.get('format', 'csv').upper(),
            class_instance_id=data.get('class_id'),
            student_id=data.get('student_id'),
            start_date=data['start_date'],
            end_date=data['end_date'],
            generated_by=user,
            status='PENDING'
        )
        
        # Generate report synchronously (for now)
        try:
            if report_type == 'STUDENT':
                result = ReportGenerationService.generate_student_report(
                    student_id=data['student_id'],
                    start_date=data['start_date'],
                    end_date=data['end_date'],
                    format=data.get('format', 'csv').upper()
                )
            else:  # CLASS
                result = ReportGenerationService.generate_class_report(
                    class_id=data['class_id'],
                    start_date=data['start_date'],
                    end_date=data['end_date'],
                    format=data.get('format', 'csv').upper()
                )
            
            # Update report with results
            report.file_path = result['file_path']
            report.file_size = result['file_size']
            report.status = 'COMPLETED'
            report.completed_at = timezone.now()
            report.save()
            
        except Exception as e:
            # Mark report as failed
            report.status = 'FAILED'
            report.error_message = str(e)
            report.save()
            
            return Response(
                {'error': f'Failed to generate report: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Return response
        response_serializer = ReportResponseSerializer(report)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )


class DownloadReportView(APIView):
    """
    GET /api/reports/{id}/download/
    Download a generated report
    """
    permission_classes = [IsAuthenticated, CanDownloadReport]
    
    def get(self, request, report_id):
        """Download report file"""
        try:
            report = Report.objects.get(id=report_id)
        except Report.DoesNotExist:
            raise Http404("Report not found")
        
        # Check permissions
        self.check_object_permissions(request, report)
        
        # Check if report is ready
        if report.status != 'COMPLETED':
            return Response(
                {'error': f'Report is not ready. Current status: {report.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if file exists
        if not report.file_path or not os.path.exists(report.file_path):
            return Response(
                {'error': 'Report file not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate filename
        if report.report_type == 'STUDENT' and report.student:
            filename = f"student_report_{report.student.get_full_name().replace(' ', '_')}_{report.start_date}_to_{report.end_date}.csv"
        elif report.report_type == 'CLASS' and report.class_instance:
            filename = f"class_report_{report.class_instance.name.replace(' ', '_')}_{report.start_date}_to_{report.end_date}.csv"
        else:
            filename = f"report_{report.id}.csv"
        
        # Return file
        file_handle = open(report.file_path, 'rb')
        response = FileResponse(file_handle, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response


class ListReportsView(APIView):
    """
    GET /api/reports/
    List user's reports
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """List reports for current user"""
        user = request.user
        
        # Filter reports based on user role
        if user.has_role('ADMIN'):
            # Admins can see all reports
            reports = Report.objects.all()
        elif user.has_role('TEACHER'):
            # Teachers can see reports they generated
            reports = Report.objects.filter(generated_by=user)
        elif user.has_role('STUDENT'):
            # Students can see their own reports (linked by email)
            try:
                student = Student.objects.get(email=user.email)
                reports = Report.objects.filter(student_id=student.id)
            except Student.DoesNotExist:
                reports = Report.objects.none()
        else:
            reports = Report.objects.none()
        
        serializer = ReportListSerializer(reports, many=True)
        return Response(serializer.data)
