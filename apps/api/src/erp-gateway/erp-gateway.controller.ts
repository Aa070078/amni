import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  erpCallArgsSchema,
  erpDocBodySchema,
  erpDocNameSchema,
  erpDoctypeSchema,
  erpListQuerySchema,
  erpMethodSchema,
  erpUpdateQuerySchema,
  type ErpListResponse,
} from "@amni/shared";

import { metaFrom, userFrom } from "../common/request-context";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "./erp-gateway.service";

@Controller("erp")
@UseGuards(AuthGuard)
export class ErpGatewayController {
  constructor(private readonly gateway: ErpGatewayService) {}

  @Get("resource/:doctype")
  list(@Req() req: AuthenticatedRequest, @Param("doctype") doctype: string, @Query() query: unknown): Promise<ErpListResponse> {
    return this.gateway.list(userFrom(req), metaFrom(req), erpDoctypeSchema.parse(doctype), erpListQuerySchema.parse(query));
  }
  @Get("resource/:doctype/:name")
  get(
    @Req() req: AuthenticatedRequest,
    @Param("doctype") doctype: string,
    @Param("name") name: string,
  ): Promise<Record<string, unknown>> {
    return this.gateway.get(
      userFrom(req),
      metaFrom(req),
      erpDoctypeSchema.parse(doctype),
      erpDocNameSchema.parse(name),
    );
  }

  @Post("resource/:doctype")
  @HttpCode(HttpStatus.CREATED)
  create(
    @Req() req: AuthenticatedRequest,
    @Param("doctype") doctype: string,
    @Body() body: unknown,
  ): Promise<Record<string, unknown>> {
    return this.gateway.create(userFrom(req), metaFrom(req), erpDoctypeSchema.parse(doctype), erpDocBodySchema.parse(body));
  }

  @Put("resource/:doctype/:name")
  update(
    @Req() req: AuthenticatedRequest,
    @Param("doctype") doctype: string,
    @Param("name") name: string,
    @Query() query: unknown,
    @Body() body: unknown,
  ): Promise<Record<string, unknown>> {
    const action = erpUpdateQuerySchema.parse(query).action;
    const doc = action ? {} : erpDocBodySchema.parse(body);
    return this.gateway.update(
      userFrom(req),
      metaFrom(req),
      erpDoctypeSchema.parse(doctype),
      erpDocNameSchema.parse(name),
      action,
      doc,
    );
  }

  @Delete("resource/:doctype/:name")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param("doctype") doctype: string,
    @Param("name") name: string,
  ): Promise<void> {
    return this.gateway.remove(
      userFrom(req),
      metaFrom(req),
      erpDoctypeSchema.parse(doctype),
      erpDocNameSchema.parse(name),
    );
  }

  @Post("method/:method")
  @HttpCode(HttpStatus.OK)
  call(
    @Req() req: AuthenticatedRequest,
    @Param("method") method: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    return this.gateway.call(userFrom(req), metaFrom(req), erpMethodSchema.parse(method), erpCallArgsSchema.parse(body));
  }
}
