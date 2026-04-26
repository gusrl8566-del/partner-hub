import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@partner-hub/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import {
  CreateEventCategoryDto,
  CreateEventDto,
  CreateEventRegistrationsDto,
  GenerateEventCopyDto,
  ReplaceEventRegistrationsDto,
  UpdateEventCategoryDto,
  UpdateEventDto,
} from "./dto";
import { EventsService } from "./events.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get("event-categories")
  findEventCategories() {
    return this.eventsService.findEventCategories();
  }

  @Post("event-categories")
  @Roles(UserRole.ADMIN)
  createEventCategory(@Body() body: CreateEventCategoryDto) {
    return this.eventsService.createEventCategory(body);
  }

  @Patch("event-categories/:id")
  @Roles(UserRole.ADMIN)
  updateEventCategory(@Param("id") id: string, @Body() body: UpdateEventCategoryDto) {
    return this.eventsService.updateEventCategory(id, body);
  }

  @Get("events")
  findEvents(@CurrentUser() user: { id: string; role: UserRole }) {
    return this.eventsService.findEvents(user);
  }

  @Post("events")
  @Roles(UserRole.ADMIN)
  createEvent(@Body() body: CreateEventDto, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.eventsService.createEvent(body, user);
  }

  @Get("events/:id")
  findEvent(@Param("id") id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.eventsService.findEvent(id, user);
  }

  @Patch("events/:id")
  @Roles(UserRole.ADMIN)
  updateEvent(
    @Param("id") id: string,
    @Body() body: UpdateEventDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.eventsService.updateEvent(id, body, user);
  }

  @Post("events/:id/generate-copy")
  @Roles(UserRole.ADMIN)
  generateCopy(
    @Param("id") id: string,
    @Body() body: GenerateEventCopyDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.eventsService.generateCopy(id, body, user);
  }

  @Get("events/:id/copy-logs")
  @Roles(UserRole.ADMIN)
  getCopyLogs(@Param("id") id: string) {
    return this.eventsService.getCopyLogs(id);
  }

  @Get("events/:id/summary")
  getEventSummary(@Param("id") id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.eventsService.getEventSummary(id, user);
  }

  @Post("events/:id/registrations")
  createRegistrations(
    @Param("id") id: string,
    @Body() body: CreateEventRegistrationsDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.eventsService.createRegistrations(id, body, user);
  }

  @Patch("events/:id/registrations")
  replaceRegistrations(
    @Param("id") id: string,
    @Body() body: ReplaceEventRegistrationsDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.eventsService.replaceRegistrations(id, body, user);
  }

  @Delete("events/:eventId/registrations/:registrationId")
  removeRegistration(
    @Param("eventId") eventId: string,
    @Param("registrationId") registrationId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.eventsService.removeRegistration(eventId, registrationId, user);
  }
}
