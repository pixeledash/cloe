"""
Report Serializers
Handles validation and serialization for report requests and responses
"""
from rest_framework import serializers
from apps.reports.models import Report


class ReportRequestSerializer(serializers.Serializer):
    """Serializer for report generation request"""
    
    report_type = serializers.ChoiceField(
        choices=['student', 'class'],
        required=True,
        help_text='Type of report to generate'
    )
    
    class_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text='Required for class reports'
    )
    
    student_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text='Required for student reports'
    )
    
    start_date = serializers.DateField(
        required=True,
        help_text='Report start date (inclusive)'
    )
    
    end_date = serializers.DateField(
        required=True,
        help_text='Report end date (inclusive)'
    )
    
    format = serializers.ChoiceField(
        choices=['csv', 'pdf'],
        default='csv',
        help_text='Export format (csv or pdf)'
    )
    
    def validate(self, data):
        """Validate report request"""
        report_type = data.get('report_type')
        
        # Validate student report
        if report_type == 'student':
            if not data.get('student_id'):
                raise serializers.ValidationError({
                    'student_id': 'Student ID is required for student reports'
                })
        
        # Validate class report
        if report_type == 'class':
            if not data.get('class_id'):
                raise serializers.ValidationError({
                    'class_id': 'Class ID is required for class reports'
                })
        
        # Validate date range
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError({
                'end_date': 'End date must be after or equal to start date'
            })
        
        # Validate format
        if data.get('format', 'csv') == 'pdf':
            raise serializers.ValidationError({
                'format': 'PDF format is not yet supported. Please use CSV.'
            })
        
        return data


class ReportResponseSerializer(serializers.ModelSerializer):
    """Serializer for report response"""
    
    download_url = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    generated_by_name = serializers.SerializerMethodField()
    class_id = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Report
        fields = [
            'id',
            'report_type',
            'format',
            'status',
            'class_id',
            'class_name',
            'student_id',
            'student_name',
            'start_date',
            'end_date',
            'file_size',
            'generated_by_name',
            'download_url',
            'created_at',
            'completed_at',
            'error_message'
        ]
    
    def get_class_id(self, obj):
        """Get class ID if applicable"""
        if obj.class_instance:
            return str(obj.class_instance.id)
        return None
    
    def get_student_id(self, obj):
        """Get student ID if applicable"""
        if obj.student:
            return str(obj.student.id)
        return None
    
    def get_download_url(self, obj):
        """Get download URL for the report"""
        if obj.status == 'COMPLETED' and obj.file_path:
            return f"/api/reports/{obj.id}/download/"
        return None
    
    def get_class_name(self, obj):
        """Get class name if applicable"""
        if obj.class_instance:
            return obj.class_instance.name
        return None
    
    def get_student_name(self, obj):
        """Get student name if applicable"""
        if obj.student:
            return obj.student.get_full_name()
        return None
    
    def get_generated_by_name(self, obj):
        """Get name of user who generated report"""
        return obj.generated_by.get_full_name()


class ReportListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing reports"""
    
    class_name = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Report
        fields = [
            'id',
            'report_type',
            'format',
            'status',
            'class_name',
            'student_name',
            'start_date',
            'end_date',
            'created_at'
        ]
    
    def get_class_name(self, obj):
        """Get class name if applicable"""
        if obj.class_instance:
            return obj.class_instance.name
        return None
    
    def get_student_name(self, obj):
        """Get student name if applicable"""
        if obj.student:
            return obj.student.get_full_name()
        return None
