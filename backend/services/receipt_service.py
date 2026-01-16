"""
Receipt generation service for refunds.
"""
import io
import base64
from decimal import Decimal
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import qrcode
import logging

logger = logging.getLogger(__name__)


class ReceiptService:
    """Service for generating refund receipts."""
    
    @classmethod
    def generate_receipt_pdf(cls, refund):
        """
        Generate a professional PDF receipt for a refund.
        
        Args:
            refund: Refund instance (must be PAID status)
            
        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = io.BytesIO()
        
        # Create document - compact margins
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=1*cm,
            bottomMargin=1*cm
        )
        
        # Styles
        styles = getSampleStyleSheet()
        
        # Custom styles - compact
        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1f2937'),
            alignment=TA_CENTER,
            spaceAfter=2*mm
        )
        
        subtitle_style = ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#6b7280'),
            alignment=TA_CENTER,
            spaceAfter=3*mm
        )
        
        section_title_style = ParagraphStyle(
            'SectionTitle',
            parent=styles['Heading2'],
            fontSize=9,
            textColor=colors.HexColor('#374151'),
            spaceBefore=2*mm,
            spaceAfter=1*mm
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#374151'),
            leading=11
        )
        
        small_style = ParagraphStyle(
            'Small',
            parent=styles['Normal'],
            fontSize=7,
            textColor=colors.HexColor('#9ca3af'),
            alignment=TA_CENTER
        )
        
        # Build content
        elements = []
        
        form = refund.form
        traveler = form.traveler
        
        # Get validation info (border and agent)
        validation = None
        try:
            validation = form.customs_validation
        except Exception:
            pass
        
        # Header
        elements.append(Paragraph("REÇU DE REMBOURSEMENT", title_style))
        elements.append(Paragraph("Tax Free - Détaxe Touristique", subtitle_style))
        
        # Receipt number and date - compact two columns
        left_info = [
            ['N° Reçu:', f'REC-{str(refund.id)[:8].upper()}'],
            ['Date:', refund.paid_at.strftime('%d/%m/%Y à %H:%M') if refund.paid_at else timezone.now().strftime('%d/%m/%Y à %H:%M')],
            ['N° Bordereau:', form.form_number],
        ]
        
        right_info = []
        if validation:
            if validation.point_of_exit:
                right_info.append(['Frontière:', validation.point_of_exit.name])
            if validation.agent:
                # Use agent_code from DB if available, otherwise generate from ID
                agent_code = validation.agent.agent_code or f"AG-{str(validation.agent.id)[:6].upper()}"
                right_info.append(['Code Agent:', agent_code])
            right_info.append(['Validé le:', validation.decided_at.strftime('%d/%m/%Y à %H:%M') if validation.decided_at else '-'])
        
        # Create two-column layout for header info
        left_table = Table(left_info, colWidths=[2.5*cm, 4.5*cm])
        left_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        
        if right_info:
            right_table = Table(right_info, colWidths=[2.5*cm, 4.5*cm])
            right_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ]))
            header_table = Table([[left_table, right_table]], colWidths=[8*cm, 8*cm])
        else:
            header_table = Table([[left_table]], colWidths=[16*cm])
        
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 2*mm))
        
        # Traveler info section
        elements.append(Paragraph("BÉNÉFICIAIRE", section_title_style))
        
        traveler_data = [
            ['Nom:', f'{traveler.first_name} {traveler.last_name}', 'Passeport:', traveler.passport_number_full or f'***{traveler.passport_number_last4}'],
            ['Nationalité:', traveler.nationality or '-', 'Email:', traveler.email or '-'],
        ]
        if traveler.phone:
            traveler_data.append(['Tél:', traveler.phone, '', ''])
        
        traveler_table = Table(traveler_data, colWidths=[2*cm, 5.5*cm, 2*cm, 5.5*cm])
        traveler_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
            ('TEXTCOLOR', (2, 0), (2, -1), colors.HexColor('#6b7280')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1f2937')),
            ('TEXTCOLOR', (3, 0), (3, -1), colors.HexColor('#1f2937')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(traveler_table)
        
        # Products section
        if form.invoice and form.invoice.items.exists():
            elements.append(Paragraph("PRODUITS ACHETÉS", section_title_style))
            
            # Table header
            products_data = [['Produit', 'Qté', 'Prix unit.', 'Total']]
            
            for item in form.invoice.items.all()[:5]:  # Limit to 5 items for space
                products_data.append([
                    item.product_name[:30] + ('...' if len(item.product_name) > 30 else ''),
                    f'{item.quantity:,.0f}',
                    f'{item.unit_price:,.0f}',
                    f'{item.line_total:,.0f}'
                ])
            
            # Add total row
            products_data.append(['', '', 'Total HT:', f'{form.invoice.subtotal:,.0f} {refund.currency}'])
            
            products_table = Table(products_data, colWidths=[8*cm, 1.5*cm, 2.5*cm, 3*cm])
            products_table.setStyle(TableStyle([
                # Header
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 7),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
                # Body
                ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#4b5563')),
                # Total row
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('LINEABOVE', (0, -1), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
                # Alignment
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
            ]))
            elements.append(products_table)
        
        # Amount section - highlighted
        elements.append(Paragraph("DÉTAIL DU REMBOURSEMENT", section_title_style))
        
        amount_data = [
            ['Montant TVA brut:', f'{refund.gross_amount:,.2f} {refund.currency}'],
            ['Frais opérateur:', f'-{refund.operator_fee:,.2f} {refund.currency}'],
            ['MONTANT NET REMBOURSÉ:', f'{refund.net_amount:,.2f} {refund.currency}'],
        ]
        
        amount_table = Table(amount_data, colWidths=[6*cm, 7*cm])
        amount_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 1), 'Helvetica'),
            ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 1), 8),
            ('FONTSIZE', (0, 2), (-1, 2), 11),
            ('TEXTCOLOR', (0, 0), (-1, 1), colors.HexColor('#374151')),
            ('TEXTCOLOR', (0, 2), (-1, 2), colors.HexColor('#059669')),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LINEABOVE', (0, 2), (-1, 2), 1, colors.HexColor('#d1d5db')),
            ('TOPPADDING', (0, 2), (-1, 2), 4),
            ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#ecfdf5')),
        ]))
        elements.append(amount_table)
        
        method_display = {
            'CASH': 'Espèces au guichet',
            'CARD': 'Carte bancaire',
            'BANK_TRANSFER': 'Virement bancaire',
            'MOBILE_MONEY': 'Mobile Money'
        }
        
        # Payment and Merchant in two columns
        payment_data = [
            ['Méthode:', method_display.get(refund.method, refund.method)],
            ['Statut:', 'PAYÉ ✓'],
            ['Date:', refund.paid_at.strftime('%d/%m/%Y %H:%M') if refund.paid_at else '-'],
        ]
        
        merchant_data = [
            ['Enseigne:', form.invoice.merchant.name if form.invoice and form.invoice.merchant else '-'],
            ['Facture:', form.invoice.invoice_number if form.invoice else '-'],
            ['Date achat:', form.invoice.invoice_date.strftime('%d/%m/%Y') if form.invoice and form.invoice.invoice_date else '-'],
        ]
        
        payment_table = Table(payment_data, colWidths=[2*cm, 5*cm])
        payment_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1f2937')),
            ('TEXTCOLOR', (1, 1), (1, 1), colors.HexColor('#059669')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        
        merchant_table = Table(merchant_data, colWidths=[2.5*cm, 5*cm])
        merchant_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1f2937')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ]))
        
        # Combine payment and merchant in two columns
        combined_table = Table([[payment_table, merchant_table]], colWidths=[8*cm, 8*cm])
        combined_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(Paragraph("PAIEMENT & COMMERÇANT", section_title_style))
        elements.append(combined_table)
        
        # QR Code - smaller
        elements.append(Spacer(1, 2*mm))
        
        qr_data = f"RECEIPT:{refund.id}|FORM:{form.form_number}|AMOUNT:{refund.net_amount}|DATE:{refund.paid_at.isoformat() if refund.paid_at else ''}"
        qr = qrcode.QRCode(version=1, box_size=2, border=1)
        qr.add_data(qr_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        qr_buffer = io.BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)
        
        qr_image = Image(qr_buffer, width=2*cm, height=2*cm)
        
        qr_table = Table([[qr_image]], colWidths=[17*cm])
        qr_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(qr_table)
        
        # Footer - compact
        elements.append(Spacer(1, 2*mm))
        elements.append(Paragraph(
            f"Ce reçu atteste du remboursement effectué dans le cadre du programme de détaxe touristique. © {timezone.now().year} {getattr(settings, 'APP_NAME', 'Tax Free RDC')}",
            small_style
        ))
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        return buffer
    
    @classmethod
    def generate_receipt_base64(cls, refund):
        """Generate receipt and return as base64 string."""
        buffer = cls.generate_receipt_pdf(refund)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    @classmethod
    def send_receipt_email(cls, refund):
        """
        Send receipt PDF to traveler by email.
        
        Args:
            refund: Refund instance
            
        Returns:
            bool indicating success
        """
        from django.core.mail import EmailMultiAlternatives
        
        traveler = refund.form.traveler
        
        if not traveler.email:
            logger.warning(f"No email for traveler {traveler.id}, cannot send receipt")
            return False
        
        try:
            # Generate PDF
            pdf_buffer = cls.generate_receipt_pdf(refund)
            
            subject = f"🧾 Reçu de remboursement Tax Free - {refund.form.form_number}"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ text-align: center; padding: 20px 0; border-bottom: 2px solid #e5e7eb; }}
                    .header h1 {{ color: #059669; margin: 0; font-size: 24px; }}
                    .content {{ padding: 30px 0; }}
                    .amount-box {{ background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }}
                    .amount {{ font-size: 32px; font-weight: bold; color: #059669; }}
                    .currency {{ font-size: 14px; color: #6b7280; }}
                    .details {{ background: #f9fafb; border-radius: 8px; padding: 15px; margin: 20px 0; }}
                    .details p {{ margin: 8px 0; }}
                    .footer {{ text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Remboursement effectué</h1>
                        <p style="color: #6b7280; margin-top: 10px;">Votre remboursement Tax Free a été traité avec succès</p>
                    </div>
                    
                    <div class="content">
                        <p>Bonjour <strong>{traveler.first_name} {traveler.last_name}</strong>,</p>
                        
                        <p>Nous avons le plaisir de vous confirmer que votre remboursement de TVA a été effectué.</p>
                        
                        <div class="amount-box">
                            <div class="amount">{refund.net_amount:,.2f}</div>
                            <div class="currency">{refund.currency}</div>
                        </div>
                        
                        <div class="details">
                            <p><strong>N° Bordereau:</strong> {refund.form.form_number}</p>
                            <p><strong>Méthode:</strong> {refund.get_method_display()}</p>
                            <p><strong>Date:</strong> {refund.paid_at.strftime('%d/%m/%Y à %H:%M') if refund.paid_at else '-'}</p>
                        </div>
                        
                        <p>Vous trouverez en pièce jointe votre reçu de remboursement au format PDF.</p>
                        
                        <p>Merci d'avoir utilisé notre service de détaxe. Bon voyage !</p>
                    </div>
                    
                    <div class="footer">
                        <p>© {timezone.now().year} {getattr(settings, 'APP_NAME', 'Tax Free RDC')}. Tous droits réservés.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            msg = EmailMultiAlternatives(
                subject,
                f"Votre remboursement de {refund.net_amount} {refund.currency} a été effectué. Bordereau: {refund.form.form_number}",
                settings.DEFAULT_FROM_EMAIL,
                [traveler.email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.attach(
                f'recu_remboursement_{refund.form.form_number}.pdf',
                pdf_buffer.getvalue(),
                'application/pdf'
            )
            
            msg.send(fail_silently=False)
            logger.info(f"Receipt email sent to {traveler.email} for refund {refund.id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send receipt email: {e}", exc_info=True)
            return False
