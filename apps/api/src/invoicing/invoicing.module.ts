import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { InvoicingController } from "./invoicing.controller";
import { InvoicingService } from "./invoicing.service";

@Module({
  imports: [AuthModule],
  controllers: [InvoicingController],
  providers: [InvoicingService],
  exports: [InvoicingService],
})
export class InvoicingModule {}
