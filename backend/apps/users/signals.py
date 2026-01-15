"""
Signals for automatic Teacher profile creation
"""
from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from .models import User, Role
from datetime import date


@receiver(m2m_changed, sender=User.roles.through)
def create_teacher_profile_on_role_assignment(sender, instance, action, pk_set, **kwargs):
    """
    Automatically create a Teacher profile when TEACHER role is assigned to a user
    
    This prevents the "You do not have permission" error when users with TEACHER role
    try to start sessions.
    """
    # Only act when roles are added (not removed or cleared)
    if action != 'post_add':
        return
    
    # Check if TEACHER role was added
    if pk_set:
        teacher_role_added = Role.objects.filter(
            pk__in=pk_set,
            name='TEACHER'
        ).exists()
        
        if teacher_role_added:
            # Check if user already has a teacher profile
            if not hasattr(instance, 'teacher_profile'):
                # Import here to avoid circular imports
                from apps.classes.models import Teacher
                
                # Generate employee_id from email
                email_prefix = instance.email.split('@')[0].upper()[:10]
                employee_id = f'EMP-{email_prefix}'
                
                # Make sure employee_id is unique
                counter = 1
                original_employee_id = employee_id
                while Teacher.objects.filter(employee_id=employee_id).exists():
                    employee_id = f'{original_employee_id}-{counter}'
                    counter += 1
                
                # Create Teacher profile
                Teacher.objects.create(
                    user=instance,
                    employee_id=employee_id,
                    department='General',
                    specialization='',
                    hire_date=date.today()
                )
                
                print(f'✓ Auto-created Teacher profile for {instance.email} (Employee ID: {employee_id})')


@receiver(m2m_changed, sender=User.roles.through)
def remove_teacher_profile_on_role_removal(sender, instance, action, pk_set, **kwargs):
    """
    Optionally delete Teacher profile when TEACHER role is removed
    
    Note: This is commented out by default to preserve data integrity.
    If you want to auto-delete teacher profiles when role is removed, uncomment this.
    """
    # Only act when roles are removed
    if action != 'post_remove':
        return
    
    
    if pk_set:
        teacher_role_removed = Role.objects.filter(
            pk__in=pk_set,
            name='TEACHER'
        ).exists()
        
        if teacher_role_removed:
            # Check if user still has other TEACHER roles (edge case)
            still_has_teacher_role = instance.roles.filter(name='TEACHER').exists()
            
            if not still_has_teacher_role and hasattr(instance, 'teacher_profile'):
                from apps.classes.models import Teacher
                instance.teacher_profile.delete()
                print(f'✓ Deleted Teacher profile for {instance.email}')
    
    pass
