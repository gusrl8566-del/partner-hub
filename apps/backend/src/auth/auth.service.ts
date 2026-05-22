import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { UserRole, UserStatus } from "@partner-hub/shared";
import { PrismaService } from "../prisma/prisma.service";

const INITIAL_PASSWORD = "firstpwd";

type UserRecord = {
  id: string;
  loginId: string;
  email: string | null;
  name: string;
  role: UserRole;
  status: UserStatus;
  passwordHash: string | null;
  mustChangePassword: boolean;
  parentUserId: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginId: string, password: string) {
    const user = (await (this.prisma.user as any).findUnique({ where: { loginId } })) as UserRecord | null;

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException("차단된 사용자는 로그인할 수 없습니다.");
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException("아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    return this.issueAuthPayload(user);
  }

  async verifyFirstAccessCode(loginId: string, inviteCode: string) {
    const user = (await (this.prisma.user as any).findUnique({
      where: { loginId },
      include: {
        inviteCodes: {
          where: { usedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })) as (UserRecord & { inviteCodes: Array<{ id: string; codeHash: string; expiresAt: Date }> }) | null;

    if (!user || !user.inviteCodes.length) {
      throw new UnauthorizedException("초대코드가 올바르지 않습니다.");
    }

    const invite = user.inviteCodes[0];
    if (invite.expiresAt < new Date()) {
      throw new UnauthorizedException("초대코드가 만료되었습니다.");
    }

    const matches = await bcrypt.compare(inviteCode, invite.codeHash);
    if (!matches) {
      throw new UnauthorizedException("초대코드가 올바르지 않습니다.");
    }

    return {
      token: await this.jwtService.signAsync(
        { sub: user.id, inviteId: invite.id, type: "first-access" },
        { expiresIn: "15m" },
      ),
      user: this.toUserPayload(user),
    };
  }

  async setFirstAccessPassword(token: string, password: string) {
    const payload = await this.verifyFirstAccessToken(token);
    const invite = await this.prisma.inviteCode.findUnique({ where: { id: payload.inviteId } });

    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      throw new UnauthorizedException("Invite token is no longer valid");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nextStatus = user.status === UserStatus.BLOCKED ? UserStatus.BLOCKED : UserStatus.ACTIVE;

    await this.prisma.$transaction([
      this.prisma.inviteCode.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
      (this.prisma.user as any).update({
        where: { id: user.id },
        data: { passwordHash, status: nextStatus, mustChangePassword: false },
      }),
    ]);

    const refreshedUser = (await this.prisma.user.findUnique({ where: { id: user.id } })) as UserRecord | null;
    if (!refreshedUser) {
      throw new NotFoundException("User not found after password setup");
    }

    return this.issueAuthPayload(refreshedUser);
  }

  async adminResetPassword(userId: string) {
    const user = await (this.prisma.user as any).findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.passwordHash || user.mustChangePassword) {
      throw new BadRequestException("비밀번호를 설정한 사용자만 초기화할 수 있습니다.");
    }

    const passwordHash = await bcrypt.hash(INITIAL_PASSWORD, 10);
    await (this.prisma.user as any).update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        status: user.status === UserStatus.BLOCKED ? UserStatus.BLOCKED : UserStatus.PENDING,
      },
    });

    return {
      userId: user.id,
      initialPassword: INITIAL_PASSWORD,
      status: user.status === UserStatus.BLOCKED ? UserStatus.BLOCKED : UserStatus.PENDING,
    };
  }

  async createInitialPasswordUser(input: {
    loginId: string;
    email?: string | null;
    name: string;
    role: UserRole;
    parentUserId?: string | null;
    createdById?: string | null;
  }) {
    const existingByLoginId = await (this.prisma.user as any).findUnique({ where: { loginId: input.loginId } });
    if (existingByLoginId) {
      throw new BadRequestException("이미 사용 중인 아이디입니다.");
    }

    const passwordHash = await bcrypt.hash(INITIAL_PASSWORD, 10);

    const user = (await (this.prisma.user as any).create({
      data: {
        loginId: input.loginId,
        email: input.email ?? null,
        name: input.name,
        role: input.role,
        status: UserStatus.PENDING,
        passwordHash,
        mustChangePassword: true,
        parentUserId: input.parentUserId ?? null,
        createdById: input.createdById ?? null,
      },
    })) as UserRecord;

    return {
      user: this.toUserPayload(user),
      initialPassword: INITIAL_PASSWORD,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = (await (this.prisma.user as any).findUnique({ where: { id: userId } })) as UserRecord | null;
    if (!user || !user.passwordHash) {
      throw new NotFoundException("User not found");
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException("차단된 사용자는 비밀번호를 변경할 수 없습니다.");
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException("현재 비밀번호가 올바르지 않습니다.");
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException("새 비밀번호는 현재 비밀번호와 달라야 합니다.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const refreshedUser = (await (this.prisma.user as any).update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        status: UserStatus.ACTIVE,
      },
    })) as UserRecord;

    return this.issueAuthPayload(refreshedUser);
  }

  private async issueAuthPayload(user: UserRecord) {
    return {
      accessToken: await this.jwtService.signAsync({ sub: user.id, role: user.role }),
      user: this.toUserPayload(user),
    };
  }

  private toUserPayload(user: UserRecord) {
    return {
      id: user.id,
      loginId: user.loginId,
      email: user.email ?? null,
      name: user.name,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      parentUserId: user.parentUserId,
    };
  }

  private async verifyFirstAccessToken(token: string): Promise<{ sub: string; inviteId: string; type: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (payload.type !== "first-access") {
        throw new UnauthorizedException("Invalid token type");
      }
      return payload;
    } catch {
      throw new UnauthorizedException("Invalid first-access token");
    }
  }
}
