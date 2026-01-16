"""
Admin models for system user management and permissions.
"""
import uuid
import secrets
import string
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.conf import settings


class PermissionModule(models.TextChoices):
    """Available modules in the system."""
    DASHBOARD = 'DASHBOARD', _('Tableau de bord')
    MERCHANTS = 'MERCHANTS', _('Commerçants')
    USERS = 'USERS', _('Utilisateurs')
    FORMS = 'FORMS', _('Bordereaux')
    REFUNDS = 'REFUNDS', _('Remboursements')
    BORDERS = 'BORDERS', _('Frontières')
    AGENTS = 'AGENTS', _('Agents douaniers')
    RULES = 'RULES', _('Règles TVA')
    CATEGORIES = 'CATEGORIES', _('Catégories')
    AUDIT = 'AUDIT', _('Audit')
    REPORTS = 'REPORTS', _('Rapports')
    SETTINGS = 'SETTINGS', _('Paramètres')
    PERMISSIONS = 'PERMISSIONS', _('Permissions')
    SUPPORT_CHAT = 'SUPPORT_CHAT', _('Chat support')
    SUPPORT_TICKETS = 'SUPPORT_TICKETS', _('Tickets support')


class PermissionAction(models.TextChoices):
    """Available actions for each module."""
    VIEW = 'VIEW', _('Consulter')
    CREATE = 'CREATE', _('Créer')
    EDIT = 'EDIT', _('Modifier')
    DELETE = 'DELETE', _('Supprimer')
    EXPORT = 'EXPORT', _('Exporter')
    APPROVE = 'APPROVE', _('Approuver')
    MANAGE = 'MANAGE', _('Gérer')


# Mapping of modules to their available actions
MODULE_ACTIONS = {
    'DASHBOARD': ['VIEW'],
    'MERCHANTS': ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE'],
    'USERS': ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    'FORMS': ['VIEW', 'EDIT', 'DELETE', 'EXPORT'],
    'REFUNDS': ['VIEW', 'EDIT', 'APPROVE', 'EXPORT'],
    'BORDERS': ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    'AGENTS': ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    'RULES': ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    'CATEGORIES': ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
    'AUDIT': ['VIEW', 'EXPORT'],
    'REPORTS': ['VIEW', 'EXPORT'],
    'SETTINGS': ['VIEW', 'EDIT', 'MANAGE'],
    'PERMISSIONS': ['VIEW', 'MANAGE'],
    'SUPPORT_CHAT': ['VIEW', 'MANAGE'],
    'SUPPORT_TICKETS': ['VIEW', 'MANAGE'],
}


class UserPermission(models.Model):
    """
    Granular permission for system users.
    Links a user to specific module/action permissions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='custom_permissions'
    )
    module = models.CharField(
        max_length=30,
        choices=PermissionModule.choices
    )
    action = models.CharField(
        max_length=20,
        choices=PermissionAction.choices
    )
    granted_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='granted_permissions'
    )
    granted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('permission utilisateur')
        verbose_name_plural = _('permissions utilisateurs')
        unique_together = ['user', 'module', 'action']
        ordering = ['module', 'action']
    
    def __str__(self):
        return f"{self.user.email} - {self.module}:{self.action}"


class PermissionPreset(models.Model):
    """
    Predefined permission sets for quick assignment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(
        default=list,
        help_text=_('Liste des permissions: [{"module": "...", "action": "..."}]')
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('preset de permissions')
        verbose_name_plural = _('presets de permissions')
        ordering = ['name']
    
    def __str__(self):
        return self.name


class SystemUserInvitationStatus(models.TextChoices):
    PENDING = 'PENDING', _('En attente')
    ACCEPTED = 'ACCEPTED', _('Acceptée')
    EXPIRED = 'EXPIRED', _('Expirée')
    CANCELLED = 'CANCELLED', _('Annulée')


class SystemUserInvitation(models.Model):
    """
    Invitation for system/back-office users (Admin, Auditor, Operator).
    Excludes: Merchants, Merchant Employees, Customs Agents, Travelers.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Invited user info
    email = models.EmailField()
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    
    # Role assignment (only system roles)
    role = models.CharField(
        max_length=20,
        choices=[
            ('ADMIN', 'Administrateur'),
            ('AUDITOR', 'Auditeur'),
            ('OPERATOR', 'Opérateur'),
        ]
    )
    
    # Initial permissions to assign upon activation
    initial_permissions = models.JSONField(
        default=list,
        help_text=_('Permissions initiales: [{"module": "...", "action": "..."}]')
    )
    
    # Optional: assign a preset
    permission_preset = models.ForeignKey(
        PermissionPreset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invitations'
    )
    
    # For OPERATOR role: assigned point of exit (border)
    point_of_exit_id = models.UUIDField(
        null=True,
        blank=True,
        help_text=_('Point de sortie assigné pour les opérateurs')
    )
    
    # Invitation message (optional)
    message = models.TextField(
        blank=True,
        help_text=_('Message personnalisé inclus dans l\'email d\'invitation')
    )
    
    # Token for activation
    invitation_token = models.CharField(max_length=100, unique=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=SystemUserInvitationStatus.choices,
        default=SystemUserInvitationStatus.PENDING
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    activated_at = models.DateTimeField(null=True, blank=True)
    
    # Created user reference
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='system_invitation'
    )
    
    # Admin who created the invitation
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_system_invitations'
    )
    
    class Meta:
        verbose_name = _('invitation utilisateur système')
        verbose_name_plural = _('invitations utilisateurs système')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invitation {self.email} ({self.role}) - {self.get_status_display()}"
    
    def save(self, *args, **kwargs):
        if not self.invitation_token:
            self.invitation_token = self.generate_token()
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_token():
        """Generate a secure random token."""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(64))
    
    @property
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    @property
    def is_valid(self):
        return self.status == SystemUserInvitationStatus.PENDING and not self.is_expired
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
    
    def activate(self, password):
        """
        Activate the invitation and create the user account.
        """
        from .models import User
        
        if not self.is_valid:
            raise ValueError("Cette invitation n'est plus valide")
        
        # Check if email already exists
        if User.objects.filter(email=self.email).exists():
            raise ValueError("Un utilisateur avec cet email existe déjà")
        
        # Create the user
        user = User.objects.create_user(
            email=self.email,
            password=password,
            first_name=self.first_name,
            last_name=self.last_name,
            phone=self.phone,
            role=self.role,
            is_active=True
        )
        
        # For OPERATOR role, assign point of exit
        if self.role == 'OPERATOR' and self.point_of_exit_id:
            user.point_of_exit_id = self.point_of_exit_id
            user.save()
        
        # Assign permissions
        permissions_to_assign = self.initial_permissions or []
        
        # If preset is assigned, merge its permissions
        if self.permission_preset:
            permissions_to_assign = permissions_to_assign + (self.permission_preset.permissions or [])
        
        # Create permission records
        for perm in permissions_to_assign:
            UserPermission.objects.get_or_create(
                user=user,
                module=perm.get('module'),
                action=perm.get('action'),
                defaults={'granted_by': self.created_by}
            )
        
        # Update invitation
        self.user = user
        self.status = SystemUserInvitationStatus.ACCEPTED
        self.activated_at = timezone.now()
        self.save()
        
        return user
    
    def cancel(self):
        """Cancel the invitation."""
        if self.status == SystemUserInvitationStatus.PENDING:
            self.status = SystemUserInvitationStatus.CANCELLED
            self.save()
    
    def resend(self, new_expiry_days=7):
        """Resend invitation with new token and expiry."""
        if self.status in [SystemUserInvitationStatus.PENDING, SystemUserInvitationStatus.EXPIRED]:
            self.invitation_token = self.generate_token()
            self.expires_at = timezone.now() + timezone.timedelta(days=new_expiry_days)
            self.status = SystemUserInvitationStatus.PENDING
            self.save()
            return True
        return False


# Default permission presets
DEFAULT_PRESETS = [
    {
        'name': 'Administrateur complet',
        'description': 'Accès complet à tous les modules',
        'permissions': [
            {'module': m, 'action': a}
            for m in PermissionModule.values
            for a in PermissionAction.values
        ]
    },
    {
        'name': 'Auditeur',
        'description': 'Consultation et export de tous les modules',
        'permissions': [
            {'module': m, 'action': 'VIEW'}
            for m in PermissionModule.values
        ] + [
            {'module': m, 'action': 'EXPORT'}
            for m in ['FORMS', 'REFUNDS', 'AUDIT', 'REPORTS']
        ]
    },
    {
        'name': 'Opérateur remboursements',
        'description': 'Gestion des remboursements uniquement',
        'permissions': [
            {'module': 'DASHBOARD', 'action': 'VIEW'},
            {'module': 'REFUNDS', 'action': 'VIEW'},
            {'module': 'REFUNDS', 'action': 'EDIT'},
            {'module': 'REFUNDS', 'action': 'APPROVE'},
            {'module': 'FORMS', 'action': 'VIEW'},
        ]
    },
    {
        'name': 'Support commerçants',
        'description': 'Gestion des commerçants et utilisateurs',
        'permissions': [
            {'module': 'DASHBOARD', 'action': 'VIEW'},
            {'module': 'MERCHANTS', 'action': 'VIEW'},
            {'module': 'MERCHANTS', 'action': 'EDIT'},
            {'module': 'MERCHANTS', 'action': 'APPROVE'},
            {'module': 'USERS', 'action': 'VIEW'},
            {'module': 'FORMS', 'action': 'VIEW'},
        ]
    },
    {
        'name': 'Comptable',
        'description': 'Accès aux rapports et exports financiers',
        'permissions': [
            {'module': 'DASHBOARD', 'action': 'VIEW'},
            {'module': 'REPORTS', 'action': 'VIEW'},
            {'module': 'REPORTS', 'action': 'EXPORT'},
            {'module': 'REFUNDS', 'action': 'VIEW'},
            {'module': 'REFUNDS', 'action': 'EXPORT'},
            {'module': 'FORMS', 'action': 'VIEW'},
            {'module': 'FORMS', 'action': 'EXPORT'},
        ]
    },
]
