import { Injectable } from "@nestjs/common";
import { EventStatus, UserRole } from "@partner-hub/shared";
import { PrismaService } from "../prisma/prisma.service";

type RequestUser = { id: string; role: UserRole };

@Injectable()
export class EventPopupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findActivePopups(actor: RequestUser) {
    if (actor.role === UserRole.ADMIN) {
      return [];
    }

    const now = new Date();
    const accessibleIds = await this.getAccessibleUserIds(actor.id);
    const registrations = await (this.prisma as any).eventRegistration.findMany({
      where: {
        participantUserId: { in: accessibleIds },
      },
      select: { eventId: true },
    });
    const registeredEventIds = new Set(registrations.map((item: { eventId: string }) => item.eventId));

    const events = await (this.prisma as any).eventAnnouncement.findMany({
      where: {
        status: EventStatus.ACTIVE,
        popupEnabled: true,
        visibilityStartAt: { lte: now },
        visibilityEndAt: { gte: now },
      },
      include: {
        category: true,
        popupStates: {
          where: { userId: actor.id },
          take: 1,
        },
      },
      orderBy: { startDate: "asc" },
    });

    return events.filter((event: any) => {
      if (registeredEventIds.has(event.id)) {
        return false;
      }
      const popupState = event.popupStates[0];
      if (!popupState) {
        return true;
      }
      if (popupState.dismissedUntil && popupState.dismissedUntil > now) {
        return false;
      }
      return true;
    });
  }

  async markRead(eventId: string, actor: RequestUser) {
    return (this.prisma as any).eventPopupState.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: actor.id,
        },
      },
      create: {
        eventId,
        userId: actor.id,
        readAt: new Date(),
      },
      update: {
        readAt: new Date(),
      },
    });
  }

  async dismiss(eventId: string, actor: RequestUser, dismissHours = 12) {
    const dismissedUntil = new Date(Date.now() + dismissHours * 60 * 60 * 1000);
    return (this.prisma as any).eventPopupState.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: actor.id,
        },
      },
      create: {
        eventId,
        userId: actor.id,
        readAt: new Date(),
        dismissedAt: new Date(),
        dismissedUntil,
      },
      update: {
        readAt: new Date(),
        dismissedAt: new Date(),
        dismissedUntil,
      },
    });
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
