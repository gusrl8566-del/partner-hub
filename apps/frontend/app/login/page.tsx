"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { setSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    try {
      const result = await apiFetch<{ accessToken: string; user: any }>("/auth/login", {
        method: "POST",
        body: {
          loginId: formData.get("loginId"),
          password: formData.get("password"),
        },
      });

      setSession(result);
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "로그인에 실패했습니다.");
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl items-center gap-6 px-4 py-8 lg:grid-cols-[1.1fr_minmax(340px,460px)]">
      <section className="glass-panel mesh-border hidden rounded-[36px] p-8 lg:block xl:p-12">
        <p className="text-xs uppercase tracking-[0.35em] text-[#8c7c6a]">파트너 허브</p>
        <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight xl:text-6xl">
          파트너 조직을 더 선명하고 효율적으로 관리하세요.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-[#6f6255]">
          조직 계층 확장, 온보딩 상태, 카테고리 활동, 월별 참여 흐름을 하나의 반응형 화면에서 확인할 수 있습니다.
        </p>
        <div className="mt-10 fluid-grid">
          <div className="rounded-[28px] bg-[#241b17] p-5 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-[#d6c1ac]">조직 계층</p>
            <p className="mt-3 text-sm leading-7 text-[#f0dfd1]">무제한 하위 조직 구조와 파트너 주도의 직계 하위 생성 흐름을 지원합니다.</p>
          </div>
          <div className="rounded-[28px] border border-border bg-white/70 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8c7c6a]">접속 관리</p>
            <p className="mt-3 text-sm leading-7 text-[#6f6255]">초대코드 기반 첫 접속, 비밀번호 설정, 차단, 관리자 초기화 흐름을 포함합니다.</p>
          </div>
        </div>
      </section>
      <Card className="mx-auto w-full max-w-xl">
        <p className="text-xs uppercase tracking-[0.35em] text-[#8c7c6a]">파트너 허브</p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">로그인</h1>
        <p className="mt-3 text-sm leading-7 text-[#6f6255]">
          관리자와 파트너는 동일한 로그인 화면을 사용합니다.
        </p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">아이디</span>
            <Input name="loginId" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">비밀번호</span>
            <Input name="password" type="password" required />
          </label>
          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <Button type="submit" className="w-full">로그인</Button>
        </form>
        <a className="mt-6 inline-block text-sm font-medium text-secondary underline underline-offset-4" href="/first-access">
          첫 접속 또는 비밀번호 설정
        </a>
      </Card>
    </main>
  );
}
