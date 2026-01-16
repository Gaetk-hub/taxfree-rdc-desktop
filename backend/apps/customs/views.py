"""
Views for customs app.
"""
from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction

from apps.accounts.permissions import IsAdmin, IsCustomsAgent, IsCustomsAgentOnly, IsAdminOrAuditor
from apps.audit.services import AuditService
from apps.taxfree.models import TaxFreeForm, TaxFreeFormStatus
from apps.taxfree.serializers import TaxFreeFormSerializer
from .models import PointOfExit, CustomsValidation, OfflineSyncBatch, ValidationDecision, AgentShift, ShiftStatus
from .serializers import (
    PointOfExitSerializer, CustomsValidationSerializer,
    ScanQRSerializer, ScanResultSerializer, DecisionSerializer,
    OfflineSyncSerializer, OfflineSyncResultSerializer
)


class PointOfExitViewSet(viewsets.ModelViewSet):
    """ViewSet for points of exit."""
    
    queryset = PointOfExit.objects.all()
    serializer_class = PointOfExitSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination - handled by frontend
    filterset_fields = ['type', 'is_active', 'city']
    search_fields = ['code', 'name', 'city']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()


class CustomsValidationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for customs validations (read-only)."""
    
    queryset = CustomsValidation.objects.all()
    serializer_class = CustomsValidationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['decision', 'point_of_exit', 'agent', 'is_offline']
    search_fields = ['form__form_number']
    ordering_fields = ['decided_at', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_customs_agent() or user.is_operator():
            # Agents and operators see validations at their assigned point of exit
            if user.point_of_exit_id:
                queryset = queryset.filter(point_of_exit_id=user.point_of_exit_id)
            else:
                # If no point of exit assigned, only see their own validations
                queryset = queryset.filter(agent=user)
        elif not user.is_admin() and not user.is_auditor():
            queryset = queryset.none()
        
        return queryset


class ScanView(views.APIView):
    """Scan QR code and get form info with comprehensive automated checks."""
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]

    def post(self, request):
        serializer = ScanQRSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        form = serializer.validated_data['qr_string']['form']
        
        # Perform comprehensive automated checks
        checks = self._perform_automated_checks(form, request.user)
        
        # Log the consultation
        AuditService.log(
            actor=request.user,
            action='SCAN_FORM',
            entity='TaxFreeForm',
            entity_id=str(form.id),
            metadata={
                'form_number': form.form_number,
                'scan_method': 'QR_CODE',
                'point_of_exit': request.user.point_of_exit.code if request.user.point_of_exit else None
            }
        )
        
        result = {
            'form': self._get_enriched_form_data(form),
            'checks': checks,
            'can_validate': checks['overall_status'] != 'BLOCKED',
            'overall_status': checks['overall_status'],
            'overall_message': checks['overall_message'],
        }
        
        return Response(result)
    
    def _perform_automated_checks(self, form, agent):
        """Perform all automated checks and return structured results."""
        checks = {
            'items': [],
            'blocking_count': 0,
            'warning_count': 0,
            'ok_count': 0,
            'overall_status': 'OK',  # OK, WARNING, BLOCKED, CONTROL_REQUIRED
            'overall_message': ''
        }
        
        # 1. Check if already validated/refused
        if hasattr(form, 'customs_validation'):
            validation = form.customs_validation
            checks['items'].append({
                'code': 'ALREADY_PROCESSED',
                'label': 'Statut de validation',
                'status': 'BLOCKED',
                'message': f"Déjà {validation.get_decision_display()} le {validation.decided_at.strftime('%d/%m/%Y à %H:%M')} par {validation.agent.full_name}",
                'details': {
                    'decision': validation.decision,
                    'decided_at': validation.decided_at.isoformat(),
                    'agent_name': validation.agent.full_name,
                    'point_of_exit': validation.point_of_exit.name if validation.point_of_exit else None
                }
            })
            checks['blocking_count'] += 1
        else:
            checks['items'].append({
                'code': 'NOT_PROCESSED',
                'label': 'Statut de validation',
                'status': 'OK',
                'message': 'Non encore validé - En attente de décision'
            })
            checks['ok_count'] += 1
        
        # 2. Check form status
        valid_statuses = [TaxFreeFormStatus.ISSUED, TaxFreeFormStatus.VALIDATION_PENDING]
        if form.status == TaxFreeFormStatus.CANCELLED:
            checks['items'].append({
                'code': 'CANCELLED',
                'label': 'Statut du bordereau',
                'status': 'BLOCKED',
                'message': f"Annulé le {form.cancelled_at.strftime('%d/%m/%Y') if form.cancelled_at else 'N/A'}",
                'details': {
                    'cancelled_at': form.cancelled_at.isoformat() if form.cancelled_at else None,
                    'reason': form.cancellation_reason
                }
            })
            checks['blocking_count'] += 1
        elif form.status not in valid_statuses:
            checks['items'].append({
                'code': 'INVALID_STATUS',
                'label': 'Statut du bordereau',
                'status': 'BLOCKED',
                'message': f"Statut invalide: {form.get_status_display()}"
            })
            checks['blocking_count'] += 1
        else:
            checks['items'].append({
                'code': 'VALID_STATUS',
                'label': 'Statut du bordereau',
                'status': 'OK',
                'message': f"Statut valide: {form.get_status_display()}"
            })
            checks['ok_count'] += 1
        
        # 3. Check expiry date
        now = timezone.now()
        if form.expires_at:
            days_until_expiry = (form.expires_at - now).days
            if form.expires_at < now:
                checks['items'].append({
                    'code': 'EXPIRED',
                    'label': 'Date de validité',
                    'status': 'BLOCKED',
                    'message': f"Expiré depuis le {form.expires_at.strftime('%d/%m/%Y')}",
                    'details': {'expires_at': form.expires_at.isoformat(), 'days_expired': abs(days_until_expiry)}
                })
                checks['blocking_count'] += 1
            elif days_until_expiry <= 3:
                checks['items'].append({
                    'code': 'EXPIRING_SOON',
                    'label': 'Date de validité',
                    'status': 'WARNING',
                    'message': f"Expire dans {days_until_expiry} jour(s) - le {form.expires_at.strftime('%d/%m/%Y')}",
                    'details': {'expires_at': form.expires_at.isoformat(), 'days_remaining': days_until_expiry}
                })
                checks['warning_count'] += 1
            else:
                checks['items'].append({
                    'code': 'VALID_DATE',
                    'label': 'Date de validité',
                    'status': 'OK',
                    'message': f"Valide jusqu'au {form.expires_at.strftime('%d/%m/%Y')} ({days_until_expiry} jours)"
                })
                checks['ok_count'] += 1
        
        # 4. Check purchase date (must be within allowed period - typically 90 days)
        if form.invoice and form.invoice.invoice_date:
            purchase_date = form.invoice.invoice_date
            days_since_purchase = (now.date() - purchase_date).days
            max_days = 90  # Could be configurable
            
            if days_since_purchase > max_days:
                checks['items'].append({
                    'code': 'PURCHASE_TOO_OLD',
                    'label': 'Date d\'achat',
                    'status': 'WARNING',
                    'message': f"Achat effectué il y a {days_since_purchase} jours (limite: {max_days} jours)",
                    'details': {'purchase_date': purchase_date.isoformat(), 'days_since': days_since_purchase}
                })
                checks['warning_count'] += 1
            else:
                checks['items'].append({
                    'code': 'PURCHASE_DATE_OK',
                    'label': 'Date d\'achat',
                    'status': 'OK',
                    'message': f"Achat du {purchase_date.strftime('%d/%m/%Y')} ({days_since_purchase} jours)"
                })
                checks['ok_count'] += 1
        
        # 5. Check amounts consistency
        if form.invoice:
            invoice_total = float(form.invoice.total_amount)
            eligible = float(form.eligible_amount)
            vat = float(form.vat_amount)
            refund = float(form.refund_amount)
            
            # Check if VAT is reasonable (typically 16% in DRC)
            expected_vat_rate = 0.16
            expected_vat = eligible * expected_vat_rate
            vat_diff_percent = abs(vat - expected_vat) / expected_vat * 100 if expected_vat > 0 else 0
            
            if vat_diff_percent > 20:  # More than 20% difference
                checks['items'].append({
                    'code': 'VAT_INCONSISTENT',
                    'label': 'Cohérence des montants',
                    'status': 'WARNING',
                    'message': f"TVA inhabituelle: {vat:,.0f} CDF (attendu ~{expected_vat:,.0f} CDF)",
                    'details': {'vat_amount': vat, 'expected_vat': expected_vat, 'diff_percent': vat_diff_percent}
                })
                checks['warning_count'] += 1
            else:
                checks['items'].append({
                    'code': 'AMOUNTS_OK',
                    'label': 'Cohérence des montants',
                    'status': 'OK',
                    'message': f"Montants cohérents - TVA: {vat:,.0f} CDF"
                })
                checks['ok_count'] += 1
        
        # 6. Check risk score
        if form.risk_score >= 70:
            checks['items'].append({
                'code': 'HIGH_RISK',
                'label': 'Niveau de risque',
                'status': 'CONTROL_REQUIRED',
                'message': f"Risque élevé ({form.risk_score}/100) - Contrôle physique obligatoire",
                'details': {'risk_score': form.risk_score, 'risk_flags': form.risk_flags}
            })
            checks['warning_count'] += 1
        elif form.risk_score >= 40:
            checks['items'].append({
                'code': 'MEDIUM_RISK',
                'label': 'Niveau de risque',
                'status': 'WARNING',
                'message': f"Risque modéré ({form.risk_score}/100) - Contrôle recommandé",
                'details': {'risk_score': form.risk_score, 'risk_flags': form.risk_flags}
            })
            checks['warning_count'] += 1
        else:
            checks['items'].append({
                'code': 'LOW_RISK',
                'label': 'Niveau de risque',
                'status': 'OK',
                'message': f"Risque faible ({form.risk_score}/100)"
            })
            checks['ok_count'] += 1
        
        # 7. Check if physical control is required
        if form.requires_control:
            checks['items'].append({
                'code': 'CONTROL_REQUIRED',
                'label': 'Contrôle physique',
                'status': 'CONTROL_REQUIRED',
                'message': 'Vérification des marchandises obligatoire avant validation'
            })
            checks['warning_count'] += 1
        
        # Determine overall status
        if checks['blocking_count'] > 0:
            checks['overall_status'] = 'BLOCKED'
            checks['overall_message'] = f"{checks['blocking_count']} problème(s) bloquant(s) - Validation impossible"
        elif any(item['status'] == 'CONTROL_REQUIRED' for item in checks['items']):
            checks['overall_status'] = 'CONTROL_REQUIRED'
            checks['overall_message'] = 'Contrôle physique requis avant validation'
        elif checks['warning_count'] > 0:
            checks['overall_status'] = 'WARNING'
            checks['overall_message'] = f"{checks['warning_count']} avertissement(s) - Validation possible avec attention"
        else:
            checks['overall_status'] = 'OK'
            checks['overall_message'] = 'Tous les contrôles sont passés - OK pour validation'
        
        return checks
    
    def _get_enriched_form_data(self, form):
        """Get enriched form data with all necessary details."""
        from apps.taxfree.serializers import TaxFreeFormDetailSerializer
        
        data = TaxFreeFormDetailSerializer(form).data
        
        # Add extra computed fields
        data['days_until_expiry'] = (form.expires_at - timezone.now()).days if form.expires_at else None
        data['is_expired'] = form.expires_at < timezone.now() if form.expires_at else False
        
        # Add validation info if exists
        if hasattr(form, 'customs_validation'):
            val = form.customs_validation
            data['validation'] = {
                'id': str(val.id),
                'decision': val.decision,
                'decision_display': val.get_decision_display(),
                'agent_name': val.agent.full_name,
                'point_of_exit_name': val.point_of_exit.name if val.point_of_exit else None,
                'decided_at': val.decided_at.isoformat() if val.decided_at else None,
                'refusal_reason': val.refusal_reason,
                'refusal_details': val.refusal_details
            }
        else:
            data['validation'] = None
        
        return data


class SearchFormsView(views.APIView):
    """Search for tax free forms manually (when QR scan doesn't work)."""
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]

    def get(self, request):
        from django.db.models import Q
        
        # Get search parameters
        # Universal search query (searches across all fields with OR)
        query = request.query_params.get('q', '').strip()
        
        # Individual field filters (for advanced search)
        form_number = request.query_params.get('form_number', '').strip()
        traveler_passport = request.query_params.get('passport', '').strip()
        traveler_name = request.query_params.get('traveler_name', '').strip()
        merchant_name = request.query_params.get('merchant', '').strip()
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        status = request.query_params.get('status')
        
        # Start with forms that can potentially be validated
        queryset = TaxFreeForm.objects.select_related(
            'traveler', 'invoice__merchant', 'created_by'
        ).prefetch_related('customs_validation')
        
        # Universal search (OR across all fields)
        if query:
            queryset = queryset.filter(
                Q(form_number__icontains=query) |
                Q(traveler__passport_number_last4__icontains=query) |
                Q(traveler__passport_number__icontains=query) |
                Q(traveler__first_name__icontains=query) |
                Q(traveler__last_name__icontains=query) |
                Q(invoice__merchant__name__icontains=query)
            )
        else:
            # Apply individual filters (AND logic for advanced search)
            if form_number:
                queryset = queryset.filter(form_number__icontains=form_number)
            
            if traveler_passport:
                queryset = queryset.filter(
                    Q(traveler__passport_number_last4__icontains=traveler_passport) |
                    Q(traveler__passport_number__icontains=traveler_passport)
                )
            
            if traveler_name:
                queryset = queryset.filter(
                    Q(traveler__first_name__icontains=traveler_name) |
                    Q(traveler__last_name__icontains=traveler_name)
                )
            
            if merchant_name:
                queryset = queryset.filter(invoice__merchant__name__icontains=merchant_name)
        
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        
        if status:
            queryset = queryset.filter(status=status)
        
        # Order by most recent first
        queryset = queryset.order_by('-created_at')[:50]  # Limit results
        
        # Log the search
        AuditService.log(
            actor=request.user,
            action='SEARCH_FORMS',
            entity='TaxFreeForm',
            metadata={
                'search_params': {
                    'form_number': form_number,
                    'traveler_passport': traveler_passport[:4] + '***' if traveler_passport else None,
                    'traveler_name': traveler_name,
                    'merchant': merchant_name,
                },
                'results_count': queryset.count(),
                'point_of_exit': request.user.point_of_exit.code if request.user.point_of_exit else None
            }
        )
        
        # Build response
        results = []
        for form in queryset:
            has_validation = hasattr(form, 'customs_validation')
            results.append({
                'id': str(form.id),
                'form_number': form.form_number,
                'status': form.status,
                'status_display': form.get_status_display(),
                'traveler': {
                    'name': f"{form.traveler.first_name} {form.traveler.last_name}" if form.traveler else 'N/A',
                    'passport_masked': f"***{form.traveler.passport_number_last4}" if form.traveler else '',
                    'nationality': form.traveler.nationality if form.traveler else '',
                },
                'merchant_name': form.invoice.merchant.name if form.invoice and form.invoice.merchant else 'N/A',
                'refund_amount': float(form.refund_amount),
                'currency': form.currency,
                'created_at': form.created_at.isoformat(),
                'expires_at': form.expires_at.isoformat() if form.expires_at else None,
                'is_expired': form.expires_at < timezone.now() if form.expires_at else False,
                'is_validated': has_validation,
                'validation_decision': form.customs_validation.decision if has_validation else None,
                'can_validate': form.can_be_validated() and not has_validation,
            })
        
        return Response({
            'count': len(results),
            'results': results
        })


class GetFormByNumberView(views.APIView):
    """Get a specific form by its number (for manual entry)."""
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]

    def get(self, request, form_number):
        try:
            form = TaxFreeForm.objects.select_related(
                'traveler', 'invoice__merchant', 'created_by'
            ).prefetch_related('customs_validation').get(form_number__iexact=form_number)
        except TaxFreeForm.DoesNotExist:
            return Response(
                {'error': 'Bordereau non trouvé', 'form_number': form_number},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Use the same check logic as ScanView
        scan_view = ScanView()
        checks = scan_view._perform_automated_checks(form, request.user)
        
        # Log the consultation
        AuditService.log(
            actor=request.user,
            action='LOOKUP_FORM',
            entity='TaxFreeForm',
            entity_id=str(form.id),
            metadata={
                'form_number': form.form_number,
                'lookup_method': 'MANUAL_NUMBER',
                'point_of_exit': request.user.point_of_exit.code if request.user.point_of_exit else None
            }
        )
        
        result = {
            'form': scan_view._get_enriched_form_data(form),
            'checks': checks,
            'can_validate': checks['overall_status'] != 'BLOCKED',
            'overall_status': checks['overall_status'],
            'overall_message': checks['overall_message'],
        }
        
        return Response(result)


class DecideView(views.APIView):
    """Make a decision on a tax free form."""
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]

    def post(self, request, form_id):
        try:
            form = TaxFreeForm.objects.get(id=form_id)
        except TaxFreeForm.DoesNotExist:
            return Response(
                {'error': 'Form not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = DecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if can validate
        if hasattr(form, 'customs_validation'):
            return Response(
                {'error': 'Form already has a validation decision'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not form.can_be_validated():
            return Response(
                {'error': 'Form cannot be validated in current status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get point of exit from agent
        point_of_exit = request.user.point_of_exit
        if not point_of_exit:
            return Response(
                {'error': 'Agent has no assigned point of exit'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = serializer.validated_data
        now = timezone.now()
        
        with transaction.atomic():
            # Create validation record
            validation = CustomsValidation.objects.create(
                form=form,
                agent=request.user,
                point_of_exit=point_of_exit,
                decision=data['decision'],
                refusal_reason=data.get('refusal_reason', ''),
                refusal_details=data.get('refusal_details', ''),
                physical_control_done=data.get('physical_control_done', False),
                control_notes=data.get('control_notes', ''),
                decided_at=now
            )
            
            # Update form status
            if data['decision'] == ValidationDecision.VALIDATED:
                form.status = TaxFreeFormStatus.VALIDATED
                form.validated_at = now
            elif data['decision'] == ValidationDecision.REFUSED:
                form.status = TaxFreeFormStatus.REFUSED
            # CONTROL_REQUIRED keeps form in VALIDATION_PENDING
            
            form.save()
        
        AuditService.log(
            actor=request.user,
            action=f'CUSTOMS_{data["decision"]}',
            entity='TaxFreeForm',
            entity_id=str(form.id),
            metadata={
                'form_number': form.form_number,
                'decision': data['decision'],
                'point_of_exit': point_of_exit.code,
                'refusal_reason': data.get('refusal_reason', '')
            }
        )
        
        return Response(CustomsValidationSerializer(validation).data)


class OfflineSyncView(views.APIView):
    """Sync offline validations."""
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]

    def post(self, request):
        serializer = OfflineSyncSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        batch_id = data['batch_id']
        validations = data['validations']
        
        point_of_exit = request.user.point_of_exit
        if not point_of_exit:
            return Response(
                {'error': 'Agent has no assigned point of exit'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        successful = 0
        failed = 0
        errors = []
        
        for val_data in validations:
            try:
                form = TaxFreeForm.objects.get(id=val_data['form_id'])
                
                # Check if already validated - this is a conflict
                if hasattr(form, 'customs_validation'):
                    existing_val = form.customs_validation
                    errors.append({
                        'form_id': str(val_data['form_id']),
                        'form_number': form.form_number,
                        'error': 'Already validated',
                        'is_conflict': True,
                        'server_validation': {
                            'decision': existing_val.decision,
                            'agent_name': existing_val.agent.full_name,
                            'decided_at': existing_val.decided_at.isoformat() if existing_val.decided_at else None,
                            'point_of_exit': existing_val.point_of_exit.name if existing_val.point_of_exit else None,
                        }
                    })
                    failed += 1
                    continue
                
                with transaction.atomic():
                    validation = CustomsValidation.objects.create(
                        form=form,
                        agent=request.user,
                        point_of_exit=point_of_exit,
                        decision=val_data['decision'],
                        refusal_reason=val_data.get('refusal_reason', ''),
                        refusal_details=val_data.get('refusal_details', ''),
                        physical_control_done=val_data.get('physical_control_done', False),
                        control_notes=val_data.get('control_notes', ''),
                        is_offline=True,
                        offline_batch_id=batch_id,
                        offline_timestamp=val_data['offline_timestamp'],
                        decided_at=val_data['offline_timestamp'],
                        synced_at=timezone.now()
                    )
                    
                    # Update form status
                    if val_data['decision'] == ValidationDecision.VALIDATED:
                        form.status = TaxFreeFormStatus.VALIDATED
                        form.validated_at = val_data['offline_timestamp']
                    elif val_data['decision'] == ValidationDecision.REFUSED:
                        form.status = TaxFreeFormStatus.REFUSED
                    
                    form.save()
                
                successful += 1
                
            except TaxFreeForm.DoesNotExist:
                errors.append({
                    'form_id': str(val_data['form_id']),
                    'error': 'Bordereau non trouvé',
                    'is_conflict': False
                })
                failed += 1
            except Exception as e:
                errors.append({
                    'form_id': str(val_data['form_id']),
                    'error': f'Erreur: {str(e)}',
                    'is_conflict': False
                })
                failed += 1
        
        # Create batch record
        OfflineSyncBatch.objects.create(
            batch_id=batch_id,
            agent=request.user,
            point_of_exit=point_of_exit,
            validations_count=len(validations),
            successful_count=successful,
            failed_count=failed,
            sync_errors=errors
        )
        
        AuditService.log(
            actor=request.user,
            action='OFFLINE_SYNC',
            entity='OfflineSyncBatch',
            entity_id=batch_id,
            metadata={
                'total': len(validations),
                'successful': successful,
                'failed': failed
            }
        )
        
        return Response({
            'batch_id': batch_id,
            'total': len(validations),
            'successful': successful,
            'failed': failed,
            'errors': errors
        })


# ============== ADMIN VIEWS FOR CUSTOMS AGENTS MANAGEMENT ==============

class AdminCustomsAgentsView(views.APIView):
    """Admin view to list and manage customs agents."""
    
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        """List all customs agents."""
        from apps.accounts.models import User, UserRole
        from .serializers import CustomsAgentSerializer
        
        agents = User.objects.filter(role=UserRole.CUSTOMS_AGENT).select_related()
        
        # Filters
        point_of_exit_id = request.query_params.get('point_of_exit')
        is_active = request.query_params.get('is_active')
        search = request.query_params.get('search')
        
        if point_of_exit_id:
            agents = agents.filter(point_of_exit_id=point_of_exit_id)
        if is_active is not None:
            agents = agents.filter(is_active=is_active.lower() == 'true')
        if search:
            agents = agents.filter(
                models.Q(email__icontains=search) |
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search)
            )
        
        serializer = CustomsAgentSerializer(agents, many=True)
        return Response({
            'count': agents.count(),
            'agents': serializer.data
        })


class AdminCustomsAgentDetailView(views.APIView):
    """Admin view to get/update/delete a specific customs agent."""
    
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, agent_id):
        """Get agent details."""
        from apps.accounts.models import User, UserRole
        from .serializers import CustomsAgentSerializer
        
        try:
            agent = User.objects.get(id=agent_id, role=UserRole.CUSTOMS_AGENT)
        except User.DoesNotExist:
            return Response({'detail': 'Agent non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = CustomsAgentSerializer(agent)
        
        # Get agent stats
        validations = CustomsValidation.objects.filter(agent=agent)
        today = timezone.now().date()
        
        stats = {
            'total_validations': validations.count(),
            'validations_today': validations.filter(decided_at__date=today).count(),
            'validated_count': validations.filter(decision='VALIDATED').count(),
            'refused_count': validations.filter(decision='REFUSED').count(),
        }
        
        return Response({
            'agent': serializer.data,
            'stats': stats
        })

    def patch(self, request, agent_id):
        """Update agent (activate/deactivate, reassign)."""
        from apps.accounts.models import User, UserRole
        
        try:
            agent = User.objects.get(id=agent_id, role=UserRole.CUSTOMS_AGENT)
        except User.DoesNotExist:
            return Response({'detail': 'Agent non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        # Update allowed fields
        if 'is_active' in request.data:
            agent.is_active = request.data['is_active']
        if 'point_of_exit_id' in request.data:
            # Validate point of exit
            poe_id = request.data['point_of_exit_id']
            if poe_id:
                if not PointOfExit.objects.filter(id=poe_id, is_active=True).exists():
                    return Response({'detail': 'Frontière invalide'}, status=status.HTTP_400_BAD_REQUEST)
            agent.point_of_exit_id = poe_id
        
        agent.save()
        
        AuditService.log(
            actor=request.user,
            action='UPDATE_CUSTOMS_AGENT',
            entity='User',
            entity_id=str(agent.id),
            metadata={'changes': request.data}
        )
        
        from .serializers import CustomsAgentSerializer
        return Response(CustomsAgentSerializer(agent).data)

    def delete(self, request, agent_id):
        """Deactivate agent (soft delete)."""
        from apps.accounts.models import User, UserRole
        
        try:
            agent = User.objects.get(id=agent_id, role=UserRole.CUSTOMS_AGENT)
        except User.DoesNotExist:
            return Response({'detail': 'Agent non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        agent.is_active = False
        agent.save()
        
        AuditService.log(
            actor=request.user,
            action='DEACTIVATE_CUSTOMS_AGENT',
            entity='User',
            entity_id=str(agent.id)
        )
        
        return Response({'detail': 'Agent désactivé'})


class AdminAgentInvitationsView(views.APIView):
    """Admin view to list and create agent invitations."""
    
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        """List all invitations."""
        from apps.accounts.models import CustomsAgentInvitation
        from .serializers import CustomsAgentInvitationSerializer
        
        invitations = CustomsAgentInvitation.objects.select_related(
            'point_of_exit', 'created_by', 'user'
        ).order_by('-created_at')
        
        # Filters
        status_filter = request.query_params.get('status')
        point_of_exit_id = request.query_params.get('point_of_exit')
        
        if status_filter:
            invitations = invitations.filter(status=status_filter)
        if point_of_exit_id:
            invitations = invitations.filter(point_of_exit_id=point_of_exit_id)
        
        serializer = CustomsAgentInvitationSerializer(invitations, many=True)
        return Response({
            'count': invitations.count(),
            'invitations': serializer.data
        })

    def post(self, request):
        """Create a new invitation and send email."""
        from apps.accounts.models import CustomsAgentInvitation
        from .serializers import CreateAgentInvitationSerializer, CustomsAgentInvitationSerializer
        
        serializer = CreateAgentInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Create invitation with all fields
        invitation = CustomsAgentInvitation.objects.create(
            # Basic info
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone=data.get('phone', ''),
            # Personal identification
            date_of_birth=data.get('date_of_birth'),
            place_of_birth=data.get('place_of_birth', ''),
            nationality=data.get('nationality', 'CD'),
            national_id=data.get('national_id', ''),
            # Address
            address=data.get('address', ''),
            city=data.get('city', ''),
            province=data.get('province', ''),
            # Emergency contact
            emergency_contact_name=data.get('emergency_contact_name', ''),
            emergency_contact_phone=data.get('emergency_contact_phone', ''),
            emergency_contact_relation=data.get('emergency_contact_relation', ''),
            # Professional info
            matricule=data['matricule'],
            grade=data.get('grade', ''),
            department=data.get('department', ''),
            hire_date=data.get('hire_date'),
            point_of_exit_id=data['point_of_exit'],
            created_by=request.user
        )
        
        # Send invitation email
        self._send_invitation_email(invitation)
        
        AuditService.log(
            actor=request.user,
            action='CREATE_AGENT_INVITATION',
            entity='CustomsAgentInvitation',
            entity_id=str(invitation.id),
            metadata={'email': invitation.email, 'matricule': invitation.matricule}
        )
        
        return Response(
            CustomsAgentInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED
        )
    
    def _send_invitation_email(self, invitation):
        """Send invitation email to agent with HTML template."""
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        
        activation_url = f"{settings.FRONTEND_URL}/activate-agent/{invitation.invitation_token}"
        border_name = invitation.point_of_exit.name if invitation.point_of_exit else 'Non assignée'
        
        subject = "🎖️ Invitation - Tax Free RDC - Agent Douanier"
        
        # Plain text version
        text_content = f"""
Bonjour {invitation.first_name} {invitation.last_name},

Vous avez été invité(e) à rejoindre la plateforme Tax Free RDC en tant qu'agent douanier.

Frontière assignée: {border_name}
Matricule: {invitation.matricule}

Pour activer votre compte, cliquez sur le lien ci-dessous:
{activation_url}

Ce lien expire dans 7 jours.

Cordialement,
L'équipe Tax Free RDC
        """
        
        # HTML version - responsive design
        html_content = f'''
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation Tax Free RDC</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                            <div style="width: 70px; height: 70px; background-color: rgba(255,255,255,0.2); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 36px;">🎖️</span>
                            </div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Bienvenue dans l'équipe !</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Tax Free RDC - Agent Douanier</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Bonjour <strong>{invitation.first_name} {invitation.last_name}</strong>,
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                                Vous avez été invité(e) à rejoindre la plateforme <strong>Tax Free RDC</strong> en tant qu'agent douanier. Votre compte est prêt à être activé.
                            </p>
                            
                            <!-- Info Cards -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 15px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #2563eb;">
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="width: 50%; padding: 8px 0;">
                                                    <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Frontière assignée</p>
                                                    <p style="margin: 5px 0 0; color: #1f2937; font-size: 16px; font-weight: 600;">📍 {border_name}</p>
                                                </td>
                                                <td style="width: 50%; padding: 8px 0;">
                                                    <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Matricule</p>
                                                    <p style="margin: 5px 0 0; color: #1f2937; font-size: 16px; font-weight: 600; font-family: monospace;">🪪 {invitation.matricule}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 10px 0 30px;">
                                        <a href="{activation_url}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                                            ✅ Activer mon compte
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px; text-align: center;">
                                Ou copiez ce lien dans votre navigateur :<br>
                                <a href="{activation_url}" style="color: #2563eb; word-break: break-all; font-size: 12px;">{activation_url}</a>
                            </p>
                            
                            <!-- Warning -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 15px; background-color: #fef3c7; border-radius: 12px; text-align: center;">
                                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                                            ⏰ <strong>Ce lien expire dans 7 jours</strong>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                                Cordialement,<br>
                                <strong style="color: #374151;">L'équipe Tax Free RDC</strong>
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                © 2024 Tax Free RDC. Tous droits réservés.
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Help text -->
                <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                    Si vous n'avez pas demandé cette invitation, veuillez ignorer cet email.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
        '''
        
        try:
            email = EmailMultiAlternatives(
                subject,
                text_content,
                settings.DEFAULT_FROM_EMAIL,
                [invitation.email]
            )
            email.attach_alternative(html_content, "text/html")
            email.send(fail_silently=True)
        except Exception as e:
            print(f"Error sending invitation email: {e}")


class AdminAgentInvitationDetailView(views.APIView):
    """Admin view to manage a specific invitation."""
    
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, invitation_id):
        """Get invitation details."""
        from apps.accounts.models import CustomsAgentInvitation
        from .serializers import CustomsAgentInvitationSerializer
        
        try:
            invitation = CustomsAgentInvitation.objects.select_related(
                'point_of_exit', 'created_by', 'user'
            ).get(id=invitation_id)
        except CustomsAgentInvitation.DoesNotExist:
            return Response({'detail': 'Invitation non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(CustomsAgentInvitationSerializer(invitation).data)

    def delete(self, request, invitation_id):
        """Cancel invitation."""
        from apps.accounts.models import CustomsAgentInvitation, CustomsAgentInvitationStatus
        
        try:
            invitation = CustomsAgentInvitation.objects.get(id=invitation_id)
        except CustomsAgentInvitation.DoesNotExist:
            return Response({'detail': 'Invitation non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        
        if invitation.status != CustomsAgentInvitationStatus.PENDING:
            return Response(
                {'detail': 'Seules les invitations en attente peuvent être annulées'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invitation.status = CustomsAgentInvitationStatus.CANCELLED
        invitation.save()
        
        AuditService.log(
            actor=request.user,
            action='CANCEL_AGENT_INVITATION',
            entity='CustomsAgentInvitation',
            entity_id=str(invitation.id)
        )
        
        return Response({'detail': 'Invitation annulée'})


class AdminResendInvitationView(views.APIView):
    """Resend invitation email."""
    
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, invitation_id):
        from apps.accounts.models import CustomsAgentInvitation, CustomsAgentInvitationStatus
        
        try:
            invitation = CustomsAgentInvitation.objects.get(id=invitation_id)
        except CustomsAgentInvitation.DoesNotExist:
            return Response({'detail': 'Invitation non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        
        if invitation.status != CustomsAgentInvitationStatus.PENDING:
            return Response(
                {'detail': 'Seules les invitations en attente peuvent être renvoyées'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Regenerate token and extend expiry
        invitation.invitation_token = CustomsAgentInvitation.generate_token()
        invitation.expires_at = timezone.now() + timezone.timedelta(days=7)
        invitation.save()
        
        # Resend email
        AdminAgentInvitationsView()._send_invitation_email(invitation)
        
        return Response({'detail': 'Invitation renvoyée'})


class ActivateAgentAccountView(views.APIView):
    """Public view for agent to activate their account."""
    
    permission_classes = []  # Public endpoint

    def get(self, request, token):
        """Validate token and return invitation info."""
        from apps.accounts.models import CustomsAgentInvitation
        
        try:
            invitation = CustomsAgentInvitation.objects.select_related('point_of_exit').get(
                invitation_token=token
            )
        except CustomsAgentInvitation.DoesNotExist:
            return Response({'detail': 'Invitation invalide'}, status=status.HTTP_404_NOT_FOUND)
        
        if not invitation.is_valid:
            return Response(
                {'detail': 'Cette invitation a expiré ou a déjà été utilisée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'email': invitation.email,
            'first_name': invitation.first_name,
            'last_name': invitation.last_name,
            'matricule': invitation.matricule,
            'point_of_exit_name': invitation.point_of_exit.name if invitation.point_of_exit else None,
            'expires_at': invitation.expires_at
        })

    def post(self, request, token):
        """Activate account with password."""
        from apps.accounts.models import CustomsAgentInvitation, Notification, NotificationType
        from .serializers import ActivateAgentInvitationSerializer
        
        serializer = ActivateAgentInvitationSerializer(data={
            'token': token,
            **request.data
        })
        serializer.is_valid(raise_exception=True)
        
        try:
            invitation = CustomsAgentInvitation.objects.select_related('created_by', 'point_of_exit').get(invitation_token=token)
            user = invitation.activate(serializer.validated_data['password'])
            
            border_name = invitation.point_of_exit.name if invitation.point_of_exit else 'N/A'
            
            # 1. Create in-app notification for the admin who created the invitation
            # Using the existing Notification model from apps.accounts
            if invitation.created_by:
                try:
                    Notification.objects.create(
                        user=invitation.created_by,
                        notification_type=NotificationType.GENERAL,
                        title=f'🎉 Agent activé - {invitation.first_name} {invitation.last_name}',
                        message=f"L'agent {invitation.first_name} {invitation.last_name} (Matricule: {invitation.matricule}) a activé son compte et est maintenant opérationnel à {border_name}.",
                        related_object_type='CustomsAgent',
                        related_object_id=user.id,
                        action_url='/admin/agents',
                        is_read=False
                    )
                    print(f"✅ Notification created for admin {invitation.created_by.email}")
                except Exception as e:
                    print(f"❌ Error creating notification: {e}")
            
            # 2. Send confirmation email to the agent
            self._send_activation_confirmation_email(user, invitation)
            
            AuditService.log(
                actor=user,
                action='ACTIVATE_AGENT_ACCOUNT',
                entity='User',
                entity_id=str(user.id)
            )
            
            return Response({
                'detail': 'Compte activé avec succès',
                'email': user.email
            })
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def _send_activation_confirmation_email(self, user, invitation):
        """Send confirmation email to agent after account activation."""
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        
        login_url = f"{settings.FRONTEND_URL}/login"
        border_name = invitation.point_of_exit.name if invitation.point_of_exit else 'N/A'
        
        subject = "✅ Compte activé - Tax Free RDC"
        
        text_content = f"""
Bonjour {user.first_name} {user.last_name},

Félicitations ! Votre compte agent douanier a été activé avec succès.

Vos informations:
- Email: {user.email}
- Matricule: {invitation.matricule}
- Frontière: {border_name}

Vous pouvez maintenant vous connecter à la plateforme Tax Free RDC pour commencer à travailler.

Lien de connexion: {login_url}

Cordialement,
L'équipe Tax Free RDC
        """
        
        html_content = f'''
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                            <div style="width: 70px; height: 70px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 36px;">✅</span>
                            </div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Compte activé !</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Bienvenue dans l'équipe Tax Free RDC</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                                Bonjour <strong>{user.first_name} {user.last_name}</strong>,
                            </p>
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                                Félicitations ! Votre compte agent douanier a été <strong>activé avec succès</strong>. Vous pouvez maintenant vous connecter à la plateforme pour commencer à travailler.
                            </p>
                            
                            <!-- Info Cards -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 20px; background-color: #f0fdf4; border-radius: 12px; border-left: 4px solid #10b981;">
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Email de connexion</p>
                                                    <p style="margin: 5px 0 0; color: #1f2937; font-size: 16px; font-weight: 600;">📧 {user.email}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Matricule</p>
                                                    <p style="margin: 5px 0 0; color: #1f2937; font-size: 16px; font-weight: 600; font-family: monospace;">🪪 {invitation.matricule}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Frontière assignée</p>
                                                    <p style="margin: 5px 0 0; color: #1f2937; font-size: 16px; font-weight: 600;">📍 {border_name}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 10px 0 30px;">
                                        <a href="{login_url}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                                            🚀 Se connecter maintenant
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                                Ou copiez ce lien : <a href="{login_url}" style="color: #2563eb;">{login_url}</a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                                Bonne chance dans vos fonctions !<br>
                                <strong style="color: #374151;">L'équipe Tax Free RDC</strong>
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                © 2024 Tax Free RDC. Tous droits réservés.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        '''
        
        try:
            email = EmailMultiAlternatives(
                subject,
                text_content,
                settings.DEFAULT_FROM_EMAIL,
                [user.email]
            )
            email.attach_alternative(html_content, "text/html")
            email.send(fail_silently=True)
            print(f"✅ Confirmation email sent to {user.email}")
        except Exception as e:
            print(f"❌ Error sending confirmation email: {e}")


class AdminBorderStatsView(views.APIView):
    """Get statistics for all borders."""
    
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.accounts.models import User, UserRole
        from django.db.models import Count
        
        borders = PointOfExit.objects.all()
        today = timezone.now().date()
        
        stats = []
        for border in borders:
            agents_count = User.objects.filter(
                point_of_exit_id=border.id,
                role=UserRole.CUSTOMS_AGENT,
                is_active=True
            ).count()
            
            validations_today = CustomsValidation.objects.filter(
                point_of_exit=border,
                decided_at__date=today
            ).count()
            
            total_validations = CustomsValidation.objects.filter(
                point_of_exit=border
            ).count()
            
            stats.append({
                'id': str(border.id),
                'code': border.code,
                'name': border.name,
                'type': border.type,
                'city': border.city,
                'is_active': border.is_active,
                'agents_count': agents_count,
                'validations_today': validations_today,
                'total_validations': total_validations
            })
        
        return Response({
            'count': len(stats),
            'borders': stats
        })


# ============== AGENT DASHBOARD API ==============

class AgentDashboardView(views.APIView):
    """Dashboard API for customs agents - filtered by their assigned border."""
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]

    def get(self, request):
        from django.db.models import Sum, Count, Q
        from django.db.models.functions import TruncDate, TruncMonth
        from datetime import timedelta
        
        user = request.user
        point_of_exit = user.point_of_exit
        
        if not point_of_exit:
            return Response({
                'error': 'Aucune frontière assignée',
                'point_of_exit': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        today = timezone.now().date()
        start_of_month = today.replace(day=1)
        start_of_week = today - timedelta(days=today.weekday())
        
        # Get forms waiting for validation at this border
        # Forms with status ISSUED that haven't been validated yet
        pending_forms = TaxFreeForm.objects.filter(
            status__in=[TaxFreeFormStatus.ISSUED, TaxFreeFormStatus.VALIDATION_PENDING]
        ).exclude(
            customs_validation__isnull=False
        ).select_related('invoice__merchant', 'traveler').order_by('-created_at')[:50]
        
        # Agent's validations
        my_validations = CustomsValidation.objects.filter(agent=user)
        my_validations_today = my_validations.filter(decided_at__date=today)
        my_validations_month = my_validations.filter(decided_at__date__gte=start_of_month)
        
        # All validations at this border
        border_validations = CustomsValidation.objects.filter(point_of_exit=point_of_exit)
        border_validations_today = border_validations.filter(decided_at__date=today)
        
        # Agent's refunds processed
        from apps.refunds.models import Refund, RefundStatus
        my_refunds = Refund.objects.filter(
            Q(initiated_by=user) | Q(cash_collected_by=user)
        ).distinct()
        my_refunds_today = my_refunds.filter(created_at__date=today)
        my_refunds_paid = my_refunds.filter(status=RefundStatus.PAID)
        my_refunds_paid_today = my_refunds_paid.filter(paid_at__date=today)
        
        # Stats - ALL FILTERED BY AGENT
        stats = {
            # Agent personal validation stats
            'my_validations_today': my_validations_today.count(),
            'my_validations_week': my_validations.filter(decided_at__date__gte=start_of_week).count(),
            'my_validations_month': my_validations_month.count(),
            'my_validations_total': my_validations.count(),
            'my_validated_today': my_validations_today.filter(decision='VALIDATED').count(),
            'my_refused_today': my_validations_today.filter(decision='REFUSED').count(),
            'my_validated_count': my_validations.filter(decision='VALIDATED').count(),
            'my_refused_count': my_validations.filter(decision='REFUSED').count(),
            'my_validation_rate': round(
                my_validations.filter(decision='VALIDATED').count() / my_validations.count() * 100, 1
            ) if my_validations.count() > 0 else 0,
            
            # Agent personal refund stats
            'my_refunds_today': my_refunds_today.count(),
            'my_refunds_paid_today': my_refunds_paid_today.count(),
            'my_refunds_total': my_refunds.count(),
            'my_refunds_paid_total': my_refunds_paid.count(),
            
            # Agent's amounts (personal)
            'my_amount_validated_today': float(
                my_validations_today.filter(decision='VALIDATED').aggregate(
                    total=Sum('form__refund_amount')
                )['total'] or 0
            ),
            'my_tva_validated_today': float(
                my_validations_today.filter(decision='VALIDATED').aggregate(
                    total=Sum('form__vat_amount')
                )['total'] or 0
            ),
            'my_amount_validated_total': float(
                my_validations.filter(decision='VALIDATED').aggregate(
                    total=Sum('form__refund_amount')
                )['total'] or 0
            ),
            'my_amount_refunded_today': float(
                my_refunds_paid_today.aggregate(total=Sum('net_amount'))['total'] or 0
            ),
            'my_amount_refunded_total': float(
                my_refunds_paid.aggregate(total=Sum('net_amount'))['total'] or 0
            ),
            
            # Pending forms count (global - forms waiting for any agent)
            'pending_forms_count': pending_forms.count(),
        }
        
        # Pending forms list
        pending_list = []
        for form in pending_forms:
            try:
                pending_list.append({
                    'id': str(form.id),
                    'form_number': form.form_number,
                    'status': form.status,
                    'traveler_name': f"{form.traveler.first_name} {form.traveler.last_name}" if form.traveler else 'N/A',
                    'traveler_passport': form.traveler.passport_number_last4 if form.traveler else '',
                    'traveler_nationality': form.traveler.nationality if form.traveler else '',
                    'merchant_name': form.invoice.merchant.name if form.invoice and form.invoice.merchant else 'N/A',
                    'total_amount': float(form.invoice.total_amount) if form.invoice else 0,
                    'refund_amount': float(form.refund_amount) if form.refund_amount else 0,
                    'created_at': form.created_at.isoformat() if form.created_at else None,
                    'expires_at': form.expires_at.isoformat() if form.expires_at else None,
                    'is_expired': form.expires_at < timezone.now() if form.expires_at else False,
                    'requires_control': getattr(form, 'requires_control', False),
                    'risk_score': getattr(form, 'risk_score', 0),
                })
            except Exception:
                continue
        
        # Recent validations by this agent
        recent_validations = my_validations.order_by('-decided_at')[:10]
        recent_list = []
        for val in recent_validations:
            try:
                recent_list.append({
                    'id': str(val.id),
                    'form_number': val.form.form_number,
                    'decision': val.decision,
                    'traveler_name': f"{val.form.traveler.first_name} {val.form.traveler.last_name}" if val.form.traveler else 'N/A',
                    'total_amount': float(val.form.invoice.total_amount) if val.form.invoice else 0,
                    'decided_at': val.decided_at.isoformat() if val.decided_at else None,
                    'physical_control_done': val.physical_control_done,
                })
            except Exception:
                continue
        
        # Daily chart (last 7 days)
        daily_data = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_validations = my_validations.filter(decided_at__date=day)
            daily_data.append({
                'date': day.strftime('%d/%m'),
                'day': day.strftime('%A'),
                'validated': day_validations.filter(decision='VALIDATED').count(),
                'refused': day_validations.filter(decision='REFUSED').count(),
                'total': day_validations.count(),
            })
        
        # Point of exit info
        point_of_exit_info = {
            'id': str(point_of_exit.id),
            'code': point_of_exit.code,
            'name': point_of_exit.name,
            'type': point_of_exit.type,
            'city': point_of_exit.city,
        }
        
        return Response({
            'agent': {
                'id': str(user.id),
                'name': user.full_name,
                'email': user.email,
            },
            'point_of_exit': point_of_exit_info,
            'stats': stats,
            'pending_forms': pending_list,
            'recent_validations': recent_list,
            'daily_chart': daily_data,
        })


class AgentPendingFormsView(views.APIView):
    """Get all pending forms for validation - filtered by agent's border."""
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]

    def get(self, request):
        user = request.user
        point_of_exit = user.point_of_exit
        
        if not point_of_exit:
            return Response({'error': 'Aucune frontière assignée'}, status=400)
        
        # Get forms waiting for validation
        pending_forms = TaxFreeForm.objects.filter(
            status__in=[TaxFreeFormStatus.ISSUED, TaxFreeFormStatus.VALIDATION_PENDING]
        ).exclude(
            customs_validation__isnull=False
        ).select_related('invoice__merchant', 'traveler').order_by('-created_at')
        
        # Filters
        search = request.query_params.get('search')
        if search:
            pending_forms = pending_forms.filter(
                Q(form_number__icontains=search) |
                Q(traveler__first_name__icontains=search) |
                Q(traveler__last_name__icontains=search) |
                Q(traveler__passport_number_last4__icontains=search)
            )
        
        forms_list = []
        for form in pending_forms[:100]:
            try:
                forms_list.append({
                    'id': str(form.id),
                    'form_number': form.form_number,
                    'status': form.status,
                    'traveler_name': f"{form.traveler.first_name} {form.traveler.last_name}" if form.traveler else 'N/A',
                    'traveler_passport': f"***{form.traveler.passport_number_last4}" if form.traveler else '',
                    'traveler_nationality': form.traveler.nationality if form.traveler else '',
                    'merchant_name': form.invoice.merchant.name if form.invoice and form.invoice.merchant else 'N/A',
                    'total_amount': float(form.invoice.total_amount) if form.invoice else 0,
                    'refund_amount': float(form.refund_amount) if form.refund_amount else 0,
                    'items_count': form.invoice.items.count() if form.invoice else 0,
                    'created_at': form.created_at.isoformat() if form.created_at else None,
                    'expires_at': form.expires_at.isoformat() if form.expires_at else None,
                    'is_expired': form.expires_at < timezone.now() if form.expires_at else False,
                    'requires_control': getattr(form, 'requires_control', False),
                    'risk_score': getattr(form, 'risk_score', 0),
                })
            except Exception:
                continue
        
        return Response({
            'count': len(forms_list),
            'forms': forms_list
        })


class AgentValidationHistoryView(views.APIView):
    """Get validation history for the agent."""
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]

    def get(self, request):
        user = request.user
        
        validations = CustomsValidation.objects.filter(
            agent=user
        ).select_related('form__invoice__merchant', 'form__traveler').order_by('-decided_at')
        
        # Filters
        decision = request.query_params.get('decision')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if decision:
            validations = validations.filter(decision=decision)
        if date_from:
            validations = validations.filter(decided_at__date__gte=date_from)
        if date_to:
            validations = validations.filter(decided_at__date__lte=date_to)
        
        validations_list = []
        for val in validations[:100]:
            try:
                validations_list.append({
                    'id': str(val.id),
                    'form_number': val.form.form_number,
                    'decision': val.decision,
                    'refusal_reason': val.refusal_reason,
                    'refusal_details': val.refusal_details,
                    'physical_control_done': val.physical_control_done,
                    'control_notes': val.control_notes,
                    'traveler_name': f"{val.form.traveler.first_name} {val.form.traveler.last_name}" if val.form.traveler else 'N/A',
                    'merchant_name': val.form.invoice.merchant.name if val.form.invoice and val.form.invoice.merchant else 'N/A',
                    'total_amount': float(val.form.invoice.total_amount) if val.form.invoice else 0,
                    'refund_amount': float(val.form.refund_amount) if val.form.refund_amount else 0,
                    'decided_at': val.decided_at.isoformat() if val.decided_at else None,
                })
            except Exception:
                continue
        
        return Response({
            'count': len(validations_list),
            'validations': validations_list
        })


# ============== AGENT SHIFT API ==============

class AgentShiftView(views.APIView):
    """
    API for managing agent work shifts (sessions de service).
    Allows agents to start, pause, resume, and end their service.
    """
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]

    def get(self, request):
        """Get current shift status and history."""
        from .serializers import AgentShiftSerializer
        
        user = request.user
        point_of_exit = user.point_of_exit
        
        if not point_of_exit:
            return Response({
                'error': 'Aucune frontière assignée'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get current active shift
        current_shift = AgentShift.objects.filter(
            agent=user,
            status__in=[ShiftStatus.ACTIVE, ShiftStatus.PAUSED]
        ).first()
        
        # Get recent shifts (last 7 days)
        from datetime import timedelta
        week_ago = timezone.now() - timedelta(days=7)
        recent_shifts = AgentShift.objects.filter(
            agent=user,
            started_at__gte=week_ago
        ).order_by('-started_at')[:10]
        
        # Today's stats
        today = timezone.now().date()
        today_shifts = AgentShift.objects.filter(
            agent=user,
            started_at__date=today
        )
        
        total_hours_today = sum(
            shift.duration_hours for shift in today_shifts
        )
        
        return Response({
            'has_active_shift': current_shift is not None,
            'current_shift': AgentShiftSerializer(current_shift).data if current_shift else None,
            'recent_shifts': AgentShiftSerializer(recent_shifts, many=True).data,
            'today_stats': {
                'shifts_count': today_shifts.count(),
                'total_hours': round(total_hours_today, 2),
                'validations': sum(s.validations_count for s in today_shifts),
            },
            'point_of_exit': {
                'id': str(point_of_exit.id),
                'code': point_of_exit.code,
                'name': point_of_exit.name,
                'type': point_of_exit.type,
            }
        })


class StartShiftView(views.APIView):
    """Start a new work shift."""
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]

    def post(self, request):
        from .serializers import StartShiftSerializer, AgentShiftSerializer
        
        user = request.user
        point_of_exit = user.point_of_exit
        
        if not point_of_exit:
            return Response({
                'error': 'Aucune frontière assignée. Contactez l\'administrateur.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already has an active shift
        existing_shift = AgentShift.objects.filter(
            agent=user,
            status__in=[ShiftStatus.ACTIVE, ShiftStatus.PAUSED]
        ).first()
        
        if existing_shift:
            return Response({
                'error': 'Vous avez déjà un service en cours.',
                'current_shift': AgentShiftSerializer(existing_shift).data
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = StartShiftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        # Create new shift
        shift = AgentShift.objects.create(
            agent=user,
            point_of_exit=point_of_exit,
            started_at=timezone.now(),
            status=ShiftStatus.ACTIVE,
            notes=serializer.validated_data.get('notes', ''),
            device_info=serializer.validated_data.get('device_info', {}),
            ip_address=ip_address
        )
        
        # Audit log
        AuditService.log(
            actor=user,
            action='START_SHIFT',
            entity='AgentShift',
            entity_id=str(shift.id),
            metadata={
                'point_of_exit': point_of_exit.name,
                'started_at': shift.started_at.isoformat()
            }
        )
        
        return Response({
            'message': 'Service démarré avec succès',
            'shift': AgentShiftSerializer(shift).data
        }, status=status.HTTP_201_CREATED)


class EndShiftView(views.APIView):
    """End the current work shift."""
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]

    def post(self, request):
        from .serializers import EndShiftSerializer, AgentShiftSerializer
        
        user = request.user
        
        # Get current active shift
        shift = AgentShift.objects.filter(
            agent=user,
            status__in=[ShiftStatus.ACTIVE, ShiftStatus.PAUSED]
        ).first()
        
        if not shift:
            return Response({
                'error': 'Aucun service en cours à terminer.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = EndShiftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # End the shift
        shift.end(notes=serializer.validated_data.get('notes', ''))
        
        # Audit log
        AuditService.log(
            actor=user,
            action='END_SHIFT',
            entity='AgentShift',
            entity_id=str(shift.id),
            metadata={
                'point_of_exit': shift.point_of_exit.name,
                'duration_hours': round(shift.duration_hours, 2),
                'validations_count': shift.validations_count,
                'validated_count': shift.validated_count,
                'refused_count': shift.refused_count
            }
        )
        
        return Response({
            'message': 'Service terminé avec succès',
            'shift': AgentShiftSerializer(shift).data,
            'summary': {
                'duration': f"{int(shift.duration_hours)}h {int((shift.duration_hours % 1) * 60):02d}min",
                'validations': shift.validations_count,
                'validated': shift.validated_count,
                'refused': shift.refused_count,
                'total_amount': float(shift.total_amount_validated)
            }
        })


class PauseShiftView(views.APIView):
    """Pause the current work shift."""
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]

    def post(self, request):
        from .serializers import AgentShiftSerializer
        
        user = request.user
        
        shift = AgentShift.objects.filter(
            agent=user,
            status=ShiftStatus.ACTIVE
        ).first()
        
        if not shift:
            return Response({
                'error': 'Aucun service actif à mettre en pause.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        shift.pause()
        
        AuditService.log(
            actor=user,
            action='PAUSE_SHIFT',
            entity='AgentShift',
            entity_id=str(shift.id)
        )
        
        return Response({
            'message': 'Service mis en pause',
            'shift': AgentShiftSerializer(shift).data
        })


class ResumeShiftView(views.APIView):
    """Resume a paused work shift."""
    
    permission_classes = [IsAuthenticated, IsCustomsAgentOnly]

    def post(self, request):
        from .serializers import AgentShiftSerializer
        
        user = request.user
        
        shift = AgentShift.objects.filter(
            agent=user,
            status=ShiftStatus.PAUSED
        ).first()
        
        if not shift:
            return Response({
                'error': 'Aucun service en pause à reprendre.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        shift.resume()
        
        AuditService.log(
            actor=user,
            action='RESUME_SHIFT',
            entity='AgentShift',
            entity_id=str(shift.id)
        )
        
        return Response({
            'message': 'Service repris',
            'shift': AgentShiftSerializer(shift).data
        })
