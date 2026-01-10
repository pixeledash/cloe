from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include('apps.users.urls')),
    path('api/', include('apps.classes.urls')),
    path('api/', include('apps.sessions.urls')),
    path('api/', include('apps.attendance.urls')),
]
