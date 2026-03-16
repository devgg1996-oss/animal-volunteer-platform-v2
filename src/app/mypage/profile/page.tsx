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

const ANIMALS = [
  { id: "dog", label: "강아지", emoji: "🐶" },
  { id: "cat", label: "고양이", emoji: "🐱" },
  { id: "rabbit", label: "토끼", emoji: "🐰" },
  { id: "bear", label: "곰", emoji: "🐻" },
] as const;

const COLORS = [
  { id: "orange", label: "오렌지" },
  { id: "blue", label: "블루" },
  { id: "green", label: "그린" },
  { id: "purple", label: "퍼플" },
  { id: "pink", label: "핑크" },
  { id: "gray", label: "그레이" },
] as const;

function buildAvatarUrl(params: { animal: string; color: string }) {
  const qs = new URLSearchParams();
  qs.set("animal", params.animal);
  qs.set("color", params.color);
  return `/api/avatar?${qs.toString()}`;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [avatarAnimal, setAvatarAnimal] = useState<(typeof ANIMALS)[number]["id"]>("dog");
  const [avatarColor, setAvatarColor] = useState<(typeof COLORS)[number]["id"]>("orange");

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
              <Image
                src={buildAvatarUrl({
                  animal: avatarAnimal,
                  color: avatarColor,
                })}
                alt="프로필"
                width={96}
                height={96}
                className="rounded-full"
                unoptimized
              />
            </div>

            <div className="space-y-2">
              <Label>프로필 이미지</Label>
              <p className="text-xs text-gray-500">
                직접 업로드는 지원하지 않습니다. 동물 캐릭터와 색상을 선택해 주세요.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ANIMALS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAvatarAnimal(a.id)}
                    className={`rounded-lg border px-3 py-2 text-sm flex items-center justify-center gap-2 transition ${
                      avatarAnimal === a.id ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white hover:border-orange-200"
                    }`}
                  >
                    <span className="text-lg">{a.emoji}</span>
                    <span>{a.label}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setAvatarColor(c.id)}
                    className={`rounded-lg border px-2 py-2 text-xs transition ${
                      avatarColor === c.id ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white hover:border-orange-200"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
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
              onClick={() =>
                updateProfile.mutate({
                  name: name.trim() || undefined,
                  profileImage: buildAvatarUrl({
                    animal: avatarAnimal,
                    color: avatarColor,
                  }),
                })
              }
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
