"""
Views for Customs Reports API.
Provides endpoints for dashboard stats, data lists, and Excel exports.
All data is strictly filtered by the agent's ID - each agent sees only their own data.
"""
from datetime import datetime
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.utils import timezone

from apps.accounts.permissions import IsCustomsAgent, IsCustomsAgentOnly
from services.reports_service import CustomsReportsService


class ReportsBaseView(views.APIView):
    """Base view for reports with common functionality."""
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]
    
    def get_report_service(self, request) -> CustomsReportsService:
        """
        Get the reports service initialized with the agent's ID.
        Each agent only sees their own data.
        """
        user = request.user
        if not user.point_of_exit_id:
            raise ValueError("Agent has no assigned point of exit")
        
        return CustomsReportsService(
            agent_id=str(user.id),
            point_of_exit_id=str(user.point_of_exit_id),
            agent_name=user.full_name
        )
    
    def parse_date_params(self, request) -> tuple:
        """Parse date_from and date_to from query parameters."""
        date_from = None
        date_to = None
        
        date_from_str = request.query_params.get('date_from')
        date_to_str = request.query_params.get('date_to')
        
        if date_from_str:
            try:
                date_from = datetime.strptime(date_from_str, '%Y-%m-%d')
                date_from = timezone.make_aware(date_from)
            except ValueError:
                pass
        
        if date_to_str:
            try:
                date_to = datetime.strptime(date_to_str, '%Y-%m-%d')
                # Set to end of day
                date_to = date_to.replace(hour=23, minute=59, second=59)
                date_to = timezone.make_aware(date_to)
            except ValueError:
                pass
        
        return date_from, date_to


class ReportsDashboardView(ReportsBaseView):
    """Get dashboard statistics for the agent's point of exit."""
    
    def get(self, request):
        try:
            service = self.get_report_service(request)
            date_from, date_to = self.parse_date_params(request)
            
            stats = service.get_dashboard_stats(date_from, date_to)
            
            # Add point of exit info
            point_of_exit = request.user.point_of_exit
            stats['point_of_exit'] = {
                'id': str(point_of_exit.id),
                'code': point_of_exit.code,
                'name': point_of_exit.name,
                'type': point_of_exit.type,
            }
            
            return Response(stats)
        
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ReportsDailyStatsView(ReportsBaseView):
    """Get daily breakdown of validations."""
    
    def get(self, request):
        try:
            service = self.get_report_service(request)
            date_from, date_to = self.parse_date_params(request)
            
            daily_stats = service.get_daily_stats(date_from, date_to)
            
            return Response({
                'count': len(daily_stats),
                'results': daily_stats
            })
        
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ReportsAgentSummaryView(ReportsBaseView):
    """Get summary statistics for the current agent."""
    
    def get(self, request):
        try:
            service = self.get_report_service(request)
            date_from, date_to = self.parse_date_params(request)
            
            agent_summary = service.get_agent_summary(date_from, date_to)
            
            return Response(agent_summary)
        
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ReportsValidationsListView(ReportsBaseView):
    """Get detailed list of validations."""
    
    def get(self, request):
        try:
            service = self.get_report_service(request)
            date_from, date_to = self.parse_date_params(request)
            decision = request.query_params.get('decision')
            
            validations = service.get_validations_list(date_from, date_to, decision)
            
            return Response({
                'count': len(validations),
                'results': validations
            })
        
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ReportsRefundsListView(ReportsBaseView):
    """Get detailed list of refunds."""
    
    def get(self, request):
        try:
            service = self.get_report_service(request)
            date_from, date_to = self.parse_date_params(request)
            refund_status = request.query_params.get('status')
            
            refunds = service.get_refunds_list(date_from, date_to, refund_status)
            
            return Response({
                'count': len(refunds),
                'results': refunds
            })
        
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ReportsExportValidationsView(ReportsBaseView):
    """Export validations to Excel."""
    
    def get(self, request):
        try:
            service = self.get_report_service(request)
            date_from, date_to = self.parse_date_params(request)
            decision = request.query_params.get('decision')
            
            excel_file = service.generate_validations_excel(date_from, date_to, decision)
            
            # Generate filename
            point_of_exit = request.user.point_of_exit
            date_str = timezone.now().strftime('%Y%m%d_%H%M')
            filename = f"validations_{point_of_exit.code}_{date_str}.xlsx"
            
            response = HttpResponse(
                excel_file.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
        
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ReportsExportRefundsView(ReportsBaseView):
    """Export refunds to Excel."""
    
    def get(self, request):
        try:
            service = self.get_report_service(request)
            date_from, date_to = self.parse_date_params(request)
            refund_status = request.query_params.get('status')
            
            excel_file = service.generate_refunds_excel(date_from, date_to, refund_status)
            
            # Generate filename
            point_of_exit = request.user.point_of_exit
            date_str = timezone.now().strftime('%Y%m%d_%H%M')
            filename = f"remboursements_{point_of_exit.code}_{date_str}.xlsx"
            
            response = HttpResponse(
                excel_file.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
        
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ReportsExportSummaryView(ReportsBaseView):
    """Export comprehensive summary report to Excel."""
    
    def get(self, request):
        try:
            service = self.get_report_service(request)
            date_from, date_to = self.parse_date_params(request)
            
            excel_file = service.generate_summary_excel(date_from, date_to)
            
            # Generate filename
            point_of_exit = request.user.point_of_exit
            date_str = timezone.now().strftime('%Y%m%d_%H%M')
            filename = f"rapport_synthese_{point_of_exit.code}_{date_str}.xlsx"
            
            response = HttpResponse(
                excel_file.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
        
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ReportsAvailableView(ReportsBaseView):
    """Get list of available reports for the agent."""
    
    def get(self, request):
        try:
            point_of_exit = request.user.point_of_exit
            if not point_of_exit:
                return Response(
                    {'error': 'Agent has no assigned point of exit'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            reports = [
                {
                    'id': 'summary',
                    'name': 'Rapport de Synthèse',
                    'description': 'Vue d\'ensemble avec statistiques, tendances journalières et performance des agents',
                    'icon': 'chart-bar',
                    'export_url': '/customs/reports/export/summary/',
                },
                {
                    'id': 'validations',
                    'name': 'Rapport des Validations',
                    'description': 'Liste détaillée de toutes les validations (bordereaux validés et refusés)',
                    'icon': 'clipboard-check',
                    'export_url': '/customs/reports/export/validations/',
                },
                {
                    'id': 'refunds',
                    'name': 'Rapport des Remboursements',
                    'description': 'Liste détaillée de tous les remboursements effectués',
                    'icon': 'banknotes',
                    'export_url': '/customs/reports/export/refunds/',
                },
            ]
            
            return Response({
                'point_of_exit': {
                    'id': str(point_of_exit.id),
                    'code': point_of_exit.code,
                    'name': point_of_exit.name,
                },
                'reports': reports
            })
        
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
