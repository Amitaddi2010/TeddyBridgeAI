release: python manage.py migrate && python manage.py init_superuser
web: gunicorn teddybridge.wsgi:application --bind 0.0.0.0:$PORT

