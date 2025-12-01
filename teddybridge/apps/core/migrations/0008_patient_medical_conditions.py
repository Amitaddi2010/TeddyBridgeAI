# Generated migration for medical conditions

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_merge_0006_alter_meeting_status_0006_peer_features'),
    ]

    operations = [
        migrations.AddField(
            model_name='patient',
            name='medical_conditions',
            field=models.JSONField(blank=True, help_text='List of medical conditions/issues', null=True),
        ),
    ]
