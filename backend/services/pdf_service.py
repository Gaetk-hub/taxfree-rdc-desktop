"""
Professional Tax Free Form PDF Generator Service.
Generates high-quality, print-ready PDF documents with all required information.
"""
import io
import logging
from decimal import Decimal
from datetime import datetime

logger = logging.getLogger(__name__)


class TaxFreePDFService:
    """Service for generating professional Tax Free Form PDFs."""
    
    # Platform information
    PLATFORM_NAME = "Tax Free RDC"
    PLATFORM_TAGLINE = "Système de détaxe de la République Démocratique du Congo"
    PLATFORM_WEBSITE = "www.taxfree.cd"
    PLATFORM_EMAIL = "contact@taxfree.cd"
    PLATFORM_PHONE = "+243 XXX XXX XXX"
    PLATFORM_ADDRESS = "Kinshasa, République Démocratique du Congo"
    
    # Colors
    PRIMARY_COLOR = "#1e40af"  # Blue
    SECONDARY_COLOR = "#10b981"  # Green
    ACCENT_COLOR = "#f59e0b"  # Amber
    TEXT_COLOR = "#1f2937"
    LIGHT_TEXT = "#6b7280"
    BORDER_COLOR = "#e5e7eb"
    SUCCESS_COLOR = "#059669"
    WARNING_COLOR = "#d97706"
    
    @classmethod
    def generate_form_pdf(cls, form):
        """
        Generate a professional Tax Free Form PDF.
        
        Args:
            form: TaxFreeForm instance with all related data
            
        Returns:
            bytes: PDF content
        """
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.units import mm, cm
            from reportlab.lib.colors import HexColor, black, white
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
            from reportlab.platypus import (
                SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                Image, PageBreak, HRFlowable
            )
            from reportlab.pdfgen import canvas
            from reportlab.graphics.shapes import Drawing, Rect, Line
            from reportlab.graphics.barcode import qr
            
            buffer = io.BytesIO()
            
            # Page setup
            width, height = A4
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=15*mm,
                leftMargin=15*mm,
                topMargin=15*mm,
                bottomMargin=20*mm
            )
            
            # Styles
            styles = getSampleStyleSheet()
            
            # Custom styles
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=HexColor(cls.PRIMARY_COLOR),
                alignment=TA_CENTER,
                spaceAfter=5*mm,
                fontName='Helvetica-Bold'
            )
            
            subtitle_style = ParagraphStyle(
                'CustomSubtitle',
                parent=styles['Normal'],
                fontSize=11,
                textColor=HexColor(cls.LIGHT_TEXT),
                alignment=TA_CENTER,
                spaceAfter=8*mm
            )
            
            section_title_style = ParagraphStyle(
                'SectionTitle',
                parent=styles['Heading2'],
                fontSize=12,
                textColor=HexColor(cls.PRIMARY_COLOR),
                spaceBefore=6*mm,
                spaceAfter=3*mm,
                fontName='Helvetica-Bold',
                borderPadding=(0, 0, 2*mm, 0)
            )
            
            normal_style = ParagraphStyle(
                'CustomNormal',
                parent=styles['Normal'],
                fontSize=10,
                textColor=HexColor(cls.TEXT_COLOR),
                leading=14
            )
            
            small_style = ParagraphStyle(
                'SmallText',
                parent=styles['Normal'],
                fontSize=8,
                textColor=HexColor(cls.LIGHT_TEXT),
                leading=10
            )
            
            # Build document elements
            elements = []
            
            # ========== HEADER ==========
            elements.append(cls._build_header(form, styles))
            elements.append(Spacer(1, 5*mm))
            
            # ========== FORM NUMBER BOX ==========
            elements.append(cls._build_form_number_box(form))
            elements.append(Spacer(1, 5*mm))
            
            # ========== QR CODE AND STATUS ==========
            elements.append(cls._build_qr_and_status_section(form))
            elements.append(Spacer(1, 5*mm))
            
            # ========== MERCHANT INFO ==========
            elements.append(Paragraph("🏪 INFORMATIONS DU COMMERÇANT", section_title_style))
            elements.append(cls._build_merchant_section(form))
            elements.append(Spacer(1, 3*mm))
            
            # ========== TRAVELER INFO ==========
            elements.append(Paragraph("👤 INFORMATIONS DU VOYAGEUR", section_title_style))
            elements.append(cls._build_traveler_section(form))
            elements.append(Spacer(1, 3*mm))
            
            # ========== PRODUCTS TABLE ==========
            elements.append(Paragraph("📦 DÉTAIL DES ARTICLES", section_title_style))
            elements.append(cls._build_products_table(form))
            elements.append(Spacer(1, 3*mm))
            
            # ========== FINANCIAL SUMMARY ==========
            elements.append(Paragraph("💰 RÉCAPITULATIF FINANCIER", section_title_style))
            elements.append(cls._build_financial_summary(form))
            elements.append(Spacer(1, 3*mm))
            
            # ========== DATES AND VALIDITY ==========
            elements.append(Paragraph("📅 DATES ET VALIDITÉ", section_title_style))
            elements.append(cls._build_dates_section(form))
            elements.append(Spacer(1, 5*mm))
            
            # ========== SIGNATURES SECTION ==========
            elements.append(Paragraph("✍️ SIGNATURES ET VALIDATIONS", section_title_style))
            elements.append(cls._build_signatures_section(form))
            elements.append(Spacer(1, 5*mm))
            
            # ========== TERMS AND CONDITIONS ==========
            elements.append(cls._build_terms_section())
            elements.append(Spacer(1, 5*mm))
            
            # ========== FOOTER ==========
            elements.append(cls._build_footer(form))
            
            # Build PDF
            doc.build(elements)
            buffer.seek(0)
            return buffer.getvalue()
            
        except ImportError as e:
            logger.error(f"ReportLab not installed: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to generate PDF: {str(e)}", exc_info=True)
            return None
    
    @classmethod
    def _build_header(cls, form, styles):
        """Build the document header with logo and platform info."""
        from reportlab.platypus import Table, TableStyle, Paragraph
        from reportlab.lib.colors import HexColor
        from reportlab.lib.units import mm
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        from reportlab.lib.styles import ParagraphStyle
        
        # Platform name style
        platform_style = ParagraphStyle(
            'Platform',
            fontSize=20,
            textColor=HexColor(cls.PRIMARY_COLOR),
            fontName='Helvetica-Bold',
            alignment=TA_LEFT
        )
        
        tagline_style = ParagraphStyle(
            'Tagline',
            fontSize=9,
            textColor=HexColor(cls.LIGHT_TEXT),
            alignment=TA_LEFT
        )
        
        doc_title_style = ParagraphStyle(
            'DocTitle',
            fontSize=16,
            textColor=HexColor(cls.PRIMARY_COLOR),
            fontName='Helvetica-Bold',
            alignment=TA_RIGHT
        )
        
        doc_subtitle_style = ParagraphStyle(
            'DocSubtitle',
            fontSize=9,
            textColor=HexColor(cls.LIGHT_TEXT),
            alignment=TA_RIGHT
        )
        
        # Left side: Platform info
        left_content = [
            Paragraph(f"🇨🇩 {cls.PLATFORM_NAME}", platform_style),
            Paragraph(cls.PLATFORM_TAGLINE, tagline_style),
        ]
        
        # Right side: Document title
        right_content = [
            Paragraph("BORDEREAU DE DÉTAXE", doc_title_style),
            Paragraph("Tax Free Form / VAT Refund Document", doc_subtitle_style),
        ]
        
        header_data = [[left_content, right_content]]
        header_table = Table(header_data, colWidths=[90*mm, 90*mm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3*mm),
        ]))
        
        return header_table
    
    @classmethod
    def _build_form_number_box(cls, form):
        """Build the prominent form number display box."""
        from reportlab.platypus import Table, TableStyle, Paragraph
        from reportlab.lib.colors import HexColor, white
        from reportlab.lib.units import mm
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_CENTER
        
        number_style = ParagraphStyle(
            'FormNumber',
            fontSize=22,
            textColor=white,
            fontName='Helvetica-Bold',
            alignment=TA_CENTER
        )
        
        label_style = ParagraphStyle(
            'FormLabel',
            fontSize=9,
            textColor=white,
            alignment=TA_CENTER
        )
        
        content = [
            [Paragraph("N° DU BORDEREAU", label_style)],
            [Paragraph(form.form_number, number_style)],
        ]
        
        box = Table(content, colWidths=[180*mm])
        box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HexColor(cls.PRIMARY_COLOR)),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, 0), 3*mm),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 4*mm),
            ('LEFTPADDING', (0, 0), (-1, -1), 5*mm),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5*mm),
            ('ROUNDEDCORNERS', [3*mm, 3*mm, 3*mm, 3*mm]),
        ]))
        
        return box
    
    @classmethod
    def _build_qr_and_status_section(cls, form):
        """Build QR code and status section."""
        from reportlab.platypus import Table, TableStyle, Paragraph, Image
        from reportlab.lib.colors import HexColor
        from reportlab.lib.units import mm
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from reportlab.graphics.barcode import qr
        from reportlab.graphics.shapes import Drawing
        
        # Generate QR code
        qr_data = f"{form.qr_payload}|{form.qr_signature}" if form.qr_payload and form.qr_signature else form.form_number
        qr_code = qr.QrCodeWidget(qr_data)
        qr_code.barWidth = 35*mm
        qr_code.barHeight = 35*mm
        qr_drawing = Drawing(40*mm, 40*mm)
        qr_drawing.add(qr_code)
        
        # Status styling
        status_colors = {
            'CREATED': cls.ACCENT_COLOR,
            'ISSUED': cls.PRIMARY_COLOR,
            'VALIDATION_PENDING': cls.WARNING_COLOR,
            'VALIDATED': cls.SUCCESS_COLOR,
            'REFUSED': '#dc2626',
            'EXPIRED': '#6b7280',
            'CANCELLED': '#dc2626',
        }
        status_color = status_colors.get(form.status, cls.LIGHT_TEXT)
        
        status_style = ParagraphStyle(
            'Status',
            fontSize=12,
            textColor=HexColor(status_color),
            fontName='Helvetica-Bold',
            alignment=TA_CENTER
        )
        
        info_style = ParagraphStyle(
            'QRInfo',
            fontSize=8,
            textColor=HexColor(cls.LIGHT_TEXT),
            alignment=TA_CENTER
        )
        
        # QR section
        qr_content = [
            [qr_drawing],
            [Paragraph("Scannez ce code à la douane", info_style)],
        ]
        qr_table = Table(qr_content, colWidths=[45*mm])
        qr_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        # Status section
        status_display = form.get_status_display() if hasattr(form, 'get_status_display') else form.status
        
        id_style = ParagraphStyle(
            'ID',
            fontSize=7,
            textColor=HexColor(cls.LIGHT_TEXT),
            alignment=TA_LEFT
        )
        
        status_content = [
            [Paragraph(f"<b>Statut:</b> {status_display}", status_style)],
            [Paragraph(f"ID: {form.id}", id_style)],
            [Paragraph(f"Créé le: {form.created_at.strftime('%d/%m/%Y %H:%M')}", id_style)],
        ]
        status_table = Table(status_content, colWidths=[130*mm])
        status_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
        ]))
        
        # Combine
        main_data = [[qr_table, status_table]]
        main_table = Table(main_data, colWidths=[50*mm, 130*mm])
        main_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('ALIGN', (1, 0), (1, 0), 'LEFT'),
            ('BOX', (0, 0), (-1, -1), 0.5, HexColor(cls.BORDER_COLOR)),
            ('BACKGROUND', (0, 0), (-1, -1), HexColor('#f9fafb')),
            ('TOPPADDING', (0, 0), (-1, -1), 3*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3*mm),
            ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3*mm),
        ]))
        
        return main_table
    
    @classmethod
    def _build_merchant_section(cls, form):
        """Build merchant information section."""
        from reportlab.platypus import Table, TableStyle, Paragraph
        from reportlab.lib.colors import HexColor
        from reportlab.lib.units import mm
        from reportlab.lib.styles import ParagraphStyle
        
        merchant = form.invoice.merchant
        outlet = form.invoice.outlet
        
        label_style = ParagraphStyle(
            'Label',
            fontSize=8,
            textColor=HexColor(cls.LIGHT_TEXT),
        )
        
        value_style = ParagraphStyle(
            'Value',
            fontSize=10,
            textColor=HexColor(cls.TEXT_COLOR),
            fontName='Helvetica-Bold'
        )
        
        data = [
            [
                [Paragraph("Raison sociale", label_style), Paragraph(merchant.name, value_style)],
                [Paragraph("N° RCCM", label_style), Paragraph(merchant.registration_number or '-', value_style)],
            ],
            [
                [Paragraph("NIF / ID Fiscal", label_style), Paragraph(merchant.tax_id or '-', value_style)],
                [Paragraph("Point de vente", label_style), Paragraph(outlet.name, value_style)],
            ],
            [
                [Paragraph("Adresse", label_style), Paragraph(f"{merchant.address_line1}, {merchant.city}", value_style)],
                [Paragraph("Contact", label_style), Paragraph(merchant.contact_phone or '-', value_style)],
            ],
        ]
        
        table = Table(data, colWidths=[90*mm, 90*mm])
        table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
            ('BOX', (0, 0), (-1, -1), 0.5, HexColor(cls.BORDER_COLOR)),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, HexColor(cls.BORDER_COLOR)),
            ('BACKGROUND', (0, 0), (-1, -1), HexColor('#ffffff')),
        ]))
        
        return table
    
    @classmethod
    def _build_traveler_section(cls, form):
        """Build traveler information section."""
        from reportlab.platypus import Table, TableStyle, Paragraph
        from reportlab.lib.colors import HexColor
        from reportlab.lib.units import mm
        from reportlab.lib.styles import ParagraphStyle
        
        traveler = form.traveler
        
        label_style = ParagraphStyle(
            'Label',
            fontSize=8,
            textColor=HexColor(cls.LIGHT_TEXT),
        )
        
        value_style = ParagraphStyle(
            'Value',
            fontSize=10,
            textColor=HexColor(cls.TEXT_COLOR),
            fontName='Helvetica-Bold'
        )
        
        # Mask passport number for security (show first 2 and last 4)
        passport_display = traveler.passport_number_full
        if passport_display and len(passport_display) > 6:
            passport_display = f"{passport_display[:2]}{'*' * (len(passport_display)-6)}{passport_display[-4:]}"
        elif not passport_display:
            passport_display = f"***{traveler.passport_number_last4}"
        
        # Get country names
        from services.pdf_service import TaxFreePDFService
        nationality_name = cls._get_country_name(traveler.nationality)
        residence_name = cls._get_country_name(traveler.residence_country)
        passport_country_name = cls._get_country_name(traveler.passport_country)
        
        data = [
            [
                [Paragraph("Nom complet", label_style), Paragraph(f"{traveler.first_name} {traveler.last_name}", value_style)],
                [Paragraph("Date de naissance", label_style), Paragraph(traveler.date_of_birth.strftime('%d/%m/%Y') if traveler.date_of_birth else '-', value_style)],
            ],
            [
                [Paragraph("Nationalité", label_style), Paragraph(nationality_name, value_style)],
                [Paragraph("Pays de résidence", label_style), Paragraph(residence_name, value_style)],
            ],
            [
                [Paragraph("N° Passeport", label_style), Paragraph(passport_display, value_style)],
                [Paragraph("Pays d'émission", label_style), Paragraph(passport_country_name, value_style)],
            ],
            [
                [Paragraph("Email", label_style), Paragraph(traveler.email or '-', value_style)],
                [Paragraph("Téléphone", label_style), Paragraph(traveler.phone or '-', value_style)],
            ],
        ]
        
        table = Table(data, colWidths=[90*mm, 90*mm])
        table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
            ('BOX', (0, 0), (-1, -1), 0.5, HexColor(cls.BORDER_COLOR)),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, HexColor(cls.BORDER_COLOR)),
            ('BACKGROUND', (0, 0), (-1, -1), HexColor('#ffffff')),
        ]))
        
        return table
    
    @classmethod
    def _build_products_table(cls, form):
        """Build the products/items table."""
        from reportlab.platypus import Table, TableStyle, Paragraph
        from reportlab.lib.colors import HexColor, white
        from reportlab.lib.units import mm
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT
        
        header_style = ParagraphStyle(
            'TableHeader',
            fontSize=8,
            textColor=white,
            fontName='Helvetica-Bold',
            alignment=TA_CENTER
        )
        
        cell_style = ParagraphStyle(
            'TableCell',
            fontSize=9,
            textColor=HexColor(cls.TEXT_COLOR),
        )
        
        cell_right_style = ParagraphStyle(
            'TableCellRight',
            fontSize=9,
            textColor=HexColor(cls.TEXT_COLOR),
            alignment=TA_RIGHT
        )
        
        cell_center_style = ParagraphStyle(
            'TableCellCenter',
            fontSize=9,
            textColor=HexColor(cls.TEXT_COLOR),
            alignment=TA_CENTER
        )
        
        # Get excluded categories from rule snapshot
        excluded_categories = form.rule_snapshot.get('excluded_categories', []) if form.rule_snapshot else []
        
        # Header row
        data = [[
            Paragraph("Désignation", header_style),
            Paragraph("Catégorie", header_style),
            Paragraph("Qté", header_style),
            Paragraph("Prix unit.", header_style),
            Paragraph("TVA", header_style),
            Paragraph("Total", header_style),
            Paragraph("Élig.", header_style),
        ]]
        
        # Item rows
        for item in form.invoice.items.all():
            is_eligible = item.product_category not in excluded_categories and item.is_eligible
            eligibility_mark = "✓" if is_eligible else "✗"
            eligibility_color = cls.SUCCESS_COLOR if is_eligible else '#dc2626'
            
            elig_style = ParagraphStyle(
                'Elig',
                fontSize=10,
                textColor=HexColor(eligibility_color),
                fontName='Helvetica-Bold',
                alignment=TA_CENTER
            )
            
            data.append([
                Paragraph(item.product_name[:30], cell_style),
                Paragraph(item.product_category, cell_center_style),
                Paragraph(str(int(item.quantity)), cell_center_style),
                Paragraph(f"{item.unit_price:,.0f}", cell_right_style),
                Paragraph(f"{item.vat_amount:,.0f}", cell_right_style),
                Paragraph(f"{item.line_total:,.0f}", cell_right_style),
                Paragraph(eligibility_mark, elig_style),
            ])
        
        col_widths = [50*mm, 30*mm, 15*mm, 25*mm, 22*mm, 25*mm, 13*mm]
        table = Table(data, colWidths=col_widths)
        
        table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), HexColor(cls.PRIMARY_COLOR)),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            # Body
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (2, 1), (2, -1), 'CENTER'),
            ('ALIGN', (3, 1), (5, -1), 'RIGHT'),
            ('ALIGN', (6, 1), (6, -1), 'CENTER'),
            # Grid
            ('BOX', (0, 0), (-1, -1), 0.5, HexColor(cls.BORDER_COLOR)),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, HexColor(cls.BORDER_COLOR)),
            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
            ('LEFTPADDING', (0, 0), (-1, -1), 2*mm),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2*mm),
            # Alternating rows
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#ffffff'), HexColor('#f9fafb')]),
        ]))
        
        return table
    
    @classmethod
    def _build_financial_summary(cls, form):
        """Build the financial summary section."""
        from reportlab.platypus import Table, TableStyle, Paragraph
        from reportlab.lib.colors import HexColor, white
        from reportlab.lib.units import mm
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_RIGHT
        
        label_style = ParagraphStyle(
            'FinLabel',
            fontSize=10,
            textColor=HexColor(cls.TEXT_COLOR),
        )
        
        value_style = ParagraphStyle(
            'FinValue',
            fontSize=10,
            textColor=HexColor(cls.TEXT_COLOR),
            fontName='Helvetica-Bold',
            alignment=TA_RIGHT
        )
        
        total_label_style = ParagraphStyle(
            'TotalLabel',
            fontSize=12,
            textColor=white,
            fontName='Helvetica-Bold',
        )
        
        total_value_style = ParagraphStyle(
            'TotalValue',
            fontSize=14,
            textColor=white,
            fontName='Helvetica-Bold',
            alignment=TA_RIGHT
        )
        
        # Get fee details from rule snapshot
        rule_snapshot = form.rule_snapshot or {}
        fee_percentage = rule_snapshot.get('operator_fee_percentage', 10)
        fee_fixed_raw = rule_snapshot.get('operator_fee_fixed', 0)
        # Convert to float first then int to handle string decimals like '100.00'
        try:
            fee_fixed = int(float(fee_fixed_raw)) if fee_fixed_raw else 0
        except (ValueError, TypeError):
            fee_fixed = 0
        
        currency = form.currency
        
        # Build fee label
        fee_label = f"Frais de service ({fee_percentage}%"
        if fee_fixed > 0:
            fee_label += f" + {fee_fixed:,} fixe"
        fee_label += ")"
        
        data = [
            [Paragraph("Total HT (Montant éligible)", label_style), 
             Paragraph(f"{form.eligible_amount:,.2f} {currency}", value_style)],
            [Paragraph(f"TVA récupérable (16%)", label_style), 
             Paragraph(f"{form.vat_amount:,.2f} {currency}", value_style)],
            [Paragraph(fee_label, label_style), 
             Paragraph(f"-{form.operator_fee:,.2f} {currency}", value_style)],
        ]
        
        # Regular rows
        summary_table = Table(data, colWidths=[120*mm, 60*mm])
        summary_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3*mm),
            ('BOX', (0, 0), (-1, -1), 0.5, HexColor(cls.BORDER_COLOR)),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, HexColor(cls.BORDER_COLOR)),
            ('BACKGROUND', (0, 0), (-1, -1), HexColor('#ffffff')),
        ]))
        
        # Total row (separate for styling)
        total_data = [[
            Paragraph("💰 REMBOURSEMENT NET", total_label_style),
            Paragraph(f"{form.refund_amount:,.2f} {currency}", total_value_style)
        ]]
        
        total_table = Table(total_data, colWidths=[120*mm, 60*mm])
        total_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HexColor(cls.SUCCESS_COLOR)),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4*mm),
            ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3*mm),
        ]))
        
        # Combine tables
        combined_data = [[summary_table], [total_table]]
        combined = Table(combined_data, colWidths=[180*mm])
        combined.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        return combined
    
    @classmethod
    def _build_dates_section(cls, form):
        """Build dates and validity section."""
        from reportlab.platypus import Table, TableStyle, Paragraph
        from reportlab.lib.colors import HexColor
        from reportlab.lib.units import mm
        from reportlab.lib.styles import ParagraphStyle
        
        label_style = ParagraphStyle(
            'Label',
            fontSize=8,
            textColor=HexColor(cls.LIGHT_TEXT),
        )
        
        value_style = ParagraphStyle(
            'Value',
            fontSize=10,
            textColor=HexColor(cls.TEXT_COLOR),
            fontName='Helvetica-Bold'
        )
        
        data = [
            [
                [Paragraph("Date de création", label_style), 
                 Paragraph(form.created_at.strftime('%d/%m/%Y %H:%M'), value_style)],
                [Paragraph("Date d'émission", label_style), 
                 Paragraph(form.issued_at.strftime('%d/%m/%Y %H:%M') if form.issued_at else '-', value_style)],
            ],
            [
                [Paragraph("Date d'expiration", label_style), 
                 Paragraph(form.expires_at.strftime('%d/%m/%Y'), value_style)],
                [Paragraph("Date de validation", label_style), 
                 Paragraph(form.validated_at.strftime('%d/%m/%Y %H:%M') if form.validated_at else '-', value_style)],
            ],
            [
                [Paragraph("N° Facture", label_style), 
                 Paragraph(form.invoice.invoice_number, value_style)],
                [Paragraph("Date Facture", label_style), 
                 Paragraph(form.invoice.invoice_date.strftime('%d/%m/%Y') if form.invoice.invoice_date else '-', value_style)],
            ],
        ]
        
        table = Table(data, colWidths=[90*mm, 90*mm])
        table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
            ('BOX', (0, 0), (-1, -1), 0.5, HexColor(cls.BORDER_COLOR)),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, HexColor(cls.BORDER_COLOR)),
            ('BACKGROUND', (0, 0), (-1, -1), HexColor('#ffffff')),
        ]))
        
        return table
    
    @classmethod
    def _build_signatures_section(cls, form):
        """Build signatures and validation section."""
        from reportlab.platypus import Table, TableStyle, Paragraph
        from reportlab.lib.colors import HexColor
        from reportlab.lib.units import mm
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_CENTER
        
        title_style = ParagraphStyle(
            'SigTitle',
            fontSize=9,
            textColor=HexColor(cls.TEXT_COLOR),
            fontName='Helvetica-Bold',
            alignment=TA_CENTER
        )
        
        line_style = ParagraphStyle(
            'SigLine',
            fontSize=8,
            textColor=HexColor(cls.LIGHT_TEXT),
            alignment=TA_CENTER
        )
        
        # Signature boxes
        sig_data = [
            [
                Paragraph("Signature du commerçant", title_style),
                Paragraph("Signature du voyageur", title_style),
                Paragraph("Cachet de la douane", title_style),
            ],
            [
                Paragraph("<br/><br/><br/>_______________________", line_style),
                Paragraph("<br/><br/><br/>_______________________", line_style),
                Paragraph("<br/><br/><br/>_______________________", line_style),
            ],
            [
                Paragraph("Date: ___/___/______", line_style),
                Paragraph("Date: ___/___/______", line_style),
                Paragraph("Date: ___/___/______", line_style),
            ],
        ]
        
        table = Table(sig_data, colWidths=[60*mm, 60*mm, 60*mm])
        table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 3*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3*mm),
            ('BOX', (0, 0), (-1, -1), 0.5, HexColor(cls.BORDER_COLOR)),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, HexColor(cls.BORDER_COLOR)),
            ('BACKGROUND', (0, 0), (-1, -1), HexColor('#f9fafb')),
        ]))
        
        return table
    
    @classmethod
    def _build_terms_section(cls):
        """Build terms and conditions section."""
        from reportlab.platypus import Table, TableStyle, Paragraph
        from reportlab.lib.colors import HexColor
        from reportlab.lib.units import mm
        from reportlab.lib.styles import ParagraphStyle
        
        title_style = ParagraphStyle(
            'TermsTitle',
            fontSize=9,
            textColor=HexColor(cls.TEXT_COLOR),
            fontName='Helvetica-Bold',
        )
        
        text_style = ParagraphStyle(
            'TermsText',
            fontSize=7,
            textColor=HexColor(cls.LIGHT_TEXT),
            leading=10
        )
        
        terms_text = """
        <b>CONDITIONS GÉNÉRALES:</b><br/>
        1. Ce bordereau est valable uniquement pour les achats effectués en République Démocratique du Congo par des non-résidents.<br/>
        2. Le remboursement de la TVA est soumis à la validation par les services douaniers avant le départ du territoire.<br/>
        3. Les articles doivent être présentés neufs et non utilisés lors du contrôle douanier.<br/>
        4. Ce bordereau expire à la date indiquée ci-dessus. Aucun remboursement ne sera effectué après cette date.<br/>
        5. Les frais de service sont non remboursables.<br/>
        6. En cas de fraude ou de fausse déclaration, des poursuites judiciaires pourront être engagées.<br/>
        7. Le voyageur certifie que les informations fournies sont exactes et complètes.
        """
        
        data = [[Paragraph(terms_text, text_style)]]
        
        table = Table(data, colWidths=[180*mm])
        table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3*mm),
            ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3*mm),
            ('BOX', (0, 0), (-1, -1), 0.5, HexColor(cls.BORDER_COLOR)),
            ('BACKGROUND', (0, 0), (-1, -1), HexColor('#fffbeb')),
        ]))
        
        return table
    
    @classmethod
    def _build_footer(cls, form):
        """Build document footer."""
        from reportlab.platypus import Table, TableStyle, Paragraph
        from reportlab.lib.colors import HexColor
        from reportlab.lib.units import mm
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_CENTER
        
        footer_style = ParagraphStyle(
            'Footer',
            fontSize=8,
            textColor=HexColor(cls.LIGHT_TEXT),
            alignment=TA_CENTER
        )
        
        footer_text = f"""
        {cls.PLATFORM_NAME} - {cls.PLATFORM_TAGLINE}<br/>
        {cls.PLATFORM_ADDRESS} | {cls.PLATFORM_EMAIL} | {cls.PLATFORM_PHONE}<br/>
        Document généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} | © 2026 Tous droits réservés
        """
        
        data = [[Paragraph(footer_text, footer_style)]]
        
        table = Table(data, colWidths=[180*mm])
        table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 3*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3*mm),
            ('LINEABOVE', (0, 0), (-1, 0), 0.5, HexColor(cls.BORDER_COLOR)),
        ]))
        
        return table
    
    @staticmethod
    def _get_country_name(country_code):
        """Get country name from ISO code."""
        countries = {
            'CD': 'RD Congo',
            'CG': 'Congo-Brazzaville',
            'ZA': 'Afrique du Sud',
            'FR': 'France',
            'BE': 'Belgique',
            'US': 'États-Unis',
            'GB': 'Royaume-Uni',
            'DE': 'Allemagne',
            'CN': 'Chine',
            'IN': 'Inde',
            'NG': 'Nigeria',
            'KE': 'Kenya',
            'TZ': 'Tanzanie',
            'UG': 'Ouganda',
            'RW': 'Rwanda',
            'BI': 'Burundi',
            'AO': 'Angola',
            'ZM': 'Zambie',
            'AF': 'Afghanistan',
        }
        return countries.get(country_code, country_code)
