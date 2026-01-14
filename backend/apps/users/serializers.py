from rest_framework import serializers
from .models import User, Role


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'roles', 'mfa_enabled')
        read_only_fields = ('id', 'mfa_enabled')
    
    def get_roles(self, obj):
        return [role.name for role in obj.roles.all()]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ('email', 'password', 'password_confirm', 'first_name', 'last_name')
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        
        # Auto-assign TEACHER role to new users
        teacher_role, created = Role.objects.get_or_create(name='TEACHER')
        user.roles.add(teacher_role)
        
        return user


class MFASetupSerializer(serializers.Serializer):
    secret = serializers.CharField(read_only=True)
    qr_code_url = serializers.CharField(read_only=True)


class MFAVerifySerializer(serializers.Serializer):
    token = serializers.CharField(max_length=6, min_length=6)


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ('id', 'name')
