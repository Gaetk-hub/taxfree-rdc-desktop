"""
Email service for sending notifications and tax free forms.
"""
import logging
import base64
import io
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)


class TaxFreeEmailService:
    """Service for sending tax free form emails with professional design."""
    
    @staticmethod
    def _get_base_styles():
        """Return base CSS styles for email templates."""
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
                background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
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
            .form-number-box {
                text-align: center;
                margin: 30px 0;
            }
            .form-number {
                display: inline-block;
                background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                border: 2px solid #10b981;
                border-radius: 16px;
                padding: 20px 35px;
            }
            .form-number-label {
                font-size: 12px;
                color: #059669;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 8px;
            }
            .form-number-value {
                font-size: 28px;
                font-weight: 800;
                letter-spacing: 3px;
                color: #047857;
                font-family: 'Courier New', monospace;
            }
            .qr-section {
                text-align: center;
                margin: 30px 0;
                padding: 25px;
                background: #f9fafb;
                border-radius: 12px;
            }
            .qr-code {
                width: 180px;
                height: 180px;
                margin: 0 auto 15px;
                padding: 10px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .qr-code img {
                width: 100%;
                height: 100%;
            }
            .qr-label {
                font-size: 13px;
                color: #6b7280;
            }
            .info-grid {
                display: table;
                width: 100%;
                margin: 24px 0;
            }
            .info-row {
                display: table-row;
            }
            .info-label {
                display: table-cell;
                padding: 10px 15px 10px 0;
                font-size: 14px;
                color: #6b7280;
                border-bottom: 1px solid #f3f4f6;
                width: 40%;
            }
            .info-value {
                display: table-cell;
                padding: 10px 0;
                font-size: 14px;
                color: #1f2937;
                font-weight: 500;
                border-bottom: 1px solid #f3f4f6;
            }
            .amount-box {
                background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                border: 1px solid #a7f3d0;
                border-radius: 12px;
                padding: 20px;
                margin: 24px 0;
            }
            .amount-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                font-size: 14px;
            }
            .amount-row.total {
                border-top: 2px solid #10b981;
                margin-top: 10px;
                padding-top: 15px;
                font-size: 18px;
                font-weight: 700;
                color: #047857;
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
            .steps {
                margin: 24px 0;
            }
            .step {
                display: flex;
                align-items: flex-start;
                margin-bottom: 16px;
            }
            .step-number {
                width: 28px;
                height: 28px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                font-weight: 600;
                margin-right: 12px;
                flex-shrink: 0;
            }
            .step-text {
                font-size: 14px;
                color: #4b5563;
                padding-top: 4px;
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
            .attachment-notice {
                background: #eff6ff;
                border: 1px solid #bfdbfe;
                border-radius: 8px;
                padding: 12px 16px;
                margin: 20px 0;
                font-size: 13px;
                color: #1e40af;
                text-align: center;
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
                .form-number { padding: 12px 20px !important; border-radius: 12px !important; }
                .form-number-label { font-size: 9px !important; }
                .form-number-value { font-size: 16px !important; letter-spacing: 1px !important; }
                .qr-section { padding: 15px 12px !important; margin: 15px 0 !important; border-radius: 10px !important; }
                .qr-code { width: 120px !important; height: 120px !important; padding: 8px !important; }
                .qr-label { font-size: 10px !important; }
                .amount-box { padding: 12px !important; border-radius: 10px !important; }
                .amount-row { font-size: 11px !important; padding: 5px 0 !important; }
                .amount-row.total { font-size: 13px !important; padding-top: 10px !important; margin-top: 8px !important; }
                .info-grid { font-size: 11px !important; }
                .info-label, .info-value { padding: 6px 8px 6px 0 !important; font-size: 11px !important; }
                .steps { margin: 15px 0 !important; }
                .step { margin-bottom: 10px !important; }
                .step-number { width: 20px !important; height: 20px !important; font-size: 10px !important; margin-right: 8px !important; }
                .step-text { font-size: 11px !important; }
                .warning-box { padding: 10px 12px !important; font-size: 11px !important; border-radius: 6px !important; }
                .attachment-notice { padding: 8px 10px !important; font-size: 10px !important; border-radius: 6px !important; }
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
                .form-number-value { font-size: 14px !important; }
                .qr-code { width: 100px !important; height: 100px !important; }
                .amount-row.total { font-size: 12px !important; }
                .step-text { font-size: 10px !important; }
            }
        """
    
    @classmethod
    def generate_qr_code_base64(cls, data):
        """Generate QR code as base64 string."""
        try:
            import qrcode
            from qrcode.image.pure import PyPNGImage
            
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=2,
            )
            qr.add_data(data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
        except ImportError:
            logger.warning("qrcode library not installed, skipping QR code generation")
            return None
        except Exception as e:
            logger.error(f"Failed to generate QR code: {str(e)}")
            return None
    
    @classmethod
    def generate_pdf(cls, form):
        """Generate PDF for the tax free form."""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.units import mm
            from reportlab.pdfgen import canvas
            from reportlab.lib.colors import HexColor
            
            buffer = io.BytesIO()
            c = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4
            
            # Header
            c.setFillColor(HexColor('#10b981'))
            c.rect(0, height - 80, width, 80, fill=True, stroke=False)
            
            c.setFillColor(HexColor('#ffffff'))
            c.setFont("Helvetica-Bold", 24)
            c.drawCentredString(width / 2, height - 45, "BORDEREAU DE DÉTAXE")
            c.setFont("Helvetica", 12)
            c.drawCentredString(width / 2, height - 65, "Tax Free RDC")
            
            # Form number
            c.setFillColor(HexColor('#1f2937'))
            c.setFont("Helvetica-Bold", 16)
            c.drawString(30, height - 120, f"N° {form.form_number}")
            
            c.setFont("Helvetica", 10)
            c.setFillColor(HexColor('#6b7280'))
            c.drawString(30, height - 140, f"Date: {form.created_at.strftime('%d/%m/%Y %H:%M')}")
            c.drawString(30, height - 155, f"Expire le: {form.expires_at.strftime('%d/%m/%Y')}")
            
            # QR Code
            qr_data_str = f"{form.qr_payload}|{form.qr_signature}" if form.qr_payload and form.qr_signature else form.form_number
            qr_data = cls.generate_qr_code_base64(qr_data_str)
            if qr_data:
                from reportlab.lib.utils import ImageReader
                qr_img = ImageReader(io.BytesIO(base64.b64decode(qr_data)))
                c.drawImage(qr_img, width - 130, height - 200, width=100, height=100)
            
            # Traveler info
            y = height - 220
            c.setFillColor(HexColor('#1f2937'))
            c.setFont("Helvetica-Bold", 12)
            c.drawString(30, y, "VOYAGEUR")
            y -= 20
            
            c.setFont("Helvetica", 10)
            c.drawString(30, y, f"Nom: {form.traveler.last_name} {form.traveler.first_name}")
            y -= 15
            c.drawString(30, y, f"Passeport: ***{form.traveler.passport_number_last4}")
            y -= 15
            c.drawString(30, y, f"Nationalité: {form.traveler.nationality}")
            
            # Merchant info
            y -= 35
            c.setFont("Helvetica-Bold", 12)
            c.drawString(30, y, "COMMERÇANT")
            y -= 20
            
            c.setFont("Helvetica", 10)
            c.drawString(30, y, f"{form.invoice.merchant.name}")
            y -= 15
            c.drawString(30, y, f"Point de vente: {form.invoice.outlet.name}")
            
            # Amounts
            y -= 35
            c.setFont("Helvetica-Bold", 12)
            c.drawString(30, y, "MONTANTS")
            y -= 20
            
            c.setFont("Helvetica", 10)
            c.drawString(30, y, f"Total TTC: {form.invoice.total_amount:,.2f} {form.currency}")
            y -= 15
            c.drawString(30, y, f"TVA: {form.vat_amount:,.2f} {form.currency}")
            y -= 15
            c.setFont("Helvetica-Bold", 11)
            c.setFillColor(HexColor('#10b981'))
            c.drawString(30, y, f"Remboursement: {form.refund_amount:,.2f} {form.currency}")
            
            # Footer
            c.setFillColor(HexColor('#6b7280'))
            c.setFont("Helvetica", 8)
            c.drawCentredString(width / 2, 30, "Tax Free RDC - Système de détaxe de la République Démocratique du Congo")
            c.drawCentredString(width / 2, 20, "© 2026 Tous droits réservés")
            
            c.save()
            buffer.seek(0)
            return buffer.getvalue()
            
        except ImportError:
            logger.warning("reportlab library not installed, skipping PDF generation")
            return None
        except Exception as e:
            logger.error(f"Failed to generate PDF: {str(e)}")
            return None
    
    @classmethod
    def send_taxfree_form_email(cls, form):
        """
        Send beautifully designed tax free form email with QR code and PDF attachment.
        
        Args:
            form: TaxFreeForm instance
        """
        # Check if notifications are enabled
        from services.settings_service import SettingsService
        if not SettingsService.should_notify_on_form_created():
            logger.info(f"Email notifications disabled for form creation - skipping {form.form_number}")
            return False
        
        if not form.traveler.email:
            logger.warning(f"Cannot send email for form {form.form_number}: no email address")
            return False
        
        try:
            subject = f"🧾 Votre bordereau de détaxe - {form.form_number}"
            
            # Generate QR code data
            qr_data = f"{form.qr_payload}|{form.qr_signature}" if form.qr_payload and form.qr_signature else form.form_number
            qr_base64 = cls.generate_qr_code_base64(qr_data)
            qr_html = ""
            if qr_base64:
                qr_html = f'''
                <div class="qr-section">
                    <div class="qr-code">
                        <img src="data:image/png;base64,{qr_base64}" alt="QR Code" />
                    </div>
                    <p class="qr-label">Scannez ce code à la douane</p>
                </div>
                '''
            
            html_message = f"""
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Votre bordereau de détaxe</title>
                <style>{cls._get_base_styles()}</style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="container">
                        <div class="header">
                            <div class="header-icon">🧾</div>
                            <h1>Bordereau de Détaxe</h1>
                            <p>Votre demande de remboursement de TVA</p>
                        </div>
                        
                        <div class="content">
                            <p class="greeting">Bonjour <strong>{form.traveler.first_name} {form.traveler.last_name}</strong>,</p>
                            
                            <p class="message">
                                Votre bordereau de détaxe a été créé avec succès. Vous trouverez ci-dessous 
                                toutes les informations nécessaires pour obtenir votre remboursement de TVA.
                            </p>
                            
                            <div class="form-number-box">
                                <div class="form-number">
                                    <div class="form-number-label">Numéro du bordereau</div>
                                    <div class="form-number-value">{form.form_number}</div>
                                </div>
                            </div>
                            
                            {qr_html}
                            
                            <div class="amount-box">
                                <div class="amount-row">
                                    <span>Total TTC</span>
                                    <span>{form.invoice.total_amount:,.2f} {form.currency}</span>
                                </div>
                                <div class="amount-row">
                                    <span>TVA ({int(form.invoice.items.first().vat_rate if form.invoice.items.exists() else 16)}%)</span>
                                    <span>{form.vat_amount:,.2f} {form.currency}</span>
                                </div>
                                <div class="amount-row">
                                    <span>Frais de service</span>
                                    <span>-{form.operator_fee:,.2f} {form.currency}</span>
                                </div>
                                <div class="amount-row total">
                                    <span>💰 Remboursement</span>
                                    <span>{form.refund_amount:,.2f} {form.currency}</span>
                                </div>
                            </div>
                            
                            <div class="divider"></div>
                            
                            <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 16px;">📋 Informations</h3>
                            
                            <div class="info-grid">
                                <div class="info-row">
                                    <span class="info-label">Date de création</span>
                                    <span class="info-value">{form.created_at.strftime('%d/%m/%Y à %H:%M')}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Date d'expiration</span>
                                    <span class="info-value">{form.expires_at.strftime('%d/%m/%Y')}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Commerçant</span>
                                    <span class="info-value">{form.invoice.merchant.name}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Point de vente</span>
                                    <span class="info-value">{form.invoice.outlet.name}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">N° Facture</span>
                                    <span class="info-value">{form.invoice.invoice_number}</span>
                                </div>
                            </div>
                            
                            <div class="divider"></div>
                            
                            <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 16px;">📝 Instructions</h3>
                            
                            <div class="steps">
                                <div class="step">
                                    <div class="step-number">1</div>
                                    <div class="step-text">Conservez ce bordereau et le PDF joint jusqu'à votre départ.</div>
                                </div>
                                <div class="step">
                                    <div class="step-number">2</div>
                                    <div class="step-text">Présentez-vous à la douane avec vos articles et ce bordereau.</div>
                                </div>
                                <div class="step">
                                    <div class="step-number">3</div>
                                    <div class="step-text">L'agent douanier scannera le QR code pour valider votre demande.</div>
                                </div>
                                <div class="step">
                                    <div class="step-number">4</div>
                                    <div class="step-text">Récupérez votre remboursement au guichet Tax Free.</div>
                                </div>
                            </div>
                            
                            <div class="warning-box">
                                <strong>⚠️ Important :</strong> Ce bordereau expire le <strong>{form.expires_at.strftime('%d/%m/%Y')}</strong>. 
                                Assurez-vous de faire valider votre demande avant cette date.
                            </div>
                            
                            <div class="attachment-notice">
                                📎 Un PDF de votre bordereau est joint à cet email pour impression.
                            </div>
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
Bonjour {form.traveler.first_name} {form.traveler.last_name},

Votre bordereau de détaxe a été créé avec succès.

NUMÉRO DU BORDEREAU: {form.form_number}

MONTANTS
--------
Total TTC: {form.invoice.total_amount:,.2f} {form.currency}
TVA: {form.vat_amount:,.2f} {form.currency}
Remboursement: {form.refund_amount:,.2f} {form.currency}

INFORMATIONS
------------
Date de création: {form.created_at.strftime('%d/%m/%Y à %H:%M')}
Date d'expiration: {form.expires_at.strftime('%d/%m/%Y')}
Commerçant: {form.invoice.merchant.name}
Point de vente: {form.invoice.outlet.name}

INSTRUCTIONS
------------
1. Conservez ce bordereau jusqu'à votre départ.
2. Présentez-vous à la douane avec vos articles.
3. L'agent scannera le QR code pour valider.
4. Récupérez votre remboursement au guichet Tax Free.

⚠️ Ce bordereau expire le {form.expires_at.strftime('%d/%m/%Y')}.

---
Tax Free RDC
Système de détaxe de la République Démocratique du Congo
© 2026 Tous droits réservés
            """
            
            # Create email
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[form.traveler.email],
            )
            email.attach_alternative(html_message, "text/html")
            
            # Attach professional PDF
            from services.pdf_service import TaxFreePDFService
            logger.info(f"Generating PDF for form {form.form_number}...")
            pdf_content = TaxFreePDFService.generate_form_pdf(form)
            if pdf_content:
                logger.info(f"PDF generated successfully, size: {len(pdf_content)} bytes")
                email.attach(
                    f"bordereau_{form.form_number}.pdf",
                    pdf_content,
                    "application/pdf"
                )
            else:
                logger.warning(f"PDF generation returned None for form {form.form_number}")
            
            email.send()
            
            logger.info(f"Email sent successfully for form {form.form_number} to {form.traveler.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email for form {form.form_number}: {str(e)}")
            raise

    @classmethod
    def send_cancellation_email(cls, form):
        """
        Send cancellation notification email to traveler.
        Includes reason, merchant contact info, and instructions for contestation.
        """
        # Check if email notifications are enabled
        from services.settings_service import SettingsService
        if not SettingsService.is_email_notifications_enabled():
            logger.info(f"Email notifications disabled - skipping cancellation email for {form.form_number}")
            return False
        
        try:
            if not form.traveler.email:
                logger.warning(f"Cannot send cancellation email: no email for form {form.form_number}")
                return False
            
            subject = f"❌ Annulation de votre bordereau de détaxe - {form.form_number}"
            
            # Get merchant/outlet contact info
            merchant = form.invoice.merchant
            outlet = form.invoice.outlet
            merchant_phone = outlet.phone if outlet and outlet.phone else (merchant.contact_phone if merchant.contact_phone else 'Non disponible')
            merchant_email = outlet.email if outlet and outlet.email else (merchant.contact_email if merchant.contact_email else '')
            # Use address_line1 for outlet, address for merchant
            if outlet:
                merchant_address = f"{outlet.address_line1}, {outlet.city}"
            else:
                merchant_address = f"{merchant.address}, {merchant.city}"
            
            # Cancellation details
            cancelled_by_name = form.cancelled_by.get_full_name() if form.cancelled_by else 'Le système'
            cancelled_at = form.cancelled_at.strftime('%d/%m/%Y à %H:%M') if form.cancelled_at else 'Non spécifié'
            cancellation_reason = form.cancellation_reason or 'Aucune raison spécifiée'
            
            html_message = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    {cls._get_base_styles()}
                    .header {{ 
                        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%) !important;
                    }}
                    .alert-box {{
                        background: #fef2f2;
                        border: 2px solid #fecaca;
                        border-radius: 12px;
                        padding: 20px;
                        margin: 20px 0;
                    }}
                    .alert-title {{
                        color: #dc2626;
                        font-weight: 700;
                        font-size: 16px;
                        margin-bottom: 10px;
                    }}
                    .reason-box {{
                        background: #fff;
                        border-left: 4px solid #dc2626;
                        padding: 15px 20px;
                        margin: 15px 0;
                        border-radius: 0 8px 8px 0;
                    }}
                    .reason-label {{
                        color: #6b7280;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 5px;
                    }}
                    .reason-text {{
                        color: #1f2937;
                        font-size: 16px;
                        font-weight: 500;
                    }}
                    .contact-box {{
                        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                        border: 1px solid #bfdbfe;
                        border-radius: 12px;
                        padding: 20px;
                        margin: 20px 0;
                    }}
                    .contact-title {{
                        color: #1e40af;
                        font-weight: 700;
                        font-size: 16px;
                        margin-bottom: 15px;
                    }}
                    .contact-item {{
                        display: flex;
                        align-items: center;
                        margin: 10px 0;
                        color: #1e3a8a;
                    }}
                    .contact-icon {{
                        width: 24px;
                        margin-right: 10px;
                        text-align: center;
                    }}
                    .info-grid {{
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin: 20px 0;
                    }}
                    .info-item {{
                        background: #f9fafb;
                        padding: 12px 15px;
                        border-radius: 8px;
                    }}
                    .info-label {{
                        color: #6b7280;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }}
                    .info-value {{
                        color: #1f2937;
                        font-weight: 600;
                        margin-top: 4px;
                    }}
                    .action-box {{
                        background: #fefce8;
                        border: 1px solid #fde047;
                        border-radius: 12px;
                        padding: 20px;
                        margin: 20px 0;
                    }}
                    .action-title {{
                        color: #a16207;
                        font-weight: 700;
                        margin-bottom: 10px;
                    }}
                    .action-list {{
                        color: #854d0e;
                        padding-left: 20px;
                    }}
                    .action-list li {{
                        margin: 8px 0;
                    }}
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="container">
                        <div class="header">
                            <div class="header-icon">❌</div>
                            <h1>Bordereau annulé</h1>
                            <p style="opacity: 0.9; margin-top: 10px;">Votre demande de détaxe a été annulée</p>
                        </div>
                        
                        <div class="content">
                            <p style="font-size: 16px; margin-bottom: 20px;">
                                Bonjour <strong>{form.traveler.first_name} {form.traveler.last_name}</strong>,
                            </p>
                            
                            <div class="alert-box">
                                <div class="alert-title">⚠️ Votre bordereau de détaxe a été annulé</div>
                                <p>Le bordereau <strong style="font-family: monospace; font-size: 18px;">{form.form_number}</strong> 
                                   d'un montant de <strong>{form.refund_amount:,.2f} {form.currency}</strong> a été annulé.</p>
                            </div>
                            
                            <div class="reason-box">
                                <div class="reason-label">Motif de l'annulation</div>
                                <div class="reason-text">{cancellation_reason}</div>
                            </div>
                            
                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">Date d'annulation</div>
                                    <div class="info-value">{cancelled_at}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Annulé par</div>
                                    <div class="info-value">{cancelled_by_name}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Montant initial</div>
                                    <div class="info-value">{form.refund_amount:,.2f} {form.currency}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Commerçant</div>
                                    <div class="info-value">{merchant.name}</div>
                                </div>
                            </div>
                            
                            <div class="action-box">
                                <div class="action-title">🔄 Vous pensez qu'il s'agit d'une erreur ?</div>
                                <p style="color: #854d0e; margin-bottom: 10px;">Vous pouvez contester cette annulation en suivant ces étapes :</p>
                                <ol class="action-list">
                                    <li>Retournez au point de vente avec votre pièce d'identité et vos justificatifs d'achat</li>
                                    <li>Demandez à parler au responsable du magasin</li>
                                    <li>Présentez le numéro de votre bordereau : <strong>{form.form_number}</strong></li>
                                    <li>Si le problème persiste, contactez le service client Tax Free RDC</li>
                                </ol>
                            </div>
                            
                            <div class="contact-box">
                                <div class="contact-title">📞 Contactez le point de vente</div>
                                <div class="contact-item">
                                    <span class="contact-icon">🏪</span>
                                    <span><strong>{outlet.name if outlet else merchant.name}</strong></span>
                                </div>
                                <div class="contact-item">
                                    <span class="contact-icon">📍</span>
                                    <span>{merchant_address}</span>
                                </div>
                                <div class="contact-item">
                                    <span class="contact-icon">📞</span>
                                    <span>{merchant_phone}</span>
                                </div>
                                {f'<div class="contact-item"><span class="contact-icon">✉️</span><span>{merchant_email}</span></div>' if merchant_email else ''}
                            </div>
                            
                            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                                Si vous avez des questions, n'hésitez pas à contacter le point de vente ou le service client Tax Free RDC.
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
Bonjour {form.traveler.first_name} {form.traveler.last_name},

❌ VOTRE BORDEREAU DE DÉTAXE A ÉTÉ ANNULÉ

NUMÉRO DU BORDEREAU: {form.form_number}
MONTANT: {form.refund_amount:,.2f} {form.currency}

MOTIF DE L'ANNULATION
---------------------
{cancellation_reason}

DÉTAILS
-------
Date d'annulation: {cancelled_at}
Annulé par: {cancelled_by_name}
Commerçant: {merchant.name}

VOUS PENSEZ QU'IL S'AGIT D'UNE ERREUR ?
---------------------------------------
1. Retournez au point de vente avec votre pièce d'identité
2. Demandez à parler au responsable du magasin
3. Présentez le numéro de votre bordereau: {form.form_number}

CONTACT DU POINT DE VENTE
-------------------------
{outlet.name if outlet else merchant.name}
Adresse: {merchant_address}
Téléphone: {merchant_phone}
{f'Email: {merchant_email}' if merchant_email else ''}

---
Tax Free RDC
Système de détaxe de la République Démocratique du Congo
© 2026 Tous droits réservés
            """
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[form.traveler.email],
            )
            email.attach_alternative(html_message, "text/html")
            email.send()
            
            logger.info(f"Cancellation email sent for form {form.form_number} to {form.traveler.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send cancellation email for form {form.form_number}: {str(e)}")
            return False


    @classmethod
    def send_status_override_email(cls, override, form, recipient_email, recipient_name):
        """
        Send professional email notification when a status override is performed.
        Notifies the agent who originally processed the form.
        
        Args:
            override: StatusOverride instance
            form: TaxFreeForm instance
            recipient_email: Email of the recipient (original agent)
            recipient_name: Name of the recipient
        """
        try:
            from .override_models import OverrideType
            from .models import TaxFreeFormStatus
            
            subject = f"⚠️ Correction de décision - Bordereau {form.form_number}"
            
            # Get status labels
            previous_status_label = TaxFreeFormStatus(override.previous_status).label
            new_status_label = TaxFreeFormStatus(override.new_status).label
            
            # Override type label
            override_type_labels = {
                'STATUS_CORRECTION': 'Correction de statut',
                'VALIDATION_REVERSAL': 'Annulation de validation',
                'REFUND_CORRECTION': 'Correction de remboursement',
                'REOPEN_FORM': 'Réouverture du bordereau',
            }
            override_type_label = override_type_labels.get(override.override_type, 'Correction')
            
            # Admin info
            admin_name = override.performed_by.get_full_name() if override.performed_by else 'Administrateur'
            admin_email = override.performed_by.email if override.performed_by else ''
            
            # Reference document
            reference_html = ''
            if override.reference_document:
                reference_html = f'''
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
                    <span style="color: #1e40af; font-size: 12px; font-weight: 600;">N° Ticket de référence:</span>
                    <span style="color: #1e3a8a; font-size: 14px; font-weight: 700; margin-left: 8px; font-family: monospace;">{override.reference_document}</span>
                </div>
                '''
            
            html_message = f"""
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Correction de décision</title>
                <style>
                    {cls._get_base_styles()}
                    .header {{ 
                        background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%) !important;
                    }}
                    .status-change {{
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 20px;
                        margin: 30px 0;
                        flex-wrap: wrap;
                    }}
                    .status-box {{
                        padding: 16px 24px;
                        border-radius: 12px;
                        text-align: center;
                        min-width: 140px;
                    }}
                    .status-previous {{
                        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                        border: 2px solid #fca5a5;
                    }}
                    .status-previous .status-label {{
                        color: #dc2626;
                    }}
                    .status-new {{
                        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                        border: 2px solid #6ee7b7;
                    }}
                    .status-new .status-label {{
                        color: #059669;
                    }}
                    .status-label {{
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        margin-bottom: 6px;
                    }}
                    .status-value {{
                        font-size: 18px;
                        font-weight: 700;
                        color: #1f2937;
                    }}
                    .arrow {{
                        font-size: 28px;
                        color: #9ca3af;
                    }}
                    .reason-box {{
                        background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
                        border: 1px solid #fcd34d;
                        border-left: 4px solid #f59e0b;
                        border-radius: 0 12px 12px 0;
                        padding: 20px;
                        margin: 24px 0;
                    }}
                    .reason-title {{
                        color: #92400e;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 8px;
                        font-weight: 600;
                    }}
                    .reason-text {{
                        color: #78350f;
                        font-size: 15px;
                        line-height: 1.6;
                    }}
                    .admin-box {{
                        background: #f9fafb;
                        border: 1px solid #e5e7eb;
                        border-radius: 12px;
                        padding: 20px;
                        margin: 24px 0;
                    }}
                    .admin-title {{
                        color: #374151;
                        font-size: 14px;
                        font-weight: 600;
                        margin-bottom: 12px;
                    }}
                    .admin-info {{
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }}
                    .admin-avatar {{
                        width: 48px;
                        height: 48px;
                        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 20px;
                        font-weight: 700;
                    }}
                    .admin-details {{
                        flex: 1;
                    }}
                    .admin-name {{
                        font-weight: 600;
                        color: #1f2937;
                        font-size: 15px;
                    }}
                    .admin-email {{
                        color: #6b7280;
                        font-size: 13px;
                    }}
                    .info-card {{
                        background: #f9fafb;
                        border-radius: 12px;
                        padding: 20px;
                        margin: 20px 0;
                    }}
                    .info-row {{
                        display: flex;
                        justify-content: space-between;
                        padding: 10px 0;
                        border-bottom: 1px solid #e5e7eb;
                    }}
                    .info-row:last-child {{
                        border-bottom: none;
                    }}
                    .info-label {{
                        color: #6b7280;
                        font-size: 13px;
                    }}
                    .info-value {{
                        color: #1f2937;
                        font-weight: 600;
                        font-size: 13px;
                    }}
                    .notice-box {{
                        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                        border: 1px solid #93c5fd;
                        border-radius: 12px;
                        padding: 20px;
                        margin: 24px 0;
                        text-align: center;
                    }}
                    .notice-icon {{
                        font-size: 32px;
                        margin-bottom: 12px;
                    }}
                    .notice-text {{
                        color: #1e40af;
                        font-size: 14px;
                        line-height: 1.6;
                    }}
                    @media only screen and (max-width: 600px) {{
                        .status-change {{ flex-direction: column; gap: 10px; }}
                        .arrow {{ transform: rotate(90deg); }}
                        .status-box {{ min-width: 100%; }}
                        .admin-info {{ flex-direction: column; text-align: center; }}
                    }}
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="container">
                        <div class="header">
                            <div class="header-icon">⚠️</div>
                            <h1>{override_type_label}</h1>
                            <p>Une correction a été apportée à un bordereau que vous avez traité</p>
                        </div>
                        
                        <div class="content">
                            <p class="greeting">Bonjour <strong>{recipient_name}</strong>,</p>
                            
                            <p class="message">
                                Nous vous informons qu'une correction administrative a été effectuée sur le bordereau 
                                <strong>{form.form_number}</strong> que vous aviez précédemment traité. 
                                Cette notification est envoyée à titre informatif pour maintenir la traçabilité complète des opérations.
                            </p>
                            
                            <div class="form-number-box">
                                <div class="form-number">
                                    <div class="form-number-label">Bordereau concerné</div>
                                    <div class="form-number-value">{form.form_number}</div>
                                </div>
                            </div>
                            
                            <div class="status-change">
                                <div class="status-box status-previous">
                                    <div class="status-label">Ancien statut</div>
                                    <div class="status-value">{previous_status_label}</div>
                                </div>
                                <div class="arrow">→</div>
                                <div class="status-box status-new">
                                    <div class="status-label">Nouveau statut</div>
                                    <div class="status-value">{new_status_label}</div>
                                </div>
                            </div>
                            
                            <div class="reason-box">
                                <div class="reason-title">📝 Raison de la correction</div>
                                <div class="reason-text">{override.reason}</div>
                            </div>
                            
                            {reference_html}
                            
                            <div class="admin-box">
                                <div class="admin-title">Correction effectuée par</div>
                                <div class="admin-info">
                                    <div class="admin-avatar">{admin_name[0].upper() if admin_name else 'A'}</div>
                                    <div class="admin-details">
                                        <div class="admin-name">{admin_name}</div>
                                        <div class="admin-email">{admin_email}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="info-card">
                                <div class="info-row">
                                    <span class="info-label">Date de la correction</span>
                                    <span class="info-value">{override.created_at.strftime('%d/%m/%Y à %H:%M')}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Voyageur</span>
                                    <span class="info-value">{form.traveler.full_name}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Commerçant</span>
                                    <span class="info-value">{form.invoice.merchant.name if form.invoice else '-'}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Montant remboursement</span>
                                    <span class="info-value">{form.refund_amount:,.2f} {form.currency}</span>
                                </div>
                            </div>
                            
                            <div class="notice-box">
                                <div class="notice-icon">ℹ️</div>
                                <div class="notice-text">
                                    Cette correction a été effectuée par un administrateur autorisé. 
                                    Votre décision originale reste enregistrée dans l'historique d'audit du système.
                                    Aucune action n'est requise de votre part.
                                </div>
                            </div>
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
Bonjour {recipient_name},

Une correction administrative a été effectuée sur le bordereau {form.form_number} que vous aviez précédemment traité.

CHANGEMENT DE STATUT
--------------------
Ancien statut: {previous_status_label}
Nouveau statut: {new_status_label}

RAISON DE LA CORRECTION
-----------------------
{override.reason}

{f"N° Ticket: {override.reference_document}" if override.reference_document else ""}

CORRECTION EFFECTUÉE PAR
------------------------
{admin_name}
{admin_email}
Date: {override.created_at.strftime('%d/%m/%Y à %H:%M')}

INFORMATIONS DU BORDEREAU
-------------------------
Voyageur: {form.traveler.full_name}
Commerçant: {form.invoice.merchant.name if form.invoice else '-'}
Montant: {form.refund_amount:,.2f} {form.currency}

Cette correction a été effectuée par un administrateur autorisé.
Votre décision originale reste enregistrée dans l'historique d'audit.
Aucune action n'est requise de votre part.

---
Tax Free RDC
Système de détaxe de la République Démocratique du Congo
© 2026 Tous droits réservés
            """
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient_email],
            )
            email.attach_alternative(html_message, "text/html")
            email.send()
            
            logger.info(f"Status override email sent for form {form.form_number} to {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send status override email: {str(e)}")
            return False


# Alias for backward compatibility
EmailService = TaxFreeEmailService


class SupportEmailService:
    """Service for sending support-related emails."""
    
    @staticmethod
    def _is_email_enabled():
        """Check if email notifications are enabled."""
        from services.settings_service import SettingsService
        return SettingsService.is_email_notifications_enabled()
    
    @staticmethod
    def send_new_conversation_email(conversation, admin_emails):
        """Send email to admins when a new conversation is created."""
        if not SupportEmailService._is_email_enabled():
            logger.info("Email notifications disabled - skipping new conversation email")
            return False
        try:
            subject = f"💬 Nouvelle conversation - {conversation.reference}"
            
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="margin: 0;">💬 Nouvelle conversation</h1>
                    </div>
                    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p><strong>Référence:</strong> {conversation.reference}</p>
                        <p><strong>De:</strong> {conversation.user.get_full_name()} ({conversation.user.email})</p>
                        <p><strong>Sujet:</strong> {conversation.subject}</p>
                        <p><strong>Catégorie:</strong> {conversation.get_category_display()}</p>
                        <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #3b82f6;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">Premier message:</p>
                            <p style="margin: 10px 0 0 0;">{conversation.messages.first().content if conversation.messages.exists() else '-'}</p>
                        </div>
                        <div style="margin-top: 20px; text-align: center;">
                            <a href="{settings.FRONTEND_URL}/admin/support/chat?conversation={conversation.id}" 
                               style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Répondre à la conversation
                            </a>
                        </div>
                    </div>
                    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
                        Tax Free RDC - Système de support
                    </p>
                </div>
            </body>
            </html>
            """
            
            plain_message = f"""
Nouvelle conversation - {conversation.reference}

De: {conversation.user.get_full_name()} ({conversation.user.email})
Sujet: {conversation.subject}
Catégorie: {conversation.get_category_display()}

---
Tax Free RDC - Système de support
            """
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=admin_emails,
            )
            email.attach_alternative(html_message, "text/html")
            email.send()
            
            logger.info(f"New conversation email sent for {conversation.reference}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send new conversation email: {str(e)}")
            return False

    @staticmethod
    def send_new_ticket_email(ticket, admin_emails):
        """Send email to admins when a new ticket is created."""
        if not SupportEmailService._is_email_enabled():
            return False
        try:
            priority_colors = {
                'LOW': '#6b7280',
                'MEDIUM': '#3b82f6',
                'HIGH': '#f97316',
                'URGENT': '#ef4444',
            }
            priority_color = priority_colors.get(ticket.priority, '#3b82f6')
            
            subject = f"🎫 Nouveau ticket - {ticket.ticket_number} [{ticket.get_priority_display()}]"
            
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, {priority_color}, {priority_color}dd); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="margin: 0;">🎫 Nouveau ticket</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Priorité: {ticket.get_priority_display()}</p>
                    </div>
                    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p><strong>Numéro:</strong> {ticket.ticket_number}</p>
                        <p><strong>De:</strong> {ticket.created_by.get_full_name() if ticket.created_by else 'Anonyme'}</p>
                        <p><strong>Type:</strong> {ticket.get_type_display()}</p>
                        <p><strong>Sujet:</strong> {ticket.subject}</p>
                        <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid {priority_color};">
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">Description:</p>
                            <p style="margin: 10px 0 0 0;">{ticket.description[:500]}{'...' if len(ticket.description) > 500 else ''}</p>
                        </div>
                        <div style="margin-top: 20px; text-align: center;">
                            <a href="{settings.FRONTEND_URL}/admin/support/tickets/{ticket.id}" 
                               style="display: inline-block; padding: 12px 24px; background: {priority_color}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Traiter le ticket
                            </a>
                        </div>
                    </div>
                    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
                        Tax Free RDC - Système de support
                    </p>
                </div>
            </body>
            </html>
            """
            
            plain_message = f"""
Nouveau ticket - {ticket.ticket_number}

Priorité: {ticket.get_priority_display()}
De: {ticket.created_by.get_full_name() if ticket.created_by else 'Anonyme'}
Type: {ticket.get_type_display()}
Sujet: {ticket.subject}

Description:
{ticket.description}

---
Tax Free RDC - Système de support
            """
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=admin_emails,
            )
            email.attach_alternative(html_message, "text/html")
            email.send()
            
            logger.info(f"New ticket email sent for {ticket.ticket_number}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send new ticket email: {str(e)}")
            return False

    @staticmethod
    def send_ticket_taken_email(ticket):
        """Send email to ticket creator when ticket is taken."""
        if not SupportEmailService._is_email_enabled():
            return False
        if not ticket.created_by or not ticket.created_by.email:
            return False
            
        try:
            subject = f"📋 Votre ticket {ticket.ticket_number} est pris en charge"
            
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="margin: 0;">📋 Ticket pris en charge</h1>
                    </div>
                    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p>Bonjour <strong>{ticket.created_by.first_name}</strong>,</p>
                        <p>Votre ticket <strong>{ticket.ticket_number}</strong> a été pris en charge par notre équipe support.</p>
                        <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #10b981;">
                            <p><strong>Sujet:</strong> {ticket.subject}</p>
                            <p><strong>Assigné à:</strong> {ticket.assigned_to.get_full_name() if ticket.assigned_to else '-'}</p>
                        </div>
                        <p>Nous vous tiendrons informé de l'avancement de votre demande.</p>
                    </div>
                    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
                        Tax Free RDC - Système de support
                    </p>
                </div>
            </body>
            </html>
            """
            
            plain_message = f"""
Bonjour {ticket.created_by.first_name},

Votre ticket {ticket.ticket_number} a été pris en charge par notre équipe support.

Sujet: {ticket.subject}
Assigné à: {ticket.assigned_to.get_full_name() if ticket.assigned_to else '-'}

Nous vous tiendrons informé de l'avancement de votre demande.

---
Tax Free RDC - Système de support
            """
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[ticket.created_by.email],
            )
            email.attach_alternative(html_message, "text/html")
            email.send()
            
            logger.info(f"Ticket taken email sent for {ticket.ticket_number}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send ticket taken email: {str(e)}")
            return False

    @staticmethod
    def send_ticket_resolved_email(ticket):
        """Send email to ticket creator when ticket is resolved."""
        if not SupportEmailService._is_email_enabled():
            return False
        if not ticket.created_by or not ticket.created_by.email:
            return False
            
        try:
            subject = f"✅ Votre ticket {ticket.ticket_number} a été résolu"
            
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="margin: 0;">✅ Ticket résolu</h1>
                    </div>
                    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p>Bonjour <strong>{ticket.created_by.first_name}</strong>,</p>
                        <p>Votre ticket <strong>{ticket.ticket_number}</strong> a été résolu par notre équipe support.</p>
                        <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #10b981;">
                            <p><strong>Sujet:</strong> {ticket.subject}</p>
                            <p><strong>Résolution:</strong></p>
                            <p style="color: #059669;">{ticket.resolution}</p>
                        </div>
                        <p>Si vous avez des questions, n'hésitez pas à répondre à ce ticket.</p>
                        <div style="margin-top: 20px; text-align: center;">
                            <a href="{settings.FRONTEND_URL}/merchant/tickets/{ticket.id}" 
                               style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Voir le ticket
                            </a>
                        </div>
                    </div>
                    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
                        Tax Free RDC - Système de support
                    </p>
                </div>
            </body>
            </html>
            """
            
            plain_message = f"""
Bonjour {ticket.created_by.first_name},

Votre ticket {ticket.ticket_number} a été résolu par notre équipe support.

Sujet: {ticket.subject}
Résolution: {ticket.resolution}

Si vous avez des questions, n'hésitez pas à répondre à ce ticket.

---
Tax Free RDC - Système de support
            """
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[ticket.created_by.email],
            )
            email.attach_alternative(html_message, "text/html")
            email.send()
            
            logger.info(f"Ticket resolved email sent for {ticket.ticket_number}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send ticket resolved email: {str(e)}")
            return False

    @staticmethod
    def send_ticket_message_email(ticket, message, recipient_email, recipient_name, is_support_reply=False):
        """Send email notification for new ticket message."""
        if not SupportEmailService._is_email_enabled():
            return False
        try:
            if is_support_reply:
                subject = f"💬 Réponse à votre ticket {ticket.ticket_number}"
                header_text = "Nouvelle réponse du support"
                header_color = "#3b82f6"
            else:
                subject = f"💬 Nouveau message sur le ticket {ticket.ticket_number}"
                header_text = "Nouveau message client"
                header_color = "#f97316"
            
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, {header_color}, {header_color}dd); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="margin: 0;">💬 {header_text}</h1>
                    </div>
                    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p>Bonjour <strong>{recipient_name}</strong>,</p>
                        <p>Il y a du nouveau concernant le ticket <strong>{ticket.ticket_number}</strong>.</p>
                        <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid {header_color};">
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">De: {message.author.get_full_name() if message.author else 'Support'}</p>
                            <p style="margin: 10px 0 0 0;">{message.content[:300]}{'...' if len(message.content) > 300 else ''}</p>
                        </div>
                        <p>Connectez-vous pour voir le message complet et répondre.</p>
                        <div style="margin-top: 20px; text-align: center;">
                            <a href="{settings.FRONTEND_URL}/{'admin/support' if not is_support_reply else 'merchant'}/tickets/{ticket.id}" 
                               style="display: inline-block; padding: 12px 24px; background: {header_color}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Voir le ticket
                            </a>
                        </div>
                    </div>
                    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
                        Tax Free RDC - Système de support
                    </p>
                </div>
            </body>
            </html>
            """
            
            plain_message = f"""
Bonjour {recipient_name},

Il y a du nouveau concernant le ticket {ticket.ticket_number}.

De: {message.author.get_full_name() if message.author else 'Support'}
Message: {message.content[:300]}{'...' if len(message.content) > 300 else ''}

Connectez-vous pour voir le message complet et répondre.

---
Tax Free RDC - Système de support
            """
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient_email],
            )
            email.attach_alternative(html_message, "text/html")
            email.send()
            
            logger.info(f"Ticket message email sent for {ticket.ticket_number} to {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send ticket message email: {str(e)}")
            return False

    @staticmethod
    def send_chat_message_email(conversation, message, recipient_email, recipient_name, is_support_reply=False):
        """Send email notification for new chat message."""
        if not SupportEmailService._is_email_enabled():
            return False
        try:
            if is_support_reply:
                subject = f"💬 Réponse du support - {conversation.reference}"
                header_text = "Nouvelle réponse du support"
                header_color = "#3b82f6"
                view_url = f"{settings.FRONTEND_URL}/merchant/support?conversation={conversation.id}"
            else:
                subject = f"💬 Nouveau message - {conversation.reference}"
                header_text = "Nouveau message"
                header_color = "#f97316"
                view_url = f"{settings.FRONTEND_URL}/admin/support/chat?conversation={conversation.id}"
            
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, {header_color}, {header_color}dd); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="margin: 0;">💬 {header_text}</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">{conversation.subject}</p>
                    </div>
                    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p>Bonjour <strong>{recipient_name}</strong>,</p>
                        <p>Vous avez reçu un nouveau message dans votre conversation.</p>
                        <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid {header_color};">
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">De: {message.sender.get_full_name() if message.sender else 'Support'}</p>
                            <p style="margin: 10px 0 0 0;">{message.content[:300]}{'...' if len(message.content) > 300 else ''}</p>
                        </div>
                        <p>Connectez-vous pour voir le message complet et répondre.</p>
                        <div style="margin-top: 20px; text-align: center;">
                            <a href="{view_url}" 
                               style="display: inline-block; padding: 12px 24px; background: {header_color}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Voir la conversation
                            </a>
                        </div>
                    </div>
                    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
                        Tax Free RDC - Système de support
                    </p>
                </div>
            </body>
            </html>
            """
            
            plain_message = f"""
Bonjour {recipient_name},

Vous avez reçu un nouveau message dans votre conversation "{conversation.subject}".

De: {message.sender.get_full_name() if message.sender else 'Support'}
Message: {message.content[:300]}{'...' if len(message.content) > 300 else ''}

Connectez-vous pour voir le message complet et répondre.

---
Tax Free RDC - Système de support
            """
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient_email],
            )
            email.attach_alternative(html_message, "text/html")
            email.send()
            
            logger.info(f"Chat message email sent for {conversation.reference} to {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send chat message email: {str(e)}")
            return False

    @staticmethod
    def send_participant_added_email(conversation, added_user, added_by):
        """Send email to user when they are added to a conversation."""
        if not SupportEmailService._is_email_enabled():
            return False
        if not added_user or not added_user.email:
            return False
            
        try:
            subject = f"📬 Vous avez été ajouté à une conversation - {conversation.reference}"
            
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="margin: 0;">📬 Nouvelle conversation</h1>
                    </div>
                    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p>Bonjour <strong>{added_user.first_name}</strong>,</p>
                        <p>Vous avez été ajouté à une conversation par <strong>{added_by.get_full_name()}</strong>.</p>
                        <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #3b82f6;">
                            <p><strong>Référence:</strong> {conversation.reference}</p>
                            <p><strong>Sujet:</strong> {conversation.subject}</p>
                            <p><strong>Catégorie:</strong> {conversation.get_category_display()}</p>
                        </div>
                        <p>Connectez-vous pour participer à cette conversation.</p>
                        <div style="margin-top: 20px; text-align: center;">
                            <a href="{settings.FRONTEND_URL}/merchant/support?conversation={conversation.id}" 
                               style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Voir la conversation
                            </a>
                        </div>
                    </div>
                    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
                        Tax Free RDC - Système de support
                    </p>
                </div>
            </body>
            </html>
            """
            
            plain_message = f"""
Bonjour {added_user.first_name},

Vous avez été ajouté à une conversation par {added_by.get_full_name()}.

Référence: {conversation.reference}
Sujet: {conversation.subject}
Catégorie: {conversation.get_category_display()}

Connectez-vous pour participer à cette conversation.

---
Tax Free RDC - Système de support
            """
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[added_user.email],
            )
            email.attach_alternative(html_message, "text/html")
            email.send()
            
            logger.info(f"Participant added email sent for {conversation.reference} to {added_user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send participant added email: {str(e)}")
            return False

    @staticmethod
    def send_ticket_observer_email(ticket, observer_user, added_by):
        """Send email to a user when they are added as an observer to a ticket."""
        if not SupportEmailService._is_email_enabled():
            return False
        try:
            subject = f"👁️ Ajouté comme observateur - {ticket.ticket_number}"
            
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="margin: 0;">👁️ Observateur de ticket</h1>
                    </div>
                    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                        <p>Bonjour <strong>{observer_user.first_name}</strong>,</p>
                        <p>Vous avez été ajouté comme observateur à un ticket par <strong>{added_by.get_full_name()}</strong>.</p>
                        
                        <div style="margin: 20px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                            <p style="margin: 0;"><strong>Numéro:</strong> {ticket.ticket_number}</p>
                            <p style="margin: 5px 0;"><strong>Sujet:</strong> {ticket.subject}</p>
                            <p style="margin: 5px 0;"><strong>Type:</strong> {ticket.get_type_display()}</p>
                            <p style="margin: 5px 0;"><strong>Priorité:</strong> {ticket.get_priority_display()}</p>
                            <p style="margin: 5px 0;"><strong>Statut:</strong> {ticket.get_status_display()}</p>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px;">
                            En tant qu'observateur, vous recevrez des notifications sur les mises à jour de ce ticket.
                        </p>
                        
                        <div style="margin-top: 20px; text-align: center;">
                            <a href="{settings.FRONTEND_URL}/admin/support/tickets/{ticket.id}" 
                               style="display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Voir le ticket
                            </a>
                        </div>
                    </div>
                    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
                        Tax Free RDC - Système de support
                    </p>
                </div>
            </body>
            </html>
            """
            
            plain_message = f"""
Bonjour {observer_user.first_name},

Vous avez été ajouté comme observateur à un ticket par {added_by.get_full_name()}.

Numéro: {ticket.ticket_number}
Sujet: {ticket.subject}
Type: {ticket.get_type_display()}
Priorité: {ticket.get_priority_display()}
Statut: {ticket.get_status_display()}

En tant qu'observateur, vous recevrez des notifications sur les mises à jour de ce ticket.

---
Tax Free RDC - Système de support
            """
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[observer_user.email],
            )
            email.attach_alternative(html_message, "text/html")
            email.send()
            
            logger.info(f"Ticket observer email sent for {ticket.ticket_number} to {observer_user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send ticket observer email: {str(e)}")
            return False
