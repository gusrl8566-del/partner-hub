import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { StatsService } from "./stats.service";

@Controller("stats")
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get("categories/monthly")
  monthlyCategoryStats() {
    return this.statsService.getMonthlyCategoryStats();
  }
}
