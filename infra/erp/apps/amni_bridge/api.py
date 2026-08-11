import base64
import hashlib
import hmac
import json
import os
import time
from urllib.parse import urlparse

import frappe
from frappe import _
from frappe.auth import LoginManager
from frappe.exceptions import AuthenticationError

# ---------------------------------------------------------------------------
# Amni HRMS SSO bridge.
#
# Flow (see DEVELOPMENT.md "HRMS (Frappe HR) section"):
#   1. The Amni API signs a short-lived JWT with the platform HRMS_SSO_SECRET.
#   2. The browser loads this endpoint (inside the Amni /hrms iframe).
#   3. We verify the token, make sure it was minted for THIS site, and start a
#      Frappe session for the matching User (auto-creating a desk user if the
#      platform invited them but provisioning hasn't created the User yet).
#   4. We redirect to the HRMS desk (/app/hrms), which now runs as that user.
#
# The JWT must match what `apps/api` mints with jsonwebtoken:
#   header  = { alg: "HS256", typ: "JWT" }
#   payload = { sub: <user email>, aud: <tenant siteUrl>, iss: "amni-hrms",
#               iat, exp, jti: <nonce> }
# Verified purely with the standard library (no PyJWT dependency on the bench).
# ---------------------------------------------------------------------------


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _sso_secret() -> str:
    return frappe.conf.get("amni_sso_secret") or os.environ.get("AMNI_SSO_SECRET") or ""


def _host_of(url: str) -> str:
    parsed = urlparse(url)
    return (parsed.netloc or url).split(":")[0].lower()


def _verify_token(token: str) -> dict | None:
    parts = token.split(".")
    if len(parts) != 3:
        return None

    secret = _sso_secret()
    if not secret:
        return None

    header, payload, signature = parts
    expected = hmac.new(secret.encode("utf-8"), f"{header}.{payload}".encode("utf-8"), hashlib.sha256).digest()
    try:
        supplied = _b64url_decode(signature)
    except (ValueError, TypeError):
        return None
    if not hmac.compare_digest(expected, supplied):
        return None

    try:
        claims = json.loads(_b64url_decode(payload))
    except (ValueError, TypeError, json.JSONDecodeError):
        return None

    if not isinstance(claims, dict):
        return None
    if claims.get("iss") != "amni-hrms":
        return None
    if int(claims.get("exp", 0) or 0) < int(time.time()):
        return None
    return claims


def _request_host() -> str:
    request = getattr(frappe.local, "request", None)
    return getattr(request, "host", "") or ""


def _desk_user(email: str) -> str:
    existing = frappe.db.get_value("User", {"email": email}, "name")
    if existing:
        return existing

    user = frappe.get_doc(
        {
            "doctype": "User",
            "email": email,
            "first_name": email.split("@")[0],
            "send_welcome_email": 0,
            "roles": [
                {"role": "Desk User"},
                {"role": "Employee"},
            ],
        }
    )
    user.insert(ignore_permissions=True, ignore_mandatory=True)
    return user.name


@frappe.whitelist(allow_guest=True)
def login(token, redirect_to="/app/hrms"):
    """Exchange an Amni-signed JWT for a desk session on THIS site."""
    claims = _verify_token(token)
    if not claims:
        frappe.throw(_("This sign-in link is invalid or has expired. Open HRMS again from the Amni platform."), AuthenticationError)

    email = (claims.get("sub") or "").strip().lower()
    if not email or "@" not in email:
        frappe.throw(_("Sign-in link is missing a user."), AuthenticationError)

    aud = claims.get("aud") or ""
    requested_host = _host_of(aud)
    actual_host = _host_of(_request_host()) or frappe.local.site
    if requested_host and actual_host and requested_host != actual_host:
        # A token minted for tenant A must never log a user into tenant B.
        frappe.throw(_("Sign-in link was issued for a different workspace."), AuthenticationError)

    if not isinstance(redirect_to, str) or not redirect_to.startswith("/") or redirect_to.startswith("//"):
        redirect_to = "/app/hrms"

    user = _desk_user(email)
    frappe.local.login_manager = LoginManager()
    frappe.local.login_manager.login_as(user)

    frappe.local.response["type"] = "redirect"
    frappe.local.response["location"] = redirect_to
