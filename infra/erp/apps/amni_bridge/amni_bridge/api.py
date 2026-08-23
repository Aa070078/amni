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
from frappe.query_builder.functions import Sum

INTEGRATION_ROLES = (
    "Accounts User",
    "Accounts Manager",
    "Item Manager",
    "Purchase User",
    "Purchase Manager",
    "Purchase Master Manager",
    "Sales User",
    "Sales Manager",
    "Sales Master Manager",
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

DOMAIN_RECORD_FIELDS = (
    "name",
    "record_key",
    "domain",
    "record_type",
    "record_code",
    "title",
    "status",
    "category",
    "reference_code",
    "event_at",
    "numeric_value",
    "payload",
    "creation",
    "modified",
)

DOMAIN_FILTER_FIELDS = {"status", "category", "reference_code"}
DOMAIN_ORDER_FIELDS = {
    "record_code",
    "title",
    "status",
    "category",
    "reference_code",
    "event_at",
    "numeric_value",
    "creation",
    "modified",
}

NATIVE_QUERY_SPECS = {
    "Customer": {"fields": ["name", "customer_name", "customer_type", "customer_group", "territory", "email_id", "mobile_no", "default_currency", "payment_terms", "disabled", "creation", "modified"], "filters": {"disabled", "customer_type", "customer_group", "territory"}, "search": ["name", "customer_name", "customer_group", "territory", "email_id"]},
    "Supplier": {"fields": ["name", "supplier_name", "supplier_group", "country", "supplier_type", "email_id", "mobile_no", "default_currency", "payment_terms", "tax_id", "disabled", "outstanding_amount", "total_receipt_amount", "creation", "modified"], "filters": {"disabled", "supplier_group", "country", "supplier_type"}, "search": ["name", "supplier_name", "supplier_group", "tax_id"]},
    "Item": {"fields": ["name", "item_code", "item_name", "item_group", "stock_uom", "standard_rate", "valuation_rate", "disabled", "description", "safety_stock", "is_stock_item", "is_sales_item", "is_purchase_item", "creation", "modified"], "filters": {"disabled", "item_group", "is_stock_item", "is_sales_item", "is_purchase_item"}, "search": ["name", "item_code", "item_name", "item_group", "description"]},
    "Lead": {"fields": ["name", "lead_name", "company_name", "email_id", "mobile_no", "status", "source", "territory", "creation", "modified"], "filters": {"status", "source", "territory"}, "search": ["name", "lead_name", "company_name", "email_id"]},
    "Quotation": {"fields": ["name", "quotation_to", "party_name", "transaction_date", "valid_till", "currency", "grand_total", "status", "docstatus", "owner", "creation", "modified"], "filters": {"status", "docstatus", "quotation_to", "party_name"}, "search": ["name", "party_name", "owner"]},
    "Sales Order": {"fields": ["name", "customer", "customer_name", "transaction_date", "delivery_date", "currency", "net_total", "grand_total", "status", "docstatus", "owner", "creation", "modified"], "filters": {"status", "docstatus", "customer"}, "search": ["name", "customer", "customer_name", "owner"]},
    "Sales Invoice": {"fields": ["name", "customer", "customer_name", "posting_date", "due_date", "currency", "net_total", "grand_total", "outstanding_amount", "status", "docstatus", "owner", "creation", "modified"], "filters": {"status", "docstatus", "customer"}, "search": ["name", "customer", "customer_name", "owner"]},
    "Purchase Order": {"fields": ["name", "supplier", "supplier_name", "transaction_date", "schedule_date", "currency", "net_total", "grand_total", "status", "docstatus", "owner", "creation", "modified"], "filters": {"status", "docstatus", "supplier"}, "search": ["name", "supplier", "supplier_name", "owner"]},
    "Purchase Invoice": {"fields": ["name", "supplier", "supplier_name", "posting_date", "due_date", "currency", "net_total", "grand_total", "outstanding_amount", "status", "docstatus", "owner", "creation", "modified"], "filters": {"status", "docstatus", "supplier"}, "search": ["name", "supplier", "supplier_name", "owner"]},
    "Payment Entry": {"fields": ["name", "payment_type", "party_type", "party", "posting_date", "paid_amount", "received_amount", "paid_from_account_currency", "paid_to_account_currency", "reference_no", "docstatus", "creation", "modified"], "filters": {"payment_type", "party_type", "party", "docstatus"}, "search": ["name", "party", "reference_no"]},
    "Expense Claim": {"fields": ["name", "employee", "employee_name", "posting_date", "total_claimed_amount", "total_sanctioned_amount", "total_amount_reimbursed", "status", "docstatus", "creation", "modified"], "filters": {"employee", "status", "docstatus"}, "search": ["name", "employee", "employee_name"]},
    "Warehouse": {"fields": ["name", "warehouse_name", "is_group", "disabled", "company", "creation", "modified"], "filters": {"is_group", "disabled", "company"}, "search": ["name", "warehouse_name", "company"]},
}


@frappe.whitelist()
def query_native_records(doctype: str, filters: dict | str | None = None, q: str | None = None, order_by: str = "modified desc", start: int = 0, page_length: int = 20) -> dict:
    """Return an allow-listed, permission-checked page and exact count."""
    spec = NATIVE_QUERY_SPECS.get((doctype or "").strip())
    if not spec:
        frappe.throw(_("Unsupported native record type."))
    if not frappe.has_permission(doctype, ptype="read"):
        frappe.throw(_("Not permitted to read {0}.").format(doctype), frappe.PermissionError)
    parsed_filters = frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    if not isinstance(parsed_filters, dict):
        frappe.throw(_("Native record filters must be an object."))
    db_filters = []
    for field, value in parsed_filters.items():
        if field not in spec["filters"]:
            frappe.throw(_("Unsupported {0} filter: {1}").format(doctype, field))
        if value is not None and value != "":
            db_filters.append([field, "=", value])
    parts = (order_by or "modified desc").strip().split()
    order_field = parts[0] if parts else "modified"
    order_direction = parts[1].lower() if len(parts) > 1 else "desc"
    if order_field not in spec["fields"] or order_direction not in {"asc", "desc"}:
        frappe.throw(_("Unsupported native record ordering."))
    term = (q or "").strip()[:120]
    or_filters = [[field, "like", f"%{term}%"] for field in spec["search"]] if term else None
    bounded_start = max(0, int(start or 0))
    bounded_length = min(100, max(1, int(page_length or 20)))
    query_args = {"filters": db_filters, "or_filters": or_filters}
    items = frappe.get_list(doctype, fields=spec["fields"], order_by=f"{order_field} {order_direction}", start=bounded_start, page_length=bounded_length, **query_args)
    count_rows = frappe.get_list(doctype, fields=[{"COUNT": "name", "as": "total"}], page_length=1, **query_args)
    total = int(count_rows[0].get("total", 0)) if count_rows else 0
    return {"items": items, "total": total}


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
    if not frappe.has_permission("Amni CRM Record", ptype="read"):
        frappe.throw(_("Not permitted to read CRM records."), frappe.PermissionError)

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


@frappe.whitelist()
def list_domain_records(
    domain: str,
    record_type: str,
    filters: dict | str | None = None,
    q: str | None = None,
    order_by: str = "modified desc",
    start: int = 0,
    page_length: int = 20,
) -> dict:
    """Return one bounded page of tenant-local non-core domain records."""
    if not frappe.has_permission("Amni Domain Record", ptype="read"):
        frappe.throw(_("Not permitted to read domain records."), frappe.PermissionError)

    normalized_domain = (domain or "").strip()
    normalized_type = (record_type or "").strip()
    if not normalized_domain or not normalized_type:
        frappe.throw(_("Domain and record type are required."))

    parsed_filters = frappe.parse_json(filters) if isinstance(filters, str) else (filters or {})
    if not isinstance(parsed_filters, dict):
        frappe.throw(_("Domain record filters must be an object."))

    db_filters: list = [["domain", "=", normalized_domain], ["record_type", "=", normalized_type]]
    for field, value in parsed_filters.items():
        if field not in DOMAIN_FILTER_FIELDS:
            frappe.throw(_("Unsupported domain record filter: {0}").format(field))
        if value is not None and value != "":
            db_filters.append([field, "=", value])

    term = (q or "").strip()
    if term:
        db_filters.append(["search_text", "like", f"%{term[:120]}%"])

    parts = (order_by or "modified desc").strip().split()
    order_field = parts[0] if parts else "modified"
    order_direction = parts[1].lower() if len(parts) > 1 else "desc"
    if order_field not in DOMAIN_ORDER_FIELDS or order_direction not in {"asc", "desc"}:
        frappe.throw(_("Unsupported domain record ordering."))

    bounded_start = max(0, int(start or 0))
    bounded_length = min(100, max(1, int(page_length or 20)))
    items = frappe.get_all(
        "Amni Domain Record",
        filters=db_filters,
        fields=list(DOMAIN_RECORD_FIELDS),
        order_by=f"{order_field} {order_direction}",
        start=bounded_start,
        page_length=bounded_length,
    )
    total = frappe.db.count("Amni Domain Record", filters=db_filters)
    return {"items": items, "total": total}


@frappe.whitelist()
def get_account_balances() -> dict:
    """Aggregate uncancelled GL balances inside the current tenant database."""
    if not frappe.has_permission("GL Entry", ptype="read"):
        frappe.throw(_("Not permitted to read account balances."), frappe.PermissionError)

    gl_entry = frappe.qb.DocType("GL Entry")
    balance = (Sum(gl_entry.debit) - Sum(gl_entry.credit)).as_("balance")
    items = (
        frappe.qb.from_(gl_entry)
        .select(gl_entry.account, balance)
        .where(gl_entry.is_cancelled == 0)
        .groupby(gl_entry.account)
        .limit(2000)
    ).run(as_dict=True)
    return {"items": items}


@frappe.whitelist()
def get_customer_sales_totals(customers: list | str) -> dict:
    """Aggregate invoice totals for at most one visible customer page."""
    if not frappe.has_permission("Sales Invoice", ptype="read"):
        frappe.throw(_("Not permitted to read sales totals."), frappe.PermissionError)
    parsed = frappe.parse_json(customers) if isinstance(customers, str) else customers
    names = [str(value) for value in (parsed or []) if value][:100]
    if not names:
        return {"items": []}
    invoice = frappe.qb.DocType("Sales Invoice")
    items = (
        frappe.qb.from_(invoice)
        .select(invoice.customer, Sum(invoice.grand_total).as_("total_sales"), Sum(invoice.outstanding_amount).as_("outstanding"))
        .where((invoice.docstatus != 2) & invoice.customer.isin(names))
        .groupby(invoice.customer)
        .limit(100)
    ).run(as_dict=True)
    return {"items": items}

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
    from amni_bridge.setup import configure_erp_features

    configure_erp_features()
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
