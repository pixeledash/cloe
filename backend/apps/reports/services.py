"""
Report Generation Services
Handles the logic for generating attendance reports in various formats
"""
import csv
import os
from datetime import datetime
from django.conf import settings
from django.db.models import Q, Count, F
from apps.attendance.models import Attendance
from apps.sessions.models import ClassSession
from apps.classes.models import ClassStudent, Student, Class


class ReportGenerationService:
    """Service for generating attendance reports"""
    
    # Report storage directory
    REPORTS_DIR = os.path.join(settings.BASE_DIR, 'media', 'reports')
    
    @classmethod
    def _ensure_reports_directory(cls):
        """Create reports directory if it doesn't exist"""
        os.makedirs(cls.REPORTS_DIR, exist_ok=True)
    
    @classmethod
    def generate_student_report(cls, student_id, start_date, end_date, format='CSV'):
        """
        Generate attendance report for a specific student
        
        Args:
            student_id: UUID of the student
            start_date: Start date for the report
            end_date: End date for the report
            format: Report format (CSV or PDF)
        
        Returns:
            dict: {
                'file_path': str,
                'file_size': int,
                'records_count': int
            }
        """
        cls._ensure_reports_directory()
        
        # Fetch student
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            raise ValueError(f"Student with ID {student_id} not found")
        
        # Query attendance records within date range
        attendance_records = Attendance.objects.filter(
            student_id=student_id,
            session__start_time__date__gte=start_date,
            session__start_time__date__lte=end_date
        ).select_related(
            'session',
            'session__class_ref',
            'session__subject',
            'session__teacher',
            'marked_by'
        ).order_by('session__start_time')
        
        if format == 'CSV':
            return cls._generate_student_csv(student, attendance_records, start_date, end_date)
        else:
            raise NotImplementedError(f"Format {format} not yet supported")
    
    @classmethod
    def generate_class_report(cls, class_id, start_date, end_date, format='CSV'):
        """
        Generate attendance report for an entire class
        
        Args:
            class_id: UUID of the class
            start_date: Start date for the report
            end_date: End date for the report
            format: Report format (CSV or PDF)
        
        Returns:
            dict: {
                'file_path': str,
                'file_size': int,
                'records_count': int
            }
        """
        cls._ensure_reports_directory()
        
        # Fetch class
        try:
            class_instance = Class.objects.get(id=class_id)
        except Class.DoesNotExist:
            raise ValueError(f"Class with ID {class_id} not found")
        
        # Get all enrolled students
        enrollments = ClassStudent.objects.filter(
            class_instance_id=class_id
        ).select_related('student')
        
        # Get all sessions in date range
        sessions = ClassSession.objects.filter(
            class_ref_id=class_id,
            start_time__date__gte=start_date,
            start_time__date__lte=end_date
        ).order_by('start_time')
        
        # Get all attendance records for this class in date range
        attendance_records = Attendance.objects.filter(
            session__class_ref_id=class_id,
            session__start_time__date__gte=start_date,
            session__start_time__date__lte=end_date
        ).select_related('student', 'session')
        
        if format == 'CSV':
            return cls._generate_class_csv(
                class_instance, 
                enrollments, 
                sessions, 
                attendance_records,
                start_date,
                end_date
            )
        else:
            raise NotImplementedError(f"Format {format} not yet supported")
    
    @classmethod
    def _generate_student_csv(cls, student, attendance_records, start_date, end_date):
        """Generate CSV report for a student"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"student_{student.id}_{timestamp}.csv"
        file_path = os.path.join(cls.REPORTS_DIR, filename)
        
        with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            
            # Write header
            writer.writerow([
                'Student Name',
                'Student Email',
                'Session Date',
                'Session Time',
                'Class',
                'Subject',
                'Status',
                'Marked By',
                'Marked At'
            ])
            
            # Write data rows
            for record in attendance_records:
                session_date = record.session.start_time.date() if record.session.start_time else ''
                session_time = record.session.start_time.strftime('%H:%M') if record.session.start_time else ''
                marked_at = record.marked_at.strftime('%Y-%m-%d %H:%M') if record.marked_at else ''
                
                writer.writerow([
                    student.get_full_name(),
                    student.email,
                    session_date,
                    session_time,
                    record.session.class_ref.name if record.session.class_ref else '',
                    record.session.subject.name if record.session.subject else '',
                    record.status,
                    record.marked_by.get_full_name() if record.marked_by else '',
                    marked_at
                ])
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        return {
            'file_path': file_path,
            'file_size': file_size,
            'records_count': attendance_records.count()
        }
    
    @classmethod
    def _generate_class_csv(cls, class_instance, enrollments, sessions, attendance_records, start_date, end_date):
        """Generate CSV report for a class"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"class_{class_instance.id}_{timestamp}.csv"
        file_path = os.path.join(cls.REPORTS_DIR, filename)
        
        # Calculate statistics per student
        student_stats = {}
        total_sessions = sessions.count()
        
        for enrollment in enrollments:
            student = enrollment.student
            student_attendance = attendance_records.filter(student_id=student.id)
            
            total = student_attendance.count()
            present = student_attendance.filter(status='PRESENT').count()
            absent = student_attendance.filter(status='ABSENT').count()
            late = student_attendance.filter(status='LATE').count()
            
            attendance_rate = round((present / total * 100), 2) if total > 0 else 0.0
            
            student_stats[student.id] = {
                'name': student.get_full_name(),
                'email': student.email,
                'student_id': student.student_id,
                'total_sessions': total,
                'present': present,
                'absent': absent,
                'late': late,
                'attendance_rate': attendance_rate
            }
        
        with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            
            # Write header with class info
            writer.writerow([f"Class Attendance Report: {class_instance.name}"])
            writer.writerow([f"Period: {start_date} to {end_date}"])
            writer.writerow([f"Total Sessions in Period: {total_sessions}"])
            writer.writerow([])  # Empty row
            
            # Write student data header
            writer.writerow([
                'Student ID',
                'Student Name',
                'Email',
                'Sessions Marked',
                'Present',
                'Absent',
                'Late',
                'Attendance Rate (%)'
            ])
            
            # Write student data rows
            for stats in student_stats.values():
                writer.writerow([
                    stats['student_id'],
                    stats['name'],
                    stats['email'],
                    stats['total_sessions'],
                    stats['present'],
                    stats['absent'],
                    stats['late'],
                    stats['attendance_rate']
                ])
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        return {
            'file_path': file_path,
            'file_size': file_size,
            'records_count': len(student_stats)
        }
