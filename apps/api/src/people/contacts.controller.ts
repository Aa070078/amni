import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  contactListQuerySchema,
  type ContactDetail,
  type ContactListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
import { parseQuery } from "../common/parse-query";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ContactsService } from "./contacts.service";

@Controller("contacts")
@UseGuards(AuthGuard)
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  list(@Query() query: unknown): ContactListResponse {
    return this.contacts.list(parseQuery(contactListQuerySchema, query));
  }

  @Get(":id")
  detail(@Param("id") id: string): ContactDetail {
    return this.contacts.getById(id);
  }
}
