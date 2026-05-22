"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { clearSession, getSession, Session } from "@/lib/auth";
import { roleLabel, statusLabel } from "@/lib/display";
import { cn } from "@/lib/utils";
import { EventPopupLayer } from "./event-popup-layer";
import { Button } from "./ui/button";

const navItems = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/events", label: "이벤트" },
  { href: "/announcement-templates", label: "공지 템플릿", roles: ["ADMIN"] },
  { href: "/users", label: "사용자" },
  { href: "/organization", label: "조직도" },
  { href: "/categories", label: "카테고리", roles: ["ADMIN"] },
  { href: "/participations", label: "참여 기록" },
  { href: "/stats", label: "통계" },
];

export function PageShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const nextSession = getSession();
    if (!nextSession) {
      router.replace("/login");
      return;
    }
    if (nextSession.user.mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password");
      return;
    }
    setSession(nextSession);
  }, [pathname, router]);

  if (!session) {
    return null;
  }

  const visibleNavItems = navItems.filter((item) =>
    item.roles ? item.roles.includes(session.user.role) : true,
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <EventPopupLayer />
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] gap-4 px-3 py-3 sm:gap-6 sm:px-5 sm:py-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="glass-panel mesh-border rounded-[32px] p-4 shadow-panel sm:p-6 xl:sticky xl:top-5 xl:flex xl:h-[calc(100vh-2.5rem)] xl:flex-col xl:overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#8f796c]">파트너 허브</p>
              <h1 className="mt-3 text-2xl font-semibold text-[#241b17] sm:text-3xl">{session.user.name}</h1>
              <p className="mt-2 text-sm text-[#6c584e]">
                {roleLabel(session.user.role)} · {statusLabel(session.user.status)}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white/75 text-foreground xl:hidden"
              onClick={() => setNavOpen((value) => !value)}
              aria-label="탐색 메뉴 열기"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <nav
            className={cn(
              "mt-6 space-y-2",
              navOpen ? "block" : "hidden xl:block",
              "xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1",
            )}
          >
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setNavOpen(false)}
                className={cn(
                  "block rounded-2xl px-4 py-3 text-sm font-medium transition",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-[#241b17] text-white shadow-[0_16px_40px_rgba(36,27,23,0.18)]"
                    : "bg-white/45 text-[#241b17] hover:bg-white/80",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Button
            variant="outline"
            className="mt-6 w-full shrink-0 border-[#d8c6b2] bg-white/65 text-foreground hover:bg-white"
            onClick={() => {
              clearSession();
              router.replace("/login");
            }}
          >
            로그아웃
          </Button>
        </aside>
        <section className="min-w-0 space-y-4 sm:space-y-6">
          <header className="glass-panel mesh-border rounded-[32px] px-5 py-5 shadow-panel sm:px-6 sm:py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#8c7c6a]">워크스페이스</p>
                <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</h2>
              </div>
              <div className="fluid-grid w-full lg:max-w-[32rem]">
                <div className="rounded-[24px] border border-white/60 bg-white/65 px-4 py-3">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#8c7c6a]">권한</p>
                  <p className="mt-2 text-sm font-semibold">{roleLabel(session.user.role)}</p>
                </div>
                <div className="rounded-[24px] border border-white/60 bg-white/65 px-4 py-3">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#8c7c6a]">상태</p>
                  <p className="mt-2 text-sm font-semibold">{statusLabel(session.user.status)}</p>
                </div>
              </div>
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
