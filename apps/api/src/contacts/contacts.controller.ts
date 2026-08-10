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
  contactListQuerySchema,
  createContactInputSchema,
  updateContactInputSchema,
  type Contact,
  type ContactListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ContactsService } from "./contacts.service";

@Controller("people/contacts")
@UseGuards(AuthGuard)
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  list(@Query() query: unknown): ContactListResponse {
    return this.contacts.list(contactListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): Contact {
    return this.contacts.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): Contact {
    return this.contacts.create(createContactInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): Contact {
    return this.contacts.update(code, updateContactInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.contacts.remove(code);
  }
}
