import {
  ContactRound,
  Handshake,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Upload,
  type LucideIcon,
} from "lucide-react";

export interface AppModule {
  title: string;
  intent: string;
  href: string;
  icon: LucideIcon;
}

export const appModules: AppModule[] = [
  { title: "Dashboard", intent: "Business overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Sales", intent: "Customers, quotes, orders", href: "/sales", icon: Handshake },
  { title: "CRM", intent: "Contacts, tasks, calls, outreach", href: "/sales/crm", icon: ContactRound },
  { title: "Purchasing", intent: "Suppliers, purchase orders", href: "/purchasing", icon: ShoppingCart },
  { title: "Inventory", intent: "Items, stock levels", href: "/inventory", icon: Package },
  { title: "Import data", intent: "Customers, products, suppliers", href: "/imports", icon: Upload },
  { title: "Finance", intent: "Invoicing, accounting, expenses", href: "/finance", icon: Landmark },
  { title: "HRMS", intent: "People, leave, payroll", href: "/hrms", icon: HeartHandshake },
  { title: "Settings", intent: "Company, plan", href: "/settings", icon: Settings },
];

export const isModuleActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
