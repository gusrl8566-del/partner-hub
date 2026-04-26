import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@partner-hub/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import {
  CreateAnnouncementTemplateDto,
  UpdateAnnouncementTemplateDto,
} from "./dto";
import { AnnouncementTemplatesService } from "./announcement-templates.service";

@Controller("announcement-templates")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementTemplatesController {
  constructor(private readonly announcementTemplatesService: AnnouncementTemplatesService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.announcementTemplatesService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @Body() body: CreateAnnouncementTemplateDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.announcementTemplatesService.create(body, user.id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() body: UpdateAnnouncementTemplateDto) {
    return this.announcementTemplatesService.update(id, body);
  }

  @Patch(":id/activate")
  @Roles(UserRole.ADMIN)
  activate(@Param("id") id: string) {
    return this.announcementTemplatesService.activate(id);
  }

  @Patch(":id/deactivate")
  @Roles(UserRole.ADMIN)
  deactivate(@Param("id") id: string) {
    return this.announcementTemplatesService.deactivate(id);
  }
}
