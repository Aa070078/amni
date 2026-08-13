from . import __version__

app_name = "amni_bridge"
app_title = "Amni Bridge"
app_publisher = "Amni"
app_description = (
    "Amni platform SSO + theming bridge for tenant ERP sites. "
    "Provides the /api/method/amni_bridge.api.login endpoint (mints a "
    "Frappe desk session from an Amni-signed JWT) and injects the Amni "
    "design theme into the desk. No core modifications — this is a "
    "separate extension app installed alongside erpnext and hrms."
)
app_license = "MIT"
app_version = __version__
app_icon = "octicon octicon-tools"
app_email = "support@amni.dev"

# Inject the Amni theme into the Frappe desk (app_include_*) and portal (web_include_*).
app_include_css = ["/assets/amni_bridge/css/amni-theme.css"]
web_include_css = ["/assets/amni_bridge/css/amni-theme.css"]
