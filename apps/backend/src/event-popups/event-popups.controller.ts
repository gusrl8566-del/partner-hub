import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@partner-hub/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { RolesGuard } from "../common/roles.guard";
import { DismissPopupDto } from "./dto";
import { EventPopupsService } from "./event-popups.service";

@Controller("event-popups")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventPopupsController {
  constructor(private readonly eventPopupsService: EventPopupsService) {}

  @Get("active")
  findActive(@CurrentUser() user: { id: string; role: UserRole }) {
    return this.eventPopupsService.findActivePopups(user);
  }

  @Post(":eventId/read")
  markRead(@Param("eventId") eventId: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.eventPopupsService.markRead(eventId, user);
  }

  @Post(":eventId/dismiss")
  dismiss(
    @Param("eventId") eventId: string,
    @Body() body: DismissPopupDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.eventPopupsService.dismiss(eventId, user, body.dismissHours);
  }
}
