"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { summarizeDescription } from "@/lib/utils";

type EventCategory = {
  id: string;
  name: string;
  description: string | null;
};

type EventItem = {
  id: string;
  title: string;
  categoryId: string;
  category?: EventCategory | null;
  description?: string | null;
  location: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  feePerPerson: number;
  popupEnabled: boolean;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  _count?: { registrations: number };
};

type EventSummary = {
  eventId: string;
  myRegisteredCount: number;
  myExpectedTotalAmount: number;
  descendantRegisteredCount: number;
  descendantExpectedTotalAmount: number;
  totalParticipantCount: number;
  totalExpectedAmount: number;
};

const statusLabelMap: Record<EventItem["status"], string> = {
  DRAFT: "초안",
  ACTIVE: "진행중",
  CLOSED: "마감",
  ARCHIVED: "보관",
};

const statusClassMap: Record<EventItem["status"], string> = {
  DRAFT: "bg-[#f7f1e8] text-[#806750]",
  ACTIVE: "bg-[#e8f8ee] text-[#14633f]",
  CLOSED: "bg-[#fff2df] text-[#9a5b00]",
  ARCHIVED: "bg-[#efe9ff] text-[#5d33a6]",
};

export default function EventsPage() {
  const session = getSession();
  const isAdmin = session?.user.role === "ADMIN";
  const [events, setEvents] = useState<EventItem[]>([]);
  const [summaries, setSummaries] = useState<Record<string, EventSummary>>({});
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [eventForm, setEventForm] = useState({
    title: "",
    categoryId: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
    registrationDeadline: "",
    visibilityStartAt: "",
    visibilityEndAt: "",
    feePerPerson: "0",
    popupEnabled: true,
    status: "DRAFT",
  });
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [categoryFeedback, setCategoryFeedback] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [eventFeedback, setEventFeedback] = useState<string | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createStep, setCreateStep] = useState<0 | 1 | 2>(0);
  const [statusFilter, setStatusFilter] = useState<"ALL" | EventItem["status"]>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<"latest" | "deadline" | "feeHigh" | "feeLow">("deadline");

  function formatCalendarBadge(dateText: string) {
    const date = new Date(dateText);
    return {
      month: `${date.getMonth() + 1}월`,
      day: `${date.getDate()}`,
    };
  }

  const activeEvents = useMemo(() => events.filter((event) => event.status === "ACTIVE"), [events]);
  const closedEvents = useMemo(() => events.filter((event) => event.status === "CLOSED"), [events]);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === eventForm.categoryId) ?? null,
    [categories, eventForm.categoryId],
  );
  const createStepItems = [
    { key: 0, label: "기본 정보" },
    { key: 1, label: "일정 설정" },
    { key: 2, label: "노출 및 상태" },
  ] as const;
  const createStepGuide = [
    "1단계: 이벤트명, 카테고리, 장소만 먼저 입력하세요.",
    "2단계: 행사 일정, 등록 마감, 참가비를 입력하세요.",
    "3단계: 팝업과 상태를 정하고 저장하세요. 노출 기간은 비워도 자동으로 채워집니다.",
  ] as const;
  const filteredEvents = useMemo(() => {
    const nextEvents = events.filter((event) => {
      const matchesSearch =
        !search.trim() ||
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        event.location.toLowerCase().includes(search.toLowerCase()) ||
        (event.category?.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || event.status === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || event.categoryId === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });

    return nextEvents.sort((left, right) => {
      switch (sortKey) {
        case "latest":
          return new Date(right.startDate).getTime() - new Date(left.startDate).getTime();
        case "feeHigh":
          return right.feePerPerson - left.feePerPerson;
        case "feeLow":
          return left.feePerPerson - right.feePerPerson;
        case "deadline":
        default:
          return new Date(left.registrationDeadline).getTime() - new Date(right.registrationDeadline).getTime();
      }
    });
  }, [categoryFilter, events, search, sortKey, statusFilter]);

  async function load() {
    const currentSession = getSession();
    if (!currentSession) return;

    const [eventData, categoryData] = await Promise.all([
      apiFetch<EventItem[]>("/events", { token: currentSession.accessToken }),
      apiFetch<EventCategory[]>("/event-categories", { token: currentSession.accessToken }),
    ]);
    setEvents(eventData);
    setCategories(categoryData);
    const summaryEntries = await Promise.all(
      eventData.map(async (event) => {
        try {
          const summary = await apiFetch<EventSummary>(`/events/${event.id}/summary`, {
            token: currentSession.accessToken,
          });
          return [event.id, summary] as const;
        } catch {
          return [event.id, null] as const;
        }
      }),
    );
    setSummaries(
      summaryEntries.reduce<Record<string, EventSummary>>((acc, [eventId, summary]) => {
        if (summary) {
          acc[eventId] = summary;
        }
        return acc;
      }, {}),
    );
    setEventForm((current) => ({
      ...current,
      categoryId: current.categoryId || categoryData[0]?.id || "",
    }));
  }

  useEffect(() => {
    load();
  }, []);

  function formatLocalDateTime(date: Date) {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  }

  function buildEventPayload() {
    const now = formatLocalDateTime(new Date());
    const visibilityStartAt = eventForm.visibilityStartAt || now;
    const visibilityEndAt = eventForm.visibilityEndAt || eventForm.registrationDeadline || eventForm.endDate;

    return {
      ...eventForm,
      visibilityStartAt,
      visibilityEndAt,
      feePerPerson: Number(eventForm.feePerPerson),
    };
  }

  function validateCreateStep(step: 0 | 1 | 2) {
    if (step === 0) {
      if (!eventForm.title.trim()) return "이벤트 제목을 입력해 주세요.";
      if (!eventForm.categoryId) return "이벤트 카테고리를 선택해 주세요.";
      if (!eventForm.location.trim()) return "장소를 입력해 주세요.";
      return null;
    }

    if (step === 1) {
      if (!eventForm.startDate || !eventForm.endDate || !eventForm.registrationDeadline) {
        return "행사일과 등록 마감일을 모두 입력해 주세요.";
      }
      if (Number(eventForm.feePerPerson) < 0) {
        return "참가비는 0원 이상이어야 합니다.";
      }
      if (new Date(eventForm.endDate) < new Date(eventForm.startDate)) {
        return "종료일은 시작일보다 빠를 수 없습니다.";
      }
      if (new Date(eventForm.registrationDeadline) > new Date(eventForm.startDate)) {
        return "등록 마감은 시작일보다 늦을 수 없습니다.";
      }
      return null;
    }

    const payload = buildEventPayload();
    if (!payload.visibilityStartAt || !payload.visibilityEndAt) {
      return "노출 기간을 확인해 주세요.";
    }
    if (new Date(payload.visibilityEndAt) < new Date(payload.visibilityStartAt)) {
      return "노출 종료일은 노출 시작일보다 빠를 수 없습니다.";
    }
    return null;
  }

  function validateEventForm() {
    return validateCreateStep(0) ?? validateCreateStep(1) ?? validateCreateStep(2);
  }

  function moveCreateStep(direction: "next" | "prev") {
    if (direction === "prev") {
      setCreateStep((current) => (current - 1) as 0 | 1 | 2);
      return;
    }

    const validationMessage = validateCreateStep(createStep);
    if (validationMessage) {
      setEventError(validationMessage);
      setEventFeedback(null);
      return;
    }

    setEventError(null);
    setCreateStep((current) => (current + 1) as 0 | 1 | 2);
  }

  async function createEventCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentSession = getSession();
    if (!currentSession) return;
    if (!categoryForm.name.trim()) {
      setCategoryError("카테고리명을 입력해 주세요.");
      setCategoryFeedback(null);
      return;
    }

    try {
      await apiFetch("/event-categories", {
        method: "POST",
        token: currentSession.accessToken,
        body: categoryForm,
      });
      setCategoryForm({ name: "", description: "" });
      setCategoryFeedback("이벤트 카테고리를 추가했습니다.");
      setCategoryError(null);
      await load();
    } catch (caught) {
      setCategoryFeedback(null);
      setCategoryError(caught instanceof Error ? caught.message : "카테고리 생성 중 오류가 발생했습니다.");
    }
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentSession = getSession();
    if (!currentSession) return;

    const validationMessage = validateEventForm();
    if (validationMessage) {
      setEventError(validationMessage);
      setEventFeedback(null);
      return;
    }

    try {
      await apiFetch("/events", {
        method: "POST",
        token: currentSession.accessToken,
        body: buildEventPayload(),
      });

      setEventForm({
        title: "",
        categoryId: categories[0]?.id ?? "",
        description: "",
        location: "",
        startDate: "",
        endDate: "",
        registrationDeadline: "",
        visibilityStartAt: "",
        visibilityEndAt: "",
        feePerPerson: "0",
        popupEnabled: true,
        status: "DRAFT",
      });
      setCreateStep(0);
      setEventFeedback("새 이벤트를 만들었습니다.");
      setEventError(null);
      await load();
    } catch (caught) {
      setEventFeedback(null);
      setEventError(caught instanceof Error ? caught.message : "이벤트 생성 중 오류가 발생했습니다.");
    }
  }

  return (
    <PageShell title="이벤트">
      {isAdmin ? (
        <div className="grid gap-6 2xl:grid-cols-[360px_440px_minmax(0,1fr)]">
          <Card className="h-fit">
            <h3 className="text-xl font-semibold">이벤트 카테고리</h3>
            <p className="mt-2 text-sm leading-7 text-[#6f6255]">
              실제 이벤트와 분리된 운영 카테고리입니다.
              <br />
              템플릿과 공지 흐름에서 일관되게 재사용됩니다.
            </p>
            {categoryFeedback ? (
              <div className="mt-4 rounded-[20px] bg-[#e8f8ee] px-4 py-3 text-sm text-[#14633f]">{categoryFeedback}</div>
            ) : null}
            {categoryError ? (
              <div className="mt-4 rounded-[20px] bg-[#fff0f0] px-4 py-3 text-sm text-[#a12626]">{categoryError}</div>
            ) : null}
            <form className="mt-6 space-y-4" onSubmit={createEventCategory}>
              <Input
                placeholder="카테고리명"
                value={categoryForm.name}
                onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <Input
                placeholder="설명"
                value={categoryForm.description}
                onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))}
              />
              <Button type="submit">카테고리 추가</Button>
            </form>
            <div className="mt-5 space-y-2">
              {categories.length ? (
                categories.map((category) => (
                  <div key={category.id} className="rounded-[20px] bg-white/75 px-4 py-3">
                    <p className="font-medium">{category.name}</p>
                    <p className="truncate text-sm text-[#6f6255]" title={summarizeDescription(category.description)}>
                      {summarizeDescription(category.description)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#d7c8b6] bg-white/60 px-4 py-8 text-center text-sm text-[#6f6255]">
                  아직 이벤트 카테고리가 없습니다.
                </div>
              )}
            </div>
          </Card>

          <Card className="h-fit">
            <h3 className="text-xl font-semibold">이벤트 생성</h3>
            <p className="mt-2 text-sm leading-7 text-[#6f6255]">
              한 번에 다 입력하지 말고 단계별로 저장 준비를 하면 됩니다.
            </p>
            {eventFeedback ? (
              <div className="mt-4 rounded-[20px] bg-[#e8f8ee] px-4 py-3 text-sm text-[#14633f]">{eventFeedback}</div>
            ) : null}
            {eventError ? (
              <div className="mt-4 rounded-[20px] bg-[#fff0f0] px-4 py-3 text-sm text-[#a12626]">{eventError}</div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {createStepItems.map((step) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setCreateStep(step.key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    createStep === step.key ? "bg-[#241b17] text-white" : "bg-white/80 text-[#6f6255]"
                  }`}
                >
                  {step.label}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-[20px] bg-[#f8f2e9] px-4 py-3 text-sm text-[#6f6255]">
              {createStepGuide[createStep]}
            </div>
            <form className="mt-6 space-y-4" onSubmit={createEvent}>
              {createStep === 0 ? (
                <>
                  <Input
                    placeholder="이벤트 제목"
                    value={eventForm.title}
                    onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))}
                  />
                  <select
                    className="min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm"
                    value={eventForm.categoryId}
                    onChange={(event) => setEventForm((current) => ({ ...current, categoryId: event.target.value }))}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="장소"
                    value={eventForm.location}
                    onChange={(event) => setEventForm((current) => ({ ...current, location: event.target.value }))}
                  />
                  <textarea
                    className="min-h-[120px] w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm outline-none"
                    placeholder="이벤트 설명"
                    value={eventForm.description}
                    onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </>
              ) : null}

              {createStep === 1 ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">시작일시</span>
                    <Input
                      type="datetime-local"
                      value={eventForm.startDate}
                      onChange={(event) => setEventForm((current) => ({ ...current, startDate: event.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">종료일시</span>
                    <Input
                      type="datetime-local"
                      value={eventForm.endDate}
                      onChange={(event) => setEventForm((current) => ({ ...current, endDate: event.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">등록 마감</span>
                    <Input
                      type="datetime-local"
                      value={eventForm.registrationDeadline}
                      onChange={(event) =>
                        setEventForm((current) => ({ ...current, registrationDeadline: event.target.value }))
                      }
                    />
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="1인 참가비"
                    value={eventForm.feePerPerson}
                    onChange={(event) => setEventForm((current) => ({ ...current, feePerPerson: event.target.value }))}
                  />
                </>
              ) : null}

              {createStep === 2 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">노출 시작</span>
                      <Input
                        type="datetime-local"
                        value={eventForm.visibilityStartAt}
                        onChange={(event) =>
                          setEventForm((current) => ({ ...current, visibilityStartAt: event.target.value }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">노출 종료</span>
                      <Input
                        type="datetime-local"
                        value={eventForm.visibilityEndAt}
                        onChange={(event) =>
                          setEventForm((current) => ({ ...current, visibilityEndAt: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <p className="text-sm text-[#6f6255]">
                    비워두면 노출 시작은 지금 시각, 노출 종료는 등록 마감일로 자동 설정됩니다.
                  </p>
                  <div className="flex items-center gap-3 rounded-[20px] border border-white/70 bg-white/70 px-4 py-3">
                    <input
                      id="popupEnabled"
                      type="checkbox"
                      checked={eventForm.popupEnabled}
                      onChange={(event) =>
                        setEventForm((current) => ({ ...current, popupEnabled: event.target.checked }))
                      }
                    />
                    <label htmlFor="popupEnabled" className="text-sm font-medium">
                      로그인 팝업 노출
                    </label>
                  </div>
                  <select
                    className="min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm"
                    value={eventForm.status}
                    onChange={(event) => setEventForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="DRAFT">초안</option>
                    <option value="ACTIVE">진행중</option>
                    <option value="CLOSED">마감</option>
                    <option value="ARCHIVED">보관</option>
                  </select>
                  <div className="rounded-[24px] bg-[#f8f2e9] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">생성 미리보기</p>
                    <p className="mt-3 text-lg font-semibold text-[#241b17]">{eventForm.title || "이벤트 제목"}</p>
                    <div className="mt-3 grid gap-2 text-sm text-[#6f6255]">
                      <span>카테고리 {selectedCategory?.name ?? "-"}</span>
                      <span>장소 {eventForm.location || "-"}</span>
                      <span>참가비 {Number(eventForm.feePerPerson || 0).toLocaleString("ko-KR")}원</span>
                      <span>상태 {statusLabelMap[eventForm.status as EventItem["status"]]}</span>
                    </div>
                  </div>
                </>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {createStep > 0 ? (
                  <Button type="button" variant="outline" onClick={() => moveCreateStep("prev")}>
                    이전 단계
                  </Button>
                ) : null}
                {createStep < 2 ? (
                  <Button type="button" onClick={() => moveCreateStep("next")}>
                    다음 단계
                  </Button>
                ) : (
                  <Button type="submit">이벤트 저장</Button>
                )}
              </div>
            </form>
          </Card>

          <Card>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">이벤트 공지 목록</h3>
                <p className="mt-2 text-sm leading-7 text-[#6f6255]">
                  상세 화면에서 문안 생성, 등록 현황, 복사 로그를 이어서 확인할 수 있습니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1">진행중 {activeEvents.length}건</span>
                <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1">마감 {closedEvents.length}건</span>
              </div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <Input placeholder="이벤트명, 장소, 카테고리 검색" value={search} onChange={(event) => setSearch(event.target.value)} />
              <select className="min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | EventItem["status"])}>
                <option value="ALL">전체 상태</option>
                <option value="ACTIVE">진행중</option>
                <option value="DRAFT">초안</option>
                <option value="CLOSED">마감</option>
                <option value="ARCHIVED">보관</option>
              </select>
              <select className="min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="ALL">전체 카테고리</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "ALL", label: "전체" },
                  { key: "ACTIVE", label: "진행중" },
                  { key: "DRAFT", label: "초안" },
                  { key: "CLOSED", label: "마감" },
                  { key: "ARCHIVED", label: "보관" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key as "ALL" | EventItem["status"])}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${statusFilter === tab.key ? "bg-[#241b17] text-white" : "bg-white/75 text-[#6f6255]"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <select className="min-h-11 rounded-full border border-border bg-white px-4 py-2 text-sm" value={sortKey} onChange={(event) => setSortKey(event.target.value as typeof sortKey)}>
                <option value="deadline">마감 임박순</option>
                <option value="latest">행사일 최신순</option>
                <option value="feeHigh">참가비 높은순</option>
                <option value="feeLow">참가비 낮은순</option>
              </select>
            </div>
            <div className="mt-6 grid gap-4">
              {filteredEvents.length ? (
                filteredEvents.map((item) => (
                  <Link key={item.id} href={`/events/${item.id}`} className="block">
                    <div className="rounded-[24px] border border-white/70 bg-white/85 p-5 transition hover:-translate-y-1">
                      <div className="flex gap-4">
                        <div className="flex w-[74px] shrink-0 flex-col items-center justify-center rounded-[22px] bg-[#241b17] px-3 py-4 text-white">
                          <span className="text-xs uppercase tracking-[0.18em] text-[#d6c1ac]">{formatCalendarBadge(item.startDate).month}</span>
                          <span className="mt-1 text-3xl font-semibold leading-none">{formatCalendarBadge(item.startDate).day}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassMap[item.status]}`}>{statusLabelMap[item.status]}</span>
                            <span className="rounded-full bg-[#f8f2e9] px-3 py-1 text-xs">{item.category?.name ?? "-"}</span>
                            {item.popupEnabled ? <span className="rounded-full bg-[#eef7f3] px-3 py-1 text-xs text-secondary">팝업 노출</span> : null}
                          </div>
                          <h4 className="mt-3 text-lg font-semibold">{item.title}</h4>
                          <p className="mt-2 text-sm text-[#6f6255]">{item.location}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-[#6f6255] sm:grid-cols-2">
                        <span>행사일 {item.startDate.slice(0, 10)} ~ {item.endDate.slice(0, 10)}</span>
                        <span>마감 {item.registrationDeadline.slice(0, 10)}</span>
                        <span>참가비 {item.feePerPerson.toLocaleString("ko-KR")}원</span>
                        <span>등록 {item._count?.registrations ?? 0}명</span>
                      </div>
                      {summaries[item.id] ? (
                        <div className="mt-4 grid gap-2 rounded-[20px] bg-[#f8f2e9] p-3 text-sm text-[#5d4a3d] sm:grid-cols-2">
                          <span>전체 참여자 {summaries[item.id].totalParticipantCount}명</span>
                          <span>전체 예상 {summaries[item.id].totalExpectedAmount.toLocaleString("ko-KR")}원</span>
                        </div>
                      ) : null}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-[#d7c8b6] bg-white/60 px-5 py-12 text-center text-sm text-[#6f6255]">
                  검색 또는 필터 조건에 맞는 이벤트가 없습니다.
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-xs uppercase tracking-[0.22em] text-[#8c7c6a]">열린 이벤트</p>
              <p className="mt-3 text-3xl font-semibold">{events.filter((item) => item.status === "ACTIVE").length}</p>
              <p className="mt-2 text-sm text-[#6f6255]">지금 바로 등록 가능한 이벤트 수</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.22em] text-[#8c7c6a]">곧 마감</p>
              <p className="mt-3 text-3xl font-semibold">{events.filter((item) => new Date(item.registrationDeadline) >= new Date()).length}</p>
              <p className="mt-2 text-sm text-[#6f6255]">마감 전 확인이 필요한 이벤트</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.22em] text-[#8c7c6a]">총 공지</p>
              <p className="mt-3 text-3xl font-semibold">{events.length}</p>
              <p className="mt-2 text-sm text-[#6f6255]">내게 노출되는 이벤트 공지 수</p>
            </Card>
          </div>
          <Card className="h-fit">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <Input placeholder="이벤트명, 장소, 카테고리 검색" value={search} onChange={(event) => setSearch(event.target.value)} />
              <select className="min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | EventItem["status"])}>
                <option value="ALL">전체 상태</option>
                <option value="ACTIVE">진행중</option>
                <option value="CLOSED">마감</option>
                <option value="ARCHIVED">보관</option>
              </select>
              <select className="min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="ALL">전체 카테고리</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "ALL", label: "전체" },
                  { key: "ACTIVE", label: "진행중" },
                  { key: "CLOSED", label: "마감" },
                  { key: "ARCHIVED", label: "보관" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key as "ALL" | EventItem["status"])}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${statusFilter === tab.key ? "bg-[#241b17] text-white" : "bg-white/75 text-[#6f6255]"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <select className="min-h-11 rounded-full border border-border bg-white px-4 py-2 text-sm" value={sortKey} onChange={(event) => setSortKey(event.target.value as typeof sortKey)}>
                <option value="deadline">마감 임박순</option>
                <option value="latest">행사일 최신순</option>
                <option value="feeHigh">참가비 높은순</option>
                <option value="feeLow">참가비 낮은순</option>
              </select>
            </div>
          </Card>
          {filteredEvents.length ? (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredEvents.map((item) => {
                const isClosedByDate = new Date(item.registrationDeadline) < new Date();
                const ctaLabel = item.status === "CLOSED" || isClosedByDate ? "등록 마감 확인" : "참여 등록하기";
                const summary = summaries[item.id];
                const isRegistered = (summary?.myRegisteredCount ?? 0) + (summary?.descendantRegisteredCount ?? 0) > 0;

                return (
                  <Link key={item.id} href={`/events/${item.id}`} className="block">
                    <Card className="h-full transition hover:-translate-y-1 hover:bg-white/95">
                      <div className="flex gap-4">
                        <div className="flex w-[74px] shrink-0 flex-col items-center justify-center rounded-[22px] bg-[#241b17] px-3 py-4 text-white">
                          <span className="text-xs uppercase tracking-[0.18em] text-[#d6c1ac]">{formatCalendarBadge(item.startDate).month}</span>
                          <span className="mt-1 text-3xl font-semibold leading-none">{formatCalendarBadge(item.startDate).day}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassMap[item.status]}`}>{statusLabelMap[item.status]}</span>
                            <span className="rounded-full bg-[#fff2df] px-3 py-1 text-xs font-semibold text-[#9a5b00]">{item.category?.name ?? "-"}</span>
                            {isRegistered ? <span className="rounded-full bg-[#e8f8ee] px-3 py-1 text-xs font-semibold text-[#14633f]">이미 등록 완료</span> : null}
                          </div>
                          <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                          <p className="mt-3 truncate text-sm text-[#6f6255]" title={summarizeDescription(item.description, item.location)}>
                            {summarizeDescription(item.description, item.location)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 space-y-2 text-sm text-[#6f6255]">
                        <p>행사일: {item.startDate.slice(0, 10)} ~ {item.endDate.slice(0, 10)}</p>
                        <p>장소: {item.location}</p>
                        <p>등록 마감: {item.registrationDeadline.slice(0, 10)}</p>
                        <p>1인 참가비: {item.feePerPerson.toLocaleString("ko-KR")}원</p>
                      </div>
                      {summary ? (
                        <div className="mt-5 grid gap-2 rounded-[22px] bg-[#f8f2e9] p-4 text-sm text-[#5d4a3d]">
                          <p>내 등록 참여자: {summary.myRegisteredCount}명</p>
                          <p>내 조직 등록 참여자: {summary.descendantRegisteredCount}명</p>
                          <p>내 예상 금액: {summary.myExpectedTotalAmount.toLocaleString("ko-KR")}원</p>
                          <p>내 조직 예상 금액: {summary.descendantExpectedTotalAmount.toLocaleString("ko-KR")}원</p>
                        </div>
                      ) : null}
                      <div className="mt-6 inline-flex rounded-full bg-[#241b17] px-4 py-2 text-sm font-medium text-white">
                        {ctaLabel}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card>
              <div className="rounded-[24px] border border-dashed border-[#d7c8b6] bg-white/60 px-5 py-12 text-center text-sm text-[#6f6255]">
                검색 또는 필터 조건에 맞는 이벤트가 없습니다.
              </div>
            </Card>
          )}
        </div>
      )}
    </PageShell>
  );
}
