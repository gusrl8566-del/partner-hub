"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";

export default function ParticipationsPage() {
  const [participations, setParticipations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  async function load() {
    const session = getSession();
    if (!session) return;
    const [participationData, userData, categoryData] = await Promise.all([
      apiFetch<any[]>("/participations", { token: session.accessToken }),
      apiFetch<any[]>("/users", { token: session.accessToken }),
      apiFetch<any[]>("/categories", { token: session.accessToken }),
    ]);
    setParticipations(participationData);
    setUsers(userData);
    setCategories(categoryData);
    if (!participantIds.length && userData.length) {
      setParticipantIds([userData[0].id]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function addParticipantRow() {
    if (!users.length) return;
    setParticipantIds((current) => [...current, users[0].id]);
  }

  function removeParticipantRow(index: number) {
    setParticipantIds((current) => (current.length === 1 ? current : current.filter((_, currentIndex) => currentIndex !== index)));
  }

  function updateParticipant(index: number, userId: string) {
    setParticipantIds((current) => current.map((entry, currentIndex) => (currentIndex === index ? userId : entry)));
  }

  async function createParticipation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const uniqueParticipantIds = [...new Set(participantIds.filter(Boolean))];
    await apiFetch("/participations", {
      method: "POST",
      token: session.accessToken,
      body: {
        categoryId: formData.get("categoryId"),
        occurredAt: formData.get("occurredAt"),
        note: formData.get("note"),
        participantUserIds: uniqueParticipantIds,
      },
    });
    form.reset();
    if (users.length) {
      setParticipantIds([users[0].id]);
    }
    await load();
  }

  async function removeParticipation(id: string) {
    const session = getSession();
    if (!session) return;
    await apiFetch(`/participations/${id}`, {
      method: "DELETE",
      token: session.accessToken,
    });
    await load();
  }

  return (
    <PageShell title="참여 기록">
      <div className="grid gap-6 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="h-fit">
          <h3 className="text-xl font-semibold">참여 기록 등록</h3>
          <p className="mt-2 text-sm leading-7 text-[#6f6255]">
            참여자를 한 명씩 기록하거나, 여러 명을 한 번에 추가해 일괄 저장할 수 있습니다.
          </p>
          <form className="mt-6 space-y-4" onSubmit={createParticipation}>
            <select name="categoryId" className="min-h-12 w-full rounded-[1.25rem] border border-border bg-white/85 px-4 py-3 text-sm">
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <Input name="occurredAt" type="datetime-local" required />
            <Input name="note" placeholder="메모" required />
            <div className="rounded-[24px] border border-white/70 bg-white/75 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">참여자 선택</p>
                  <p className="mt-1 text-sm text-[#6f6255]">총 참여자 {participantIds.filter(Boolean).length}명</p>
                </div>
                <Button type="button" variant="outline" className="sm:min-w-[8rem]" onClick={addParticipantRow}>
                  + 참여자 추가
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {participantIds.map((participantId, index) => (
                  <div key={`${participantId}-${index}`} className="flex items-center gap-2 sm:gap-3">
                    <select
                      value={participantId}
                      onChange={(event) => updateParticipant(index, event.target.value)}
                      className="h-10 w-full min-w-0 rounded-full border border-border bg-white px-3 py-2 text-sm"
                    >
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.loginId})
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 shrink-0 rounded-full px-3 py-0 text-sm whitespace-nowrap"
                      onClick={() => removeParticipantRow(index)}
                    >
                      제거
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit">참여 기록 저장</Button>
          </form>
        </Card>
        <Card className="space-y-3">
          {participations.map((item) => (
            <div key={item.id} className="flex flex-col gap-4 rounded-[24px] border border-white/70 bg-white/88 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{item.user.name} · {item.category.name}</p>
                <p className="text-sm text-[#6f6255]">
                  {new Date(item.occurredAt).toLocaleString()}
                </p>
              </div>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => removeParticipation(item.id)}>삭제</Button>
            </div>
          ))}
        </Card>
      </div>
    </PageShell>
  );
}
