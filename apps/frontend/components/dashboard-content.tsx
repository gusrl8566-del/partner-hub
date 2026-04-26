"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "./page-shell";
import { Card } from "./ui/card";
import { getSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type DashboardData = {
  users: any[];
  categories: any[];
  participations: any[];
  stats: any[];
  events: any[];
  templates: any[];
};

export function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const session = getSession();

  useEffect(() => {
    if (!session) return;

    Promise.all([
      apiFetch<any[]>("/users", { token: session.accessToken }),
      apiFetch<any[]>("/categories", { token: session.accessToken }),
      apiFetch<any[]>("/participations", { token: session.accessToken }),
      apiFetch<any[]>("/stats/categories/monthly", { token: session.accessToken }),
      apiFetch<any[]>("/events", { token: session.accessToken }),
      session.user.role === "ADMIN"
        ? apiFetch<any[]>("/announcement-templates", { token: session.accessToken })
        : Promise.resolve([]),
    ]).then(([users, categories, participations, stats, events, templates]) => {
      setData({ users, categories, participations, stats, events, templates });
    });
  }, []);

  return (
    <PageShell title="대시보드">
      <div className="fluid-grid">
        {[
          { label: "이벤트", value: data?.events.length ?? 0, href: "/events", hint: "이벤트 공지와 등록 보기" },
          { label: "사용자", value: data?.users.length ?? 0, href: "/users", hint: "사용자 목록 보기" },
          { label: "카테고리", value: data?.categories.length ?? 0, href: "/categories", hint: "카테고리 관리로 이동" },
          { label: "참여 기록", value: data?.participations.length ?? 0, href: "/participations", hint: "참여 기록 상세 보기" },
          { label: "월별 집계", value: data?.stats.length ?? 0, href: "/stats", hint: "월별 통계 보기" },
          { label: "공지 템플릿", value: data?.templates.length ?? 0, href: "/announcement-templates", hint: "문안 템플릿 관리" },
        ]
          .filter((item) => {
            if (item.label === "공지 템플릿" || item.label === "카테고리") {
              return session?.user.role === "ADMIN";
            }
            return true;
          })
          .map((item) => (
          <Link key={item.label} href={item.href} className="block">
            <Card className="relative overflow-hidden transition duration-200 hover:-translate-y-1 hover:bg-white/95">
              <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#e3b04b]/20 blur-2xl" />
              <p className="text-xs uppercase tracking-[0.3em] text-[#8c7c6a]">{item.label}</p>
              <p className="mt-4 text-4xl font-semibold sm:text-5xl">{item.value}</p>
              <p className="mt-4 text-sm text-[#6f6255]">{item.hint}</p>
            </Card>
          </Link>
          ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <Card className="min-h-[220px]">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8c7c6a]">개요</p>
          <h3 className="mt-3 text-2xl font-semibold sm:text-3xl">운영 현황</h3>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6f6255] sm:text-base">
            이 대시보드는 사용자 등록 상태, 참여량, 카테고리 현황을 한 화면에서 빠르게 파악할 수 있도록 구성되어 있습니다.
          </p>
        </Card>
        <Card className="bg-[#241b17] text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-[#d6c1ac]">시스템 안내</p>
          <p className="mt-4 text-sm leading-7 text-[#f0dfd1]">
            이 UI는 카드형 정보 블록, 반응형 그리드, 선명한 액션 영역을 중심으로 설계되어 모바일부터 데스크톱까지 안정적으로 사용할 수 있습니다.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
