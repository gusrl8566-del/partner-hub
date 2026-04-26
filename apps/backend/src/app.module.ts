import { AnnouncementTemplatesModule } from "./announcement-templates/announcement-templates.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./categories/categories.module";
import { EventPopupsModule } from "./event-popups/event-popups.module";
import { EventsModule } from "./events/events.module";
import { ParticipationsModule } from "./participations/participations.module";
import { PrismaModule } from "./prisma/prisma.module";
import { StatsModule } from "./stats/stats.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AnnouncementTemplatesModule,
    EventsModule,
    EventPopupsModule,
    CategoriesModule,
    ParticipationsModule,
    StatsModule,
  ],
})
export class AppModule {}
