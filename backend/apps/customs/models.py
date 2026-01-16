"""
Customs validation models.
"""
import uuid
from datetime import timedelta
from django.db import models
from django.utils.translation import gettext_lazy as _


class ValidationDecision(models.TextChoices):
    VALIDATED = 'VALIDATED', _('Validé')
    REFUSED = 'REFUSED', _('Refusé')
    CONTROL_REQUIRED = 'CONTROL_REQUIRED', _('Contrôle physique requis')


class RefusalReason(models.TextChoices):
    EXPIRED = 'EXPIRED', _('Bordereau expiré')
    INVALID_DOCUMENTS = 'INVALID_DOCUMENTS', _('Documents invalides')
    GOODS_NOT_PRESENT = 'GOODS_NOT_PRESENT', _('Marchandises non présentées')
    GOODS_MISMATCH = 'GOODS_MISMATCH', _('Marchandises non conformes à la facture')
    TRAVELER_MISMATCH = 'TRAVELER_MISMATCH', _('Identité du voyageur non conforme')
    ALREADY_VALIDATED = 'ALREADY_VALIDATED', _('Déjà validé')
    SUSPECTED_FRAUD = 'SUSPECTED_FRAUD', _('Suspicion de fraude')
    OTHER = 'OTHER', _('Autre')


class BorderType(models.TextChoices):
    AIRPORT = 'AIRPORT', _('Aéroport')
    LAND_BORDER = 'LAND_BORDER', _('Frontière terrestre')
    PORT = 'PORT', _('Port maritime/fluvial')
    RAIL = 'RAIL', _('Gare ferroviaire')


class PointOfExit(models.Model):
    """Point of exit (airport, border post, port)."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Identification
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    type = models.CharField(
        max_length=20,
        choices=BorderType.choices,
        default=BorderType.LAND_BORDER
    )
    
    # Location
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=2, default='CD')
    
    # Coordinates (GPS)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    # Contact information
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    manager_name = models.CharField(max_length=255, blank=True, verbose_name=_('Responsable'))
    
    # Operating hours
    operating_hours = models.CharField(max_length=100, blank=True, verbose_name=_('Heures d\'ouverture'))
    is_24h = models.BooleanField(default=False, verbose_name=_('Ouvert 24h/24'))
    
    # Capacity and stats
    daily_capacity = models.IntegerField(default=0, verbose_name=_('Capacité journalière'))
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('point of exit')
        verbose_name_plural = _('points of exit')
        ordering = ['name']

    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def agents_count(self):
        """Count of active agents assigned to this point."""
        from apps.accounts.models import User, UserRole
        return User.objects.filter(
            point_of_exit_id=self.id,
            role=UserRole.CUSTOMS_AGENT,
            is_active=True
        ).count()
    
    @property
    def validations_today(self):
        """Count of validations done today at this point."""
        from django.utils import timezone
        today = timezone.now().date()
        return self.validations.filter(decided_at__date=today).count()


class CustomsValidation(models.Model):
    """Customs validation record for a tax free form."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Form reference
    form = models.OneToOneField(
        'taxfree.TaxFreeForm',
        on_delete=models.PROTECT,
        related_name='customs_validation'
    )
    
    # Agent and location
    agent = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='validations'
    )
    point_of_exit = models.ForeignKey(
        PointOfExit,
        on_delete=models.PROTECT,
        related_name='validations'
    )
    
    # Decision
    decision = models.CharField(
        max_length=20,
        choices=ValidationDecision.choices
    )
    refusal_reason = models.CharField(
        max_length=30,
        choices=RefusalReason.choices,
        blank=True
    )
    refusal_details = models.TextField(blank=True)
    
    # Physical control
    physical_control_done = models.BooleanField(default=False)
    control_notes = models.TextField(blank=True)
    
    # Offline sync
    is_offline = models.BooleanField(default=False)
    offline_batch_id = models.CharField(max_length=50, blank=True)
    offline_timestamp = models.DateTimeField(null=True, blank=True)
    synced_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    decided_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('customs validation')
        verbose_name_plural = _('customs validations')
        ordering = ['-decided_at']
        indexes = [
            models.Index(fields=['decided_at']),
            models.Index(fields=['offline_batch_id']),
        ]

    def __str__(self):
        return f"{self.form.form_number} - {self.decision}"


class ShiftStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', _('En service')
    PAUSED = 'PAUSED', _('En pause')
    ENDED = 'ENDED', _('Terminé')


class AgentShift(models.Model):
    """
    Agent work session (vacation/shift).
    Tracks when an agent starts and ends their service at a border post.
    Used for audit, statistics, and knowing which agent operated in which time slot.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Agent and location
    agent = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='shifts'
    )
    point_of_exit = models.ForeignKey(
        PointOfExit,
        on_delete=models.PROTECT,
        related_name='shifts'
    )
    
    # Shift timing
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    status = models.CharField(
        max_length=10,
        choices=ShiftStatus.choices,
        default=ShiftStatus.ACTIVE
    )
    
    # Pause tracking
    total_pause_duration = models.DurationField(default=timedelta(0))
    last_pause_at = models.DateTimeField(null=True, blank=True)
    
    # Statistics (updated when shift ends or periodically)
    validations_count = models.IntegerField(default=0)
    validated_count = models.IntegerField(default=0)
    refused_count = models.IntegerField(default=0)
    total_amount_validated = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Notes
    notes = models.TextField(blank=True)
    end_notes = models.TextField(blank=True)
    
    # Device/session info
    device_info = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('agent shift')
        verbose_name_plural = _('agent shifts')
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['agent', 'started_at']),
            models.Index(fields=['point_of_exit', 'started_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.agent.full_name} - {self.point_of_exit.name} - {self.started_at.strftime('%d/%m/%Y %H:%M')}"
    
    @property
    def duration(self):
        """Calculate shift duration excluding pauses."""
        from django.utils import timezone
        end = self.ended_at or timezone.now()
        total = end - self.started_at
        return total - self.total_pause_duration
    
    @property
    def duration_hours(self):
        """Duration in hours (float)."""
        return self.duration.total_seconds() / 3600
    
    def pause(self):
        """Pause the shift."""
        from django.utils import timezone
        if self.status == ShiftStatus.ACTIVE:
            self.status = ShiftStatus.PAUSED
            self.last_pause_at = timezone.now()
            self.save()
    
    def resume(self):
        """Resume the shift from pause."""
        from django.utils import timezone
        if self.status == ShiftStatus.PAUSED and self.last_pause_at:
            pause_duration = timezone.now() - self.last_pause_at
            self.total_pause_duration += pause_duration
            self.status = ShiftStatus.ACTIVE
            self.last_pause_at = None
            self.save()
    
    def end(self, notes=''):
        """End the shift and calculate final statistics."""
        from django.utils import timezone
        from django.db.models import Sum, Count
        
        # If paused, add remaining pause time
        if self.status == ShiftStatus.PAUSED and self.last_pause_at:
            pause_duration = timezone.now() - self.last_pause_at
            self.total_pause_duration += pause_duration
        
        self.status = ShiftStatus.ENDED
        self.ended_at = timezone.now()
        self.end_notes = notes
        
        # Calculate statistics for this shift
        validations = CustomsValidation.objects.filter(
            agent=self.agent,
            decided_at__gte=self.started_at,
            decided_at__lte=self.ended_at
        )
        
        self.validations_count = validations.count()
        self.validated_count = validations.filter(decision=ValidationDecision.VALIDATED).count()
        self.refused_count = validations.filter(decision=ValidationDecision.REFUSED).count()
        
        # Total amount validated
        total = validations.filter(decision=ValidationDecision.VALIDATED).aggregate(
            total=Sum('form__invoice__total_amount')
        )['total'] or 0
        self.total_amount_validated = total
        
        self.save()
    
    def update_stats(self):
        """Update statistics without ending the shift."""
        from django.db.models import Sum
        from django.utils import timezone
        
        validations = CustomsValidation.objects.filter(
            agent=self.agent,
            decided_at__gte=self.started_at,
            decided_at__lte=timezone.now()
        )
        
        self.validations_count = validations.count()
        self.validated_count = validations.filter(decision=ValidationDecision.VALIDATED).count()
        self.refused_count = validations.filter(decision=ValidationDecision.REFUSED).count()
        
        total = validations.filter(decision=ValidationDecision.VALIDATED).aggregate(
            total=Sum('form__invoice__total_amount')
        )['total'] or 0
        self.total_amount_validated = total
        
        self.save()


class OfflineSyncBatch(models.Model):
    """Batch of offline validations synced together."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    batch_id = models.CharField(max_length=50, unique=True)
    agent = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='sync_batches'
    )
    point_of_exit = models.ForeignKey(
        PointOfExit,
        on_delete=models.PROTECT,
        related_name='sync_batches'
    )
    
    validations_count = models.IntegerField(default=0)
    successful_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    
    sync_errors = models.JSONField(default=list)
    
    synced_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('offline sync batch')
        verbose_name_plural = _('offline sync batches')
        ordering = ['-synced_at']

    def __str__(self):
        return f"Batch {self.batch_id} - {self.validations_count} validations"
