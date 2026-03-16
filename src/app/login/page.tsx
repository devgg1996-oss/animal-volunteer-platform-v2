"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    router.replace("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("이메일과 비밀번호를 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "로그인에 실패했습니다.");
        setLoading(false);
        return;
      }
      toast.success("로그인되었습니다.");
      // 전체 새로고침으로 쿠키가 적용된 상태에서 이동
      const target = redirectTo.startsWith("/") ? redirectTo : "/";
      window.location.href = target;
    } catch {
      toast.error("로그인에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="text-4xl mb-2">🐾</div>
          <h1 className="text-2xl font-bold text-orange-600">동물 봉사 매칭</h1>
          <p className="text-sm text-gray-600 mt-1">로그인</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl border border-orange-100 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="test@test.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="border-orange-200 focus-visible:ring-orange-500"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="border-orange-200 focus-visible:ring-orange-500"
              autoComplete="current-password"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            disabled={loading}
          >
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>
        <div className="text-center text-xs text-gray-500">
          계정이 없나요?{" "}
          <button
            type="button"
            className="underline text-orange-600"
            onClick={() => router.push("/signup")}
          >
            회원가입
          </button>
        </div>
        <p className="text-center text-xs text-gray-500">
          테스트 계정: test@test.com / 1234
        </p>
      </div>
    </div>
  );
}
