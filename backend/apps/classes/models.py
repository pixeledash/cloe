import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator


class Subject(models.Model):
    """
    Subject/Course model (e.g., Mathematics, Physics, Computer Science)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'subjects'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Teacher(models.Model):
    """
    Teacher profile linked to User account
    Extends User model with teacher-specific information
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='teacher_profile'
    )
    employee_id = models.CharField(max_length=50, unique=True)
    department = models.CharField(max_length=100)
    specialization = models.CharField(max_length=100, blank=True, null=True)
    hire_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'teachers'
        ordering = ['employee_id']
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.employee_id})"


class Class(models.Model):
    """
    Class/Section model representing a specific class offering
    (e.g., "Math 101 - Fall 2024 - Room 301")
    """
    SEMESTER_CHOICES = [
        ('FALL', 'Fall'),
        ('SPRING', 'Spring'),
        ('SUMMER', 'Summer'),
        ('WINTER', 'Winter'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    subject = models.ForeignKey(
        Subject,
        on_delete=models.PROTECT,
        related_name='classes'
    )
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.PROTECT,
        related_name='classes'
    )
    academic_year = models.CharField(max_length=20)  # e.g., "2024-2025"
    semester = models.CharField(max_length=20, choices=SEMESTER_CHOICES)
    room_number = models.CharField(max_length=20, blank=True, null=True)
    schedule = models.CharField(max_length=255, blank=True, null=True)  # e.g., "MWF 10:00-11:00"
    max_students = models.IntegerField(
        blank=True,
        null=True,
        validators=[MinValueValidator(1)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'classes'
        ordering = ['-academic_year', 'semester', 'name']
        verbose_name_plural = 'Classes'
    
    def __str__(self):
        return f"{self.name} - {self.subject.code} ({self.academic_year} {self.semester})"
    
    @property
    def enrolled_count(self):
        """Return the number of students enrolled in this class"""
        return self.enrolled_students.count()
    
    @property
    def is_full(self):
        """Check if the class has reached maximum capacity"""
        if self.max_students:
            return self.enrolled_count >= self.max_students
        return False


class Student(models.Model):
    """
    Student model
    Note: Students may or may not have User accounts (depends on requirements)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_id = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=255, unique=True)
    date_of_birth = models.DateField(blank=True, null=True)
    enrollment_date = models.DateField()
    major = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'students'
        ordering = ['student_id']
    
    def __str__(self):
        return f"{self.student_id} - {self.first_name} {self.last_name}"
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"


class ClassStudent(models.Model):
    """
    Many-to-Many relationship between Class and Student
    Tracks student enrollment in classes
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_instance = models.ForeignKey(
        Class,
        on_delete=models.CASCADE,
        related_name='enrolled_students'
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='enrolled_classes'
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'class_students'
        unique_together = ['class_instance', 'student']
        ordering = ['enrolled_at']
        verbose_name = 'Class Enrollment'
        verbose_name_plural = 'Class Enrollments'
    
    def __str__(self):
        return f"{self.student.student_id} enrolled in {self.class_instance.name}"
