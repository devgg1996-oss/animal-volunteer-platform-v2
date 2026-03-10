"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, AlertCircle, UserX } from "lucide-react";
import { useState } from "react";

const ATTENDANCE_OPTIONS = [
  { value: "ATTENDED", label: "참석", icon: CheckCircle2 },
  { value: "ABSENT", label: "불참석", icon: AlertCircle },
  { value: "NO_SHOW", label: "노쇼", icon: UserX },
] as const;

const QUICK_REVIEW_TAGS = [
  "활동에 열심히 참여했어요",
  "시간을 잘 맞춰 왔어요",
  "동물에게 친절했어요",
  "지각했어요",
  "준비가 부족했어요",
];

export default function ParticipantEvaluatePage() {
  const params = useParams();
  const router = useRouter();
  const postId = Number(params.postId);
  const applicationId = Number(params.applicationId);
  const { user, isAuthenticated } = useAuth();

  const [attendanceStatus, setAttendanceStatus] = useState<"ATTENDED" | "ABSENT" | "NO_SHOW">("ATTENDED");
  const [rating, setRating] = useState(5);
  const [quickTags, setQuickTags] = useState<Record<string, boolean>>({});
  const [reviewText, setReviewText] = useState("");

  const { data: post, isLoading: postLoading } = trpc.volunteer.getById.useQuery(
    { id: postId },
    { enabled: isAuthenticated && !Number.isNaN(postId) }
  );

  const { data: application, isLoading: appLoading } = trpc.application.getById.useQuery(
    { id: applicationId },
    { enabled: isAuthenticated && !Number.isNaN(applicationId) }
  );

  const submitEvaluation = trpc.application.submitEvaluation.useMutation({
    onSuccess: () => {
      toast.success("평가가 저장되었습니다.");
      router.push(`/mypage/volunteer/${postId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    const tags = Object.entries(quickTags)
      .filter(([, v]) => v)
      .map(([k]) => k);
    submitEvaluation.mutate({
      applicationId,
      attendanceStatus,
      rating,
      comment: reviewText.trim() || undefined,
      quickReviewTags: tags.length > 0 ? tags : undefined,
    });
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Button onClick={() => router.push("/login")}>로그인</Button>
      </div>
    );
  }

  if (postLoading || appLoading || !post || !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (post.authorId !== user.id) {
    toast.error("권한이 없습니다.");
    router.push("/mypage");
    return null;
  }

  if (application.postId !== postId) {
    toast.error("잘못된 접근입니다.");
    router.push(`/mypage/volunteer/${postId}`);
    return null;
  }

  if (application.status !== "APPROVED") {
    toast.error("승인된 참가자만 평가할 수 있습니다.");
    router.push(`/mypage/volunteer/${postId}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/mypage/volunteer/${postId}`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold flex-1">참가자 평가</h1>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">평가 대상</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{application.applicantName || `신청자 #${application.id}`}</p>
            <p className="text-sm text-gray-500">{post.title}</p>
          </CardContent>
        </Card>

        {/* 참석 여부 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">참석 여부</CardTitle>
            <p className="text-sm text-gray-500">
              참가자의 봉사 참여 상태를 선택하세요. 봉사 기록 및 신뢰도 지표에 반영됩니다.
            </p>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={attendanceStatus}
              onValueChange={(v) => setAttendanceStatus(v as "ATTENDED" | "ABSENT" | "NO_SHOW")}
              className="grid grid-cols-3 gap-2"
            >
              {ATTENDANCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <Label
                    key={opt.value}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors ${
                      attendanceStatus === opt.value
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200"
                    }`}
                  >
                    <RadioGroupItem value={opt.value} id={opt.value} className="sr-only" />
                    <Icon
                      className={`w-8 h-8 ${
                        attendanceStatus === opt.value ? "text-orange-600" : "text-gray-400"
                      }`}
                    />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </Label>
                );
              })}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* 간단 후기 (다중 선택) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">간단 후기</CardTitle>
            <p className="text-sm text-gray-500">해당하는 항목을 선택하세요 (복수 선택 가능)</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {QUICK_REVIEW_TAGS.map((tag) => (
              <label
                key={tag}
                className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-gray-50"
              >
                <Checkbox
                  checked={!!quickTags[tag]}
                  onCheckedChange={(checked) =>
                    setQuickTags((prev) => ({ ...prev, [tag]: !!checked }))
                  }
                />
                <span className="text-sm">{tag}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* 상세 후기 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">상세 후기</CardTitle>
            <p className="text-sm text-gray-500">추가로 남기고 싶은 후기를 작성하세요 (선택)</p>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="예: 산책 봉사에 적극적으로 참여해 주셨습니다."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{reviewText.length}/500</p>
          </CardContent>
        </Card>

        {/* 별점 (후기 저장 시 rating 필요) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">종합 평가</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-center">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`text-2xl ${rating >= n ? "text-orange-500" : "text-gray-300"}`}
                >
                  ★
                </button>
              ))}
              <span className="text-sm text-gray-500 ml-2">{rating}점</span>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={submitEvaluation.isPending}
        >
          {submitEvaluation.isPending ? "저장 중..." : "평가 완료"}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          평가 완료 후 참가자 관리 화면으로 이동합니다. 활동 상태와 후기가 봉사 기록에 반영됩니다.
        </p>
      </div>
    </div>
  );
}
