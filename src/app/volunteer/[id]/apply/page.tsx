"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  AlertCircle,
  Pencil,
  Check,
} from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  walk: "산책",
  cleaning: "청소",
  transport: "이동봉사",
  other: "기타",
};

type ScheduleSlot = {
  id: number;
  date: Date;
  startTime: string;
  endTime: string;
  maxSlots: number;
  currentApplications: number;
};

export default function VolunteerApplyPage() {
  const params = useParams();
  const router = useRouter();
  const postId = typeof params?.id === "string" ? parseInt(params.id, 10) : 0;
  const { user, isAuthenticated } = useAuth();

  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const applicantEmail = user?.email ?? "";
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [agreedToNotice, setAgreedToNotice] = useState(false);
  const [healthAllergy, setHealthAllergy] = useState(false);
  const [healthAnimalContact, setHealthAnimalContact] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  const { data: post, isLoading } = trpc.volunteer.getById.useQuery(
    { id: postId },
    { enabled: isAuthenticated && postId > 0 }
  );
  const applyMutation = trpc.application.create.useMutation({
    onSuccess: () => {
      router.push(`/volunteer/${postId}/apply/complete?scheduleId=${selectedScheduleId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (user && !isEditingInfo) {
      setApplicantName(user.nickname || user.name || "");
      // 연락처는 기본값 010으로 시작하도록
      setApplicantPhone("010");
    }
  }, [user, isEditingInfo]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/volunteer/${postId}`);
      return;
    }
  }, [isAuthenticated, postId, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  if (postId <= 0 || isNaN(postId)) {
    router.replace("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-orange-300 mx-auto mb-4" />
          <p className="text-gray-600">모집글을 찾을 수 없습니다</p>
          <Button onClick={() => router.push("/")} className="mt-4">홈으로</Button>
        </div>
      </div>
    );
  }

  const schedules = (post as typeof post & { schedules?: ScheduleSlot[] }).schedules ?? [];
  const slotsByDate = schedules.reduce<Record<string, ScheduleSlot[]>>((acc, s) => {
    const key = new Date(s.date).toISOString().slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});
  const dateKeys = Object.keys(slotsByDate).sort();

  const selectedSlot = selectedScheduleId
    ? schedules.find((s) => s.id === selectedScheduleId)
    : null;
  const remaining = selectedSlot
    ? selectedSlot.maxSlots - selectedSlot.currentApplications
    : 0;

  const handleSubmit = () => {
    if (!applicantName.trim()) {
      toast.error("이름을 입력해주세요");
      return;
    }
    if (!/^010\d{8}$/.test(applicantPhone)) {
      toast.error("연락처는 010으로 시작하는 11자리 숫자만 입력할 수 있어요");
      return;
    }
    if (!applicantEmail) {
      toast.error("이메일 정보를 불러올 수 없습니다. 다시 로그인해 주세요.");
      return;
    }
    if (!selectedScheduleId) {
      toast.error("봉사 일정을 선택해주세요");
      return;
    }
    if (!agreedToNotice) {
      toast.error("안내사항 확인에 동의해주세요");
      return;
    }
    applyMutation.mutate({
      postId,
      scheduleId: selectedScheduleId,
      applicantName: applicantName.trim(),
      applicantPhone: applicantPhone.trim(),
    });
  };

  const requiredItems = post.requiredItems
    ? Array.isArray(post.requiredItems)
      ? post.requiredItems
      : typeof post.requiredItems === "string"
        ? (() => {
            try {
              return JSON.parse(post.requiredItems) as string[];
            } catch {
              return [post.requiredItems];
            }
          })()
        : []
    : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/volunteer/${postId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold flex-1">봉사 신청</h1>
        </div>

        {/* 신청자 정보 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">신청자 정보</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingInfo((v) => !v)}
                className="text-orange-600"
              >
                {isEditingInfo ? <Check className="w-4 h-4 mr-1" /> : <Pencil className="w-4 h-4 mr-1" />}
                {isEditingInfo ? "확인" : "수정"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">회원 정보가 자동 입력됩니다. 수정 버튼으로 변경할 수 있습니다.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                이름
              </Label>
              <Input
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="이름"
                disabled={!isEditingInfo}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                연락처
              </Label>
              <Input
                value={applicantPhone}
                onChange={(e) => {
                  // 숫자만, 010으로 시작, 총 11자리 제한
                  const digits = e.target.value.replace(/\D/g, "");
                  const withPrefix = digits.startsWith("010") ? digits : `010${digits.replace(/^0+/, "").replace(/^10/, "")}`;
                  setApplicantPhone(withPrefix.slice(0, 11));
                }}
                placeholder="010XXXXXXXX"
                disabled={!isEditingInfo}
                inputMode="numeric"
              />
              <p className="text-xs text-gray-500">010으로 시작하는 숫자 11자리만 입력 가능</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                이메일
              </Label>
              <Input value={applicantEmail} disabled placeholder="이메일" />
              <p className="text-xs text-gray-500">이메일은 수정할 수 없습니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* 봉사 일정 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              봉사 일정 선택
            </CardTitle>
            <p className="text-sm text-gray-500">원하는 날짜와 시간을 선택하세요 (단일 선택)</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {dateKeys.length === 0 ? (
              <p className="text-sm text-gray-500">등록된 일정이 없습니다.</p>
            ) : (
              dateKeys.map((dateKey) => (
                <div key={dateKey}>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {new Date(dateKey + "Z").toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}
                  </p>
                  <ul className="space-y-2">
                    {slotsByDate[dateKey].map((slot) => {
                      const remainingCount = slot.maxSlots - slot.currentApplications;
                      const isFull = remainingCount <= 0;
                      const isSelected = selectedScheduleId === slot.id;
                      return (
                        <li key={slot.id}>
                          <button
                            type="button"
                            onClick={() => !isFull && setSelectedScheduleId(slot.id)}
                            disabled={isFull}
                            className={`w-full p-3 rounded-lg border-2 text-left transition flex items-center justify-between gap-2 ${
                              isFull
                                ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                                : isSelected
                                  ? "border-orange-500 bg-orange-50"
                                  : "border-gray-200 hover:border-orange-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-orange-600" />
                              <span className="font-medium">
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              남은 인원: {Math.max(0, remainingCount)}명
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 신청 주의사항 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">신청 주의사항</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requiredItems.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">준비물</p>
                <p className="text-sm text-gray-600">{requiredItems.join(", ")}</p>
              </div>
            )}
            {post.precautions && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">활동 주의사항</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{post.precautions}</p>
              </div>
            )}
            <label className="flex items-start gap-3 p-3 rounded-lg border bg-amber-50/50 cursor-pointer">
              <Checkbox
                checked={agreedToNotice}
                onCheckedChange={(v) => setAgreedToNotice(!!v)}
              />
              <span className="text-sm font-medium">
                위 안내사항(복장·준비물·활동 주의사항)을 모두 확인했습니다.
              </span>
            </label>
          </CardContent>
        </Card>

        {/* 활동 건강 체크 (선택) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">활동 건강 체크</CardTitle>
            <p className="text-sm text-gray-500">해당 사항이 있으면 선택해주세요.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
              <Checkbox
                checked={healthAllergy}
                onCheckedChange={(v) => setHealthAllergy(!!v)}
              />
              <span className="text-sm">알레르기(동물 털 등)가 있습니다</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
              <Checkbox
                checked={healthAnimalContact}
                onCheckedChange={(v) => setHealthAnimalContact(!!v)}
              />
              <span className="text-sm">동물 접촉 시 주의가 필요합니다</span>
            </label>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={
            applyMutation.isPending ||
            !applicantName.trim() ||
            !applicantPhone.trim() ||
            !selectedScheduleId ||
            !agreedToNotice
          }
        >
          {applyMutation.isPending ? "신청 중..." : "봉사 신청 완료"}
        </Button>
      </div>
    </div>
  );
}
