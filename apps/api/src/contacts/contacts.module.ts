import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { ContactsController } from "./contacts.controller";
import { ContactsService } from "./contacts.service";

@Module({
  imports: [AuthModule, ErpGatewayModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
