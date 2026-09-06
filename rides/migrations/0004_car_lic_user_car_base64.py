from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rides', '0003_alter_car_lic_user_car_v'),
    ]

    operations = [
        migrations.AddField(
            model_name='car',
            name='lic_user_car_base64',
            field=models.TextField(blank=True, db_column='lic_user_car_base64', null=True),
        ),
    ]
