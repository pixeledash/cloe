import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom User model matching the database schema
    Uses UUID as primary key to match schema.sql
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, max_length=255)
    username = None  # Remove username field
    mfa_secret = models.CharField(max_length=32, blank=True, null=True)
    mfa_enabled = models.BooleanField(default=False)
    
    # Note: AbstractUser provides these fields which map to your schema:
    # - password -> password_hash (Django handles hashing automatically)
    # - is_active -> is_active (BOOLEAN)
    # - date_joined -> created_at (TIMESTAMP)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    objects = UserManager()
    
    class Meta:
        db_table = 'users_user'  # Actual table name created by Django
    
    def __str__(self):
        return self.email
    
    def has_role(self, role_name):
        """Check if user has a specific role"""
        return self.roles.filter(name=role_name).exists()


class Role(models.Model):
    """
    Role model matching the database schema
    """
    ADMIN = 'ADMIN'
    TEACHER = 'TEACHER'
    
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (TEACHER, 'Teacher'),
    ]
    
    name = models.CharField(max_length=30, choices=ROLE_CHOICES, unique=True)
    users = models.ManyToManyField(
        User, 
        related_name='roles', 
        blank=True,
        db_table='users_role_users'  # Actual M2M table created by Django
    )
    
    class Meta:
        db_table = 'users_role'  # Actual table name created by Django
    
    def __str__(self):
        return self.name


# Note: Teacher, Class, Student models are implemented in Module 2 (apps.classes)
