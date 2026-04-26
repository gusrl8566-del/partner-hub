import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AnnouncementTemplatesController } from "./announcement-templates.controller";
import { AnnouncementTemplatesService } from "./announcement-templates.service";

@Module({
  imports: [PrismaModule],
  controllers: [AnnouncementTemplatesController],
  providers: [AnnouncementTemplatesService],
  exports: [AnnouncementTemplatesService],
})
export class AnnouncementTemplatesModule {}
