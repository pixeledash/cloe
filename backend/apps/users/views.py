from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, Role
from .serializers import (
    UserSerializer, 
    RegisterSerializer, 
    MFASetupSerializer, 
    MFAVerifySerializer,
    RoleSerializer
)
import pyotp
import io
import base64


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'roles': [role.name for role in user.roles.all()],
                },
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        mfa_token = request.data.get('mfa_token')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=email, password=password)
        
        if not user:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if user.mfa_enabled:
            if not mfa_token:
                return Response(
                    {'mfa_required': True},
                    status=status.HTTP_200_OK
                )
            
            totp = pyotp.TOTP(user.mfa_secret)
            if not totp.verify(mfa_token):
                return Response(
                    {'error': 'Invalid MFA token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': {
                'id': str(user.id),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'mfa_enabled': user.mfa_enabled,
                'roles': [role.name for role in user.roles.all()],
            },
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class MFASetupView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.mfa_enabled:
            return Response(
                {'error': 'MFA already enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        secret = pyotp.random_base32()
        user.mfa_secret = secret
        user.save()
        
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name='Smart Classroom'
        )
        
        return Response({
            'secret': secret,
            'provisioning_uri': provisioning_uri,
        })


class MFAVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = MFAVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        if not user.mfa_secret:
            return Response(
                {'error': 'MFA not set up'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        totp = pyotp.TOTP(user.mfa_secret)
        if totp.verify(serializer.validated_data['token']):
            user.mfa_enabled = True
            user.save()
            return Response({'message': 'MFA enabled successfully'})
        
        return Response(
            {'error': 'Invalid token'},
            status=status.HTTP_400_BAD_REQUEST
        )


class MFADisableView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        user.mfa_enabled = False
        user.mfa_secret = None
        user.save()
        return Response({'message': 'MFA disabled successfully'})


class RoleViewSet(ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post']


class UserListView(APIView):
    """List all users - Admin only"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Check if user is admin
        if not request.user.has_role('ADMIN'):
            return Response(
                {'detail': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)


class UpdateUserRolesView(APIView):
    """Update user roles - Admin only"""
    permission_classes = [permissions.IsAuthenticated]
    
    def patch(self, request, user_id):
        # Check if user is admin
        if not request.user.has_role('ADMIN'):
            return Response(
                {'detail': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        role_names = request.data.get('roles', [])
        
        # Clear existing roles
        user.roles.clear()
        
        # Add new roles
        for role_name in role_names:
            try:
                role = Role.objects.get(name=role_name)
                user.roles.add(role)
            except Role.DoesNotExist:
                return Response(
                    {'detail': f'Role {role_name} not found'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = UserSerializer(user)
        return Response(serializer.data)
