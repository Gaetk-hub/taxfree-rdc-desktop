"""
Migration for system user permissions and invitations.
"""
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_add_agent_code'),
    ]

    operations = [
        migrations.CreateModel(
            name='PermissionPreset',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('description', models.TextField(blank=True)),
                ('permissions', models.JSONField(default=list, help_text='Liste des permissions: [{"module": "...", "action": "..."}]')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'preset de permissions',
                'verbose_name_plural': 'presets de permissions',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='UserPermission',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('module', models.CharField(choices=[
                    ('DASHBOARD', 'Tableau de bord'),
                    ('MERCHANTS', 'Commerçants'),
                    ('USERS', 'Utilisateurs'),
                    ('FORMS', 'Bordereaux'),
                    ('REFUNDS', 'Remboursements'),
                    ('BORDERS', 'Frontières'),
                    ('AGENTS', 'Agents douaniers'),
                    ('RULES', 'Règles TVA'),
                    ('CATEGORIES', 'Catégories'),
                    ('AUDIT', 'Audit'),
                    ('REPORTS', 'Rapports'),
                    ('SETTINGS', 'Paramètres'),
                    ('PERMISSIONS', 'Permissions'),
                ], max_length=30)),
                ('action', models.CharField(choices=[
                    ('VIEW', 'Consulter'),
                    ('CREATE', 'Créer'),
                    ('EDIT', 'Modifier'),
                    ('DELETE', 'Supprimer'),
                    ('EXPORT', 'Exporter'),
                    ('APPROVE', 'Approuver'),
                    ('MANAGE', 'Gérer'),
                ], max_length=20)),
                ('granted_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='custom_permissions', to='accounts.user')),
                ('granted_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='granted_permissions', to='accounts.user')),
            ],
            options={
                'verbose_name': 'permission utilisateur',
                'verbose_name_plural': 'permissions utilisateurs',
                'ordering': ['module', 'action'],
                'unique_together': {('user', 'module', 'action')},
            },
        ),
        migrations.CreateModel(
            name='SystemUserInvitation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('email', models.EmailField(max_length=254)),
                ('first_name', models.CharField(max_length=150)),
                ('last_name', models.CharField(max_length=150)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('role', models.CharField(choices=[
                    ('ADMIN', 'Administrateur'),
                    ('AUDITOR', 'Auditeur'),
                    ('OPERATOR', 'Opérateur'),
                ], max_length=20)),
                ('initial_permissions', models.JSONField(default=list, help_text='Permissions initiales: [{"module": "...", "action": "..."}]')),
                ('message', models.TextField(blank=True, help_text="Message personnalisé inclus dans l'email d'invitation")),
                ('invitation_token', models.CharField(max_length=100, unique=True)),
                ('status', models.CharField(choices=[
                    ('PENDING', 'En attente'),
                    ('ACCEPTED', 'Acceptée'),
                    ('EXPIRED', 'Expirée'),
                    ('CANCELLED', 'Annulée'),
                ], default='PENDING', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('activated_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='system_invitation', to='accounts.user')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_system_invitations', to='accounts.user')),
                ('permission_preset', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='invitations', to='accounts.permissionpreset')),
            ],
            options={
                'verbose_name': 'invitation utilisateur système',
                'verbose_name_plural': 'invitations utilisateurs système',
                'ordering': ['-created_at'],
            },
        ),
    ]
