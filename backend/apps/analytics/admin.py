"""
Analytics Django Admin Configuration

Since analytics is computed data, we don't register models here.
Analytics are accessed via API endpoints only.
"""
from django.contrib import admin

# No models to register - analytics is read-only computed data
