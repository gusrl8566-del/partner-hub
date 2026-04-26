import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@partner-hub/shared";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto";
import { CategoriesService } from "./categories.service";

@Controller("categories")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() body: CreateCategoryDto) {
    return this.categoriesService.create(body);
  }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() body: UpdateCategoryDto) {
    return this.categoriesService.update(id, body);
  }
}
