"""
Views for accounts app.
"""
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from django.conf import settings

from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    ClientRegistrationSerializer,
    MerchantRegistrationRequestSerializer,
    MerchantRegistrationRequestListSerializer,
    MerchantRegistrationRequestDetailSerializer,
    MerchantRegistrationRequestFullDetailSerializer,
    ApproveRegistrationSerializer,
    RejectRegistrationSerializer,
    RequestDocumentsSerializer,
    RegistrationDocumentRequestSerializer,
    RegistrationDocumentRequestPublicSerializer,
    SubmitDocumentsSerializer,
    ReviewDocumentsSerializer,
    RegistrationCommentSerializer,
    AddCommentSerializer,
    NotificationSerializer,
)
from .permissions import IsAdmin
from .models import (
    MerchantRegistrationRequest, 
    MerchantRegistrationStatus, 
    UserRole,
    OTP,
    OTPPurpose,
    AccountActivationToken,
    RegistrationDocumentRequest,
    DocumentRequestStatus,
    RegistrationDocument,
    RegistrationComment,
    RegistrationCommentType,
    Notification,
    NotificationType,
)
from .services import EmailService

User = get_user_model()


# ============================================
# 2FA AUTHENTICATION VIEWS
# ============================================

class LoginStep1View(APIView):
    """
    Step 1 of 2FA login: Validate credentials and send OTP.
    Applies dynamic security settings: max_login_attempts, account lockout.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        from .security_service import SecurityService
        
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'detail': 'Email et mot de passe requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ip_address = SecurityService.get_client_ip(request)
        
        # Check if login is blocked (max attempts exceeded)
        is_blocked, lockout_seconds = SecurityService.is_login_blocked(email, ip_address)
        if is_blocked:
            lockout_minutes = lockout_seconds // 60
            return Response(
                {
                    'detail': f'Compte temporairement verrouillé. Réessayez dans {lockout_minutes} minutes.',
                    'code': 'account_locked',
                    'lockout_minutes': lockout_minutes
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Authenticate user
        user = authenticate(request, email=email, password=password)
        
        if not user:
            # Record failed attempt
            is_now_blocked, attempts_remaining = SecurityService.record_failed_login(email, ip_address)
            
            if is_now_blocked:
                lockout_minutes = SecurityService.get_lockout_duration_minutes()
                return Response(
                    {
                        'detail': f'Trop de tentatives échouées. Compte verrouillé pour {lockout_minutes} minutes.',
                        'code': 'account_locked',
                        'lockout_minutes': lockout_minutes
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            return Response(
                {
                    'detail': 'Email ou mot de passe incorrect.',
                    'attempts_remaining': attempts_remaining
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'detail': 'Ce compte est désactivé.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Clear failed attempts on successful credential validation
        SecurityService.clear_failed_attempts(email)
        
        # Generate and send OTP
        otp = OTP.create_for_user(user, OTPPurpose.LOGIN)
        
        try:
            EmailService.send_otp_email(user, otp.code)
        except Exception as e:
            return Response(
                {'detail': 'Erreur lors de l\'envoi du code. Veuillez réessayer.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'detail': 'Code de vérification envoyé à votre adresse email.',
            'email': user.email,
            'otp_id': str(otp.id),
            'expires_in': getattr(settings, 'OTP_EXPIRY_MINUTES', 5) * 60
        })


class LoginStep2View(APIView):
    """
    Step 2 of 2FA login: Verify OTP and return tokens.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        otp_id = request.data.get('otp_id')
        code = request.data.get('code')
        
        if not otp_id or not code:
            return Response(
                {'detail': 'ID OTP et code requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            otp = OTP.objects.get(id=otp_id, purpose=OTPPurpose.LOGIN)
        except OTP.DoesNotExist:
            return Response(
                {'detail': 'Code invalide ou expiré.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not otp.is_valid():
            return Response(
                {'detail': 'Code expiré ou nombre maximum de tentatives atteint.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not otp.verify(code):
            remaining = otp.max_attempts - otp.attempts
            return Response(
                {
                    'detail': f'Code incorrect. {remaining} tentative(s) restante(s).',
                    'remaining_attempts': remaining
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate JWT tokens
        user = otp.user
        refresh = RefreshToken.for_user(user)
        
        # Update last_login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # Log the login event
        from services.audit_service import AuditService
        AuditService.log(
            actor=user,
            action='USER_LOGIN',
            entity='User',
            entity_id=str(user.id),
            request=request,
            metadata={'method': '2FA'}
        )
        
        # Check password expiry
        from .security_service import SecurityService
        is_expired, days_since_change = SecurityService.is_password_expired(user)
        password_expiry_warning = None
        days_until_expiry = SecurityService.days_until_password_expiry(user)
        
        if days_until_expiry is not None and days_until_expiry <= 7 and days_until_expiry > 0:
            password_expiry_warning = f'Votre mot de passe expire dans {days_until_expiry} jour(s).'
        
        response_data = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'password_expired': is_expired,
        }
        
        if is_expired:
            response_data['password_change_required'] = True
            response_data['message'] = 'Votre mot de passe a expiré. Veuillez le changer.'
        elif password_expiry_warning:
            response_data['password_expiry_warning'] = password_expiry_warning
        
        return Response(response_data)


class LogoutView(APIView):
    """
    Logout view that logs the event in audit logs.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        from services.audit_service import AuditService
        
        # Log the logout event
        AuditService.log(
            actor=request.user,
            action='USER_LOGOUT',
            entity='User',
            entity_id=str(request.user.id),
            request=request,
            metadata={}
        )
        
        return Response({'detail': 'Déconnexion réussie.'})


class ResendOTPView(APIView):
    """
    Resend OTP code to user.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'detail': 'Email requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            # Don't reveal if user exists
            return Response({
                'detail': 'Si ce compte existe, un nouveau code a été envoyé.'
            })
        
        # Generate and send new OTP
        otp = OTP.create_for_user(user, OTPPurpose.LOGIN)
        
        try:
            EmailService.send_otp_email(user, otp.code)
        except Exception:
            pass
        
        return Response({
            'detail': 'Si ce compte existe, un nouveau code a été envoyé.',
            'otp_id': str(otp.id),
            'expires_in': getattr(settings, 'OTP_EXPIRY_MINUTES', 5) * 60
        })


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login view with additional user info (legacy, kept for compatibility)."""
    serializer_class = CustomTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for user management."""
    
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['role', 'is_active', 'merchant_id']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'email']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        # Non-admin users can only see themselves
        if not self.request.user.is_admin():
            queryset = queryset.filter(id=self.request.user.id)
        return queryset

    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get or update current user info."""
        if request.method == 'GET':
            serializer = UserSerializer(request.user)
            return Response(serializer.data)
        else:
            # PATCH - update user profile
            serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['patch'], permission_classes=[IsAuthenticated], 
            parser_classes=[MultiPartParser, FormParser], url_path='me/photo')
    def update_photo(self, request):
        """Update current user's profile photo."""
        if 'profile_photo' not in request.FILES:
            return Response(
                {'detail': 'Aucune photo fournie'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        # Delete old photo if exists
        if user.profile_photo:
            user.profile_photo.delete(save=False)
        
        user.profile_photo = request.FILES['profile_photo']
        user.save()
        
        # Log the action
        from apps.audit.services import AuditService
        AuditService.log(
            actor=request.user,
            action='PROFILE_PHOTO_UPDATED',
            entity='User',
            entity_id=str(user.id),
            request=request,
        )
        
        return Response({
            'detail': 'Photo de profil mise à jour',
            'profile_photo': user.profile_photo.url if user.profile_photo else None
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='me/change_password')
    def change_password(self, request):
        """Change current user's password."""
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        
        # Update password_changed_at for password expiry tracking
        request.user.password_changed_at = timezone.now()
        request.user.save(update_fields=['password', 'password_changed_at'])
        
        # Log the action
        from apps.audit.services import AuditService
        AuditService.log(
            actor=request.user,
            action='PASSWORD_CHANGED',
            entity='User',
            entity_id=str(request.user.id),
            request=request,
        )
        
        return Response({'detail': 'Mot de passe modifié avec succès'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def activate(self, request, pk=None):
        """Activate a user."""
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'detail': 'User activated'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def deactivate(self, request, pk=None):
        """Deactivate a user."""
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({'detail': 'User deactivated'})


# ============================================
# PUBLIC REGISTRATION VIEWS
# ============================================

class ClientRegistrationView(generics.CreateAPIView):
    """
    Public endpoint for client/traveler registration.
    Account is active immediately after registration.
    """
    permission_classes = [AllowAny]
    serializer_class = ClientRegistrationSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'detail': 'Compte créé avec succès. Vous pouvez maintenant vous connecter.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class MerchantRegistrationView(generics.CreateAPIView):
    """
    Public endpoint for merchant/enterprise registration request.
    Creates a pending request that requires admin approval.
    Does NOT store password - merchant will set it during activation.
    """
    permission_classes = [AllowAny]
    serializer_class = MerchantRegistrationRequestSerializer
    
    def create(self, request, *args, **kwargs):
        from .services import NotificationService
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registration = serializer.save()
        
        # Send confirmation email to merchant
        try:
            EmailService.send_registration_confirmation_to_merchant(registration)
        except Exception:
            pass  # Don't fail if email fails
        
        # Notify admins about new registration (email)
        try:
            EmailService.send_registration_notification_to_admin(registration)
        except Exception:
            pass  # Don't fail if email fails
        
        # Create in-app notifications for admins
        try:
            NotificationService.notify_admins_new_registration(registration)
        except Exception:
            pass
        
        return Response({
            'detail': 'Votre demande d\'inscription a été soumise avec succès. '
                     'Elle sera examinée par notre équipe et vous recevrez une notification par email.',
            'request_id': str(registration.id),
            'status': registration.status
        }, status=status.HTTP_201_CREATED)


class MerchantRegistrationRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for admin to manage merchant registration requests.
    """
    queryset = MerchantRegistrationRequest.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['status', 'city', 'province', 'business_sector']
    search_fields = ['email', 'company_name', 'registration_number', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'company_name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return MerchantRegistrationRequestListSerializer
        if self.action == 'retrieve':
            return MerchantRegistrationRequestFullDetailSerializer
        return MerchantRegistrationRequestDetailSerializer
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve a merchant registration request.
        Sends activation link to merchant - account created on activation.
        """
        registration = self.get_object()
        
        if registration.status != MerchantRegistrationStatus.PENDING:
            return Response(
                {'detail': 'Cette demande a déjà été traitée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update registration status
        registration.status = MerchantRegistrationStatus.APPROVED
        registration.reviewed_by = request.user
        registration.reviewed_at = timezone.now()
        registration.save()
        
        # Create activation token
        activation_token = AccountActivationToken.create_for_request(registration)
        
        # Build activation URL
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        activation_url = f"{frontend_url}/activate-account/{activation_token.token}"
        
        # Send approval email with activation link
        try:
            EmailService.send_registration_approved_email(registration, activation_url)
        except Exception as e:
            return Response({
                'detail': 'Demande approuvée mais erreur lors de l\'envoi de l\'email.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'detail': 'Demande approuvée. Un email d\'activation a été envoyé au commerçant.',
            'activation_token': activation_token.token
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a merchant registration request."""
        registration = self.get_object()
        
        if registration.status != MerchantRegistrationStatus.PENDING:
            return Response(
                {'detail': 'Cette demande a déjà été traitée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = RejectRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        registration.status = MerchantRegistrationStatus.REJECTED
        registration.rejection_reason = serializer.validated_data['reason']
        registration.reviewed_by = request.user
        registration.reviewed_at = timezone.now()
        registration.save()
        
        # Send rejection email
        try:
            EmailService.send_registration_rejected_email(
                registration, 
                registration.rejection_reason
            )
        except Exception:
            pass
        
        return Response({
            'detail': 'Demande rejetée. Le commerçant a été notifié par email.',
            'reason': registration.rejection_reason
        })
    
    @action(detail=True, methods=['post'])
    def request_documents(self, request, pk=None):
        """
        Request additional documents from merchant.
        Creates a document request and sends email with secure link.
        """
        registration = self.get_object()
        
        if registration.status not in [MerchantRegistrationStatus.PENDING, MerchantRegistrationStatus.PENDING_DOCUMENTS]:
            return Response(
                {'detail': 'Cette demande ne peut plus recevoir de demande de complément.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's already a pending document request
        existing_pending = registration.document_requests.filter(
            status=DocumentRequestStatus.PENDING
        ).exists()
        if existing_pending:
            return Response(
                {'detail': 'Une demande de complément est déjà en attente de réponse.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = RequestDocumentsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create document request
        doc_request = RegistrationDocumentRequest.create_request(
            registration=registration,
            requested_by=request.user,
            message=serializer.validated_data['message'],
            documents_requested=serializer.validated_data.get('documents_requested', [])
        )
        
        # Update registration status
        old_status = registration.status
        registration.status = MerchantRegistrationStatus.PENDING_DOCUMENTS
        registration.save()
        
        # Create comment for history
        RegistrationComment.objects.create(
            registration=registration,
            comment_type=RegistrationCommentType.DOCUMENT_REQUEST,
            author=request.user,
            content=serializer.validated_data['message'],
            document_request=doc_request,
            old_status=old_status,
            new_status=MerchantRegistrationStatus.PENDING_DOCUMENTS
        )
        
        # Build secure URL for merchant
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        submit_url = f"{frontend_url}/complete-registration/{doc_request.access_token}"
        
        # Send email to merchant
        try:
            EmailService.send_document_request_email(registration, doc_request, submit_url)
        except Exception as e:
            return Response({
                'detail': 'Demande créée mais erreur lors de l\'envoi de l\'email.',
                'error': str(e),
                'document_request_id': str(doc_request.id)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'detail': 'Demande de complément envoyée au commerçant.',
            'document_request': RegistrationDocumentRequestSerializer(doc_request).data
        })
    
    @action(detail=True, methods=['post'])
    def review_documents(self, request, pk=None):
        """
        Review submitted documents and take action.
        Actions: accept (approve registration), request_more, reject
        """
        registration = self.get_object()
        
        if registration.status != MerchantRegistrationStatus.PENDING_DOCUMENTS:
            return Response(
                {'detail': 'Cette demande n\'a pas de documents à réviser.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the submitted document request
        doc_request = registration.document_requests.filter(
            status=DocumentRequestStatus.SUBMITTED
        ).first()
        
        if not doc_request:
            return Response(
                {'detail': 'Aucun document soumis à réviser.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ReviewDocumentsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action_type = serializer.validated_data['action']
        notes = serializer.validated_data.get('notes', '')
        
        # Mark document request as reviewed
        doc_request.status = DocumentRequestStatus.REVIEWED
        doc_request.reviewed_by = request.user
        doc_request.reviewed_at = timezone.now()
        doc_request.review_notes = notes
        doc_request.save()
        
        if action_type == 'accept':
            # Approve the registration
            old_status = registration.status
            registration.status = MerchantRegistrationStatus.APPROVED
            registration.reviewed_by = request.user
            registration.reviewed_at = timezone.now()
            registration.save()
            
            # Create comment
            RegistrationComment.objects.create(
                registration=registration,
                comment_type=RegistrationCommentType.STATUS_CHANGE,
                author=request.user,
                content=f"Dossier approuvé après révision des documents. {notes}".strip(),
                document_request=doc_request,
                old_status=old_status,
                new_status=MerchantRegistrationStatus.APPROVED
            )
            
            # Create activation token and send email
            activation_token = AccountActivationToken.create_for_request(registration)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            activation_url = f"{frontend_url}/activate-account/{activation_token.token}"
            
            try:
                EmailService.send_registration_approved_email(registration, activation_url)
            except Exception:
                pass
            
            return Response({
                'detail': 'Dossier approuvé. Email d\'activation envoyé au commerçant.',
                'status': registration.status
            })
        
        elif action_type == 'request_more':
            # Create new document request
            message = serializer.validated_data.get('message', '')
            documents_requested = serializer.validated_data.get('documents_requested', [])
            
            if not message:
                return Response(
                    {'detail': 'Un message est requis pour demander plus de documents.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            new_doc_request = RegistrationDocumentRequest.create_request(
                registration=registration,
                requested_by=request.user,
                message=message,
                documents_requested=documents_requested
            )
            
            # Create comment
            RegistrationComment.objects.create(
                registration=registration,
                comment_type=RegistrationCommentType.DOCUMENT_REQUEST,
                author=request.user,
                content=message,
                document_request=new_doc_request
            )
            
            # Send email
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            submit_url = f"{frontend_url}/complete-registration/{new_doc_request.access_token}"
            
            try:
                EmailService.send_document_request_email(registration, new_doc_request, submit_url)
            except Exception:
                pass
            
            return Response({
                'detail': 'Nouvelle demande de complément envoyée.',
                'document_request': RegistrationDocumentRequestSerializer(new_doc_request).data
            })
        
        elif action_type == 'reject':
            reason = serializer.validated_data.get('rejection_reason', notes)
            old_status = registration.status
            registration.status = MerchantRegistrationStatus.REJECTED
            registration.rejection_reason = reason
            registration.reviewed_by = request.user
            registration.reviewed_at = timezone.now()
            registration.save()
            
            # Create comment
            RegistrationComment.objects.create(
                registration=registration,
                comment_type=RegistrationCommentType.STATUS_CHANGE,
                author=request.user,
                content=f"Dossier rejeté. Raison: {reason}",
                document_request=doc_request,
                old_status=old_status,
                new_status=MerchantRegistrationStatus.REJECTED
            )
            
            try:
                EmailService.send_registration_rejected_email(registration, reason)
            except Exception:
                pass
            
            return Response({
                'detail': 'Demande rejetée.',
                'reason': reason
            })
        
        return Response({'detail': 'Action non reconnue.'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """Get all comments/history for a registration."""
        registration = self.get_object()
        comments = registration.comments.all()
        serializer = RegistrationCommentSerializer(comments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Add a comment/note to a registration."""
        registration = self.get_object()
        
        serializer = AddCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        comment = RegistrationComment.objects.create(
            registration=registration,
            comment_type=RegistrationCommentType.ADMIN_NOTE,
            author=request.user,
            content=serializer.validated_data['content'],
            is_internal=serializer.validated_data.get('is_internal', False)
        )
        
        return Response({
            'detail': 'Commentaire ajouté.',
            'comment': RegistrationCommentSerializer(comment).data
        })
    
    @action(detail=True, methods=['post'])
    def resend_activation(self, request, pk=None):
        """Resend activation link to merchant."""
        registration = self.get_object()
        
        if registration.status != MerchantRegistrationStatus.APPROVED:
            return Response(
                {'detail': 'Cette demande n\'est pas approuvée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if registration.created_user:
            return Response(
                {'detail': 'Le compte a déjà été activé.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Invalidate old tokens
        AccountActivationToken.objects.filter(
            registration_request=registration,
            is_used=False
        ).update(is_used=True)
        
        # Create new activation token
        activation_token = AccountActivationToken.objects.create(
            registration_request=registration,
            token=AccountActivationToken.generate_token(),
            expires_at=timezone.now() + timezone.timedelta(days=7)
        )
        
        # Send email
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        activation_url = f"{frontend_url}/activate-account/{activation_token.token}"
        
        try:
            EmailService.send_registration_approved_email(registration, activation_url)
        except Exception as e:
            return Response(
                {'detail': f'Erreur lors de l\'envoi de l\'email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'detail': f'Lien d\'activation renvoyé à {registration.email}.'
        })
    
    @action(detail=True, methods=['post'])
    def send_password_reset(self, request, pk=None):
        """Send password reset link to merchant."""
        registration = self.get_object()
        
        if registration.status != MerchantRegistrationStatus.APPROVED:
            return Response(
                {'detail': 'Cette demande n\'est pas approuvée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not registration.created_user:
            return Response(
                {'detail': 'Le compte n\'a pas encore été activé.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = registration.created_user
        
        # Create password reset token
        from .models import PasswordResetToken
        reset_token = PasswordResetToken.create_for_user(user)
        
        # Send email
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_url = f"{frontend_url}/reset-password/{reset_token.token}"
        
        try:
            EmailService.send_password_reset_email(user, reset_url)
        except Exception as e:
            return Response(
                {'detail': f'Erreur lors de l\'envoi de l\'email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'detail': f'Lien de réinitialisation envoyé à {user.email}.'
        })


# ============================================
# PUBLIC DOCUMENT SUBMISSION VIEWS
# ============================================

class ValidateDocumentRequestTokenView(APIView):
    """
    Validate document request token and return request info.
    Public endpoint for merchants to access their document request.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request, token):
        try:
            doc_request = RegistrationDocumentRequest.objects.get(access_token=token)
        except RegistrationDocumentRequest.DoesNotExist:
            return Response(
                {'detail': 'Lien invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not doc_request.is_token_valid():
            return Response(
                {'detail': 'Ce lien a expiré ou les documents ont déjà été soumis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'valid': True,
            'document_request': RegistrationDocumentRequestPublicSerializer(doc_request).data
        })


class UploadDocumentView(APIView):
    """
    Upload a document file.
    Public endpoint for merchants to upload files.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, token):
        try:
            doc_request = RegistrationDocumentRequest.objects.get(access_token=token)
        except RegistrationDocumentRequest.DoesNotExist:
            return Response(
                {'detail': 'Lien invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not doc_request.is_token_valid():
            return Response(
                {'detail': 'Ce lien a expiré.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'detail': 'Aucun fichier fourni.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        import os
        from django.conf import settings
        
        # Check if Cloudinary is configured
        if os.getenv('CLOUDINARY_CLOUD_NAME'):
            import cloudinary
            import cloudinary.uploader
            
            folder = f"documents/{doc_request.registration.id}"
            content_type = file.content_type or ''
            
            # Use resource_type='auto' to let Cloudinary handle all file types
            # This allows PDF and other files to be publicly accessible
            result = cloudinary.uploader.upload(
                file,
                folder=folder,
                resource_type='auto',
                type='upload',
                access_mode='public'
            )
            file_url = result.get('secure_url', result.get('url'))
        else:
            # Local storage fallback for development
            from django.core.files.storage import default_storage
            import uuid
            ext = os.path.splitext(file.name)[1]
            filename = f"{uuid.uuid4().hex}{ext}"
            file_path = f"documents/{doc_request.registration.id}/{filename}"
            saved_path = default_storage.save(file_path, file)
            file_url = default_storage.url(saved_path)
        
        return Response({
            'name': file.name,
            'file_path': file_url,
            'file_type': file.content_type,
            'file_size': file.size,
        })


class SubmitDocumentsView(APIView):
    """
    Submit documents in response to a document request.
    Public endpoint for merchants.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request, token):
        try:
            doc_request = RegistrationDocumentRequest.objects.get(access_token=token)
        except RegistrationDocumentRequest.DoesNotExist:
            return Response(
                {'detail': 'Lien invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not doc_request.is_token_valid():
            return Response(
                {'detail': 'Ce lien a expiré ou les documents ont déjà été soumis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SubmitDocumentsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update document request
        doc_request.merchant_response = serializer.validated_data['response_message']
        doc_request.status = DocumentRequestStatus.SUBMITTED
        doc_request.submitted_at = timezone.now()
        doc_request.save()
        
        # Save uploaded documents
        documents_data = serializer.validated_data.get('documents', [])
        for doc_data in documents_data:
            RegistrationDocument.objects.create(
                document_request=doc_request,
                name=doc_data.get('name', 'Document'),
                file_path=doc_data.get('file_path', ''),
                file_type=doc_data.get('file_type', ''),
                file_size=doc_data.get('file_size', 0)
            )
        
        # Create comment for history
        registration = doc_request.registration
        RegistrationComment.objects.create(
            registration=registration,
            comment_type=RegistrationCommentType.MERCHANT_RESPONSE,
            author_name=f"{registration.first_name} {registration.last_name}",
            content=serializer.validated_data['response_message'],
            document_request=doc_request
        )
        
        # Notify the admin who requested the documents
        if doc_request.requested_by:
            Notification.objects.create(
                user=doc_request.requested_by,
                notification_type=NotificationType.DOCUMENT_SUBMITTED,
                title=f"Documents soumis - {registration.company_name}",
                message=f"Le commerçant {registration.company_name} a soumis les documents demandés.",
                related_object_type='MerchantRegistrationRequest',
                related_object_id=registration.id,
                action_url=f"/admin/merchants/registrations/{registration.id}"
            )
            
            # Send email notification to admin
            try:
                EmailService.send_documents_submitted_notification(doc_request)
            except Exception:
                pass
        
        # Send confirmation email to merchant
        try:
            EmailService.send_documents_submission_confirmation_to_merchant(doc_request)
        except Exception:
            pass
        
        return Response({
            'detail': 'Documents soumis avec succès. Votre dossier sera réexaminé.',
            'submitted_at': doc_request.submitted_at
        })


# ============================================
# NOTIFICATION VIEWS
# ============================================

class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for user notifications."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_read', 'notification_type']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user)
        
        # Filter by is_read if provided
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        # Filter by notification_type if provided
        notification_type = self.request.query_params.get('notification_type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'detail': 'Notification marquée comme lue.'})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'detail': 'Toutes les notifications marquées comme lues.'})


# ============================================
# ACCOUNT ACTIVATION VIEWS
# ============================================

class ValidateActivationTokenView(APIView):
    """
    Validate activation token and return registration info.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, token):
        try:
            activation_token = AccountActivationToken.objects.get(token=token)
        except AccountActivationToken.DoesNotExist:
            return Response(
                {'detail': 'Lien d\'activation invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not activation_token.is_valid():
            return Response(
                {'detail': 'Ce lien d\'activation a expiré ou a déjà été utilisé.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        registration = activation_token.registration_request
        
        return Response({
            'valid': True,
            'email': registration.email,
            'first_name': registration.first_name,
            'last_name': registration.last_name,
            'company_name': registration.company_name,
            'login_email': registration.email,
        })


class ActivateAccountView(APIView):
    """
    Activate merchant account with password setup.
    Creates user and merchant entities.
    """
    permission_classes = [AllowAny]
    
    def post(self, request, token):
        password = request.data.get('password')
        password_confirm = request.data.get('password_confirm')
        
        if not password or not password_confirm:
            return Response(
                {'detail': 'Mot de passe requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if password != password_confirm:
            return Response(
                {'detail': 'Les mots de passe ne correspondent pas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(password) < 8:
            return Response(
                {'detail': 'Le mot de passe doit contenir au moins 8 caractères.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            activation_token = AccountActivationToken.objects.get(token=token)
        except AccountActivationToken.DoesNotExist:
            return Response(
                {'detail': 'Lien d\'activation invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not activation_token.is_valid():
            return Response(
                {'detail': 'Ce lien d\'activation a expiré ou a déjà été utilisé.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        registration = activation_token.registration_request
        
        # Create user
        user = User(
            email=registration.email,
            first_name=registration.first_name,
            last_name=registration.last_name,
            phone=registration.phone,
            role=UserRole.MERCHANT,
            is_active=True
        )
        user.set_password(password)
        user.save()
        
        # Create merchant
        from apps.merchants.models import Merchant, MerchantStatus
        merchant = Merchant.objects.create(
            name=registration.company_name,
            trade_name=registration.trade_name,
            registration_number=registration.registration_number,
            tax_id=registration.tax_id,
            address_line1=registration.address,
            city=registration.city,
            province=registration.province,
            contact_name=f"{registration.first_name} {registration.last_name}",
            contact_email=registration.company_email,
            contact_phone=registration.company_phone,
            bank_name=registration.bank_name,
            bank_account_number=registration.bank_account_number,
            mobile_money_number=registration.mobile_money_number,
            mobile_money_provider=registration.mobile_money_provider,
            status=MerchantStatus.APPROVED,
            approved_at=timezone.now()
        )
        
        # Link user to merchant
        user.merchant_id = merchant.id
        user.save()
        
        # Update registration request
        registration.created_user = user
        registration.created_merchant_id = merchant.id
        registration.save()
        
        # Mark token as used
        activation_token.is_used = True
        activation_token.save()
        
        # Generate JWT tokens for auto-login
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'detail': 'Compte activé avec succès. Bienvenue !',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })


class ForgotPasswordView(APIView):
    """
    Request password reset email.
    Public endpoint.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        from .models import PasswordResetToken
        from .services import EmailService
        
        email = request.data.get('email', '').strip().lower()
        
        if not email:
            return Response(
                {'detail': 'Adresse email requise.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user exists
        User = get_user_model()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Cette adresse email n\'est associée à aucun compte. Veuillez contacter un administrateur.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is active
        if not user.is_active:
            return Response(
                {'detail': 'Ce compte n\'est pas activé. Veuillez d\'abord activer votre compte.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create password reset token
        reset_token = PasswordResetToken.create_for_user(user)
        
        # Build reset URL
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_url = f"{frontend_url}/reset-password/{reset_token.token}"
        
        # Send email
        try:
            EmailService.send_password_reset_email(user, reset_url)
        except Exception as e:
            return Response(
                {'detail': f'Erreur lors de l\'envoi de l\'email. Veuillez réessayer.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'detail': 'Un email de réinitialisation a été envoyé à votre adresse email.',
            'email': email
        })


class ValidatePasswordResetTokenView(APIView):
    """
    Validate password reset token.
    Public endpoint.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request, token):
        from .models import PasswordResetToken
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'detail': 'Lien de réinitialisation invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not reset_token.is_valid():
            return Response(
                {'detail': 'Ce lien a expiré ou a déjà été utilisé.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = reset_token.user
        
        return Response({
            'valid': True,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        })


class ResetPasswordView(APIView):
    """
    Reset password with token.
    Public endpoint.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request, token):
        from .models import PasswordResetToken
        
        password = request.data.get('password')
        password_confirm = request.data.get('password_confirm')
        
        if not password or not password_confirm:
            return Response(
                {'detail': 'Mot de passe requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if password != password_confirm:
            return Response(
                {'detail': 'Les mots de passe ne correspondent pas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(password) < 8:
            return Response(
                {'detail': 'Le mot de passe doit contenir au moins 8 caractères.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'detail': 'Lien de réinitialisation invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not reset_token.is_valid():
            return Response(
                {'detail': 'Ce lien a expiré ou a déjà été utilisé.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = reset_token.user
        user.set_password(password)
        user.save()
        
        # Mark token as used
        reset_token.is_used = True
        reset_token.save()
        
        # Generate JWT tokens for auto-login
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'detail': 'Mot de passe réinitialisé avec succès.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })


class ValidateMerchantInvitationView(APIView):
    """
    Validate merchant user invitation token.
    Public endpoint.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request, token):
        from .models import MerchantUserInvitation
        
        try:
            invitation = MerchantUserInvitation.objects.select_related(
                'merchant', 'outlet', 'invited_by'
            ).get(token=token)
        except MerchantUserInvitation.DoesNotExist:
            return Response(
                {'detail': 'Lien d\'invitation invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not invitation.is_valid():
            return Response(
                {'detail': 'Cette invitation a expiré ou a déjà été utilisée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'valid': True,
            'email': invitation.email,
            'first_name': invitation.first_name,
            'last_name': invitation.last_name,
            'merchant_name': invitation.merchant.name,
            'role': invitation.role,
            'role_display': 'Admin Commerçant' if invitation.role == 'MERCHANT' else 'Employé',
            'outlet_name': invitation.outlet.name if invitation.outlet else None,
            'invited_by': invitation.invited_by.full_name if invitation.invited_by else None,
        })


class AcceptMerchantInvitationView(APIView):
    """
    Accept merchant user invitation and create account.
    Public endpoint.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request, token):
        from .models import MerchantUserInvitation
        
        password = request.data.get('password')
        password_confirm = request.data.get('password_confirm')
        
        if not password or not password_confirm:
            return Response(
                {'detail': 'Mot de passe requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if password != password_confirm:
            return Response(
                {'detail': 'Les mots de passe ne correspondent pas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(password) < 8:
            return Response(
                {'detail': 'Le mot de passe doit contenir au moins 8 caractères.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            invitation = MerchantUserInvitation.objects.select_related(
                'merchant', 'outlet'
            ).get(token=token)
        except MerchantUserInvitation.DoesNotExist:
            return Response(
                {'detail': 'Lien d\'invitation invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not invitation.is_valid():
            return Response(
                {'detail': 'Cette invitation a expiré ou a déjà été utilisée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = invitation.accept(password)
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Log the action
        from apps.audit.services import AuditService
        AuditService.log(
            actor=user,
            action='MERCHANT_INVITATION_ACCEPTED',
            entity='User',
            entity_id=str(user.id),
            metadata={
                'merchant': invitation.merchant.name,
                'role': invitation.role,
                'outlet': invitation.outlet.name if invitation.outlet else None
            }
        )
        
        # Generate JWT tokens for auto-login
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'detail': 'Compte activé avec succès. Bienvenue !',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })


class ProxyDocumentDownloadView(APIView):
    """
    Proxy endpoint to download documents from Cloudinary.
    This bypasses Cloudinary's PDF delivery restrictions on free plans.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, document_id):
        import requests as http_requests
        from django.http import HttpResponse
        import os
        
        try:
            document = RegistrationDocument.objects.get(id=document_id)
        except RegistrationDocument.DoesNotExist:
            return Response(
                {'detail': 'Document non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        file_url = document.file_path
        
        if not file_url:
            return Response(
                {'detail': 'URL du document non disponible.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            if 'cloudinary.com' in file_url:
                cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
                api_key = os.getenv('CLOUDINARY_API_KEY')
                api_secret = os.getenv('CLOUDINARY_API_SECRET')
                
                # Try direct download first
                response = http_requests.get(file_url, timeout=30)
                
                if response.status_code == 401 and api_key and api_secret:
                    # Use Cloudinary Admin API to get the resource
                    import cloudinary
                    import cloudinary.api
                    
                    # Parse public_id from URL
                    url_parts = file_url.split('/')
                    version_idx = None
                    for i, part in enumerate(url_parts):
                        if part.startswith('v') and len(part) > 1 and part[1:].isdigit():
                            version_idx = i
                            break
                    
                    if version_idx:
                        public_id_with_ext = '/'.join(url_parts[version_idx+1:])
                        public_id = public_id_with_ext.rsplit('.', 1)[0]
                        
                        # Determine resource type
                        resource_type = 'image'
                        if '/raw/' in file_url:
                            resource_type = 'raw'
                        
                        # Get resource info from Cloudinary
                        try:
                            resource = cloudinary.api.resource(public_id, resource_type=resource_type)
                            # Try to get the file using authenticated URL
                            import hashlib
                            import time
                            
                            timestamp = int(time.time())
                            to_sign = f"timestamp={timestamp}{api_secret}"
                            signature = hashlib.sha1(to_sign.encode()).hexdigest()
                            
                            # Download using admin credentials
                            auth_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/{resource_type}/download?public_id={public_id}&api_key={api_key}&timestamp={timestamp}&signature={signature}"
                            response = http_requests.get(auth_url, timeout=30)
                        except Exception:
                            pass
                
                if response.status_code == 200:
                    content_type = document.file_type or response.headers.get('Content-Type', 'application/octet-stream')
                    http_response = HttpResponse(response.content, content_type=content_type)
                    http_response['Content-Disposition'] = f'attachment; filename="{document.name}"'
                    return http_response
                else:
                    return Response(
                        {'detail': f'Erreur lors du téléchargement: {response.status_code}. Veuillez activer "Allow delivery of PDF and ZIP files" dans les paramètres Cloudinary.'},
                        status=status.HTTP_502_BAD_GATEWAY
                    )
            else:
                response = http_requests.get(file_url, timeout=30)
                if response.status_code == 200:
                    content_type = document.file_type or 'application/octet-stream'
                    http_response = HttpResponse(response.content, content_type=content_type)
                    http_response['Content-Disposition'] = f'attachment; filename="{document.name}"'
                    return http_response
                else:
                    return Response(
                        {'detail': 'Fichier non accessible.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                    
        except http_requests.RequestException as e:
            return Response(
                {'detail': f'Erreur de téléchargement: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY
            )
