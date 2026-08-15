import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

/**
 * Standalone NestJS bootstrap for the worker. Registers BullMQ queues and
 * processors, then stays alive consuming jobs. No HTTP server.
 */
async function bootstrap() {
  await NestFactory.createApplicationContext(AppModule);
  Logger.log("Amni worker started", "Bootstrap");
}

void bootstrap();
