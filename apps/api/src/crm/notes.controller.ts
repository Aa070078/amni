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
  createCrmNoteInputSchema,
  crmNoteListQuerySchema,
  updateCrmNoteInputSchema,
  type CrmNote,
  type CrmNoteListResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so TypeScript emits Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmNotesService } from "./notes.service";

@Controller("sales/crm/notes")
@UseGuards(AuthGuard)
export class CrmNotesController {
  constructor(private readonly notes: CrmNotesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<CrmNoteListResponse> {
    return this.notes.list(userFrom(req), metaFrom(req), crmNoteListQuerySchema.parse(query));
  }

  @Get(":code")
  detail(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<CrmNote> {
    return this.notes.detail(userFrom(req), metaFrom(req), code);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown): Promise<CrmNote> {
    return this.notes.create(userFrom(req), metaFrom(req), createCrmNoteInputSchema.parse(body));
  }

  @Patch(":code")
  update(@Req() req: AuthenticatedRequest, @Param("code") code: string, @Body() body: unknown): Promise<CrmNote> {
    return this.notes.update(userFrom(req), metaFrom(req), code, updateCrmNoteInputSchema.parse(body));
  }

  @Delete(":code")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param("code") code: string): Promise<void> {
    return this.notes.remove(userFrom(req), metaFrom(req), code);
  }
}
