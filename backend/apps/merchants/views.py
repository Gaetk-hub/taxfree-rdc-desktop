"""
Views for merchants app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q

from apps.accounts.permissions import IsAdmin, IsMerchant, IsMerchantOwner, IsMerchantOnly, IsAdminOrAuditor
from apps.audit.services import AuditService
from .models import Merchant, Outlet, POSDevice, MerchantStatus
from .serializers import (
    MerchantSerializer, MerchantDetailSerializer, MerchantCreateSerializer,
    MerchantSubmitSerializer, MerchantApproveSerializer, MerchantRejectSerializer,
    MerchantSuspendSerializer, OutletSerializer, OutletDetailSerializer,
    POSDeviceSerializer, POSDeviceCreateSerializer
)
from apps.accounts.permissions import PermissionService


class MerchantViewSet(viewsets.ModelViewSet):
    """ViewSet for merchant management."""
    
    queryset = Merchant.objects.filter(is_deleted=False)
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'city', 'country']
    search_fields = ['name', 'trade_name', 'registration_number', 'contact_email']
    ordering_fields = ['created_at', 'name', 'status']

    def get_serializer_class(self):
        if self.action == 'create':
            return MerchantCreateSerializer
        if self.action == 'retrieve':
            return MerchantDetailSerializer
        if self.action == 'submit':
            return MerchantSubmitSerializer
        if self.action == 'approve':
            return MerchantApproveSerializer
        if self.action == 'reject':
            return MerchantRejectSerializer
        if self.action == 'suspend':
            return MerchantSuspendSerializer
        return MerchantSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Merchants can only see their own merchant
        if user.is_merchant_user() and user.merchant:
            queryset = queryset.filter(id=user.merchant.id)
        elif not user.is_admin() and not user.is_auditor():
            queryset = queryset.none()
        
        return queryset

    def get_permissions(self):
        if self.action in ['approve', 'reject', 'suspend', 'unsuspend']:
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit merchant for review."""
        merchant = self.get_object()
        
        if merchant.status != MerchantStatus.DRAFT:
            return Response(
                {'error': 'Only draft merchants can be submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        merchant.status = MerchantStatus.SUBMITTED
        merchant.submitted_at = timezone.now()
        merchant.save()
        
        AuditService.log(
            actor=request.user,
            action='MERCHANT_SUBMITTED',
            entity='Merchant',
            entity_id=str(merchant.id),
            metadata={'merchant_name': merchant.name}
        )
        
        return Response(MerchantSerializer(merchant).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve merchant (admin only with APPROVE permission)."""
        # Check granular permission for APPROVE action
        if request.user.role in ['ADMIN', 'AUDITOR'] and not getattr(request.user, 'is_super_admin', False):
            if not PermissionService.has_module_permission(request.user, 'MERCHANTS', 'APPROVE'):
                return Response(
                    {'error': 'Vous n\'avez pas la permission d\'approuver les commerçants.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        merchant = self.get_object()
        
        if merchant.status != MerchantStatus.SUBMITTED:
            return Response(
                {'error': 'Only submitted merchants can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        merchant.status = MerchantStatus.APPROVED
        merchant.approved_at = timezone.now()
        merchant.approved_by = request.user
        merchant.save()
        
        AuditService.log(
            actor=request.user,
            action='MERCHANT_APPROVED',
            entity='Merchant',
            entity_id=str(merchant.id),
            metadata={'merchant_name': merchant.name}
        )
        
        return Response(MerchantSerializer(merchant).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject merchant (admin only with APPROVE permission)."""
        # Check granular permission for APPROVE action (reject is part of approval workflow)
        if request.user.role in ['ADMIN', 'AUDITOR'] and not getattr(request.user, 'is_super_admin', False):
            if not PermissionService.has_module_permission(request.user, 'MERCHANTS', 'APPROVE'):
                return Response(
                    {'error': 'Vous n\'avez pas la permission de rejeter les commerçants.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        merchant = self.get_object()
        serializer = MerchantRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if merchant.status != MerchantStatus.SUBMITTED:
            return Response(
                {'error': 'Only submitted merchants can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        merchant.status = MerchantStatus.REJECTED
        merchant.status_reason = serializer.validated_data['reason']
        merchant.save()
        
        AuditService.log(
            actor=request.user,
            action='MERCHANT_REJECTED',
            entity='Merchant',
            entity_id=str(merchant.id),
            metadata={'merchant_name': merchant.name, 'reason': merchant.status_reason}
        )
        
        return Response(MerchantSerializer(merchant).data)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspend merchant (admin only)."""
        merchant = self.get_object()
        serializer = MerchantSuspendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if merchant.status != MerchantStatus.APPROVED:
            return Response(
                {'error': 'Only approved merchants can be suspended'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        merchant.status = MerchantStatus.SUSPENDED
        merchant.status_reason = serializer.validated_data['reason']
        merchant.save()
        
        AuditService.log(
            actor=request.user,
            action='MERCHANT_SUSPENDED',
            entity='Merchant',
            entity_id=str(merchant.id),
            metadata={'merchant_name': merchant.name, 'reason': merchant.status_reason}
        )
        
        return Response(MerchantSerializer(merchant).data)

    @action(detail=True, methods=['post'])
    def unsuspend(self, request, pk=None):
        """Unsuspend merchant (admin only)."""
        merchant = self.get_object()
        
        if merchant.status != MerchantStatus.SUSPENDED:
            return Response(
                {'error': 'Only suspended merchants can be unsuspended'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        merchant.status = MerchantStatus.APPROVED
        merchant.status_reason = ''
        merchant.save()
        
        AuditService.log(
            actor=request.user,
            action='MERCHANT_UNSUSPENDED',
            entity='Merchant',
            entity_id=str(merchant.id),
            metadata={'merchant_name': merchant.name}
        )
        
        return Response(MerchantSerializer(merchant).data)


class OutletViewSet(viewsets.ModelViewSet):
    """ViewSet for outlet management."""
    
    queryset = Outlet.objects.all()
    permission_classes = [IsAuthenticated]
    filterset_fields = ['merchant', 'is_active', 'city']
    search_fields = ['name', 'code', 'city']
    ordering_fields = ['created_at', 'name']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OutletDetailSerializer
        return OutletSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_merchant_user() and user.merchant:
            queryset = queryset.filter(merchant=user.merchant)
        elif not user.is_admin() and not user.is_auditor():
            queryset = queryset.none()
        
        return queryset


class POSDeviceViewSet(viewsets.ModelViewSet):
    """ViewSet for POS device management."""
    
    queryset = POSDevice.objects.all()
    permission_classes = [IsAuthenticated]
    filterset_fields = ['outlet', 'is_active']
    search_fields = ['name', 'device_id']

    def get_serializer_class(self):
        if self.action == 'create':
            return POSDeviceCreateSerializer
        return POSDeviceSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_merchant_user() and user.merchant:
            queryset = queryset.filter(outlet__merchant=user.merchant)
        elif not user.is_admin():
            queryset = queryset.none()
        
        return queryset

    @action(detail=True, methods=['post'])
    def regenerate_key(self, request, pk=None):
        """Regenerate API key for POS device."""
        device = self.get_object()
        new_key = device.regenerate_api_key()
        
        AuditService.log(
            actor=request.user,
            action='POS_KEY_REGENERATED',
            entity='POSDevice',
            entity_id=str(device.id),
            metadata={'device_name': device.name}
        )
        
        return Response({
            'api_key': new_key,
            'message': 'API key regenerated. Store it securely, it will not be shown again.'
        })


# ============================================
# MERCHANT DASHBOARD API
# ============================================

from rest_framework.views import APIView
from django.db.models import Sum, Count, Max, Avg
from datetime import timedelta


class MerchantDashboardView(APIView):
    """Dashboard statistics for merchant."""
    permission_classes = [IsAuthenticated, IsMerchantOnly]
    
    def get(self, request):
        from apps.taxfree.models import TaxFreeForm
        from apps.sales.models import SaleInvoice
        
        user = request.user
        merchant = user.merchant
        
        if not merchant:
            return Response({'detail': 'Merchant not found'}, status=404)
        
        # Get date range (default: current month)
        today = timezone.now()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start_of_prev_month = (start_of_month - timedelta(days=1)).replace(day=1)
        
        # Base queryset for forms (ALL forms for status counts)
        all_forms_qs = TaxFreeForm.objects.filter(invoice__merchant=merchant)
        all_forms_this_month = all_forms_qs.filter(created_at__gte=start_of_month)
        
        # Queryset excluding cancelled forms (for financial calculations)
        forms_qs = all_forms_qs.exclude(status='CANCELLED')
        forms_this_month = forms_qs.filter(created_at__gte=start_of_month)
        forms_prev_month = forms_qs.filter(created_at__gte=start_of_prev_month, created_at__lt=start_of_month)
        
        # Count by status (use ALL forms for status display)
        status_counts = all_forms_this_month.values('status').annotate(count=Count('id'))
        status_dict = {item['status']: item['count'] for item in status_counts}
        
        # Total excludes cancelled for financial metrics
        total = forms_this_month.count()
        total_all = all_forms_this_month.count()  # For status percentages
        
        # REFUNDED forms have been validated first, so count them as validated too
        validated_only = status_dict.get('VALIDATED', 0)
        refunded = status_dict.get('REFUNDED', 0)
        # Total validated = VALIDATED + REFUNDED (refunded implies validated)
        validated = validated_only + refunded
        
        pending = status_dict.get('ISSUED', 0) + status_dict.get('PENDING', 0) + status_dict.get('CREATED', 0) + status_dict.get('VALIDATION_PENDING', 0)
        refused = status_dict.get('REFUSED', 0)
        cancelled = status_dict.get('CANCELLED', 0)
        
        # TVA/Refund amounts (excluding cancelled forms)
        total_refund = forms_this_month.aggregate(total=Sum('refund_amount'))['total'] or 0
        prev_month_refund = forms_prev_month.aggregate(total=Sum('refund_amount'))['total'] or 0
        
        # Calculate growth percentage (compare to previous month)
        # If no previous month data, calculate based on total forms count change
        growth_pct = 0
        if prev_month_refund > 0:
            growth_pct = round(((total_refund - prev_month_refund) / prev_month_refund) * 100, 1)
        elif total_refund > 0 and forms_prev_month.count() == 0:
            # First month with data - show positive growth indicator
            growth_pct = 100.0
        
        # Best form (highest refund amount - TVA, excluding cancelled)
        best_form = forms_this_month.order_by('-refund_amount').first()
        best_amount = float(best_form.refund_amount) if best_form else 0
        
        # Total sales amount (excluding cancelled forms)
        total_sales = forms_this_month.aggregate(total=Sum('invoice__total_amount'))['total'] or 0
        
        # Nationalities breakdown (excluding cancelled forms)
        nationalities = forms_this_month.values(
            'traveler__nationality'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        nationality_data = []
        for nat in nationalities:
            country_code = nat['traveler__nationality'] or ''
            count = nat['count']
            pct = round((count / total * 100), 0) if total > 0 else 0
            flag = self._get_flag(country_code)
            country_name = self._get_country_name(country_code)
            nationality_data.append({
                'name': country_name,
                'flag': flag,
                'count': count,
                'percentage': int(pct)
            })
        
        # Daily forms for chart (last 7 days, excluding cancelled)
        daily_data = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            count = forms_qs.filter(created_at__gte=day_start, created_at__lt=day_end).count()
            daily_data.append({
                'day': day.strftime('%a'),
                'count': count
            })
        
        # Monthly data for chart (last 12 months, excluding cancelled)
        monthly_data = []
        for i in range(11, -1, -1):
            month_start = (today.replace(day=1) - timedelta(days=i*30)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1)
            month_forms = forms_qs.filter(
                created_at__gte=month_start, 
                created_at__lt=month_end
            )
            amount = month_forms.aggregate(total=Sum('refund_amount'))['total'] or 0
            count = month_forms.count()
            # VALIDATED + REFUNDED = total validated (refunded implies validated)
            validated_count = month_forms.filter(status__in=['VALIDATED', 'REFUNDED']).count()
            validation_rate = round((validated_count / count * 100), 0) if count > 0 else 0
            monthly_data.append({
                'month': month_start.strftime('%b'),
                'amount': float(amount),
                'count': count,
                'validation_rate': validation_rate
            })
        
        return Response({
            'period': 'month',
            'total_forms': total,
            'validated': validated,
            'pending': pending,
            'refused': refused,
            'refunded': refunded,
            'cancelled': cancelled,
            'total_refund_amount': float(total_refund),
            'total_sales_amount': float(total_sales),
            'growth_percentage': growth_pct,
            'best_form_amount': best_amount,
            'validation_rate': round((validated / total * 100), 0) if total > 0 else 0,
            'refund_rate': round((refunded / validated * 100), 0) if validated > 0 else 0,
            'nationalities': nationality_data,
            'daily_chart': daily_data,
            'monthly_chart': monthly_data,
        })
    
    def _get_flag(self, country_code):
        """Get flag emoji from ISO 3166-1 alpha-2 country code."""
        if not country_code or len(country_code) != 2:
            return '🌍'
        # Convert country code to flag emoji (A=🇦, B=🇧, etc.)
        # Regional indicator symbols: A = U+1F1E6, B = U+1F1E7, etc.
        try:
            flag = ''.join(chr(0x1F1E6 + ord(c.upper()) - ord('A')) for c in country_code)
            return flag
        except:
            return '🌍'
    
    def _get_country_name(self, country_code):
        """Get country name from ISO 3166-1 alpha-2 code."""
        names = {
            'FR': 'France', 'BE': 'Belgique', 'US': 'USA', 'DE': 'Allemagne',
            'IT': 'Italie', 'ES': 'Espagne', 'GB': 'Royaume-Uni', 'UK': 'Royaume-Uni',
            'CH': 'Suisse', 'CA': 'Canada', 'CN': 'Chine', 'JP': 'Japon',
            'CD': 'RDC', 'CG': 'Congo', 'ZA': 'Afrique du Sud', 'NG': 'Nigeria',
            'KE': 'Kenya', 'TZ': 'Tanzanie', 'UG': 'Ouganda', 'RW': 'Rwanda',
            'AO': 'Angola', 'ZM': 'Zambie', 'ZW': 'Zimbabwe', 'MW': 'Malawi',
            'MZ': 'Mozambique', 'BW': 'Botswana', 'NA': 'Namibie', 'SZ': 'Eswatini',
            'LS': 'Lesotho', 'MG': 'Madagascar', 'MU': 'Maurice', 'SC': 'Seychelles',
            'NL': 'Pays-Bas', 'PT': 'Portugal', 'AT': 'Autriche', 'PL': 'Pologne',
            'SE': 'Suède', 'NO': 'Norvège', 'DK': 'Danemark', 'FI': 'Finlande',
            'IE': 'Irlande', 'GR': 'Grèce', 'CZ': 'Tchéquie', 'HU': 'Hongrie',
            'RO': 'Roumanie', 'BG': 'Bulgarie', 'HR': 'Croatie', 'SK': 'Slovaquie',
            'SI': 'Slovénie', 'LT': 'Lituanie', 'LV': 'Lettonie', 'EE': 'Estonie',
            'LU': 'Luxembourg', 'MT': 'Malte', 'CY': 'Chypre',
            'AU': 'Australie', 'NZ': 'Nouvelle-Zélande', 'IN': 'Inde',
            'BR': 'Brésil', 'AR': 'Argentine', 'MX': 'Mexique', 'CO': 'Colombie',
            'RU': 'Russie', 'TR': 'Turquie', 'SA': 'Arabie Saoudite', 'AE': 'Émirats',
            'IL': 'Israël', 'EG': 'Égypte', 'MA': 'Maroc', 'TN': 'Tunisie',
            'DZ': 'Algérie', 'LB': 'Liban', 'JO': 'Jordanie', 'KW': 'Koweït',
            'QA': 'Qatar', 'BH': 'Bahreïn', 'OM': 'Oman',
            'KR': 'Corée du Sud', 'TH': 'Thaïlande', 'VN': 'Vietnam',
            'MY': 'Malaisie', 'SG': 'Singapour', 'ID': 'Indonésie', 'PH': 'Philippines',
        }
        return names.get(country_code.upper() if country_code else '', country_code or 'Inconnu')


# ============================================
# MERCHANT USER MANAGEMENT VIEWS
# ============================================

from apps.accounts.models import User, UserRole, MerchantUserInvitation
from apps.accounts.services import EmailService
from .serializers import (
    MerchantUserSerializer, MerchantUserUpdateSerializer,
    MerchantUserInviteSerializer, MerchantInvitationSerializer,
    OutletCreateSerializer
)


class MerchantOutletViewSet(viewsets.ModelViewSet):
    """
    ViewSet for merchant to manage their own outlets.
    Only accessible by merchant admins.
    """
    permission_classes = [IsAuthenticated, IsMerchantOnly]
    filterset_fields = ['is_active', 'city']
    search_fields = ['name', 'code', 'city']
    ordering_fields = ['created_at', 'name']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return OutletCreateSerializer
        if self.action == 'retrieve':
            return OutletDetailSerializer
        return OutletSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.merchant:
            return Outlet.objects.none()
        return Outlet.objects.filter(merchant=user.merchant)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['merchant'] = self.request.user.merchant
        return context

    def perform_create(self, serializer):
        outlet = serializer.save(merchant=self.request.user.merchant)
        AuditService.log(
            actor=self.request.user,
            action='OUTLET_CREATED',
            entity='Outlet',
            entity_id=str(outlet.id),
            metadata={'outlet_name': outlet.name, 'merchant': outlet.merchant.name}
        )

    def perform_update(self, serializer):
        outlet = serializer.save()
        AuditService.log(
            actor=self.request.user,
            action='OUTLET_UPDATED',
            entity='Outlet',
            entity_id=str(outlet.id),
            metadata={'outlet_name': outlet.name}
        )

    def perform_destroy(self, instance):
        # Soft delete - just deactivate
        instance.is_active = False
        instance.save()
        AuditService.log(
            actor=self.request.user,
            action='OUTLET_DEACTIVATED',
            entity='Outlet',
            entity_id=str(instance.id),
            metadata={'outlet_name': instance.name}
        )

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Reactivate a deactivated outlet."""
        outlet = self.get_object()
        outlet.is_active = True
        outlet.save()
        AuditService.log(
            actor=request.user,
            action='OUTLET_ACTIVATED',
            entity='Outlet',
            entity_id=str(outlet.id),
            metadata={'outlet_name': outlet.name}
        )
        return Response(OutletSerializer(outlet).data)


class MerchantUserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for merchant to manage their users/employees.
    Only accessible by merchant admins.
    """
    permission_classes = [IsAuthenticated, IsMerchantOnly]
    filterset_fields = ['role', 'outlet_id', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'last_name', 'email']

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return MerchantUserUpdateSerializer
        return MerchantUserSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.merchant:
            return User.objects.none()
        # Get all users belonging to this merchant
        return User.objects.filter(
            merchant_id=user.merchant.id,
            role__in=[UserRole.MERCHANT, UserRole.MERCHANT_EMPLOYEE]
        ).select_related()

    def perform_update(self, serializer):
        user_obj = serializer.save()
        AuditService.log(
            actor=self.request.user,
            action='MERCHANT_USER_UPDATED',
            entity='User',
            entity_id=str(user_obj.id),
            metadata={'user_email': user_obj.email}
        )

    def destroy(self, request, *args, **kwargs):
        """Deactivate user instead of deleting."""
        user_obj = self.get_object()
        
        # Cannot deactivate yourself
        if user_obj.id == request.user.id:
            return Response(
                {'detail': 'Vous ne pouvez pas désactiver votre propre compte.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_obj.is_active = False
        user_obj.save()
        
        AuditService.log(
            actor=request.user,
            action='MERCHANT_USER_DEACTIVATED',
            entity='User',
            entity_id=str(user_obj.id),
            metadata={'user_email': user_obj.email}
        )
        
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Reactivate a deactivated user."""
        user_obj = self.get_object()
        user_obj.is_active = True
        user_obj.save()
        
        AuditService.log(
            actor=request.user,
            action='MERCHANT_USER_ACTIVATED',
            entity='User',
            entity_id=str(user_obj.id),
            metadata={'user_email': user_obj.email}
        )
        
        return Response(MerchantUserSerializer(user_obj).data)

    @action(detail=True, methods=['get'])
    def activity(self, request, pk=None):
        """Get activity history for a specific user."""
        from apps.audit.models import AuditLog
        
        user_obj = self.get_object()
        
        # Get audit logs for this user by actor_id (last 50)
        logs = AuditLog.objects.filter(actor_id=user_obj.id).order_by('-timestamp')[:50]
        
        activity_data = []
        for log in logs:
            activity_data.append({
                'id': str(log.id),
                'action': log.action,
                'entity': log.entity,
                'entity_id': log.entity_id,
                'metadata': log.metadata,
                'timestamp': log.timestamp,
                'ip_address': log.actor_ip,
            })
        
        return Response({
            'user_id': str(user_obj.id),
            'user_email': user_obj.email,
            'activities': activity_data,
            'total_count': AuditLog.objects.filter(actor_id=user_obj.id).count()
        })

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get detailed statistics for a specific user."""
        from apps.taxfree.models import TaxFreeForm
        from apps.sales.models import SaleInvoice
        from django.db.models import Sum, Count
        from django.utils import timezone
        from datetime import timedelta
        
        user_obj = self.get_object()
        
        # Forms created
        forms = TaxFreeForm.objects.filter(created_by=user_obj)
        total_forms = forms.count()
        
        # Forms by status
        forms_by_status = forms.values('status').annotate(count=Count('id'))
        
        # Sales statistics
        total_sales = forms.aggregate(total=Sum('invoice__total_amount'))['total'] or 0
        total_refunds = forms.aggregate(total=Sum('refund_amount'))['total'] or 0
        
        # Recent activity (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_forms = forms.filter(created_at__gte=thirty_days_ago).count()
        recent_sales = forms.filter(created_at__gte=thirty_days_ago).aggregate(
            total=Sum('invoice__total_amount')
        )['total'] or 0
        
        return Response({
            'user_id': str(user_obj.id),
            'user_email': user_obj.email,
            'total_forms_created': total_forms,
            'forms_by_status': {item['status']: item['count'] for item in forms_by_status},
            'total_sales_amount': float(total_sales),
            'total_refunds_amount': float(total_refunds),
            'last_30_days': {
                'forms_created': recent_forms,
                'sales_amount': float(recent_sales),
            },
            'last_login': user_obj.last_login,
            'account_created': user_obj.created_at,
        })

    @action(detail=False, methods=['post'])
    def invite(self, request):
        """Invite a new user to join the merchant."""
        serializer = MerchantUserInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        merchant = request.user.merchant
        
        # Validate outlet belongs to merchant if provided
        outlet = None
        if data.get('outlet_id'):
            outlet = Outlet.objects.filter(
                id=data['outlet_id'],
                merchant=merchant
            ).first()
            if not outlet:
                return Response(
                    {'detail': 'Point de vente invalide.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            invitation = MerchantUserInvitation.create_invitation(
                merchant=merchant,
                invited_by=request.user,
                email=data['email'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                phone=data.get('phone', ''),
                role=data['role'],
                outlet=outlet
            )
            
            # Send invitation email
            from django.conf import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5174')
            invitation_url = f"{frontend_url}/accept-invitation/{invitation.token}"
            
            EmailService.send_merchant_invitation_email(
                invitation=invitation,
                invitation_url=invitation_url
            )
            
            AuditService.log(
                actor=request.user,
                action='MERCHANT_USER_INVITED',
                entity='MerchantUserInvitation',
                entity_id=str(invitation.id),
                metadata={
                    'invited_email': invitation.email,
                    'role': invitation.role,
                    'outlet': outlet.name if outlet else None
                }
            )
            
            return Response(
                MerchantInvitationSerializer(invitation).data,
                status=status.HTTP_201_CREATED
            )
            
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def invitations(self, request):
        """List pending invitations for this merchant."""
        merchant = request.user.merchant
        invitations = MerchantUserInvitation.objects.filter(
            merchant=merchant,
            is_accepted=False
        ).order_by('-created_at')
        
        serializer = MerchantInvitationSerializer(invitations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='invitations/(?P<invitation_id>[^/.]+)/resend')
    def resend_invitation(self, request, invitation_id=None):
        """Resend an invitation email."""
        merchant = request.user.merchant
        
        try:
            invitation = MerchantUserInvitation.objects.get(
                id=invitation_id,
                merchant=merchant,
                is_accepted=False
            )
        except MerchantUserInvitation.DoesNotExist:
            return Response(
                {'detail': 'Invitation non trouvée.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Extend expiration
        from django.utils import timezone
        invitation.expires_at = timezone.now() + timezone.timedelta(days=7)
        invitation.save()
        
        # Resend email
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5174')
        invitation_url = f"{frontend_url}/accept-invitation/{invitation.token}"
        
        EmailService.send_merchant_invitation_email(
            invitation=invitation,
            invitation_url=invitation_url
        )
        
        return Response({'detail': 'Invitation renvoyée avec succès.'})

    @action(detail=False, methods=['delete'], url_path='invitations/(?P<invitation_id>[^/.]+)')
    def cancel_invitation(self, request, invitation_id=None):
        """Cancel a pending invitation."""
        merchant = request.user.merchant
        
        try:
            invitation = MerchantUserInvitation.objects.get(
                id=invitation_id,
                merchant=merchant,
                is_accepted=False
            )
        except MerchantUserInvitation.DoesNotExist:
            return Response(
                {'detail': 'Invitation non trouvée.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        invitation.delete()
        
        AuditService.log(
            actor=request.user,
            action='MERCHANT_INVITATION_CANCELLED',
            entity='MerchantUserInvitation',
            entity_id=str(invitation_id),
            metadata={'invited_email': invitation.email}
        )
        
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================
# MERCHANT TRAVELERS VIEW
# ============================================

class MerchantTravelersView(APIView):
    """API for merchant to view travelers who made purchases."""
    permission_classes = [IsAuthenticated, IsMerchantOnly]

    def get(self, request):
        user = request.user
        merchant = user.merchant
        if not merchant:
            return Response({'detail': 'Merchant not found'}, status=404)

        from apps.taxfree.models import TaxFreeForm, Traveler
        from django.db.models import Count, Sum, Max, Min

        # Get all travelers who have forms with this merchant
        traveler_ids = TaxFreeForm.objects.filter(
            invoice__merchant=merchant
        ).values_list('traveler_id', flat=True).distinct()

        travelers_data = []
        for traveler_id in traveler_ids:
            traveler = Traveler.objects.filter(id=traveler_id).first()
            if not traveler:
                continue

            # Get forms for this traveler at this merchant
            forms = TaxFreeForm.objects.filter(
                invoice__merchant=merchant,
                traveler=traveler
            )
            
            stats = forms.aggregate(
                total_forms=Count('id'),
                total_amount=Sum('invoice__total_amount'),
                total_refund=Sum('refund_amount'),
                first_visit=Min('created_at'),
                last_visit=Max('created_at')
            )

            # Status breakdown
            status_counts = forms.values('status').annotate(count=Count('id'))
            status_dict = {s['status']: s['count'] for s in status_counts}

            travelers_data.append({
                'id': str(traveler.id),
                'first_name': traveler.first_name,
                'last_name': traveler.last_name,
                'passport_last4': traveler.passport_number_last4,
                'nationality': traveler.nationality,
                'nationality_name': self._get_country_name(traveler.nationality),
                'flag': self._get_flag(traveler.nationality),
                'email': traveler.email,
                'phone': traveler.phone,
                'total_forms': stats['total_forms'] or 0,
                'total_amount': float(stats['total_amount'] or 0),
                'total_refund': float(stats['total_refund'] or 0),
                'first_visit': stats['first_visit'],
                'last_visit': stats['last_visit'],
                'status_breakdown': {
                    'validated': status_dict.get('VALIDATED', 0),
                    'pending': status_dict.get('ISSUED', 0) + status_dict.get('PENDING', 0) + status_dict.get('CREATED', 0),
                    'refunded': status_dict.get('REFUNDED', 0),
                    'cancelled': status_dict.get('CANCELLED', 0),
                    'refused': status_dict.get('REFUSED', 0),
                }
            })

        # Sort by last visit (most recent first)
        travelers_data.sort(key=lambda x: x['last_visit'] or '', reverse=True)

        return Response({
            'count': len(travelers_data),
            'travelers': travelers_data
        })

    def _get_flag(self, country_code):
        if not country_code or len(country_code) != 2:
            return '🌍'
        try:
            return ''.join(chr(0x1F1E6 + ord(c.upper()) - ord('A')) for c in country_code)
        except:
            return '🌍'

    def _get_country_name(self, country_code):
        names = {
            'FR': 'France', 'BE': 'Belgique', 'US': 'USA', 'DE': 'Allemagne',
            'IT': 'Italie', 'ES': 'Espagne', 'GB': 'Royaume-Uni', 'CH': 'Suisse',
            'CA': 'Canada', 'CN': 'Chine', 'JP': 'Japon', 'CD': 'RDC',
            'ZA': 'Afrique du Sud', 'NG': 'Nigeria', 'KE': 'Kenya',
        }
        return names.get(country_code.upper() if country_code else '', country_code or 'Inconnu')


class MerchantTravelerDetailView(APIView):
    """API for merchant to view a specific traveler's history."""
    permission_classes = [IsAuthenticated, IsMerchantOnly]

    def get(self, request, traveler_id):
        user = request.user
        merchant = user.merchant
        if not merchant:
            return Response({'detail': 'Merchant not found'}, status=404)

        from apps.taxfree.models import TaxFreeForm, Traveler

        traveler = Traveler.objects.filter(id=traveler_id).first()
        if not traveler:
            return Response({'detail': 'Traveler not found'}, status=404)

        # Get all forms for this traveler at this merchant
        forms = TaxFreeForm.objects.filter(
            invoice__merchant=merchant,
            traveler=traveler
        ).select_related('invoice', 'invoice__outlet').order_by('-created_at')

        forms_data = []
        for form in forms:
            forms_data.append({
                'id': str(form.id),
                'form_number': form.form_number,
                'status': form.status,
                'total_amount': float(form.invoice.total_amount) if form.invoice else 0,
                'refund_amount': float(form.refund_amount) if form.refund_amount else 0,
                'outlet_name': form.invoice.outlet.name if form.invoice and form.invoice.outlet else 'N/A',
                'created_at': form.created_at.isoformat() if form.created_at else None,
                'validated_at': form.validated_at.isoformat() if form.validated_at else None,
                'issued_at': form.issued_at.isoformat() if form.issued_at else None,
            })

        return Response({
            'traveler': {
                'id': str(traveler.id),
                'first_name': traveler.first_name,
                'last_name': traveler.last_name,
                'passport_last4': traveler.passport_number_last4,
                'passport_country': traveler.passport_country,
                'nationality': traveler.nationality,
                'email': traveler.email,
                'phone': traveler.phone,
                'date_of_birth': traveler.date_of_birth,
                'residence_country': traveler.residence_country,
            },
            'forms': forms_data,
            'total_forms': len(forms_data),
        })


# ============================================
# MERCHANT REPORTS VIEW
# ============================================

class MerchantReportsView(APIView):
    """API for merchant reports generation."""
    permission_classes = [IsAuthenticated, IsMerchantOnly]

    def get(self, request):
        user = request.user
        merchant = user.merchant
        if not merchant:
            return Response({'detail': 'Merchant not found'}, status=404)

        from apps.taxfree.models import TaxFreeForm
        from django.db.models import Count, Sum, Avg

        # Get date range from query params
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # All forms for status counts
        all_forms_qs = TaxFreeForm.objects.filter(invoice__merchant=merchant)

        if start_date:
            all_forms_qs = all_forms_qs.filter(created_at__date__gte=start_date)
        if end_date:
            all_forms_qs = all_forms_qs.filter(created_at__date__lte=end_date)

        # Forms excluding cancelled (for financial calculations)
        forms_qs = all_forms_qs.exclude(status='CANCELLED')

        # Global stats (excluding cancelled)
        global_stats = forms_qs.aggregate(
            total_forms=Count('id'),
            total_sales=Sum('invoice__total_amount'),
            total_refund=Sum('refund_amount'),
            avg_amount=Avg('invoice__total_amount'),
        )

        # Status breakdown (ALL forms for display)
        status_counts = all_forms_qs.values('status').annotate(count=Count('id'))
        status_dict = {s['status']: s['count'] for s in status_counts}

        # By outlet (excluding cancelled)
        outlet_stats = forms_qs.values(
            'invoice__outlet__id', 'invoice__outlet__name', 'invoice__outlet__code'
        ).annotate(
            forms_count=Count('id'),
            total_sales=Sum('invoice__total_amount'),
            total_refund=Sum('refund_amount'),
        ).order_by('-forms_count')

        outlets_data = []
        for o in outlet_stats:
            if o['invoice__outlet__id']:
                outlets_data.append({
                    'id': str(o['invoice__outlet__id']),
                    'name': o['invoice__outlet__name'],
                    'code': o['invoice__outlet__code'],
                    'forms_count': o['forms_count'],
                    'total_sales': float(o['total_sales'] or 0),
                    'total_refund': float(o['total_refund'] or 0),
                })

        # By nationality (excluding cancelled)
        nationality_stats = forms_qs.values('traveler__nationality').annotate(
            count=Count('id'),
            total_amount=Sum('invoice__total_amount'),
        ).order_by('-count')[:10]

        nationalities_data = []
        for n in nationality_stats:
            code = n['traveler__nationality']
            nationalities_data.append({
                'code': code,
                'name': self._get_country_name(code),
                'flag': self._get_flag(code),
                'count': n['count'],
                'total_amount': float(n['total_amount'] or 0),
            })

        # Monthly breakdown (excluding cancelled)
        from django.db.models.functions import TruncMonth
        monthly_stats = forms_qs.annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            forms_count=Count('id'),
            total_sales=Sum('invoice__total_amount'),
            total_refund=Sum('refund_amount'),
            validated=Count('id', filter=Q(status='VALIDATED')),
        ).order_by('month')

        monthly_data = []
        for m in monthly_stats:
            if m['month']:
                monthly_data.append({
                    'month': m['month'].strftime('%Y-%m'),
                    'month_label': m['month'].strftime('%B %Y'),
                    'forms_count': m['forms_count'],
                    'total_sales': float(m['total_sales'] or 0),
                    'total_refund': float(m['total_refund'] or 0),
                    'validated': m['validated'],
                    'validation_rate': round((m['validated'] / m['forms_count'] * 100), 1) if m['forms_count'] > 0 else 0,
                })

        # Detailed forms list for export (ALL forms including cancelled for display)
        forms_detail = all_forms_qs.select_related(
            'invoice__outlet', 'traveler'
        ).order_by('-created_at')[:500]  # Limit to 500 for performance

        forms_list = []
        for form in forms_detail:
            try:
                invoice = form.invoice
                outlet = invoice.outlet if invoice else None
                traveler = form.traveler
                forms_list.append({
                    'form_number': form.form_number,
                    'status': form.status,
                    'created_at': form.created_at.strftime('%d/%m/%Y %H:%M') if form.created_at else '',
                    'validated_at': form.validated_at.strftime('%d/%m/%Y %H:%M') if form.validated_at else '',
                    'issued_at': form.issued_at.strftime('%d/%m/%Y %H:%M') if form.issued_at else '',
                    'outlet_name': outlet.name if outlet else 'N/A',
                    'outlet_code': outlet.code if outlet else '',
                    'traveler_name': f"{traveler.first_name} {traveler.last_name}" if traveler else 'N/A',
                    'traveler_passport': f"***{traveler.passport_number_last4}" if traveler else '',
                    'traveler_nationality': self._get_country_name(traveler.nationality) if traveler else '',
                    'total_amount': float(invoice.total_amount) if invoice else 0,
                    'tva_amount': float(invoice.total_vat) if invoice else 0,
                    'refund_amount': float(form.refund_amount) if form.refund_amount else 0,
                    'items_count': invoice.items.count() if invoice else 0,
                })
            except Exception:
                continue

        return Response({
            'merchant': {
                'id': str(merchant.id),
                'name': merchant.name,
                'trade_name': merchant.trade_name,
            },
            'period': {
                'start_date': start_date,
                'end_date': end_date,
            },
            'summary': {
                'total_forms': global_stats['total_forms'] or 0,
                'total_sales': float(global_stats['total_sales'] or 0),
                'total_refund': float(global_stats['total_refund'] or 0),
                'avg_amount': float(global_stats['avg_amount'] or 0),
                'validated': status_dict.get('VALIDATED', 0),
                'pending': status_dict.get('ISSUED', 0) + status_dict.get('PENDING', 0) + status_dict.get('CREATED', 0),
                'refunded': status_dict.get('REFUNDED', 0),
                'cancelled': status_dict.get('CANCELLED', 0),
                'refused': status_dict.get('REFUSED', 0),
            },
            'by_outlet': outlets_data,
            'by_nationality': nationalities_data,
            'by_month': monthly_data,
            'forms_detail': forms_list,
        })

    def _get_flag(self, country_code):
        if not country_code or len(country_code) != 2:
            return '🌍'
        try:
            return ''.join(chr(0x1F1E6 + ord(c.upper()) - ord('A')) for c in country_code)
        except:
            return '🌍'

    def _get_country_name(self, country_code):
        names = {
            'FR': 'France', 'BE': 'Belgique', 'US': 'USA', 'DE': 'Allemagne',
            'IT': 'Italie', 'ES': 'Espagne', 'GB': 'Royaume-Uni', 'CH': 'Suisse',
            'CA': 'Canada', 'CN': 'Chine', 'JP': 'Japon', 'CD': 'RDC',
            'ZA': 'Afrique du Sud', 'NG': 'Nigeria', 'KE': 'Kenya',
        }
        return names.get(country_code.upper() if country_code else '', country_code or 'Inconnu')
