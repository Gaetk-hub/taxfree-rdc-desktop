"""
Serializers for audit app.
"""
from rest_framework import serializers
from .models import AuditLog


# Display mappings
ENTITY_DISPLAY = {
    'TaxFreeForm': 'Bordereau Tax Free',
    'User': 'Utilisateur',
    'Merchant': 'Commerçant',
    'Outlet': 'Point de vente',
    'SaleInvoice': 'Facture',
    'Refund': 'Remboursement',
    'CustomsValidation': 'Validation douanière',
    'AgentShift': 'Vacation agent',
    'CustomsAgentInvitation': 'Invitation agent',
    'MerchantUserInvitation': 'Invitation commerçant',
    'PointOfExit': 'Point de sortie',
    'TaxRule': 'Règle TVA',
    'ProductCategory': 'Catégorie produit',
}

ROLE_DISPLAY = {
    'ADMIN': 'Super Admin',
    'AUDITOR': 'Auditeur',
    'OPERATOR': 'Opérateur',
    'CUSTOMS_AGENT': 'Agent douanier',
    'MERCHANT': 'Commerçant',
    'MERCHANT_EMPLOYEE': 'Employé commerçant',
    'CLIENT': 'Client',
    '': 'Système',
}

ACTION_DISPLAY = {
    'TAXFREE_FORM_CREATED': 'Bordereau créé',
    'TAXFREE_FORM_CANCELLED': 'Bordereau annulé',
    'TAXFREE_FORM_EMAILED': 'Bordereau envoyé par email',
    'TAXFREE_FORM_PDF_DOWNLOADED': 'PDF téléchargé',
    'SCAN_FORM': 'Scan QR code',
    'LOOKUP_FORM': 'Consultation bordereau',
    'SEARCH_FORMS': 'Recherche bordereaux',
    'CUSTOMS_VALIDATED': 'Validé par douane',
    'CUSTOMS_REFUSED': 'Refusé par douane',
    'REFUND_INITIATED': 'Remboursement initié',
    'REFUND_COMPLETED': 'Remboursement effectué',
    'REFUND_FAILED': 'Remboursement échoué',
    'REFUND_CANCELLED': 'Remboursement annulé',
    'CASH_COLLECTED': 'Espèces collectées',
    'RECEIPT_SENT': 'Reçu envoyé',
    'STATUS_OVERRIDE': 'Correction de statut',
    'USER_CREATED': 'Utilisateur créé',
    'USER_UPDATED': 'Utilisateur modifié',
    'USER_DEACTIVATED': 'Utilisateur désactivé',
    'INVOICE_CREATED': 'Facture créée',
    'INVOICE_CANCELLED': 'Facture annulée',
    'START_SHIFT': 'Début de vacation',
    'END_SHIFT': 'Fin de vacation',
    'PAUSE_SHIFT': 'Pause vacation',
    'RESUME_SHIFT': 'Reprise vacation',
    'OUTLET_CREATED': 'Point de vente créé',
    'OUTLET_UPDATED': 'Point de vente modifié',
    'OUTLET_ACTIVATED': 'Point de vente activé',
    'OUTLET_DEACTIVATED': 'Point de vente désactivé',
    'CREATE_AGENT_INVITATION': 'Invitation agent créée',
    'ACTIVATE_AGENT_ACCOUNT': 'Compte agent activé',
    'UPDATE_CUSTOMS_AGENT': 'Agent douanier modifié',
    'DEACTIVATE_CUSTOMS_AGENT': 'Agent douanier désactivé',
    'MERCHANT_USER_INVITED': 'Utilisateur commerçant invité',
    'MERCHANT_INVITATION_ACCEPTED': 'Invitation commerçant acceptée',
    'OFFLINE_SYNC': 'Synchronisation hors-ligne',
    'USER_LOGIN': 'Connexion utilisateur',
    'USER_LOGOUT': 'Déconnexion utilisateur',
}


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs."""
    
    entity_display = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    action_display = serializers.SerializerMethodField()
    actor_last_login = serializers.SerializerMethodField()
    actor_last_logout = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor_id', 'actor_email', 'actor_role', 'role_display',
            'actor_ip', 'action', 'action_display', 'entity', 'entity_display',
            'entity_id', 'timestamp', 'metadata', 'actor_last_login', 'actor_last_logout'
        ]
        read_only_fields = fields
    
    def get_entity_display(self, obj):
        return ENTITY_DISPLAY.get(obj.entity, obj.entity)
    
    def get_role_display(self, obj):
        return ROLE_DISPLAY.get(obj.actor_role, obj.actor_role or 'Système')
    
    def get_action_display(self, obj):
        return ACTION_DISPLAY.get(obj.action, obj.action)
    
    def get_actor_last_login(self, obj):
        """Get the actor's last login time."""
        if obj.actor_id:
            from apps.accounts.models import User
            try:
                user = User.objects.get(id=obj.actor_id)
                return user.last_login.isoformat() if user.last_login else None
            except User.DoesNotExist:
                return None
        return None
    
    def get_actor_last_logout(self, obj):
        """Get the actor's last logout time from audit logs."""
        if obj.actor_id:
            last_logout = AuditLog.objects.filter(
                actor_id=obj.actor_id,
                action='USER_LOGOUT'
            ).order_by('-timestamp').first()
            return last_logout.timestamp.isoformat() if last_logout else None
        return None


class AuditLogDetailSerializer(AuditLogSerializer):
    """Detailed serializer with metadata - inherits all fields from AuditLogSerializer."""
    pass
