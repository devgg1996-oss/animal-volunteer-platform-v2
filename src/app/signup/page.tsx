"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
   const [verificationCode, setVerificationCode] = useState("");

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: (res) => {
      toast.success(res.message ?? "가입되었습니다.");
      router.replace("/login");
    },
    onError: (e) => toast.error(e.message),
  });

  const sendVerificationMutation = trpc.auth.sendEmailVerification.useMutation({
    onSuccess: (res) => {
      toast.success(res.message ?? "인증 메일이 발송되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isAuthenticated) {
    router.replace("/");
    return null;
  }

  const loading = signupMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("이름, 이메일, 비밀번호를 입력하세요.");
      return;
    }
    if (!verificationCode.trim()) {
      toast.error("이메일로 받은 인증 코드를 입력해 주세요.");
      return;
    }
    signupMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      verificationCode: verificationCode.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="text-4xl mb-2">🐾</div>
          <h1 className="text-2xl font-bold text-orange-600">동물 봉사 매칭</h1>
          <p className="text-sm text-gray-600 mt-1">회원가입</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-white p-6 rounded-xl border border-orange-100 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="border-orange-200 focus-visible:ring-orange-500"
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="test@test.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || sendVerificationMutation.isPending}
                className="border-orange-200 focus-visible:ring-orange-500"
                autoComplete="email"
              />
              <Button
                type="button"
                variant="outline"
                className="whitespace-nowrap text-xs sm:text-sm"
                disabled={!email.trim() || sendVerificationMutation.isPending}
                onClick={() => {
                  if (!email.trim()) {
                    toast.error("이메일을 입력해 주세요.");
                    return;
                  }
                  sendVerificationMutation.mutate({ email: email.trim() });
                }}
              >
                인증 메일 보내기
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verificationCode">인증 코드</Label>
            <Input
              id="verificationCode"
              placeholder="이메일로 받은 6자리 코드를 입력하세요"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              disabled={loading}
              className="border-orange-200 focus-visible:ring-orange-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="비밀번호 (4자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="border-orange-200 focus-visible:ring-orange-500"
              autoComplete="new-password"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            disabled={loading}
          >
            {loading ? "가입 중..." : "가입하기"}
          </Button>
        </form>

        <div className="text-center text-xs text-gray-500">
          이미 계정이 있나요?{" "}
          <button
            type="button"
            className="underline text-orange-600"
            onClick={() => router.push("/login")}
          >
            로그인
          </button>
        </div>
      </div>
    </div>
  );
}

