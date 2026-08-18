# Amni Bridge

Supported Frappe extension points used by Amni for tenant service-account
provisioning, HRMS single sign-on, and desk theming. This separate app does not
modify ERPNext or Frappe core.

The app also owns Amni's supported tenant-local extension records:

- `Amni CRM Record` for CRM concepts without a safe native ERPNext mapping.
- `Amni Domain Record` for Equity, ESG, and Sign workflow state. Its key is
  namespaced by domain, record type, and opaque code; indexed list access is
  bounded and permission-checked in `amni_bridge.api.list_domain_records`.
