"use client";

type UserRole = "ADMIN" | "PARTNER";
type UserStatus = "PENDING" | "ACTIVE" | "BLOCKED";
type TemplateStatus = "ACTIVE" | "INACTIVE";
type EventStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";

type MockUser = {
  id: string;
  loginId: string;
  email: string | null;
  name: string;
  role: UserRole;
  status: UserStatus;
  parentUserId: string | null;
  password?: string | null;
  inviteCode?: string | null;
};

type MockCategory = {
  id: string;
  name: string;
  description: string | null;
};

type MockParticipation = {
  id: string;
  userId: string;
  categoryId: string;
  occurredAt: string;
  note: string | null;
};

type MockAnnouncementTemplate = {
  id: string;
  name: string;
  description: string | null;
  kakaoTemplate: string;
  internalTemplate: string;
  status: TemplateStatus;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

type MockEventCategory = {
  id: string;
  name: string;
  description: string | null;
};

type MockEvent = {
  id: string;
  title: string;
  categoryId: string;
  description: string | null;
  location: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  visibilityStartAt: string;
  visibilityEndAt: string;
  feePerPerson: number;
  popupEnabled: boolean;
  status: EventStatus;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
};

type MockEventCopyLog = {
  id: string;
  eventId: string;
  templateId: string;
  userId: string;
  channel: string;
  generatedText: string;
  action: string;
  createdAt: string;
};

type MockEventPopupState = {
  id: string;
  eventId: string;
  userId: string;
  readAt: string | null;
  dismissedAt: string | null;
  dismissedUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

type MockEventRegistration = {
  id: string;
  eventId: string;
  createdByUserId: string;
  participantUserId: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type MockDb = {
  users: MockUser[];
  categories: MockCategory[];
  participations: MockParticipation[];
  announcementTemplates: MockAnnouncementTemplate[];
  eventCategories: MockEventCategory[];
  events: MockEvent[];
  eventCopyLogs: MockEventCopyLog[];
  eventPopupStates: MockEventPopupState[];
  eventRegistrations: MockEventRegistration[];
};

const KEY = "partner-hub-mock-db";
const VERSION_KEY = "partner-hub-mock-db-version";
const SESSION_KEY = "partner-hub-session";
const DB_VERSION = "v9";

function monthsAgo(months: number, day: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months, day);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

function daysFromNow(days: number, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getNowIso() {
  return new Date().toISOString();
}

function buildGroupUsers(groupId: string, groupLoginId: string, groupName: string, members: string[], blockedIndex?: number) {
  return [
    {
      id: groupId,
      loginId: groupLoginId,
      email: null,
      name: groupName,
      role: "PARTNER" as const,
      status: "ACTIVE" as const,
      parentUserId: null,
      password: "1234qwer",
      inviteCode: null,
    },
    ...members.map((name, index) => {
      const level1Id = `${groupId}-m-${index + 1}`;
      const level2Parent = index >= 6 ? `${groupId}-m-${(index % 3) + 1}` : groupId;

      return {
        id: level1Id,
        loginId: `${groupLoginId}-${String(index + 1).padStart(2, "0")}`,
        email: null,
        name,
        role: "PARTNER" as const,
        status:
          blockedIndex === index ? "BLOCKED" as const : index === members.length - 1 ? "PENDING" as const : "ACTIVE" as const,
        parentUserId: level2Parent,
        password: index === members.length - 1 ? null : "1234qwer",
        inviteCode: index === members.length - 1 ? "1234QWER" : null,
      };
    }),
  ];
}

function initialDb(): MockDb {
  const createdAt = getNowIso();
  const groupAUsers = buildGroupUsers("u-group-a", "group-a", "A그룹", [
    "김민수 파트너",
    "이서연 파트너",
    "박준호 파트너",
    "최유진 파트너",
    "정하늘 파트너",
    "윤도현 파트너",
    "한지민 파트너",
    "서민재 파트너",
    "임수빈 파트너",
    "조현우 파트너",
  ]);

  const groupBUsers = buildGroupUsers("u-group-b", "group-b", "B그룹", [
    "오세훈 파트너",
    "문가은 파트너",
    "홍지후 파트너",
    "강다은 파트너",
    "배지훈 파트너",
    "송예린 파트너",
    "노승민 파트너",
    "차유나 파트너",
    "장도윤 파트너",
    "백하린 파트너",
  ], 4);

  const groupCUsers = buildGroupUsers("u-group-c", "group-c", "C그룹", [
    "유태성 파트너",
    "나수아 파트너",
    "주민석 파트너",
    "안채원 파트너",
    "신도윤 파트너",
    "류서하 파트너",
    "고민재 파트너",
    "진예나 파트너",
    "권시우 파트너",
    "황다인 파트너",
  ]);

  return {
    users: [
      {
        id: "u-admin",
        loginId: "admin",
        email: null,
        name: "관리자",
        role: "ADMIN",
        status: "ACTIVE",
        parentUserId: null,
        password: "admin",
        inviteCode: null,
      },
      ...groupAUsers,
      ...groupBUsers,
      ...groupCUsers,
    ],
    categories: [
      { id: "c-1", name: "세미나", description: "교육 및 설명회" },
      { id: "c-2", name: "캠페인", description: "홍보 및 모집 활동" },
      { id: "c-3", name: "상담", description: "1:1 상담 및 응대" },
      { id: "c-4", name: "행사", description: "오프라인 행사 및 모임" },
    ],
    participations: [
      { id: "p-1", userId: "u-group-a", categoryId: "c-1", occurredAt: monthsAgo(0, 5), note: "월간 세미나" },
      { id: "p-2", userId: "u-group-a-m-1", categoryId: "c-2", occurredAt: monthsAgo(0, 12), note: "신규 캠페인 진행" },
      { id: "p-3", userId: "u-group-a-m-2", categoryId: "c-3", occurredAt: monthsAgo(0, 18), note: "상담 집중 주간" },
      { id: "p-4", userId: "u-group-a-m-7", categoryId: "c-1", occurredAt: monthsAgo(1, 8), note: "하위조직 세미나" },
      { id: "p-5", userId: "u-group-b", categoryId: "c-4", occurredAt: monthsAgo(1, 15), note: "부산 지역 행사" },
      { id: "p-6", userId: "u-group-b-m-5", categoryId: "c-2", occurredAt: monthsAgo(2, 7), note: "이전 캠페인 기록" },
      { id: "p-7", userId: "u-group-b-m-8", categoryId: "c-4", occurredAt: monthsAgo(2, 21), note: "잠실 행사 운영" },
      { id: "p-8", userId: "u-group-c", categoryId: "c-1", occurredAt: monthsAgo(3, 9), note: "부산 세미나" },
      { id: "p-9", userId: "u-group-c-m-3", categoryId: "c-3", occurredAt: monthsAgo(3, 19), note: "서울 상담회" },
      { id: "p-10", userId: "u-group-c-m-9", categoryId: "c-2", occurredAt: monthsAgo(4, 11), note: "잠실 캠페인" },
      { id: "p-11", userId: "u-group-a-m-4", categoryId: "c-4", occurredAt: monthsAgo(1, 24), note: "A그룹 행사 운영" },
      { id: "p-12", userId: "u-group-b-m-2", categoryId: "c-1", occurredAt: monthsAgo(2, 12), note: "B그룹 세미나" },
      { id: "p-13", userId: "u-group-c-m-6", categoryId: "c-4", occurredAt: monthsAgo(0, 22), note: "C그룹 현장 행사" },
      { id: "p-14", userId: "u-group-a-m-3", categoryId: "c-1", occurredAt: monthsAgo(0, 9), note: "A그룹 주간 세미나" },
      { id: "p-15", userId: "u-group-a-m-5", categoryId: "c-2", occurredAt: monthsAgo(0, 16), note: "가을 캠페인 리드" },
      { id: "p-16", userId: "u-group-b-m-1", categoryId: "c-3", occurredAt: monthsAgo(0, 20), note: "집중 상담" },
      { id: "p-17", userId: "u-group-c-m-2", categoryId: "c-4", occurredAt: monthsAgo(0, 27), note: "현장 행사 지원" },

      { id: "p-18", userId: "u-group-a", categoryId: "c-2", occurredAt: monthsAgo(1, 3), note: "월초 캠페인" },
      { id: "p-19", userId: "u-group-a-m-2", categoryId: "c-2", occurredAt: monthsAgo(1, 11), note: "추천인 모집" },
      { id: "p-20", userId: "u-group-b", categoryId: "c-1", occurredAt: monthsAgo(1, 17), note: "지역 세미나" },
      { id: "p-21", userId: "u-group-c-m-4", categoryId: "c-3", occurredAt: monthsAgo(1, 26), note: "신규 상담" },

      { id: "p-22", userId: "u-group-a-m-6", categoryId: "c-4", occurredAt: monthsAgo(2, 5), note: "오프라인 행사" },
      { id: "p-23", userId: "u-group-b-m-3", categoryId: "c-1", occurredAt: monthsAgo(2, 10), note: "제품 세미나" },
      { id: "p-24", userId: "u-group-b-m-7", categoryId: "c-2", occurredAt: monthsAgo(2, 16), note: "거리 캠페인" },
      { id: "p-25", userId: "u-group-c", categoryId: "c-4", occurredAt: monthsAgo(2, 23), note: "센터 행사" },
      { id: "p-26", userId: "u-group-c-m-8", categoryId: "c-3", occurredAt: monthsAgo(2, 28), note: "사후 상담" },

      { id: "p-27", userId: "u-group-a-m-7", categoryId: "c-3", occurredAt: monthsAgo(3, 4), note: "후속 상담" },
      { id: "p-28", userId: "u-group-b", categoryId: "c-2", occurredAt: monthsAgo(3, 8), note: "리쿠르팅 캠페인" },
      { id: "p-29", userId: "u-group-b-m-6", categoryId: "c-4", occurredAt: monthsAgo(3, 14), note: "현장 모임" },
      { id: "p-30", userId: "u-group-c-m-1", categoryId: "c-1", occurredAt: monthsAgo(3, 22), note: "비즈니스 세미나" },
      { id: "p-31", userId: "u-group-c-m-5", categoryId: "c-1", occurredAt: monthsAgo(3, 27), note: "제품 체험 세미나" },

      { id: "p-32", userId: "u-group-a", categoryId: "c-4", occurredAt: monthsAgo(4, 6), note: "월간 행사" },
      { id: "p-33", userId: "u-group-a-m-8", categoryId: "c-3", occurredAt: monthsAgo(4, 12), note: "리더 상담" },
      { id: "p-34", userId: "u-group-b-m-9", categoryId: "c-2", occurredAt: monthsAgo(4, 18), note: "거리 홍보" },
      { id: "p-35", userId: "u-group-c", categoryId: "c-1", occurredAt: monthsAgo(4, 25), note: "월말 세미나" },

      { id: "p-36", userId: "u-group-a-m-1", categoryId: "c-2", occurredAt: monthsAgo(5, 2), note: "초기 캠페인" },
      { id: "p-37", userId: "u-group-b", categoryId: "c-3", occurredAt: monthsAgo(5, 9), note: "회복 상담" },
      { id: "p-38", userId: "u-group-b-m-4", categoryId: "c-1", occurredAt: monthsAgo(5, 16), note: "성장 세미나" },
      { id: "p-39", userId: "u-group-c-m-7", categoryId: "c-4", occurredAt: monthsAgo(5, 21), note: "지역 행사" },
      { id: "p-40", userId: "u-group-c-m-10", categoryId: "c-2", occurredAt: monthsAgo(5, 29), note: "마감 캠페인" },

      { id: "p-41", userId: "u-group-a-m-9", categoryId: "c-1", occurredAt: monthsAgo(6, 7), note: "집중 세미나" },
      { id: "p-42", userId: "u-group-a-m-10", categoryId: "c-4", occurredAt: monthsAgo(6, 15), note: "팀 행사" },
      { id: "p-43", userId: "u-group-b-m-1", categoryId: "c-2", occurredAt: monthsAgo(6, 20), note: "신규 모집" },
      { id: "p-44", userId: "u-group-c-m-3", categoryId: "c-3", occurredAt: monthsAgo(6, 26), note: "후속 코칭" },

      { id: "p-45", userId: "u-group-a", categoryId: "c-2", occurredAt: monthsAgo(7, 5), note: "대형 캠페인" },
      { id: "p-46", userId: "u-group-b-m-8", categoryId: "c-4", occurredAt: monthsAgo(7, 13), note: "오픈 행사" },
      { id: "p-47", userId: "u-group-c", categoryId: "c-1", occurredAt: monthsAgo(7, 19), note: "중형 세미나" },
      { id: "p-48", userId: "u-group-c-m-2", categoryId: "c-3", occurredAt: monthsAgo(7, 24), note: "상담 지원" },

      { id: "p-49", userId: "u-group-a-m-4", categoryId: "c-3", occurredAt: monthsAgo(8, 8), note: "리더 코칭" },
      { id: "p-50", userId: "u-group-b", categoryId: "c-1", occurredAt: monthsAgo(8, 14), note: "제품 설명 세미나" },
      { id: "p-51", userId: "u-group-b-m-6", categoryId: "c-2", occurredAt: monthsAgo(8, 20), note: "확장 캠페인" },
      { id: "p-52", userId: "u-group-c-m-4", categoryId: "c-4", occurredAt: monthsAgo(8, 27), note: "하반기 행사" },
    ],
    announcementTemplates: [
      {
        id: "tpl-kakao-default",
        name: "기본 카카오 공지",
        description: "카카오톡 공유용 기본 문안",
        kakaoTemplate:
          "[{eventName}]\n카테고리: {categoryName}\n일정: {date}\n장소: {location}\n신청마감: {deadline}\n참가비: {fee}\n신청링크: {link}",
        internalTemplate:
          "{eventName}\n카테고리: {categoryName}\n일정: {date}\n장소: {location}\n신청마감: {deadline}\n참가비: {fee}\n링크: {link}",
        status: "ACTIVE",
        createdById: "u-admin",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "tpl-kakao-short",
        name: "짧은 공지형",
        description: "간단 공유 메시지",
        kakaoTemplate:
          "{eventName}\n{date}\n{location}\n신청마감 {deadline}\n참가비 {fee}\n{link}",
        internalTemplate:
          "{eventName}\n{categoryName}\n{date}\n{location}\n마감 {deadline}\n{fee}\n{link}",
        status: "INACTIVE",
        createdById: "u-admin",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "tpl-kakao-growth-academy",
        name: "성장아카데미 양재 공지",
        description: "성장아카데미 양재 카카오톡 안내 템플릿",
        kakaoTemplate:
          "⭐️⭐️⭐️{eventName}⭐️⭐️⭐️\n{date}\n\n리더별로 명단 및 신청해주세요\n\n리더분들도 청강없이 입교하셔야하며\n인당 입교비는 {fee}입니다\n\n이 톡에는 명수만 적어주시고,\n명단은 서준모 사장님께 개인톡 부탁드립니다\n------------------------------\n1.\n2.\n3.\n\n------------------------------\n계좌\n3333224788038\n카카오뱅크 서준모",
        internalTemplate:
          "{eventName}\n일정: {date}\n장소: {location}\n리더별 명단 및 신청\n참가비: {fee}\n계좌: 3333224788038 / 카카오뱅크 서준모",
        status: "ACTIVE",
        createdById: "u-admin",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "tpl-kakao-megaworld-seminar",
        name: "1박2일 세미나 상세 공지",
        description: "1박2일 세미나 일정표형 카카오톡 안내 템플릿",
        kakaoTemplate:
          "**{eventName}**\n\n일시     {date}\n장소     {location}\n참가비  {fee}\n사회 ps오이슬\n\n첫날\n3시 ~ 4시 20분 [PD박윤설]\n\"왜 필그레이트 save10인가\"\n\n4시40분 ~ 6시 [PR서준모]\n\"다음만남을 기약하라!(실전후속)\"\n\n6시 ~ 7시    즐거운 식사\n\n7시 ~ 8시20분\n [PD김혜진]\n\"유니시티 사업이해와 보상\"\n\n8시 40분 ~ 10시\n [PS김대업]\n    \"아주작은 한땀의힘\"\n\n둘째날\n9시~9시40분 [PD여동연]\n    \"모든것은 자세에 달려있다\"\n\n9시45분 ~ 10시30분 [PR김종숙]\n\"회복탄력성\"\n\n10시50분~11시20분 [DIA]\n\"스토리 스피치\"\n\n11시 20분  \"프랜차이즈 인 스토리\"\n12시 마무리\n  점심식사 후 해산\n~~~~~~~~~~~~~~~~~~~~\n*육아동반 금지\n*술문화 자제 \n  바랍니다\n*피디이상 그룹티",
        internalTemplate:
          "{eventName}\n일시: {date}\n장소: {location}\n참가비: {fee}\n1박2일 세미나 운영 공지",
        status: "ACTIVE",
        createdById: "u-admin",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    eventCategories: [
      { id: "ec-1", name: "1박2일세미나", description: "숙박형 집중 세미나" },
      { id: "ec-2", name: "세미나랠리", description: "순회형 설명회" },
      { id: "ec-3", name: "GLIC", description: "리더십 집중 과정" },
      { id: "ec-4", name: "해양봉사", description: "사회공헌 활동" },
      { id: "ec-5", name: "PCM골프", description: "네트워킹 골프 프로그램" },
      { id: "ec-6", name: "메소드", description: "운영 메소드 교육" },
      { id: "ec-7", name: "PMC", description: "핵심 관리자 과정" },
      { id: "ec-8", name: "홈미팅", description: "소규모 홈 설명회" },
      { id: "ec-9", name: "성장아카데미", description: "양재 성장아카데미 입교 공지" },
    ],
    events: [
      {
        id: "evt-growth-academy-2026-04",
        title: "성장아카데미 양재",
        categoryId: "ec-9",
        description: "양재 성장아카데미 입교 공지. 리더별 명단 접수와 입교비 안내용 이벤트입니다.",
        location: "양재",
        startDate: "2026-04-26T14:30:00+09:00",
        endDate: "2026-05-03T17:00:00+09:00",
        registrationDeadline: "2026-04-25T18:00:00+09:00",
        visibilityStartAt: "2026-04-17T09:00:00+09:00",
        visibilityEndAt: "2026-04-25T18:00:00+09:00",
        feePerPerson: 50000,
        popupEnabled: true,
        status: "ACTIVE",
        createdById: "u-admin",
        updatedById: "u-admin",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "evt-1",
        title: "2026년 5월 1박2일 세미나",
        categoryId: "ec-1",
        description: "핵심 파트너 대상 성장 세미나",
        location: "가평 연수원",
        startDate: daysFromNow(16, 9),
        endDate: daysFromNow(17, 18),
        registrationDeadline: daysFromNow(10, 18),
        visibilityStartAt: daysFromNow(-2, 9),
        visibilityEndAt: daysFromNow(10, 18),
        feePerPerson: 120000,
        popupEnabled: true,
        status: "ACTIVE",
        createdById: "u-admin",
        updatedById: "u-admin",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "evt-2",
        title: "2026년 5월 부산 세미나랠리",
        categoryId: "ec-2",
        description: "부산 지역 순회형 설명회",
        location: "부산 컨벤션홀",
        startDate: daysFromNow(8, 14),
        endDate: daysFromNow(8, 18),
        registrationDeadline: daysFromNow(5, 18),
        visibilityStartAt: daysFromNow(-1, 9),
        visibilityEndAt: daysFromNow(5, 18),
        feePerPerson: 35000,
        popupEnabled: true,
        status: "ACTIVE",
        createdById: "u-admin",
        updatedById: "u-admin",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "evt-3",
        title: "2026년 6월 GLIC 사전 모집",
        categoryId: "ec-3",
        description: "다음 달 리더십 과정 사전 접수",
        location: "서울 강남센터",
        startDate: daysFromNow(36, 10),
        endDate: daysFromNow(37, 17),
        registrationDeadline: daysFromNow(26, 18),
        visibilityStartAt: daysFromNow(3, 9),
        visibilityEndAt: daysFromNow(26, 18),
        feePerPerson: 180000,
        popupEnabled: false,
        status: "DRAFT",
        createdById: "u-admin",
        updatedById: "u-admin",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    eventCopyLogs: [
      {
        id: "copy-1",
        eventId: "evt-1",
        templateId: "tpl-kakao-default",
        userId: "u-admin",
        channel: "KAKAO",
        generatedText: "[2026년 5월 1박2일 세미나]\n카테고리: 1박2일세미나",
        action: "GENERATED",
        createdAt: createdAt,
      },
      {
        id: "copy-growth-1",
        eventId: "evt-growth-academy-2026-04",
        templateId: "tpl-kakao-growth-academy",
        userId: "u-admin",
        channel: "KAKAO",
        generatedText:
          "⭐️⭐️⭐️성장아카데미 양재⭐️⭐️⭐️\n4.26(일) | 5.3(일) : 오후 2시 30분\n\n리더별로 명단 및 신청해주세요\n\n리더분들도 청강없이 입교하셔야하며\n인당 입교비는 5만원입니다\n\n이 톡에는 명수만 적어주시고,\n명단은 서준모 사장님께 개인톡 부탁드립니다\n------------------------------\n1.\n2.\n3.\n\n------------------------------\n계좌\n3333224788038\n카카오뱅크 서준모",
        action: "GENERATED",
        createdAt: createdAt,
      },
    ],
    eventPopupStates: [
      {
        id: "popup-1",
        eventId: "evt-2",
        userId: "u-group-a",
        readAt: daysFromNow(-1, 12),
        dismissedAt: daysFromNow(-1, 12),
        dismissedUntil: daysFromNow(1, 12),
        createdAt,
        updatedAt: createdAt,
      },
    ],
    eventRegistrations: [
      {
        id: "reg-1",
        eventId: "evt-1",
        createdByUserId: "u-group-a",
        participantUserId: "u-group-a",
        note: "그룹 대표 참석",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "reg-2",
        eventId: "evt-1",
        createdByUserId: "u-group-a",
        participantUserId: "u-group-a-m-1",
        note: "핵심 파트너",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "reg-3",
        eventId: "evt-2",
        createdByUserId: "u-group-b",
        participantUserId: "u-group-b-m-2",
        note: null,
        createdAt,
        updatedAt: createdAt,
      },
    ],
  };
}

function loadDb(): MockDb {
  if (typeof window === "undefined") {
    return initialDb();
  }

  const raw = window.localStorage.getItem(KEY);
  const version = window.localStorage.getItem(VERSION_KEY);
  if (!raw || version !== DB_VERSION) {
    const seed = initialDb();
    window.localStorage.setItem(KEY, JSON.stringify(seed));
    window.localStorage.setItem(VERSION_KEY, DB_VERSION);
    return seed;
  }

  return JSON.parse(raw) as MockDb;
}

function saveDb(db: MockDb) {
  window.localStorage.setItem(KEY, JSON.stringify(db));
}

function getActor(db: MockDb) {
  if (typeof window === "undefined") return db.users[0];
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return db.users[0];

  try {
    const session = JSON.parse(raw) as { user?: { id?: string } };
    return db.users.find((user) => user.id === session.user?.id) ?? db.users[0];
  } catch {
    return db.users[0];
  }
}

function descendants(db: MockDb, rootId: string) {
  type DescendantNode = MockUser & { children: DescendantNode[] };

  const branch = (parentId: string): DescendantNode[] =>
    db.users
      .filter((user) => user.parentUserId === parentId)
      .map((user) => ({
        ...user,
        children: branch(user.id),
      }));

  return branch(rootId);
}

function getAccessibleUserIds(db: MockDb, rootUserId: string) {
  const result = new Set<string>([rootUserId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const user of db.users) {
      if (user.parentUserId && result.has(user.parentUserId) && !result.has(user.id)) {
        result.add(user.id);
        changed = true;
      }
    }
  }

  return [...result];
}

function monthlyStats(db: MockDb) {
  return db.participations.reduce<Array<{
    month: string;
    categoryId: string;
    categoryName: string;
    participationCount: number;
    totalQuantity: number;
  }>>((acc, item) => {
    const month = item.occurredAt.slice(0, 7);
    const category = db.categories.find((entry) => entry.id === item.categoryId);
    const key = `${month}:${item.categoryId}`;
    const current = acc.find((entry) => `${entry.month}:${entry.categoryId}` === key);

    if (current) {
      current.participationCount += 1;
      current.totalQuantity += 1;
      return acc;
    }

    acc.push({
      month,
      categoryId: item.categoryId,
      categoryName: category?.name ?? "미분류",
      participationCount: 1,
      totalQuantity: 1,
    });
    return acc;
  }, []);
}

function renderTemplate(template: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}

function ensureEventVisibleForUser(event: MockEvent, actor: MockUser) {
  if (actor.role === "ADMIN") return true;
  const now = new Date();
  return (
    (event.status === "ACTIVE" || event.status === "CLOSED") &&
    new Date(event.visibilityStartAt) <= now &&
    new Date(event.visibilityEndAt) >= now
  );
}

function ensureEventRegistrationAllowed(event: MockEvent) {
  if (event.status !== "ACTIVE") {
    throw new Error("등록 가능한 상태의 이벤트가 아닙니다.");
  }
  if (new Date(event.registrationDeadline) < new Date()) {
    throw new Error("등록 마감된 이벤트입니다.");
  }
}

function mapEvent(db: MockDb, event: MockEvent) {
  const registrations = db.eventRegistrations.filter((item) => item.eventId === event.id);
  return {
    ...event,
    category: db.eventCategories.find((category) => category.id === event.categoryId) ?? null,
    createdBy: db.users.find((user) => user.id === event.createdById) ?? null,
    updatedBy: db.users.find((user) => user.id === event.updatedById) ?? null,
    _count: {
      registrations: registrations.length,
      copyLogs: db.eventCopyLogs.filter((item) => item.eventId === event.id).length,
    },
  };
}

function getEventSummary(db: MockDb, eventId: string, actor: MockUser) {
  const event = db.events.find((entry) => entry.id === eventId);
  if (!event) {
    throw new Error("이벤트를 찾을 수 없습니다.");
  }

  const registrations = db.eventRegistrations
    .filter((item) => item.eventId === eventId)
    .map((item) => ({
      ...item,
      participantUser: db.users.find((user) => user.id === item.participantUserId) ?? null,
      createdByUser: db.users.find((user) => user.id === item.createdByUserId) ?? null,
    }));

  const accessibleIds = actor.role === "ADMIN" ? db.users.map((user) => user.id) : getAccessibleUserIds(db, actor.id);
  const visibleRegistrations = registrations.filter((item) => accessibleIds.includes(item.participantUserId));
  const myRegistrations = registrations.filter((item) => item.participantUserId === actor.id);
  const descendantRegistrations = registrations.filter(
    (item) => item.participantUserId !== actor.id && accessibleIds.includes(item.participantUserId),
  );

  const userSummaries = visibleRegistrations.reduce<
    Array<{
      userId: string;
      loginId: string;
      name: string;
      participantCount: number;
      expectedAmount: number;
    }>
  >((acc, item) => {
    const userId = item.createdByUserId;
    const creator = item.createdByUser ?? db.users.find((user) => user.id === userId);
    if (!creator) return acc;
    const current = acc.find((entry) => entry.userId === userId);
    if (current) {
      current.participantCount += 1;
      current.expectedAmount += event.feePerPerson;
      return acc;
    }
    acc.push({
      userId,
      loginId: creator.loginId,
      name: creator.name,
      participantCount: 1,
      expectedAmount: event.feePerPerson,
    });
    return acc;
  }, []);

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
    userSummaries,
  };
}

function getEventDetail(db: MockDb, eventId: string, actor: MockUser) {
  const event = db.events.find((entry) => entry.id === eventId);
  if (!event) throw new Error("이벤트를 찾을 수 없습니다.");
  if (!ensureEventVisibleForUser(event, actor)) {
    throw new Error("현재 조회할 수 없는 이벤트입니다.");
  }

  return {
    ...mapEvent(db, event),
    popupStates: db.eventPopupStates.filter((item) => item.eventId === eventId && item.userId === actor.id),
    registrations: db.eventRegistrations
      .filter((item) => item.eventId === eventId)
      .map((item) => ({
        ...item,
        participantUser: db.users.find((user) => user.id === item.participantUserId) ?? null,
        createdByUser: db.users.find((user) => user.id === item.createdByUserId) ?? null,
      })),
  };
}

function validateEventDates(body: Record<string, any>) {
  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  const registrationDeadline = new Date(body.registrationDeadline);
  const visibilityStartAt = new Date(body.visibilityStartAt);
  const visibilityEndAt = new Date(body.visibilityEndAt);

  if (endDate < startDate) {
    throw new Error("종료일은 시작일보다 빠를 수 없습니다.");
  }
  if (registrationDeadline > startDate) {
    throw new Error("등록 마감일은 시작일보다 늦을 수 없습니다.");
  }
  if (visibilityEndAt < visibilityStartAt) {
    throw new Error("노출 종료일은 노출 시작일보다 빠를 수 없습니다.");
  }
}

export async function mockApiFetch<T>(path: string, options: { method?: string; body?: unknown; token?: string | null }) {
  const db = loadDb();
  const actor = getActor(db);
  const method = options.method ?? "GET";
  const body = (options.body ?? {}) as Record<string, any>;

  if (path === "/auth/login" && method === "POST") {
    const user = db.users.find((entry) => entry.loginId === body.loginId && entry.password === body.password);
    if (!user || user.status !== "ACTIVE") {
      throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
    return {
      accessToken: "mock-token",
      user,
    } as T;
  }

  if (path === "/auth/first-access/verify-code" && method === "POST") {
    const user = db.users.find((entry) => entry.loginId === body.loginId && entry.inviteCode === body.inviteCode);
    if (!user) {
      throw new Error("초대코드가 올바르지 않습니다.");
    }
    return {
      token: `first-access:${user.id}`,
      user,
    } as T;
  }

  if (path === "/auth/first-access/set-password" && method === "POST") {
    const userId = String(body.token).replace("first-access:", "");
    const user = db.users.find((entry) => entry.id === userId);
    if (!user) {
      throw new Error("초대코드 검증 정보가 없습니다.");
    }
    user.password = body.password;
    user.status = "ACTIVE";
    user.inviteCode = null;
    saveDb(db);
    return {
      accessToken: "mock-token",
      user,
    } as T;
  }

  if (path === "/users" && method === "GET") {
    if (actor.role === "ADMIN") {
      return db.users as T;
    }
    const ids = getAccessibleUserIds(db, actor.id);
    return db.users.filter((user) => ids.includes(user.id)) as T;
  }

  if (path === "/users" && method === "POST") {
    const user: MockUser = {
      id: makeId("u"),
      loginId: body.loginId,
      email: null,
      name: body.name,
      role: body.role,
      status: "PENDING",
      parentUserId: body.parentUserId ?? null,
      password: null,
      inviteCode: "1234QWER",
    };
    db.users.unshift(user);
    saveDb(db);
    return { user, inviteCode: user.inviteCode } as T;
  }

  const childMatch = path.match(/^\/users\/([^/]+)\/children$/);
  if (childMatch && method === "POST") {
    const user: MockUser = {
      id: makeId("u"),
      loginId: body.loginId,
      email: null,
      name: body.name,
      role: "PARTNER",
      status: "PENDING",
      parentUserId: childMatch[1],
      password: null,
      inviteCode: "1234QWER",
    };
    db.users.unshift(user);
    saveDb(db);
    return { user, inviteCode: user.inviteCode } as T;
  }

  const descendantsMatch = path.match(/^\/users\/([^/]+)\/descendants$/);
  if (descendantsMatch && method === "GET") {
    const root = db.users.find((entry) => entry.id === descendantsMatch[1]);
    return {
      root,
      descendants: descendants(db, descendantsMatch[1]),
    } as T;
  }

  const userMatch = path.match(/^\/users\/([^/]+)$/);
  if (userMatch && method === "GET") {
    return db.users.find((entry) => entry.id === userMatch[1]) as T;
  }

  const blockMatch = path.match(/^\/users\/([^/]+)\/block$/);
  if (blockMatch && method === "PATCH") {
    const user = db.users.find((entry) => entry.id === blockMatch[1]);
    if (user) {
      user.status = "BLOCKED";
      saveDb(db);
    }
    return user as T;
  }

  const unblockMatch = path.match(/^\/users\/([^/]+)\/unblock$/);
  if (unblockMatch && method === "PATCH") {
    const user = db.users.find((entry) => entry.id === unblockMatch[1]);
    if (user) {
      user.status = user.password ? "ACTIVE" : "PENDING";
      saveDb(db);
    }
    return user as T;
  }

  const parentMatch = path.match(/^\/users\/([^/]+)\/parent$/);
  if (parentMatch && method === "PATCH") {
    const user = db.users.find((entry) => entry.id === parentMatch[1]);
    if (!user) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }

    const nextParentUserId = typeof body.parentUserId === "string" && body.parentUserId.trim()
      ? body.parentUserId.trim()
      : null;

    if (nextParentUserId === user.id) {
      throw new Error("자기 자신을 상위 사용자로 지정할 수 없습니다.");
    }

    if (nextParentUserId) {
      const parent = db.users.find((entry) => entry.id === nextParentUserId);
      if (!parent) {
        throw new Error("상위 사용자를 찾을 수 없습니다.");
      }

      if (getAccessibleUserIds(db, user.id).includes(nextParentUserId)) {
        throw new Error("자기 자신 또는 하위 사용자를 상위 사용자로 지정할 수 없습니다.");
      }
    }

    user.parentUserId = nextParentUserId;
    saveDb(db);
    return user as T;
  }

  if (path === "/categories" && method === "GET") {
    return db.categories as T;
  }

  if (path === "/categories" && method === "POST") {
    const category = {
      id: makeId("c"),
      name: body.name,
      description: body.description ?? null,
    };
    db.categories.unshift(category);
    saveDb(db);
    return category as T;
  }

  const categoryMatch = path.match(/^\/categories\/([^/]+)$/);
  if (categoryMatch && method === "PATCH") {
    const category = db.categories.find((entry) => entry.id === categoryMatch[1]);
    if (!category) {
      throw new Error("카테고리를 찾을 수 없습니다.");
    }
    category.name = body.name ?? category.name;
    category.description = body.description ?? category.description;
    saveDb(db);
    return category as T;
  }

  if (path === "/participations" && method === "GET") {
    return db.participations.map((item) => ({
      ...item,
      user: db.users.find((user) => user.id === item.userId),
      category: db.categories.find((category) => category.id === item.categoryId),
    })) as T;
  }

  if (path === "/participations" && method === "POST") {
    const participantUserIds = Array.isArray(body.participantUserIds) ? body.participantUserIds : [];
    const createdParticipations = participantUserIds.map((userId: string) => ({
      id: makeId("p"),
      userId,
      categoryId: body.categoryId,
      occurredAt: body.occurredAt,
      note: body.note ?? null,
    }));
    db.participations.unshift(...createdParticipations);
    saveDb(db);
    return createdParticipations.map((participation) => ({
      ...participation,
      user: db.users.find((user) => user.id === participation.userId),
      category: db.categories.find((category) => category.id === participation.categoryId),
    })) as T;
  }

  const participationMatch = path.match(/^\/participations\/([^/]+)$/);
  if (participationMatch && method === "DELETE") {
    db.participations = db.participations.filter((item) => item.id !== participationMatch[1]);
    saveDb(db);
    return { success: true } as T;
  }

  if (path === "/stats/categories/monthly" && method === "GET") {
    return monthlyStats(db) as T;
  }

  if (path === "/announcement-templates" && method === "GET") {
    return db.announcementTemplates
      .map((template) => ({
        ...template,
        createdBy: db.users.find((user) => user.id === template.createdById) ?? null,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) as T;
  }

  if (path === "/announcement-templates" && method === "POST") {
    const template: MockAnnouncementTemplate = {
      id: makeId("tpl"),
      name: body.name,
      description: body.description ?? null,
      kakaoTemplate: body.kakaoTemplate,
      internalTemplate: body.internalTemplate,
      status: body.status ?? "INACTIVE",
      createdById: actor.id,
      createdAt: getNowIso(),
      updatedAt: getNowIso(),
    };
    db.announcementTemplates.unshift(template);
    saveDb(db);
    return template as T;
  }

  const templateActivateMatch = path.match(/^\/announcement-templates\/([^/]+)\/(activate|deactivate)$/);
  if (templateActivateMatch && method === "PATCH") {
    const template = db.announcementTemplates.find((entry) => entry.id === templateActivateMatch[1]);
    if (!template) {
      throw new Error("공지 템플릿을 찾을 수 없습니다.");
    }
    template.status = templateActivateMatch[2] === "activate" ? "ACTIVE" : "INACTIVE";
    template.updatedAt = getNowIso();
    saveDb(db);
    return template as T;
  }

  const templateMatch = path.match(/^\/announcement-templates\/([^/]+)$/);
  if (templateMatch && method === "PATCH") {
    const template = db.announcementTemplates.find((entry) => entry.id === templateMatch[1]);
    if (!template) {
      throw new Error("공지 템플릿을 찾을 수 없습니다.");
    }
    template.name = body.name ?? template.name;
    template.description = body.description ?? template.description;
    template.kakaoTemplate = body.kakaoTemplate ?? template.kakaoTemplate;
    template.internalTemplate = body.internalTemplate ?? template.internalTemplate;
    template.status = body.status ?? template.status;
    template.updatedAt = getNowIso();
    saveDb(db);
    return template as T;
  }

  if (path === "/event-categories" && method === "GET") {
    return db.eventCategories.slice().sort((a, b) => a.name.localeCompare(b.name, "ko")) as T;
  }

  if (path === "/event-categories" && method === "POST") {
    const eventCategory: MockEventCategory = {
      id: makeId("ec"),
      name: body.name,
      description: body.description ?? null,
    };
    db.eventCategories.unshift(eventCategory);
    saveDb(db);
    return eventCategory as T;
  }

  const eventCategoryMatch = path.match(/^\/event-categories\/([^/]+)$/);
  if (eventCategoryMatch && method === "PATCH") {
    const eventCategory = db.eventCategories.find((entry) => entry.id === eventCategoryMatch[1]);
    if (!eventCategory) {
      throw new Error("이벤트 카테고리를 찾을 수 없습니다.");
    }
    eventCategory.name = body.name ?? eventCategory.name;
    eventCategory.description = body.description ?? eventCategory.description;
    saveDb(db);
    return eventCategory as T;
  }

  if (path === "/events" && method === "GET") {
    return db.events
      .filter((event) => ensureEventVisibleForUser(event, actor))
      .map((event) => mapEvent(db, event)) as T;
  }

  if (path === "/events" && method === "POST") {
    validateEventDates(body);
    const event: MockEvent = {
      id: makeId("evt"),
      title: body.title,
      categoryId: body.categoryId,
      description: body.description ?? null,
      location: body.location,
      startDate: body.startDate,
      endDate: body.endDate,
      registrationDeadline: body.registrationDeadline,
      visibilityStartAt: body.visibilityStartAt,
      visibilityEndAt: body.visibilityEndAt,
      feePerPerson: Number(body.feePerPerson ?? 0),
      popupEnabled: Boolean(body.popupEnabled),
      status: body.status ?? "DRAFT",
      createdById: actor.id,
      updatedById: actor.id,
      createdAt: getNowIso(),
      updatedAt: getNowIso(),
    };
    db.events.unshift(event);
    saveDb(db);
    return mapEvent(db, event) as T;
  }

  const eventMatch = path.match(/^\/events\/([^/]+)$/);
  if (eventMatch && method === "GET") {
    return getEventDetail(db, eventMatch[1], actor) as T;
  }

  if (eventMatch && method === "PATCH") {
    const event = db.events.find((entry) => entry.id === eventMatch[1]);
    if (!event) {
      throw new Error("이벤트를 찾을 수 없습니다.");
    }
    const nextEvent = { ...event, ...body };
    validateEventDates(nextEvent);
    event.title = body.title ?? event.title;
    event.categoryId = body.categoryId ?? event.categoryId;
    event.description = body.description ?? event.description;
    event.location = body.location ?? event.location;
    event.startDate = body.startDate ?? event.startDate;
    event.endDate = body.endDate ?? event.endDate;
    event.registrationDeadline = body.registrationDeadline ?? event.registrationDeadline;
    event.visibilityStartAt = body.visibilityStartAt ?? event.visibilityStartAt;
    event.visibilityEndAt = body.visibilityEndAt ?? event.visibilityEndAt;
    event.feePerPerson = body.feePerPerson ?? event.feePerPerson;
    event.popupEnabled = body.popupEnabled ?? event.popupEnabled;
    event.status = body.status ?? event.status;
    event.updatedById = actor.id;
    event.updatedAt = getNowIso();
    saveDb(db);
    return mapEvent(db, event) as T;
  }

  const eventGenerateCopyMatch = path.match(/^\/events\/([^/]+)\/generate-copy$/);
  if (eventGenerateCopyMatch && method === "POST") {
    const event = db.events.find((entry) => entry.id === eventGenerateCopyMatch[1]);
    const template = db.announcementTemplates.find((entry) => entry.id === body.templateId);
    if (!event || !template) {
      throw new Error("이벤트 또는 템플릿을 찾을 수 없습니다.");
    }
    const category = db.eventCategories.find((entry) => entry.id === event.categoryId);
    const text = renderTemplate(body.channel === "KAKAO" ? template.kakaoTemplate : template.internalTemplate, {
      eventName: event.title,
      categoryName: category?.name ?? "-",
      date: `${event.startDate.slice(0, 10)} ~ ${event.endDate.slice(0, 10)}`,
      location: event.location,
      deadline: event.registrationDeadline.slice(0, 10),
      fee: `${event.feePerPerson.toLocaleString("ko-KR")}원`,
      link: body.link ?? "https://partner-hub.local/events",
    });
    const log: MockEventCopyLog = {
      id: makeId("copy"),
      eventId: event.id,
      templateId: template.id,
      userId: actor.id,
      channel: body.channel,
      generatedText: text,
      action: "GENERATED",
      createdAt: getNowIso(),
    };
    db.eventCopyLogs.unshift(log);
    saveDb(db);
    return {
      channel: body.channel,
      text,
      log: {
        ...log,
        user: db.users.find((user) => user.id === actor.id) ?? null,
        template: { id: template.id, name: template.name },
      },
    } as T;
  }

  const eventCopyLogsMatch = path.match(/^\/events\/([^/]+)\/copy-logs$/);
  if (eventCopyLogsMatch && method === "GET") {
    return db.eventCopyLogs
      .filter((entry) => entry.eventId === eventCopyLogsMatch[1])
      .map((entry) => ({
        ...entry,
        user: db.users.find((user) => user.id === entry.userId) ?? null,
        template: db.announcementTemplates.find((template) => template.id === entry.templateId) ?? null,
      })) as T;
  }

  const eventSummaryMatch = path.match(/^\/events\/([^/]+)\/summary$/);
  if (eventSummaryMatch && method === "GET") {
    return getEventSummary(db, eventSummaryMatch[1], actor) as T;
  }

  const eventRegistrationsMatch = path.match(/^\/events\/([^/]+)\/registrations$/);
  if (eventRegistrationsMatch && method === "POST") {
    const event = db.events.find((entry) => entry.id === eventRegistrationsMatch[1]);
    if (!event) throw new Error("이벤트를 찾을 수 없습니다.");
    ensureEventRegistrationAllowed(event);
    const accessibleIds = actor.role === "ADMIN" ? db.users.map((user) => user.id) : getAccessibleUserIds(db, actor.id);
    const participantUserIds = [...new Set(Array.isArray(body.participantUserIds) ? body.participantUserIds : [])];
    for (const participantUserId of participantUserIds) {
      if (!accessibleIds.includes(participantUserId)) {
        throw new Error("본인 또는 하위 조직 사용자만 등록할 수 있습니다.");
      }
      if (db.eventRegistrations.some((entry) => entry.eventId === event.id && entry.participantUserId === participantUserId)) {
        throw new Error("이미 등록된 참여자가 포함되어 있습니다.");
      }
    }
    const now = getNowIso();
    db.eventRegistrations.unshift(
      ...participantUserIds.map((participantUserId) => ({
        id: makeId("reg"),
        eventId: event.id,
        createdByUserId: actor.id,
        participantUserId,
        note: body.note ?? null,
        createdAt: now,
        updatedAt: now,
      })),
    );
    saveDb(db);
    return getEventSummary(db, event.id, actor) as T;
  }

  if (eventRegistrationsMatch && method === "PATCH") {
    const event = db.events.find((entry) => entry.id === eventRegistrationsMatch[1]);
    if (!event) throw new Error("이벤트를 찾을 수 없습니다.");
    ensureEventRegistrationAllowed(event);
    const accessibleIds = actor.role === "ADMIN" ? db.users.map((user) => user.id) : getAccessibleUserIds(db, actor.id);
    const nextIds = [...new Set(Array.isArray(body.participantUserIds) ? body.participantUserIds : [])];

    for (const participantUserId of nextIds) {
      if (!accessibleIds.includes(participantUserId)) {
        throw new Error("본인 또는 하위 조직 사용자만 등록할 수 있습니다.");
      }
    }

    const manageable = db.eventRegistrations.filter(
      (entry) => entry.eventId === event.id && accessibleIds.includes(entry.participantUserId),
    );
    const manageableIds = manageable.map((entry) => entry.participantUserId);
    const removeIds = manageable.filter((entry) => !nextIds.includes(entry.participantUserId)).map((entry) => entry.id);
    const addIds = nextIds.filter((participantUserId) => !manageableIds.includes(participantUserId));

    for (const participantUserId of addIds) {
      if (db.eventRegistrations.some((entry) => entry.eventId === event.id && entry.participantUserId === participantUserId)) {
        throw new Error("이미 등록된 참여자가 포함되어 있습니다.");
      }
    }

    db.eventRegistrations = db.eventRegistrations.filter((entry) => !removeIds.includes(entry.id));
    const now = getNowIso();
    db.eventRegistrations.unshift(
      ...addIds.map((participantUserId) => ({
        id: makeId("reg"),
        eventId: event.id,
        createdByUserId: actor.id,
        participantUserId,
        note: body.note ?? null,
        createdAt: now,
        updatedAt: now,
      })),
    );
    saveDb(db);
    return getEventSummary(db, event.id, actor) as T;
  }

  const eventRegistrationDeleteMatch = path.match(/^\/events\/([^/]+)\/registrations\/([^/]+)$/);
  if (eventRegistrationDeleteMatch && method === "DELETE") {
    const registration = db.eventRegistrations.find((entry) => entry.id === eventRegistrationDeleteMatch[2]);
    if (!registration || registration.eventId !== eventRegistrationDeleteMatch[1]) {
      throw new Error("이벤트 참여 등록을 찾을 수 없습니다.");
    }
    const accessibleIds = actor.role === "ADMIN" ? db.users.map((user) => user.id) : getAccessibleUserIds(db, actor.id);
    if (!accessibleIds.includes(registration.participantUserId)) {
      throw new Error("본인 또는 하위 조직 등록만 취소할 수 있습니다.");
    }
    db.eventRegistrations = db.eventRegistrations.filter((entry) => entry.id !== registration.id);
    saveDb(db);
    return { success: true } as T;
  }

  if (path === "/event-popups/active" && method === "GET") {
    if (actor.role === "ADMIN") {
      return [] as T;
    }
    const now = new Date();
    const accessibleIds = getAccessibleUserIds(db, actor.id);
    const registeredEventIds = new Set(
      db.eventRegistrations
        .filter((entry) => accessibleIds.includes(entry.participantUserId))
        .map((entry) => entry.eventId),
    );
    return db.events
      .filter((event) => {
        if (event.status !== "ACTIVE" || !event.popupEnabled) return false;
        if (new Date(event.visibilityStartAt) > now || new Date(event.visibilityEndAt) < now) return false;
        if (registeredEventIds.has(event.id)) return false;
        const popupState = db.eventPopupStates.find((entry) => entry.eventId === event.id && entry.userId === actor.id);
        if (popupState?.dismissedUntil && new Date(popupState.dismissedUntil) > now) {
          return false;
        }
        return true;
      })
      .map((event) => ({
        ...mapEvent(db, event),
        popupState: db.eventPopupStates.find((entry) => entry.eventId === event.id && entry.userId === actor.id) ?? null,
      })) as T;
  }

  const eventPopupReadMatch = path.match(/^\/event-popups\/([^/]+)\/read$/);
  if (eventPopupReadMatch && method === "POST") {
    const existing = db.eventPopupStates.find((entry) => entry.eventId === eventPopupReadMatch[1] && entry.userId === actor.id);
    if (existing) {
      existing.readAt = getNowIso();
      existing.updatedAt = getNowIso();
      saveDb(db);
      return existing as T;
    }
    const state: MockEventPopupState = {
      id: makeId("popup"),
      eventId: eventPopupReadMatch[1],
      userId: actor.id,
      readAt: getNowIso(),
      dismissedAt: null,
      dismissedUntil: null,
      createdAt: getNowIso(),
      updatedAt: getNowIso(),
    };
    db.eventPopupStates.unshift(state);
    saveDb(db);
    return state as T;
  }

  const eventPopupDismissMatch = path.match(/^\/event-popups\/([^/]+)\/dismiss$/);
  if (eventPopupDismissMatch && method === "POST") {
    const dismissHours = Number(body.dismissHours ?? 12);
    const dismissedUntil = new Date(Date.now() + dismissHours * 60 * 60 * 1000).toISOString();
    const existing = db.eventPopupStates.find((entry) => entry.eventId === eventPopupDismissMatch[1] && entry.userId === actor.id);
    if (existing) {
      existing.readAt = getNowIso();
      existing.dismissedAt = getNowIso();
      existing.dismissedUntil = dismissedUntil;
      existing.updatedAt = getNowIso();
      saveDb(db);
      return existing as T;
    }
    const state: MockEventPopupState = {
      id: makeId("popup"),
      eventId: eventPopupDismissMatch[1],
      userId: actor.id,
      readAt: getNowIso(),
      dismissedAt: getNowIso(),
      dismissedUntil,
      createdAt: getNowIso(),
      updatedAt: getNowIso(),
    };
    db.eventPopupStates.unshift(state);
    saveDb(db);
    return state as T;
  }

  throw new Error(`목업 API에 구현되지 않은 요청입니다: ${method} ${path}`);
}
