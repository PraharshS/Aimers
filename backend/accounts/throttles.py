from rest_framework.throttling import SimpleRateThrottle


class LoginIdentifierThrottle(SimpleRateThrottle):
    """Limits login attempts per account name, whatever IP they come from.

    The per-IP scope stops one machine; this one stops a spread-out guessing
    attack against a single account. Trade-off: someone can briefly lock a
    victim out by hammering their name, so the window is short (see settings).
    """

    scope = "login_identifier"

    def get_cache_key(self, request, view):
        identifier = request.data.get("identifier") if hasattr(request.data, "get") else None
        if not identifier or not isinstance(identifier, str):
            return None
        return self.cache_format % {"scope": self.scope, "ident": identifier.strip().lower()}
