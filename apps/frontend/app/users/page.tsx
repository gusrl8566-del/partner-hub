"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { roleLabel, statusLabel } from "@/lib/display";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);

  async function loadUsers() {
    const session = getSession();
    if (!session) return;
    const result = await apiFetch<any[]>("/users", { token: session.accessToken });
    setUsers(result);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function toggleNode(userId: string) {
    setCollapsedIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  function roleBadgeClass(role: string) {
    return role === "ADMIN"
      ? "border-[#d7c0ff] bg-[#f3edff] text-[#5d33a6]"
      : "border-[#a8d6c2] bg-[#e9f8f0] text-[#136245]";
  }

  function statusBadgeClass(status: string) {
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

  function countDescendants(user: any): number {
    if (!user.children?.length) {
      return 0;
    }

    return user.children.reduce((total: number, child: any) => total + 1 + countDescendants(child), 0);
  }

  function countDirectChildren(user: any): number {
    return user.children?.length ?? 0;
  }

  function renderTree(nodes: any[]) {
    return (
      <ul className="space-y-3 pl-2 sm:pl-4">
        {nodes.map((user) => (
          <li
            key={user.id}
            className="relative pl-5 before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-[#d7c8b6]"
          >
            <div className="absolute left-0 top-8 h-px w-4 bg-[#d7c8b6]" />
            <div className="rounded-[24px] border border-white/70 bg-white/88 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  onClick={() => (user.children?.length ? toggleNode(user.id) : undefined)}
                >
                  {user.children?.length ? (
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#d7c8b6] bg-[#f7efe4] text-xs font-bold text-[#7a6959]">
                      {collapsedIds.includes(user.id) ? "+" : "-"}
                    </span>
                  ) : (
                    <span className="mt-2 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[#cbb298]" />
                  )}
                  <span className="min-w-0">
                    <p className="font-semibold">{user.name}</p>
                    <p className="mt-1 text-sm text-[#6f6255]">{user.loginId}</p>
                    {user.children?.length ? (
                      <p className="mt-2 text-xs font-medium text-[#8a7765]">
                        {collapsedIds.includes(user.id) ? "하위 펼치기" : "하위 접기"}
                      </p>
                    ) : null}
                  </span>
                </button>
                <Link className="text-sm font-medium text-secondary underline underline-offset-4" href={`/users/${user.id}`}>
                  보기
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className={roleBadgeClass(user.role)}>{roleLabel(user.role)}</Badge>
                <Badge className={statusBadgeClass(user.status)}>{statusLabel(user.status)}</Badge>
                <Badge className="border-[#d9ccb8] bg-[#f7efe4] text-[#6f5846]">
                  직계 하위 {countDirectChildren(user)}명
                </Badge>
                <Badge className="border-[#d9ccb8] bg-[#f1e5d6] text-[#6a5141]">
                  전체 하위 {countDescendants(user)}명
                </Badge>
              </div>
            </div>
            {user.children?.length && !collapsedIds.includes(user.id) ? (
              <div className="mt-3">{renderTree(user.children)}</div>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  const userMap = new Map(users.map((user) => [user.id, { ...user, children: [] as any[] }]));
  const rootUsers: any[] = [];

  for (const user of userMap.values()) {
    if (user.parentUserId && userMap.has(user.parentUserId)) {
      userMap.get(user.parentUserId).children.push(user);
    } else {
      rootUsers.push(user);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;
    const formData = new FormData(event.currentTarget);
    const result = await apiFetch<{ inviteCode: string; user: { loginId: string } }>("/users", {
      method: "POST",
      token: session.accessToken,
      body: {
        loginId: formData.get("loginId"),
        name: formData.get("name"),
        role: formData.get("role"),
        parentUserId: formData.get("parentUserId") || undefined,
      },
    });
    setInfo(`${result.user.loginId} 사용자가 생성되었습니다. 초대코드: ${result.inviteCode}`);
    event.currentTarget.reset();
    await loadUsers();
  }

  return (
    <PageShell title="사용자">
      <div className="grid gap-6 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="h-fit">
          <h3 className="text-xl font-semibold">사용자 생성</h3>
          <p className="mt-2 text-sm leading-7 text-[#6f6255]">관리자는 최상위 또는 하위 사용자를 생성하고 즉시 첫 접속 코드를 발급할 수 있습니다.</p>
          <form className="mt-6 space-y-4" onSubmit={createUser}>
            <Input name="name" placeholder="이름" required />
            <Input name="loginId" placeholder="아이디" required />
            <select name="role" className="min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm">
              <option value="PARTNER">파트너</option>
              <option value="ADMIN">관리자</option>
            </select>
            <Input name="parentUserId" placeholder="상위 사용자 ID(선택)" />
            <Button type="submit">생성</Button>
          </form>
          {info ? <p className="mt-4 rounded-2xl bg-[#eef7f3] px-4 py-3 text-sm text-secondary">{info}</p> : null}
        </Card>
        <Card className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold">사용자 목록</h3>
              <p className="mt-2 text-sm leading-7 text-[#6f6255]">
                상위 그룹과 하위 파트너 관계가 바로 읽히도록 트리 구조로 표시합니다.
              </p>
            </div>
            <div className="rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium">
              총 {users.length}명
            </div>
          </div>
          <div className="mt-4">{renderTree(rootUsers)}</div>
        </Card>
      </div>
    </PageShell>
  );
}
