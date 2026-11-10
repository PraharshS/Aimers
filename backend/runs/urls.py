from django.urls import path

from . import views

urlpatterns = [
    path("runs/start/", views.StartRunView.as_view(), name="run-start"),
    path("runs/<uuid:run_id>/finish/", views.FinishRunView.as_view(), name="run-finish"),
    path("me/runs/", views.MyRunsView.as_view(), name="my-runs"),
    path("me/bests/", views.MyBestsView.as_view(), name="my-bests"),
]
