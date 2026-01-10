"""
Tests for Class Sessions (Module 3)
"""
from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import timedelta
import uuid

from apps.users.models import User, Role
from apps.classes.models import Subject, Teacher, Class, Student
from apps.sessions.models import ClassSession


class ClassSessionModelTests(TestCase):
    """Test ClassSession model"""
    
    def setUp(self):
        """Set up test data"""
        # Create teacher user
        self.teacher_user = User.objects.create_user(
            email='teacher@test.com',
            password='testpass123',
            first_name='John',
            last_name='Smith'
        )
        teacher_role = Role.objects.get(name='TEACHER')
        teacher_role.users.add(self.teacher_user)
        
        # Create teacher profile
        self.teacher = Teacher.objects.create(
            user=self.teacher_user,
            employee_id='T001',
            department='Computer Science'
        )
        
        # Create subject
        self.subject = Subject.objects.create(
            code='CS101',
            name='Introduction to Computer Science',
            description='Basic CS concepts'
        )
        
        # Create class
        self.class_obj = Class.objects.create(
            name='CS101 Section A',
            subject=self.subject,
            teacher=self.teacher,
            semester='Spring 2026',
            room_number='Room 101',
            max_students=30
        )
    
    def test_create_session(self):
        """Test creating a class session"""
        session = ClassSession.objects.create(
            class_ref=self.class_obj,
            subject=self.subject,
            teacher=self.teacher,
            status='ACTIVE'
        )
        
        self.assertEqual(session.status, 'ACTIVE')
        self.assertIsNone(session.end_time)
        self.assertIsNotNone(session.start_time)
        self.assertTrue(session.is_active)
    
    def test_uuid_generation(self):
        """Test UUID is auto-generated"""
        session = ClassSession.objects.create(
            class_ref=self.class_obj,
            subject=self.subject,
            teacher=self.teacher
        )
        
        self.assertIsInstance(session.id, uuid.UUID)
    
    def test_single_active_session_constraint(self):
        """Test only one active session per class"""
        # Create first active session
        ClassSession.objects.create(
            class_ref=self.class_obj,
            subject=self.subject,
            teacher=self.teacher,
            status='ACTIVE'
        )
        
        # Try to create second active session - should fail
        with self.assertRaises(ValidationError):
            session2 = ClassSession(
                class_ref=self.class_obj,
                subject=self.subject,
                teacher=self.teacher,
                status='ACTIVE'
            )
            session2.save()
    
    def test_multiple_ended_sessions_allowed(self):
        """Test multiple ended sessions are allowed"""
        # Create and end first session
        session1 = ClassSession.objects.create(
            class_ref=self.class_obj,
            subject=self.subject,
            teacher=self.teacher,
            status='ACTIVE'
        )
        session1.end_session()
        
        # Create and end second session - should work
        session2 = ClassSession.objects.create(
            class_ref=self.class_obj,
            subject=self.subject,
            teacher=self.teacher,
            status='ACTIVE'
        )
        session2.end_session()
        
        self.assertEqual(
            ClassSession.objects.filter(class_ref=self.class_obj, status='ENDED').count(),
            2
        )
    
    def test_end_session(self):
        """Test ending an active session"""
        session = ClassSession.objects.create(
            class_ref=self.class_obj,
            subject=self.subject,
            teacher=self.teacher,
            status='ACTIVE'
        )
        
        session.end_session()
        
        self.assertEqual(session.status, 'ENDED')
        self.assertIsNotNone(session.end_time)
        self.assertFalse(session.is_active)
    
    def test_cannot_end_already_ended_session(self):
        """Test ending an already ended session raises error"""
        session = ClassSession.objects.create(
            class_ref=self.class_obj,
            subject=self.subject,
            teacher=self.teacher,
            status='ACTIVE'
        )
        session.end_session()
        
        # Try to end again
        with self.assertRaises(ValidationError):
            session.end_session()
    
    def test_duration_calculation(self):
        """Test session duration calculation"""
        session = ClassSession.objects.create(
            class_ref=self.class_obj,
            subject=self.subject,
            teacher=self.teacher,
            status='ACTIVE'
        )
        
        # For active session, duration should be > 0
        self.assertGreater(session.duration.total_seconds(), 0)
        
        # End session and check duration
        session.end_session()
        duration = session.duration
        self.assertIsInstance(duration, timedelta)
        self.assertGreater(duration.total_seconds(), 0)
    
    def test_get_active_sessions(self):
        """Test retrieving active sessions"""
        # Create active session
        ClassSession.objects.create(
            class_ref=self.class_obj,
            subject=self.subject,
            teacher=self.teacher,
            status='ACTIVE'
        )
        
        # Create ended session
        ended = ClassSession.objects.create(
            class_ref=self.class_obj,
            subject=self.subject,
            teacher=self.teacher,
            status='ENDED',
            end_time=timezone.now()
        )
        
        active = ClassSession.get_active_sessions()
        self.assertEqual(active.count(), 1)
        self.assertEqual(active.first().status, 'ACTIVE')
    
    def test_session_str_representation(self):
        """Test string representation"""
        session = ClassSession.objects.create(
            class_ref=self.class_obj,
            subject=self.subject,
            teacher=self.teacher
        )
        
        str_repr = str(session)
        self.assertIn(self.class_obj.name, str_repr)


class ClassSessionAPITests(APITestCase):
    """Test ClassSession API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create teacher user
        self.teacher_user = User.objects.create_user(
            email='teacher@test.com',
            password='testpass123',
            first_name='John',
            last_name='Smith'
        )
        teacher_role = Role.objects.get(name='TEACHER')
        teacher_role.users.add(self.teacher_user)
        
        # Create teacher profile
        self.teacher = Teacher.objects.create(
            user=self.teacher_user,
            employee_id='T001',
            department='Computer Science'
        )
        
        # Create another teacher
        teacher_user2 = User.objects.create_user(
            email='teacher2@test.com',
            password='testpass123',
            first_name='Jane',
            last_name='Doe'
        )
        teacher_role.users.add(teacher_user2)
        self.teacher2 = Teacher.objects.create(
            user=teacher_user2,
            employee_id='T002',
            department='Mathematics'
        )
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            first_name='Admin',
            last_name='User'
        )
        admin_role = Role.objects.get(name='ADMIN')
        admin_role.users.add(self.admin_user)
        
        # Create subject
        self.subject = Subject.objects.create(
            code='CS101',
            name='Introduction to Computer Science',
            description='Basic CS concepts'
        )
        
        # Create class for teacher 1
        self.class_obj = Class.objects.create(
            name='CS101 Section A',
            subject=self.subject,
            teacher=self.teacher,
            semester='Spring 2026',
            room_number='Room 101',
            max_students=30
        )
        
        # Create class for teacher 2
        self.class_obj2 = Class.objects.create(
            name='CS101 Section B',
            subject=self.subject,
            teacher=self.teacher2,
            semester='Spring 2026',
            room_number='Room 102',
            max_students=30
        )
        
        # Get auth token for teacher
        response = self.client.post('/auth/login/', {
            'email': 'teacher@test.com',
            'password': 'testpass123'
        })
        self.teacher_token = response.data['access']
    
    def test_start_session(self):
        """Test starting a new session"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')
        
        response = self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj.id)
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('session', response.data)
        self.assertEqual(response.data['session']['status'], 'ACTIVE')
    
    def test_start_session_not_assigned_teacher(self):
        """Test starting session for class you don't teach"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')
        
        # Try to start session for teacher2's class
        response = self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj2.id)
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_start_session_already_active(self):
        """Test starting session when one is already active"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')
        
        # Start first session
        self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj.id)
        })
        
        # Try to start second session
        response = self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj.id)
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_start_session_unauthenticated(self):
        """Test starting session without authentication"""
        response = self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj.id)
        })
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_end_session(self):
        """Test ending an active session"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')
        
        # Start session
        response = self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj.id)
        })
        session_id = response.data['session']['id']
        
        # End session
        response = self.client.post(f'/api/sessions/{session_id}/end/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['session']['status'], 'ENDED')
        self.assertIsNotNone(response.data['session']['end_time'])
    
    def test_end_session_not_owner(self):
        """Test ending session started by another teacher"""
        # Teacher 1 starts session
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')
        response = self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj.id)
        })
        session_id = response.data['session']['id']
        
        # Teacher 2 tries to end it
        response = self.client.post('/auth/login/', {
            'email': 'teacher2@test.com',
            'password': 'testpass123'
        })
        teacher2_token = response.data['access']
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {teacher2_token}')
        response = self.client.post(f'/api/sessions/{session_id}/end/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_end_session_as_admin(self):
        """Test admin can end any session"""
        # Teacher starts session
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')
        response = self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj.id)
        })
        session_id = response.data['session']['id']
        
        # Admin ends it
        response = self.client.post('/auth/login/', {
            'email': 'admin@test.com',
            'password': 'testpass123'
        })
        admin_token = response.data['access']
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
        response = self.client.post(f'/api/sessions/{session_id}/end/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['session']['status'], 'ENDED')
    
    def test_end_already_ended_session(self):
        """Test ending an already ended session"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')
        
        # Start and end session
        response = self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj.id)
        })
        session_id = response.data['session']['id']
        self.client.post(f'/api/sessions/{session_id}/end/')
        
        # Try to end again
        response = self.client.post(f'/api/sessions/{session_id}/end/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_get_active_sessions(self):
        """Test retrieving active sessions"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')
        
        # Start session
        self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj.id)
        })
        
        # Get active sessions
        response = self.client.get('/api/sessions/active/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['sessions']), 1)
    
    def test_get_active_sessions_filtered_by_class(self):
        """Test filtering active sessions by class"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')
        
        # Start session
        self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj.id)
        })
        
        # Get active sessions filtered by class
        response = self.client.get(f'/api/sessions/active/?class_id={self.class_obj.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
    
    def test_get_session_history(self):
        """Test retrieving session history"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')
        
        # Start and end a session
        response = self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj.id)
        })
        session_id = response.data['session']['id']
        self.client.post(f'/api/sessions/{session_id}/end/')
        
        # Get history
        response = self.client.get('/api/sessions/history/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(response.data['count'], 0)
    
    def test_get_session_detail(self):
        """Test retrieving session details"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')
        
        # Start session
        response = self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj.id)
        })
        session_id = response.data['session']['id']
        
        # Get details
        response = self.client.get(f'/api/sessions/{session_id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], session_id)
        self.assertIn('class_ref', response.data)
        self.assertIn('teacher', response.data)
        self.assertIn('subject', response.data)
    
    def test_list_sessions(self):
        """Test listing all sessions"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')
        
        # Create sessions
        response = self.client.post('/api/sessions/start/', {
            'class_id': str(self.class_obj.id)
        })
        session_id = response.data['session']['id']
        self.client.post(f'/api/sessions/{session_id}/end/')
        
        # List sessions
        response = self.client.get('/api/sessions/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['results']), 0)


class ClassSessionPermissionTests(APITestCase):
    """Test permissions for class sessions"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create student user (should have no session access)
        self.student_user = User.objects.create_user(
            email='student@test.com',
            password='testpass123',
            first_name='Student',
            last_name='User'
        )
        
        # Get student token
        response = self.client.post('/auth/login/', {
            'email': 'student@test.com',
            'password': 'testpass123'
        })
        self.student_token = response.data['access']
    
    def test_student_cannot_start_session(self):
        """Test students cannot start sessions"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')
        
        # Create dummy class ID
        dummy_class_id = str(uuid.uuid4())
        
        response = self.client.post('/api/sessions/start/', {
            'class_id': dummy_class_id
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_student_cannot_view_sessions(self):
        """Test students cannot view sessions"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')
        
        response = self.client.get('/api/sessions/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
