from django.contrib import admin
from django.http import JsonResponse
from django.urls import path


def health(_request):
    """Liveness probe used by load balancers and CI."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
]
