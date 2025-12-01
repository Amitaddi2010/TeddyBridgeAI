from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'teddybridge.apps.core'
    
    def ready(self):
        # Start background tasks when Django starts
        from .background_tasks import start_background_tasks
        import os
        # Only run in main process, not in reloader
        if os.environ.get('RUN_MAIN') == 'true':
            start_background_tasks()
