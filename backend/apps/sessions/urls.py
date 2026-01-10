"""
URL routing for sessions app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClassSessionViewSet

router = DefaultRouter()
router.register(r'sessions', ClassSessionViewSet, basename='session')

urlpatterns = [
    path('', include(router.urls)),
]
