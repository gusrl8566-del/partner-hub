import { Module } from "@nestjs/common";
import { AnnouncementTemplatesModule } from "../announcement-templates/announcement-templates.module";
import { PrismaModule } from "../prisma/prisma.module";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";

@Module({
  imports: [PrismaModule, AnnouncementTemplatesModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
