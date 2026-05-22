import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { UserStatus } from "@partner-hub/shared";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET", "change-me-in-production"),
    });
  }

  async validate(payload: { sub: string }) {
    const user = (await this.prisma.user.findUnique({ where: { id: payload.sub } })) as
      | {
          id: string;
          loginId: string;
          email: string | null;
          name: string;
          role: string;
          status: UserStatus;
          mustChangePassword: boolean;
          parentUserId: string | null;
        }
      | null;

    if (!user || user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException("User is not allowed to access this resource");
    }

    return {
      id: user.id,
      loginId: user.loginId,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      parentUserId: user.parentUserId,
    };
  }
}
