"""
Management command to seed initial data.
"""
from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from apps.accounts.models import User, UserRole
from apps.merchants.models import Merchant, Outlet, POSDevice, MerchantStatus
from apps.customs.models import PointOfExit
from apps.rules.models import RuleSet, RiskRule
from apps.notifications.models import NotificationTemplate


class Command(BaseCommand):
    help = 'Seed initial data for the Tax Free system'

    def handle(self, *args, **options):
        self.stdout.write('Seeding data...')
        
        with transaction.atomic():
            self.create_users()
            self.create_points_of_exit()
            self.create_merchant()
            self.create_ruleset()
            self.create_notification_templates()
        
        self.stdout.write(self.style.SUCCESS('Data seeded successfully!'))

    def create_users(self):
        self.stdout.write('Creating users...')
        
        # Admin user (Super Admin)
        admin, created = User.objects.get_or_create(
            email='admin@taxfree.cd',
            defaults={
                'first_name': 'Admin',
                'last_name': 'System',
                'role': UserRole.ADMIN,
                'is_staff': True,
                'is_superuser': True,
                'is_super_admin': True,  # Mark as super admin
            }
        )
        if created:
            admin.set_password('admin123')
            admin.save()
            self.stdout.write(f'  Created admin: {admin.email}')
        elif not admin.is_super_admin:
            # Ensure existing admin is marked as super admin
            admin.is_super_admin = True
            admin.save()
            self.stdout.write(f'  Updated admin to super admin: {admin.email}')
        
        # Customs agent
        customs, created = User.objects.get_or_create(
            email='customs@dgda.cd',
            defaults={
                'first_name': 'Agent',
                'last_name': 'Douane',
                'role': UserRole.CUSTOMS_AGENT,
            }
        )
        if created:
            customs.set_password('customs123')
            customs.save()
            self.stdout.write(f'  Created customs agent: {customs.email}')
        
        # Operator
        operator, created = User.objects.get_or_create(
            email='operator@taxfree.cd',
            defaults={
                'first_name': 'Marie',
                'last_name': 'Opérateur',
                'role': UserRole.OPERATOR,
            }
        )
        if created:
            operator.set_password('operator123')
            operator.save()
            self.stdout.write(f'  Created operator: {operator.email}')
        
        # Auditor
        auditor, created = User.objects.get_or_create(
            email='auditor@dgi.cd',
            defaults={
                'first_name': 'Pierre',
                'last_name': 'Auditeur',
                'role': UserRole.AUDITOR,
            }
        )
        if created:
            auditor.set_password('auditor123')
            auditor.save()
            self.stdout.write(f'  Created auditor: {auditor.email}')

    def create_points_of_exit(self):
        self.stdout.write('Creating points of exit...')
        
        points = [
            {
                'code': 'FIH',
                'name': 'Aéroport International de Ndjili',
                'type': 'AIRPORT',
                'city': 'Kinshasa',
                'province': 'Kinshasa'
            },
            {
                'code': 'FBM',
                'name': 'Aéroport de Lubumbashi',
                'type': 'AIRPORT',
                'city': 'Lubumbashi',
                'province': 'Haut-Katanga'
            },
            {
                'code': 'KASUMBALESA',
                'name': 'Poste Frontalier de Kasumbalesa',
                'type': 'BORDER',
                'city': 'Kasumbalesa',
                'province': 'Haut-Katanga'
            },
            {
                'code': 'MATADI',
                'name': 'Port de Matadi',
                'type': 'PORT',
                'city': 'Matadi',
                'province': 'Kongo-Central'
            },
        ]
        
        for point_data in points:
            point, created = PointOfExit.objects.get_or_create(
                code=point_data['code'],
                defaults=point_data
            )
            if created:
                self.stdout.write(f'  Created point of exit: {point.name}')
        
        # Assign point of exit to customs agent
        try:
            customs = User.objects.get(email='customs@dgda.cd')
            fih = PointOfExit.objects.get(code='FIH')
            customs.point_of_exit_id = fih.id
            customs.save()
        except (User.DoesNotExist, PointOfExit.DoesNotExist):
            pass

    def create_merchant(self):
        self.stdout.write('Creating merchant...')
        
        merchant, created = Merchant.objects.get_or_create(
            registration_number='RC-KIN-2024-001',
            defaults={
                'name': 'Boutique Luxe Kinshasa',
                'trade_name': 'Luxe KIN',
                'tax_id': 'NIF-2024-001234',
                'vat_number': 'TVA-CD-001234',
                'address_line1': '123 Avenue du Commerce',
                'city': 'Kinshasa',
                'province': 'Kinshasa',
                'country': 'CD',
                'contact_name': 'Jean-Pierre Mukendi',
                'contact_email': 'contact@luxekin.cd',
                'contact_phone': '+243812345678',
                'bank_name': 'Rawbank',
                'bank_account_number': '00012345678901',
                'mobile_money_number': '+243812345678',
                'mobile_money_provider': 'M-Pesa',
                'status': MerchantStatus.APPROVED,
                'approved_at': timezone.now(),
            }
        )
        
        if created:
            self.stdout.write(f'  Created merchant: {merchant.name}')
            
            # Create outlet
            outlet = Outlet.objects.create(
                merchant=merchant,
                name='Magasin Principal',
                code='MAIN-001',
                address_line1='123 Avenue du Commerce',
                city='Kinshasa',
                province='Kinshasa',
                phone='+243812345678',
                email='main@luxekin.cd'
            )
            self.stdout.write(f'  Created outlet: {outlet.name}')
            
            # Create POS device
            pos = POSDevice.objects.create(
                outlet=outlet,
                name='Caisse 1',
                device_id='POS-MAIN-001'
            )
            self.stdout.write(f'  Created POS device: {pos.name} (API Key: {pos.api_key[:16]}...)')
            
            # Create merchant user
            merchant_user, created = User.objects.get_or_create(
                email='merchant@luxekin.cd',
                defaults={
                    'first_name': 'Jean-Pierre',
                    'last_name': 'Mukendi',
                    'role': UserRole.MERCHANT,
                    'merchant_id': merchant.id,
                }
            )
            if created:
                merchant_user.set_password('merchant123')
                merchant_user.save()
                self.stdout.write(f'  Created merchant user: {merchant_user.email}')

    def create_ruleset(self):
        self.stdout.write('Creating ruleset...')
        
        # Deactivate existing rulesets
        RuleSet.objects.filter(is_active=True).update(is_active=False)
        
        ruleset, created = RuleSet.objects.get_or_create(
            version='1.0.0',
            defaults={
                'name': 'Règles Tax Free RDC - Version Initiale',
                'description': 'Configuration initiale du système Tax Free pour la RDC',
                'min_purchase_amount': Decimal('50000.00'),  # 50,000 CDF minimum
                'min_age': 16,
                'purchase_window_days': 3,
                'exit_deadline_months': 3,
                'eligible_residence_countries': [],  # All except excluded
                'excluded_residence_countries': ['CD'],  # Residents of DRC not eligible
                'excluded_categories': ['SERVICES', 'FOOD', 'TOBACCO'],
                'vat_rates': {
                    'GENERAL': '16.00',
                    'ELECTRONICS': '16.00',
                    'CLOTHING': '16.00',
                    'JEWELRY': '16.00',
                    'COSMETICS': '16.00',
                    'FOOD': '0.00',
                    'ALCOHOL': '16.00',
                },
                'default_vat_rate': Decimal('16.00'),
                'operator_fee_percentage': Decimal('15.00'),
                'operator_fee_fixed': Decimal('0.00'),
                'min_operator_fee': Decimal('5000.00'),  # Minimum 5,000 CDF fee
                'allowed_refund_methods': ['CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CASH'],
                'risk_score_threshold': 70,
                'high_value_threshold': Decimal('500000.00'),  # 500,000 CDF
                'is_active': True,
                'activated_at': timezone.now(),
            }
        )
        
        if created:
            self.stdout.write(f'  Created ruleset: {ruleset.name}')
            
            # Create risk rules
            risk_rules = [
                {
                    'name': 'High Value Transaction',
                    'description': 'Transactions above 1,000,000 CDF',
                    'field': 'amount',
                    'operator': 'greater_than',
                    'value': 1000000,
                    'score_impact': 25
                },
                {
                    'name': 'Multiple Items',
                    'description': 'More than 10 items in single transaction',
                    'field': 'items_count',
                    'operator': 'greater_than',
                    'value': 10,
                    'score_impact': 15
                },
            ]
            
            for rule_data in risk_rules:
                RiskRule.objects.create(ruleset=ruleset, **rule_data)
                self.stdout.write(f'  Created risk rule: {rule_data["name"]}')

    def create_notification_templates(self):
        self.stdout.write('Creating notification templates...')
        
        templates = [
            {
                'code': 'FORM_CREATED',
                'name': 'Tax Free Form Created',
                'email_subject': 'Votre bordereau Tax Free {form_number}',
                'email_body': '''Bonjour {traveler_name},

Votre bordereau Tax Free a été créé avec succès.

Numéro: {form_number}
Montant remboursable: {refund_amount} {currency}
Date d'expiration: {expires_at}

Présentez ce bordereau à la douane lors de votre sortie du territoire.

Cordialement,
L'équipe Tax Free RDC''',
                'sms_body': 'Tax Free: Bordereau {form_number} créé. Montant: {refund_amount} {currency}. Expire: {expires_at}',
            },
            {
                'code': 'FORM_VALIDATED',
                'name': 'Tax Free Form Validated',
                'email_subject': 'Bordereau Tax Free {form_number} validé',
                'email_body': '''Bonjour {traveler_name},

Votre bordereau Tax Free {form_number} a été validé par la douane.

Votre remboursement de {refund_amount} {currency} sera traité prochainement.

Cordialement,
L'équipe Tax Free RDC''',
                'sms_body': 'Tax Free: Bordereau {form_number} validé. Remboursement de {refund_amount} {currency} en cours.',
            },
            {
                'code': 'REFUND_PAID',
                'name': 'Refund Paid',
                'email_subject': 'Remboursement Tax Free effectué',
                'email_body': '''Bonjour {traveler_name},

Votre remboursement Tax Free a été effectué avec succès.

Bordereau: {form_number}
Montant: {refund_amount} {currency}
Méthode: {refund_method}

Merci d'avoir utilisé notre service.

Cordialement,
L'équipe Tax Free RDC''',
                'sms_body': 'Tax Free: Remboursement {form_number} effectué. Montant: {refund_amount} {currency}.',
            },
        ]
        
        for template_data in templates:
            template, created = NotificationTemplate.objects.get_or_create(
                code=template_data['code'],
                defaults=template_data
            )
            if created:
                self.stdout.write(f'  Created template: {template.name}')
