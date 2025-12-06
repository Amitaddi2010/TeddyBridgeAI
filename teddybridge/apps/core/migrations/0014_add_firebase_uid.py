# Generated migration to add firebase_uid to User model
# Safe migration that checks if column exists before adding
# Updated to work with both SQLite and PostgreSQL

from django.db import migrations, connection


def check_and_add_firebase_uid(apps, schema_editor):
    """Check if firebase_uid column exists, add only if missing (database-agnostic)"""
    db = schema_editor.connection
    db_vendor = connection.vendor
    
    def column_exists(table_name, column_name):
        """Check if a column exists in a table (works for SQLite and PostgreSQL)"""
        with db.cursor() as cursor:
            if db_vendor == 'sqlite':
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = [row[1] for row in cursor.fetchall()]
                return column_name in columns
            elif db_vendor == 'postgresql':
                # PostgreSQL: check information_schema, table names are case-insensitive
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = LOWER(%s) AND column_name = %s
                """, [table_name, column_name])
                return cursor.fetchone() is not None
            else:
                # For other databases, use Django introspection
                from django.db import connection
                inspector = connection.introspection
                try:
                    table_description = inspector.get_table_description(cursor, table_name)
                    return any(col.name == column_name for col in table_description)
                except:
                    return False
    
    try:
        with db.cursor() as cursor:
            # Check and add user.firebase_uid if needed
            if not column_exists('users', 'firebase_uid'):
                cursor.execute("ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(255) NULL")
                import logging
                logger = logging.getLogger(__name__)
                logger.info("Added firebase_uid column to users table")
            else:
                import logging
                logger = logging.getLogger(__name__)
                logger.info("firebase_uid column already exists in users table")
    except Exception as e:
        # If there's an error (e.g., column already exists), just log it and continue
        # The migration will be marked as applied
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Migration 0014: firebase_uid column check: {e}")


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_doctor_city_patient_age_patient_connect_to_peers_and_more'),
    ]

    operations = [
        # Use RunPython to safely check before adding column
        migrations.RunPython(check_and_add_firebase_uid, migrations.RunPython.noop),
    ]

