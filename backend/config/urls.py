from django.contrib import admin
from django.db import DatabaseError, connection
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    """Liveness probe: the process is up. Does not touch the database."""
    return JsonResponse({"status": "ok"})


def ready(_request):
    """Readiness probe: the process can reach its database.

    Load balancers should use this one to decide whether to send traffic.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        return JsonResponse({"status": "unavailable", "database": "down"}, status=503)
    return JsonResponse({"status": "ok", "database": "up"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
    path("api/v1/health/ready/", ready, name="ready"),
    path("api/v1/", include("accounts.urls")),
]
