from rest_framework import serializers
from .models import Subject, Teacher, Class, Student, ClassStudent
from apps.users.serializers import UserSerializer


class SubjectSerializer(serializers.ModelSerializer):
    """Serializer for Subject model"""
    
    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class TeacherSerializer(serializers.ModelSerializer):
    """Serializer for Teacher model with nested User data"""
    user = UserSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Teacher
        fields = [
            'id', 'user', 'user_id', 'employee_id', 'department',
            'specialization', 'hire_date', 'created_at', 'full_name'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_full_name(self, obj):
        return obj.user.get_full_name()


class TeacherListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing teachers"""
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = Teacher
        fields = ['id', 'employee_id', 'full_name', 'email', 'department']
    
    def get_full_name(self, obj):
        return obj.user.get_full_name()


class StudentSerializer(serializers.ModelSerializer):
    """Serializer for Student model"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = [
            'id', 'student_id', 'first_name', 'last_name', 'full_name',
            'email', 'date_of_birth', 'enrollment_date', 'major', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class StudentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing students"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = ['id', 'student_id', 'full_name', 'email', 'major']
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class ClassSerializer(serializers.ModelSerializer):
    """Serializer for Class model with nested data"""
    subject = SubjectSerializer(read_only=True)
    subject_id = serializers.UUIDField(write_only=True)
    teacher = TeacherListSerializer(read_only=True)
    teacher_id = serializers.UUIDField(write_only=True)
    enrolled_count = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Class
        fields = [
            'id', 'name', 'subject', 'subject_id', 'teacher', 'teacher_id',
            'academic_year', 'semester', 'room_number', 'schedule',
            'max_students', 'enrolled_count', 'is_full', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ClassListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing classes"""
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    enrolled_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Class
        fields = [
            'id', 'name', 'subject_name', 'subject_code', 'teacher_name',
            'academic_year', 'semester', 'room_number', 'enrolled_count', 'max_students'
        ]
    
    def get_teacher_name(self, obj):
        return obj.teacher.user.get_full_name()


class ClassStudentSerializer(serializers.ModelSerializer):
    """Serializer for ClassStudent enrollment"""
    student = StudentListSerializer(read_only=True)
    student_id = serializers.UUIDField(write_only=True)
    class_instance = ClassListSerializer(read_only=True)
    class_id = serializers.UUIDField(write_only=True, source='class_instance')
    
    class Meta:
        model = ClassStudent
        fields = [
            'id', 'class_instance', 'class_id', 'student', 'student_id', 'enrolled_at'
        ]
        read_only_fields = ['id', 'enrolled_at']
    
    def validate(self, data):
        """Validate enrollment"""
        class_instance = data.get('class_instance')
        student = Student.objects.filter(id=data.get('student_id')).first()
        
        if not student:
            raise serializers.ValidationError("Student not found")
        
        # Check if student is already enrolled
        if ClassStudent.objects.filter(
            class_instance=class_instance,
            student=student
        ).exists():
            raise serializers.ValidationError("Student is already enrolled in this class")
        
        # Check if class is full
        if class_instance.is_full:
            raise serializers.ValidationError("Class is full")
        
        return data


class EnrollmentSerializer(serializers.Serializer):
    """Simple serializer for enrollment actions"""
    student_id = serializers.UUIDField()
    
    def validate_student_id(self, value):
        """Validate that student exists"""
        if not Student.objects.filter(id=value).exists():
            raise serializers.ValidationError("Student not found")
        return value
