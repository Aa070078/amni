import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { AppModule } from "./app.module";
import { requestIdMiddleware } from "./common/request-id.middleware";
import { ApiEnvelopeInterceptor } from "./common/envelope.interceptor";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.use(helmet());
  app.use(cookieParser());
  app.use(
    pinoHttp({
      autoLogging: true,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          'res.headers["set-cookie"]',
        ],
        censor: "[Redacted]",
      },
    }),
  );
  app.use(requestIdMiddleware);

  app.setGlobalPrefix("/api/v1", { exclude: ["healthz"] });
  app.useGlobalInterceptors(new ApiEnvelopeInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(",").map((s) => s.trim()) ?? true,
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  Logger.log(`Amni API listening on http://localhost:${port}/api/v1`, "Bootstrap");
}

void bootstrap();
