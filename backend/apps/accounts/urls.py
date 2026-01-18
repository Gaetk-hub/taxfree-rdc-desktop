"""
URL configuration for accounts app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView, 
    UserViewSet,
    ClientRegistrationView,
    MerchantRegistrationView,
    MerchantRegistrationRequestViewSet,
    LoginStep1View,
    LoginStep2View,
    LogoutView,
    ResendOTPView,
    ValidateActivationTokenView,
    ActivateAccountView,
    ValidateDocumentRequestTokenView,
    UploadDocumentView,
    SubmitDocumentsView,
    NotificationViewSet,
    ForgotPasswordView,
    ValidatePasswordResetTokenView,
    ResetPasswordView,
    ValidateMerchantInvitationView,
    AcceptMerchantInvitationView,
    ProxyDocumentDownloadView,
)
from .admin_views import (
    AdminUserViewSet,
    PermissionPresetViewSet,
    SystemUserInvitationViewSet,
    ActivateSystemUserView,
    SystemUsersPermissionsView,
    MyPermissionsView,
)

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')
router.register('registration-requests', MerchantRegistrationRequestViewSet, basename='registration-request')
router.register('notifications', NotificationViewSet, basename='notification')

# Admin router for enhanced user management
admin_router = DefaultRouter()
admin_router.register('users', AdminUserViewSet, basename='admin-user')
admin_router.register('presets', PermissionPresetViewSet, basename='permission-preset')
admin_router.register('invitations', SystemUserInvitationViewSet, basename='system-invitation')

urlpatterns = [
    # 2FA Authentication
    path('login/', LoginStep1View.as_view(), name='login-step1'),
    path('verify-otp/', LoginStep2View.as_view(), name='login-step2'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    
    # Account Activation (for merchants)
    path('validate-token/<str:token>/', ValidateActivationTokenView.as_view(), name='validate-activation-token'),
    path('activate/<str:token>/', ActivateAccountView.as_view(), name='activate-account'),
    
    # Password Reset
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('validate-reset-token/<str:token>/', ValidatePasswordResetTokenView.as_view(), name='validate-reset-token'),
    path('reset-password/<str:token>/', ResetPasswordView.as_view(), name='reset-password'),
    
    # Merchant User Invitation (public endpoints)
    path('invitation/<str:token>/', ValidateMerchantInvitationView.as_view(), name='validate-invitation'),
    path('invitation/<str:token>/accept/', AcceptMerchantInvitationView.as_view(), name='accept-invitation'),
    
    # Document Request (public endpoints for merchants)
    path('document-request/<str:token>/', ValidateDocumentRequestTokenView.as_view(), name='validate-document-request'),
    path('document-request/<str:token>/upload/', UploadDocumentView.as_view(), name='upload-document'),
    path('document-request/<str:token>/submit/', SubmitDocumentsView.as_view(), name='submit-documents'),
    
    # Document download proxy (bypasses Cloudinary PDF restrictions)
    path('documents/<uuid:document_id>/download/', ProxyDocumentDownloadView.as_view(), name='proxy-document-download'),
    
    # Token refresh
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Registration
    path('register/client/', ClientRegistrationView.as_view(), name='client-registration'),
    path('register/merchant/', MerchantRegistrationView.as_view(), name='merchant-registration'),
    
    # System User Invitation (public endpoints)
    path('activate-system-user/<str:token>/', ActivateSystemUserView.as_view(), name='activate-system-user'),
    
    # Admin routes for user management
    path('admin/', include(admin_router.urls)),
    path('admin/permissions/', SystemUsersPermissionsView.as_view(), name='system-permissions'),
    path('my-permissions/', MyPermissionsView.as_view(), name='my-permissions'),
    
    path('', include(router.urls)),
]
