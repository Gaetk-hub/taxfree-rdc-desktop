"""
Admin views for user management and permissions.
"""
from rest_framework import viewsets, status, filters, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q
from django.utils import timezone
from django.conf import settings

from .permissions import IsAdmin, PermissionService
from .models import User, UserRole, Notification, NotificationType
from .admin_models import (
    UserPermission, PermissionPreset, SystemUserInvitation,
    PermissionModule, PermissionAction, SystemUserInvitationStatus,
    MODULE_ACTIONS
)
from .admin_serializers import (
    AdminUserListSerializer, AdminUserDetailSerializer,
    UserPermissionSerializer, PermissionPresetSerializer,
    SystemUserInvitationSerializer, CreateSystemUserInvitationSerializer,
    ActivateSystemUserSerializer, AssignPermissionsSerializer,
    ApplyPresetSerializer, UserStatsSerializer
)
from .services import EmailService, SystemUserEmailService


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Enhanced ViewSet for admin user management with full context.
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'phone', 'agent_code']
    ordering_fields = ['created_at', 'email', 'last_login', 'first_name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AdminUserDetailSerializer
        return AdminUserListSerializer

    def get_queryset(self):
        queryset = super().get_queryset().prefetch_related('custom_permissions')
        
        params = self.request.query_params
        
        # Filter by user type
        user_type = params.get('user_type')
        if user_type == 'SYSTEM':
            queryset = queryset.filter(role__in=['ADMIN', 'AUDITOR', 'OPERATOR'])
        elif user_type == 'MERCHANT':
            queryset = queryset.filter(role__in=['MERCHANT', 'MERCHANT_EMPLOYEE'])
        elif user_type == 'CUSTOMS':
            queryset = queryset.filter(role='CUSTOMS_AGENT')
        elif user_type == 'TRAVELER':
            queryset = queryset.filter(role='TRAVELER')
        
        # Filter by merchant
        merchant_id = params.get('merchant')
        if merchant_id:
            queryset = queryset.filter(merchant_id=merchant_id)
        
        # Filter by point of exit (border)
        point_of_exit_id = params.get('point_of_exit')
        if point_of_exit_id:
            queryset = queryset.filter(point_of_exit_id=point_of_exit_id)
        
        # Filter by has permissions
        has_permissions = params.get('has_permissions')
        if has_permissions == 'true':
            queryset = queryset.filter(custom_permissions__isnull=False).distinct()
        elif has_permissions == 'false':
            queryset = queryset.filter(custom_permissions__isnull=True)
        
        return queryset

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get user statistics."""
        queryset = User.objects.all()
        
        # Count by role
        by_role = {}
        for role in UserRole.choices:
            by_role[role[0]] = queryset.filter(role=role[0]).count()
        
        # Count by type
        by_type = {
            'SYSTEM': queryset.filter(role__in=['ADMIN', 'AUDITOR', 'OPERATOR']).count(),
            'MERCHANT': queryset.filter(role__in=['MERCHANT', 'MERCHANT_EMPLOYEE']).count(),
            'CUSTOMS': queryset.filter(role='CUSTOMS_AGENT').count(),
            'TRAVELER': queryset.filter(role='TRAVELER').count(),
        }
        
        # Recent signups (last 30 days)
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        recent = queryset.filter(created_at__gte=thirty_days_ago).count()
        
        # Pending invitations
        pending_invitations = SystemUserInvitation.objects.filter(
            status=SystemUserInvitationStatus.PENDING
        ).count()
        
        return Response({
            'total': queryset.count(),
            'active': queryset.filter(is_active=True).count(),
            'inactive': queryset.filter(is_active=False).count(),
            'by_role': by_role,
            'by_type': by_type,
            'recent_signups': recent,
            'pending_invitations': pending_invitations,
        })

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle user active status."""
        user = self.get_object()
        
        # Prevent self-deactivation
        if user.id == request.user.id:
            return Response(
                {'detail': 'Vous ne pouvez pas désactiver votre propre compte.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = not user.is_active
        user.save()
        
        return Response({
            'detail': f"Utilisateur {'activé' if user.is_active else 'désactivé'}.",
            'is_active': user.is_active
        })

    @action(detail=True, methods=['get', 'post', 'delete'])
    def permissions(self, request, pk=None):
        """Manage user permissions."""
        user = self.get_object()
        
        if request.method == 'GET':
            permissions = user.custom_permissions.all()
            serializer = UserPermissionSerializer(permissions, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = AssignPermissionsSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Add new permissions
            added = []
            for perm in serializer.validated_data['permissions']:
                obj, created = UserPermission.objects.get_or_create(
                    user=user,
                    module=perm['module'],
                    action=perm['action'],
                    defaults={'granted_by': request.user}
                )
                if created:
                    added.append(f"{perm['module']}:{perm['action']}")
            
            return Response({
                'detail': f'{len(added)} permission(s) ajoutée(s).',
                'added': added
            })
        
        elif request.method == 'DELETE':
            serializer = AssignPermissionsSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Remove permissions
            removed = 0
            for perm in serializer.validated_data['permissions']:
                deleted, _ = UserPermission.objects.filter(
                    user=user,
                    module=perm['module'],
                    action=perm['action']
                ).delete()
                removed += deleted
            
            return Response({
                'detail': f'{removed} permission(s) retirée(s).',
                'removed': removed
            })

    @action(detail=True, methods=['post'])
    def apply_preset(self, request, pk=None):
        """Apply a permission preset to user."""
        user = self.get_object()
        
        serializer = ApplyPresetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        preset = PermissionPreset.objects.get(id=serializer.validated_data['preset_id'])
        
        # Optionally clear existing permissions
        if serializer.validated_data.get('replace', False):
            user.custom_permissions.all().delete()
        
        # Apply preset permissions
        added = 0
        for perm in preset.permissions:
            _, created = UserPermission.objects.get_or_create(
                user=user,
                module=perm['module'],
                action=perm['action'],
                defaults={'granted_by': request.user}
            )
            if created:
                added += 1
        
        return Response({
            'detail': f'Preset "{preset.name}" appliqué. {added} permission(s) ajoutée(s).',
            'preset': preset.name,
            'added': added
        })

    @action(detail=True, methods=['delete'])
    def clear_permissions(self, request, pk=None):
        """Clear all permissions for a user."""
        user = self.get_object()
        count = user.custom_permissions.count()
        user.custom_permissions.all().delete()
        
        return Response({
            'detail': f'{count} permission(s) supprimée(s).',
            'removed': count
        })


class PermissionPresetViewSet(viewsets.ModelViewSet):
    """ViewSet for managing permission presets."""
    
    queryset = PermissionPreset.objects.all()
    serializer_class = PermissionPresetSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    @action(detail=False, methods=['get'])
    def modules(self, request):
        """Get available modules and actions with module-specific action mapping."""
        # Build action labels dict
        action_labels = {a[0]: a[1] for a in PermissionAction.choices}
        
        # Build modules with their available actions
        modules_with_actions = []
        for m in PermissionModule.choices:
            module_code = m[0]
            available_actions = MODULE_ACTIONS.get(module_code, ['VIEW'])
            modules_with_actions.append({
                'value': module_code,
                'label': m[1],
                'actions': [
                    {'value': a, 'label': action_labels.get(a, a)}
                    for a in available_actions
                ]
            })
        
        return Response({
            'modules': modules_with_actions,
            'actions': [
                {'value': a[0], 'label': a[1]}
                for a in PermissionAction.choices
            ],
            'module_actions': MODULE_ACTIONS
        })


class SystemUserInvitationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing system user invitations."""
    
    queryset = SystemUserInvitation.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'role']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateSystemUserInvitationSerializer
        return SystemUserInvitationSerializer

    def perform_create(self, serializer):
        invitation = serializer.save()
        
        # Send invitation email
        try:
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            activation_url = f"{frontend_url}/activate-system-user/{invitation.invitation_token}"
            SystemUserEmailService.send_system_user_invitation_email(invitation, activation_url)
        except Exception as e:
            # Log error but don't fail
            print(f"Failed to send invitation email: {e}")

    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """Resend invitation email."""
        invitation = self.get_object()
        
        if invitation.status == SystemUserInvitationStatus.ACCEPTED:
            return Response(
                {'detail': 'Cette invitation a déjà été acceptée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Regenerate token and extend expiry
        invitation.resend()
        
        # Send email
        try:
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            activation_url = f"{frontend_url}/activate-system-user/{invitation.invitation_token}"
            SystemUserEmailService.send_system_user_invitation_email(invitation, activation_url)
        except Exception as e:
            return Response(
                {'detail': f'Erreur lors de l\'envoi de l\'email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'detail': f'Invitation renvoyée à {invitation.email}.',
            'expires_at': invitation.expires_at
        })

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an invitation."""
        invitation = self.get_object()
        
        if invitation.status != SystemUserInvitationStatus.PENDING:
            return Response(
                {'detail': 'Seules les invitations en attente peuvent être annulées.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invitation.cancel()
        
        return Response({
            'detail': 'Invitation annulée.',
            'status': invitation.status
        })


class ActivateSystemUserView(views.APIView):
    """
    Public endpoint for activating a system user invitation.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, token):
        """Validate token and return invitation info."""
        try:
            invitation = SystemUserInvitation.objects.get(invitation_token=token)
        except SystemUserInvitation.DoesNotExist:
            return Response(
                {'detail': 'Lien d\'invitation invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not invitation.is_valid:
            if invitation.is_expired:
                return Response(
                    {'detail': 'Cette invitation a expiré.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {'detail': 'Cette invitation n\'est plus valide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'valid': True,
            'email': invitation.email,
            'first_name': invitation.first_name,
            'last_name': invitation.last_name,
            'role': invitation.role,
            'message': invitation.message,
            'expires_at': invitation.expires_at,
        })

    def post(self, request, token):
        """Activate the invitation and create user account."""
        try:
            invitation = SystemUserInvitation.objects.get(invitation_token=token)
        except SystemUserInvitation.DoesNotExist:
            return Response(
                {'detail': 'Lien d\'invitation invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ActivateSystemUserSerializer(data={
            'token': token,
            'password': request.data.get('password'),
            'password_confirm': request.data.get('password_confirm'),
        })
        serializer.is_valid(raise_exception=True)
        
        try:
            user = invitation.activate(serializer.validated_data['password'])
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Notify super admin only that user activated their account
        try:
            super_admin = User.objects.filter(is_super_admin=True, is_active=True).first()
            if super_admin:
                Notification.objects.create(
                    user=super_admin,
                    notification_type=NotificationType.GENERAL,
                    title='Nouveau compte activé',
                    message=f'{user.full_name} ({user.email}) a activé son compte {user.get_role_display()}.',
                    related_object_type='User',
                    related_object_id=user.id,
                    action_url=f'/admin/users/{user.id}'
                )
        except Exception:
            pass
        
        # Send welcome email
        try:
            EmailService.send_system_user_welcome_email(user)
        except Exception:
            pass
        
        return Response({
            'detail': 'Compte activé avec succès. Vous pouvez maintenant vous connecter.',
            'user': {
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
            }
        })


class SystemUsersPermissionsView(views.APIView):
    """
    View for managing permissions of system users only.
    Only ADMIN and AUDITOR can have granular permissions.
    Excludes: merchants, employees, customs agents, operators, and travelers.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        """Get all system users with their permissions."""
        # Only ADMIN and AUDITOR have granular permissions
        # OPERATOR uses role-based access to customs dashboard, not granular permissions
        users = User.objects.filter(
            role__in=['ADMIN', 'AUDITOR']
        ).prefetch_related('custom_permissions').order_by('first_name', 'last_name')
        
        result = []
        for user in users:
            permissions = user.custom_permissions.all()
            result.append({
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'role_display': user.get_role_display(),
                'is_active': user.is_active,
                'permissions': UserPermissionSerializer(permissions, many=True).data,
                'permissions_count': permissions.count(),
            })
        
        return Response(result)


class MyPermissionsView(views.APIView):
    """
    Get the current user's permissions.
    Returns modules and actions the user has access to.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Only ADMIN and AUDITOR have granular permissions
        if user.role not in ['ADMIN', 'AUDITOR']:
            return Response({
                'has_granular_permissions': False,
                'role': user.role,
                'message': 'Ce rôle utilise des permissions basées sur le rôle, pas des permissions granulaires.'
            })
        
        # Super admin has all permissions
        is_super_admin = getattr(user, 'is_super_admin', False)
        
        if is_super_admin:
            # Return all modules and actions
            all_modules = {m[0]: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'APPROVE', 'MANAGE'] 
                          for m in PermissionModule.choices}
            return Response({
                'has_granular_permissions': True,
                'is_super_admin': True,
                'role': user.role,
                'permissions': all_modules,
                'modules': list(all_modules.keys()),
                'accessible_routes': list(PermissionService.MODULE_ROUTES.values()),
            })
        
        # Get user's permissions
        permissions = PermissionService.get_user_permissions(user)
        modules = list(permissions.keys())
        accessible_routes = PermissionService.get_accessible_routes(user)
        
        return Response({
            'has_granular_permissions': True,
            'is_super_admin': False,
            'role': user.role,
            'permissions': permissions,
            'modules': modules,
            'accessible_routes': accessible_routes,
        })
