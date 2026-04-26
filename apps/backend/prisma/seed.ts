import { PrismaClient } from "@prisma/client";
import {
  AnnouncementTemplateStatus,
  EventStatus,
  UserRole,
  UserStatus,
} from "@partner-hub/shared";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin", 10);

  const admin = await (prisma.user as any).upsert({
    where: { loginId: "admin" },
    update: {
      email: "admin@partnerhub.local",
      name: "관리자",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
    create: {
      loginId: "admin",
      email: "admin@partnerhub.local",
      name: "관리자",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
  });

  const categories = await Promise.all([
    (prisma as any).eventCategory.upsert({
      where: { name: "1박2일세미나" },
      update: { description: "숙박형 핵심 세미나" },
      create: { name: "1박2일세미나", description: "숙박형 핵심 세미나" },
    }),
    (prisma as any).eventCategory.upsert({
      where: { name: "세미나랠리" },
      update: { description: "순회형 세미나 프로그램" },
      create: { name: "세미나랠리", description: "순회형 세미나 프로그램" },
    }),
    (prisma as any).eventCategory.upsert({
      where: { name: "GLIC" },
      update: { description: "리더십 집중 과정" },
      create: { name: "GLIC", description: "리더십 집중 과정" },
    }),
    (prisma as any).eventCategory.upsert({
      where: { name: "해양봉사" },
      update: { description: "사회공헌 참여 프로그램" },
      create: { name: "해양봉사", description: "사회공헌 참여 프로그램" },
    }),
    (prisma as any).eventCategory.upsert({
      where: { name: "성장아카데미" },
      update: { description: "양재 성장아카데미 입교 공지" },
      create: { name: "성장아카데미", description: "양재 성장아카데미 입교 공지" },
    }),
  ]);

  const kakaoTemplate = await (prisma as any).announcementTemplate.upsert({
    where: { name: "기본 카카오 공지" },
    update: {
      description: "카카오톡 복사용 기본 템플릿",
      kakaoTemplate:
        "[{eventName}]\n카테고리: {categoryName}\n일정: {date}\n장소: {location}\n신청마감: {deadline}\n참가비: {fee}\n신청링크: {link}",
      internalTemplate:
        "{eventName}\n{categoryName}\n일정 {date}\n장소 {location}\n마감 {deadline}\n참가비 {fee}\n링크 {link}",
      status: AnnouncementTemplateStatus.ACTIVE,
      createdById: admin.id,
    },
    create: {
      name: "기본 카카오 공지",
      description: "카카오톡 복사용 기본 템플릿",
      kakaoTemplate:
        "[{eventName}]\n카테고리: {categoryName}\n일정: {date}\n장소: {location}\n신청마감: {deadline}\n참가비: {fee}\n신청링크: {link}",
      internalTemplate:
        "{eventName}\n{categoryName}\n일정 {date}\n장소 {location}\n마감 {deadline}\n참가비 {fee}\n링크 {link}",
      status: AnnouncementTemplateStatus.ACTIVE,
      createdById: admin.id,
    },
  });

  await (prisma as any).announcementTemplate.upsert({
    where: { name: "성장아카데미 양재 공지" },
    update: {
      description: "성장아카데미 양재 카카오톡 안내 템플릿",
      kakaoTemplate:
        "⭐️⭐️⭐️{eventName}⭐️⭐️⭐️\n{date}\n\n리더별로 명단 및 신청해주세요\n\n리더분들도 청강없이 입교하셔야하며\n인당 입교비는 {fee}입니다\n\n이 톡에는 명수만 적어주시고,\n명단은 서준모 사장님께 개인톡 부탁드립니다\n------------------------------\n1.\n2.\n3.\n\n------------------------------\n계좌\n3333224788038\n카카오뱅크 서준모",
      internalTemplate:
        "{eventName}\n일정: {date}\n장소: {location}\n리더별 명단 및 신청\n참가비: {fee}\n계좌: 3333224788038 / 카카오뱅크 서준모",
      status: AnnouncementTemplateStatus.ACTIVE,
      createdById: admin.id,
    },
    create: {
      name: "성장아카데미 양재 공지",
      description: "성장아카데미 양재 카카오톡 안내 템플릿",
      kakaoTemplate:
        "⭐️⭐️⭐️{eventName}⭐️⭐️⭐️\n{date}\n\n리더별로 명단 및 신청해주세요\n\n리더분들도 청강없이 입교하셔야하며\n인당 입교비는 {fee}입니다\n\n이 톡에는 명수만 적어주시고,\n명단은 서준모 사장님께 개인톡 부탁드립니다\n------------------------------\n1.\n2.\n3.\n\n------------------------------\n계좌\n3333224788038\n카카오뱅크 서준모",
      internalTemplate:
        "{eventName}\n일정: {date}\n장소: {location}\n리더별 명단 및 신청\n참가비: {fee}\n계좌: 3333224788038 / 카카오뱅크 서준모",
      status: AnnouncementTemplateStatus.ACTIVE,
      createdById: admin.id,
    },
  });

  await (prisma as any).announcementTemplate.upsert({
    where: { name: "1박2일 세미나 상세 공지" },
    update: {
      description: "1박2일 세미나 일정표형 카카오톡 안내 템플릿",
      kakaoTemplate:
        "**{eventName}**\n\n일시     {date}\n장소     {location}\n참가비  {fee}\n사회 ps오이슬\n\n첫날\n3시 ~ 4시 20분 [PD박윤설]\n\"왜 필그레이트 save10인가\"\n\n4시40분 ~ 6시 [PR서준모]\n\"다음만남을 기약하라!(실전후속)\"\n\n6시 ~ 7시    즐거운 식사\n\n7시 ~ 8시20분\n [PD김혜진]\n\"유니시티 사업이해와 보상\"\n\n8시 40분 ~ 10시\n [PS김대업]\n    \"아주작은 한땀의힘\"\n\n둘째날\n9시~9시40분 [PD여동연]\n    \"모든것은 자세에 달려있다\"\n\n9시45분 ~ 10시30분 [PR김종숙]\n\"회복탄력성\"\n\n10시50분~11시20분 [DIA]\n\"스토리 스피치\"\n\n11시 20분  \"프랜차이즈 인 스토리\"\n12시 마무리\n  점심식사 후 해산\n~~~~~~~~~~~~~~~~~~~~\n*육아동반 금지\n*술문화 자제 \n  바랍니다\n*피디이상 그룹티",
      internalTemplate:
        "{eventName}\n일시: {date}\n장소: {location}\n참가비: {fee}\n1박2일 세미나 운영 공지",
      status: AnnouncementTemplateStatus.ACTIVE,
      createdById: admin.id,
    },
    create: {
      name: "1박2일 세미나 상세 공지",
      description: "1박2일 세미나 일정표형 카카오톡 안내 템플릿",
      kakaoTemplate:
        "**{eventName}**\n\n일시     {date}\n장소     {location}\n참가비  {fee}\n사회 ps오이슬\n\n첫날\n3시 ~ 4시 20분 [PD박윤설]\n\"왜 필그레이트 save10인가\"\n\n4시40분 ~ 6시 [PR서준모]\n\"다음만남을 기약하라!(실전후속)\"\n\n6시 ~ 7시    즐거운 식사\n\n7시 ~ 8시20분\n [PD김혜진]\n\"유니시티 사업이해와 보상\"\n\n8시 40분 ~ 10시\n [PS김대업]\n    \"아주작은 한땀의힘\"\n\n둘째날\n9시~9시40분 [PD여동연]\n    \"모든것은 자세에 달려있다\"\n\n9시45분 ~ 10시30분 [PR김종숙]\n\"회복탄력성\"\n\n10시50분~11시20분 [DIA]\n\"스토리 스피치\"\n\n11시 20분  \"프랜차이즈 인 스토리\"\n12시 마무리\n  점심식사 후 해산\n~~~~~~~~~~~~~~~~~~~~\n*육아동반 금지\n*술문화 자제 \n  바랍니다\n*피디이상 그룹티",
      internalTemplate:
        "{eventName}\n일시: {date}\n장소: {location}\n참가비: {fee}\n1박2일 세미나 운영 공지",
      status: AnnouncementTemplateStatus.ACTIVE,
      createdById: admin.id,
    },
  });

  const startDate = new Date("2026-05-17T09:00:00+09:00");
  const endDate = new Date("2026-05-18T18:00:00+09:00");
  const registrationDeadline = new Date("2026-05-10T18:00:00+09:00");
  const visibilityStartAt = new Date("2026-04-20T09:00:00+09:00");
  const visibilityEndAt = new Date("2026-05-10T18:00:00+09:00");

  const event = await (prisma as any).eventAnnouncement.upsert({
    where: { id: "seed-event-seminar-2026-05" },
    update: {
      title: "2026년 5월 1박2일 세미나",
      categoryId: categories[0].id,
      description: "핵심 파트너 대상 성장 세미나",
      location: "가평 연수원",
      startDate,
      endDate,
      registrationDeadline,
      visibilityStartAt,
      visibilityEndAt,
      feePerPerson: 120000,
      popupEnabled: true,
      status: EventStatus.ACTIVE,
      createdById: admin.id,
      updatedById: admin.id,
    },
    create: {
      id: "seed-event-seminar-2026-05",
      title: "2026년 5월 1박2일 세미나",
      categoryId: categories[0].id,
      description: "핵심 파트너 대상 성장 세미나",
      location: "가평 연수원",
      startDate,
      endDate,
      registrationDeadline,
      visibilityStartAt,
      visibilityEndAt,
      feePerPerson: 120000,
      popupEnabled: true,
      status: EventStatus.ACTIVE,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  await (prisma as any).eventAnnouncement.upsert({
    where: { id: "seed-event-growth-academy-2026-04" },
    update: {
      title: "성장아카데미 양재",
      categoryId: categories[4].id,
      description: "양재 성장아카데미 입교 공지. 리더별 명단 접수와 입교비 안내용 이벤트입니다.",
      location: "양재",
      startDate: new Date("2026-04-26T14:30:00+09:00"),
      endDate: new Date("2026-05-03T17:00:00+09:00"),
      registrationDeadline: new Date("2026-04-25T18:00:00+09:00"),
      visibilityStartAt: new Date("2026-04-17T09:00:00+09:00"),
      visibilityEndAt: new Date("2026-04-25T18:00:00+09:00"),
      feePerPerson: 50000,
      popupEnabled: true,
      status: EventStatus.ACTIVE,
      createdById: admin.id,
      updatedById: admin.id,
    },
    create: {
      id: "seed-event-growth-academy-2026-04",
      title: "성장아카데미 양재",
      categoryId: categories[4].id,
      description: "양재 성장아카데미 입교 공지. 리더별 명단 접수와 입교비 안내용 이벤트입니다.",
      location: "양재",
      startDate: new Date("2026-04-26T14:30:00+09:00"),
      endDate: new Date("2026-05-03T17:00:00+09:00"),
      registrationDeadline: new Date("2026-04-25T18:00:00+09:00"),
      visibilityStartAt: new Date("2026-04-17T09:00:00+09:00"),
      visibilityEndAt: new Date("2026-04-25T18:00:00+09:00"),
      feePerPerson: 50000,
      popupEnabled: true,
      status: EventStatus.ACTIVE,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  const existingCopyLog = await (prisma as any).eventCopyLog.findFirst({
    where: {
      eventId: event.id,
      templateId: kakaoTemplate.id,
      userId: admin.id,
      channel: "KAKAO",
    },
  });

  if (!existingCopyLog) {
    await (prisma as any).eventCopyLog.create({
      data: {
        eventId: event.id,
        templateId: kakaoTemplate.id,
        userId: admin.id,
        channel: "KAKAO",
        generatedText: "[2026년 5월 1박2일 세미나]\n카테고리: 1박2일세미나",
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
