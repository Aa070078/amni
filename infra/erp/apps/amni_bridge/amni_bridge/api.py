import base64
import hashlib
import hmac
import json
import os
import time
from datetime import date
from urllib.parse import urlparse

import frappe
from frappe import _
from frappe.auth import LoginManager
from frappe.exceptions import AuthenticationError

INTEGRATION_ROLES = (
    "Accounts User",
    "Accounts Manager",
    "Purchase User",
    "Purchase Manager",
    "Sales User",
    "Sales Manager",
    "Stock User",
    "Stock Manager",
)

CRM_RECORD_FIELDS = (
    "name",
    "record_type",
    "record_code",
    "title",
    "email",
    "status",
    "category",
    "state_group",
    "assigned_to",
    "reference_type",
    "reference_code",
    "event_at",
    "numeric_value",
    "payload",
    "creation",
    "modified",
)

CRM_FILTER_FIELDS = {
    "status",
    "category",
    "state_group",
    "assigned_to",
    "reference_type",
    "reference_code",
    "email",
}

CRM_ORDER_FIELDS = {
    "record_code",
    "title",
    "email",
    "status",
    "category",
    "assigned_to",
    "event_at",
    "numeric_value",
    "creation",
    "modified",
}


@frappe.whitelist()
def list_crm_records(
    record_type: str,
    filters: dict | str | None = None,
    q: str | None = None,
    order_by: str = "modified desc",
    start: int = 0,
    page_length: int = 20,
) -> dict:
    """Return one bounded page of tenant-local CRM records plus an exact count."""
    normalized_type = (record_type or "").strip()
    if not normalized_type:
        frappe.throw(_("CRM record type is required."))

    parsed_filters = frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    if not isinstance(parsed_filters, dict):
        frappe.throw(_("CRM filters must be an object."))

    db_filters: list = [["record_type", "=", normalized_type]]
    for field, value in parsed_filters.items():
        if field not in CRM_FILTER_FIELDS:
            frappe.throw(_("Unsupported CRM filter: {0}").format(field))
        if value is not None and value != "":
            db_filters.append([field, "=", value])

    term = (q or "").strip()
    if term:
        db_filters.append(["search_text", "like", f"%{term[:120]}%"])

    parts = (order_by or "modified desc").strip().split()
    order_field = parts[0] if parts else "modified"
    order_direction = parts[1].lower() if len(parts) > 1 else "desc"
    if order_field not in CRM_ORDER_FIELDS or order_direction not in {"asc", "desc"}:
        frappe.throw(_("Unsupported CRM ordering."))

    bounded_start = max(0, int(start or 0))
    bounded_length = min(100, max(1, int(page_length or 20)))
    items = frappe.get_all(
        "Amni CRM Record",
        filters=db_filters,
        fields=list(CRM_RECORD_FIELDS),
        order_by=f"{order_field} {order_direction}",
        start=bounded_start,
        page_length=bounded_length,
    )
    total = frappe.db.count("Amni CRM Record", filters=db_filters)
    return {"items": items, "total": total}

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


def provision_service_account(email: str) -> dict:
    """Create or repair Amni's integration user and rotate its API keys.

    This function is intentionally not whitelisted. The provisioning worker
    invokes it through ``bench execute`` inside the trusted ERP cluster.
    """
    normalized = (email or "").strip().lower()
    if not normalized or "@" not in normalized:
        frappe.throw(_("A valid integration email is required."))

    if frappe.db.exists("User", normalized):
        user = frappe.get_doc("User", normalized)
    else:
        user = frappe.get_doc(
            {
                "doctype": "User",
                "email": normalized,
                "first_name": "Amni",
                "last_name": "Integration",
                "enabled": 1,
                "send_welcome_email": 0,
                "user_type": "System User",
            }
        )
        user.insert(ignore_permissions=True)

    user.enabled = 1
    user.user_type = "System User"
    user.role_profile_name = ""
    user.set("roles", [])
    user.append_roles(*INTEGRATION_ROLES)
    user.api_key = frappe.generate_hash(length=15)
    api_secret = frappe.generate_hash(length=32)
    user.api_secret = api_secret
    user.save(ignore_permissions=True)
    frappe.db.commit()

    result = {
        "api_key": user.api_key,
        "api_secret": api_secret,
        "roles": list(INTEGRATION_ROLES),
    }
    # bench execute prints Python repr for return values; emit one strict JSON
    # line so the worker can parse credentials without unsafe eval.
    print(json.dumps(result, separators=(",", ":")))
    return result


def configure_company(company_name: str, abbreviation: str, country: str, currency: str) -> dict:
    """Idempotently create or repair the tenant's primary ERPNext company."""
    values = {
        "company_name": (company_name or "").strip(),
        "abbr": (abbreviation or "").strip().upper(),
        "country": (country or "").strip(),
        "default_currency": (currency or "").strip().upper(),
    }
    if not all(values.values()):
        frappe.throw(_("Company name, abbreviation, country, and currency are required."))

    existing = frappe.db.get_value("Company", {"company_name": values["company_name"]}, "name")
    if existing:
        company = frappe.get_doc("Company", existing)
        company.update(values)
        company.save(ignore_permissions=True)
    else:
        from erpnext.setup.setup_wizard.setup_wizard import setup_complete

        year = date.today().year
        setup_complete(
            frappe._dict(
                {
                    "country": values["country"],
                    "fy_start_date": f"{year}-01-01",
                    "fy_end_date": f"{year}-12-31",
                    "company_name": values["company_name"],
                    "company_abbr": values["abbr"],
                    "currency": values["default_currency"],
                    "chart_of_accounts": "Standard",
                    "domain": "Distribution",
                }
            )
        )
        company = frappe.get_doc("Company", values["company_name"])
    frappe.db.commit()
    return {"name": company.name, "created": not bool(existing)}


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
