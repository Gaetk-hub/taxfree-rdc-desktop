"""
Development settings for Tax Free project.
"""
from .base import *

DEBUG = True

ALLOWED_HOSTS = ['*']

# Database - Use local PostgreSQL with current user
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'taxfree_db'),
        'USER': os.getenv('DB_USER', 'gaetankule'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# CORS - Allow all in development
CORS_ALLOW_ALL_ORIGINS = True

# Email backend for development - MailHog
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
EMAIL_USE_TLS = False
EMAIL_USE_SSL = False
DEFAULT_FROM_EMAIL = 'noreply@taxfree-rdc.cd'

# OTP Settings
OTP_EXPIRY_MINUTES = 5
OTP_LENGTH = 6

# Frontend URL for activation links
FRONTEND_URL = 'http://localhost:5173'

# Disable throttling in development
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '10000/hour',
    'user': '100000/hour',
}

# Create logs directory if it doesn't exist
import os
logs_dir = BASE_DIR / 'logs'
if not os.path.exists(logs_dir):
    os.makedirs(logs_dir)
