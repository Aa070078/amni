import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [AuthModule, ErpGatewayModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
