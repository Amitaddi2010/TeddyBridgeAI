# Generated migration for survey assigned patients

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_social_posts'),
    ]

    operations = [
        migrations.AddField(
            model_name='survey',
            name='assigned_patients',
            field=models.JSONField(blank=True, help_text='List of patient IDs', null=True),
        ),
    ]
