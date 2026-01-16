"""
Email and authentication services for the accounts app.
"""
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags


class EmailService:
    """Service for sending emails with modern, responsive templates."""
    
    @staticmethod
    def _get_base_styles():
        """Return base CSS styles for all email templates."""
        return """
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6; 
                color: #1f2937;
                background-color: #f3f4f6;
                -webkit-font-smoothing: antialiased;
            }
            .wrapper {
                width: 100%;
                background-color: #f3f4f6;
                padding: 40px 20px;
            }
            .container { 
                max-width: 600px; 
                margin: 0 auto;
                background: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .header { 
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
                color: white; 
                padding: 40px 30px;
                text-align: center;
            }
            .header-icon {
                width: 70px;
                height: 70px;
                background: rgba(255,255,255,0.2);
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 32px;
            }
            .header h1 {
                font-size: 24px;
                font-weight: 700;
                margin: 0;
                letter-spacing: -0.5px;
            }
            .header p {
                margin-top: 8px;
                opacity: 0.9;
                font-size: 14px;
            }
            .content { 
                padding: 40px 30px;
            }
            .greeting {
                font-size: 16px;
                color: #374151;
                margin-bottom: 20px;
            }
            .message {
                font-size: 15px;
                color: #4b5563;
                margin-bottom: 24px;
                line-height: 1.7;
            }
            .btn {
                display: inline-block;
                padding: 14px 32px;
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 600;
                font-size: 15px;
                text-align: center;
                transition: all 0.2s;
                box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.4);
            }
            .btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 20px 0 rgba(37, 99, 235, 0.5);
            }
            .btn-success {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4);
            }
            .info-box {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
                margin: 24px 0;
            }
            .warning-box {
                background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
                border: 1px solid #fcd34d;
                border-left: 4px solid #f59e0b;
                border-radius: 8px;
                padding: 16px 20px;
                margin: 24px 0;
                font-size: 14px;
                color: #92400e;
            }
            .error-box {
                background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
                border: 1px solid #fca5a5;
                border-left: 4px solid #ef4444;
                border-radius: 8px;
                padding: 16px 20px;
                margin: 24px 0;
                font-size: 14px;
                color: #991b1b;
            }
            .success-box {
                background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
                border: 1px solid #6ee7b7;
                border-left: 4px solid #10b981;
                border-radius: 8px;
                padding: 16px 20px;
                margin: 24px 0;
                font-size: 14px;
                color: #065f46;
            }
            .divider {
                height: 1px;
                background: linear-gradient(to right, transparent, #e5e7eb, transparent);
                margin: 30px 0;
            }
            .footer { 
                background: #f9fafb;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
            }
            .footer-logo {
                font-size: 18px;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 12px;
            }
            .footer-text {
                font-size: 13px;
                color: #6b7280;
                margin-bottom: 8px;
            }
            .footer-links {
                margin-top: 16px;
            }
            .footer-links a {
                color: #2563eb;
                text-decoration: none;
                font-size: 13px;
                margin: 0 10px;
            }
            .social-links {
                margin-top: 20px;
            }
            .social-links a {
                display: inline-block;
                width: 36px;
                height: 36px;
                background: #e5e7eb;
                border-radius: 50%;
                margin: 0 5px;
                line-height: 36px;
                text-align: center;
                color: #4b5563;
                text-decoration: none;
            }
            @media only screen and (max-width: 600px) {
                .wrapper { padding: 10px 5px !important; }
                .container { border-radius: 10px !important; }
                .header { padding: 20px 12px !important; }
                .header-icon { width: 45px !important; height: 45px !important; font-size: 22px !important; margin-bottom: 12px !important; }
                .header h1 { font-size: 16px !important; }
                .header p { font-size: 11px !important; }
                .content { padding: 20px 12px !important; }
                .greeting { font-size: 13px !important; }
                .message { font-size: 12px !important; line-height: 1.5 !important; }
                .btn { display: block !important; text-align: center !important; padding: 10px 16px !important; font-size: 13px !important; border-radius: 8px !important; }
                .info-box { padding: 12px !important; font-size: 12px !important; }
                .warning-box, .error-box, .success-box { padding: 10px 12px !important; font-size: 11px !important; }
                .footer { padding: 15px 12px !important; }
                .footer-logo { font-size: 14px !important; }
                .footer-text { font-size: 10px !important; }
                .divider { margin: 15px 0 !important; }
            }
            @media only screen and (max-width: 400px) {
                .wrapper { padding: 8px 4px !important; }
                .header { padding: 15px 10px !important; }
                .header-icon { width: 40px !important; height: 40px !important; font-size: 20px !important; }
                .header h1 { font-size: 14px !important; }
                .content { padding: 15px 10px !important; }
                .greeting { font-size: 12px !important; }
                .message { font-size: 11px !important; }
                .btn { padding: 8px 14px !important; font-size: 12px !important; }
            }
        """
    
    @staticmethod
    def send_otp_email(user, otp_code):
        """Send OTP code to user for 2FA verification."""
        subject = '🔐 Code de vérification - Tax Free RDC'
        
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code de vérification</title>
            <style>{EmailService._get_base_styles()}</style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <div class="header-icon">🔐</div>
                        <h1>Code de Vérification</h1>
                        <p>Sécurisez votre connexion</p>
                    </div>
                    
                    <div class="content">
                        <p class="greeting">Bonjour <strong>{user.first_name}</strong>,</p>
                        
                        <p class="message">
                            Une tentative de connexion a été détectée sur votre compte Tax Free RDC. 
                            Utilisez le code ci-dessous pour confirmer votre identité :
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="display: inline-block; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; border-radius: 16px; padding: 25px 40px;">
                                <div style="font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #0369a1; font-family: 'Courier New', monospace;">
                                    {otp_code}
                                </div>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-bottom: 24px;">
                            <span style="display: inline-flex; align-items: center; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                                ⏱️ Ce code expire dans <strong style="margin-left: 4px;">5 minutes</strong>
                            </span>
                        </div>
                        
                        <div class="warning-box">
                            <strong>⚠️ Attention :</strong> Ne partagez jamais ce code avec personne. 
                            Notre équipe ne vous demandera jamais ce code par téléphone ou par email.
                        </div>
                        
                        <div class="divider"></div>
                        
                        <p style="font-size: 13px; color: #6b7280; text-align: center;">
                            Si vous n'avez pas tenté de vous connecter, ignorez cet email ou 
                            <a href="#" style="color: #2563eb;">contactez notre support</a>.
                        </p>
                    </div>
                    
                    <div class="footer">
                        <div class="footer-logo">🇨🇩 Tax Free RDC</div>
                        <p class="footer-text">Système de détaxe de la République Démocratique du Congo</p>
                        <p class="footer-text">© 2026 Tax Free RDC - Tous droits réservés</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = f"""
Bonjour {user.first_name},

Une tentative de connexion a été détectée sur votre compte Tax Free RDC.

Votre code de vérification : {otp_code}

Ce code expire dans 5 minutes.

⚠️ Ne partagez jamais ce code avec personne.

---
Tax Free RDC
© 2026 Tous droits réservés
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    
    @staticmethod
    def send_registration_notification_to_admin(registration_request):
        """Notify admin about new merchant registration."""
        from .models import User, UserRole
        from django.conf import settings
        
        admins = User.objects.filter(role=UserRole.ADMIN, is_active=True)
        admin_emails = [admin.email for admin in admins]
        
        if not admin_emails:
            return
        
        # Build the admin dashboard URL for this registration request
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        admin_dashboard_url = f"{frontend_url}/admin/merchants/{registration_request.id}"
        
        subject = f'📋 Nouvelle demande d\'inscription - {registration_request.company_name}'
        
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nouvelle demande d'inscription</title>
            <style>{EmailService._get_base_styles()}
                .info-card {{
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    overflow: hidden;
                    margin: 24px 0;
                }}
                .info-card-header {{
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    padding: 16px 20px;
                    border-bottom: 1px solid #e5e7eb;
                    font-weight: 600;
                    color: #374151;
                    font-size: 14px;
                }}
                .info-row {{
                    display: flex;
                    padding: 14px 20px;
                    border-bottom: 1px solid #f3f4f6;
                }}
                .info-row:last-child {{ border-bottom: none; }}
                .info-label {{
                    width: 40%;
                    color: #6b7280;
                    font-size: 13px;
                    font-weight: 500;
                }}
                .info-value {{
                    width: 60%;
                    color: #1f2937;
                    font-size: 14px;
                    font-weight: 500;
                }}
                .badge {{
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                }}
                .badge-new {{
                    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                    color: #1d4ed8;
                }}
                .badge-pending {{
                    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                    color: #92400e;
                }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%);">
                        <div class="header-icon">📋</div>
                        <h1>Nouvelle Demande d'Inscription</h1>
                        <p>Action requise - Examen de la demande</p>
                    </div>
                    
                    <div class="content">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                            <div>
                                <p style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">Entreprise</p>
                                <p style="font-size: 20px; font-weight: 700; color: #1f2937;">{registration_request.company_name}</p>
                            </div>
                            <span class="badge badge-pending">⏳ En attente</span>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-card-header">👤 Informations du contact</div>
                            <div class="info-row">
                                <span class="info-label">Nom complet</span>
                                <span class="info-value">{registration_request.first_name} {registration_request.last_name}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Email</span>
                                <span class="info-value"><a href="mailto:{registration_request.email}" style="color: #2563eb; text-decoration: none;">{registration_request.email}</a></span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Téléphone</span>
                                <span class="info-value">{registration_request.phone}</span>
                            </div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-card-header">🏢 Informations de l'entreprise</div>
                            <div class="info-row">
                                <span class="info-label">Nom commercial</span>
                                <span class="info-value">{registration_request.trade_name or '-'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">N° RCCM</span>
                                <span class="info-value" style="font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">{registration_request.registration_number}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">N° NIF</span>
                                <span class="info-value" style="font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">{registration_request.tax_id}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Secteur d'activité</span>
                                <span class="info-value">{registration_request.business_sector}</span>
                            </div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-card-header">📍 Localisation</div>
                            <div class="info-row">
                                <span class="info-label">Province</span>
                                <span class="info-value">{registration_request.province}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Ville</span>
                                <span class="info-value">{registration_request.city}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Adresse</span>
                                <span class="info-value">{registration_request.address}</span>
                            </div>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <div style="text-align: center;">
                            <p class="message" style="margin-bottom: 20px;">
                                Connectez-vous au système d'administration pour examiner cette demande et l'approuver ou la rejeter.
                            </p>
                            <a href="{admin_dashboard_url}" class="btn" style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); box-shadow: 0 4px 14px 0 rgba(124, 58, 237, 0.4);">
                                Accéder au tableau de bord
                            </a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <div class="footer-logo">🇨🇩 Tax Free RDC - Administration</div>
                        <p class="footer-text">Cet email a été envoyé automatiquement par le système.</p>
                        <p class="footer-text">© 2026 Tax Free RDC - Tous droits réservés</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = f"""
NOUVELLE DEMANDE D'INSCRIPTION COMMERÇANT
=========================================

Entreprise: {registration_request.company_name}
Nom commercial: {registration_request.trade_name or '-'}

CONTACT
-------
Nom: {registration_request.first_name} {registration_request.last_name}
Email: {registration_request.email}
Téléphone: {registration_request.phone}

INFORMATIONS LÉGALES
--------------------
N° RCCM: {registration_request.registration_number}
N° NIF: {registration_request.tax_id}
Secteur: {registration_request.business_sector}

LOCALISATION
------------
Province: {registration_request.province}
Ville: {registration_request.city}
Adresse: {registration_request.address}

---
Connectez-vous au système pour examiner cette demande.

Tax Free RDC - Administration
© 2026 Tous droits réservés
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            html_message=html_message,
            fail_silently=True,
        )
    
    @staticmethod
    def send_registration_approved_email(registration_request, activation_url):
        """Send approval email with activation link to merchant."""
        subject = '✅ Félicitations ! Votre demande a été approuvée - Tax Free RDC'
        
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Demande approuvée</title>
            <style>{EmailService._get_base_styles()}</style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);">
                        <div class="header-icon">🎉</div>
                        <h1>Félicitations !</h1>
                        <p>Votre demande a été approuvée</p>
                    </div>
                    
                    <div class="content">
                        <p class="greeting">Bonjour <strong>{registration_request.first_name}</strong>,</p>
                        
                        <div class="success-box">
                            <strong>✅ Bonne nouvelle !</strong> Votre demande d'inscription pour 
                            <strong>{registration_request.company_name}</strong> a été examinée et <strong>approuvée</strong> par notre équipe.
                        </div>
                        
                        <p class="message">
                            Il ne vous reste plus qu'une étape pour finaliser votre inscription : 
                            <strong>activer votre compte</strong> et <strong>créer votre mot de passe</strong>.
                        </p>
                        
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="{activation_url}" class="btn btn-success" style="font-size: 16px; padding: 16px 40px;">
                                🚀 Activer mon compte
                            </a>
                        </div>
                        
                        <div class="info-box" style="background: #f8fafc;">
                            <p style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">
                                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
                            </p>
                            <p style="word-break: break-all; background: #e5e7eb; padding: 12px; border-radius: 8px; font-size: 12px; font-family: monospace; color: #374151;">
                                {activation_url}
                            </p>
                        </div>
                        
                        <div class="warning-box">
                            <strong>⏰ Important :</strong> Ce lien d'activation expire dans <strong>7 jours</strong>. 
                            Après cette date, vous devrez contacter notre support pour obtenir un nouveau lien.
                        </div>
                        
                        <div class="divider"></div>
                        
                        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; text-align: center;">
                            <p style="font-size: 14px; color: #166534; margin-bottom: 12px; font-weight: 600;">
                                🎯 Prochaines étapes après activation
                            </p>
                            <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                                <div style="text-align: center;">
                                    <div style="width: 40px; height: 40px; background: #22c55e; border-radius: 50%; color: white; line-height: 40px; margin: 0 auto 8px; font-weight: bold;">1</div>
                                    <p style="font-size: 12px; color: #166534;">Créer votre<br>mot de passe</p>
                                </div>
                                <div style="text-align: center;">
                                    <div style="width: 40px; height: 40px; background: #22c55e; border-radius: 50%; color: white; line-height: 40px; margin: 0 auto 8px; font-weight: bold;">2</div>
                                    <p style="font-size: 12px; color: #166534;">Accéder à<br>votre espace</p>
                                </div>
                                <div style="text-align: center;">
                                    <div style="width: 40px; height: 40px; background: #22c55e; border-radius: 50%; color: white; line-height: 40px; margin: 0 auto 8px; font-weight: bold;">3</div>
                                    <p style="font-size: 12px; color: #166534;">Commencer<br>à utiliser</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <div class="footer-logo">🇨🇩 Tax Free RDC</div>
                        <p class="footer-text">Bienvenue dans notre réseau de partenaires !</p>
                        <p class="footer-text">© 2026 Tax Free RDC - Tous droits réservés</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = f"""
FÉLICITATIONS ! 🎉
==================

Bonjour {registration_request.first_name},

Votre demande d'inscription pour {registration_request.company_name} a été APPROUVÉE !

ACTIVEZ VOTRE COMPTE
--------------------
Cliquez sur le lien ci-dessous pour créer votre mot de passe et activer votre compte :

{activation_url}

⚠️ Ce lien expire dans 7 jours.

PROCHAINES ÉTAPES
-----------------
1. Créer votre mot de passe
2. Accéder à votre espace commerçant
3. Commencer à utiliser Tax Free RDC

---
Bienvenue dans notre réseau de partenaires !

Tax Free RDC
© 2026 Tous droits réservés
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[registration_request.email],
            html_message=html_message,
            fail_silently=False,
        )
    
    @staticmethod
    def send_registration_rejected_email(registration_request, reason):
        """Send rejection email to merchant."""
        subject = 'Information concernant votre demande - Tax Free RDC'
        
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Demande non approuvée</title>
            <style>{EmailService._get_base_styles()}</style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #374151 100%);">
                        <div class="header-icon">📄</div>
                        <h1>Information sur votre demande</h1>
                        <p>Mise à jour de votre dossier</p>
                    </div>
                    
                    <div class="content">
                        <p class="greeting">Bonjour <strong>{registration_request.first_name}</strong>,</p>
                        
                        <p class="message">
                            Nous avons examiné attentivement votre demande d'inscription pour 
                            <strong>{registration_request.company_name}</strong>.
                        </p>
                        
                        <p class="message">
                            Après analyse de votre dossier, nous ne sommes malheureusement pas en mesure 
                            d'approuver votre demande dans l'état actuel.
                        </p>
                        
                        <div class="error-box">
                            <p style="font-weight: 600; margin-bottom: 8px;">📋 Motif de la décision :</p>
                            <p style="margin: 0;">{reason or "Aucun motif spécifié. Veuillez contacter notre support pour plus d'informations."}</p>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 24px;">
                            <p style="font-size: 15px; color: #0369a1; font-weight: 600; margin-bottom: 12px;">
                                💡 Que pouvez-vous faire ?
                            </p>
                            <ul style="margin: 0; padding-left: 20px; color: #0c4a6e; font-size: 14px; line-height: 1.8;">
                                <li>Vérifier que toutes les informations fournies sont correctes</li>
                                <li>Vous assurer que vos documents légaux sont à jour</li>
                                <li>Soumettre une nouvelle demande avec les corrections nécessaires</li>
                                <li>Contacter notre support pour obtenir des clarifications</li>
                            </ul>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <div style="text-align: center;">
                            <p class="message" style="margin-bottom: 20px;">
                                Notre équipe reste à votre disposition pour vous accompagner dans vos démarches.
                            </p>
                            <a href="mailto:support@taxfree-rdc.cd" class="btn">
                                ✉️ Contacter le support
                            </a>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <p style="font-size: 14px; color: #6b7280; text-align: center;">
                            Nous vous remercions de votre intérêt pour Tax Free RDC et espérons 
                            pouvoir vous compter parmi nos partenaires prochainement.
                        </p>
                    </div>
                    
                    <div class="footer">
                        <div class="footer-logo">🇨🇩 Tax Free RDC</div>
                        <p class="footer-text">Système de détaxe de la République Démocratique du Congo</p>
                        <p class="footer-text">© 2026 Tax Free RDC - Tous droits réservés</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = f"""
INFORMATION SUR VOTRE DEMANDE
=============================

Bonjour {registration_request.first_name},

Nous avons examiné attentivement votre demande d'inscription pour {registration_request.company_name}.

Après analyse de votre dossier, nous ne sommes malheureusement pas en mesure d'approuver votre demande dans l'état actuel.

MOTIF DE LA DÉCISION
--------------------
{reason or "Aucun motif spécifié. Veuillez contacter notre support pour plus d'informations."}

QUE POUVEZ-VOUS FAIRE ?
-----------------------
- Vérifier que toutes les informations fournies sont correctes
- Vous assurer que vos documents légaux sont à jour
- Soumettre une nouvelle demande avec les corrections nécessaires
- Contacter notre support pour obtenir des clarifications

---
Notre équipe reste à votre disposition pour vous accompagner.
Contact : support@taxfree-rdc.cd

Tax Free RDC
© 2026 Tous droits réservés
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[registration_request.email],
            html_message=html_message,
            fail_silently=False,
        )
    
    @staticmethod
    def send_document_request_email(registration_request, document_request, submit_url):
        """Send email to merchant requesting additional documents."""
        subject = '📋 Complément de dossier requis - Tax Free RDC'
        
        documents_list = ""
        if document_request.documents_requested:
            documents_list = "<ul style='margin: 0; padding-left: 20px;'>"
            for doc in document_request.documents_requested:
                documents_list += f"<li style='margin-bottom: 8px;'>{doc}</li>"
            documents_list += "</ul>"
        
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Complément de dossier requis</title>
            <style>{EmailService._get_base_styles()}</style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%);">
                        <div class="header-icon">📋</div>
                        <h1>Complément de dossier requis</h1>
                        <p>Votre demande nécessite des informations supplémentaires</p>
                    </div>
                    
                    <div class="content">
                        <p class="greeting">Bonjour <strong>{registration_request.first_name}</strong>,</p>
                        
                        <p class="message">
                            Suite à l'examen de votre demande d'inscription pour 
                            <strong>{registration_request.company_name}</strong>, notre équipe a besoin 
                            d'informations ou de documents complémentaires pour finaliser le traitement de votre dossier.
                        </p>
                        
                        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 24px 0;">
                            <p style="font-weight: 600; color: #92400e; margin-bottom: 12px;">📝 Message de notre équipe :</p>
                            <p style="color: #78350f; margin: 0; white-space: pre-wrap;">{document_request.message}</p>
                        </div>
                        
                        {f'''<div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
                            <p style="font-weight: 600; color: #374151; margin-bottom: 12px;">📄 Documents demandés :</p>
                            {documents_list}
                        </div>''' if documents_list else ''}
                        
                        <div class="divider"></div>
                        
                        <p class="message" style="text-align: center;">
                            Cliquez sur le bouton ci-dessous pour accéder à votre espace et soumettre les documents demandés :
                        </p>
                        
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="{submit_url}" class="btn-primary" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                                📤 Compléter mon dossier
                            </a>
                        </div>
                        
                        <p style="font-size: 12px; color: #6b7280; text-align: center;">
                            Ce lien est valable pendant 14 jours.
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>Cet email a été envoyé par Tax Free RDC</p>
                        <p>© 2026 Tax Free RDC - Tous droits réservés</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = f"""
COMPLÉMENT DE DOSSIER REQUIS - {registration_request.company_name}

Bonjour {registration_request.first_name},

Notre équipe a besoin d'informations complémentaires:
{document_request.message}

Lien pour compléter votre dossier: {submit_url}

Ce lien est valable pendant 14 jours.
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[registration_request.email],
            html_message=html_message,
            fail_silently=False,
        )
    
    @staticmethod
    def send_documents_submitted_notification(document_request):
        """Notify admin that merchant has submitted documents."""
        from django.conf import settings
        
        if not document_request.requested_by:
            return
        
        admin = document_request.requested_by
        registration = document_request.registration
        
        # Build the admin dashboard URL for this registration request
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        admin_dashboard_url = f"{frontend_url}/admin/merchants/{registration.id}"
        
        subject = f'📥 Documents soumis - {registration.company_name}'
        
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Documents soumis</title>
            <style>{EmailService._get_base_styles()}</style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                        <div class="header-icon">📥</div>
                        <h1>Documents reçus</h1>
                    </div>
                    <div class="content">
                        <p>Bonjour <strong>{admin.first_name}</strong>,</p>
                        <p>Le commerçant <strong>{registration.company_name}</strong> a soumis les documents demandés.</p>
                        <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 24px 0;">
                            <p style="font-weight: 600;">Réponse du commerçant :</p>
                            <p>{document_request.merchant_response}</p>
                        </div>
                        <div style="text-align: center; margin: 24px 0;">
                            <a href="{admin_dashboard_url}" class="btn" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4);">
                                Examiner le dossier
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = f"""
Documents soumis - {registration.company_name}

Le commerçant a soumis les documents demandés.
Réponse: {document_request.merchant_response}

Examiner le dossier: {admin_dashboard_url}
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[admin.email],
            html_message=html_message,
            fail_silently=False,
        )
    
    @staticmethod
    def send_documents_submission_confirmation_to_merchant(document_request):
        """Send confirmation email to merchant after they submit documents."""
        registration = document_request.registration
        
        subject = '✅ Documents reçus - Tax Free RDC'
        
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Documents reçus</title>
            <style>{EmailService._get_base_styles()}</style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);">
                        <div class="header-icon">✅</div>
                        <h1>Documents reçus !</h1>
                        <p>Votre réponse a bien été enregistrée</p>
                    </div>
                    
                    <div class="content">
                        <p class="greeting">Bonjour <strong>{registration.first_name}</strong>,</p>
                        
                        <div class="success-box">
                            <strong>✅ Confirmation</strong><br>
                            Nous avons bien reçu les documents demandés pour votre dossier 
                            <strong>{registration.company_name}</strong>.
                        </div>
                        
                        <p class="message">
                            Notre équipe va examiner votre réponse dans les plus brefs délais. 
                            Vous recevrez une notification par email dès que votre dossier aura été traité.
                        </p>
                        
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                            <p style="font-weight: 600; color: #166534; margin-bottom: 12px;">📋 Votre réponse :</p>
                            <p style="color: #15803d; font-style: italic;">"{document_request.merchant_response}"</p>
                        </div>
                        
                        <div class="info-box" style="background: #eff6ff; border: 1px solid #bfdbfe;">
                            <p style="color: #1e40af; font-size: 14px;">
                                <strong>💡 Prochaines étapes :</strong><br>
                                Un administrateur va examiner votre dossier. Si tout est en ordre, 
                                vous recevrez un email d'approbation avec un lien pour activer votre compte.
                            </p>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <p style="font-size: 13px; color: #6b7280;">
                            Si vous avez des questions, n'hésitez pas à nous contacter à 
                            <a href="mailto:support@taxfree-rdc.cd" style="color: #2563eb;">support@taxfree-rdc.cd</a>
                        </p>
                    </div>
                    
                    <div class="footer">
                        <div class="footer-logo">🇨🇩 Tax Free RDC</div>
                        <p class="footer-text">Système de détaxe de la République Démocratique du Congo</p>
                        <p class="footer-text">© 2026 Tax Free RDC - Tous droits réservés</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = f"""
DOCUMENTS REÇUS - TAX FREE RDC
==============================

Bonjour {registration.first_name},

Nous avons bien reçu les documents demandés pour votre dossier {registration.company_name}.

Votre réponse :
"{document_request.merchant_response}"

Notre équipe va examiner votre réponse dans les plus brefs délais.
Vous recevrez une notification par email dès que votre dossier aura été traité.

---
Tax Free RDC
© 2026 Tous droits réservés
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[registration.email],
            html_message=html_message,
            fail_silently=True,
        )
    
    @staticmethod
    def send_registration_confirmation_to_merchant(registration_request):
        """Send confirmation email to merchant after registration submission."""
        subject = '📝 Demande d\'inscription reçue - Tax Free RDC'
        
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Demande d'inscription reçue</title>
            <style>{EmailService._get_base_styles()}</style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);">
                        <div class="header-icon">📝</div>
                        <h1>Demande reçue !</h1>
                        <p>Votre inscription est en cours de traitement</p>
                    </div>
                    
                    <div class="content">
                        <p class="greeting">Bonjour <strong>{registration_request.first_name}</strong>,</p>
                        
                        <p class="message">
                            Nous avons bien reçu votre demande d'inscription pour 
                            <strong>{registration_request.company_name}</strong> sur la plateforme Tax Free RDC.
                        </p>
                        
                        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin: 24px 0;">
                            <p style="font-weight: 600; color: #0369a1; margin-bottom: 12px;">📋 Récapitulatif de votre demande :</p>
                            <ul style="color: #0c4a6e; margin: 0; padding-left: 20px;">
                                <li><strong>Entreprise :</strong> {registration_request.company_name}</li>
                                <li><strong>N° RCCM :</strong> {registration_request.registration_number}</li>
                                <li><strong>Secteur :</strong> {registration_request.business_sector}</li>
                                <li><strong>Ville :</strong> {registration_request.city}</li>
                            </ul>
                        </div>
                        
                        <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 12px; padding: 20px; margin: 24px 0;">
                            <p style="font-weight: 600; color: #854d0e; margin-bottom: 8px;">⏳ Prochaines étapes :</p>
                            <p style="color: #713f12; margin: 0;">
                                Notre équipe va examiner votre dossier dans les plus brefs délais. 
                                Vous recevrez un email dès qu'une décision sera prise ou si des documents 
                                complémentaires sont nécessaires.
                            </p>
                        </div>
                        
                        <p class="message" style="text-align: center; color: #6b7280;">
                            Délai de traitement habituel : <strong>24 à 48 heures ouvrées</strong>
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>Cet email a été envoyé par Tax Free RDC</p>
                        <p>© 2026 Tax Free RDC - Tous droits réservés</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = f"""
DEMANDE D'INSCRIPTION REÇUE
===========================

Bonjour {registration_request.first_name},

Nous avons bien reçu votre demande d'inscription pour {registration_request.company_name}.

Récapitulatif :
- Entreprise : {registration_request.company_name}
- N° RCCM : {registration_request.registration_number}
- Secteur : {registration_request.business_sector}
- Ville : {registration_request.city}

Notre équipe va examiner votre dossier dans les plus brefs délais.
Délai de traitement habituel : 24 à 48 heures ouvrées.

---
Tax Free RDC
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[registration_request.email],
            html_message=html_message,
            fail_silently=False,
        )
    
    @staticmethod
    def send_password_reset_email(user, reset_url):
        """Send password reset email to user."""
        subject = '🔐 Réinitialisation de votre mot de passe - Tax Free RDC'
        
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Réinitialisation du mot de passe</title>
            <style>{EmailService._get_base_styles()}</style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%);">
                        <div class="header-icon">🔐</div>
                        <h1>Réinitialisation du mot de passe</h1>
                    </div>
                    
                    <div class="content">
                        <p>Bonjour <strong>{user.first_name} {user.last_name}</strong>,</p>
                        
                        <p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte Tax Free RDC.</p>
                        
                        <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
                        
                        <div class="button-container">
                            <a href="{reset_url}" class="button" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                                Réinitialiser mon mot de passe
                            </a>
                        </div>
                        
                        <div class="info-box" style="background-color: #fef3c7; border-left-color: #f59e0b;">
                            <p><strong>⏰ Ce lien expire dans 24 heures.</strong></p>
                            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                        </div>
                        
                        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                            <a href="{reset_url}" style="color: #d97706; word-break: break-all;">{reset_url}</a>
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Tax Free RDC</strong></p>
                        <p>Système de détaxe de la République Démocratique du Congo</p>
                        <p style="font-size: 11px; margin-top: 15px;">
                            Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = f"""
        Réinitialisation du mot de passe - Tax Free RDC
        
        Bonjour {user.first_name} {user.last_name},
        
        Une demande de réinitialisation de mot de passe a été effectuée pour votre compte.
        
        Cliquez sur ce lien pour créer un nouveau mot de passe :
        {reset_url}
        
        Ce lien expire dans 24 heures.
        
        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        
        ---
        Tax Free RDC
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    
    @staticmethod
    def send_merchant_invitation_email(invitation, invitation_url):
        """Send invitation email to join a merchant."""
        subject = f'🎉 Invitation à rejoindre {invitation.merchant.name} - Tax Free RDC'
        
        role_text = 'Administrateur' if invitation.role == 'MERCHANT' else 'Employé'
        outlet_text = f' au point de vente <strong>{invitation.outlet.name}</strong>' if invitation.outlet else ''
        
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitation</title>
            <style>{EmailService._get_base_styles()}</style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);">
                        <div class="header-icon">🎉</div>
                        <h1>Vous êtes invité(e) !</h1>
                    </div>
                    
                    <div class="content">
                        <p>Bonjour <strong>{invitation.first_name} {invitation.last_name}</strong>,</p>
                        
                        <p><strong>{invitation.invited_by.full_name if invitation.invited_by else 'Un administrateur'}</strong> vous invite à rejoindre 
                        <strong>{invitation.merchant.name}</strong> en tant que <strong>{role_text}</strong>{outlet_text} sur la plateforme Tax Free RDC.</p>
                        
                        <p>Cliquez sur le bouton ci-dessous pour activer votre compte et définir votre mot de passe :</p>
                        
                        <div class="button-container">
                            <a href="{invitation_url}" class="button" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                                Activer mon compte
                            </a>
                        </div>
                        
                        <div class="info-box" style="background-color: #d1fae5; border-left-color: #10b981;">
                            <p><strong>📧 Votre identifiant de connexion :</strong></p>
                            <p style="font-size: 16px; font-weight: bold; color: #047857;">{invitation.email}</p>
                        </div>
                        
                        <div class="info-box" style="background-color: #fef3c7; border-left-color: #f59e0b;">
                            <p><strong>⏰ Ce lien expire dans 7 jours.</strong></p>
                            <p>Si vous n'avez pas demandé cette invitation, ignorez cet email.</p>
                        </div>
                        
                        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                            <a href="{invitation_url}" style="color: #059669; word-break: break-all;">{invitation_url}</a>
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Tax Free RDC</strong></p>
                        <p>Système de détaxe de la République Démocratique du Congo</p>
                        <p style="font-size: 11px; margin-top: 15px;">
                            Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = f"""
        Invitation à rejoindre {invitation.merchant.name} - Tax Free RDC
        
        Bonjour {invitation.first_name} {invitation.last_name},
        
        Vous êtes invité(e) à rejoindre {invitation.merchant.name} en tant que {role_text} sur la plateforme Tax Free RDC.
        
        Cliquez sur ce lien pour activer votre compte :
        {invitation_url}
        
        Votre identifiant de connexion : {invitation.email}
        
        Ce lien expire dans 7 jours.
        
        ---
        Tax Free RDC
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitation.email],
            html_message=html_message,
            fail_silently=False,
        )


class NotificationService:
    """Service for creating in-app notifications with proper context."""
    
    @staticmethod
    def notify_admins_new_registration(registration_request):
        """Create in-app notifications for all admins about new registration."""
        from .models import User, UserRole, Notification, NotificationType
        
        admins = User.objects.filter(role=UserRole.ADMIN, is_active=True)
        
        for admin in admins:
            Notification.objects.create(
                user=admin,
                notification_type=NotificationType.REGISTRATION_NEW,
                title="Nouvelle demande d'inscription",
                message=f"{registration_request.company_name} a soumis une demande d'inscription",
                related_object_type='MerchantRegistrationRequest',
                related_object_id=registration_request.id,
                action_url=f"/admin/merchants/{registration_request.id}"
            )
    
    @staticmethod
    def notify_merchant_documents_requested(registration_request, document_request):
        """Notify merchant that documents have been requested (no user account yet)."""
        # Merchant doesn't have an account yet, so we only send email
        # Email is already sent via EmailService.send_document_request_email
        pass
    
    @staticmethod
    def notify_admin_documents_submitted(document_request):
        """Notify admin that merchant has submitted documents."""
        from .models import Notification, NotificationType
        
        if not document_request.requested_by:
            return
        
        registration = document_request.registration
        
        Notification.objects.create(
            user=document_request.requested_by,
            notification_type=NotificationType.DOCUMENT_SUBMITTED,
            title="Documents soumis",
            message=f"{registration.company_name} a soumis les documents demandés",
            related_object_type='MerchantRegistrationRequest',
            related_object_id=registration.id,
            action_url=f"/admin/merchants/{registration.id}"
        )
    
    @staticmethod
    def notify_registration_approved(registration_request):
        """Create notification record for approved registration."""
        # Merchant doesn't have account yet - email is sent separately
        # This is for audit/history purposes
        pass
    
    @staticmethod
    def notify_registration_rejected(registration_request):
        """Create notification record for rejected registration."""
        # Merchant doesn't have account yet - email is sent separately
        pass


class SystemUserEmailService:
    """Extended email methods for system user invitations."""
    
    @staticmethod
    def send_system_user_invitation_email(invitation, activation_url):
        """Send invitation email to system user (Admin, Auditor, Operator)."""
        from django.core.mail import send_mail
        from django.conf import settings
        
        role_labels = {
            'ADMIN': 'Administrateur',
            'AUDITOR': 'Auditeur',
            'OPERATOR': 'Opérateur',
        }
        role_display = role_labels.get(invitation.role, invitation.role)
        
        subject = f'🎯 Invitation à rejoindre Tax Free RDC - {role_display}'
        
        base_styles = EmailService._get_base_styles() if hasattr(EmailService, '_get_base_styles') else ""
        
        custom_message = ""
        if invitation.message:
            custom_message = f'''
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="font-size: 13px; color: #0369a1; font-weight: 600; margin-bottom: 8px;">💬 Message de l'administrateur :</p>
                <p style="font-size: 14px; color: #0c4a6e; margin: 0; font-style: italic;">"{invitation.message}"</p>
            </div>
            '''
        
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitation Tax Free RDC</title>
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                    line-height: 1.6; 
                    color: #1f2937;
                    background-color: #f3f4f6;
                }}
                .wrapper {{ width: 100%; background-color: #f3f4f6; padding: 40px 20px; }}
                .container {{ 
                    max-width: 600px; 
                    margin: 0 auto;
                    background: #ffffff;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }}
                .header {{ 
                    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%);
                    color: white; 
                    padding: 40px 30px;
                    text-align: center;
                }}
                .header-icon {{
                    width: 70px;
                    height: 70px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 50%;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                }}
                .content {{ padding: 40px 30px; }}
                .btn {{
                    display: inline-block;
                    padding: 16px 40px;
                    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
                    color: #ffffff !important;
                    text-decoration: none;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 16px;
                    box-shadow: 0 4px 14px 0 rgba(124, 58, 237, 0.4);
                }}
                .footer {{ 
                    background: #f9fafb;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e5e7eb;
                }}
                @media only screen and (max-width: 600px) {{
                    .wrapper {{ padding: 10px 5px !important; }}
                    .header {{ padding: 20px 12px !important; }}
                    .content {{ padding: 20px 12px !important; }}
                    .btn {{ display: block !important; text-align: center !important; }}
                }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <div class="header-icon">🎯</div>
                        <h1 style="font-size: 24px; font-weight: 700; margin: 0;">Vous êtes invité(e) !</h1>
                        <p style="margin-top: 8px; opacity: 0.9; font-size: 14px;">Rejoignez l'équipe Tax Free RDC</p>
                    </div>
                    
                    <div class="content">
                        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                            Bonjour <strong>{invitation.first_name}</strong>,
                        </p>
                        
                        <p style="font-size: 15px; color: #4b5563; margin-bottom: 24px; line-height: 1.7;">
                            Vous avez été invité(e) à rejoindre la plateforme <strong>Tax Free RDC</strong> 
                            en tant que <strong style="color: #7c3aed;">{role_display}</strong>.
                        </p>
                        
                        {custom_message}
                        
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                            <p style="font-size: 14px; color: #374151; margin-bottom: 12px;"><strong>📋 Vos informations :</strong></p>
                            <p style="font-size: 14px; color: #6b7280; margin: 4px 0;">Email : <strong>{invitation.email}</strong></p>
                            <p style="font-size: 14px; color: #6b7280; margin: 4px 0;">Rôle : <strong>{role_display}</strong></p>
                        </div>
                        
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="{activation_url}" class="btn">
                                🚀 Activer mon compte
                            </a>
                        </div>
                        
                        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px 20px; margin: 24px 0; font-size: 14px; color: #92400e;">
                            <strong>⏰ Important :</strong> Ce lien d'invitation expire dans <strong>7 jours</strong>.
                        </div>
                        
                        <div style="height: 1px; background: linear-gradient(to right, transparent, #e5e7eb, transparent); margin: 30px 0;"></div>
                        
                        <p style="font-size: 13px; color: #6b7280; text-align: center;">
                            Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p style="font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 12px;">🇨🇩 Tax Free RDC</p>
                        <p style="font-size: 13px; color: #6b7280;">Système de détaxe de la République Démocratique du Congo</p>
                        <p style="font-size: 13px; color: #6b7280;">© 2026 Tax Free RDC - Tous droits réservés</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = f"""
INVITATION À REJOINDRE TAX FREE RDC
====================================

Bonjour {invitation.first_name},

Vous avez été invité(e) à rejoindre la plateforme Tax Free RDC en tant que {role_display}.

VOS INFORMATIONS
----------------
Email : {invitation.email}
Rôle : {role_display}

ACTIVER VOTRE COMPTE
--------------------
Cliquez sur le lien ci-dessous pour créer votre mot de passe et activer votre compte :

{activation_url}

⚠️ Ce lien expire dans 7 jours.

---
Tax Free RDC
© 2026 Tous droits réservés
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitation.email],
            html_message=html_message,
            fail_silently=False,
        )
    
    @staticmethod
    def send_system_user_welcome_email(user):
        """Send welcome email after system user activates their account."""
        from django.core.mail import send_mail
        from django.conf import settings
        
        subject = '🎉 Bienvenue sur Tax Free RDC !'
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        login_url = f"{frontend_url}/login"
        
        html_message = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bienvenue sur Tax Free RDC</title>
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                    line-height: 1.6; 
                    color: #1f2937;
                    background-color: #f3f4f6;
                }}
                .wrapper {{ width: 100%; background-color: #f3f4f6; padding: 40px 20px; }}
                .container {{ 
                    max-width: 600px; 
                    margin: 0 auto;
                    background: #ffffff;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }}
                .header {{ 
                    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
                    color: white; 
                    padding: 40px 30px;
                    text-align: center;
                }}
                .content {{ padding: 40px 30px; }}
                .btn {{
                    display: inline-block;
                    padding: 14px 32px;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: #ffffff !important;
                    text-decoration: none;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 15px;
                }}
                .footer {{ 
                    background: #f9fafb;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e5e7eb;
                }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
                        <h1 style="font-size: 24px; font-weight: 700; margin: 0;">Bienvenue !</h1>
                        <p style="margin-top: 8px; opacity: 0.9; font-size: 14px;">Votre compte est maintenant actif</p>
                    </div>
                    
                    <div class="content">
                        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                            Bonjour <strong>{user.first_name}</strong>,
                        </p>
                        
                        <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border: 1px solid #6ee7b7; border-left: 4px solid #10b981; border-radius: 8px; padding: 16px 20px; margin: 24px 0; font-size: 14px; color: #065f46;">
                            <strong>✅ Félicitations !</strong> Votre compte {user.get_role_display()} a été activé avec succès.
                        </div>
                        
                        <p style="font-size: 15px; color: #4b5563; margin-bottom: 24px; line-height: 1.7;">
                            Vous pouvez maintenant vous connecter à la plateforme Tax Free RDC et accéder à votre espace de travail.
                        </p>
                        
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="{login_url}" class="btn">
                                Se connecter
                            </a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p style="font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 12px;">🇨🇩 Tax Free RDC</p>
                        <p style="font-size: 13px; color: #6b7280;">© 2026 Tax Free RDC - Tous droits réservés</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = f"""
BIENVENUE SUR TAX FREE RDC !
============================

Bonjour {user.first_name},

Votre compte {user.get_role_display()} a été activé avec succès.

Vous pouvez maintenant vous connecter à la plateforme :
{login_url}

---
Tax Free RDC
© 2026 Tous droits réservés
        """
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=True,
        )
