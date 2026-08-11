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
  createCrmNoteInputSchema,
  crmNoteListQuerySchema,
  updateCrmNoteInputSchema,
  type CrmNote,
  type CrmNoteListResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmNotesService } from "./notes.service";

@Controller("sales/crm/notes")
@UseGuards(AuthGuard)
export class CrmNotesController {
  constructor(private readonly notes: CrmNotesService) {}

  @Get()
  list(@Query() query: unknown): CrmNoteListResponse {
    return this.notes.list(crmNoteListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Param("code") code: string): CrmNote {
    return this.notes.detail(code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: unknown): CrmNote {
    return this.notes.create(createCrmNoteInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Param("code") code: string, @Body() body: unknown): CrmNote {
    return this.notes.update(code, updateCrmNoteInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("code") code: string): void {
    this.notes.remove(code);
  }
}
