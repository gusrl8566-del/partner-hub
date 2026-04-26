"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { summarizeDescription } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  description: string | null;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const router = useRouter();

  async function load() {
    const session = getSession();
    if (!session) return;
    if (session.user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    setCategories(await apiFetch("/categories", { token: session.accessToken }));
  }

  useEffect(() => {
    load();
  }, []);

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) return;
    if (session.user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    const formData = new FormData(event.currentTarget);
    await apiFetch("/categories", {
      method: "POST",
      token: session.accessToken,
      body: {
        name: formData.get("name"),
        description: formData.get("description"),
      },
    });
    event.currentTarget.reset();
    await load();
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
  }

  async function updateCategory(categoryId: string) {
    const session = getSession();
    if (!session) return;
    if (session.user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    await apiFetch(`/categories/${categoryId}`, {
      method: "PATCH",
      token: session.accessToken,
      body: {
        name: editName,
        description: editDescription,
      },
    });
    cancelEdit();
    await load();
  }

  return (
    <PageShell title="카테고리">
      <div className="grid gap-6 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit">
          <h3 className="text-xl font-semibold">카테고리 생성</h3>
          <p className="mt-2 text-sm leading-7 text-[#6f6255]">카테고리는 월별 참여 통계를 구성하는 기준 항목으로 재사용됩니다.</p>
          <form className="mt-6 space-y-4" onSubmit={createCategory}>
            <Input name="name" placeholder="카테고리명" required />
            <Input name="description" placeholder="설명" required />
            <Button type="submit">카테고리 생성</Button>
          </form>
        </Card>
        <Card className="space-y-3">
          {categories.map((category) => {
            const isEditing = editingId === category.id;

            return (
              <div key={category.id} className="rounded-[24px] border border-white/70 bg-white/88 p-4 sm:p-5">
                {isEditing ? (
                  <div className="space-y-3">
                    <Input value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="카테고리명" />
                    <Input
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      placeholder="설명"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={() => updateCategory(category.id)}>
                        저장
                      </Button>
                      <Button type="button" variant="secondary" onClick={cancelEdit}>
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="truncate text-sm text-[#6f6255]" title={summarizeDescription(category.description)}>
                        {summarizeDescription(category.description)}
                      </p>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => startEdit(category)}>
                      이름 수정
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>
    </PageShell>
  );
}
