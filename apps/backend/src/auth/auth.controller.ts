import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@partner-hub/shared";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";
import {
  AdminResetPasswordDto,
  LoginDto,
  SetFirstAccessPasswordDto,
  VerifyFirstAccessCodeDto,
} from "./dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body.loginId, body.password);
  }

  @Post("first-access/verify-code")
  verifyCode(@Body() body: VerifyFirstAccessCodeDto) {
    return this.authService.verifyFirstAccessCode(body.loginId, body.inviteCode);
  }

  @Post("first-access/set-password")
  setPassword(@Body() body: SetFirstAccessPasswordDto) {
    return this.authService.setFirstAccessPassword(body.token, body.password);
  }

  @Post("admin/reset-password")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  resetPassword(
    @Body() body: AdminResetPasswordDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.authService.adminResetPassword(body.userId, user.id);
  }
}
