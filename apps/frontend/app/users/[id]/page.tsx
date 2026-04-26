"use client";

import { FormEvent, useEffect, useState } from "react";
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
  const [info, setInfo] = useState<string | null>(null);

  async function load() {
    const session = getSession();
    if (!session) return;
    const [userResult, treeResult] = await Promise.all([
      apiFetch(`/users/${params.id}`, { token: session.accessToken }),
      apiFetch(`/users/${params.id}/descendants`, { token: session.accessToken }),
    ]);
    setUser(userResult);
    setTree(treeResult);
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
    const result = await apiFetch<{ inviteCode: string }>(`/users/${params.id}/children`, {
      method: "POST",
      token: session.accessToken,
      body: {
        loginId: formData.get("loginId"),
        name: formData.get("name"),
      },
    });
    setInfo(`하위 파트너가 생성되었습니다. 초대코드: ${result.inviteCode}`);
    event.currentTarget.reset();
    await load();
  }

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
          <p className="mt-2 text-sm">상태: {statusLabel(user?.status)}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => toggleBlocked("block")}>차단</Button>
            <Button variant="secondary" onClick={() => toggleBlocked("unblock")}>차단 해제</Button>
          </div>
        </Card>
        <Card>
          <h3 className="text-xl font-semibold">직계 하위 파트너 생성</h3>
          <p className="mt-2 text-sm leading-7 text-[#6f6255]">좁은 화면에서는 전체 폭으로, 큰 화면에서는 2단 패널 구성으로 자연스럽게 정렬됩니다.</p>
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
