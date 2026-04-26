"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { summarizeDescription } from "@/lib/utils";

type EventDetail = {
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
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  category?: { id: string; name: string } | null;
  registrations?: Array<{
    id: string;
    participantUserId: string;
    participantUser?: { id: string; name: string; loginId: string } | null;
    createdByUser?: { id: string; name: string; loginId: string } | null;
  }>;
};

type EventSummary = {
  feePerPerson: number;
  myRegisteredCount: number;
  myExpectedTotalAmount: number;
  descendantRegisteredCount: number;
  descendantExpectedTotalAmount: number;
  totalParticipantCount: number;
  totalExpectedAmount: number;
  registrations: Array<{
    id: string;
    participantUserId: string;
    participantUser?: { id: string; name: string; loginId: string } | null;
    createdByUser?: { id: string; name: string; loginId: string } | null;
  }>;
  userSummaries: Array<{
    userId: string;
    loginId: string;
    name: string;
    participantCount: number;
    expectedAmount: number;
  }>;
};

type EventCategory = { id: string; name: string };
type Template = { id: string; name: string; status: "ACTIVE" | "INACTIVE" };
type CopyLog = {
  id: string;
  channel: string;
  createdAt: string;
  template?: { id: string; name: string } | null;
  user?: { id: string; name: string; loginId: string } | null;
  generatedText: string;
};
type UserItem = { id: string; name: string; loginId: string; parentUserId: string | null };
type UserTreeNode = UserItem & { children: UserTreeNode[] };

const statusLabelMap: Record<EventDetail["status"], string> = {
  DRAFT: "초안",
  ACTIVE: "진행중",
  CLOSED: "마감",
  ARCHIVED: "보관",
};

const statusClassMap: Record<EventDetail["status"], string> = {
  DRAFT: "bg-[#f7f1e8] text-[#806750]",
  ACTIVE: "bg-[#e8f8ee] text-[#14633f]",
  CLOSED: "bg-[#fff2df] text-[#9a5b00]",
  ARCHIVED: "bg-[#efe9ff] text-[#5d33a6]",
};

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const session = getSession();
  const isAdmin = session?.user.role === "ADMIN";
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [copyLogs, setCopyLogs] = useState<CopyLog[]>([]);
  const [openedCopyLogId, setOpenedCopyLogId] = useState<string | null>(null);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [generatedCopy, setGeneratedCopy] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<"participantCount" | "expectedAmount">("participantCount");
  const [editStep, setEditStep] = useState<0 | 1 | 2>(0);
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantView, setParticipantView] = useState<"all" | "selected">("all");
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([]);
  const [copyLogSearch, setCopyLogSearch] = useState("");
  const [copyForm, setCopyForm] = useState({
    templateId: "",
    channel: "KAKAO",
    link: "https://partner-hub.local/events",
  });
  const [editForm, setEditForm] = useState({
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

  function formatDateText(dateText: string) {
    const date = new Date(dateText);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatDateTimeText(dateText: string) {
    const date = new Date(dateText);
    return `${formatDateText(dateText)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  async function load() {
    const currentSession = getSession();
    if (!currentSession) return;

    const requests: Promise<any>[] = [
      apiFetch(`/events/${params.id}`, { token: currentSession.accessToken }),
      apiFetch(`/events/${params.id}/summary`, { token: currentSession.accessToken }),
      apiFetch("/users", { token: currentSession.accessToken }),
      apiFetch("/event-categories", { token: currentSession.accessToken }),
    ];

    if (currentSession.user.role === "ADMIN") {
      requests.push(apiFetch("/announcement-templates", { token: currentSession.accessToken }));
      requests.push(apiFetch(`/events/${params.id}/copy-logs`, { token: currentSession.accessToken }));
    } else {
      requests.push(Promise.resolve([]));
      requests.push(Promise.resolve([]));
    }

    const [eventData, summaryData, userData, categoryData, templateData, copyLogData] = await Promise.all(requests);
    setEvent(eventData);
    setSummary(summaryData);
    setUsers(userData);
    setCategories(categoryData);
    setTemplates(templateData);
    setCopyLogs(copyLogData);
    setSelectedParticipantIds(summaryData.registrations.map((entry: any) => entry.participantUserId));
    const userMap = new Map(userData.map((user: UserItem) => [user.id, user]));
    setExpandedNodeIds(
      userData
        .filter((user: UserItem) => userData.some((candidate: UserItem) => candidate.parentUserId === user.id))
        .map((user: UserItem) => user.id),
    );
    setEditForm({
      title: eventData.title,
      categoryId: eventData.categoryId,
      description: eventData.description ?? "",
      location: eventData.location,
      startDate: eventData.startDate.slice(0, 16),
      endDate: eventData.endDate.slice(0, 16),
      registrationDeadline: eventData.registrationDeadline.slice(0, 16),
      visibilityStartAt: eventData.visibilityStartAt.slice(0, 16),
      visibilityEndAt: eventData.visibilityEndAt.slice(0, 16),
      feePerPerson: String(eventData.feePerPerson),
      popupEnabled: eventData.popupEnabled,
      status: eventData.status,
    });
    const activeTemplate = (templateData as Template[]).find((template) => template.status === "ACTIVE");
    setCopyForm((current) => ({ ...current, templateId: activeTemplate?.id ?? templateData[0]?.id ?? "" }));
  }

  useEffect(() => {
    load();
  }, [params.id]);

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedParticipantIds.includes(user.id)),
    [selectedParticipantIds, users],
  );
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !participantSearch.trim() ||
        user.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
        user.loginId.toLowerCase().includes(participantSearch.toLowerCase());
      const matchesView = participantView === "all" || selectedParticipantIds.includes(user.id);
      return matchesSearch && matchesView;
    });
  }, [participantSearch, participantView, selectedParticipantIds, users]);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === editForm.categoryId) ?? null,
    [categories, editForm.categoryId],
  );
  const participantTree = useMemo(() => {
    const visibleIdSet = new Set(filteredUsers.map((user) => user.id));
    const userMap = new Map(users.map((user) => [user.id, { ...user, children: [] as UserTreeNode[] }]));

    function branchVisible(userId: string): boolean {
      if (visibleIdSet.has(userId)) return true;
      const children = users.filter((user) => user.parentUserId === userId);
      return children.some((child) => branchVisible(child.id));
    }

    userMap.forEach((node) => {
      if (node.parentUserId) {
        const parent = userMap.get(node.parentUserId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    return [...userMap.values()]
      .filter((node) => !node.parentUserId || !userMap.has(node.parentUserId))
      .filter((node) => branchVisible(node.id));
  }, [filteredUsers, users]);
  const editStepItems = [
    { key: 0, label: "기본 정보" },
    { key: 1, label: "일정 설정" },
    { key: 2, label: "노출 및 상태" },
  ] as const;

  const isRegistrationClosed = useMemo(() => {
    if (!event) return false;
    return event.status === "CLOSED" || event.status === "ARCHIVED" || new Date(event.registrationDeadline) < new Date();
  }, [event]);

  const duplicateSelectedIds = useMemo(
    () => selectedParticipantIds.filter((id, index, array) => array.indexOf(id) !== index),
    [selectedParticipantIds],
  );

  const expectedAmount = selectedParticipantIds.length * (event?.feePerPerson ?? 0);
  const deadlineDiffDays = useMemo(() => {
    if (!event) return null;
    const diff = new Date(event.registrationDeadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [event]);
  const deadlineToneClass = isRegistrationClosed
    ? "bg-[#fff2df] text-[#9a5b00]"
    : (deadlineDiffDays ?? 0) <= 3
      ? "bg-[#fff0f0] text-[#a12626]"
      : "bg-[#eef7f3] text-[#14633f]";
  const selectionDelta = selectedParticipantIds.length - (summary?.registrations.length ?? 0);
  const summaryRatio = useMemo(() => {
    if (!summary?.totalParticipantCount) return 0;
    return Math.round((summary.myRegisteredCount / summary.totalParticipantCount) * 100);
  }, [summary]);
  const userSummaryChartData = useMemo(
    () =>
      (summary?.userSummaries ?? []).map((item) => ({
        name: item.name,
        participantCount: item.participantCount,
        expectedAmount: item.expectedAmount,
      })),
    [summary],
  );
  const filteredCopyLogs = useMemo(
    () =>
      copyLogs.filter((log) => {
        if (!copyLogSearch.trim()) return true;
        const keyword = copyLogSearch.toLowerCase();
        return (
          (log.template?.name ?? "").toLowerCase().includes(keyword) ||
          (log.user?.name ?? "").toLowerCase().includes(keyword) ||
          log.generatedText.toLowerCase().includes(keyword) ||
          log.channel.toLowerCase().includes(keyword)
        );
      }),
    [copyLogSearch, copyLogs],
  );

  function toggleNode(nodeId: string) {
    setExpandedNodeIds((current) =>
      current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId],
    );
  }

  function renderParticipantNode(node: UserTreeNode, depth = 0, isLast = false): JSX.Element | null {
    const matchesView = participantView === "all" || selectedParticipantIds.includes(node.id);
    const matchesSearch =
      !participantSearch.trim() ||
      node.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
      node.loginId.toLowerCase().includes(participantSearch.toLowerCase());
    const childElements = node.children
      .map((child, index) => renderParticipantNode(child, depth + 1, index === node.children.length - 1))
      .filter(Boolean) as JSX.Element[];

    if (!matchesView && !matchesSearch && childElements.length === 0) {
      return null;
    }

    const checked = selectedParticipantIds.includes(node.id);
    const expanded = expandedNodeIds.includes(node.id);
    const hasChildren = childElements.length > 0;
    const parent = node.parentUserId ? users.find((item) => item.id === node.parentUserId) ?? null : null;

    return (
      <div key={node.id} className="relative">
        {depth > 0 ? <div className="absolute left-[15px] top-0 h-full w-px bg-[#ead8c1]" /> : null}
        <div className="relative">
          {depth > 0 ? <div className="absolute left-[15px] top-7 h-px w-4 bg-[#ead8c1]" /> : null}
          <div
            className={`relative rounded-[22px] border px-4 py-4 transition ${
              checked ? "border-[#a23e2b] bg-[#fff1ec]" : "border-white/70 bg-white/85"
            } ${isRegistrationClosed ? "pointer-events-none opacity-60" : ""}`}
            style={{ marginLeft: `${depth * 18}px` }}
          >
            <div className="flex items-start gap-3">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleNode(node.id)}
                  className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#ead8c1] bg-[#fff8ef] text-xs font-semibold text-[#6f6255]"
                >
                  {expanded ? "-" : "+"}
                </button>
              ) : (
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f8f2e9] text-[10px] font-semibold text-[#8c7c6a]">
                  {depth}
                </span>
              )}
              <input
                type="checkbox"
                checked={checked}
                disabled={isRegistrationClosed}
                onChange={(event) => {
                  setSelectedParticipantIds((current) =>
                    event.target.checked ? [...current, node.id] : current.filter((entry) => entry !== node.id),
                  );
                }}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{node.name}</p>
                  <span className="rounded-full bg-[#f8f2e9] px-2.5 py-1 text-[11px] text-[#6f6255]">
                    {depth === 0 ? "기준" : `${depth}단계`}
                  </span>
                  {checked ? (
                    <span className="rounded-full bg-[#a23e2b] px-2.5 py-1 text-[11px] font-medium text-white">
                      선택됨
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#6f6255]">{node.loginId}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#8c7c6a]">
                  {parent ? <span>상위 {parent.name}</span> : <span>최상위 기준 사용자</span>}
                  {hasChildren ? <span>하위 {childElements.length}명</span> : <span>하위 없음</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
        {hasChildren && expanded ? <div className="mt-2 space-y-2">{childElements}</div> : null}
      </div>
    );
  }

  function validateEditForm() {
    if (!editForm.title.trim()) return "이벤트 제목을 입력해 주세요.";
    if (new Date(editForm.endDate) < new Date(editForm.startDate)) return "종료일은 시작일보다 빠를 수 없습니다.";
    if (new Date(editForm.registrationDeadline) > new Date(editForm.startDate)) return "등록 마감은 시작일보다 늦을 수 없습니다.";
    return null;
  }

  async function replaceParticipants() {
    const currentSession = getSession();
    if (!currentSession || !event) return;

    if (isRegistrationClosed) {
      setError("현재 이 이벤트는 등록을 변경할 수 없습니다.");
      setFeedback(null);
      return;
    }

    if (!selectedParticipantIds.length) {
      setError("최소 1명의 참여자를 선택해 주세요.");
      setFeedback(null);
      return;
    }

    if (duplicateSelectedIds.length) {
      setError("중복 선택된 참여자가 있습니다.");
      setFeedback(null);
      return;
    }

    try {
      const response = await apiFetch<EventSummary>(`/events/${params.id}/registrations`, {
        method: "PATCH",
        token: currentSession.accessToken,
        body: { participantUserIds: [...new Set(selectedParticipantIds)] },
      });
      setSummary(response);
      setSelectedParticipantIds(response.registrations.map((entry) => entry.participantUserId));
      setFeedback("참여 등록을 저장했습니다.");
      setError(null);
    } catch (caught) {
      setFeedback(null);
      setError(caught instanceof Error ? caught.message : "참여 등록 저장 중 오류가 발생했습니다.");
    }
  }

  async function removeRegistration(registrationId: string) {
    const currentSession = getSession();
    if (!currentSession) return;
    try {
      await apiFetch(`/events/${params.id}/registrations/${registrationId}`, {
        method: "DELETE",
        token: currentSession.accessToken,
      });
      setFeedback("참여 등록을 취소했습니다.");
      setError(null);
      await load();
    } catch (caught) {
      setFeedback(null);
      setError(caught instanceof Error ? caught.message : "등록 취소 중 오류가 발생했습니다.");
    }
  }

  async function generateCopy(eventFormSubmit: FormEvent<HTMLFormElement>) {
    eventFormSubmit.preventDefault();
    const currentSession = getSession();
    if (!currentSession) return;
    if (!copyForm.templateId) {
      setError("문안 생성에 사용할 템플릿을 선택해 주세요.");
      return;
    }

    try {
      const result = await apiFetch<{ text: string }>(`/events/${params.id}/generate-copy`, {
        method: "POST",
        token: currentSession.accessToken,
        body: copyForm,
      });
      setGeneratedCopy(result.text);
      setFeedback("문안을 생성했고 클립보드로 복사했습니다.");
      setError(null);
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(result.text);
      }
      await load();
    } catch (caught) {
      setFeedback(null);
      setError(caught instanceof Error ? caught.message : "문안 생성 중 오류가 발생했습니다.");
    }
  }

  async function copyGeneratedText() {
    if (!generatedCopy) return;
    await navigator.clipboard.writeText(generatedCopy);
    setFeedback("문안을 다시 복사했습니다.");
    setError(null);
  }

  async function updateEvent(eventFormSubmit: FormEvent<HTMLFormElement>) {
    eventFormSubmit.preventDefault();
    const currentSession = getSession();
    if (!currentSession) return;

    const validationMessage = validateEditForm();
    if (validationMessage) {
      setError(validationMessage);
      setFeedback(null);
      return;
    }

    try {
      await apiFetch(`/events/${params.id}`, {
        method: "PATCH",
        token: currentSession.accessToken,
        body: {
          ...editForm,
          feePerPerson: Number(editForm.feePerPerson),
        },
      });
      setEditStep(0);
      setFeedback("이벤트 정보를 수정했습니다.");
      setError(null);
      await load();
    } catch (caught) {
      setFeedback(null);
      setError(caught instanceof Error ? caught.message : "이벤트 수정 중 오류가 발생했습니다.");
    }
  }

  if (!event || !summary) {
    return (
      <PageShell title="이벤트 상세">
        <Card>이벤트 정보를 불러오는 중입니다.</Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="이벤트 상세">
      {feedback ? (
        <div className="rounded-[24px] bg-[#e8f8ee] px-5 py-4 text-sm text-[#14633f]">{feedback}</div>
      ) : null}
      {error ? (
        <div className="rounded-[24px] bg-[#fff0f0] px-5 py-4 text-sm text-[#a12626]">{error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassMap[event.status]}`}>{statusLabelMap[event.status]}</span>
            <span className="rounded-full bg-[#fff2df] px-3 py-1 text-xs font-semibold text-[#9a5b00]">{event.category?.name ?? "-"}</span>
            {event.popupEnabled ? <span className="rounded-full bg-[#eef7f3] px-3 py-1 text-xs text-secondary">팝업 노출</span> : null}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${deadlineToneClass}`}>
              {isRegistrationClosed
                ? "등록 마감"
                : deadlineDiffDays !== null && deadlineDiffDays <= 0
                  ? "오늘 마감"
                  : `${deadlineDiffDays ?? 0}일 남음`}
            </span>
          </div>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_260px]">
            <div>
              <h3 className="text-2xl font-semibold">{event.title}</h3>
              <p className="mt-3 truncate text-sm text-[#6f6255]" title={summarizeDescription(event.description)}>
                {summarizeDescription(event.description)}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-white/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">행사 기간</p>
                  <p className="mt-2 text-sm font-semibold">{formatDateText(event.startDate)} ~ {formatDateText(event.endDate)}</p>
                </div>
                <div className="rounded-[22px] bg-white/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">등록 마감</p>
                  <p className="mt-2 text-sm font-semibold">{formatDateTimeText(event.registrationDeadline)}</p>
                </div>
                <div className="rounded-[22px] bg-white/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">장소</p>
                  <p className="mt-2 text-sm font-semibold">{event.location}</p>
                </div>
                <div className="rounded-[22px] bg-white/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">1인 참가비</p>
                  <p className="mt-2 text-sm font-semibold">{event.feePerPerson.toLocaleString("ko-KR")}원</p>
                </div>
              </div>
            </div>
            <div className="rounded-[28px] bg-[#241b17] p-5 text-white">
              <p className="text-xs uppercase tracking-[0.22em] text-[#d6c1ac]">빠른 요약</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[20px] bg-white/10 px-4 py-3">
                  <p className="text-xs text-[#d6c1ac]">현재 내 등록 비중</p>
                  <p className="mt-2 text-2xl font-semibold">{summaryRatio}%</p>
                </div>
                <div className="rounded-[20px] bg-white/10 px-4 py-3">
                  <p className="text-xs text-[#d6c1ac]">전체 예상 금액</p>
                  <p className="mt-2 text-lg font-semibold">{summary.totalExpectedAmount.toLocaleString("ko-KR")}원</p>
                </div>
                <div className="rounded-[20px] bg-white/10 px-4 py-3">
                  <p className="text-xs text-[#d6c1ac]">현재 선택 변화</p>
                  <p className="mt-2 text-lg font-semibold">
                    {selectionDelta > 0 ? `+${selectionDelta}명` : selectionDelta < 0 ? `${selectionDelta}명` : "변경 없음"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {isRegistrationClosed ? (
            <div className="mt-5 rounded-[22px] bg-[#fff4e4] px-4 py-4 text-sm leading-7 text-[#9a5b00]">
              등록 마감 또는 종료 상태라서 참여 인원을 더 이상 변경할 수 없습니다.
            </div>
          ) : (
            <div className="mt-5 rounded-[22px] bg-[#eef7f3] px-4 py-4 text-sm leading-7 text-secondary">
              현재 본인과 하위 조직 인원만 선택할 수 있으며,
              저장 즉시 예상 금액 요약이 업데이트됩니다.
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-xl font-semibold">등록 KPI</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] bg-white/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">내 등록 참여자</p>
              <p className="mt-3 text-2xl font-semibold">{summary.myRegisteredCount}명</p>
              <p className="mt-1 text-sm text-[#6f6255]">{summary.myExpectedTotalAmount.toLocaleString("ko-KR")}원</p>
            </div>
            <div className="rounded-[24px] bg-white/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">내 조직 등록 참여자</p>
              <p className="mt-3 text-2xl font-semibold">{summary.descendantRegisteredCount}명</p>
              <p className="mt-1 text-sm text-[#6f6255]">{summary.descendantExpectedTotalAmount.toLocaleString("ko-KR")}원</p>
            </div>
            <div className="rounded-[24px] bg-[#f6eee4] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">현재 선택 인원</p>
              <p className="mt-3 text-2xl font-semibold">{selectedParticipantIds.length}명</p>
              <p className="mt-1 text-sm text-[#6f6255]">{expectedAmount.toLocaleString("ko-KR")}원</p>
            </div>
            <div className="rounded-[24px] bg-[#241b17] px-4 py-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-[#d6c1ac]">이벤트 전체 예상</p>
              <p className="mt-3 text-2xl font-semibold">{summary.totalParticipantCount}명</p>
              <p className="mt-1 text-sm text-[#f0dfd1]">{summary.totalExpectedAmount.toLocaleString("ko-KR")}원</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold">참여자 선택</h3>
              <p className="mt-2 text-sm leading-7 text-[#6f6255]">
                본인과 하위 조직 사용자만 선택할 수 있습니다.
                <br />
                선택 인원 수와 예상 금액은 실시간으로 반영됩니다.
              </p>
            </div>
            <div className="rounded-[22px] bg-[#fff4e4] px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">선택 요약</p>
              <p className="mt-2 text-lg font-semibold">{selectedParticipantIds.length}명</p>
              <p className="text-sm text-[#6f6255]">{expectedAmount.toLocaleString("ko-KR")}원</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px]">
            <Input
              placeholder="이름 또는 아이디 검색"
              value={participantSearch}
              onChange={(event) => setParticipantSearch(event.target.value)}
            />
            <div className="flex gap-2 rounded-full bg-white/80 p-1">
              <button
                type="button"
                onClick={() => setParticipantView("all")}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-medium ${participantView === "all" ? "bg-[#241b17] text-white" : "text-[#6f6255]"}`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setParticipantView("selected")}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-medium ${participantView === "selected" ? "bg-[#241b17] text-white" : "text-[#6f6255]"}`}
              >
                선택됨
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setSelectedParticipantIds(users.map((user) => user.id))} disabled={isRegistrationClosed || !users.length}>
              전체 선택
            </Button>
            <Button type="button" variant="outline" onClick={() => setSelectedParticipantIds([])} disabled={isRegistrationClosed || !selectedParticipantIds.length}>
              전체 해제
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const currentIds = new Set(selectedParticipantIds);
                setSelectedParticipantIds(
                  users
                    .filter((user) => !currentIds.has(user.id))
                    .map((user) => user.id)
                    .concat(selectedParticipantIds),
                );
              }}
              disabled={isRegistrationClosed || !users.length}
            >
              선택 반전
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setParticipantSearch("");
                setParticipantView("all");
              }}
            >
              필터 초기화
            </Button>
          </div>
          <div className="mt-6 rounded-[24px] border border-white/70 bg-white/45 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#241b17]">조직 트리 선택</p>
                <p className="mt-1 text-xs text-[#8c7c6a]">
                  상위 사용자를 펼치면 하위 조직이 이어집니다. 검색 중에도 상위 맥락을 유지합니다.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setExpandedNodeIds(
                      users
                        .filter((user) => users.some((candidate) => candidate.parentUserId === user.id))
                        .map((user) => user.id),
                    )
                  }
                >
                  모두 펼치기
                </Button>
                <Button type="button" variant="outline" onClick={() => setExpandedNodeIds([])}>
                  모두 접기
                </Button>
              </div>
            </div>
            {participantTree.length ? (
              <div className="space-y-2">
                {participantTree.map((node, index) => renderParticipantNode(node, 0, index === participantTree.length - 1))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#d7c8b6] bg-white/60 px-5 py-12 text-center text-sm text-[#6f6255]">
                조건에 맞는 참여자가 없습니다.
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" disabled={isRegistrationClosed} onClick={replaceParticipants}>
              선택 인원 저장
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedParticipantIds(summary.registrations.map((entry) => entry.participantUserId))}
            >
              현재 등록으로 되돌리기
            </Button>
          </div>
          <div className="mt-5 rounded-[24px] border border-white/70 bg-white/80 p-4">
            <p className="text-sm font-semibold">선택된 참여자</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedUsers.length ? (
                selectedUsers.map((user) => (
                  <span key={user.id} className="rounded-full border border-[#ead8c1] bg-[#fff8ef] px-3 py-1 text-sm">
                    {user.name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[#8c7c6a]">선택된 참여자가 없습니다.</span>
              )}
            </div>
            {selectedUsers.length ? (
              <p className="mt-4 text-xs leading-6 text-[#8c7c6a]">
                저장 전 상태입니다. 현재 선택 기준 예상 금액은 {expectedAmount.toLocaleString("ko-KR")}원이며,
                저장하면 등록 요약 카드가 즉시 갱신됩니다.
              </p>
            ) : null}
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-semibold">등록 요약 카드</h3>
          <div className="mt-5 grid gap-3">
            <div className="rounded-[22px] border border-white/70 bg-white/80 p-4">
              <p className="text-sm font-semibold">내 등록 참여자</p>
              <p className="mt-3 text-2xl font-semibold">{summary.myRegisteredCount}명</p>
            </div>
            <div className="rounded-[22px] border border-white/70 bg-white/80 p-4">
              <p className="text-sm font-semibold">내 조직 등록 참여자</p>
              <p className="mt-3 text-2xl font-semibold">{summary.descendantRegisteredCount}명</p>
            </div>
            <div className="rounded-[22px] border border-white/70 bg-white/80 p-4">
              <p className="text-sm font-semibold">예상 총 금액</p>
              <p className="mt-3 text-2xl font-semibold">{summary.totalExpectedAmount.toLocaleString("ko-KR")}원</p>
            </div>
          </div>
          <div className="mt-6 rounded-[24px] border border-white/70 bg-white/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">등록자별 참여 요약</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setChartMetric("participantCount")}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${chartMetric === "participantCount" ? "bg-[#241b17] text-white" : "bg-[#f4ede4] text-[#6f6255]"}`}
                >
                  참여 인원
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric("expectedAmount")}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${chartMetric === "expectedAmount" ? "bg-[#241b17] text-white" : "bg-[#f4ede4] text-[#6f6255]"}`}
                >
                  예상 금액
                </button>
              </div>
            </div>
            <div className="mt-4 h-[220px]">
              {userSummaryChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userSummaryChartData}>
                    <CartesianGrid stroke="#e7dbcd" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-12} textAnchor="end" height={48} />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number, key) =>
                        key === "expectedAmount"
                          ? [`${value.toLocaleString("ko-KR")}원`, "예상 금액"]
                          : [`${value}명`, "참여 인원"]
                      }
                    />
                    <Bar dataKey={chartMetric} fill={chartMetric === "participantCount" ? "#a23e2b" : "#2f5d50"} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[18px] bg-[#faf5ee] text-sm text-[#8c7c6a]">
                  아직 시각화할 등록 요약이 없습니다.
                </div>
              )}
            </div>
          </div>

          <h3 className="mt-8 text-xl font-semibold">등록 현황</h3>
          <div className="mt-5 space-y-3">
            {summary.registrations.length ? (
              summary.registrations.map((registration) => (
                <div key={registration.id} className="rounded-[22px] border border-white/70 bg-white/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">{registration.participantUser?.name ?? "-"}</p>
                      <p className="mt-1 text-sm text-[#6f6255]">{registration.participantUser?.loginId ?? "-"}</p>
                      <p className="mt-2 text-xs text-[#8c7c6a]">등록자 {registration.createdByUser?.name ?? "-"}</p>
                    </div>
                    <Button type="button" variant="outline" disabled={isRegistrationClosed} onClick={() => removeRegistration(registration.id)}>
                      취소
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#d7c8b6] bg-white/60 px-5 py-12 text-center text-sm text-[#6f6255]">
                아직 저장된 참여 등록이 없습니다.
              </div>
            )}
          </div>
        </Card>
      </div>

      {isAdmin ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card>
            <h3 className="text-xl font-semibold">이벤트 공지 수정</h3>
            <div className="mt-5 flex flex-wrap gap-2">
              {editStepItems.map((step) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setEditStep(step.key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    editStep === step.key ? "bg-[#241b17] text-white" : "bg-white/80 text-[#6f6255]"
                  }`}
                >
                  {step.label}
                </button>
              ))}
            </div>
            <form className="mt-6 space-y-4" onSubmit={updateEvent}>
              {editStep === 0 ? (
                <>
                  <Input placeholder="이벤트 제목" value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} required />
                  <select className="min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm" value={editForm.categoryId} onChange={(event) => setEditForm((current) => ({ ...current, categoryId: event.target.value }))}>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  <textarea
                    className="min-h-[120px] w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm outline-none"
                    placeholder="이벤트 설명"
                    value={editForm.description}
                    onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                  />
                  <Input placeholder="장소" value={editForm.location} onChange={(event) => setEditForm((current) => ({ ...current, location: event.target.value }))} required />
                </>
              ) : null}
              {editStep === 1 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input type="datetime-local" value={editForm.startDate} onChange={(event) => setEditForm((current) => ({ ...current, startDate: event.target.value }))} required />
                    <Input type="datetime-local" value={editForm.endDate} onChange={(event) => setEditForm((current) => ({ ...current, endDate: event.target.value }))} required />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input type="datetime-local" value={editForm.registrationDeadline} onChange={(event) => setEditForm((current) => ({ ...current, registrationDeadline: event.target.value }))} required />
                    <Input type="number" min="0" value={editForm.feePerPerson} onChange={(event) => setEditForm((current) => ({ ...current, feePerPerson: event.target.value }))} required />
                  </div>
                </>
              ) : null}
              {editStep === 2 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input type="datetime-local" value={editForm.visibilityStartAt} onChange={(event) => setEditForm((current) => ({ ...current, visibilityStartAt: event.target.value }))} required />
                    <Input type="datetime-local" value={editForm.visibilityEndAt} onChange={(event) => setEditForm((current) => ({ ...current, visibilityEndAt: event.target.value }))} required />
                  </div>
                  <div className="flex items-center gap-3 rounded-[20px] border border-white/70 bg-white/70 px-4 py-3">
                    <input
                      id="event-popup-checkbox"
                      type="checkbox"
                      checked={editForm.popupEnabled}
                      onChange={(event) => setEditForm((current) => ({ ...current, popupEnabled: event.target.checked }))}
                    />
                    <label htmlFor="event-popup-checkbox" className="text-sm font-medium">팝업 노출</label>
                  </div>
                  <select className="min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm" value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}>
                    <option value="DRAFT">초안</option>
                    <option value="ACTIVE">진행중</option>
                    <option value="CLOSED">마감</option>
                    <option value="ARCHIVED">보관</option>
                  </select>
                  <div className="rounded-[24px] bg-[#f8f2e9] p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">수정 미리보기</p>
                    <p className="mt-3 text-lg font-semibold text-[#241b17]">{editForm.title || "이벤트 제목"}</p>
                    <div className="mt-3 grid gap-2 text-sm text-[#6f6255]">
                      <span>카테고리 {selectedCategory?.name ?? "-"}</span>
                      <span>장소 {editForm.location || "-"}</span>
                      <span>참가비 {Number(editForm.feePerPerson || 0).toLocaleString("ko-KR")}원</span>
                      <span>상태 {statusLabelMap[editForm.status as EventDetail["status"]]}</span>
                    </div>
                  </div>
                </>
              ) : null}
              <div className="flex flex-wrap gap-3">
                {editStep > 0 ? (
                  <Button type="button" variant="outline" onClick={() => setEditStep((current) => (current - 1) as 0 | 1 | 2)}>
                    이전 단계
                  </Button>
                ) : null}
                {editStep < 2 ? (
                  <Button type="button" onClick={() => setEditStep((current) => (current + 1) as 0 | 1 | 2)}>
                    다음 단계
                  </Button>
                ) : (
                  <Button type="submit">이벤트 수정 저장</Button>
                )}
              </div>
            </form>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold">카카오 문안 생성</h3>
            <p className="mt-2 text-sm leading-7 text-[#6f6255]">
              선택한 템플릿으로 문안을 미리 확인하고 복사할 수 있습니다.
              <br />
              생성 시 복사 로그도 함께 저장됩니다.
            </p>
            <div className="mt-4 rounded-[20px] bg-[#f8f2e9] px-4 py-3 text-sm text-[#6f6255]">
              현재 참가비는 <span className="font-semibold text-[#241b17]">{event?.feePerPerson.toLocaleString("ko-KR")}원</span>입니다.
              금액을 바꾼 뒤에는 아래에서 문안을 다시 생성해야 새 금액이 반영됩니다.
            </div>
            <form className="mt-6 space-y-4" onSubmit={generateCopy}>
              <select className="min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm" value={copyForm.templateId} onChange={(event) => setCopyForm((current) => ({ ...current, templateId: event.target.value }))}>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
              <select className="min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm" value={copyForm.channel} onChange={(event) => setCopyForm((current) => ({ ...current, channel: event.target.value }))}>
                <option value="KAKAO">카카오 문안</option>
                <option value="INTERNAL">내부 공지</option>
              </select>
              <Input placeholder="링크" value={copyForm.link} onChange={(event) => setCopyForm((current) => ({ ...current, link: event.target.value }))} />
              <div className="flex flex-wrap gap-3">
                <Button type="submit">미리보기 생성</Button>
                <Button type="button" variant="outline" disabled={!generatedCopy} onClick={copyGeneratedText}>
                  복사 버튼
                </Button>
              </div>
            </form>
            <div className="mt-5 rounded-[24px] border border-white/70 bg-white/80 p-4">
              <p className="text-sm font-semibold">카카오톡 복사 미리보기</p>
              <pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#3d342e]">{generatedCopy || "아직 생성된 문안이 없습니다."}</pre>
            </div>
            <div className="mt-5 rounded-[24px] border border-white/70 bg-white/80 p-4">
              <p className="text-sm font-semibold">복사 로그</p>
              <p className="mt-2 text-sm text-[#6f6255]">
                여기는 예전에 생성한 문안 기록입니다. 이벤트 금액이나 템플릿을 수정해도 자동으로 바뀌지 않습니다.
              </p>
              <div className="mt-3">
                <Input placeholder="템플릿명, 생성자, 문안 검색" value={copyLogSearch} onChange={(event) => setCopyLogSearch(event.target.value)} />
              </div>
              <div className="mt-3 space-y-2">
                {filteredCopyLogs.length ? (
                  filteredCopyLogs.map((log) => (
                    <button
                      key={log.id}
                      type="button"
                      className="block w-full rounded-[18px] bg-[#f8f2e9] px-3 py-3 text-left text-sm transition hover:bg-[#f3eadf]"
                      onClick={() => setOpenedCopyLogId((current) => (current === log.id ? null : log.id))}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{log.template?.name ?? "-"}</span>
                        <span className="text-xs text-[#8c7c6a]">{log.createdAt.slice(0, 16).replace("T", " ")}</span>
                      </div>
                      <p className="mt-1 text-[#6f6255]">{log.user?.name ?? "-"} / {log.channel}</p>
                      <p className="mt-2 text-xs font-medium text-[#8c7c6a]">
                        {openedCopyLogId === log.id ? "문안 접기" : "문안 펼쳐보기"}
                      </p>
                      {openedCopyLogId === log.id ? (
                        <pre className="mt-3 whitespace-pre-wrap rounded-[16px] bg-white/70 px-3 py-3 text-xs leading-6 text-[#3d342e]">
                          {log.generatedText}
                        </pre>
                      ) : null}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-[#8c7c6a]">조건에 맞는 복사 로그가 없습니다.</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}
