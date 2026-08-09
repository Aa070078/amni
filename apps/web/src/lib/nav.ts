import {
  Handshake,
  Landmark,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
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
  { title: "Purchasing", intent: "Suppliers, purchase orders", href: "/purchasing", icon: ShoppingCart },
  { title: "Inventory", intent: "Items, stock levels", href: "/inventory", icon: Package },
  { title: "Finance", intent: "Invoicing, accounting, expenses", href: "/finance", icon: Landmark },
  { title: "People", intent: "Contacts, access", href: "/people", icon: Users },
  { title: "Settings", intent: "Company, plan", href: "/settings", icon: Settings },
];

export const isModuleActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
