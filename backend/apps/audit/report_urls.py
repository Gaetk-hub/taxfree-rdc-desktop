"""
URL configuration for reports.
"""
from django.urls import path
from .report_views import ReportSummaryView, ReportExportView

urlpatterns = [
    path('summary/', ReportSummaryView.as_view(), name='report-summary'),
    path('export/', ReportExportView.as_view(), name='report-export'),
]
