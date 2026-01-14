"""
Serializers for Attendance app
"""
from rest_framework import serializers
from django.utils import timezone
from .models import Attendance
from apps.sessions.models import ClassSession
from apps.classes.models import Student
from apps.sessions.serializers import ClassSessionListSerializer
from apps.classes.serializers import StudentSerializer


class AttendanceListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing attendance records
    Used in session attendance view
    """
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    student_name = serializers.SerializerMethodField()
    student_email = serializers.EmailField(source='student.email', read_only=True)
    marked_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'student_id', 'student_name', 'student_email',
            'status', 'marked_at', 'marked_by_name', 'notes'
        ]
    
    def get_student_name(self, obj):
        """Get student's full name"""
        return obj.student.get_full_name()
    
    def get_marked_by_name(self, obj):
        """Get name of user who marked attendance"""
        if obj.marked_by:
            return obj.marked_by.get_full_name()
        return None


class AttendanceDetailSerializer(serializers.ModelSerializer):
    """
    Full attendance record with nested session and student data
    Used for detailed views and single record retrieval
    """
    session = ClassSessionListSerializer(read_only=True)
    student = StudentSerializer(read_only=True)
    marked_by_name = serializers.SerializerMethodField()
    is_locked = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'session', 'student', 'status',
            'marked_at', 'marked_by_name', 'notes',
            'is_locked', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'marked_at', 'created_at', 'updated_at']
    
    def get_marked_by_name(self, obj):
        """Get name of user who marked attendance"""
        if obj.marked_by:
            return obj.marked_by.get_full_name()
        return None


class MarkAttendanceSerializer(serializers.Serializer):
    """
    Serializer for marking attendance (single record)
    Validates session is active and student is enrolled
    """
    session_id = serializers.UUIDField()
    student_id = serializers.UUIDField()
    status = serializers.ChoiceField(choices=['PRESENT', 'ABSENT', 'LATE'])
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)
    
    def validate_session_id(self, value):
        """Validate session exists and is ACTIVE"""
        try:
            session = ClassSession.objects.get(id=value)
        except ClassSession.DoesNotExist:
            raise serializers.ValidationError(f"Session with ID '{value}' not found")
        
        if session.status != 'ACTIVE':
            end_time = session.end_time.strftime('%H:%M on %b %d, %Y') if session.end_time else 'unknown time'
            raise serializers.ValidationError(
                f"Cannot mark attendance - session ended at {end_time}"
            )
        
        # Store session for later use
        self.context['session'] = session
        return value
    
    def validate_student_id(self, value):
        """Validate student exists"""
        try:
            student = Student.objects.get(id=value)
        except Student.DoesNotExist:
            raise serializers.ValidationError(f"Student with ID '{value}' not found")
        
        # Store student for later use
        self.context['student'] = student
        return value
    
    def validate(self, attrs):
        """
        Cross-field validation
        - Check student is enrolled in the class
        - Check user is authorized (teacher of the class or admin)
        """
        session = self.context.get('session')
        student = self.context.get('student')
        request = self.context.get('request')
        
        if not session or not student:
            return attrs
        
        # Check student enrollment
        enrolled = session.class_ref.enrolled_students.filter(student=student).exists()
        if not enrolled:
            raise serializers.ValidationError({
                'student_id': f"Student '{student.student_id}' is not enrolled in '{session.class_ref.name}'"
            })
        
        # Check authorization (teacher must be assigned to this class)
        if request and not request.user.has_role('ADMIN'):
            if hasattr(request.user, 'teacher_profile'):
                if session.teacher != request.user.teacher_profile:
                    raise serializers.ValidationError({
                        'session_id': f"You are not authorized to mark attendance for this session"
                    })
            else:
                raise serializers.ValidationError("Only teachers can mark attendance")
        
        return attrs
    
    def create(self, validated_data):
        """
        Create or update attendance record
        If record already exists, update it instead of creating duplicate
        """
        session = self.context['session']
        student = self.context['student']
        request = self.context.get('request')
        
        # Try to get existing record
        attendance, created = Attendance.objects.update_or_create(
            session=session,
            student=student,
            defaults={
                'status': validated_data['status'],
                'notes': validated_data.get('notes', ''),
                'marked_by': request.user if request else None,
            }
        )
        
        return attendance


class BulkMarkAttendanceSerializer(serializers.Serializer):
    """
    Serializer for bulk marking attendance
    Accepts a list of student records
    """
    session_id = serializers.UUIDField()
    records = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
        help_text="List of {student_id, status} dicts"
    )
    
    def validate_session_id(self, value):
        """Validate session exists and is ACTIVE"""
        try:
            session = ClassSession.objects.get(id=value)
        except ClassSession.DoesNotExist:
            raise serializers.ValidationError(f"Session with ID '{value}' not found")
        
        if session.status != 'ACTIVE':
            end_time = session.end_time.strftime('%H:%M on %b %d, %Y') if session.end_time else 'unknown time'
            raise serializers.ValidationError(
                f"Cannot mark attendance - session ended at {end_time}"
            )
        
        # Check authorization
        request = self.context.get('request')
        if request and not request.user.has_role('ADMIN'):
            if hasattr(request.user, 'teacher_profile'):
                if session.teacher != request.user.teacher_profile:
                    raise serializers.ValidationError(
                        "You are not authorized to mark attendance for this session"
                    )
            else:
                raise serializers.ValidationError("Only teachers can mark attendance")
        
        self.context['session'] = session
        return value
    
    def validate_records(self, value):
        """Validate each record has required fields"""
        for i, record in enumerate(value):
            if 'student_id' not in record:
                raise serializers.ValidationError(f"Record {i}: missing 'student_id'")
            if 'status' not in record:
                raise serializers.ValidationError(f"Record {i}: missing 'status'")
            if record['status'] not in ['PRESENT', 'ABSENT', 'LATE']:
                raise serializers.ValidationError(
                    f"Record {i}: invalid status '{record['status']}'. Must be PRESENT, ABSENT, or LATE"
                )
        return value
    
    def create(self, validated_data):
        """
        Create/update multiple attendance records
        Returns list of created/updated attendance records
        """
        session = self.context['session']
        request = self.context.get('request')
        records_data = validated_data['records']
        
        attendance_records = []
        errors = []
        
        for record in records_data:
            try:
                # Get student
                student = Student.objects.get(id=record['student_id'])
                
                # Check enrollment
                enrolled = session.class_ref.enrolled_students.filter(student=student).exists()
                if not enrolled:
                    errors.append({
                        'student_id': record['student_id'],
                        'error': f"Student not enrolled in this class"
                    })
                    continue
                
                # Create or update attendance
                attendance, created = Attendance.objects.update_or_create(
                    session=session,
                    student=student,
                    defaults={
                        'status': record['status'],
                        'notes': record.get('notes', ''),
                        'marked_by': request.user if request else None,
                    }
                )
                attendance_records.append(attendance)
                
            except Student.DoesNotExist:
                errors.append({
                    'student_id': record['student_id'],
                    'error': 'Student not found'
                })
            except Exception as e:
                errors.append({
                    'student_id': record.get('student_id', 'unknown'),
                    'error': str(e)
                })
        
        # Store errors in context for response
        self.context['errors'] = errors
        
        return attendance_records


class UpdateAttendanceSerializer(serializers.ModelSerializer):
    """
    Serializer for updating existing attendance record
    Only status and notes can be updated
    """
    class Meta:
        model = Attendance
        fields = ['status', 'notes']
    
    def validate(self, attrs):
        """Validate session is not locked"""
        if self.instance and self.instance.is_locked:
            raise serializers.ValidationError(
                "Cannot modify attendance - session ended and is locked"
            )
        return attrs


class SessionAttendanceStatsSerializer(serializers.Serializer):
    """
    Serializer for session attendance statistics
    Used in session attendance view
    """
    total_enrolled = serializers.IntegerField()
    present = serializers.IntegerField()
    absent = serializers.IntegerField()
    late = serializers.IntegerField()
    not_marked = serializers.IntegerField()
    marked = serializers.IntegerField()
    attendance_rate = serializers.FloatField()


class StudentAttendanceStatsSerializer(serializers.Serializer):
    """
    Serializer for student attendance statistics
    Used in student history view
    """
    total_sessions = serializers.IntegerField()
    present = serializers.IntegerField()
    absent = serializers.IntegerField()
    late = serializers.IntegerField()
    attendance_rate = serializers.FloatField()
