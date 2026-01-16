"""
URL configuration for customs app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PointOfExitViewSet, CustomsValidationViewSet,
    ScanView, DecideView, OfflineSyncView,
    SearchFormsView, GetFormByNumberView,
    # Admin views for agents management
    AdminCustomsAgentsView, AdminCustomsAgentDetailView,
    AdminAgentInvitationsView, AdminAgentInvitationDetailView,
    AdminResendInvitationView, ActivateAgentAccountView,
    AdminBorderStatsView,
    # Agent dashboard views
    AgentDashboardView, AgentPendingFormsView, AgentValidationHistoryView,
    # Agent shift views
    AgentShiftView, StartShiftView, EndShiftView, PauseShiftView, ResumeShiftView
)
from .reports_views import (
    ReportsAvailableView, ReportsDashboardView, ReportsDailyStatsView,
    ReportsAgentSummaryView, ReportsValidationsListView, ReportsRefundsListView,
    ReportsExportValidationsView, ReportsExportRefundsView, ReportsExportSummaryView
)

router = DefaultRouter()
router.register('points-of-exit', PointOfExitViewSet, basename='point-of-exit')
router.register('validations', CustomsValidationViewSet, basename='validation')

urlpatterns = [
    # Agent operations
    path('scan/', ScanView.as_view(), name='customs-scan'),
    path('search/', SearchFormsView.as_view(), name='customs-search'),
    path('lookup/<str:form_number>/', GetFormByNumberView.as_view(), name='customs-lookup'),
    path('forms/<uuid:form_id>/decide/', DecideView.as_view(), name='customs-decide'),
    path('offline/sync/', OfflineSyncView.as_view(), name='offline-sync'),
    
    # Admin - Agents management
    path('admin/agents/', AdminCustomsAgentsView.as_view(), name='admin-customs-agents'),
    path('admin/agents/<uuid:agent_id>/', AdminCustomsAgentDetailView.as_view(), name='admin-customs-agent-detail'),
    
    # Admin - Invitations management
    path('admin/invitations/', AdminAgentInvitationsView.as_view(), name='admin-agent-invitations'),
    path('admin/invitations/<uuid:invitation_id>/', AdminAgentInvitationDetailView.as_view(), name='admin-agent-invitation-detail'),
    path('admin/invitations/<uuid:invitation_id>/resend/', AdminResendInvitationView.as_view(), name='admin-resend-invitation'),
    
    # Admin - Border stats
    path('admin/borders/stats/', AdminBorderStatsView.as_view(), name='admin-border-stats'),
    
    # Public - Agent activation
    path('activate/<str:token>/', ActivateAgentAccountView.as_view(), name='activate-agent'),
    
    # Agent dashboard APIs
    path('agent/dashboard/', AgentDashboardView.as_view(), name='agent-dashboard'),
    path('agent/pending-forms/', AgentPendingFormsView.as_view(), name='agent-pending-forms'),
    path('agent/history/', AgentValidationHistoryView.as_view(), name='agent-validation-history'),
    
    # Agent shift (service) APIs
    path('agent/shift/', AgentShiftView.as_view(), name='agent-shift'),
    path('agent/shift/start/', StartShiftView.as_view(), name='agent-shift-start'),
    path('agent/shift/end/', EndShiftView.as_view(), name='agent-shift-end'),
    path('agent/shift/pause/', PauseShiftView.as_view(), name='agent-shift-pause'),
    path('agent/shift/resume/', ResumeShiftView.as_view(), name='agent-shift-resume'),
    
    # Agent reports APIs
    path('reports/', ReportsAvailableView.as_view(), name='reports-available'),
    path('reports/dashboard/', ReportsDashboardView.as_view(), name='reports-dashboard'),
    path('reports/daily/', ReportsDailyStatsView.as_view(), name='reports-daily'),
    path('reports/agent-summary/', ReportsAgentSummaryView.as_view(), name='reports-agent-summary'),
    path('reports/validations/', ReportsValidationsListView.as_view(), name='reports-validations'),
    path('reports/refunds/', ReportsRefundsListView.as_view(), name='reports-refunds'),
    path('reports/export/validations/', ReportsExportValidationsView.as_view(), name='reports-export-validations'),
    path('reports/export/refunds/', ReportsExportRefundsView.as_view(), name='reports-export-refunds'),
    path('reports/export/summary/', ReportsExportSummaryView.as_view(), name='reports-export-summary'),
    
    path('', include(router.urls)),
]
