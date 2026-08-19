import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import {
  globalSearchQuerySchema,
  type GlobalSearchResponse,
} from "@amni/shared";

import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { metaFrom, userFrom } from "../common/request-context";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SearchService } from "./search.service";

@Controller("search")
@UseGuards(AuthGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  global(@Req() req: AuthenticatedRequest, @Query() query: unknown): Promise<GlobalSearchResponse> {
    return this.search.global(userFrom(req), metaFrom(req), globalSearchQuerySchema.parse(query));
  }
}
