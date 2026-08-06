import { Injectable } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";

// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RedisService } from "../redis/redis.service";

const KEY_PREFIX = "throttle:";

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Redis-backed sliding-window storage for @nestjs/throttler.
 * A sorted set holds hit timestamps per key; window = now - ttl.
 * NOTE: @nestjs/throttler v5+ passes `ttl` and `blockDuration` in milliseconds.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const client = this.redis.get();
    const redisKey = `${KEY_PREFIX}${throttlerName}:${key}`;
    const now = Date.now();
    const windowStart = now - ttl;

    const blockKey = `${redisKey}:blocked`;
    const blockedUntil = await client.get(blockKey);
    if (blockedUntil) {
      const timeToBlockExpire = Math.max(0, Number(blockedUntil) - now);
      if (timeToBlockExpire > 0) {
        return { totalHits: limit, timeToExpire: timeToBlockExpire, isBlocked: true, timeToBlockExpire };
      }
      await client.del(blockKey);
    }

    const member = `${now}:${Math.random().toString(36).slice(2)}`;
    await client.zremrangebyscore(redisKey, 0, windowStart);
    const pipeline = client.pipeline();
    pipeline.zadd(redisKey, now, member);
    pipeline.zcard(redisKey);
    pipeline.pexpire(redisKey, ttl);
    const results = await pipeline.exec();
    const totalHits = Number(results?.[1]?.[1] ?? 0);

    if (totalHits >= limit) {
      if (blockDuration > 0) {
        await client.set(blockKey, String(now + blockDuration), "PX", blockDuration);
      }
      return { totalHits, timeToExpire: ttl, isBlocked: true, timeToBlockExpire: blockDuration };
    }

    return { totalHits, timeToExpire: ttl, isBlocked: false, timeToBlockExpire: 0 };
  }
}
