"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { roleLabel, statusLabel } from "@/lib/display";

type OrganizationUser = {
  id: string;
  loginId: string;
  name: string;
  role: "ADMIN" | "PARTNER";
  status: "PENDING" | "ACTIVE" | "BLOCKED";
  parentUserId: string | null;
  children?: OrganizationUser[];
};

export default function OrganizationPage() {
  const [roots, setRoots] = useState<OrganizationUser[]>([]);
  const [baseUser, setBaseUser] = useState<OrganizationUser | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadOrganization() {
      const session = getSession();
      if (!session) return;

      const users = await apiFetch<OrganizationUser[]>("/users", { token: session.accessToken });
      const userMap = new Map(users.map((user) => [user.id, { ...user, children: [] as OrganizationUser[] }]));

      for (const user of userMap.values()) {
        if (user.parentUserId && userMap.has(user.parentUserId)) {
          userMap.get(user.parentUserId)?.children?.push(user);
        }
      }

      const rootUsers = Array.from(userMap.values()).filter(
        (user) => !user.parentUserId || !userMap.has(user.parentUserId),
      );

      if (session.user.role === "ADMIN") {
        setBaseUser(null);
        setRoots(rootUsers);
        return;
      }

      const currentUser = userMap.get(session.user.id) ?? null;
      setBaseUser(currentUser);
      setRoots(currentUser ? [currentUser] : []);
    }

    loadOrganization();
  }, []);

  function toggleNode(userId: string) {
    setCollapsedIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  function roleBadgeClass(role: OrganizationUser["role"]) {
    return role === "ADMIN"
      ? "border-[#d7c0ff] bg-[#f3edff] text-[#5d33a6]"
      : "border-[#a8d6c2] bg-[#e9f8f0] text-[#136245]";
  }

  function statusBadgeClass(status: OrganizationUser["status"]) {
    switch (status) {
      case "ACTIVE":
        return "border-[#9fd7b3] bg-[#e8f8ee] text-[#14633f]";
      case "PENDING":
        return "border-[#f2cf8d] bg-[#fff5df] text-[#9a5b00]";
      case "BLOCKED":
        return "border-[#efb2b2] bg-[#fff0f0] text-[#a12626]";
      default:
        return "";
    }
  }

  function renderNodes(nodes: OrganizationUser[]) {
    return (
      <ul className="space-y-3 pl-2 sm:pl-4">
        {nodes.map((node) => (
          <li
            key={node.id}
            className="relative pl-5 before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-[#d7c8b6]"
          >
            <div className="absolute left-0 top-8 h-px w-4 bg-[#d7c8b6]" />
            <div className="rounded-[24px] border border-white/70 bg-white/88 p-4 shadow-[0_18px_40px_rgba(176,150,118,0.12)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  onClick={() => (node.children?.length ? toggleNode(node.id) : undefined)}
                >
                  {node.children?.length ? (
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#d7c8b6] bg-[#f7efe4] text-xs font-bold text-[#7a6959]">
                      {collapsedIds.includes(node.id) ? "+" : "-"}
                    </span>
                  ) : (
                    <span className="mt-2 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[#cbb298]" />
                  )}
                  <span className="min-w-0">
                    <p className="font-semibold">{node.name}</p>
                    <p className="mt-1 text-sm text-[#6f6255]">{node.loginId}</p>
                    {node.children?.length ? (
                      <p className="mt-2 text-xs font-medium text-[#8a7765]">
                        하위 {node.children.length}명 {collapsedIds.includes(node.id) ? "펼치기" : "접기"}
                      </p>
                    ) : null}
                  </span>
                </button>
                <div className="flex flex-wrap gap-2">
                  <Badge className={roleBadgeClass(node.role)}>{roleLabel(node.role)}</Badge>
                  <Badge className={statusBadgeClass(node.status)}>{statusLabel(node.status)}</Badge>
                </div>
              </div>
            </div>
            {node.children?.length && !collapsedIds.includes(node.id) ? (
              <div className="mt-3">{renderNodes(node.children)}</div>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <PageShell title="조직도">
      <Card>
        <h3 className="text-xl font-semibold">조직 구조</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#6f6255]">
          {baseUser
            ? `${baseUser.name} 기준으로 하위 조직을 트리 구조로 확인합니다.\n상위 사용자를 누르면 하위 파트너를 접거나 펼칠 수 있습니다.`
            : "관리자 기준 전체 조직도를 트리 구조로 보여줍니다.\n상위 사용자를 누르면 그룹과 하위 파트너를 단계별로 확인할 수 있습니다."}
        </p>
        <div className="mt-6">
          {roots.length ? (
            renderNodes(roots)
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#d7c8b6] bg-white/60 px-5 py-10 text-center text-sm text-[#6f6255]">
              표시할 조직 데이터가 없습니다.
            </div>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
