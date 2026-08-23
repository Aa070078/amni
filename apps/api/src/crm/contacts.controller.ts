import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  createCrmContactInputSchema,
  crmContactListQuerySchema,
  updateCrmContactInputSchema,
  type CrmContact,
  type CrmContactListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so TypeScript emits Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmContactsService } from "./contacts.service";

@Controller("sales/crm/contacts")
@UseGuards(AuthGuard)
export class CrmContactsController {
  constructor(private readonly contacts: CrmContactsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<CrmContactListResponse> {
    return this.contacts.list(userFrom(req), metaFrom(req), crmContactListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<CrmContact> {
    return this.contacts.detail(userFrom(req), metaFrom(req), code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CrmContact> {
    return this.contacts.create(userFrom(req), metaFrom(req), createCrmContactInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<CrmContact> {
    return this.contacts.update(userFrom(req), metaFrom(req), code, updateCrmContactInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.contacts.remove(userFrom(req), metaFrom(req), code);
  }
}
