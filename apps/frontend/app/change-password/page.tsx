"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSession, setSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
    }
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const session = getSession();
    if (!session) return;

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const result = await apiFetch<{ accessToken: string; user: any }>("/auth/change-password", {
        method: "POST",
        token: session.accessToken,
        body: {
          currentPassword,
          newPassword,
        },
      });
      setSession(result);
      router.replace("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "비밀번호 변경에 실패했습니다.");
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-xl items-center px-4 py-8">
      <Card>
        <p className="text-xs uppercase tracking-[0.35em] text-[#8c7c6a]">비밀번호 변경</p>
        <h1 className="mt-3 text-4xl font-semibold">새 비밀번호 설정</h1>
        <p className="mt-3 text-sm leading-7 text-[#6f6255]">
          초기 비밀번호 또는 초기화된 비밀번호로 로그인한 경우 새 비밀번호를 먼저 설정해야 합니다.
        </p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">현재 비밀번호</span>
            <Input name="currentPassword" type="password" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">새 비밀번호</span>
            <Input name="newPassword" type="password" minLength={8} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">새 비밀번호 확인</span>
            <Input name="confirmPassword" type="password" minLength={8} required />
          </label>
          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <Button type="submit" className="w-full">비밀번호 변경</Button>
        </form>
      </Card>
    </main>
  );
}
