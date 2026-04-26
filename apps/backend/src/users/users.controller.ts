import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@partner-hub/shared";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { CreateChildUserDto, CreateUserDto } from "../auth/dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() body: CreateUserDto, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.usersService.createUser(body, user);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string; role: UserRole }) {
    return this.usersService.findAll(user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.usersService.findOne(id, user);
  }

  @Patch(":id/block")
  @Roles(UserRole.ADMIN)
  block(@Param("id") id: string) {
    return this.usersService.blockUser(id);
  }

  @Patch(":id/unblock")
  @Roles(UserRole.ADMIN)
  unblock(@Param("id") id: string) {
    return this.usersService.unblockUser(id);
  }

  @Post(":id/children")
  createChild(
    @Param("id") id: string,
    @Body() body: CreateChildUserDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.usersService.createChild(id, body, user);
  }

  @Get(":id/descendants")
  descendants(@Param("id") id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.usersService.getDescendants(id, user);
  }
}
