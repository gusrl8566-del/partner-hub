"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { Button } from "./ui/button";

type PopupEvent = {
  id: string;
  title: string;
  location: string;
  startDate: string;
  registrationDeadline: string;
  feePerPerson: number;
  category?: { name: string } | null;
};

export function EventPopupLayer() {
  const router = useRouter();
  const [event, setEvent] = useState<PopupEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session || session.user.role === "ADMIN") {
      return;
    }

    apiFetch<PopupEvent[]>("/event-popups/active", { token: session.accessToken }).then((events) => {
      setEvent(events[0] ?? null);
      setVisible(Boolean(events[0]));
      if (events[0]) {
        apiFetch(`/event-popups/${events[0].id}/read`, {
          method: "POST",
          token: session.accessToken,
        }).catch(() => undefined);
      }
    });
  }, []);

  if (!event) {
    return null;
  }

  const remainingHours = Math.max(
    0,
    Math.ceil((new Date(event.registrationDeadline).getTime() - Date.now()) / (1000 * 60 * 60)),
  );

  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 backdrop-blur-[2px] transition duration-300 sm:items-center ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className={`w-full max-w-xl rounded-[32px] border border-white/70 bg-[#fff9f1] p-6 shadow-[0_30px_80px_rgba(36,27,23,0.28)] transition duration-300 ${visible ? "translate-y-0 scale-100" : "translate-y-4 scale-[0.98]"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs uppercase tracking-[0.32em] text-[#9a836e]">이벤트 안내</p>
            <span className="rounded-full bg-[#241b17] px-3 py-1 text-xs font-semibold text-white">지금 신청 가능</span>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/75 text-[#6f6255] transition hover:bg-white"
            onClick={() => setEvent(null)}
            aria-label="팝업 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-3 text-2xl font-semibold text-[#241b17]">{event.title}</h3>
        <p className="mt-3 text-sm leading-7 text-[#6f6255]">
          현재 로그인 기준으로 등록 가능한 활성 이벤트입니다.
          <br />
          아직 참여 등록이 완료되지 않아 다시 안내되고 있습니다.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] bg-white/85 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">카테고리</p>
            <p className="mt-2 text-sm font-semibold">{event.category?.name ?? "-"}</p>
          </div>
          <div className="rounded-[20px] bg-white/85 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">참가비</p>
            <p className="mt-2 text-sm font-semibold">{event.feePerPerson.toLocaleString("ko-KR")}원 / 1인</p>
          </div>
          <div className="rounded-[20px] bg-white/85 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">행사일</p>
            <p className="mt-2 text-sm font-semibold">{event.startDate.slice(0, 10)}</p>
          </div>
          <div className="rounded-[20px] bg-white/85 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8c7c6a]">신청마감</p>
            <p className="mt-2 text-sm font-semibold">{event.registrationDeadline.slice(0, 10)}</p>
            <p className="mt-1 text-xs text-[#9a5b00]">약 {remainingHours}시간 남음</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            className="w-full flex-1"
            onClick={() => {
              setVisible(false);
              setEvent(null);
              router.push(`/events/${event.id}`);
            }}
          >
            참여자 등록하기
          </Button>
          <Button
            variant="secondary"
            className="sm:min-w-[10rem]"
            onClick={async () => {
              const session = getSession();
              if (!session) return;
              await apiFetch(`/event-popups/${event.id}/dismiss`, {
                method: "POST",
                token: session.accessToken,
                body: { dismissHours: 24 },
              });
              setEvent(null);
            }}
          >
            오늘 하루 보지 않기
          </Button>
          <Button
            variant="outline"
            className="sm:min-w-[10rem]"
            onClick={async () => {
              const session = getSession();
              if (!session) return;
              await apiFetch(`/event-popups/${event.id}/dismiss`, {
                method: "POST",
                token: session.accessToken,
                body: { dismissHours: 12 },
              });
              setEvent(null);
            }}
          >
            나중에 보기
          </Button>
        </div>
      </div>
    </div>
  );
}
