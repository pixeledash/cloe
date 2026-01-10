"""
URL configuration for Attendance app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttendanceViewSet

router = DefaultRouter()
router.register(r'attendance', AttendanceViewSet, basename='attendance')

urlpatterns = router.urls
