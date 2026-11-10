from django.contrib import admin

from .models import Run


@admin.register(Run)
class RunAdmin(admin.ModelAdmin):
    list_display = ("user", "task_id", "score", "hits", "misses", "status", "flagged", "finished_at")
    list_filter = ("status", "flagged", "task_id")
    search_fields = ("user__username", "task_id", "task_name")
    readonly_fields = ("config",)
