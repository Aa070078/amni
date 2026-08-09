import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { RedisModule } from "./redis/redis.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { LeadsModule } from "./leads/leads.module";
import { ProductsModule } from "./products/products.module";
import { QuotationsModule } from "./quotations/quotations.module";
import { SalesInvoicesModule } from "./sales-invoices/sales-invoices.module";
import { SalesOrdersModule } from "./sales-orders/sales-orders.module";
import { StockMovementsModule } from "./stock-movements/stock-movements.module";
import { WarehousesModule } from "./warehouses/warehouses.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env.local", ".env"],
    }),
    RedisModule,
    HealthModule,
    AuthModule,
    DashboardModule,
    LeadsModule,
    ProductsModule,
    QuotationsModule,
    SalesInvoicesModule,
    SalesOrdersModule,
    StockMovementsModule,
    WarehousesModule,
  ],
})
export class AppModule {}
