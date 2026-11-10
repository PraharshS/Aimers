import uuid

from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.functions import Lower


class User(AbstractUser):
    """Player account.

    UUID primary key so ids are not guessable or enumerable in public URLs.
    Email and username are unique case-insensitively (enforced in the database).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField("email address")

    # Player settings used to scale mouse sensitivity in the game.
    dpi = models.PositiveIntegerField(
        default=800, validators=[MinValueValidator(100), MaxValueValidator(32000)]
    )
    valorant_sens = models.FloatField(
        default=0.5, validators=[MinValueValidator(0.001), MaxValueValidator(10)]
    )
    avatar_url = models.URLField(max_length=500, blank=True)

    REQUIRED_FIELDS = ["email"]

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("email"), name="accounts_user_email_ci_unique"),
            models.UniqueConstraint(Lower("username"), name="accounts_user_username_ci_unique"),
        ]

    def save(self, *args, **kwargs):
        self.email = (self.email or "").strip().lower()
        super().save(*args, **kwargs)
