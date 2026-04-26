import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { EventPopupsController } from "./event-popups.controller";
import { EventPopupsService } from "./event-popups.service";

@Module({
  imports: [PrismaModule],
  controllers: [EventPopupsController],
  providers: [EventPopupsService],
})
export class EventPopupsModule {}
