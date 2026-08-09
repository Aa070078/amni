import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { RedisModule } from "./redis/redis.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { PurchasingModule } from "./purchasing/purchasing.module";
import { PeopleModule } from "./people/people.module";

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
    PurchasingModule,
    PeopleModule,
  ],
})
export class AppModule {}
