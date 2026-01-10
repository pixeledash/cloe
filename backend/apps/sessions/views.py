"""
Class Session Views
API endpoints for session management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import datetime

from .models import ClassSession
from .serializers import (
    ClassSessionListSerializer,
    ClassSessionDetailSerializer,
    StartSessionSerializer,
    EndSessionSerializer,
    ActiveSessionSerializer
)
from .permissions import (
    CanStartSession,
    CanEndSession,
    CanViewSession,
    IsTeacherOrAdmin
)


class ClassSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing class sessions
    
    Endpoints:
    - GET /sessions/ - List sessions (with filters)
    - GET /sessions/{id}/ - Get session details
    - POST /sessions/start/ - Start a new session
    - POST /sessions/{id}/end/ - End an active session
    - GET /sessions/active/ - Get all active sessions
    - GET /sessions/history/ - Get session history
    """
    
    queryset = ClassSession.objects.all()
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return ClassSessionListSerializer
        elif self.action == 'start':
            return StartSessionSerializer
        elif self.action == 'end':
            return EndSessionSerializer
        elif self.action == 'active':
            return ActiveSessionSerializer
        elif self.action == 'history':
            return ClassSessionListSerializer
        else:
            return ClassSessionDetailSerializer
    
    def get_queryset(self):
        """
        Filter queryset based on user role
        Teachers see only their sessions, admins see all
        """
        queryset = ClassSession.objects.select_related(
            'class_ref', 'teacher__user', 'subject'
        )
        
        user = self.request.user
        
        # Admins see all sessions
        if user.has_role('ADMIN'):
            return queryset
        
        # Teachers see only their own sessions
        if hasattr(user, 'teacher_profile'):
            return queryset.filter(teacher=user.teacher_profile)
        
        # Others see nothing
        return queryset.none()
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, CanStartSession])
    def start(self, request):
        """
        Start a new class session
        
        POST /api/sessions/start/
        Body: { "class_id": "uuid" }
        
        Returns:
        - 201: Session started successfully
        - 400: Validation error (active session exists, not assigned, etc.)
        - 403: Permission denied
        """
        serializer = StartSessionSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            session = serializer.save()
            
            # Return detailed session info
            response_serializer = ClassSessionDetailSerializer(session)
            return Response(
                {
                    'message': 'Class session started successfully',
                    'session': response_serializer.data
                },
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanEndSession])
    def end(self, request, pk=None):
        """
        End an active class session
        
        POST /api/sessions/{id}/end/
        
        Returns:
        - 200: Session ended successfully
        - 400: Session already ended
        - 403: Not authorized to end this session
        - 404: Session not found
        """
        session = self.get_object()
        
        serializer = EndSessionSerializer(
            session,
            data={},
            context={'request': request, 'session': session}
        )
        
        if serializer.is_valid():
            updated_session = serializer.save()
            
            # Return detailed session info
            response_serializer = ClassSessionDetailSerializer(updated_session)
            return Response(
                {
                    'message': 'Class session ended successfully',
                    'session': response_serializer.data
                },
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get all currently active sessions
        
        GET /api/sessions/active/
        Query params:
        - class_id: Filter by class
        - teacher_id: Filter by teacher
        - subject_id: Filter by subject
        
        Returns:
        - 200: List of active sessions
        """
        # Start with active sessions
        queryset = self.get_queryset().filter(status='ACTIVE')
        
        # Apply filters
        class_id = request.query_params.get('class_id')
        teacher_id = request.query_params.get('teacher_id')
        subject_id = request.query_params.get('subject_id')
        
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        
        serializer = ActiveSessionSerializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'sessions': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """
        Get session history with filters
        
        GET /api/sessions/history/
        Query params:
        - class_id: Filter by class
        - teacher_id: Filter by teacher
        - subject_id: Filter by subject
        - date_from: Start date (YYYY-MM-DD)
        - date_to: End date (YYYY-MM-DD)
        - status: ACTIVE or ENDED
        
        Returns:
        - 200: Paginated list of sessions
        """
        queryset = self.get_queryset()
        
        # Apply filters
        class_id = request.query_params.get('class_id')
        teacher_id = request.query_params.get('teacher_id')
        subject_id = request.query_params.get('subject_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        session_status = request.query_params.get('status')
        
        if class_id:
            queryset = queryset.filter(class_ref_id=class_id)
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if session_status:
            queryset = queryset.filter(status=session_status.upper())
        
        # Date range filters
        if date_from:
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
                queryset = queryset.filter(start_time__gte=date_from_obj)
            except ValueError:
                return Response(
                    {'error': 'Invalid date_from format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if date_to:
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
                # Include entire day
                date_to_obj = date_to_obj.replace(hour=23, minute=59, second=59)
                queryset = queryset.filter(start_time__lte=date_to_obj)
            except ValueError:
                return Response(
                    {'error': 'Invalid date_to format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Paginate results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ClassSessionListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ClassSessionListSerializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })
