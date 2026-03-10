"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [name, setName] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.nickname || user.name || "");
    }
  }, [user]);

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("프로필이 저장되었습니다.");
      router.push("/mypage");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Button onClick={() => router.push("/login")}>로그인</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/mypage")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">프로필 수정</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">계정 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              {user.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt="프로필"
                  width={80}
                  height={80}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-2xl">
                  {name.charAt(0) || "?"}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">닉네임</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="닉네임을 입력하세요"
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">이메일 (로그인 ID)</Label>
              <p className="text-sm text-gray-700">{user.email || "-"}</p>
              <p className="text-xs text-gray-500">이메일은 변경할 수 없습니다.</p>
            </div>
            <Button
              className="w-full"
              onClick={() => updateProfile.mutate({ name: name.trim() || undefined })}
              disabled={updateProfile.isPending}
            >
              저장
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
