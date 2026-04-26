import { Injectable, NotFoundException } from "@nestjs/common";
import { AnnouncementTemplateStatus } from "@partner-hub/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnnouncementTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return (this.prisma as any).announcementTemplate.findMany({
      include: {
        createdBy: {
          select: { id: true, loginId: true, name: true },
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });
  }

  create(
    input: {
      name: string;
      description?: string;
      kakaoTemplate: string;
      internalTemplate: string;
      status?: AnnouncementTemplateStatus;
    },
    actorId: string,
  ) {
    return (this.prisma as any).announcementTemplate.create({
      data: {
        ...input,
        status: input.status ?? AnnouncementTemplateStatus.INACTIVE,
        createdById: actorId,
      },
    });
  }

  async update(
    id: string,
    input: {
      name?: string;
      description?: string;
      kakaoTemplate?: string;
      internalTemplate?: string;
      status?: AnnouncementTemplateStatus;
    },
  ) {
    await this.ensureExists(id);
    return (this.prisma as any).announcementTemplate.update({
      where: { id },
      data: input,
    });
  }

  activate(id: string) {
    return this.update(id, { status: AnnouncementTemplateStatus.ACTIVE });
  }

  deactivate(id: string) {
    return this.update(id, { status: AnnouncementTemplateStatus.INACTIVE });
  }

  private async ensureExists(id: string) {
    const template = await (this.prisma as any).announcementTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException("공지 템플릿을 찾을 수 없습니다.");
    }
    return template;
  }
}
