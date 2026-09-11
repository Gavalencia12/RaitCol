from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_user_credential_udc_img'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='credential_udc_base64',
            field=models.TextField(blank=True, db_column='credential_udc_base64', null=True),
        ),
    ]
