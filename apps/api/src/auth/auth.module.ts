import { Module } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

import { RedisService } from "../redis/redis.service";
import { RedisThrottlerStorage } from "../throttler/redis-throttler.storage";
import { JobsModule } from "../jobs/jobs.module";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { TokensService } from "./tokens.service";

@Module({
  imports: [
    JobsModule,
    ThrottlerModule.forRootAsync({
      inject: [RedisService],
      useFactory: (redis: RedisService) => ({
        storage: new RedisThrottlerStorage(redis),
        throttlers: [
          {
            name: "default",
            ttl: 60_000,
            limit: 100,
            blockDuration: 0,
          },
        ],
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokensService,
    AuthGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [AuthGuard, TokensService],
})
export class AuthModule {}
