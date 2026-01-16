"""
Status Override views for administrative corrections.
Super Admin only - allows correcting form statuses with full audit trail.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction

from apps.accounts.permissions import IsAdmin
from apps.audit.models import AuditLog
from .models import TaxFreeForm, TaxFreeFormStatus
from .override_models import StatusOverride, OverrideType


class StatusOverrideViewSet(viewsets.ViewSet):
    """
    ViewSet for managing status overrides.
    Restricted to Super Admin (ADMIN role) only.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    @action(detail=False, methods=['post'], url_path='correct-status')
    def correct_status(self, request):
        """
        Correct a form's status.
        
        Required fields:
        - form_id: UUID of the form to correct
        - new_status: The new status to apply
        - reason: Detailed explanation (mandatory)
        
        Optional fields:
        - reference_document: Ticket number, email reference, etc.
        - requesting_agent_id: UUID of the agent who requested the correction
        - notify_parties: Boolean to send notifications (default: true)
        """
        form_id = request.data.get('form_id')
        new_status = request.data.get('new_status')
        reason = request.data.get('reason', '').strip()
        reference_document = request.data.get('reference_document', '')
        requesting_agent_id = request.data.get('requesting_agent_id')
        notify_parties = request.data.get('notify_parties', True)

        # Validation
        if not form_id:
            return Response(
                {'detail': 'form_id est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not new_status:
            return Response(
                {'detail': 'new_status est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not reason or len(reason) < 10:
            return Response(
                {'detail': 'Une raison détaillée (minimum 10 caractères) est obligatoire'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate new_status is a valid choice
        valid_statuses = [s[0] for s in TaxFreeFormStatus.choices]
        if new_status not in valid_statuses:
            return Response(
                {'detail': f'Statut invalide. Valeurs possibles: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get the form
        try:
            form = TaxFreeForm.objects.select_related(
                'traveler', 'invoice__merchant', 'invoice__outlet'
            ).get(id=form_id)
        except TaxFreeForm.DoesNotExist:
            return Response(
                {'detail': 'Bordereau non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if status is actually changing
        if form.status == new_status:
            return Response(
                {'detail': 'Le bordereau est déjà dans ce statut'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if refund is already paid - cannot modify status in this case
        from apps.refunds.models import Refund, RefundStatus
        try:
            refund = form.refund
            if refund.status == RefundStatus.PAID:
                return Response(
                    {'detail': 'Impossible de modifier le statut: le remboursement a déjà été effectué. '
                               'Une intervention manuelle est nécessaire pour annuler un remboursement payé.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Refund.DoesNotExist:
            pass

        # Get original validation info if exists
        original_validation_decision = ''
        original_validation_agent_id = None
        original_validation_agent_name = ''
        original_validation_date = None
        original_validation_point_of_exit = ''
        
        try:
            validation = form.customs_validation
            original_validation_decision = validation.decision
            original_validation_agent_id = validation.agent_id
            original_validation_agent_name = validation.agent.get_full_name() if validation.agent else ''
            original_validation_date = validation.decided_at
            original_validation_point_of_exit = validation.point_of_exit.name if validation.point_of_exit else ''
        except:
            pass

        # Get requesting agent info if provided
        requesting_agent_name = ''
        requesting_agent_email = ''
        if requesting_agent_id:
            from apps.accounts.models import User
            try:
                requesting_agent = User.objects.get(id=requesting_agent_id)
                requesting_agent_name = requesting_agent.get_full_name()
                requesting_agent_email = requesting_agent.email
            except User.DoesNotExist:
                pass

        # Determine override type
        override_type = OverrideType.STATUS_CORRECTION
        if form.status == TaxFreeFormStatus.REFUSED and new_status == TaxFreeFormStatus.VALIDATED:
            override_type = OverrideType.VALIDATION_REVERSAL
        elif new_status in [TaxFreeFormStatus.ISSUED, TaxFreeFormStatus.VALIDATION_PENDING]:
            override_type = OverrideType.REOPEN_FORM

        previous_status = form.status

        with transaction.atomic():
            # Create the override record (immutable)
            override = StatusOverride.objects.create(
                form=form,
                override_type=override_type,
                previous_status=previous_status,
                new_status=new_status,
                original_validation_decision=original_validation_decision,
                original_validation_agent_id=original_validation_agent_id,
                original_validation_agent_name=original_validation_agent_name,
                original_validation_date=original_validation_date,
                original_validation_point_of_exit=original_validation_point_of_exit,
                reason=reason,
                reference_document=reference_document,
                requesting_agent_id=requesting_agent_id,
                requesting_agent_name=requesting_agent_name,
                requesting_agent_email=requesting_agent_email,
                performed_by=request.user,
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            )

            # Update the form status
            form.status = new_status
            
            # Update related timestamps based on new status
            if new_status == TaxFreeFormStatus.VALIDATED:
                form.validated_at = timezone.now()
            elif new_status in [TaxFreeFormStatus.ISSUED, TaxFreeFormStatus.VALIDATION_PENDING]:
                # Reopening - clear validation timestamp
                form.validated_at = None
            
            form.save()
            
            # ========== UPDATE RELATED OBJECTS ==========
            self._update_related_objects(form, previous_status, new_status, request.user, reason)

            # Create audit log entry
            AuditLog.objects.create(
                actor_id=request.user.id,
                actor_email=request.user.email,
                actor_role=request.user.role,
                actor_ip=self.get_client_ip(request),
                action='STATUS_OVERRIDE',
                entity='TaxFreeForm',
                entity_id=str(form.id),
                metadata={
                    'override_id': str(override.id),
                    'override_type': override_type,
                    'previous_status': previous_status,
                    'new_status': new_status,
                    'reason': reason,
                    'reference_document': reference_document,
                    'original_validation_decision': original_validation_decision,
                    'original_validation_agent_name': original_validation_agent_name,
                    'requesting_agent_name': requesting_agent_name,
                }
            )

            # Send notifications if requested
            notifications_sent = []
            if notify_parties:
                notifications_sent = self._send_notifications(
                    form, override, previous_status, new_status, request.user
                )
                override.notifications_sent = notifications_sent
                # Use update to bypass immutability check for this specific field
                StatusOverride.objects.filter(id=override.id).update(
                    notifications_sent=notifications_sent
                )

        return Response({
            'success': True,
            'message': f'Statut corrigé de "{TaxFreeFormStatus(previous_status).label}" à "{TaxFreeFormStatus(new_status).label}"',
            'override_id': str(override.id),
            'form_number': form.form_number,
            'previous_status': previous_status,
            'new_status': new_status,
            'notifications_sent': notifications_sent,
        })

    def _update_related_objects(self, form, previous_status, new_status, admin_user, reason):
        """
        Update related objects (CustomsValidation, Refund) when status changes.
        This ensures data consistency across the system.
        """
        from apps.customs.models import CustomsValidation, ValidationDecision
        from apps.refunds.models import Refund, RefundStatus
        
        # ========== HANDLE CUSTOMS VALIDATION ==========
        
        # If changing TO validation_pending or issued, remove/invalidate existing validation
        if new_status in [TaxFreeFormStatus.VALIDATION_PENDING, TaxFreeFormStatus.ISSUED]:
            try:
                validation = form.customs_validation
                # Delete the validation record since we're reopening the form
                validation.delete()
            except CustomsValidation.DoesNotExist:
                pass
        
        # If changing TO validated (without going through normal customs flow)
        elif new_status == TaxFreeFormStatus.VALIDATED:
            try:
                validation = form.customs_validation
                # Update existing validation to VALIDATED
                validation.decision = ValidationDecision.VALIDATED
                validation.refusal_reason = ''
                validation.refusal_details = ''
                validation.control_notes = f"Corrigé par admin: {reason}"
                validation.decided_at = timezone.now()
                validation.save()
            except CustomsValidation.DoesNotExist:
                # No validation exists - this is unusual but we'll handle it
                # The form was validated administratively without customs process
                pass
        
        # If changing TO refused
        elif new_status == TaxFreeFormStatus.REFUSED:
            try:
                validation = form.customs_validation
                # Update existing validation to REFUSED
                validation.decision = ValidationDecision.REFUSED
                validation.refusal_reason = 'OTHER'
                validation.refusal_details = f"Corrigé par admin: {reason}"
                validation.decided_at = timezone.now()
                validation.save()
            except CustomsValidation.DoesNotExist:
                pass
        
        # ========== HANDLE REFUND ==========
        
        # If changing away from validated/refunded status, cancel any existing refund
        if new_status in [TaxFreeFormStatus.VALIDATION_PENDING, TaxFreeFormStatus.ISSUED, 
                          TaxFreeFormStatus.REFUSED, TaxFreeFormStatus.EXPIRED, 
                          TaxFreeFormStatus.CANCELLED]:
            try:
                refund = form.refund
                # Only cancel if not already paid
                if refund.status not in [RefundStatus.PAID]:
                    refund.status = RefundStatus.CANCELLED
                    refund.cancelled_at = timezone.now()
                    refund.cancelled_by = admin_user
                    refund.cancellation_reason = f"Correction administrative: {reason}"
                    refund.save()
                elif refund.status == RefundStatus.PAID:
                    # Refund already paid - this is a problem, log it but don't change
                    import logging
                    logging.getLogger(__name__).warning(
                        f"Status override on form {form.form_number} but refund already PAID. "
                        f"Manual intervention may be required."
                    )
            except Refund.DoesNotExist:
                pass
        
        # If changing TO refunded status, ensure refund exists and is marked as paid
        elif new_status == TaxFreeFormStatus.REFUNDED:
            try:
                refund = form.refund
                if refund.status != RefundStatus.PAID:
                    refund.status = RefundStatus.PAID
                    refund.paid_at = timezone.now()
                    # Also set initiated_by if not set
                    if not refund.initiated_by:
                        refund.initiated_by = admin_user
                    if not refund.initiated_at:
                        refund.initiated_at = timezone.now()
                    refund.save()
            except Refund.DoesNotExist:
                # No refund exists - create one
                Refund.objects.create(
                    form=form,
                    currency=form.currency,
                    gross_amount=form.vat_amount,
                    operator_fee=form.operator_fee,
                    net_amount=form.refund_amount,
                    method='CASH',  # Default to cash for admin-created refunds
                    status=RefundStatus.PAID,
                    paid_at=timezone.now(),
                    initiated_by=admin_user,
                    initiated_at=timezone.now(),
                )

    def _send_notifications(self, form, override, previous_status, new_status, admin_user):
        """Send notifications to relevant parties."""
        from apps.accounts.models import Notification
        
        notifications_sent = []
        
        # Notify the original validation agent if exists
        if override.original_validation_agent_id:
            try:
                from apps.accounts.models import User
                from services.email_service import TaxFreeEmailService
                
                agent = User.objects.get(id=override.original_validation_agent_id)
                
                # Create in-app notification
                Notification.objects.create(
                    user=agent,
                    title='Correction de décision douanière',
                    message=f'Le bordereau {form.form_number} que vous avez traité a été corrigé par un administrateur. '
                            f'Statut modifié de "{TaxFreeFormStatus(previous_status).label}" à "{TaxFreeFormStatus(new_status).label}". '
                            f'Raison: {override.reason}',
                    notification_type='STATUS_OVERRIDE',
                    related_entity='TaxFreeForm',
                    related_entity_id=str(form.id),
                    metadata={
                        'override_id': str(override.id),
                        'admin_name': admin_user.get_full_name(),
                    }
                )
                
                # Send professional email notification to the agent
                if agent.email:
                    TaxFreeEmailService.send_status_override_email(
                        override=override,
                        form=form,
                        recipient_email=agent.email,
                        recipient_name=agent.get_full_name()
                    )
                
                notifications_sent.append({
                    'type': 'agent',
                    'user_id': str(agent.id),
                    'email': agent.email,
                    'email_sent': bool(agent.email),
                })
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to notify agent: {str(e)}")

        # Notify merchant if form has invoice
        if form.invoice and form.invoice.merchant:
            try:
                from apps.accounts.models import User, UserRole
                merchant_admins = User.objects.filter(
                    merchant_id=form.invoice.merchant.id,
                    role=UserRole.MERCHANT,
                    is_active=True
                )
                for merchant_admin in merchant_admins:
                    Notification.objects.create(
                        user=merchant_admin,
                        title='Mise à jour de bordereau',
                        message=f'Le bordereau {form.form_number} a été mis à jour par l\'administration. '
                                f'Nouveau statut: {TaxFreeFormStatus(new_status).label}.',
                        notification_type='STATUS_OVERRIDE',
                        related_entity='TaxFreeForm',
                        related_entity_id=str(form.id),
                    )
                    notifications_sent.append({
                        'type': 'merchant',
                        'user_id': str(merchant_admin.id),
                        'email': merchant_admin.email,
                    })
            except Exception as e:
                pass

        return notifications_sent

    @action(detail=False, methods=['get'], url_path='history/(?P<form_id>[^/.]+)')
    def get_override_history(self, request, form_id=None):
        """Get the override history for a specific form."""
        try:
            form = TaxFreeForm.objects.get(id=form_id)
        except TaxFreeForm.DoesNotExist:
            return Response(
                {'detail': 'Bordereau non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

        overrides = StatusOverride.objects.filter(form=form).select_related('performed_by')
        
        history = []
        for override in overrides:
            history.append({
                'id': str(override.id),
                'override_type': override.override_type,
                'override_type_display': OverrideType(override.override_type).label,
                'previous_status': override.previous_status,
                'previous_status_display': TaxFreeFormStatus(override.previous_status).label,
                'new_status': override.new_status,
                'new_status_display': TaxFreeFormStatus(override.new_status).label,
                'reason': override.reason,
                'reference_document': override.reference_document,
                'original_validation': {
                    'decision': override.original_validation_decision,
                    'agent_name': override.original_validation_agent_name,
                    'date': override.original_validation_date.isoformat() if override.original_validation_date else None,
                    'point_of_exit': override.original_validation_point_of_exit,
                } if override.original_validation_decision else None,
                'requesting_agent': {
                    'name': override.requesting_agent_name,
                    'email': override.requesting_agent_email,
                } if override.requesting_agent_name else None,
                'performed_by': {
                    'id': str(override.performed_by.id),
                    'name': override.performed_by.get_full_name(),
                    'email': override.performed_by.email,
                },
                'created_at': override.created_at.isoformat(),
                'notifications_sent': override.notifications_sent,
            })

        return Response({
            'form_id': str(form.id),
            'form_number': form.form_number,
            'current_status': form.status,
            'current_status_display': form.get_status_display(),
            'overrides': history,
            'total_overrides': len(history),
        })

    @action(detail=False, methods=['get'], url_path='available-statuses/(?P<form_id>[^/.]+)')
    def get_available_statuses(self, request, form_id=None):
        """Get available statuses for a form correction."""
        try:
            form = TaxFreeForm.objects.get(id=form_id)
        except TaxFreeForm.DoesNotExist:
            return Response(
                {'detail': 'Bordereau non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

        current_status = form.status
        
        # Define which status transitions are allowed for corrections
        # Super Admin can correct to most statuses, but with some logic
        available = []
        
        for status_choice in TaxFreeFormStatus.choices:
            status_value, status_label = status_choice
            if status_value != current_status:
                # Add recommendation based on current status
                recommended = False
                warning = None
                
                if current_status == TaxFreeFormStatus.REFUSED:
                    if status_value == TaxFreeFormStatus.VALIDATED:
                        recommended = True
                    elif status_value == TaxFreeFormStatus.VALIDATION_PENDING:
                        recommended = True
                
                if current_status == TaxFreeFormStatus.VALIDATED:
                    if status_value == TaxFreeFormStatus.REFUSED:
                        warning = "Attention: cela annulera la validation"
                    elif status_value == TaxFreeFormStatus.VALIDATION_PENDING:
                        recommended = True
                
                if status_value == TaxFreeFormStatus.REFUNDED:
                    if current_status != TaxFreeFormStatus.VALIDATED:
                        warning = "Un bordereau doit être validé avant d'être remboursé"
                
                available.append({
                    'value': status_value,
                    'label': status_label,
                    'recommended': recommended,
                    'warning': warning,
                })

        return Response({
            'form_id': str(form.id),
            'form_number': form.form_number,
            'current_status': current_status,
            'current_status_display': form.get_status_display(),
            'available_statuses': available,
        })
