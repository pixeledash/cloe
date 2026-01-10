from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubjectViewSet,
    TeacherViewSet,
    ClassViewSet,
    StudentViewSet,
    ClassStudentViewSet
)

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'teachers', TeacherViewSet, basename='teacher')
router.register(r'classes', ClassViewSet, basename='class')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'enrollments', ClassStudentViewSet, basename='enrollment')

urlpatterns = [
    path('', include(router.urls)),
]
