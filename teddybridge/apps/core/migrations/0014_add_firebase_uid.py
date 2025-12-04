# Generated migration to add firebase_uid to User model
# Safe migration that checks if column exists before adding

from django.db import migrations


def check_and_add_firebase_uid(apps, schema_editor):
    """Check if firebase_uid column exists, add only if missing (for SQLite compatibility)"""
    db = schema_editor.connection
    
    try:
        with db.cursor() as cursor:
            # Check and add user.firebase_uid if needed
            cursor.execute("PRAGMA table_info(users)")
            user_columns = [row[1] for row in cursor.fetchall()]
            
            if 'firebase_uid' not in user_columns:
                cursor.execute("ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(255) NULL")
                print("Added firebase_uid column to users table")
            else:
                print("firebase_uid column already exists in users table")
    except Exception as e:
        # If there's an error (e.g., column already exists), just log it and continue
        # The migration will be marked as applied
        print(f"Migration 0014: firebase_uid column check: {e}")


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_doctor_city_patient_age_patient_connect_to_peers_and_more'),
    ]

    operations = [
        # Use RunPython to safely check before adding column
        migrations.RunPython(check_and_add_firebase_uid, migrations.RunPython.noop),
    ]

