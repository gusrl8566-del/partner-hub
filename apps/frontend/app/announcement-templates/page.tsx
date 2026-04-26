"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { summarizeDescription } from "@/lib/utils";

type Template = {
  id: string;
  name: string;
  description: string | null;
  kakaoTemplate: string;
  internalTemplate: string;
  status: "ACTIVE" | "INACTIVE";
};

const placeholderGuide = [
  { token: "{eventName}", example: "이벤트명" },
  { token: "{categoryName}", example: "카테고리명" },
  { token: "{date}", example: "행사 일정" },
  { token: "{location}", example: "장소" },
  { token: "{deadline}", example: "신청 마감일" },
  { token: "{fee}", example: "120,000원" },
  { token: "{link}", example: "신청 링크" },
];

const previewSample = {
  eventName: "2026년 5월 1박2일 세미나",
  categoryName: "1박2일세미나",
  date: "2026-05-17 ~ 2026-05-18",
  location: "가평 연수원",
  deadline: "2026-05-10",
  fee: "120,000원",
  link: "https://partner-hub.local/events/evt-1",
};

function renderPreview(template: string) {
  return Object.entries(previewSample).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template || "템플릿 내용을 입력하면 여기에서 미리보기가 표시됩니다.",
  );
}

export default function AnnouncementTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    kakaoTemplate: "",
    internalTemplate: "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kakaoPreview = useMemo(() => renderPreview(form.kakaoTemplate), [form.kakaoTemplate]);
  const internalPreview = useMemo(() => renderPreview(form.internalTemplate), [form.internalTemplate]);

  async function load() {
    const session = getSession();
    if (!session) return;
    if (session.user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    setTemplates(await apiFetch("/announcement-templates", { token: session.accessToken }));
  }

  useEffect(() => {
    load();
  }, []);

  function validateForm() {
    if (!form.name.trim()) {
      return "템플릿명을 입력해 주세요.";
    }
    if (!form.kakaoTemplate.trim() || !form.internalTemplate.trim()) {
      return "카카오 문안과 내부 문안을 모두 입력해 주세요.";
    }
    return null;
  }

  async function submitTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;

    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      setFeedback(null);
      return;
    }

    try {
      if (editingId) {
        await apiFetch(`/announcement-templates/${editingId}`, {
          method: "PATCH",
          token: session.accessToken,
          body: form,
        });
        setFeedback("템플릿을 수정했습니다.");
      } else {
        await apiFetch("/announcement-templates", {
          method: "POST",
          token: session.accessToken,
          body: form,
        });
        setFeedback("새 템플릿을 만들었습니다.");
      }

      setError(null);
      setEditingId(null);
      setForm({ name: "", description: "", kakaoTemplate: "", internalTemplate: "" });
      await load();
    } catch (caught) {
      setFeedback(null);
      setError(caught instanceof Error ? caught.message : "템플릿 저장 중 오류가 발생했습니다.");
    }
  }

  function startEdit(template: Template) {
    setEditingId(template.id);
    setFeedback(null);
    setError(null);
    setForm({
      name: template.name,
      description: template.description ?? "",
      kakaoTemplate: template.kakaoTemplate,
      internalTemplate: template.internalTemplate,
    });
  }

  function resetForm() {
    setEditingId(null);
    setError(null);
    setFeedback(null);
    setForm({ name: "", description: "", kakaoTemplate: "", internalTemplate: "" });
  }

  async function toggleStatus(template: Template) {
    const session = getSession();
    if (!session) return;

    await apiFetch(`/announcement-templates/${template.id}/${template.status === "ACTIVE" ? "deactivate" : "activate"}`, {
      method: "PATCH",
      token: session.accessToken,
    });
    setFeedback(`${template.name} 템플릿 상태를 변경했습니다.`);
    await load();
  }

  return (
    <PageShell title="공지 템플릿">
      <div className="grid gap-6 2xl:grid-cols-[440px_minmax(0,1fr)]">
        <Card className="h-fit">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">{editingId ? "템플릿 수정" : "템플릿 생성"}</h3>
              <p className="mt-2 text-sm leading-7 text-[#6f6255]">
                카카오톡 복사용과 내부 공지용 문안을 분리해서 관리합니다.
                <br />
                아래 변수는 이벤트 데이터로 자동 치환됩니다.
              </p>
            </div>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                새로 작성
              </Button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {placeholderGuide.map((placeholder) => (
              <span
                key={placeholder.token}
                className="rounded-full border border-[#ead8c1] bg-[#fff8ef] px-3 py-1 text-sm"
                title={`${placeholder.token} -> ${placeholder.example}`}
              >
                {placeholder.token} = {placeholder.example}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-[#6f6255]">
            <code>{"{fee}"}</code> 는 자동으로 <code>120,000원</code>처럼 들어갑니다. 템플릿에는 <code>{"{fee}"}</code>만 넣고 금액 숫자나 <code>원</code>을 따로 적지 않아도 됩니다.
          </p>

          {feedback ? (
            <p className="mt-4 rounded-[20px] bg-[#e8f8ee] px-4 py-3 text-sm text-[#14633f]">{feedback}</p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-[20px] bg-[#fff0f0] px-4 py-3 text-sm text-[#a12626]">{error}</p>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={submitTemplate}>
            <Input
              placeholder="템플릿명"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <Input
              placeholder="설명"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
            <textarea
              className="min-h-[160px] w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm outline-none"
              placeholder="카카오 문안"
              value={form.kakaoTemplate}
              onChange={(event) => setForm((current) => ({ ...current, kakaoTemplate: event.target.value }))}
            />
            <textarea
              className="min-h-[160px] w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm outline-none"
              placeholder="내부 공지 문안"
              value={form.internalTemplate}
              onChange={(event) => setForm((current) => ({ ...current, internalTemplate: event.target.value }))}
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit">{editingId ? "수정 저장" : "템플릿 생성"}</Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  취소
                </Button>
              ) : null}
            </div>
          </form>

          <div className="mt-6 grid gap-4">
            <div className="rounded-[24px] border border-white/70 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8c7c6a]">카카오 미리보기</p>
              <pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#3d342e]">{kakaoPreview}</pre>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8c7c6a]">내부 공지 미리보기</p>
              <pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#3d342e]">{internalPreview}</pre>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {templates.length ? (
            templates.map((template) => (
              <Card key={template.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold">{template.name}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${template.status === "ACTIVE" ? "bg-[#e7f8ee] text-[#166343]" : "bg-[#f7f1e8] text-[#806750]"}`}>
                        {template.status === "ACTIVE" ? "활성" : "비활성"}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-[#6f6255]" title={summarizeDescription(template.description)}>
                      {summarizeDescription(template.description)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => startEdit(template)}>
                      수정
                    </Button>
                    <Button type="button" variant="outline" onClick={() => toggleStatus(template)}>
                      {template.status === "ACTIVE" ? "비활성화" : "활성화"}
                    </Button>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-[22px] border border-white/70 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">Kakao</p>
                    <pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#3d342e]">{template.kakaoTemplate}</pre>
                  </div>
                  <div className="rounded-[22px] border border-white/70 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">Internal</p>
                    <pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#3d342e]">{template.internalTemplate}</pre>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <div className="rounded-[24px] border border-dashed border-[#d7c8b6] bg-white/60 px-5 py-12 text-center text-sm text-[#6f6255]">
                아직 등록된 공지 템플릿이 없습니다.
                <br />
                왼쪽 폼에서 첫 템플릿을 만들어 주세요.
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
