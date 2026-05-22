import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

export class JwtAuthGuard extends AuthGuard("jwt") {
  async canActivate(context: ExecutionContext) {
    const activated = await super.canActivate(context);
    if (!activated) {
      return false;
    }

    const request = context.switchToHttp().getRequest<{ path?: string; url?: string; user?: { mustChangePassword?: boolean } }>();
    const path = request.path ?? request.url ?? "";
    if (request.user?.mustChangePassword && !path.endsWith("/auth/change-password")) {
      throw new UnauthorizedException("비밀번호 변경이 필요합니다.");
    }

    return true;
  }
}
