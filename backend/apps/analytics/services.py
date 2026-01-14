"""
Analytics Services

Heavy SQL/ORM aggregation logic for computing attendance statistics,
trends, and patterns. All services are read-only operations.
"""
from django.db.models import Count, Q, F, Avg, Max, Min, Value, CharField
from django.db.models.functions import TruncDate, Coalesce
from django.utils import timezone
from datetime import timedelta, datetime
from apps.attendance.models import Attendance
from apps.classes.models import Student, Class, ClassStudent
from apps.sessions.models import ClassSession


class StudentAnalyticsService:
    """Service for computing student-level attendance analytics"""
    
    @staticmethod
    def student_attendance_percentage(student_id):
        """
        Calculate overall attendance percentage for a student
        
        Args:
            student_id: UUID of the student
            
        Returns:
            float: Percentage (0-100) or 0 if no attendance records
        """
        total = Attendance.objects.filter(student_id=student_id).count()
        present = Attendance.objects.filter(
            student_id=student_id, 
            status='PRESENT'
        ).count()
        return round((present / total) * 100, 2) if total else 0.0
    
    @staticmethod
    def student_detailed_stats(student_id):
        """
        Get comprehensive statistics for a student
        
        Returns:
            dict: {
                total_sessions: int,
                present_count: int,
                absent_count: int,
                late_count: int,
                attendance_rate: float,
                punctuality_rate: float (% of present that were on time),
                absence_rate: float,
                late_rate: float,
                classes_enrolled: list of class info,
                recent_trend: str ('improving', 'declining', 'stable'),
                consecutive_absences: int,
                risk_level: str ('low', 'medium', 'high')
            }
        """
        from apps.attendance.models import Attendance
        
        # Get all attendance records for student
        attendance_qs = Attendance.objects.filter(student_id=student_id)
        
        # Basic counts
        total_sessions = attendance_qs.count()
        
        if total_sessions == 0:
            return {
                'total_sessions': 0,
                'present_count': 0,
                'absent_count': 0,
                'late_count': 0,
                'attendance_rate': 0.0,
                'punctuality_rate': 0.0,
                'absence_rate': 0.0,
                'late_rate': 0.0,
                'classes_enrolled': [],
                'recent_trend': 'no_data',
                'consecutive_absences': 0,
                'risk_level': 'unknown'
            }
        
        status_counts = attendance_qs.aggregate(
            present=Count('id', filter=Q(status='PRESENT')),
            absent=Count('id', filter=Q(status='ABSENT')),
            late=Count('id', filter=Q(status='LATE'))
        )
        
        present_count = status_counts['present']
        absent_count = status_counts['absent']
        late_count = status_counts['late']
        
        # Calculate rates
        attendance_rate = round((present_count / total_sessions) * 100, 2)
        absence_rate = round((absent_count / total_sessions) * 100, 2)
        late_rate = round((late_count / total_sessions) * 100, 2)
        
        # Punctuality rate (on-time arrivals out of attended sessions)
        attended_sessions = present_count + late_count
        punctuality_rate = round((present_count / attended_sessions) * 100, 2) if attended_sessions > 0 else 0.0
        
        # Get enrolled classes
        student = Student.objects.get(id=student_id)
        enrollments = ClassStudent.objects.filter(
            student_id=student_id
        ).select_related('class_instance', 'class_instance__subject', 'class_instance__teacher')
        
        classes_enrolled = []
        for enrollment in enrollments:
            class_instance = enrollment.class_instance
            # Get stats for this specific class
            class_attendance = attendance_qs.filter(
                session__class_ref_id=class_instance.id
            )
            class_total = class_attendance.count()
            class_present = class_attendance.filter(status='PRESENT').count()
            class_rate = round((class_present / class_total) * 100, 2) if class_total > 0 else 0.0
            
            classes_enrolled.append({
                'class_id': str(class_instance.id),
                'class_name': class_instance.name,
                'subject': class_instance.subject.name if class_instance.subject else 'N/A',
                'teacher': class_instance.teacher.user.get_full_name() if class_instance.teacher and class_instance.teacher.user else 'N/A',
                'sessions_in_class': class_total,
                'attendance_rate': class_rate
            })
        
        # Calculate recent trend (last 10 sessions vs previous 10)
        recent_trend = StudentAnalyticsService._calculate_trend(attendance_qs)
        
        # Calculate consecutive absences
        consecutive_absences = StudentAnalyticsService._calculate_consecutive_absences(attendance_qs)
        
        # Determine risk level
        risk_level = StudentAnalyticsService._determine_risk_level(
            attendance_rate, consecutive_absences, late_rate
        )
        
        return {
            'total_sessions': total_sessions,
            'present_count': present_count,
            'absent_count': absent_count,
            'late_count': late_count,
            'attendance_rate': attendance_rate,
            'punctuality_rate': punctuality_rate,
            'absence_rate': absence_rate,
            'late_rate': late_rate,
            'classes_enrolled': classes_enrolled,
            'recent_trend': recent_trend,
            'consecutive_absences': consecutive_absences,
            'risk_level': risk_level
        }
    
    @staticmethod
    def _calculate_trend(attendance_qs):
        """Calculate if attendance is improving, declining, or stable"""
        # Get last 20 sessions, split into recent 10 and previous 10
        recent_records = list(attendance_qs.order_by('-marked_at')[:20])
        
        if len(recent_records) < 10:
            return 'insufficient_data'
        
        # Split into two groups
        recent_10 = recent_records[:10]
        previous_10 = recent_records[10:20] if len(recent_records) >= 20 else recent_records[10:]
        
        if not previous_10:
            return 'insufficient_data'
        
        # Calculate present rate for each group
        recent_present = sum(1 for r in recent_10 if r.status == 'PRESENT')
        recent_rate = recent_present / len(recent_10)
        
        previous_present = sum(1 for r in previous_10 if r.status == 'PRESENT')
        previous_rate = previous_present / len(previous_10)
        
        # Compare rates with 5% threshold
        difference = recent_rate - previous_rate
        
        if difference > 0.05:
            return 'improving'
        elif difference < -0.05:
            return 'declining'
        else:
            return 'stable'
    
    @staticmethod
    def _calculate_consecutive_absences(attendance_qs):
        """Calculate current consecutive absence streak"""
        recent_records = attendance_qs.order_by('-marked_at')[:10]
        consecutive = 0
        
        for record in recent_records:
            if record.status == 'ABSENT':
                consecutive += 1
            else:
                break
        
        return consecutive
    
    @staticmethod
    def _determine_risk_level(attendance_rate, consecutive_absences, late_rate):
        """
        Determine student risk level based on attendance patterns
        
        Risk Levels:
        - HIGH: <70% attendance OR 3+ consecutive absences
        - MEDIUM: 70-85% attendance OR 2 consecutive absences OR >20% late rate
        - LOW: >85% attendance AND <2 consecutive absences
        """
        if attendance_rate < 70 or consecutive_absences >= 3:
            return 'high'
        elif attendance_rate < 85 or consecutive_absences >= 2 or late_rate > 20:
            return 'medium'
        else:
            return 'low'


class ClassAnalyticsService:
    """Service for computing class-level attendance analytics"""
    
    @staticmethod
    def class_attendance_overview(class_id):
        """
        Get comprehensive attendance statistics for a class
        
        Returns:
            dict: {
                class_info: {...},
                total_students: int,
                total_sessions: int,
                overall_attendance_rate: float,
                session_statistics: [...],
                student_statistics: [...],
                trends: {...},
                patterns: {...}
            }
        """
        # Get class information
        class_obj = Class.objects.select_related('subject', 'teacher', 'teacher__user').get(id=class_id)
        
        # Get all sessions for this class
        sessions = ClassSession.objects.filter(class_ref_id=class_id).order_by('-start_time')
        total_sessions = sessions.count()
        
        # Get enrolled students
        enrolled_students = ClassStudent.objects.filter(
            class_instance_id=class_id
        ).select_related('student')
        total_students = enrolled_students.count()
        
        # Calculate overall attendance rate
        total_attendance_records = Attendance.objects.filter(
            session__class_ref_id=class_id
        )
        total_records = total_attendance_records.count()
        present_records = total_attendance_records.filter(status='PRESENT').count()
        overall_attendance_rate = round((present_records / total_records) * 100, 2) if total_records > 0 else 0.0
        
        # Get session-by-session statistics
        session_statistics = []
        for session in sessions[:20]:  # Last 20 sessions
            session_attendance = Attendance.objects.filter(session_id=session.id)
            session_total = session_attendance.count()
            session_stats = session_attendance.aggregate(
                present=Count('id', filter=Q(status='PRESENT')),
                absent=Count('id', filter=Q(status='ABSENT')),
                late=Count('id', filter=Q(status='LATE'))
            )
            
            session_rate = round((session_stats['present'] / session_total) * 100, 2) if session_total > 0 else 0.0
            
            session_statistics.append({
                'session_id': str(session.id),
                'date': session.start_time.date().isoformat() if session.start_time else None,
                'total_marked': session_total,
                'present': session_stats['present'],
                'absent': session_stats['absent'],
                'late': session_stats['late'],
                'attendance_rate': session_rate,
                'status': session.status
            })
        
        # Get per-student statistics
        student_statistics = []
        for enrollment in enrolled_students:
            student = enrollment.student
            student_attendance = total_attendance_records.filter(student_id=student.id)
            student_total = student_attendance.count()
            student_stats = student_attendance.aggregate(
                present=Count('id', filter=Q(status='PRESENT')),
                absent=Count('id', filter=Q(status='ABSENT')),
                late=Count('id', filter=Q(status='LATE'))
            )
            
            student_rate = round((student_stats['present'] / student_total) * 100, 2) if student_total > 0 else 0.0
            
            student_statistics.append({
                'student_id': str(student.id),
                'student_name': student.get_full_name(),
                'student_email': student.email,
                'sessions_attended': student_total,
                'present': student_stats['present'],
                'absent': student_stats['absent'],
                'late': student_stats['late'],
                'attendance_rate': student_rate
            })
        
        # Sort students by attendance rate (lowest first for intervention)
        student_statistics.sort(key=lambda x: x['attendance_rate'])
        
        # Calculate trends
        trends = ClassAnalyticsService._calculate_class_trends(class_id, sessions)
        
        # Identify patterns
        patterns = ClassAnalyticsService._identify_patterns(class_id, sessions, session_statistics)
        
        return {
            'class_info': {
                'class_id': str(class_obj.id),
                'class_name': class_obj.name,
                'subject': class_obj.subject.name if class_obj.subject else 'N/A',
                'teacher': class_obj.teacher.user.get_full_name() if class_obj.teacher and class_obj.teacher.user else 'N/A',
                'schedule': class_obj.schedule or 'Not set'
            },
            'total_students': total_students,
            'total_sessions': total_sessions,
            'overall_attendance_rate': overall_attendance_rate,
            'session_statistics': session_statistics,
            'student_statistics': student_statistics,
            'trends': trends,
            'patterns': patterns
        }
    
    @staticmethod
    def _calculate_class_trends(class_id, sessions):
        """Calculate attendance trends over time"""
        if sessions.count() < 10:
            return {
                'trend_direction': 'insufficient_data',
                'recent_average': 0.0,
                'previous_average': 0.0
            }
        
        # Get last 10 sessions and previous 10 sessions
        recent_sessions = list(sessions[:10])
        previous_sessions = list(sessions[10:20])
        
        # Calculate average attendance rate for each period
        def calculate_average_rate(session_list):
            total_rate = 0
            count = 0
            for session in session_list:
                session_attendance = Attendance.objects.filter(session_id=session.id)
                session_total = session_attendance.count()
                if session_total > 0:
                    present = session_attendance.filter(status='PRESENT').count()
                    rate = (present / session_total) * 100
                    total_rate += rate
                    count += 1
            return round(total_rate / count, 2) if count > 0 else 0.0
        
        recent_average = calculate_average_rate(recent_sessions)
        previous_average = calculate_average_rate(previous_sessions) if previous_sessions else recent_average
        
        # Determine trend direction
        difference = recent_average - previous_average
        if difference > 2:
            trend_direction = 'improving'
        elif difference < -2:
            trend_direction = 'declining'
        else:
            trend_direction = 'stable'
        
        return {
            'trend_direction': trend_direction,
            'recent_average': recent_average,
            'previous_average': previous_average,
            'change': round(difference, 2)
        }
    
    @staticmethod
    def _identify_patterns(class_id, sessions, session_statistics):
        """Identify attendance patterns (e.g., day of week, time of day)"""
        if not session_statistics:
            return {
                'chronic_absentees': [],
                'perfect_attendance': [],
                'at_risk_students': []
            }
        
        # Identify chronic absentees (attendance rate < 70%)
        chronic_absentees = []
        perfect_attendance = []
        at_risk_students = []
        
        enrolled_students = ClassStudent.objects.filter(
            class_instance_id=class_id
        ).select_related('student')
        
        for enrollment in enrolled_students:
            student = enrollment.student
            student_attendance = Attendance.objects.filter(
                session__class_ref_id=class_id,
                student_id=student.id
            )
            student_total = student_attendance.count()
            
            if student_total == 0:
                continue
            
            present = student_attendance.filter(status='PRESENT').count()
            absent = student_attendance.filter(status='ABSENT').count()
            rate = (present / student_total) * 100
            
            student_info = {
                'student_id': str(student.id),
                'student_name': student.get_full_name(),
                'attendance_rate': round(rate, 2),
                'total_sessions': student_total,
                'absences': absent
            }
            
            if rate == 100:
                perfect_attendance.append(student_info)
            elif rate < 70:
                chronic_absentees.append(student_info)
            elif rate < 85:
                at_risk_students.append(student_info)
        
        return {
            'chronic_absentees': chronic_absentees,
            'perfect_attendance': perfect_attendance,
            'at_risk_students': at_risk_students
        }
