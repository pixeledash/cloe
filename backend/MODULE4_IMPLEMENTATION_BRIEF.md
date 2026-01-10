# Module 4: Live Attendance Tracking - Implementation Brief

**Date:** January 10, 2026  
**Module:** Attendance Records  
**Dependencies:** Module 3 (ClassSession) ✅, Module 2 (Student) ✅

---

## Overview

Module 4 implements real-time attendance tracking during active class sessions. Teachers can mark students as PRESENT or ABSENT during a session, with strict business rules to ensure data integrity.

---

## Database Schema

### Attendance Model

```python
class Attendance(models.Model):
    """
    Attendance record for a student in a specific class session
    Tracks whether student was present or absent
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        'sessions.ClassSession',
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    student = models.ForeignKey(
        'classes.Student',
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('PRESENT', 'Present'),
            ('ABSENT', 'Absent'),
            ('LATE', 'Late'),  # Optional enhancement
        ]
    )
    marked_at = models.DateTimeField(auto_now_add=True)
    marked_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='marked_attendance'
    )
    notes = models.TextField(blank=True)  # Optional notes
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'attendance'
        constraints = [
            models.UniqueConstraint(
                fields=['session', 'student'],
                name='unique_attendance_per_session'
            )
        ]
        indexes = [
            models.Index(fields=['session']),
            models.Index(fields=['student']),
            models.Index(fields=['status']),
            models.Index(fields=['marked_at']),
        ]
        ordering = ['-marked_at']
        verbose_name = 'Attendance Record'
        verbose_name_plural = 'Attendance Records'
```

### SQL Schema
```sql
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE')),
    marked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    marked_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_attendance_per_session UNIQUE (session_id, student_id)
);

CREATE INDEX idx_attendance_session ON attendance(session_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_marked_at ON attendance(marked_at);
```

---

## Business Rules

### Rule 1: Session Must Be ACTIVE ⚠️
**Requirement:** Attendance can only be marked during ACTIVE sessions

**Enforcement:**
- Model validation in `clean()` method
- Serializer validation before save
- View-level check

**Error Message:**
```json
{
  "session": ["Cannot mark attendance - session ended at 14:30 on Jan 10, 2026"]
}
```

---

### Rule 2: Unique Attendance Per Session 🔒
**Requirement:** Each student can only have ONE attendance record per session

**Enforcement:**
- Database unique constraint: `UNIQUE(session_id, student_id)`
- Serializer-level check before create
- Update existing record instead of creating duplicate

**Error Message:**
```json
{
  "non_field_errors": ["Attendance already marked for this student in this session"]
}
```

---

### Rule 3: No Updates After Session Ends 🚫
**Requirement:** Attendance records are locked when session status = ENDED

**Enforcement:**
- Model validation in `clean()` method
- Serializer validation check
- Read-only after session ends

**Error Message:**
```json
{
  "session": ["Cannot modify attendance - session ended and is locked"]
}
```

---

### Rule 4: Student Must Be Enrolled in Class ✅
**Requirement:** Can only mark attendance for students enrolled in the session's class

**Enforcement:**
- Serializer validation
- Check `student in session.class_ref.enrolled_students.all()`

**Error Message:**
```json
{
  "student": ["Student 'S12345' is not enrolled in 'TEST101 Section A'"]
}
```

---

## API Endpoints

### 1. POST /api/attendance/mark/
**Purpose:** Mark attendance for one or more students

**Authentication:** Required (Teacher or Admin)

**Request Body (Single):**
```json
{
  "session_id": "uuid",
  "student_id": "uuid",
  "status": "PRESENT"
}
```

**Request Body (Bulk):**
```json
{
  "session_id": "uuid",
  "records": [
    {"student_id": "uuid1", "status": "PRESENT"},
    {"student_id": "uuid2", "status": "ABSENT"},
    {"student_id": "uuid3", "status": "LATE"}
  ]
}
```

**Response (201 Created - Single):**
```json
{
  "message": "Attendance marked successfully",
  "attendance": {
    "id": "uuid",
    "session": {
      "id": "uuid",
      "class_name": "TEST101 Section A",
      "start_time": "2026-01-10T14:00:00Z"
    },
    "student": {
      "id": "uuid",
      "student_id": "S12345",
      "first_name": "John",
      "last_name": "Doe"
    },
    "status": "PRESENT",
    "marked_at": "2026-01-10T14:15:30Z",
    "marked_by": "Test Teacher"
  }
}
```

**Response (201 Created - Bulk):**
```json
{
  "message": "Bulk attendance marked successfully",
  "count": 3,
  "attendance_records": [
    {
      "id": "uuid1",
      "student_id": "S12345",
      "status": "PRESENT"
    },
    {
      "id": "uuid2",
      "student_id": "S12346",
      "status": "ABSENT"
    },
    {
      "id": "uuid3",
      "student_id": "S12347",
      "status": "LATE"
    }
  ]
}
```

**Error Responses:**
- **400:** Session not active, student not enrolled, validation error
- **403:** Not authorized (not the session's teacher)
- **404:** Session or student not found
- **409:** Attendance already marked (use PUT to update)

---

### 2. GET /api/attendance/session/{session_id}/
**Purpose:** View all attendance records for a session

**Authentication:** Required (Teacher or Admin)

**Query Parameters:**
- `status` (optional) - Filter by PRESENT/ABSENT/LATE
- `marked_after` (optional) - Filter by timestamp
- `include_absent` (optional, default=true) - Include absent students

**Response (200 OK):**
```json
{
  "session": {
    "id": "uuid",
    "class_name": "TEST101 Section A",
    "subject_code": "TEST101",
    "teacher_name": "Test Teacher",
    "start_time": "2026-01-10T14:00:00Z",
    "end_time": null,
    "status": "ACTIVE",
    "is_locked": false
  },
  "statistics": {
    "total_enrolled": 30,
    "present": 25,
    "absent": 3,
    "late": 2,
    "not_marked": 0,
    "attendance_rate": 90.0
  },
  "records": [
    {
      "id": "uuid",
      "student": {
        "id": "uuid",
        "student_id": "S12345",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com"
      },
      "status": "PRESENT",
      "marked_at": "2026-01-10T14:05:00Z",
      "marked_by": "Test Teacher",
      "notes": ""
    }
  ]
}
```

---

### 3. PUT /api/attendance/{id}/
**Purpose:** Update existing attendance record

**Authentication:** Required (Teacher or Admin)

**Request Body:**
```json
{
  "status": "LATE",
  "notes": "Arrived 10 minutes late"
}
```

**Response (200 OK):**
```json
{
  "message": "Attendance updated successfully",
  "attendance": {
    "id": "uuid",
    "student_id": "S12345",
    "status": "LATE",
    "marked_at": "2026-01-10T14:05:00Z",
    "updated_at": "2026-01-10T14:20:00Z",
    "notes": "Arrived 10 minutes late"
  }
}
```

**Error Responses:**
- **400:** Session is locked (ENDED)
- **403:** Not authorized
- **404:** Attendance record not found

---

### 4. GET /api/attendance/student/{student_id}/
**Purpose:** View attendance history for a specific student

**Authentication:** Required

**Query Parameters:**
- `date_from` (optional) - Start date (YYYY-MM-DD)
- `date_to` (optional) - End date (YYYY-MM-DD)
- `subject_id` (optional) - Filter by subject
- `status` (optional) - Filter by status

**Response (200 OK):**
```json
{
  "student": {
    "id": "uuid",
    "student_id": "S12345",
    "first_name": "John",
    "last_name": "Doe"
  },
  "statistics": {
    "total_sessions": 50,
    "present": 45,
    "absent": 3,
    "late": 2,
    "attendance_rate": 94.0
  },
  "records": [
    {
      "id": "uuid",
      "session": {
        "class_name": "TEST101 Section A",
        "subject_code": "TEST101",
        "date": "2026-01-10",
        "start_time": "2026-01-10T14:00:00Z"
      },
      "status": "PRESENT",
      "marked_at": "2026-01-10T14:05:00Z"
    }
  ]
}
```

---

### 5. POST /api/attendance/bulk-mark/
**Purpose:** Mark all enrolled students with default status (typically ABSENT)

**Authentication:** Required (Teacher or Admin)

**Use Case:** Quickly mark all students as ABSENT, then manually mark present ones

**Request Body:**
```json
{
  "session_id": "uuid",
  "default_status": "ABSENT"
}
```

**Response (201 Created):**
```json
{
  "message": "Bulk attendance initialized",
  "count": 30,
  "session_id": "uuid",
  "default_status": "ABSENT"
}
```

---

## Serializers

### AttendanceSerializer (Detail)
```python
class AttendanceSerializer(serializers.ModelSerializer):
    """Full attendance record with nested data"""
    session = ClassSessionListSerializer(read_only=True)
    student = StudentSerializer(read_only=True)
    marked_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'session', 'student', 'status',
            'marked_at', 'marked_by_name', 'notes',
            'created_at', 'updated_at'
        ]
```

### MarkAttendanceSerializer
```python
class MarkAttendanceSerializer(serializers.Serializer):
    """For marking attendance (single or bulk)"""
    session_id = serializers.UUIDField()
    student_id = serializers.UUIDField(required=False)  # For single
    status = serializers.ChoiceField(
        choices=['PRESENT', 'ABSENT', 'LATE'],
        required=False
    )
    records = serializers.ListField(required=False)  # For bulk
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        # Validate session is ACTIVE
        # Validate student is enrolled
        # Check permissions
        return attrs
```

### AttendanceListSerializer (Lightweight)
```python
class AttendanceListSerializer(serializers.ModelSerializer):
    """Lightweight for session view"""
    student_id = serializers.CharField(source='student.student_id')
    student_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'student_id', 'student_name',
            'status', 'marked_at'
        ]
```

---

## Permissions

### CanMarkAttendance
```python
class CanMarkAttendance(BasePermission):
    """
    Permission to mark attendance
    - Must be a teacher
    - Must be the teacher assigned to the session's class
    - OR must be an admin
    """
    def has_permission(self, request, view):
        return request.user.has_role('TEACHER') or request.user.has_role('ADMIN')
    
    def has_object_permission(self, request, view, obj):
        # obj is Attendance record
        if request.user.has_role('ADMIN'):
            return True
        
        if hasattr(request.user, 'teacher_profile'):
            return obj.session.teacher == request.user.teacher_profile
        
        return False
```

### CanViewAttendance
```python
class CanViewAttendance(BasePermission):
    """
    Permission to view attendance
    - Teachers can view their own classes
    - Students can view their own records
    - Admins can view all
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if request.user.has_role('ADMIN'):
            return True
        
        # Teacher viewing their class
        if hasattr(request.user, 'teacher_profile'):
            return obj.session.teacher == request.user.teacher_profile
        
        # Student viewing their own record
        if hasattr(request.user, 'student_profile'):
            return obj.student == request.user.student_profile
        
        return False
```

---

## Views

### AttendanceViewSet
```python
class AttendanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for attendance management
    """
    queryset = Attendance.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter based on user role"""
        user = self.request.user
        queryset = Attendance.objects.select_related(
            'session', 'student', 'marked_by'
        )
        
        if user.has_role('ADMIN'):
            return queryset
        
        if hasattr(user, 'teacher_profile'):
            return queryset.filter(session__teacher=user.teacher_profile)
        
        if hasattr(user, 'student_profile'):
            return queryset.filter(student=user.student_profile)
        
        return queryset.none()
    
    @action(detail=False, methods=['post'], permission_classes=[CanMarkAttendance])
    def mark(self, request):
        """Mark attendance (single or bulk)"""
        # Implementation
        pass
    
    @action(detail=False, methods=['get'], url_path='session/(?P<session_id>[^/.]+)')
    def session_attendance(self, request, session_id=None):
        """Get all attendance for a session"""
        # Implementation
        pass
    
    @action(detail=False, methods=['get'], url_path='student/(?P<student_id>[^/.]+)')
    def student_history(self, request, student_id=None):
        """Get attendance history for a student"""
        # Implementation
        pass
    
    @action(detail=False, methods=['post'])
    def bulk_mark(self, request):
        """Mark all students with default status"""
        # Implementation
        pass
```

---

## Admin Interface

### AttendanceAdmin
```python
@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = [
        'id_short', 'session_info', 'student_info',
        'status_badge', 'marked_at', 'marked_by'
    ]
    list_filter = ['status', 'marked_at', 'session__status']
    search_fields = [
        'student__student_id',
        'student__user__first_name',
        'student__user__last_name',
        'session__class_ref__name'
    ]
    readonly_fields = ['id', 'marked_at', 'created_at', 'updated_at']
    
    fieldsets = [
        ('Session Information', {
            'fields': ['session']
        }),
        ('Student Information', {
            'fields': ['student', 'status', 'notes']
        }),
        ('Tracking', {
            'fields': ['marked_by', 'marked_at', 'created_at', 'updated_at']
        })
    ]
    
    def status_badge(self, obj):
        colors = {
            'PRESENT': 'green',
            'ABSENT': 'red',
            'LATE': 'orange'
        }
        return format_html(
            '<span style="color: {};">● {}</span>',
            colors.get(obj.status, 'gray'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def has_delete_permission(self, request, obj=None):
        # Only superusers can delete attendance records
        if obj and obj.session.status == 'ENDED':
            return request.user.is_superuser
        return True
```

---

## Integration with Module 3 (Sessions)

### Update ClassSession Model
Add method to get attendance count:
```python
@property
def attendance_count(self):
    """Get count of marked attendance records"""
    return self.attendance_records.count()

@property
def present_count(self):
    """Get count of present students"""
    return self.attendance_records.filter(status='PRESENT').count()

@property
def attendance_rate(self):
    """Calculate attendance rate percentage"""
    total = self.class_ref.enrolled_students.count()
    if total == 0:
        return 0.0
    present = self.present_count
    return round((present / total) * 100, 2)
```

### Update ClassSessionDetailSerializer
```python
attendance_count = serializers.IntegerField(read_only=True)
present_count = serializers.IntegerField(read_only=True)
attendance_rate = serializers.FloatField(read_only=True)
```

---

## Testing Strategy

### Unit Tests (apps/attendance/tests.py)

1. **Model Tests:**
   - Test unique constraint (session + student)
   - Test validation (session must be ACTIVE)
   - Test cascade deletion
   - Test status choices

2. **API Tests:**
   - Test mark attendance (single)
   - Test mark attendance (bulk)
   - Test update attendance
   - Test view session attendance
   - Test view student history
   - Test permission enforcement
   - Test locked session (cannot mark after ENDED)

3. **Integration Tests:**
   - Test marking attendance updates session.attendance_count
   - Test attendance rate calculation
   - Test filtering and pagination

### Test Script (test_module4.sh)
```bash
#!/bin/bash
# Automated tests for Module 4: Attendance

# 1. Start a session
# 2. Mark single attendance
# 3. Mark bulk attendance
# 4. View session attendance
# 5. Update attendance record
# 6. End session
# 7. Try to mark attendance (should fail - locked)
# 8. View student attendance history
# 9. Test attendance statistics
```

---

## Performance Considerations

### Database Optimization
- Index on `(session_id, student_id)` for fast lookups
- Index on `marked_at` for chronological queries
- Use `select_related('session', 'student', 'marked_by')` in views

### Bulk Operations
- Use `bulk_create()` for marking all students at once
- Batch updates to avoid N+1 queries
- Consider pagination for large classes (100+ students)

### Caching
- Cache session status to avoid repeated DB hits
- Cache enrolled student list per session

---

## Security Considerations

1. **Authorization:** Verify teacher is assigned to session's class
2. **Data Integrity:** Validate student enrollment before marking
3. **Audit Trail:** Track who marked attendance and when
4. **Immutability:** Lock records when session ends
5. **Validation:** Prevent marking future sessions

---

## Implementation Checklist

- [ ] Create `apps/attendance/` directory
- [ ] Create Attendance model with all fields
- [ ] Add database constraints (unique, indexes)
- [ ] Create migration and apply
- [ ] Create serializers (Detail, List, Mark, Update)
- [ ] Create permission classes
- [ ] Create views with custom actions
- [ ] Configure URL routing
- [ ] Create admin interface
- [ ] Update ClassSession model with attendance methods
- [ ] Update ClassSession serializers
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Create test script
- [ ] Test all endpoints
- [ ] Document API

---

## Expected Outcomes

After implementing Module 4:

1. ✅ Teachers can mark attendance during active sessions
2. ✅ Bulk attendance marking for efficiency
3. ✅ Attendance records locked when session ends
4. ✅ Real-time attendance statistics
5. ✅ Student attendance history tracking
6. ✅ Complete audit trail (who, when)
7. ✅ Integration with session management
8. ✅ Admin interface for oversight

---

**Ready to implement!** 🚀

**Next Steps:**
1. Create attendance app
2. Implement model with validations
3. Create serializers
4. Build views with custom actions
5. Add permissions
6. Create admin interface
7. Write tests
8. Verify all functionality
