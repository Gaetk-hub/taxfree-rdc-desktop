"""
User and Profile models for the Tax Free system.
"""
import uuid
import secrets
import string
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.conf import settings


class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', _('Administrator (DGI/DGDA)')
    CUSTOMS_AGENT = 'CUSTOMS_AGENT', _('Customs Agent')
    MERCHANT = 'MERCHANT', _('Merchant Admin')
    MERCHANT_EMPLOYEE = 'MERCHANT_EMPLOYEE', _('Merchant Employee')
    OPERATOR = 'OPERATOR', _('Refund Operator')
    AUDITOR = 'AUDITOR', _('Auditor')
    TRAVELER = 'TRAVELER', _('Traveler')


class UserManager(BaseUserManager):
    """Custom user manager."""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('Email is required'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom User model with role-based access."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None  # Remove username field
    email = models.EmailField(_('email address'), unique=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.TRAVELER
    )
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # For merchant users, link to merchant (added via migration)
    merchant_id = models.UUIDField(null=True, blank=True)
    
    # For merchant employees, link to specific outlet (point de vente)
    outlet_id = models.UUIDField(null=True, blank=True)
    
    # For customs agents, link to point of exit (added via migration)
    point_of_exit_id = models.UUIDField(null=True, blank=True)
    
    # Agent code for customs agents (unique identifier displayed on receipts)
    agent_code = models.CharField(max_length=20, blank=True, unique=True, null=True)
    
    # Profile photo
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    
    # Security fields for dynamic security settings
    password_changed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Mot de passe modifié le'))
    failed_login_attempts = models.PositiveIntegerField(default=0, verbose_name=_('Tentatives de connexion échouées'))
    locked_until = models.DateTimeField(null=True, blank=True, verbose_name=_('Compte verrouillé jusqu\'à'))
    
    # Super admin flag - only one user should have this set to True
    is_super_admin = models.BooleanField(default=False, verbose_name=_('Super administrateur'))
    
    @property
    def merchant(self):
        if self.merchant_id:
            from apps.merchants.models import Merchant
            return Merchant.objects.filter(id=self.merchant_id).first()
        return None
    
    @property
    def outlet(self):
        if self.outlet_id:
            from apps.merchants.models import Outlet
            return Outlet.objects.filter(id=self.outlet_id).first()
        return None
    
    @property
    def point_of_exit(self):
        if self.point_of_exit_id:
            from apps.customs.models import PointOfExit
            return PointOfExit.objects.filter(id=self.point_of_exit_id).first()
        return None
    
    def is_merchant_admin(self):
        """Check if user is a merchant admin (can manage all outlets)."""
        return self.role == UserRole.MERCHANT
    
    def is_merchant_employee(self):
        """Check if user is a merchant employee (limited to one outlet)."""
        return self.role == UserRole.MERCHANT_EMPLOYEE
    
    def can_access_outlet(self, outlet_id):
        """Check if user can access a specific outlet."""
        if self.role == UserRole.MERCHANT:
            # Merchant admin can access all outlets of their merchant
            from apps.merchants.models import Outlet
            outlet = Outlet.objects.filter(id=outlet_id).first()
            return outlet and str(outlet.merchant_id) == str(self.merchant_id)
        elif self.role == UserRole.MERCHANT_EMPLOYEE:
            # Employee can only access their assigned outlet
            return str(self.outlet_id) == str(outlet_id)
        return False

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

    def has_role(self, *roles):
        """Check if user has any of the given roles."""
        return self.role in roles

    def is_admin(self):
        return self.role == UserRole.ADMIN or self.is_superuser

    def is_merchant_user(self):
        return self.role in [UserRole.MERCHANT, UserRole.MERCHANT_EMPLOYEE]
    
    def is_merchant_admin(self):
        return self.role == UserRole.MERCHANT
    
    def is_merchant_employee(self):
        return self.role == UserRole.MERCHANT_EMPLOYEE

    def is_customs_agent(self):
        return self.role == UserRole.CUSTOMS_AGENT

    def is_operator(self):
        return self.role == UserRole.OPERATOR

    def is_auditor(self):
        return self.role == UserRole.AUDITOR
    
    def is_traveler(self):
        return self.role == UserRole.TRAVELER
    
    def save(self, *args, **kwargs):
        # Auto-generate agent_code for customs agents and operators
        if self.role in [UserRole.CUSTOMS_AGENT, UserRole.OPERATOR] and not self.agent_code:
            self.agent_code = self._generate_agent_code(self.role)
        super().save(*args, **kwargs)
    
    @classmethod
    def _generate_agent_code(cls, role=None):
        """Generate unique agent code: AG-XXXXXXX or OP-XXXXXXX (7 alphanumeric chars with increment)."""
        import string
        
        # Determine prefix based on role
        if role == UserRole.OPERATOR:
            prefix = 'OP'
            count = cls.objects.filter(role=UserRole.OPERATOR).count() + 1
        else:
            prefix = 'AG'
            count = cls.objects.filter(role=UserRole.CUSTOMS_AGENT).count() + 1
        
        # Convert count to base-36 (0-9, A-Z) for alphanumeric representation
        chars = string.digits + string.ascii_uppercase  # 0-9A-Z (36 chars)
        
        def to_base36(num):
            """Convert number to base-36 string."""
            if num == 0:
                return '0'
            result = ''
            while num:
                result = chars[num % 36] + result
                num //= 36
            return result
        
        # Generate 7 character code: mix of increment and random
        import random
        base_code = to_base36(count).zfill(3)  # 3 chars from increment
        random_part = ''.join(random.choices(chars, k=4))  # 4 random chars
        
        # Mix them: R-B-R-B-R-B-R pattern
        code = f"{random_part[0]}{base_code[0]}{random_part[1]}{base_code[1]}{random_part[2]}{base_code[2]}{random_part[3]}"
        
        return f'{prefix}-{code}'


class MerchantRegistrationStatus(models.TextChoices):
    PENDING = 'PENDING', _('Pending Review')
    PENDING_DOCUMENTS = 'PENDING_DOCUMENTS', _('Awaiting Documents')
    APPROVED = 'APPROVED', _('Approved')
    REJECTED = 'REJECTED', _('Rejected')


class MerchantRegistrationRequest(models.Model):
    """
    Registration request for merchant/enterprise accounts.
    Requires admin approval before account activation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # User info (will create user upon approval)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    password_hash = models.CharField(max_length=255, blank=True, default='')  # No longer used - password set during activation
    
    # Company info (RDC specific)
    company_name = models.CharField(max_length=255, verbose_name=_('Nom de l\'entreprise'))
    trade_name = models.CharField(max_length=255, blank=True, verbose_name=_('Nom commercial'))
    registration_number = models.CharField(max_length=100, verbose_name=_('Numéro RCCM'))
    tax_id = models.CharField(max_length=100, verbose_name=_('Numéro Impôt (NIF)'))
    national_id = models.CharField(max_length=100, blank=True, verbose_name=_('Numéro Id. Nat.'))
    
    # Address
    address = models.CharField(max_length=255, verbose_name=_('Adresse'))
    city = models.CharField(max_length=100, verbose_name=_('Ville'))
    province = models.CharField(max_length=100, verbose_name=_('Province'))
    commune = models.CharField(max_length=100, blank=True, verbose_name=_('Commune'))
    
    # Contact
    company_phone = models.CharField(max_length=20, verbose_name=_('Téléphone entreprise'))
    company_email = models.EmailField(verbose_name=_('Email entreprise'))
    
    # Banking info
    bank_name = models.CharField(max_length=255, blank=True, verbose_name=_('Nom de la banque'))
    bank_account_number = models.CharField(max_length=100, blank=True, verbose_name=_('Numéro de compte'))
    mobile_money_number = models.CharField(max_length=20, blank=True, verbose_name=_('Numéro Mobile Money'))
    mobile_money_provider = models.CharField(max_length=50, blank=True, verbose_name=_('Opérateur Mobile Money'))
    
    # Business type
    business_sector = models.CharField(max_length=100, verbose_name=_('Secteur d\'activité'))
    business_description = models.TextField(blank=True, verbose_name=_('Description de l\'activité'))
    
    # Documents (file paths or URLs)
    rccm_document = models.CharField(max_length=500, blank=True, verbose_name=_('Document RCCM'))
    nif_document = models.CharField(max_length=500, blank=True, verbose_name=_('Document NIF'))
    id_nat_document = models.CharField(max_length=500, blank=True, verbose_name=_('Document Id. Nat.'))
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=MerchantRegistrationStatus.choices,
        default=MerchantRegistrationStatus.PENDING
    )
    rejection_reason = models.TextField(blank=True)
    
    # Metadata
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_registrations'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Created user and merchant (after approval)
    created_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registration_request'
    )
    created_merchant_id = models.UUIDField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('merchant registration request')
        verbose_name_plural = _('merchant registration requests')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.company_name} - {self.email} ({self.get_status_display()})"


class OTPPurpose(models.TextChoices):
    LOGIN = 'LOGIN', _('Login Verification')
    PASSWORD_RESET = 'PASSWORD_RESET', _('Password Reset')
    EMAIL_VERIFICATION = 'EMAIL_VERIFICATION', _('Email Verification')


class OTP(models.Model):
    """
    One-Time Password for 2FA authentication.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    code = models.CharField(max_length=10)
    purpose = models.CharField(
        max_length=30,
        choices=OTPPurpose.choices,
        default=OTPPurpose.LOGIN
    )
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('OTP')
        verbose_name_plural = _('OTPs')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"OTP for {self.user.email} - {self.purpose}"
    
    @classmethod
    def generate_code(cls, length=6):
        """Generate a random numeric OTP code."""
        return ''.join(secrets.choice(string.digits) for _ in range(length))
    
    @classmethod
    def create_for_user(cls, user, purpose=OTPPurpose.LOGIN):
        """Create a new OTP for a user, invalidating previous ones."""
        # Invalidate previous OTPs for same purpose
        cls.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)
        
        # Get settings
        expiry_minutes = getattr(settings, 'OTP_EXPIRY_MINUTES', 5)
        otp_length = getattr(settings, 'OTP_LENGTH', 6)
        
        # Create new OTP
        otp = cls.objects.create(
            user=user,
            code=cls.generate_code(otp_length),
            purpose=purpose,
            expires_at=timezone.now() + timezone.timedelta(minutes=expiry_minutes)
        )
        return otp
    
    def is_valid(self):
        """Check if OTP is still valid."""
        return (
            not self.is_used and 
            self.attempts < self.max_attempts and 
            timezone.now() < self.expires_at
        )
    
    def verify(self, code):
        """Verify the OTP code."""
        self.attempts += 1
        self.save()
        
        if not self.is_valid():
            return False
        
        if self.code == code:
            self.is_used = True
            self.save()
            return True
        
        return False


class AccountActivationToken(models.Model):
    """
    Token for merchant account activation after admin approval.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registration_request = models.OneToOneField(
        MerchantRegistrationRequest,
        on_delete=models.CASCADE,
        related_name='activation_token'
    )
    token = models.CharField(max_length=100, unique=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('account activation token')
        verbose_name_plural = _('account activation tokens')
    
    def __str__(self):
        return f"Activation token for {self.registration_request.email}"
    
    @classmethod
    def generate_token(cls):
        """Generate a secure random token."""
        return secrets.token_urlsafe(48)
    
    @classmethod
    def create_for_request(cls, registration_request, expiry_days=7):
        """Create activation token for approved registration."""
        # Delete existing tokens
        cls.objects.filter(registration_request=registration_request).delete()
        
        return cls.objects.create(
            registration_request=registration_request,
            token=cls.generate_token(),
            expires_at=timezone.now() + timezone.timedelta(days=expiry_days)
        )
    
    def is_valid(self):
        """Check if token is still valid."""
        return not self.is_used and timezone.now() < self.expires_at


class PasswordResetToken(models.Model):
    """
    Token for password reset.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens'
    )
    token = models.CharField(max_length=100, unique=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('password reset token')
        verbose_name_plural = _('password reset tokens')
    
    def __str__(self):
        return f"Password reset token for {self.user.email}"
    
    @classmethod
    def generate_token(cls):
        """Generate a secure random token."""
        return secrets.token_urlsafe(48)
    
    @classmethod
    def create_for_user(cls, user, expiry_hours=24):
        """Create password reset token for user."""
        # Invalidate existing tokens
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        
        return cls.objects.create(
            user=user,
            token=cls.generate_token(),
            expires_at=timezone.now() + timezone.timedelta(hours=expiry_hours)
        )
    
    def is_valid(self):
        """Check if token is still valid."""
        return not self.is_used and timezone.now() < self.expires_at


class MerchantUserInvitation(models.Model):
    """
    Invitation for a merchant to add employees/users.
    The invited user receives an email with a link to activate their account.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Who is inviting
    merchant = models.ForeignKey(
        'merchants.Merchant',
        on_delete=models.CASCADE,
        related_name='user_invitations'
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_invitations'
    )
    
    # Invited user details
    email = models.EmailField()
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    
    # Role and assignment
    role = models.CharField(
        max_length=20,
        choices=[
            (UserRole.MERCHANT, 'Admin Commerçant'),
            (UserRole.MERCHANT_EMPLOYEE, 'Employé'),
        ],
        default=UserRole.MERCHANT_EMPLOYEE
    )
    outlet = models.ForeignKey(
        'merchants.Outlet',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_invitations',
        help_text='Required for employees, optional for merchant admins'
    )
    
    # Token for activation
    token = models.CharField(max_length=100, unique=True)
    expires_at = models.DateTimeField()
    
    # Status
    is_accepted = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invitation'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('merchant user invitation')
        verbose_name_plural = _('merchant user invitations')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invitation for {self.email} to {self.merchant.name}"
    
    @classmethod
    def generate_token(cls):
        """Generate a secure random token."""
        return secrets.token_urlsafe(48)
    
    @classmethod
    def create_invitation(cls, merchant, invited_by, email, first_name, last_name, 
                          role=UserRole.MERCHANT_EMPLOYEE, outlet=None, phone='', expiry_days=7):
        """Create a new invitation."""
        # Check if email already exists
        if User.objects.filter(email=email).exists():
            raise ValueError('Un utilisateur avec cet email existe déjà.')
        
        # Check for pending invitation
        existing = cls.objects.filter(
            email=email, 
            merchant=merchant, 
            is_accepted=False,
            expires_at__gt=timezone.now()
        ).first()
        if existing:
            # Invalidate old invitation
            existing.delete()
        
        return cls.objects.create(
            merchant=merchant,
            invited_by=invited_by,
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role=role,
            outlet=outlet,
            token=cls.generate_token(),
            expires_at=timezone.now() + timezone.timedelta(days=expiry_days)
        )
    
    def is_valid(self):
        """Check if invitation is still valid."""
        return not self.is_accepted and timezone.now() < self.expires_at
    
    def accept(self, password):
        """Accept the invitation and create the user account."""
        if not self.is_valid():
            raise ValueError('Cette invitation a expiré ou a déjà été utilisée.')
        
        # Create the user
        user = User.objects.create(
            email=self.email,
            first_name=self.first_name,
            last_name=self.last_name,
            phone=self.phone,
            role=self.role,
            merchant_id=self.merchant.id,
            outlet_id=self.outlet.id if self.outlet else None,
            is_active=True
        )
        user.set_password(password)
        user.save()
        
        # Mark invitation as accepted
        self.is_accepted = True
        self.accepted_at = timezone.now()
        self.created_user = user
        self.save()
        
        return user


class SystemSetting(models.Model):
    """Model for storing system settings as key-value pairs."""
    
    key = models.CharField(max_length=100, unique=True, primary_key=True)
    value = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('system setting')
        verbose_name_plural = _('system settings')
    
    def __str__(self):
        return self.key

class DocumentRequestStatus(models.TextChoices):
    PENDING = 'PENDING', _('Pending Response')
    SUBMITTED = 'SUBMITTED', _('Documents Submitted')
    REVIEWED = 'REVIEWED', _('Reviewed by Admin')


class RegistrationDocumentRequest(models.Model):
    """
    Request for additional documents from a merchant during registration review.
    Tracks the dialogue between admin and merchant.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registration = models.ForeignKey(
        MerchantRegistrationRequest,
        on_delete=models.CASCADE,
        related_name='document_requests'
    )
    
    # Admin who requested the documents
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='document_requests_made'
    )
    
    # What documents/info are needed
    message = models.TextField(verbose_name=_('Message de demande'))
    documents_requested = models.JSONField(
        default=list,
        verbose_name=_('Documents demandés'),
        help_text=_('Liste des documents/informations demandés')
    )
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=DocumentRequestStatus.choices,
        default=DocumentRequestStatus.PENDING
    )
    
    # Secure token for merchant to access submission page
    access_token = models.CharField(max_length=100, unique=True)
    token_expires_at = models.DateTimeField()
    
    # Merchant response
    merchant_response = models.TextField(blank=True, verbose_name=_('Réponse du commerçant'))
    submitted_at = models.DateTimeField(null=True, blank=True)
    
    # Admin review
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='document_requests_reviewed'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True, verbose_name=_('Notes de révision'))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('document request')
        verbose_name_plural = _('document requests')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Document request for {self.registration.company_name} - {self.get_status_display()}"
    
    @classmethod
    def generate_token(cls):
        """Generate a secure access token."""
        return secrets.token_urlsafe(48)
    
    @classmethod
    def create_request(cls, registration, requested_by, message, documents_requested=None, expiry_days=14):
        """Create a new document request with secure token."""
        return cls.objects.create(
            registration=registration,
            requested_by=requested_by,
            message=message,
            documents_requested=documents_requested or [],
            access_token=cls.generate_token(),
            token_expires_at=timezone.now() + timezone.timedelta(days=expiry_days)
        )
    
    def is_token_valid(self):
        """Check if access token is still valid."""
        return self.status == DocumentRequestStatus.PENDING and timezone.now() < self.token_expires_at


class RegistrationDocument(models.Model):
    """
    Document uploaded by merchant in response to a document request.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document_request = models.ForeignKey(
        RegistrationDocumentRequest,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    
    name = models.CharField(max_length=255, verbose_name=_('Nom du document'))
    file_path = models.CharField(max_length=500, verbose_name=_('Chemin du fichier'))
    file_type = models.CharField(max_length=50, blank=True)
    file_size = models.IntegerField(default=0)
    
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('registration document')
        verbose_name_plural = _('registration documents')
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.name} - {self.document_request.registration.company_name}"


class RegistrationCommentType(models.TextChoices):
    ADMIN_NOTE = 'ADMIN_NOTE', _('Admin Note')
    DOCUMENT_REQUEST = 'DOCUMENT_REQUEST', _('Document Request')
    MERCHANT_RESPONSE = 'MERCHANT_RESPONSE', _('Merchant Response')
    STATUS_CHANGE = 'STATUS_CHANGE', _('Status Change')
    SYSTEM = 'SYSTEM', _('System Message')


class RegistrationComment(models.Model):
    """
    Comment/activity log for registration request.
    Tracks all exchanges and status changes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registration = models.ForeignKey(
        MerchantRegistrationRequest,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    
    comment_type = models.CharField(
        max_length=30,
        choices=RegistrationCommentType.choices,
        default=RegistrationCommentType.ADMIN_NOTE
    )
    
    # Who made the comment (null for system messages)
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registration_comments'
    )
    author_name = models.CharField(max_length=255, blank=True)  # For merchant responses
    
    content = models.TextField()
    
    # Optional link to document request
    document_request = models.ForeignKey(
        RegistrationDocumentRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='comments'
    )
    
    # For status changes
    old_status = models.CharField(max_length=30, blank=True)
    new_status = models.CharField(max_length=30, blank=True)
    
    is_internal = models.BooleanField(default=False, help_text=_('Visible only to admins'))
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('registration comment')
        verbose_name_plural = _('registration comments')
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.get_comment_type_display()} - {self.registration.company_name}"


class NotificationType(models.TextChoices):
    REGISTRATION_NEW = 'REGISTRATION_NEW', _('New Registration')
    REGISTRATION_APPROVED = 'REGISTRATION_APPROVED', _('Registration Approved')
    REGISTRATION_REJECTED = 'REGISTRATION_REJECTED', _('Registration Rejected')
    DOCUMENT_REQUESTED = 'DOCUMENT_REQUESTED', _('Documents Requested')
    DOCUMENT_SUBMITTED = 'DOCUMENT_SUBMITTED', _('Documents Submitted')
    GENERAL = 'GENERAL', _('General Notification')
    # Support notifications
    NEW_CONVERSATION = 'NEW_CONVERSATION', _('New Conversation')
    NEW_CHAT_MESSAGE = 'NEW_CHAT_MESSAGE', _('New Chat Message')
    NEW_TICKET = 'NEW_TICKET', _('New Ticket')
    TICKET_ASSIGNED = 'TICKET_ASSIGNED', _('Ticket Assigned')
    TICKET_ESCALATED = 'TICKET_ESCALATED', _('Ticket Escalated')
    TICKET_RESOLVED = 'TICKET_RESOLVED', _('Ticket Resolved')
    TICKET_MESSAGE = 'TICKET_MESSAGE', _('New Ticket Message')


class Notification(models.Model):
    """
    In-app notification for users.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='account_notifications'
    )
    
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.GENERAL
    )
    
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Link to related object
    related_object_type = models.CharField(max_length=50, blank=True)
    related_object_id = models.UUIDField(null=True, blank=True)
    
    # Action URL
    action_url = models.CharField(max_length=500, blank=True)
    
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('notification')
        verbose_name_plural = _('notifications')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.user.email}"
    
    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()


class CustomsAgentInvitationStatus(models.TextChoices):
    PENDING = 'PENDING', _('En attente')
    ACCEPTED = 'ACCEPTED', _('Acceptée')
    EXPIRED = 'EXPIRED', _('Expirée')
    CANCELLED = 'CANCELLED', _('Annulée')


class CustomsAgentInvitation(models.Model):
    """
    Invitation for customs agents to join the system.
    Admin creates invitation, agent receives email with secure link to activate account.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Agent info (will create user upon activation)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    
    # Personal identification
    date_of_birth = models.DateField(null=True, blank=True, verbose_name=_('Date de naissance'))
    place_of_birth = models.CharField(max_length=100, blank=True, verbose_name=_('Lieu de naissance'))
    nationality = models.CharField(max_length=50, blank=True, default='CD', verbose_name=_('Nationalité'))
    national_id = models.CharField(max_length=50, blank=True, verbose_name=_('N° Carte d\'identité'))
    
    # Address
    address = models.CharField(max_length=255, blank=True, verbose_name=_('Adresse'))
    city = models.CharField(max_length=100, blank=True, verbose_name=_('Ville'))
    province = models.CharField(max_length=100, blank=True, verbose_name=_('Province'))
    
    # Emergency contact
    emergency_contact_name = models.CharField(max_length=150, blank=True, verbose_name=_('Contact d\'urgence'))
    emergency_contact_phone = models.CharField(max_length=20, blank=True, verbose_name=_('Tél. urgence'))
    emergency_contact_relation = models.CharField(max_length=50, blank=True, verbose_name=_('Relation'))
    
    # Agent identification
    matricule = models.CharField(max_length=50, unique=True, verbose_name=_('Matricule'))
    grade = models.CharField(max_length=100, blank=True, verbose_name=_('Grade'))
    department = models.CharField(max_length=100, blank=True, verbose_name=_('Service/Département'))
    hire_date = models.DateField(null=True, blank=True, verbose_name=_('Date d\'embauche'))
    
    # Assignment
    point_of_exit = models.ForeignKey(
        'customs.PointOfExit',
        on_delete=models.SET_NULL,
        null=True,
        related_name='agent_invitations',
        verbose_name=_('Frontière assignée')
    )
    
    # Invitation token
    invitation_token = models.CharField(max_length=100, unique=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=CustomsAgentInvitationStatus.choices,
        default=CustomsAgentInvitationStatus.PENDING
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    activated_at = models.DateTimeField(null=True, blank=True)
    
    # Created user reference
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='customs_invitation'
    )
    
    # Admin who created the invitation
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_agent_invitations'
    )
    
    class Meta:
        verbose_name = _('invitation agent douanier')
        verbose_name_plural = _('invitations agents douaniers')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invitation {self.email} - {self.get_status_display()}"
    
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
        return self.status == CustomsAgentInvitationStatus.PENDING and not self.is_expired
    
    def activate(self, password):
        """
        Activate the invitation and create the user account.
        """
        if not self.is_valid:
            raise ValueError("Cette invitation n'est plus valide")
        
        # Create the user
        user = User.objects.create_user(
            email=self.email,
            password=password,
            first_name=self.first_name,
            last_name=self.last_name,
            phone=self.phone,
            role=UserRole.CUSTOMS_AGENT,
            point_of_exit_id=self.point_of_exit_id,
            is_active=True
        )
        
        # Update invitation
        self.user = user
        self.status = CustomsAgentInvitationStatus.ACCEPTED
        self.activated_at = timezone.now()
        self.save()
        
        return user

