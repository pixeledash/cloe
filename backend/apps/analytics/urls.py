"""
Analytics URL Configuration
"""
from django.urls import path
from .views import (
    StudentAnalyticsView,
    StudentQuickStatsView,
    ClassAnalyticsView,
    ClassQuickStatsView
)

app_name = 'analytics'

urlpatterns = [
    # Student analytics endpoints
    path('student/<uuid:student_id>/', StudentAnalyticsView.as_view(), name='student-analytics'),
    path('student/<uuid:student_id>/quick/', StudentQuickStatsView.as_view(), name='student-quick-stats'),
    
    # Class analytics endpoints
    path('class/<uuid:class_id>/', ClassAnalyticsView.as_view(), name='class-analytics'),
    path('class/<uuid:class_id>/quick/', ClassQuickStatsView.as_view(), name='class-quick-stats'),
]
