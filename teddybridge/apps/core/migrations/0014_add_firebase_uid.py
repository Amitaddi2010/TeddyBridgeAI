# Generated manually
from django.db import migrations, models
from django.db import connection


def add_firebase_uid_safely(apps, schema_editor):
    """Add firebase_uid column only if it doesn't exist"""
    db_table = 'users'
    column_name = 'firebase_uid'
    
    with connection.cursor() as cursor:
        # Check if column exists (SQLite-specific)
        if 'sqlite' in connection.vendor:
            cursor.execute(f"PRAGMA table_info({db_table})")
            columns = [row[1] for row in cursor.fetchall()]
            if column_name not in columns:
                cursor.execute(f"ALTER TABLE {db_table} ADD COLUMN {column_name} VARCHAR(255) NULL")
        else:
            # PostgreSQL/other databases
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='{db_table}' AND column_name='{column_name}'
            """)
            if not cursor.fetchone():
                cursor.execute(f"""
                    ALTER TABLE {db_table} 
                    ADD COLUMN {column_name} VARCHAR(255) NULL
                """)


def remove_firebase_uid_safely(apps, schema_editor):
    """Remove firebase_uid column if it exists (reverse migration)"""
    db_table = 'users'
    column_name = 'firebase_uid'
    
    with connection.cursor() as cursor:
        if 'sqlite' in connection.vendor:
            # SQLite doesn't support DROP COLUMN directly
            # This is a simplified reverse - in production, you'd need to recreate the table
            pass
        else:
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='{db_table}' AND column_name='{column_name}'
            """)
            if cursor.fetchone():
                cursor.execute(f"ALTER TABLE {db_table} DROP COLUMN {column_name}")


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_doctor_city_patient_age_patient_connect_to_peers_and_more'),
    ]

    operations = [
        migrations.RunPython(add_firebase_uid_safely, remove_firebase_uid_safely),
    ]

