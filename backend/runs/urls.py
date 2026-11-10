from django.urls import path

from . import public_views, views

urlpatterns = [
    path("runs/start/", views.StartRunView.as_view(), name="run-start"),
    path("runs/<uuid:run_id>/finish/", views.FinishRunView.as_view(), name="run-finish"),
    path("me/runs/", views.MyRunsView.as_view(), name="my-runs"),
    path("me/bests/", views.MyBestsView.as_view(), name="my-bests"),
    path("leaderboard/", public_views.LeaderboardView.as_view(), name="leaderboard"),
    path("leaderboard/trend/", public_views.TrendView.as_view(), name="leaderboard-trend"),
    path("players/recent/", public_views.RecentPlayersView.as_view(), name="recent-players"),
]
