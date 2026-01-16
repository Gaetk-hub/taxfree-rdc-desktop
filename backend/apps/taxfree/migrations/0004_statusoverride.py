# Generated migration for StatusOverride model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('taxfree', '0003_add_passport_number_full'),
    ]

    operations = [
        migrations.CreateModel(
            name='StatusOverride',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('override_type', models.CharField(choices=[('STATUS_CORRECTION', 'Correction de statut'), ('VALIDATION_REVERSAL', 'Annulation de validation'), ('REFUND_CORRECTION', 'Correction de remboursement'), ('REOPEN_FORM', 'Réouverture du bordereau')], default='STATUS_CORRECTION', max_length=30)),
                ('previous_status', models.CharField(max_length=30)),
                ('new_status', models.CharField(max_length=30)),
                ('original_validation_decision', models.CharField(blank=True, max_length=30)),
                ('original_validation_agent_id', models.UUIDField(blank=True, null=True)),
                ('original_validation_agent_name', models.CharField(blank=True, max_length=255)),
                ('original_validation_date', models.DateTimeField(blank=True, null=True)),
                ('original_validation_point_of_exit', models.CharField(blank=True, max_length=255)),
                ('reason', models.TextField(help_text='Explication détaillée de la raison de cette correction', verbose_name='Raison de la correction')),
                ('reference_document', models.CharField(blank=True, help_text='Numéro de ticket, email, ou autre référence', max_length=255, verbose_name='Référence document')),
                ('requesting_agent_id', models.UUIDField(blank=True, null=True)),
                ('requesting_agent_name', models.CharField(blank=True, max_length=255)),
                ('requesting_agent_email', models.CharField(blank=True, max_length=255)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.CharField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('notifications_sent', models.JSONField(default=list)),
                ('form', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='status_overrides', to='taxfree.taxfreeform')),
                ('performed_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='performed_overrides', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'status override',
                'verbose_name_plural': 'status overrides',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='statusoverride',
            index=models.Index(fields=['form', 'created_at'], name='taxfree_sta_form_id_a1b2c3_idx'),
        ),
        migrations.AddIndex(
            model_name='statusoverride',
            index=models.Index(fields=['performed_by', 'created_at'], name='taxfree_sta_perform_d4e5f6_idx'),
        ),
    ]
