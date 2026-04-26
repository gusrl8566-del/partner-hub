import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventStatus, UserRole } from "@partner-hub/shared";
import { PrismaService } from "../prisma/prisma.service";

type RequestUser = { id: string; role: UserRole };

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  findEventCategories() {
    return (this.prisma as any).eventCategory.findMany({
      orderBy: { name: "asc" },
    });
  }

  createEventCategory(input: { name: string; description?: string }) {
    return (this.prisma as any).eventCategory.create({ data: input });
  }

  async updateEventCategory(id: string, input: { name?: string; description?: string }) {
    await this.ensureEventCategory(id);
    return (this.prisma as any).eventCategory.update({
      where: { id },
      data: input,
    });
  }

  async createEvent(
    input: {
      title: string;
      categoryId: string;
      description?: string;
      location: string;
      startDate: string;
      endDate: string;
      registrationDeadline: string;
      visibilityStartAt: string;
      visibilityEndAt: string;
      feePerPerson: number;
      popupEnabled: boolean;
      status?: EventStatus;
    },
    actor: RequestUser,
  ) {
    await this.ensureEventCategory(input.categoryId);
    this.validateEventDates(input);

    return (this.prisma as any).eventAnnouncement.create({
      data: {
        title: input.title,
        categoryId: input.categoryId,
        description: input.description,
        location: input.location,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        registrationDeadline: new Date(input.registrationDeadline),
        visibilityStartAt: new Date(input.visibilityStartAt),
        visibilityEndAt: new Date(input.visibilityEndAt),
        feePerPerson: input.feePerPerson,
        popupEnabled: input.popupEnabled,
        status: input.status ?? EventStatus.DRAFT,
        createdById: actor.id,
        updatedById: actor.id,
      },
      include: this.eventInclude(),
    });
  }

  async updateEvent(
    id: string,
    input: {
      title?: string;
      categoryId?: string;
      description?: string;
      location?: string;
      startDate?: string;
      endDate?: string;
      registrationDeadline?: string;
      visibilityStartAt?: string;
      visibilityEndAt?: string;
      feePerPerson?: number;
      popupEnabled?: boolean;
      status?: EventStatus;
    },
    actor: RequestUser,
  ) {
    const existing = await this.ensureEvent(id);
    if (input.categoryId) {
      await this.ensureEventCategory(input.categoryId);
    }

    this.validateEventDates({
      startDate: input.startDate ?? existing.startDate.toISOString(),
      endDate: input.endDate ?? existing.endDate.toISOString(),
      registrationDeadline: input.registrationDeadline ?? existing.registrationDeadline.toISOString(),
      visibilityStartAt: input.visibilityStartAt ?? existing.visibilityStartAt.toISOString(),
      visibilityEndAt: input.visibilityEndAt ?? existing.visibilityEndAt.toISOString(),
    });

    return (this.prisma as any).eventAnnouncement.update({
      where: { id },
      data: {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        registrationDeadline: input.registrationDeadline ? new Date(input.registrationDeadline) : undefined,
        visibilityStartAt: input.visibilityStartAt ? new Date(input.visibilityStartAt) : undefined,
        visibilityEndAt: input.visibilityEndAt ? new Date(input.visibilityEndAt) : undefined,
        updatedById: actor.id,
      },
      include: this.eventInclude(),
    });
  }

  async findEvents(actor: RequestUser) {
    const now = new Date();

    if (actor.role === UserRole.ADMIN) {
      return (this.prisma as any).eventAnnouncement.findMany({
        include: this.eventInclude(),
        orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
      });
    }

    return (this.prisma as any).eventAnnouncement.findMany({
      where: {
        status: { in: [EventStatus.ACTIVE, EventStatus.CLOSED] },
        visibilityStartAt: { lte: now },
        visibilityEndAt: { gte: now },
      },
      include: this.eventInclude(),
      orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    });
  }

  async findEvent(id: string, actor: RequestUser) {
    const event = await this.ensureEvent(id);
    await this.assertCanViewEvent(event, actor);

    return (this.prisma as any).eventAnnouncement.findUnique({
      where: { id },
      include: {
        ...this.eventInclude(),
        popupStates: actor.role === UserRole.ADMIN ? false : {
          where: { userId: actor.id },
        },
        registrations: {
          include: {
            participantUser: {
              select: { id: true, loginId: true, name: true, parentUserId: true },
            },
            createdByUser: {
              select: { id: true, loginId: true, name: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async generateCopy(
    eventId: string,
    input: { templateId: string; channel: string; link?: string },
    actor: RequestUser,
  ) {
    const [event, template] = await Promise.all([
      this.ensureEvent(eventId),
      (this.prisma as any).announcementTemplate.findUnique({ where: { id: input.templateId } }),
    ]);

    if (!template) {
      throw new NotFoundException("공지 템플릿을 찾을 수 없습니다.");
    }

    const text = this.renderTemplate(
      input.channel === "KAKAO" ? template.kakaoTemplate : template.internalTemplate,
      {
        eventName: event.title,
        categoryName: (await this.ensureEventCategory(event.categoryId)).name,
        date: this.formatDateRange(event.startDate, event.endDate),
        location: event.location,
        deadline: this.formatDate(event.registrationDeadline),
        fee: `${event.feePerPerson.toLocaleString("ko-KR")}원`,
        link: input.link ?? "",
      },
    );

    const log = await (this.prisma as any).eventCopyLog.create({
      data: {
        eventId,
        templateId: template.id,
        userId: actor.id,
        channel: input.channel,
        generatedText: text,
      },
      include: {
        user: { select: { id: true, loginId: true, name: true } },
        template: { select: { id: true, name: true } },
      },
    });

    return {
      channel: input.channel,
      text,
      log,
    };
  }

  async getCopyLogs(eventId: string) {
    await this.ensureEvent(eventId);
    return (this.prisma as any).eventCopyLog.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, loginId: true, name: true } },
        template: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createRegistrations(
    eventId: string,
    input: { participantUserIds: string[]; note?: string },
    actor: RequestUser,
  ) {
    const event = await this.ensureEvent(eventId);
    await this.assertRegistrationAllowed(event);

    const uniqueParticipantIds = [...new Set(input.participantUserIds)];
    const allowedIds = actor.role === UserRole.ADMIN ? uniqueParticipantIds : await this.getAccessibleUserIds(actor.id);
    if (actor.role !== UserRole.ADMIN) {
      for (const participantUserId of uniqueParticipantIds) {
        if (!allowedIds.includes(participantUserId)) {
          throw new ForbiddenException("본인 또는 하위 조직 사용자만 등록할 수 있습니다.");
        }
      }
    }

    const existing = await (this.prisma as any).eventRegistration.findMany({
      where: {
        eventId,
        participantUserId: { in: uniqueParticipantIds },
      },
      select: { participantUserId: true },
    });
    if (existing.length) {
      throw new BadRequestException("이미 등록된 참여자가 포함되어 있습니다.");
    }

    await (this.prisma as any).eventRegistration.createMany({
      data: uniqueParticipantIds.map((participantUserId) => ({
        eventId,
        createdByUserId: actor.id,
        participantUserId,
        note: input.note,
      })),
    });

    return this.getEventSummary(eventId, actor);
  }

  async replaceRegistrations(
    eventId: string,
    input: { participantUserIds: string[]; note?: string },
    actor: RequestUser,
  ) {
    const event = await this.ensureEvent(eventId);
    await this.assertRegistrationAllowed(event);
    const allowedIds = actor.role === UserRole.ADMIN ? null : await this.getAccessibleUserIds(actor.id);
    const nextIds = [...new Set(input.participantUserIds)];

    if (allowedIds) {
      for (const participantUserId of nextIds) {
        if (!allowedIds.includes(participantUserId)) {
          throw new ForbiddenException("본인 또는 하위 조직 사용자만 등록할 수 있습니다.");
        }
      }
    }

    const current = await (this.prisma as any).eventRegistration.findMany({
      where: actor.role === UserRole.ADMIN
        ? { eventId }
        : {
            eventId,
            participantUserId: { in: allowedIds ?? [] },
          },
      select: { id: true, participantUserId: true },
    });

    const currentIds = current.map((entry: { participantUserId: string }) => entry.participantUserId);
    const deleteIds = current.filter((entry: { id: string; participantUserId: string }) => !nextIds.includes(entry.participantUserId)).map((entry: { id: string }) => entry.id);
    const addIds = nextIds.filter((participantUserId) => !currentIds.includes(participantUserId));

    const duplicates = await (this.prisma as any).eventRegistration.findMany({
      where: {
        eventId,
        participantUserId: { in: addIds },
      },
      select: { participantUserId: true },
    });
    if (duplicates.length) {
      throw new BadRequestException("이미 등록된 참여자가 포함되어 있습니다.");
    }

    await this.prisma.$transaction([
      ...(deleteIds.length
        ? [(this.prisma as any).eventRegistration.deleteMany({ where: { id: { in: deleteIds } } })]
        : []),
      ...(addIds.length
        ? [
            (this.prisma as any).eventRegistration.createMany({
              data: addIds.map((participantUserId) => ({
                eventId,
                createdByUserId: actor.id,
                participantUserId,
                note: input.note,
              })),
            }),
          ]
        : []),
    ]);

    return this.getEventSummary(eventId, actor);
  }

  async removeRegistration(eventId: string, registrationId: string, actor: RequestUser) {
    const registration = await (this.prisma as any).eventRegistration.findUnique({
      where: { id: registrationId },
    });
    if (!registration || registration.eventId !== eventId) {
      throw new NotFoundException("이벤트 참여 등록을 찾을 수 없습니다.");
    }

    if (actor.role !== UserRole.ADMIN) {
      const allowedIds = await this.getAccessibleUserIds(actor.id);
      if (!allowedIds.includes(registration.participantUserId)) {
        throw new ForbiddenException("본인 또는 하위 조직 등록만 취소할 수 있습니다.");
      }
    }

    await (this.prisma as any).eventRegistration.delete({ where: { id: registrationId } });
    return { success: true };
  }

  async getEventSummary(eventId: string, actor: RequestUser) {
    const event = await this.ensureEvent(eventId);
    await this.assertCanViewEvent(event, actor);

    const registrations = await (this.prisma as any).eventRegistration.findMany({
      where: { eventId },
      include: {
        participantUser: {
          select: { id: true, loginId: true, name: true, parentUserId: true },
        },
        createdByUser: {
          select: { id: true, loginId: true, name: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const accessibleIds = actor.role === UserRole.ADMIN ? null : await this.getAccessibleUserIds(actor.id);
    const myIds = actor.role === UserRole.ADMIN ? [] : [actor.id];
    const descendantIds = actor.role === UserRole.ADMIN
      ? []
      : (accessibleIds ?? []).filter((id) => id !== actor.id);

    const myRegistrations = registrations.filter((item: any) => myIds.includes(item.participantUserId));
    const descendantRegistrations = registrations.filter((item: any) => descendantIds.includes(item.participantUserId));
    const visibleRegistrations = accessibleIds
      ? registrations.filter((item: any) => accessibleIds.includes(item.participantUserId))
      : registrations;

    const userSummaryMap = new Map<
      string,
      {
        userId: string;
        loginId: string;
        name: string;
        participantCount: number;
        expectedAmount: number;
      }
    >();

    for (const registration of visibleRegistrations as any[]) {
      const keyUser = registration.createdByUser;
      const current = userSummaryMap.get(keyUser.id) ?? {
        userId: keyUser.id,
        loginId: keyUser.loginId,
        name: keyUser.name,
        participantCount: 0,
        expectedAmount: 0,
      };
      current.participantCount += 1;
      current.expectedAmount += event.feePerPerson;
      userSummaryMap.set(keyUser.id, current);
    }

    return {
      eventId,
      myRegisteredCount: myRegistrations.length,
      myExpectedTotalAmount: myRegistrations.length * event.feePerPerson,
      descendantRegisteredCount: descendantRegistrations.length,
      descendantExpectedTotalAmount: descendantRegistrations.length * event.feePerPerson,
      totalParticipantCount: registrations.length,
      totalExpectedAmount: registrations.length * event.feePerPerson,
      feePerPerson: event.feePerPerson,
      registrations: visibleRegistrations,
      userSummaries: [...userSummaryMap.values()],
    };
  }

  private async assertCanViewEvent(
    event: {
      status: EventStatus;
      visibilityStartAt: Date;
      visibilityEndAt: Date;
    },
    actor: RequestUser,
  ) {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    const now = new Date();
    const visible =
      [EventStatus.ACTIVE, EventStatus.CLOSED].includes(event.status) &&
      event.visibilityStartAt <= now &&
      event.visibilityEndAt >= now;
    if (!visible) {
      throw new ForbiddenException("현재 조회할 수 없는 이벤트입니다.");
    }
  }

  private async assertRegistrationAllowed(event: {
    status: EventStatus;
    registrationDeadline: Date;
  }) {
    if (event.status !== EventStatus.ACTIVE) {
      throw new BadRequestException("등록 가능한 상태의 이벤트가 아닙니다.");
    }

    if (event.registrationDeadline < new Date()) {
      throw new BadRequestException("등록 마감된 이벤트입니다.");
    }
  }

  private validateEventDates(input: {
    startDate: string;
    endDate: string;
    registrationDeadline: string;
    visibilityStartAt: string;
    visibilityEndAt: string;
  }) {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    const registrationDeadline = new Date(input.registrationDeadline);
    const visibilityStartAt = new Date(input.visibilityStartAt);
    const visibilityEndAt = new Date(input.visibilityEndAt);

    if (endDate < startDate) {
      throw new BadRequestException("종료일은 시작일보다 빠를 수 없습니다.");
    }
    if (registrationDeadline > startDate) {
      throw new BadRequestException("등록 마감일은 시작일보다 늦을 수 없습니다.");
    }
    if (visibilityEndAt < visibilityStartAt) {
      throw new BadRequestException("노출 종료일은 노출 시작일보다 빠를 수 없습니다.");
    }
  }

  private renderTemplate(template: string, variables: Record<string, string>) {
    return Object.entries(variables).reduce((text, [key, value]) => {
      return text.replaceAll(`{${key}}`, value);
    }, template);
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

  private formatDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  private formatDateRange(startDate: Date, endDate: Date) {
    return `${this.formatDate(startDate)} ~ ${this.formatDate(endDate)}`;
  }

  private async ensureEvent(id: string) {
    const event = await (this.prisma as any).eventAnnouncement.findUnique({
      where: { id },
      include: this.eventInclude(),
    });

    if (!event) {
      throw new NotFoundException("이벤트를 찾을 수 없습니다.");
    }

    return event;
  }

  private async ensureEventCategory(id: string) {
    const category = await (this.prisma as any).eventCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException("이벤트 카테고리를 찾을 수 없습니다.");
    }
    return category;
  }

  private eventInclude() {
    return {
      category: true,
      createdBy: {
        select: { id: true, loginId: true, name: true },
      },
      updatedBy: {
        select: { id: true, loginId: true, name: true },
      },
      _count: {
        select: { registrations: true, copyLogs: true },
      },
    } as const;
  }
}
