"""
Tests for Module 2: Academic Structure
Tests all models, serializers, views, and permissions
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import date, timedelta
from apps.users.models import Role
from apps.classes.models import Subject, Teacher, Class, Student, ClassStudent

User = get_user_model()


class SubjectModelTest(TestCase):
    """Test Subject model"""

    def setUp(self):
        self.subject = Subject.objects.create(
            name='Introduction to Computer Science',
            code='CS101',
            description='Fundamentals of programming'
        )

    def test_subject_creation(self):
        """Test subject is created with UUID"""
        self.assertIsNotNone(self.subject.id)
        self.assertEqual(self.subject.name, 'Introduction to Computer Science')
        self.assertEqual(self.subject.code, 'CS101')

    def test_subject_str(self):
        """Test string representation"""
        expected = 'CS101 - Introduction to Computer Science'
        self.assertEqual(str(self.subject), expected)

    def test_subject_unique_code(self):
        """Test subject code must be unique"""
        with self.assertRaises(Exception):
            Subject.objects.create(
                name='Another Course',
                code='CS101',  # Duplicate code
                description='Different course'
            )


class TeacherModelTest(TestCase):
    """Test Teacher model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email='teacher@test.com',
            password='test123',
            first_name='John',
            last_name='Smith'
        )
        self.teacher = Teacher.objects.create(
            user=self.user,
            employee_id='T2024001',
            department='Computer Science',
            specialization='AI',
            hire_date=date(2020, 8, 1)
        )

    def test_teacher_creation(self):
        """Test teacher is created with UUID and linked to user"""
        self.assertIsNotNone(self.teacher.id)
        self.assertEqual(self.teacher.user, self.user)
        self.assertEqual(self.teacher.employee_id, 'T2024001')

    def test_teacher_str(self):
        """Test string representation"""
        expected = 'John Smith (T2024001)'
        self.assertEqual(str(self.teacher), expected)

    def test_teacher_unique_employee_id(self):
        """Test employee_id must be unique"""
        user2 = User.objects.create_user(
            email='teacher2@test.com',
            password='test123'
        )
        with self.assertRaises(Exception):
            Teacher.objects.create(
                user=user2,
                employee_id='T2024001',  # Duplicate
                department='Math',
                hire_date=date(2021, 1, 1)
            )


class StudentModelTest(TestCase):
    """Test Student model"""

    def setUp(self):
        self.student = Student.objects.create(
            student_id='S2024001',
            first_name='Jane',
            last_name='Doe',
            email='jane@test.com',
            enrollment_date=date(2024, 9, 1),
            major='Computer Science'
        )

    def test_student_creation(self):
        """Test student is created with UUID"""
        self.assertIsNotNone(self.student.id)
        self.assertEqual(self.student.student_id, 'S2024001')

    def test_student_full_name(self):
        """Test full_name property"""
        self.assertEqual(self.student.full_name, 'Jane Doe')

    def test_student_str(self):
        """Test string representation"""
        expected = 'S2024001 - Jane Doe'
        self.assertEqual(str(self.student), expected)


class ClassModelTest(TestCase):
    """Test Class model"""

    def setUp(self):
        # Create subject
        self.subject = Subject.objects.create(
            name='Computer Science 101',
            code='CS101'
        )

        # Create teacher
        self.user = User.objects.create_user(
            email='prof@test.com',
            password='test123',
            first_name='John',
            last_name='Smith'
        )
        self.teacher = Teacher.objects.create(
            user=self.user,
            employee_id='T2024001',
            department='CS',
            hire_date=date(2020, 1, 1)
        )

        # Create class
        self.cs_class = Class.objects.create(
            subject=self.subject,
            teacher=self.teacher,
            name='CS101 Section A',
            academic_year='2024-2025',
            semester='FALL',
            room_number='A101',
            max_students=30
        )

    def test_class_creation(self):
        """Test class is created with proper relationships"""
        self.assertIsNotNone(self.cs_class.id)
        self.assertEqual(self.cs_class.subject, self.subject)
        self.assertEqual(self.cs_class.teacher, self.teacher)

    def test_class_enrolled_count(self):
        """Test enrolled_count property"""
        self.assertEqual(self.cs_class.enrolled_count, 0)

        # Add a student
        student = Student.objects.create(
            student_id='S001',
            first_name='Jane',
            last_name='Doe',
            email='jane@test.com',
            enrollment_date=date.today()
        )
        ClassStudent.objects.create(
            class_instance=self.cs_class,
            student=student
        )

        self.assertEqual(self.cs_class.enrolled_count, 1)

    def test_class_str(self):
        """Test string representation"""
        expected = 'CS101 Section A (FALL 2024-2025)'
        self.assertEqual(str(self.cs_class), expected)


class ClassStudentModelTest(TestCase):
    """Test ClassStudent (enrollment) model"""

    def setUp(self):
        # Create subject and teacher
        subject = Subject.objects.create(name='CS101', code='CS101')
        user = User.objects.create_user(
            email='prof@test.com',
            password='test123'
        )
        teacher = Teacher.objects.create(
            user=user,
            employee_id='T001',
            department='CS',
            hire_date=date.today()
        )

        # Create class
        self.cs_class = Class.objects.create(
            subject=subject,
            teacher=teacher,
            name='CS101 A',
            academic_year='2024-2025',
            semester='FALL',
            max_students=2  # Small limit for testing
        )

        # Create students
        self.student1 = Student.objects.create(
            student_id='S001',
            first_name='Jane',
            last_name='Doe',
            email='jane@test.com',
            enrollment_date=date.today()
        )
        self.student2 = Student.objects.create(
            student_id='S002',
            first_name='John',
            last_name='Smith',
            email='john@test.com',
            enrollment_date=date.today()
        )

    def test_enrollment_creation(self):
        """Test enrollment is created"""
        enrollment = ClassStudent.objects.create(
            class_instance=self.cs_class,
            student=self.student1
        )
        self.assertIsNotNone(enrollment.id)
        self.assertIsNotNone(enrollment.enrolled_at)

    def test_duplicate_enrollment_prevented(self):
        """Test unique_together constraint prevents duplicate enrollments"""
        ClassStudent.objects.create(
            class_instance=self.cs_class,
            student=self.student1
        )
        with self.assertRaises(Exception):
            ClassStudent.objects.create(
                class_instance=self.cs_class,
                student=self.student1  # Duplicate
            )

    def test_enrollment_validation_class_full(self):
        """Test validation prevents enrollment when class is full"""
        # Fill the class (max_students=2)
        ClassStudent.objects.create(
            class_instance=self.cs_class,
            student=self.student1
        )
        ClassStudent.objects.create(
            class_instance=self.cs_class,
            student=self.student2
        )

        # Try to add third student
        student3 = Student.objects.create(
            student_id='S003',
            first_name='Bob',
            last_name='Jones',
            email='bob@test.com',
            enrollment_date=date.today()
        )
        enrollment = ClassStudent(
            class_instance=self.cs_class,
            student=student3
        )

        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            enrollment.clean()


class SubjectAPITest(APITestCase):
    """Test Subject API endpoints"""

    def setUp(self):
        # Create admin user
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='admin123',
            first_name='Admin',
            last_name='User'
        )
        admin_role = Role.objects.create(name='ADMIN')
        admin_role.users.add(self.admin_user)

        # Create teacher user
        self.teacher_user = User.objects.create_user(
            email='teacher@test.com',
            password='teacher123',
            first_name='Teacher',
            last_name='User'
        )
        teacher_role = Role.objects.create(name='TEACHER')
        teacher_role.users.add(self.teacher_user)

        # Create test subject
        self.subject = Subject.objects.create(
            name='Computer Science',
            code='CS101',
            description='Intro to CS'
        )

        self.client = APIClient()

    def test_list_subjects_as_teacher(self):
        """Test teacher can list subjects"""
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get('/api/subjects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_subject_as_admin(self):
        """Test admin can create subject"""
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'name': 'Mathematics',
            'code': 'MATH101',
            'description': 'Intro to Math'
        }
        response = self.client.post('/api/subjects/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Subject.objects.count(), 2)

    def test_create_subject_as_teacher_forbidden(self):
        """Test teacher cannot create subject"""
        self.client.force_authenticate(user=self.teacher_user)
        data = {
            'name': 'Physics',
            'code': 'PHY101'
        }
        response = self.client.post('/api/subjects/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_subject_as_admin(self):
        """Test admin can update subject"""
        self.client.force_authenticate(user=self.admin_user)
        data = {'name': 'Advanced Computer Science'}
        response = self.client.patch(f'/api/subjects/{self.subject.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.subject.refresh_from_db()
        self.assertEqual(self.subject.name, 'Advanced Computer Science')

    def test_delete_subject_as_admin(self):
        """Test admin can delete subject"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/subjects/{self.subject.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Subject.objects.count(), 0)


class ClassAPITest(APITestCase):
    """Test Class API endpoints"""

    def setUp(self):
        # Create admin
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='admin123'
        )
        admin_role = Role.objects.create(name='ADMIN')
        admin_role.users.add(self.admin_user)

        # Create teacher
        self.teacher_user = User.objects.create_user(
            email='teacher@test.com',
            password='teacher123',
            first_name='John',
            last_name='Teacher'
        )
        teacher_role = Role.objects.create(name='TEACHER')
        teacher_role.users.add(self.teacher_user)

        self.teacher = Teacher.objects.create(
            user=self.teacher_user,
            employee_id='T001',
            department='CS',
            hire_date=date.today()
        )

        # Create another teacher
        self.other_teacher_user = User.objects.create_user(
            email='other@test.com',
            password='other123'
        )
        teacher_role.users.add(self.other_teacher_user)
        self.other_teacher = Teacher.objects.create(
            user=self.other_teacher_user,
            employee_id='T002',
            department='CS',
            hire_date=date.today()
        )

        # Create subject
        self.subject = Subject.objects.create(
            name='Computer Science',
            code='CS101'
        )

        # Create class
        self.cs_class = Class.objects.create(
            subject=self.subject,
            teacher=self.teacher,
            name='CS101 Section A',
            academic_year='2024-2025',
            semester='FALL',
            max_students=30
        )

        # Create students
        self.student1 = Student.objects.create(
            student_id='S001',
            first_name='Jane',
            last_name='Doe',
            email='jane@test.com',
            enrollment_date=date.today()
        )
        self.student2 = Student.objects.create(
            student_id='S002',
            first_name='John',
            last_name='Smith',
            email='john@test.com',
            enrollment_date=date.today()
        )

        self.client = APIClient()

    def test_list_classes(self):
        """Test listing classes"""
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get('/api/classes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_class_as_teacher(self):
        """Test teacher can create class"""
        self.client.force_authenticate(user=self.teacher_user)
        data = {
            'subject_id': str(self.subject.id),
            'teacher_id': str(self.teacher.id),
            'name': 'CS101 Section B',
            'academic_year': '2024-2025',
            'semester': 'SPRING',
            'max_students': 25
        }
        response = self.client.post('/api/classes/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Class.objects.count(), 2)

    def test_update_own_class_as_teacher(self):
        """Test teacher can update their own class"""
        self.client.force_authenticate(user=self.teacher_user)
        data = {'name': 'CS101 Section A - Updated'}
        response = self.client.patch(f'/api/classes/{self.cs_class.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_other_class_as_teacher_forbidden(self):
        """Test teacher cannot update another teacher's class"""
        self.client.force_authenticate(user=self.other_teacher_user)
        data = {'name': 'Hacked Name'}
        response = self.client.patch(f'/api/classes/{self.cs_class.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_any_class_as_admin(self):
        """Test admin can update any class"""
        self.client.force_authenticate(user=self.admin_user)
        data = {'name': 'Admin Updated Name'}
        response = self.client.patch(f'/api/classes/{self.cs_class.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_class_students(self):
        """Test getting students enrolled in a class"""
        # Enroll students
        ClassStudent.objects.create(
            class_instance=self.cs_class,
            student=self.student1
        )
        ClassStudent.objects.create(
            class_instance=self.cs_class,
            student=self.student2
        )

        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get(f'/api/classes/{self.cs_class.id}/students/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_enroll_student_as_class_owner(self):
        """Test class owner can enroll students"""
        self.client.force_authenticate(user=self.teacher_user)
        data = {'student_id': str(self.student1.id)}
        response = self.client.post(
            f'/api/classes/{self.cs_class.id}/enroll/',
            data
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ClassStudent.objects.count(), 1)

    def test_enroll_student_as_other_teacher_forbidden(self):
        """Test other teachers cannot enroll students"""
        self.client.force_authenticate(user=self.other_teacher_user)
        data = {'student_id': str(self.student1.id)}
        response = self.client.post(
            f'/api/classes/{self.cs_class.id}/enroll/',
            data
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enroll_student_as_admin(self):
        """Test admin can enroll students in any class"""
        self.client.force_authenticate(user=self.admin_user)
        data = {'student_id': str(self.student1.id)}
        response = self.client.post(
            f'/api/classes/{self.cs_class.id}/enroll/',
            data
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unenroll_student(self):
        """Test unenrolling a student"""
        # First enroll
        ClassStudent.objects.create(
            class_instance=self.cs_class,
            student=self.student1
        )

        self.client.force_authenticate(user=self.teacher_user)
        data = {'student_id': str(self.student1.id)}
        response = self.client.post(
            f'/api/classes/{self.cs_class.id}/unenroll/',
            data
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ClassStudent.objects.count(), 0)

    def test_get_class_roster(self):
        """Test getting detailed class roster"""
        ClassStudent.objects.create(
            class_instance=self.cs_class,
            student=self.student1
        )

        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get(f'/api/classes/{self.cs_class.id}/roster/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        # Check that enrollment includes student and class details
        self.assertIn('student', response.data[0])
        self.assertIn('class_instance', response.data[0])
        self.assertIn('enrolled_at', response.data[0])


class TeacherAPITest(APITestCase):
    """Test Teacher API endpoints"""

    def setUp(self):
        # Create admin
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='admin123'
        )
        admin_role = Role.objects.create(name='ADMIN')
        admin_role.users.add(self.admin_user)

        # Create teacher user
        self.teacher_user = User.objects.create_user(
            email='teacher@test.com',
            password='teacher123',
            first_name='John',
            last_name='Teacher'
        )
        teacher_role = Role.objects.create(name='TEACHER')
        teacher_role.users.add(self.teacher_user)

        self.teacher = Teacher.objects.create(
            user=self.teacher_user,
            employee_id='T001',
            department='CS',
            hire_date=date.today()
        )

        self.client = APIClient()

    def test_list_teachers(self):
        """Test listing teachers"""
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get('/api/teachers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_teacher_classes(self):
        """Test getting classes taught by a teacher"""
        subject = Subject.objects.create(name='CS101', code='CS101')
        Class.objects.create(
            subject=subject,
            teacher=self.teacher,
            name='CS101 A',
            academic_year='2024-2025',
            semester='FALL'
        )
        Class.objects.create(
            subject=subject,
            teacher=self.teacher,
            name='CS101 B',
            academic_year='2024-2025',
            semester='SPRING'
        )

        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get(f'/api/teachers/{self.teacher.id}/classes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)


class StudentAPITest(APITestCase):
    """Test Student API endpoints"""

    def setUp(self):
        # Create admin
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='admin123'
        )
        admin_role = Role.objects.create(name='ADMIN')
        admin_role.users.add(self.admin_user)

        # Create teacher
        self.teacher_user = User.objects.create_user(
            email='teacher@test.com',
            password='teacher123'
        )
        teacher_role = Role.objects.create(name='TEACHER')
        teacher_role.users.add(self.teacher_user)

        # Create student
        self.student = Student.objects.create(
            student_id='S001',
            first_name='Jane',
            last_name='Doe',
            email='jane@test.com',
            enrollment_date=date.today(),
            major='Computer Science'
        )

        self.client = APIClient()

    def test_list_students(self):
        """Test listing students"""
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get('/api/students/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_student_as_admin(self):
        """Test admin can create student"""
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'student_id': 'S002',
            'first_name': 'John',
            'last_name': 'Smith',
            'email': 'john@test.com',
            'enrollment_date': date.today().isoformat(),
            'major': 'Mathematics'
        }
        response = self.client.post('/api/students/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Student.objects.count(), 2)

    def test_create_student_as_teacher_forbidden(self):
        """Test teacher cannot create student"""
        self.client.force_authenticate(user=self.teacher_user)
        data = {
            'student_id': 'S003',
            'first_name': 'Bob',
            'last_name': 'Jones',
            'email': 'bob@test.com',
            'enrollment_date': date.today().isoformat()
        }
        response = self.client.post('/api/students/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_student_classes(self):
        """Test getting classes a student is enrolled in"""
        # Create class
        teacher_user = User.objects.create_user(
            email='prof@test.com',
            password='prof123'
        )
        teacher = Teacher.objects.create(
            user=teacher_user,
            employee_id='T001',
            department='CS',
            hire_date=date.today()
        )
        subject = Subject.objects.create(name='CS101', code='CS101')
        cs_class = Class.objects.create(
            subject=subject,
            teacher=teacher,
            name='CS101 A',
            academic_year='2024-2025',
            semester='FALL'
        )

        # Enroll student
        ClassStudent.objects.create(
            class_instance=cs_class,
            student=self.student
        )

        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get(f'/api/students/{self.student.id}/classes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class EnrollmentAPITest(APITestCase):
    """Test Enrollment (ClassStudent) API endpoints"""

    def setUp(self):
        # Create teacher
        self.teacher_user = User.objects.create_user(
            email='teacher@test.com',
            password='teacher123'
        )
        teacher_role = Role.objects.create(name='TEACHER')
        teacher_role.users.add(self.teacher_user)

        self.teacher = Teacher.objects.create(
            user=self.teacher_user,
            employee_id='T001',
            department='CS',
            hire_date=date.today()
        )

        # Create class
        subject = Subject.objects.create(name='CS101', code='CS101')
        self.cs_class = Class.objects.create(
            subject=subject,
            teacher=self.teacher,
            name='CS101 A',
            academic_year='2024-2025',
            semester='FALL'
        )

        # Create student
        self.student = Student.objects.create(
            student_id='S001',
            first_name='Jane',
            last_name='Doe',
            email='jane@test.com',
            enrollment_date=date.today()
        )

        # Create enrollment
        self.enrollment = ClassStudent.objects.create(
            class_instance=self.cs_class,
            student=self.student
        )

        self.client = APIClient()

    def test_list_enrollments(self):
        """Test listing all enrollments"""
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get('/api/enrollments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_enrollment_detail(self):
        """Test getting enrollment detail with nested data"""
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get(f'/api/enrollments/{self.enrollment.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('class_instance', response.data)
        self.assertIn('student', response.data)
        self.assertIn('enrolled_at', response.data)


def run_tests():
    """Helper function to run all tests"""
    from django.core.management import call_command
    call_command('test', 'apps.classes', verbosity=2)


if __name__ == '__main__':
    run_tests()
