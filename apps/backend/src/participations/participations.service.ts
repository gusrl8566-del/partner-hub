import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@partner-hub/shared";
import { PrismaService } from "../prisma/prisma.service";

type RequestUser = { id: string; role: UserRole };

@Injectable()
export class ParticipationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: { userId: string; categoryId: string; occurredAt: string; quantity?: number; note?: string },
    actor: RequestUser,
  ) {
    await this.assertCanAccessUser(actor, input.userId);
    return this.prisma.participation.create({
      data: {
        userId: input.userId,
        categoryId: input.categoryId,
        occurredAt: new Date(input.occurredAt),
        quantity: input.quantity ?? 1,
        note: input.note,
      },
      include: {
        user: true,
        category: true,
      },
    });
  }

  async findAll(actor: RequestUser) {
    const where =
      actor.role === UserRole.ADMIN
        ? {}
        : {
            userId: {
              in: await this.getAccessibleUserIds(actor.id),
            },
          };

    return this.prisma.participation.findMany({
      where,
      include: {
        user: true,
        category: true,
      },
      orderBy: { occurredAt: "desc" },
    });
  }

  async remove(id: string, actor: RequestUser) {
    const participation = await this.prisma.participation.findUnique({ where: { id } });
    if (!participation) {
      throw new NotFoundException("Participation not found");
    }

    await this.assertCanAccessUser(actor, participation.userId);
    return this.prisma.participation.delete({ where: { id } });
  }

  private async assertCanAccessUser(actor: RequestUser, targetUserId: string) {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    const ids = await this.getAccessibleUserIds(actor.id);
    if (!ids.includes(targetUserId)) {
      throw new ForbiddenException("Not allowed to access this user's participation data");
    }
  }

  private async getAccessibleUserIds(rootUserId: string) {
    const users = await this.prisma.user.findMany({
      select: { id: true, parentUserId: true },
    });

    const result = new Set<string>([rootUserId]);
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
}
