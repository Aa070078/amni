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
  UseGuards,
} from "@nestjs/common";
import {
  createCrmContactInputSchema,
  crmContactListQuerySchema,
  updateCrmContactInputSchema,
  type CrmContact,
  type CrmContactListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmContactsService } from "./contacts.service";

@Controller("sales/crm/contacts")
@UseGuards(AuthGuard)
export class CrmContactsController {
  constructor(private readonly contacts: CrmContactsService) {}

  @Get()
  list(@Query() query: unknown): CrmContactListResponse {
    return this.contacts.list(crmContactListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): CrmContact {
    return this.contacts.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): CrmContact {
    return this.contacts.create(createCrmContactInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): CrmContact {
    return this.contacts.update(code, updateCrmContactInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.contacts.remove(code);
  }
}
