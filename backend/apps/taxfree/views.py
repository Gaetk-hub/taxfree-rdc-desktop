"""
Views for taxfree app.
"""
from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db.models import Q

from apps.accounts.permissions import IsAdmin, IsMerchant, IsAdminOrAuditor
from apps.audit.services import AuditService
from .models import Traveler, TaxFreeForm, TaxFreeFormStatus
from .serializers import (
    TravelerSerializer, TravelerCreateSerializer,
    TaxFreeFormSerializer, TaxFreeFormDetailSerializer,
    TaxFreeFormCreateSerializer, TaxFreeFormCancelSerializer,
    TravelerStatusCheckSerializer
)


class TravelerViewSet(viewsets.ModelViewSet):
    """ViewSet for traveler management."""
    
    queryset = Traveler.objects.all()
    permission_classes = [IsAuthenticated]
    filterset_fields = ['nationality', 'residence_country']
    search_fields = ['first_name', 'last_name', 'email']
    ordering_fields = ['created_at', 'last_name']

    def get_serializer_class(self):
        if self.action == 'create':
            return TravelerCreateSerializer
        return TravelerSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Only admin and auditors can see all travelers
        if not user.is_admin() and not user.is_auditor():
            # Merchants can see travelers from their forms
            if user.is_merchant_user() and user.merchant:
                queryset = queryset.filter(
                    taxfree_forms__invoice__merchant=user.merchant
                ).distinct()
            else:
                queryset = queryset.none()
        
        return queryset


class TaxFreeFormViewSet(viewsets.ModelViewSet):
    """ViewSet for tax free form management."""
    
    queryset = TaxFreeForm.objects.all()
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'requires_control']
    search_fields = ['form_number', 'traveler__first_name', 'traveler__last_name']
    ordering_fields = ['created_at', 'expires_at', 'refund_amount']

    def get_serializer_class(self):
        if self.action == 'create':
            return TaxFreeFormCreateSerializer
        if self.action in ['retrieve', 'print']:
            return TaxFreeFormDetailSerializer
        if self.action == 'cancel':
            return TaxFreeFormCancelSerializer
        return TaxFreeFormSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_merchant_user() and user.merchant:
            # Filter by merchant
            queryset = queryset.filter(invoice__merchant=user.merchant)
            # If employee, further filter by their assigned outlet
            if user.is_merchant_employee() and user.outlet_id:
                queryset = queryset.filter(invoice__outlet_id=user.outlet_id)
            # Allow merchant users to filter by outlet via query param
            else:
                outlet_id = self.request.query_params.get('outlet')
                if outlet_id:
                    queryset = queryset.filter(invoice__outlet_id=outlet_id)
        elif user.is_customs_agent() or user.is_operator():
            # Customs agents and operators see forms based on their assigned point of exit
            # OR forms they have personally processed
            status_filter = self.request.query_params.get('status')
            from django.db.models import Q
            
            # Build base filter for point of exit or personal involvement
            def get_poe_filter():
                """Get filter for forms at user's point of exit or personally handled."""
                if user.point_of_exit_id:
                    return (
                        Q(customs_validation__point_of_exit_id=user.point_of_exit_id) |
                        Q(refund__initiated_by=user) |
                        Q(refund__cash_collected_by=user)
                    )
                else:
                    return (
                        Q(customs_validation__agent=user) |
                        Q(refund__initiated_by=user) |
                        Q(refund__cash_collected_by=user)
                    )
            
            if status_filter:
                if status_filter in ['ISSUED', 'VALIDATION_PENDING']:
                    # Pending forms - any agent/operator can see and process
                    queryset = queryset.filter(status=status_filter)
                elif status_filter == 'VALIDATED':
                    # Validated forms at their point of exit (pending refund)
                    queryset = queryset.filter(status=status_filter).filter(get_poe_filter())
                elif status_filter == 'REFUNDED':
                    # Refunded forms at their point of exit
                    queryset = queryset.filter(status=status_filter).filter(get_poe_filter())
                elif status_filter == 'REFUSED':
                    # Refused forms at their point of exit
                    queryset = queryset.filter(status=status_filter).filter(get_poe_filter())
                else:
                    queryset = queryset.filter(status=status_filter)
            else:
                # Default: show pending forms (all) + processed forms (at their point of exit)
                queryset = queryset.filter(
                    Q(status__in=[TaxFreeFormStatus.ISSUED, TaxFreeFormStatus.VALIDATION_PENDING]) |
                    (Q(status__in=[TaxFreeFormStatus.VALIDATED, TaxFreeFormStatus.REFUNDED, TaxFreeFormStatus.REFUSED]) & get_poe_filter())
                ).distinct()
        elif not user.is_admin() and not user.is_auditor():
            queryset = queryset.none()
        
        return queryset

    def create(self, request, *args, **kwargs):
        """Override create to add better error logging."""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"TaxFreeForm create request data: {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(f"TaxFreeForm validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            form = serializer.save()
            
            # Generate QR payload immediately so it's available for emails
            form.generate_qr_payload()
            form.save()
            
            AuditService.log(
                actor=request.user,
                action='TAXFREE_FORM_CREATED',
                entity='TaxFreeForm',
                entity_id=str(form.id),
                metadata={
                    'form_number': form.form_number,
                    'refund_amount': str(form.refund_amount),
                    'traveler': form.traveler.full_name
                }
            )
            output_serializer = TaxFreeFormSerializer(form)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"TaxFreeForm create error: {type(e).__name__}: {str(e)}")
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        form = serializer.save()
        AuditService.log(
            actor=self.request.user,
            action='TAXFREE_FORM_CREATED',
            entity='TaxFreeForm',
            entity_id=str(form.id),
            metadata={
                'form_number': form.form_number,
                'refund_amount': str(form.refund_amount),
                'traveler': form.traveler.full_name
            }
        )

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        """Mark form as issued/printed."""
        form = self.get_object()
        
        if form.status != TaxFreeFormStatus.CREATED:
            return Response(
                {'error': 'Form must be in CREATED status to be issued'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        form.status = TaxFreeFormStatus.ISSUED
        form.issued_at = timezone.now()
        form.generate_qr_payload()
        form.save()
        
        AuditService.log(
            actor=request.user,
            action='TAXFREE_FORM_ISSUED',
            entity='TaxFreeForm',
            entity_id=str(form.id),
            metadata={'form_number': form.form_number}
        )
        
        return Response(TaxFreeFormDetailSerializer(form).data)

    @action(detail=True, methods=['get'])
    def print(self, request, pk=None):
        """Get form data for printing."""
        form = self.get_object()
        
        if form.status == TaxFreeFormStatus.CREATED:
            # Auto-issue when printing
            form.status = TaxFreeFormStatus.ISSUED
            form.issued_at = timezone.now()
            form.generate_qr_payload()
            form.save()
        
        return Response(TaxFreeFormDetailSerializer(form).data)

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Download the tax free form as a professional PDF."""
        from django.http import HttpResponse
        from services.pdf_service_v2 import TaxFreePDFServiceV2 as TaxFreePDFService
        
        form = self.get_object()
        
        # Auto-issue if not already issued
        if form.status == TaxFreeFormStatus.CREATED:
            form.status = TaxFreeFormStatus.ISSUED
            form.issued_at = timezone.now()
            form.generate_qr_payload()
            form.save()
            
            AuditService.log(
                actor=request.user,
                action='TAXFREE_FORM_ISSUED',
                entity='TaxFreeForm',
                entity_id=str(form.id),
                metadata={'form_number': form.form_number, 'method': 'pdf_download'}
            )
        
        # Generate PDF
        pdf_content = TaxFreePDFService.generate_form_pdf(form)
        
        if not pdf_content:
            return Response(
                {'error': 'Failed to generate PDF'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Log download
        AuditService.log(
            actor=request.user,
            action='TAXFREE_FORM_PDF_DOWNLOADED',
            entity='TaxFreeForm',
            entity_id=str(form.id),
            metadata={'form_number': form.form_number}
        )
        
        # Return PDF response
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="bordereau_{form.form_number}.pdf"'
        return response

    @action(detail=True, methods=['get'])
    def view_pdf(self, request, pk=None):
        """View the tax free form PDF inline (for printing)."""
        from django.http import HttpResponse
        from services.pdf_service_v2 import TaxFreePDFServiceV2 as TaxFreePDFService
        
        form = self.get_object()
        
        # Auto-issue if not already issued
        if form.status == TaxFreeFormStatus.CREATED:
            form.status = TaxFreeFormStatus.ISSUED
            form.issued_at = timezone.now()
            form.generate_qr_payload()
            form.save()
        
        # Generate PDF
        pdf_content = TaxFreePDFService.generate_form_pdf(form)
        
        if not pdf_content:
            return Response(
                {'error': 'Failed to generate PDF'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Return PDF for inline viewing (printing)
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="bordereau_{form.form_number}.pdf"'
        return response

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a tax free form."""
        form = self.get_object()
        serializer = TaxFreeFormCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if not form.can_be_cancelled():
            return Response(
                {'error': 'Form cannot be cancelled in current status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        form.status = TaxFreeFormStatus.CANCELLED
        form.cancelled_at = timezone.now()
        form.cancelled_by = request.user
        form.cancellation_reason = serializer.validated_data['reason']
        form.save()
        
        AuditService.log(
            actor=request.user,
            action='TAXFREE_FORM_CANCELLED',
            entity='TaxFreeForm',
            entity_id=str(form.id),
            metadata={
                'form_number': form.form_number,
                'reason': form.cancellation_reason
            }
        )
        
        # Send cancellation email to traveler
        if form.traveler.email:
            try:
                from services.email_service import TaxFreeEmailService
                TaxFreeEmailService.send_cancellation_email(form)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send cancellation email: {str(e)}")
        
        return Response(TaxFreeFormSerializer(form).data)

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send tax free form to traveler's email."""
        form = self.get_object()
        
        if not form.traveler.email:
            return Response(
                {'error': 'Traveler has no email address'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure QR payload is generated before sending email
        if not form.qr_payload or not form.qr_signature:
            form.generate_qr_payload()
            form.save()
        
        try:
            from services.email_service import EmailService
            EmailService.send_taxfree_form_email(form)
            
            AuditService.log(
                actor=request.user,
                action='TAXFREE_FORM_EMAILED',
                entity='TaxFreeForm',
                entity_id=str(form.id),
                metadata={
                    'form_number': form.form_number,
                    'email': form.traveler.email
                }
            )
            
            return Response({'success': True, 'message': 'Email sent successfully'})
        except Exception as e:
            return Response(
                {'error': f'Failed to send email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TravelerStatusCheckView(views.APIView):
    """Public endpoint for travelers to check their refund status."""
    
    permission_classes = [AllowAny]
    throttle_scope = 'anon'

    def post(self, request):
        serializer = TravelerStatusCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        form_number = serializer.validated_data.get('form_number')
        passport_number = serializer.validated_data.get('passport_number')
        
        forms = TaxFreeForm.objects.none()
        
        if form_number:
            forms = TaxFreeForm.objects.filter(form_number=form_number)
        elif passport_number:
            passport_hash = Traveler.hash_passport(passport_number)
            forms = TaxFreeForm.objects.filter(
                traveler__passport_number_hash=passport_hash
            ).order_by('-created_at')[:10]
        
        if not forms.exists():
            return Response(
                {'error': 'No forms found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return limited info for security
        result = []
        for form in forms:
            result.append({
                'form_number': form.form_number,
                'status': form.status,
                'status_display': form.get_status_display(),
                'refund_amount': str(form.refund_amount),
                'currency': form.currency,
                'created_at': form.created_at,
                'validated_at': form.validated_at,
            })
        
        return Response({'forms': result})
