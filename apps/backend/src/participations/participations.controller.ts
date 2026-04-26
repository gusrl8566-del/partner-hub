import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import { RolesGuard } from "../common/roles.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateParticipationDto } from "./dto";
import { ParticipationsService } from "./participations.service";
import { UserRole } from "@partner-hub/shared";

@Controller("participations")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParticipationsController {
  constructor(private readonly participationsService: ParticipationsService) {}

  @Post()
  create(
    @Body() body: CreateParticipationDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.participationsService.create(body, user);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string; role: UserRole }) {
    return this.participationsService.findAll(user);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.participationsService.remove(id, user);
  }
}
