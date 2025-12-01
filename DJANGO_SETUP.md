# Django Backend Setup Guide

## 1. Create Directory Structure

Run these commands in PowerShell or Command Prompt:

```powershell
mkdir teleclinic
mkdir teleclinic\apps
mkdir teleclinic\apps\core
mkdir teleclinic\apps\doctors
mkdir teleclinic\apps\patients
mkdir teleclinic\apps\meetings
```

## 2. Install Dependencies

```bash
pip install -r requirements.txt
```

## 3. Create Django Files

After creating directories, create the following files with the content provided in the repository.

## 4. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

## 5. Create Superuser

```bash
python manage.py createsuperuser
```

## 6. Run Server

```bash
python manage.py runserver 0.0.0.0:8000
```

## 7. Update Frontend API URL

Update the frontend to point to Django backend at `http://localhost:8000/api/`
