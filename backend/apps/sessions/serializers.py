"""
Class Session Serializers
"""
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import ClassSession
from apps.classes.models import Class, Subject, Teacher
from apps.classes.serializers import (
    ClassListSerializer,
    SubjectSerializer,
    TeacherListSerializer
)


class ClassSessionListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for session lists
    Shows minimal info for performance
    """
    class_id = serializers.UUIDField(source='class_ref.id', read_only=True)
    class_name = serializers.CharField(source='class_ref.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    duration = serializers.CharField(source='duration_formatted', read_only=True)
    student_count = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = ClassSession
        fields = [
            'id',
            'class_id',
            'class_name',
            'subject_code',
            'subject_name',
            'teacher_name',
            'start_time',
            'end_time',
            'status',
            'duration',
            'student_count',
            'is_active'
        ]
        read_only_fields = ['id', 'start_time', 'end_time', 'status']
    
    def get_teacher_name(self, obj):
        """Get teacher's full name"""
        return obj.teacher.user.get_full_name()
    
    def get_student_count(self, obj):
        """Get total number of students enrolled in the class"""
        return obj.class_ref.enrolled_students.count()


class ClassSessionDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for single session view
    Includes nested class, teacher, and subject details
    """
    class_ref = ClassListSerializer(read_only=True)
    teacher = TeacherListSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    duration = serializers.CharField(source='duration_formatted', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    
    # Placeholders for future Module 4 (Attendance)
    attendance_count = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ClassSession
        fields = [
            'id',
            'class_ref',
            'teacher',
            'subject',
            'start_time',
            'end_time',
            'status',
            'duration',
            'is_active',
            'attendance_count',
            'student_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id', 'start_time', 'end_time', 'status',
            'created_at', 'updated_at'
        ]
    
    def get_attendance_count(self, obj):
        """
        Placeholder for Module 4
        Will return count of attendance records for this session
        """
        # TODO: Implement in Module 4
        return 0
    
    def get_student_count(self, obj):
        """Get total number of students enrolled in the class"""
        return obj.class_ref.enrolled_students.count()


class StartSessionSerializer(serializers.Serializer):
    """
    Serializer for starting a new class session
    Validates class exists and user is authorized
    """
    class_id = serializers.UUIDField(required=True)
    
    def validate_class_id(self, value):
        """
        Validate class exists and user has permission to start session
        """
        request = self.context.get('request')
        
        # Check class exists
        try:
            class_instance = Class.objects.select_related('teacher', 'subject').get(id=value)
        except Class.DoesNotExist:
            raise serializers.ValidationError("Class not found")
        
        # Check user is authenticated
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required")
        
        # Check user is a teacher
        if not hasattr(request.user, 'teacher_profile'):
            raise serializers.ValidationError("Only teachers can start sessions")
        
        # Check user is the teacher assigned to this class
        if class_instance.teacher.user != request.user:
            raise serializers.ValidationError(
                f"You are not assigned to teach '{class_instance.name}'"
            )
        
        # Check for existing active session
        active_session = ClassSession.objects.filter(
            class_ref=class_instance,
            status='ACTIVE'
        ).first()
        
        if active_session:
            raise serializers.ValidationError(
                f"This class already has an active session started at "
                f"{active_session.start_time.strftime('%H:%M on %b %d, %Y')}"
            )
        
        # Store the class instance for create()
        self.class_instance = class_instance
        
        return value
    
    def create(self, validated_data):
        """
        Create a new active session
        """
        class_instance = self.class_instance
        
        # Create session with denormalized subject and teacher
        session = ClassSession.objects.create(
            class_ref=class_instance,
            subject=class_instance.subject,
            teacher=class_instance.teacher,
            status='ACTIVE'
        )
        
        return session


class EndSessionSerializer(serializers.Serializer):
    """
    Serializer for ending an active session
    No input needed - session ID comes from URL
    """
    
    def validate(self, attrs):
        """
        Validate the session can be ended by this user
        """
        request = self.context.get('request')
        session = self.context.get('session')
        
        if not session:
            raise serializers.ValidationError("Session not found")
        
        # Check session is active
        if session.status == 'ENDED':
            raise serializers.ValidationError(
                f"This session already ended at "
                f"{session.end_time.strftime('%H:%M on %b %d, %Y')}"
            )
        
        # Check authorization
        user = request.user
        is_admin = user.has_role('ADMIN')
        is_session_owner = hasattr(user, 'teacher_profile') and session.teacher.user == user
        
        if not is_admin and not is_session_owner:
            raise serializers.ValidationError(
                "Only the teacher who started this session can end it"
            )
        
        return attrs
    
    def update(self, instance, validated_data):
        """
        End the session
        """
        request = self.context.get('request')
        instance.end_session(user=request.user)
        return instance


class ActiveSessionSerializer(serializers.ModelSerializer):
    """
    Serializer for active sessions list
    Optimized for dashboard/monitoring view
    """
    class_name = serializers.CharField(source='class_ref.name', read_only=True)
    class_room = serializers.CharField(source='class_ref.room_number', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    duration = serializers.CharField(source='duration_formatted', read_only=True)
    student_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ClassSession
        fields = [
            'id',
            'class_name',
            'class_room',
            'subject_code',
            'subject_name',
            'teacher_name',
            'start_time',
            'duration',
            'student_count'
        ]
    
    def get_teacher_name(self, obj):
        """Get teacher's full name"""
        return obj.teacher.user.get_full_name()
    
    def get_student_count(self, obj):
        """Get number of students in class"""
        return obj.class_ref.enrolled_students.count()
