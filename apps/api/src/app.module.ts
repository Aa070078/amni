import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { BullQueue } from "@amni/shared";

import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { RedisModule } from "./redis/redis.module";
import { JobsModule } from "./jobs/jobs.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { LeadsModule } from "./leads/leads.module";
import { DealsModule } from "./deals/deals.module";
import { CustomersModule } from "./customers/customers.module";
import { ProductsModule } from "./products/products.module";
import { QuotationsModule } from "./quotations/quotations.module";
import { SalesInvoicesModule } from "./sales-invoices/sales-invoices.module";
import { SalesOrdersModule } from "./sales-orders/sales-orders.module";
import { StockMovementsModule } from "./stock-movements/stock-movements.module";
import { WarehousesModule } from "./warehouses/warehouses.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { PurchaseOrdersModule } from "./purchase-orders/purchase-orders.module";
import { PurchaseInvoicesModule } from "./purchase-invoices/purchase-invoices.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { PaymentsModule } from "./payments/payments.module";
import { FinanceModule } from "./finance/finance.module";
import { SettingsModule } from "./settings/settings.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SearchModule } from "./search/search.module";
import { WizardModule } from "./wizard/wizard.module";
import { InvoicingModule } from "./invoicing/invoicing.module";
import { AccountingModule } from "./accounting/accounting.module";
import { SignModule } from "./sign/sign.module";
import { EquityModule } from "./equity/equity.module";
import { EsgModule } from "./esg/esg.module";
import { ContactsModule } from "./contacts/contacts.module";
import { PlansModule } from "./plans/plans.module";
import { ProvisioningModule } from "./provisioning/provisioning.module";
import { HrmsModule } from "./hrms/hrms.module";
import { ErpGatewayModule } from "./erp-gateway/erp-gateway.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env.local", ".env"],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>("REDIS_URL") ?? "redis://localhost:6379",
        },
      }),
    }),
    BullModule.registerQueue({ name: BullQueue.PROVISIONING }),
    RedisModule,
    JobsModule,
    HealthModule,
    AuthModule,
    DashboardModule,
    LeadsModule,
    DealsModule,
    CustomersModule,
    ProductsModule,
    QuotationsModule,
    SalesInvoicesModule,
    SalesOrdersModule,
    StockMovementsModule,
    WarehousesModule,
    SuppliersModule,
    PurchaseOrdersModule,
    PurchaseInvoicesModule,
    ExpensesModule,
    PaymentsModule,
    FinanceModule,
    SettingsModule,
    NotificationsModule,
    SearchModule,
    WizardModule,
    InvoicingModule,
    AccountingModule,
    SignModule,
    EquityModule,
    EsgModule,
    ContactsModule,
    PlansModule,
    ProvisioningModule,
    HrmsModule,
    ErpGatewayModule,
  ],
})
export class AppModule {}
