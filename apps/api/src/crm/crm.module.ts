import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DealsModule } from "../deals/deals.module";
import { ErpGatewayModule } from "../erp-gateway/erp-gateway.module";
import { CrmActivitiesController } from "./activities.controller";
import { CrmActivitiesService } from "./activities.service";
import { CrmCallLogsController } from "./call-logs.controller";
import { CrmCallLogsService } from "./call-logs.service";
import { CrmContactsController } from "./contacts.controller";
import { CrmContactsService } from "./contacts.service";
import { CrmEmailTemplatesController } from "./email-templates.controller";
import { CrmEmailTemplatesService } from "./email-templates.service";
import { CrmEventsController } from "./events.controller";
import { CrmEventsService } from "./events.service";
import { CrmNotesController } from "./notes.controller";
import { CrmNotesService } from "./notes.service";
import { CrmNotificationsController } from "./notifications.controller";
import { CrmNotificationsService } from "./notifications.service";
import { CrmOrganizationsController } from "./organizations.controller";
import { CrmOrganizationsService } from "./organizations.service";
import { CrmSettingsController } from "./settings.controller";
import { CrmSettingsService } from "./settings.service";
import { CrmTasksController } from "./tasks.controller";
import { CrmTasksService } from "./tasks.service";
import { CrmViewsController } from "./views.controller";
import { CrmViewsService } from "./views.service";
import { CrmWhatsappController } from "./whatsapp.controller";
import { CrmWhatsappService } from "./whatsapp.service";
import { CrmRecordRepository } from "./crm-record.repository";

@Module({
  imports: [AuthModule, DealsModule, ErpGatewayModule],
  controllers: [
    CrmOrganizationsController,
    CrmContactsController,
    CrmTasksController,
    CrmNotesController,
    CrmActivitiesController,
    CrmViewsController,
    CrmEventsController,
    CrmCallLogsController,
    CrmEmailTemplatesController,
    CrmWhatsappController,
    CrmSettingsController,
    CrmNotificationsController,
  ],
  providers: [
    CrmRecordRepository,
    CrmOrganizationsService,
    CrmContactsService,
    CrmTasksService,
    CrmNotesService,
    CrmActivitiesService,
    CrmViewsService,
    CrmEventsService,
    CrmCallLogsService,
    CrmEmailTemplatesService,
    CrmWhatsappService,
    CrmSettingsService,
    CrmNotificationsService,
  ],
  exports: [CrmNotificationsService, CrmActivitiesService],
})
export class CrmModule {}
