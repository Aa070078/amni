import frappe
from frappe.custom.doctype.property_setter.property_setter import make_property_setter


def configure_erp_features():
    """Apply supported ERPNext metadata required by Amni product workflows."""
    if "erpnext" not in frappe.get_installed_apps():
        return

    make_property_setter(
        "Sales Invoice",
        None,
        "allow_auto_repeat",
        1,
        "Check",
        for_doctype=True,
        validate_fields_for_doctype=False,
    )
    frappe.clear_cache(doctype="Sales Invoice")
