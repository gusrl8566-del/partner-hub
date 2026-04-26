"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { setSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function FirstAccessPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await apiFetch<{ token: string; user: { name: string } }>("/auth/first-access/verify-code", {
        method: "POST",
        body: {
          loginId: formData.get("loginId"),
          inviteCode: formData.get("inviteCode"),
        },
      });
      setToken(result.token);
      setMessage(`${result.user.name} 계정의 초대코드가 확인되었습니다. 비밀번호를 설정하면 바로 사용할 수 있습니다.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "코드 확인에 실패했습니다.");
    }
  }

  async function setPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await apiFetch<{ accessToken: string; user: any }>("/auth/first-access/set-password", {
        method: "POST",
        body: {
          token,
          password: formData.get("password"),
        },
      });
      setSession(result);
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "비밀번호 설정에 실패했습니다.");
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="self-start">
        <p className="text-xs uppercase tracking-[0.35em] text-[#8c7c6a]">1단계</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">초대코드 확인</h1>
        <p className="mt-4 text-sm leading-7 text-[#6f6255]">
          상위 조직 또는 플랫폼 관리자가 발급한 아이디와 초대코드를 입력하세요.
        </p>
        <form className="mt-6 space-y-4" onSubmit={verifyCode}>
          <Input name="loginId" placeholder="partner01" required />
          <Input name="inviteCode" placeholder="AB12CD34" required />
          <Button type="submit">코드 확인</Button>
        </form>
      </Card>
      <Card className="self-start">
        <p className="text-xs uppercase tracking-[0.35em] text-[#8c7c6a]">2단계</p>
        <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">비밀번호 설정</h2>
        <p className="mt-3 text-sm leading-7 text-[#6f6255]">{message ?? "먼저 1단계에서 초대코드를 확인해 주세요."}</p>
        <form className="mt-6 space-y-4" onSubmit={setPassword}>
          <Input name="password" type="password" placeholder="8자 이상 입력" required disabled={!token} />
          <Button type="submit" disabled={!token}>비밀번호 저장</Button>
        </form>
        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      </Card>
    </main>
  );
}
