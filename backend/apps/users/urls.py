from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LoginView,
    CurrentUserView,
    MFASetupView,
    MFAVerifyView,
    MFADisableView,
    RoleViewSet,
    UserListView,
    UpdateUserRolesView,
)

router = DefaultRouter()
router.register(r'roles', RoleViewSet)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('mfa/setup/', MFASetupView.as_view(), name='mfa-setup'),
    path('mfa/verify/', MFAVerifyView.as_view(), name='mfa-verify'),
    path('mfa/disable/', MFADisableView.as_view(), name='mfa-disable'),
    path('list/', UserListView.as_view(), name='user-list'),
    path('<uuid:user_id>/update-roles/', UpdateUserRolesView.as_view(), name='update-user-roles'),
    path('', include(router.urls)),
]
