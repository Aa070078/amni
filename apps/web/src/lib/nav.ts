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
import { ProductRole, type ProductRole as ProductRoleValue } from "@amni/shared";

export interface AppModule {
  title: string;
  intent: string;
  href: string;
  icon: LucideIcon;
  roles: ProductRoleValue[];
}

const ALL_ROLES = Object.values(ProductRole);

export const appModules: AppModule[] = [
  { title: "Dashboard", intent: "Business overview", href: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
  { title: "Sales", intent: "Customers, quotes, orders", href: "/sales", icon: Handshake, roles: [ProductRole.ADMIN, ProductRole.SALES] },
  { title: "CRM", intent: "Contacts, tasks, calls, outreach", href: "/crm", icon: ContactRound, roles: [ProductRole.ADMIN, ProductRole.SALES] },
  { title: "Purchasing", intent: "Suppliers, purchase orders", href: "/purchasing", icon: ShoppingCart, roles: [ProductRole.ADMIN, ProductRole.INVENTORY] },
  { title: "Inventory", intent: "Items, stock levels", href: "/inventory", icon: Package, roles: [ProductRole.ADMIN, ProductRole.INVENTORY] },
  { title: "Import data", intent: "Customers, products, suppliers", href: "/imports", icon: Upload, roles: [ProductRole.ADMIN] },
  { title: "Finance", intent: "Invoicing, accounting, expenses", href: "/finance", icon: Landmark, roles: [ProductRole.ADMIN, ProductRole.ACCOUNTANT] },
  { title: "HRMS", intent: "People, leave, payroll", href: "/hrms", icon: HeartHandshake, roles: ALL_ROLES },
  { title: "Settings", intent: "Workspace and profile", href: "/settings", icon: Settings, roles: ALL_ROLES },
];

export const modulesForRole = (role?: ProductRoleValue): AppModule[] =>
  role ? appModules.filter((module) => module.roles.includes(role)) : [];

export const isModuleActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
