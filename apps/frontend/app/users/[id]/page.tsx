"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { statusLabel } from "@/lib/display";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<any>(null);
  const [tree, setTree] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [parentFeedback, setParentFeedback] = useState<string | null>(null);
  const [parentError, setParentError] = useState<string | null>(null);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  async function load() {
    const session = getSession();
    if (!session) return;
    const [userResult, treeResult, usersResult] = await Promise.all([
      apiFetch<any>(`/users/${params.id}`, { token: session.accessToken }),
      apiFetch<any>(`/users/${params.id}/descendants`, { token: session.accessToken }),
      session.user.role === "ADMIN" ? apiFetch<any[]>("/users", { token: session.accessToken }) : Promise.resolve([]),
    ]);
    setUser(userResult);
    setTree(treeResult);
    setAllUsers(usersResult);
    setIsAdmin(session.user.role === "ADMIN");
    setSelectedParentId(userResult.parentUserId ?? "");
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function toggleBlocked(nextPath: "block" | "unblock") {
    const session = getSession();
    if (!session) return;
    await apiFetch(`/users/${params.id}/${nextPath}`, {
      method: "PATCH",
      token: session.accessToken,
    });
    await load();
  }

  async function createChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;
    const formData = new FormData(event.currentTarget);
    const result = await apiFetch<{ initialPassword: string }>(`/users/${params.id}/children`, {
      method: "POST",
      token: session.accessToken,
      body: {
        loginId: formData.get("loginId"),
        name: formData.get("name"),
      },
    });
    setInfo(`하위 파트너가 생성되었습니다. 초기 비밀번호: ${result.initialPassword}`);
    event.currentTarget.reset();
    await load();
  }

  async function updateParent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;
    setParentFeedback(null);
    setParentError(null);

    try {
      await apiFetch(`/users/${params.id}/parent`, {
        method: "PATCH",
        token: session.accessToken,
        body: {
          parentUserId: selectedParentId || null,
        },
      });
      setParentFeedback("상위 사용자를 변경했습니다.");
      await load();
    } catch (caught) {
      setParentError(caught instanceof Error ? caught.message : "상위 사용자 변경 중 오류가 발생했습니다.");
    }
  }

  async function resetPassword() {
    const session = getSession();
    if (!session) return;
    setResetFeedback(null);
    setResetError(null);

    try {
      const result = await apiFetch<{ initialPassword: string }>(
        "/auth/admin/reset-password",
        {
          method: "POST",
          token: session.accessToken,
          body: { userId: params.id },
        },
      );
      setResetFeedback(`비밀번호가 초기화되었습니다. 초기 비밀번호: ${result.initialPassword}`);
      await load();
    } catch (caught) {
      setResetError(caught instanceof Error ? caught.message : "비밀번호 초기화 중 오류가 발생했습니다.");
    }
  }

  function flattenTree(nodes: any[]): any[] {
    return nodes.flatMap((node) => [node, ...flattenTree(node.children ?? [])]);
  }

  const unavailableParentIds = useMemo(
    () => new Set([params.id, ...flattenTree(tree?.descendants ?? []).map((node) => node.id)]),
    [params.id, tree],
  );
  const parentOptions = useMemo(
    () => allUsers.filter((candidate) => !unavailableParentIds.has(candidate.id)),
    [allUsers, unavailableParentIds],
  );

  function renderTree(nodes: any[]) {
    return (
      <ul className="space-y-3 pl-2 sm:pl-4">
        {nodes.map((node) => (
          <li key={node.id} className="relative pl-5 before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-[#d7c8b6]">
            <div className="absolute left-0 top-7 h-px w-4 bg-[#d7c8b6]" />
            <div className="rounded-[24px] border border-white/70 bg-white/88 p-4">
              <p className="font-medium">{node.name}</p>
              <p className="text-sm text-[#6f6255]">{node.loginId}</p>
            </div>
            {node.children?.length ? <div className="mt-3">{renderTree(node.children)}</div> : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <PageShell title="사용자 상세">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <h3 className="text-xl font-semibold">{user?.name ?? "불러오는 중..."}</h3>
          <p className="mt-2 text-sm text-[#6f6255]">아이디: {user?.loginId}</p>
          <p className="mt-2 text-sm text-[#6f6255]">
            상위: {user?.parentUser ? `${user.parentUser.name} (${user.parentUser.loginId})` : "최상위"}
          </p>
          <p className="mt-2 text-sm">상태: {statusLabel(user?.status)}</p>
          <p className="mt-2 text-sm text-[#6f6255]">
            비밀번호: {user?.mustChangePassword ? "초기 비밀번호 변경 필요" : "설정 완료"}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => toggleBlocked("block")}>차단</Button>
            <Button variant="secondary" onClick={() => toggleBlocked("unblock")}>차단 해제</Button>
          </div>
        </Card>
        {isAdmin ? (
          <Card>
            <h3 className="text-xl font-semibold">상위 사용자 변경</h3>
            <form className="mt-6 space-y-4" onSubmit={updateParent}>
              <select
                className="min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm"
                value={selectedParentId}
                onChange={(event) => setSelectedParentId(event.target.value)}
              >
                <option value="">최상위</option>
                {parentOptions.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name} ({parent.loginId})
                  </option>
                ))}
              </select>
              <Button type="submit">상위 변경</Button>
            </form>
            {parentFeedback ? <p className="mt-4 rounded-2xl bg-[#eef7f3] px-4 py-3 text-sm text-secondary">{parentFeedback}</p> : null}
            {parentError ? <p className="mt-4 rounded-2xl bg-[#fff0f0] px-4 py-3 text-sm text-[#a12626]">{parentError}</p> : null}
          </Card>
        ) : null}
        {isAdmin ? (
          <Card>
            <h3 className="text-xl font-semibold">비밀번호 초기화</h3>
            <p className="mt-2 text-sm leading-7 text-[#6f6255]">
              사용자가 직접 비밀번호를 설정한 계정만 초기 비밀번호로 되돌릴 수 있습니다.
            </p>
            <div className="mt-6">
              <Button
                type="button"
                onClick={resetPassword}
                disabled={!user || user.mustChangePassword}
              >
                초기 비밀번호로 재설정
              </Button>
            </div>
            {user?.mustChangePassword ? (
              <p className="mt-4 rounded-2xl bg-[#fff8e9] px-4 py-3 text-sm text-[#8a5a12]">
                아직 초기 비밀번호 변경 전인 사용자는 초기화할 수 없습니다.
              </p>
            ) : null}
            {resetFeedback ? <p className="mt-4 rounded-2xl bg-[#eef7f3] px-4 py-3 text-sm text-secondary">{resetFeedback}</p> : null}
            {resetError ? <p className="mt-4 rounded-2xl bg-[#fff0f0] px-4 py-3 text-sm text-[#a12626]">{resetError}</p> : null}
          </Card>
        ) : null}
        <Card>
          <h3 className="text-xl font-semibold">직계 하위 파트너 생성</h3>
          <p className="mt-2 text-sm leading-7 text-[#6f6255]">생성된 사용자는 초기 비밀번호로 로그인한 뒤 새 비밀번호를 설정합니다.</p>
          <form className="mt-6 space-y-4" onSubmit={createChild}>
            <Input name="name" placeholder="하위 파트너 이름" required />
            <Input name="loginId" placeholder="하위 파트너 아이디" required />
            <Button type="submit">하위 파트너 생성</Button>
          </form>
          {info ? <p className="mt-4 rounded-2xl bg-[#eef7f3] px-4 py-3 text-sm text-secondary">{info}</p> : null}
        </Card>
      </div>
      <Card className="min-w-0">
        <h3 className="text-xl font-semibold">하위 조직 트리</h3>
        <div className="mt-6">{tree?.descendants ? renderTree(tree.descendants) : null}</div>
      </Card>
    </PageShell>
  );
}
