import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  globalSearchQuerySchema,
  type GlobalSearchResponse,
} from "@amni/shared";

import { AuthGuard } from "../auth/auth.guard";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SearchService } from "./search.service";

@Controller("search")
@UseGuards(AuthGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  global(@Query() query: unknown): GlobalSearchResponse {
    return this.search.global(globalSearchQuerySchema.parse(query));
  }
}
