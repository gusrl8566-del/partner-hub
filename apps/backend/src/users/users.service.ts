import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole, UserStatus } from "@partner-hub/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";

type RequestUser = {
  id: string;
  role: UserRole;
};

type TreeUser = {
  id: string;
  parentUserId: string | null;
  [key: string]: unknown;
};

type TreeNode = TreeUser & {
  children: TreeNode[];
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async createUser(input: { loginId: string; name: string; role: UserRole; parentUserId?: string }, actor: RequestUser) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only admins can create top-level users");
    }

    if (input.parentUserId) {
      await this.ensureUserExists(input.parentUserId);
    }

    return this.authService.createInitialPasswordUser({
      ...input,
      createdById: actor.id,
    });
  }

  async createChild(parentUserId: string, input: { loginId: string; name: string }, actor: RequestUser) {
    await this.ensureUserExists(parentUserId);

    if (actor.role === UserRole.PARTNER && actor.id !== parentUserId) {
      throw new ForbiddenException("Partners can only create direct child partners under themselves");
    }

    if (actor.role === UserRole.ADMIN || actor.id === parentUserId) {
      return this.authService.createInitialPasswordUser({
        loginId: input.loginId,
        name: input.name,
        role: UserRole.PARTNER,
        parentUserId,
        createdById: actor.id,
      });
    }

    throw new ForbiddenException("Not allowed to create a child for this user");
  }

  async findAll(actor: RequestUser) {
    if (actor.role === UserRole.ADMIN) {
      return this.prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    const ids = await this.getSelfAndDescendantIds(actor.id);
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, actor: RequestUser) {
    await this.assertCanViewUser(actor, id);
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        parentUser: true,
        children: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async blockUser(id: string) {
    await this.ensureUserExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.BLOCKED },
    });
  }

  async unblockUser(id: string) {
    const user = await this.ensureUserExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { status: user.passwordHash ? UserStatus.ACTIVE : UserStatus.PENDING },
    });
  }

  async updateParent(id: string, parentUserId: string | null) {
    await this.ensureUserExists(id);
    const nextParentUserId = parentUserId?.trim() || null;

    if (nextParentUserId === id) {
      throw new BadRequestException("자기 자신을 상위 사용자로 지정할 수 없습니다.");
    }

    if (nextParentUserId) {
      await this.ensureUserExists(nextParentUserId);
      const blockedParentIds = await this.getSelfAndDescendantIds(id);

      if (blockedParentIds.includes(nextParentUserId)) {
        throw new BadRequestException("자기 자신 또는 하위 사용자를 상위 사용자로 지정할 수 없습니다.");
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { parentUserId: nextParentUserId },
    });
  }

  async getDescendants(id: string, actor: RequestUser) {
    await this.assertCanViewUser(actor, id);
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    });

    const descendants = this.buildTree(id, users);
    const root = users.find((user: TreeUser) => user.id === id);
    if (!root) {
      throw new NotFoundException("User not found");
    }

    return {
      root,
      descendants,
    };
  }

  private async assertCanViewUser(actor: RequestUser, targetUserId: string) {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    const ids = await this.getSelfAndDescendantIds(actor.id);
    if (!ids.includes(targetUserId)) {
      throw new ForbiddenException("Not allowed to view this user");
    }
  }

  private async getSelfAndDescendantIds(userId: string) {
    const users = await this.prisma.user.findMany({
      select: { id: true, parentUserId: true },
    });

    const result = new Set<string>([userId]);
    let changed = true;

    while (changed) {
      changed = false;
      for (const user of users) {
        if (user.parentUserId && result.has(user.parentUserId) && !result.has(user.id)) {
          result.add(user.id);
          changed = true;
        }
      }
    }

    return [...result];
  }

  private buildTree(rootId: string, users: TreeUser[]): TreeNode[] {
    const branch = (parentId: string): TreeNode[] =>
      users
        .filter((user) => user.parentUserId === parentId)
        .map((user) => ({
          ...user,
          children: branch(user.id),
        }));

    return branch(rootId);
  }

  private async ensureUserExists(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }
}
