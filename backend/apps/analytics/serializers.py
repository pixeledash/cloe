"""
Analytics Serializers

Serializers for analytics API responses.
Read-only serializers focused on data presentation.
"""
from rest_framework import serializers


class StudentAnalyticsSerializer(serializers.Serializer):
    """Serializer for comprehensive student analytics"""
    total_sessions = serializers.IntegerField()
    present_count = serializers.IntegerField()
    absent_count = serializers.IntegerField()
    late_count = serializers.IntegerField()
    attendance_rate = serializers.FloatField()
    punctuality_rate = serializers.FloatField()
    absence_rate = serializers.FloatField()
    late_rate = serializers.FloatField()
    classes_enrolled = serializers.ListField(child=serializers.DictField())
    recent_trend = serializers.CharField()
    consecutive_absences = serializers.IntegerField()
    risk_level = serializers.CharField()


class ClassEnrollmentStatsSerializer(serializers.Serializer):
    """Serializer for class enrollment statistics within student analytics"""
    class_id = serializers.CharField()
    class_name = serializers.CharField()
    subject = serializers.CharField()
    teacher = serializers.CharField()
    sessions_in_class = serializers.IntegerField()
    attendance_rate = serializers.FloatField()


class SessionStatsSerializer(serializers.Serializer):
    """Serializer for individual session statistics"""
    session_id = serializers.CharField()
    date = serializers.DateField()
    total_marked = serializers.IntegerField()
    present = serializers.IntegerField()
    absent = serializers.IntegerField()
    late = serializers.IntegerField()
    attendance_rate = serializers.FloatField()
    status = serializers.CharField()


class StudentStatsInClassSerializer(serializers.Serializer):
    """Serializer for student statistics within a class"""
    student_id = serializers.CharField()
    student_name = serializers.CharField()
    student_email = serializers.EmailField()
    sessions_attended = serializers.IntegerField()
    present = serializers.IntegerField()
    absent = serializers.IntegerField()
    late = serializers.IntegerField()
    attendance_rate = serializers.FloatField()


class ClassTrendsSerializer(serializers.Serializer):
    """Serializer for class attendance trends"""
    trend_direction = serializers.CharField()
    recent_average = serializers.FloatField()
    previous_average = serializers.FloatField()
    change = serializers.FloatField(required=False)


class StudentPatternSerializer(serializers.Serializer):
    """Serializer for student attendance patterns"""
    student_id = serializers.CharField()
    student_name = serializers.CharField()
    attendance_rate = serializers.FloatField()
    total_sessions = serializers.IntegerField()
    absences = serializers.IntegerField()


class ClassPatternsSerializer(serializers.Serializer):
    """Serializer for class attendance patterns"""
    chronic_absentees = serializers.ListField(child=StudentPatternSerializer())
    perfect_attendance = serializers.ListField(child=StudentPatternSerializer())
    at_risk_students = serializers.ListField(child=StudentPatternSerializer())


class ClassInfoSerializer(serializers.Serializer):
    """Serializer for class basic information"""
    class_id = serializers.CharField()
    class_name = serializers.CharField()
    subject = serializers.CharField()
    teacher = serializers.CharField()
    schedule = serializers.CharField()


class ClassAnalyticsSerializer(serializers.Serializer):
    """Serializer for comprehensive class analytics"""
    class_info = ClassInfoSerializer()
    total_students = serializers.IntegerField()
    total_sessions = serializers.IntegerField()
    overall_attendance_rate = serializers.FloatField()
    session_statistics = serializers.ListField(child=serializers.DictField())
    student_statistics = serializers.ListField(child=serializers.DictField())
    trends = serializers.DictField()
    patterns = serializers.DictField()


class QuickStatsSerializer(serializers.Serializer):
    """Serializer for quick attendance statistics"""
    total_sessions = serializers.IntegerField()
    attendance_rate = serializers.FloatField()
    present_count = serializers.IntegerField()
    absent_count = serializers.IntegerField()
    late_count = serializers.IntegerField()
