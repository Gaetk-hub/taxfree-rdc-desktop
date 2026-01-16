"""
Compact Professional Tax Free Form PDF Generator - Single Page Design.
Version 2.1 - Complete traveler info + legal notices
"""
import io
import logging
from decimal import Decimal
from datetime import datetime

logger = logging.getLogger(__name__)


class TaxFreePDFServiceV2:
    """Compact single-page PDF generator for Tax Free Forms."""
    
    PRIMARY = "#1e40af"
    SUCCESS = "#059669"
    DANGER = "#dc2626"
    TEXT = "#1f2937"
    MUTED = "#6b7280"
    BORDER = "#d1d5db"
    LIGHT_BG = "#f3f4f6"
    HEADER_BG = "#eff6ff"
    
    # Legal text
    LEGAL_NOTICE = """CONDITIONS DE REMBOURSEMENT - Conformément à la réglementation fiscale de la RD Congo:
• Le voyageur doit être non-résident de la RD Congo et quitter le territoire dans les 90 jours suivant l'achat.
• Les marchandises doivent être présentées à la douane avec ce bordereau et les factures originales avant le départ.
• Le remboursement sera effectué après validation par les services douaniers via le mode de paiement choisi.
• Certaines catégories de produits sont exclues du remboursement (tabac, alcool, carburants, services, etc.).
• Ce document est personnel et non transférable. Toute fraude est passible de poursuites judiciaires."""
    
    @classmethod
    def generate_form_pdf(cls, form):
        """Generate a compact single-page PDF."""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.units import mm
            from reportlab.lib.colors import HexColor, white
            from reportlab.lib.styles import ParagraphStyle
            from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
            from reportlab.graphics.barcode import qr
            from reportlab.graphics.shapes import Drawing
            
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(
                buffer, pagesize=A4,
                rightMargin=10*mm, leftMargin=10*mm,
                topMargin=8*mm, bottomMargin=8*mm
            )
            
            elements = []
            
            # Styles
            s_title = ParagraphStyle('title', fontSize=14, textColor=HexColor(cls.PRIMARY), fontName='Helvetica-Bold', alignment=TA_LEFT)
            s_subtitle = ParagraphStyle('subtitle', fontSize=7, textColor=HexColor(cls.MUTED), alignment=TA_LEFT)
            s_doc_title = ParagraphStyle('doctitle', fontSize=11, textColor=HexColor(cls.PRIMARY), fontName='Helvetica-Bold', alignment=TA_RIGHT)
            s_form_num = ParagraphStyle('formnum', fontSize=16, textColor=white, fontName='Helvetica-Bold', alignment=TA_CENTER)
            s_form_label = ParagraphStyle('formlabel', fontSize=7, textColor=white, alignment=TA_CENTER)
            s_section = ParagraphStyle('section', fontSize=9, textColor=HexColor(cls.PRIMARY), fontName='Helvetica-Bold', spaceBefore=2*mm, spaceAfter=1*mm)
            s_label = ParagraphStyle('label', fontSize=6, textColor=HexColor(cls.MUTED))
            s_value = ParagraphStyle('value', fontSize=8, textColor=HexColor(cls.TEXT), fontName='Helvetica-Bold')
            s_small = ParagraphStyle('small', fontSize=6, textColor=HexColor(cls.MUTED))
            s_total_label = ParagraphStyle('totallabel', fontSize=8, textColor=HexColor(cls.TEXT), fontName='Helvetica-Bold', alignment=TA_RIGHT)
            s_total_value = ParagraphStyle('totalvalue', fontSize=10, textColor=HexColor(cls.SUCCESS), fontName='Helvetica-Bold', alignment=TA_RIGHT)
            
            # ===== HEADER =====
            header = Table([
                [[Paragraph("🇨🇩 Tax Free RDC", s_title), Paragraph("Système de détaxe - RD Congo", s_subtitle)],
                 [Paragraph("BORDEREAU DE DÉTAXE", s_doc_title), Paragraph("VAT Refund Document", s_subtitle)]]
            ], colWidths=[95*mm, 95*mm])
            header.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
            elements.append(header)
            elements.append(Spacer(1, 2*mm))
            
            # ===== FORM NUMBER =====
            num_box = Table([
                [Paragraph("N° BORDEREAU", s_form_label)],
                [Paragraph(form.form_number, s_form_num)]
            ], colWidths=[190*mm])
            num_box.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), HexColor(cls.PRIMARY)),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('TOPPADDING', (0,0), (-1,-1), 2*mm),
                ('BOTTOMPADDING', (0,-1), (-1,-1), 3*mm),
            ]))
            elements.append(num_box)
            elements.append(Spacer(1, 2*mm))
            
            # ===== QR + STATUS + INFO =====
            qr_data = f"{form.qr_payload}|{form.qr_signature}" if form.qr_payload else form.form_number
            qr_code = qr.QrCodeWidget(qr_data)
            qr_code.barWidth = 22*mm
            qr_code.barHeight = 22*mm
            qr_drawing = Drawing(24*mm, 24*mm)
            qr_drawing.add(qr_code)
            
            status_color = cls.SUCCESS if form.status == 'VALIDATED' else (cls.DANGER if form.status in ['CANCELLED', 'REFUSED'] else cls.PRIMARY)
            s_status = ParagraphStyle('status', fontSize=9, textColor=HexColor(status_color), fontName='Helvetica-Bold')
            
            merchant = form.invoice.merchant
            outlet = form.invoice.outlet
            traveler = form.traveler
            
            # QR + Status only
            qr_status = [
                [Paragraph("Statut", s_label), Paragraph(form.get_status_display(), s_status)],
                [Paragraph("Créé le", s_label), Paragraph(form.created_at.strftime('%d/%m/%Y %H:%M'), s_value)],
            ]
            qr_status_table = Table(qr_status, colWidths=[20*mm, 40*mm])
            qr_status_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('TOPPADDING', (0,0), (-1,-1), 0.5*mm)]))
            
            qr_info = Table([[qr_drawing, qr_status_table]], colWidths=[28*mm, 65*mm])
            qr_info.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('BOX', (0,0), (-1,-1), 0.5, HexColor(cls.BORDER)),
                ('BACKGROUND', (0,0), (-1,-1), HexColor(cls.LIGHT_BG)),
                ('PADDING', (0,0), (-1,-1), 2*mm),
            ]))
            elements.append(qr_info)
            elements.append(Spacer(1, 2*mm))
            
            # ===== MERCHANT INFO (COMPLETE) =====
            elements.append(Paragraph("INFORMATIONS DU COMMERÇANT", s_section))
            
            # Get outlet address
            outlet_address = f"{outlet.address_line1}" if outlet.address_line1 else ''
            if outlet.address_line2:
                outlet_address += f", {outlet.address_line2}"
            outlet_address += f", {outlet.city}" if outlet.city else ''
            if not outlet_address.strip():
                outlet_address = f"{merchant.address_line1}, {merchant.city}" if merchant.address_line1 else '-'
            
            merchant_data = [
                [Paragraph("Raison sociale", s_label), Paragraph(merchant.name, s_value),
                 Paragraph("N° RCCM", s_label), Paragraph(merchant.registration_number or '-', s_value)],
                [Paragraph("NIF / ID Fiscal", s_label), Paragraph(merchant.tax_id or '-', s_value),
                 Paragraph("Point de vente", s_label), Paragraph(outlet.name, s_value)],
                [Paragraph("Adresse", s_label), Paragraph(outlet_address, s_value),
                 Paragraph("Ville", s_label), Paragraph(outlet.city or merchant.city or '-', s_value)],
                [Paragraph("Téléphone", s_label), Paragraph(outlet.phone or merchant.contact_phone or '-', s_value),
                 Paragraph("Email", s_label), Paragraph(outlet.email or merchant.contact_email or '-', s_value)],
            ]
            
            merchant_table = Table(merchant_data, colWidths=[25*mm, 55*mm, 25*mm, 55*mm])
            merchant_table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('TOPPADDING', (0,0), (-1,-1), 1*mm),
                ('BOTTOMPADDING', (0,0), (-1,-1), 1*mm),
                ('BOX', (0,0), (-1,-1), 0.5, HexColor(cls.BORDER)),
                ('INNERGRID', (0,0), (-1,-1), 0.25, HexColor(cls.BORDER)),
                ('BACKGROUND', (0,0), (-1,-1), HexColor('#ffffff')),
            ]))
            elements.append(merchant_table)
            elements.append(Spacer(1, 2*mm))
            
            # ===== TRAVELER INFO (COMPLETE) =====
            elements.append(Paragraph("INFORMATIONS DU VOYAGEUR", s_section))
            
            dob_str = traveler.date_of_birth.strftime('%d/%m/%Y') if traveler.date_of_birth else '-'
            passport_display = f"***{traveler.passport_number_last4}" if traveler.passport_number_last4 else (traveler.passport_number_full or '-')
            
            traveler_data = [
                [Paragraph("Nom complet", s_label), Paragraph(f"{traveler.first_name} {traveler.last_name}", s_value),
                 Paragraph("Date de naissance", s_label), Paragraph(dob_str, s_value)],
                [Paragraph("Nationalité", s_label), Paragraph(cls._get_country(traveler.nationality), s_value),
                 Paragraph("Pays de résidence", s_label), Paragraph(cls._get_country(traveler.residence_country), s_value)],
                [Paragraph("N° Passeport", s_label), Paragraph(passport_display, s_value),
                 Paragraph("Pays d'émission", s_label), Paragraph(cls._get_country(traveler.passport_country), s_value)],
                [Paragraph("Email", s_label), Paragraph(traveler.email or '-', s_value),
                 Paragraph("Téléphone", s_label), Paragraph(traveler.phone or '-', s_value)],
            ]
            
            traveler_table = Table(traveler_data, colWidths=[25*mm, 55*mm, 30*mm, 55*mm])
            traveler_table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('TOPPADDING', (0,0), (-1,-1), 1*mm),
                ('BOTTOMPADDING', (0,0), (-1,-1), 1*mm),
                ('BOX', (0,0), (-1,-1), 0.5, HexColor(cls.BORDER)),
                ('INNERGRID', (0,0), (-1,-1), 0.25, HexColor(cls.BORDER)),
                ('BACKGROUND', (0,0), (-1,-1), HexColor('#ffffff')),
            ]))
            elements.append(traveler_table)
            elements.append(Spacer(1, 2*mm))
            
            # ===== ARTICLES =====
            elements.append(Paragraph("ARTICLES", s_section))
            
            # Get excluded categories from rule_snapshot
            excluded_cats = form.rule_snapshot.get('excluded_categories', []) if form.rule_snapshot else []
            
            items_data = [['#', 'Désignation', 'Code-barres', 'Catégorie', 'Qté', 'P.U.', 'TVA', 'Total']]
            for i, item in enumerate(form.invoice.items.all()[:10], 1):  # Limit to 10 items
                is_excluded = item.product_category in excluded_cats or item.is_eligible == False
                cat_display = item.product_category[:12] + ('⚠' if is_excluded else '')
                items_data.append([
                    str(i),
                    item.product_name[:25],
                    item.barcode[:15] if item.barcode else '-',
                    cat_display,
                    f"{item.quantity:.0f}",
                    f"{item.unit_price:,.0f}",
                    f"{item.vat_rate:.0f}%",
                    f"{item.line_total:,.0f}"
                ])
            
            items_table = Table(items_data, colWidths=[8*mm, 45*mm, 25*mm, 25*mm, 12*mm, 25*mm, 15*mm, 30*mm])
            items_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), HexColor(cls.PRIMARY)),
                ('TEXTCOLOR', (0,0), (-1,0), white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 7),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('ALIGN', (1,1), (1,-1), 'LEFT'),
                ('ALIGN', (5,1), (-1,-1), 'RIGHT'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('GRID', (0,0), (-1,-1), 0.25, HexColor(cls.BORDER)),
                ('TOPPADDING', (0,0), (-1,-1), 1*mm),
                ('BOTTOMPADDING', (0,0), (-1,-1), 1*mm),
            ]))
            elements.append(items_table)
            elements.append(Spacer(1, 2*mm))
            
            # ===== FINANCIAL SUMMARY =====
            elements.append(Paragraph("RÉCAPITULATIF FINANCIER", s_section))
            
            # Get fee percentage from rule_snapshot (dynamic)
            fee_pct = 0
            min_fee = 0
            fixed_fee = 0
            if form.rule_snapshot:
                fee_pct = form.rule_snapshot.get('operator_fee_percentage', 0)
                min_fee = form.rule_snapshot.get('operator_min_fee', 0)
                fixed_fee = form.rule_snapshot.get('operator_fixed_fee', 0)
            
            # Build fee label with details
            fee_label = f'Frais opérateur ({fee_pct}%'
            if min_fee > 0:
                fee_label += f', min {min_fee:,.0f}'
            if fixed_fee > 0:
                fee_label += f' + {fixed_fee:,.0f} fixe'
            fee_label += '):'
            
            fin_data = [
                ['Total HT:', f"{form.invoice.subtotal:,.2f} {form.currency}", 'TVA Éligible:', f"{form.vat_amount:,.2f} {form.currency}"],
                ['Total TVA:', f"{form.invoice.total_vat:,.2f} {form.currency}", fee_label, f"{form.operator_fee:,.2f} {form.currency}"],
                ['Total TTC:', f"{form.invoice.total_amount:,.2f} {form.currency}", 'REMBOURSEMENT NET:', f"{form.refund_amount:,.2f} {form.currency}"],
            ]
            
            fin_table = Table(fin_data, colWidths=[30*mm, 45*mm, 40*mm, 45*mm])
            fin_table.setStyle(TableStyle([
                ('FONTSIZE', (0,0), (-1,-1), 8),
                ('ALIGN', (1,0), (1,-1), 'RIGHT'),
                ('ALIGN', (3,0), (3,-1), 'RIGHT'),
                ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
                ('FONTNAME', (2,-1), (3,-1), 'Helvetica-Bold'),
                ('TEXTCOLOR', (2,-1), (3,-1), HexColor(cls.SUCCESS)),
                ('FONTSIZE', (2,-1), (3,-1), 10),
                ('BOX', (0,0), (-1,-1), 0.5, HexColor(cls.BORDER)),
                ('INNERGRID', (0,0), (-1,-1), 0.25, HexColor(cls.BORDER)),
                ('TOPPADDING', (0,0), (-1,-1), 1*mm),
                ('BOTTOMPADDING', (0,0), (-1,-1), 1*mm),
                ('BACKGROUND', (2,-1), (3,-1), HexColor('#ecfdf5')),
            ]))
            elements.append(fin_table)
            elements.append(Spacer(1, 2*mm))
            
            # ===== VALIDITY =====
            validity_data = [
                ['Date création:', form.created_at.strftime('%d/%m/%Y'), 'Expire le:', form.expires_at.strftime('%d/%m/%Y'), 'Facture:', form.invoice.invoice_number],
            ]
            validity_table = Table(validity_data, colWidths=[25*mm, 30*mm, 20*mm, 30*mm, 20*mm, 40*mm])
            validity_table.setStyle(TableStyle([
                ('FONTSIZE', (0,0), (-1,-1), 7),
                ('FONTNAME', (1,0), (1,-1), 'Helvetica-Bold'),
                ('FONTNAME', (3,0), (3,-1), 'Helvetica-Bold'),
                ('FONTNAME', (5,0), (5,-1), 'Helvetica-Bold'),
                ('TEXTCOLOR', (3,0), (3,-1), HexColor(cls.DANGER)),
                ('BOX', (0,0), (-1,-1), 0.5, HexColor(cls.BORDER)),
                ('TOPPADDING', (0,0), (-1,-1), 1*mm),
                ('BOTTOMPADDING', (0,0), (-1,-1), 1*mm),
            ]))
            elements.append(validity_table)
            elements.append(Spacer(1, 2*mm))
            
            # ===== SIGNATURES =====
            sig_data = [
                ['Signature Commerçant', 'Cachet Douane', 'Signature Voyageur'],
                ['', '', ''],
            ]
            sig_table = Table(sig_data, colWidths=[63*mm, 63*mm, 63*mm], rowHeights=[5*mm, 15*mm])
            sig_table.setStyle(TableStyle([
                ('FONTSIZE', (0,0), (-1,0), 7),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('BOX', (0,0), (-1,-1), 0.5, HexColor(cls.BORDER)),
                ('INNERGRID', (0,0), (-1,-1), 0.25, HexColor(cls.BORDER)),
                ('BACKGROUND', (0,1), (-1,1), HexColor('#fafafa')),
            ]))
            elements.append(sig_table)
            elements.append(Spacer(1, 2*mm))
            
            # ===== LEGAL NOTICE =====
            elements.append(Paragraph("CONDITIONS ET MENTIONS LÉGALES", s_section))
            
            s_legal = ParagraphStyle('legal', fontSize=6, textColor=HexColor(cls.MUTED), leading=8)
            legal_text = cls.LEGAL_NOTICE
            elements.append(Paragraph(legal_text, s_legal))
            elements.append(Spacer(1, 2*mm))
            
            # ===== FOOTER =====
            footer_text = f"Document généré le {datetime.now().strftime('%d/%m/%Y %H:%M')} | Tax Free RDC | www.taxfree.cd | +243 XXX XXX XXX | contact@taxfree.cd"
            s_footer = ParagraphStyle('footer', fontSize=6, textColor=HexColor(cls.MUTED), alignment=TA_CENTER)
            elements.append(Paragraph(footer_text, s_footer))
            
            doc.build(elements)
            buffer.seek(0)
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"PDF generation failed: {e}", exc_info=True)
            return None
    
    @classmethod
    def _get_country(cls, code):
        """Get country name from code."""
        countries = {
            'CD': 'RD Congo', 'FR': 'France', 'BE': 'Belgique', 'US': 'États-Unis',
            'GB': 'Royaume-Uni', 'DE': 'Allemagne', 'CN': 'Chine', 'ZA': 'Afrique du Sud',
            'AO': 'Angola', 'CG': 'Congo-Brazzaville', 'RW': 'Rwanda', 'UG': 'Ouganda',
        }
        return countries.get(code, code or '-')
