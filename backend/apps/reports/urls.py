"""
Report URL Configuration
"""
from django.urls import path
from apps.reports.views import (
    GenerateReportView,
    DownloadReportView,
    ListReportsView
)

urlpatterns = [
    path('generate/', GenerateReportView.as_view(), name='generate-report'),
    path('<uuid:report_id>/download/', DownloadReportView.as_view(), name='download-report'),
    path('', ListReportsView.as_view(), name='list-reports'),
]
