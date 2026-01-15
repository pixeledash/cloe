from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Subject, Teacher, Class, Student, ClassStudent
from .serializers import (
    SubjectSerializer,
    TeacherSerializer,
    TeacherListSerializer,
    ClassSerializer,
    ClassListSerializer,
    StudentSerializer,
    StudentListSerializer,
    ClassStudentSerializer,
    EnrollmentSerializer
)
from .permissions import IsAdminOrReadOnly, IsTeacherOrAdmin, IsClassOwnerOrAdmin, CanManageEnrollment


class SubjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Subject CRUD operations
    Admins can create/update/delete, others can read
    """
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code', 'created_at']
    ordering = ['name']


class TeacherViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Teacher CRUD operations
    Only admins can create/update/delete
    """
    queryset = Teacher.objects.select_related('user').all()
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['employee_id', 'user__first_name', 'user__last_name', 'department']
    ordering_fields = ['employee_id', 'hire_date', 'department']
    ordering = ['employee_id']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TeacherListSerializer
        return TeacherSerializer
    
    @action(detail=True, methods=['get'])
    def classes(self, request, pk=None):
        """Get all classes taught by this teacher"""
        teacher = self.get_object()
        classes = teacher.classes.all()
        serializer = ClassListSerializer(classes, many=True)
        return Response(serializer.data)


class ClassViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Class CRUD operations
    Teachers can create/manage their own classes
    Admins can manage all classes
    """
    queryset = Class.objects.select_related('subject', 'teacher', 'teacher__user').all()
    permission_classes = [IsTeacherOrAdmin]
    search_fields = ['name', 'subject__name', 'subject__code', 'academic_year']
    filterset_fields = ['subject', 'teacher', 'academic_year', 'semester']
    ordering_fields = ['name', 'academic_year', 'created_at']
    ordering = ['-academic_year', 'semester', 'name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ClassListSerializer
        return ClassSerializer
    
    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsClassOwnerOrAdmin()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        """Automatically assign teacher if user has teacher profile"""
        if hasattr(self.request.user, 'teacher_profile'):
            serializer.save(teacher=self.request.user.teacher_profile)
        else:
            serializer.save()
    
    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """Get all students enrolled in this class"""
        class_instance = self.get_object()
        enrollments = class_instance.enrolled_students.select_related('student').all()
        students = [enrollment.student for enrollment in enrollments]
        serializer = StudentListSerializer(students, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[CanManageEnrollment])
    def enroll(self, request, pk=None):
        """Enroll a student in this class"""
        class_instance = self.get_object()
        serializer = EnrollmentSerializer(data=request.data)
        
        if serializer.is_valid():
            student = get_object_or_404(Student, id=serializer.validated_data['student_id'])
            
            # Check if already enrolled
            if ClassStudent.objects.filter(class_instance=class_instance, student=student).exists():
                return Response(
                    {'error': 'Student is already enrolled in this class'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if class is full
            if class_instance.is_full:
                return Response(
                    {'error': 'Class is full'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create enrollment
            enrollment = ClassStudent.objects.create(
                class_instance=class_instance,
                student=student
            )
            
            return Response(
                ClassStudentSerializer(enrollment).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[CanManageEnrollment])
    def unenroll(self, request, pk=None):
        """Remove a student from this class"""
        class_instance = self.get_object()
        serializer = EnrollmentSerializer(data=request.data)
        
        if serializer.is_valid():
            student = get_object_or_404(Student, id=serializer.validated_data['student_id'])
            
            # Find and delete enrollment
            enrollment = ClassStudent.objects.filter(
                class_instance=class_instance,
                student=student
            ).first()
            
            if not enrollment:
                return Response(
                    {'error': 'Student is not enrolled in this class'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            enrollment.delete()
            return Response(
                {'message': 'Student unenrolled successfully'},
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def roster(self, request, pk=None):
        """Get detailed class roster with enrollment dates"""
        class_instance = self.get_object()
        enrollments = class_instance.enrolled_students.select_related('student').all()
        serializer = ClassStudentSerializer(enrollments, many=True)
        return Response(serializer.data)


class StudentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Student CRUD operations
    Admins can create/update/delete
    Teachers can view
    """
    queryset = Student.objects.all()
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['student_id', 'first_name', 'last_name', 'email']
    filterset_fields = ['major', 'enrollment_date']
    ordering_fields = ['student_id', 'last_name', 'enrollment_date']
    ordering = ['student_id']
    
    def get_queryset(self):
        """
        Optionally filter students by class
        """
        queryset = super().get_queryset()
        class_id = self.request.query_params.get('class_id', None)
        
        if class_id:
            # Filter students enrolled in the specified class
            queryset = queryset.filter(enrolled_classes__class_instance__id=class_id).distinct()
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return StudentListSerializer
        return StudentSerializer
    
    @action(detail=True, methods=['get'])
    def classes(self, request, pk=None):
        """Get all classes this student is enrolled in"""
        student = self.get_object()
        enrollments = student.enrolled_classes.select_related(
            'class_instance',
            'class_instance__subject',
            'class_instance__teacher'
        ).all()
        classes = [enrollment.class_instance for enrollment in enrollments]
        serializer = ClassListSerializer(classes, many=True)
        return Response(serializer.data)


class ClassStudentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing class enrollments
    Read-only - use Class.enroll/unenroll actions to modify
    """
    queryset = ClassStudent.objects.select_related('class_instance', 'student').all()
    serializer_class = ClassStudentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['class_instance', 'student']
    ordering_fields = ['enrolled_at']
    ordering = ['-enrolled_at']
