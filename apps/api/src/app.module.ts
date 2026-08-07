import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { RedisModule } from "./redis/redis.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { SalesModule } from "./sales/sales.module";

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
    SalesModule,
  ],
})
export class AppModule {}
