"""
Comprehensive Reporting views for Tax Free RDC.
Provides detailed statistics, analytics, and exports for all system entities.
"""
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.db.models import Count, Sum, Avg, F, Q, Min, Max
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.utils import timezone
from datetime import timedelta
import csv
import io

from apps.accounts.permissions import IsAdminOrAuditor, PermissionService
from apps.accounts.models import User, UserRole
from apps.taxfree.models import TaxFreeForm, TaxFreeFormStatus
from apps.refunds.models import Refund, RefundStatus, RefundMethod
from apps.customs.models import CustomsValidation, PointOfExit, ValidationDecision
from apps.merchants.models import Merchant, Outlet


class ReportSummaryView(views.APIView):
    """Comprehensive summary report endpoint with detailed analytics."""
    
    permission_classes = [IsAuthenticated, IsAdminOrAuditor]

    def get(self, request):
        params = request.query_params
        days = int(params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        # Optional filters
        merchant_id = params.get('merchant_id')
        point_of_exit_id = params.get('point_of_exit_id')
        agent_id = params.get('agent_id')
        
        # Base querysets with date filter
        forms_qs = TaxFreeForm.objects.filter(created_at__gte=start_date)
        refunds_qs = Refund.objects.filter(created_at__gte=start_date)
        validations_qs = CustomsValidation.objects.filter(decided_at__gte=start_date)
        
        # Apply optional filters
        if merchant_id:
            forms_qs = forms_qs.filter(invoice__merchant_id=merchant_id)
            refunds_qs = refunds_qs.filter(form__invoice__merchant_id=merchant_id)
        if point_of_exit_id:
            validations_qs = validations_qs.filter(point_of_exit_id=point_of_exit_id)
            form_ids = validations_qs.values_list('form_id', flat=True)
            forms_qs = forms_qs.filter(id__in=form_ids)
        if agent_id:
            validations_qs = validations_qs.filter(agent_id=agent_id)
        
        # ========== FORMS STATISTICS ==========
        forms_stats = {
            'total': forms_qs.count(),
            'by_status': dict(
                forms_qs.values('status').annotate(count=Count('id')).values_list('status', 'count')
            ),
            'total_eligible': float(forms_qs.aggregate(total=Sum('eligible_amount'))['total'] or 0),
            'total_vat': float(forms_qs.aggregate(total=Sum('vat_amount'))['total'] or 0),
            'total_refund': float(forms_qs.aggregate(total=Sum('refund_amount'))['total'] or 0),
            'total_fees': float(forms_qs.aggregate(total=Sum('operator_fee'))['total'] or 0),
            'avg_amount': float(forms_qs.aggregate(avg=Avg('refund_amount'))['avg'] or 0),
            'high_risk_count': forms_qs.filter(requires_control=True).count(),
        }
        
        # ========== REFUNDS STATISTICS ==========
        paid_refunds = refunds_qs.filter(status=RefundStatus.PAID)
        refunds_stats = {
            'total': refunds_qs.count(),
            'by_status': dict(
                refunds_qs.values('status').annotate(count=Count('id')).values_list('status', 'count')
            ),
            'by_method': dict(
                refunds_qs.values('method').annotate(count=Count('id')).values_list('method', 'count')
            ),
            'total_gross': float(paid_refunds.aggregate(total=Sum('gross_amount'))['total'] or 0),
            'total_fees': float(paid_refunds.aggregate(total=Sum('operator_fee'))['total'] or 0),
            'total_net': float(paid_refunds.aggregate(total=Sum('net_amount'))['total'] or 0),
            'avg_processing_time': None,  # Could calculate if we track timestamps
        }
        
        # ========== VALIDATIONS STATISTICS ==========
        validations_stats = {
            'total': validations_qs.count(),
            'by_decision': dict(
                validations_qs.values('decision').annotate(count=Count('id')).values_list('decision', 'count')
            ),
            'validation_rate': round(
                (validations_qs.filter(decision=ValidationDecision.VALIDATED).count() / validations_qs.count() * 100)
                if validations_qs.count() > 0 else 0, 1
            ),
            'physical_control_count': validations_qs.filter(physical_control_done=True).count(),
            'offline_count': validations_qs.filter(is_offline=True).count(),
            'by_refusal_reason': dict(
                validations_qs.filter(decision=ValidationDecision.REFUSED)
                .exclude(refusal_reason='')
                .values('refusal_reason')
                .annotate(count=Count('id'))
                .values_list('refusal_reason', 'count')
            ),
        }
        
        # ========== MERCHANTS STATISTICS ==========
        merchants_stats = {
            'total': Merchant.objects.filter(is_deleted=False).count(),
            'by_status': dict(
                Merchant.objects.filter(is_deleted=False)
                .values('status')
                .annotate(count=Count('id'))
                .values_list('status', 'count')
            ),
            'total_outlets': Outlet.objects.count(),
            'active_outlets': Outlet.objects.filter(is_active=True).count(),
        }
        
        # ========== TOP MERCHANTS ==========
        top_merchants = list(
            forms_qs.values('invoice__merchant__id', 'invoice__merchant__name')
            .annotate(
                forms_count=Count('id'),
                total_vat=Sum('vat_amount'),
                total_refund=Sum('refund_amount')
            )
            .order_by('-forms_count')[:10]
        )
        
        # ========== TOP POINTS OF EXIT ==========
        top_points = list(
            validations_qs.values('point_of_exit__id', 'point_of_exit__name', 'point_of_exit__code')
            .annotate(
                validations_count=Count('id'),
                validated=Count('id', filter=Q(decision=ValidationDecision.VALIDATED)),
                refused=Count('id', filter=Q(decision=ValidationDecision.REFUSED))
            )
            .order_by('-validations_count')[:10]
        )
        
        # ========== TOP AGENTS ==========
        top_agents = list(
            validations_qs.values('agent__id', 'agent__email', 'agent__first_name', 'agent__last_name')
            .annotate(
                validations_count=Count('id'),
                validated=Count('id', filter=Q(decision=ValidationDecision.VALIDATED)),
                refused=Count('id', filter=Q(decision=ValidationDecision.REFUSED))
            )
            .order_by('-validations_count')[:10]
        )
        
        # ========== DAILY TRENDS ==========
        daily_forms = list(
            forms_qs.annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(
                count=Count('id'),
                vat_amount=Sum('vat_amount'),
                refund_amount=Sum('refund_amount')
            )
            .order_by('date')
        )
        
        daily_validations = list(
            validations_qs.annotate(date=TruncDate('decided_at'))
            .values('date')
            .annotate(
                count=Count('id'),
                validated=Count('id', filter=Q(decision=ValidationDecision.VALIDATED)),
                refused=Count('id', filter=Q(decision=ValidationDecision.REFUSED))
            )
            .order_by('date')
        )
        
        daily_refunds = list(
            paid_refunds.annotate(date=TruncDate('paid_at'))
            .values('date')
            .annotate(
                count=Count('id'),
                amount=Sum('net_amount')
            )
            .order_by('date')
        )
        
        # ========== USERS STATISTICS ==========
        users_stats = {
            'total': User.objects.filter(is_active=True).count(),
            'by_role': dict(
                User.objects.filter(is_active=True)
                .values('role')
                .annotate(count=Count('id'))
                .values_list('role', 'count')
            ),
            'customs_agents': User.objects.filter(role=UserRole.CUSTOMS_AGENT, is_active=True).count(),
            'merchants': User.objects.filter(role=UserRole.MERCHANT, is_active=True).count(),
        }
        
        return Response({
            'period_days': days,
            'generated_at': timezone.now().isoformat(),
            'filters': {
                'merchant_id': merchant_id,
                'point_of_exit_id': point_of_exit_id,
                'agent_id': agent_id,
            },
            'forms': forms_stats,
            'refunds': refunds_stats,
            'validations': validations_stats,
            'merchants': merchants_stats,
            'users': users_stats,
            'top_merchants': top_merchants,
            'top_points_of_exit': top_points,
            'top_agents': top_agents,
            'trends': {
                'daily_forms': daily_forms,
                'daily_validations': daily_validations,
                'daily_refunds': daily_refunds,
            },
        })


class ReportExportView(views.APIView):
    """Export report as CSV."""
    
    permission_classes = [IsAuthenticated, IsAdminOrAuditor]

    def get(self, request):
        report_type = request.query_params.get('type', 'forms')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Check granular permission for EXPORT action based on report type
        if request.user.role in ['ADMIN', 'AUDITOR'] and not getattr(request.user, 'is_super_admin', False):
            # Map report type to module
            module_map = {
                'forms': 'FORMS',
                'refunds': 'REFUNDS',
                'validations': 'FORMS',  # Validations are part of forms module
            }
            required_module = module_map.get(report_type, 'REPORTS')
            
            if not PermissionService.has_module_permission(request.user, required_module, 'EXPORT'):
                return Response(
                    {'error': f'Vous n\'avez pas la permission d\'exporter les {report_type}.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{report_type}_export.csv"'
        
        writer = csv.writer(response)
        
        if report_type == 'forms':
            self._export_forms(writer, start_date, end_date)
        elif report_type == 'refunds':
            self._export_refunds(writer, start_date, end_date)
        elif report_type == 'validations':
            self._export_validations(writer, start_date, end_date)
        
        return response

    def _export_forms(self, writer, start_date, end_date):
        writer.writerow([
            'Form Number', 'Status', 'Merchant', 'Traveler',
            'Currency', 'Eligible Amount', 'VAT Amount', 'Refund Amount',
            'Created At', 'Validated At', 'Expires At'
        ])
        
        queryset = TaxFreeForm.objects.select_related('invoice__merchant', 'traveler')
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        
        for form in queryset:
            writer.writerow([
                form.form_number,
                form.status,
                form.invoice.merchant.name,
                form.traveler.full_name,
                form.currency,
                form.eligible_amount,
                form.vat_amount,
                form.refund_amount,
                form.created_at,
                form.validated_at,
                form.expires_at,
            ])

    def _export_refunds(self, writer, start_date, end_date):
        writer.writerow([
            'Form Number', 'Status', 'Method', 'Currency',
            'Gross Amount', 'Fee', 'Net Amount',
            'Created At', 'Paid At'
        ])
        
        queryset = Refund.objects.select_related('form')
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        
        for refund in queryset:
            writer.writerow([
                refund.form.form_number,
                refund.status,
                refund.method,
                refund.currency,
                refund.gross_amount,
                refund.operator_fee,
                refund.net_amount,
                refund.created_at,
                refund.paid_at,
            ])

    def _export_validations(self, writer, start_date, end_date):
        writer.writerow([
            'Form Number', 'Decision', 'Agent', 'Point of Exit',
            'Refusal Reason', 'Physical Control', 'Offline',
            'Decided At'
        ])
        
        queryset = CustomsValidation.objects.select_related('form', 'agent', 'point_of_exit')
        if start_date:
            queryset = queryset.filter(decided_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(decided_at__date__lte=end_date)
        
        for val in queryset:
            writer.writerow([
                val.form.form_number,
                val.decision,
                val.agent.email,
                val.point_of_exit.name,
                val.refusal_reason,
                val.physical_control_done,
                val.is_offline,
                val.decided_at,
            ])
