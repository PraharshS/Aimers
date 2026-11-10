from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class PlayerAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Player settings", {"fields": ("dpi", "valorant_sens", "avatar_url")}),
    )
    list_display = ("username", "email", "is_staff", "date_joined")
    search_fields = ("username", "email")
