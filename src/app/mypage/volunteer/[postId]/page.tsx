"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  Edit,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  UserX,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

const POST_STATUS_OPTIONS = [
  { value: "RECRUITING", label: "구인중" },
  { value: "CLOSED", label: "구인마감" },
  { value: "COMPLETED", label: "활동완료" },
];

const REJECT_REASONS = [
  "모집 인원이 모두 마감되었습니다",
  "일정이 맞지 않아 참여가 어렵습니다",
  "내부 사정으로 모집이 변경되었습니다",
  "기타",
];

const CATEGORY_LABEL: Record<string, string> = {
  walk: "산책",
  cleaning: "청소",
  transport: "이동",
  other: "기타",
};

function formatSchedule(post: { schedules?: { date: Date; startTime: string; endTime: string }[] }) {
  if (!post.schedules?.length) return "-";
  return post.schedules
    .map(
      (s) =>
        `${new Date(s.date).toLocaleDateString("ko-KR")} ${s.startTime}~${s.endTime}`
    )
    .join(", ");
}

export default function MyVolunteerManagePage() {
  const params = useParams();
  const router = useRouter();
  const postId = Number(params.postId);
  const { user, isAuthenticated } = useAuth();
  const [rejectAppId, setRejectAppId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectCustomReason, setRejectCustomReason] = useState("");

  const { data: post, isLoading: postLoading } = trpc.volunteer.getById.useQuery(
    { id: postId },
    { enabled: isAuthenticated && !Number.isNaN(postId) }
  );

  const { data: applicants = [], refetch: refetchApplicants } =
    trpc.application.getByPostId.useQuery(
      { postId },
      { enabled: isAuthenticated && !Number.isNaN(postId) }
    );

  const utils = trpc.useUtils();
  const updateStatus = trpc.volunteer.update.useMutation({
    onSuccess: () => {
      utils.volunteer.getById.invalidate({ id: postId });
      toast.success("상태가 변경되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const approveMutation = trpc.application.approve.useMutation({
    onSuccess: () => {
      refetchApplicants();
      toast.success("승인되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.application.reject.useMutation({
    onSuccess: () => {
      setRejectAppId(null);
      setRejectReason("");
      refetchApplicants();
      toast.success("거절되었습니다.");
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

  if (postLoading || !post) {
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

  const statusMap: Record<string, string> = {
    RECRUITING: "구인중",
    CLOSED: "구인마감",
    COMPLETED: "활동완료",
  };

  const attendanceLabel = (attended: boolean | null, attendanceStatus?: string | null) => {
    if (attendanceStatus === "NO_SHOW") return { label: "노쇼", icon: UserX };
    if (attended === true) return { label: "참석", icon: CheckCircle2 };
    if (attended === false) return { label: "불참석", icon: AlertCircle };
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/mypage")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold truncate flex-1">봉사 구인글 관리</h1>
        </div>

        {/* 1. 봉사 모집글 정보 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg">{post.title}</CardTitle>
              <Badge variant="secondary">{statusMap[post.status] ?? post.status}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-500">
              <span>{CATEGORY_LABEL[post.category] ?? post.category}</span>
              <span>·</span>
              <span>모집 {post.maxParticipants}명 · 신청 {post.currentApplications}명</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-2">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <span>{post.address || "-"}</span>
            </div>
            <div className="flex gap-2">
              <Calendar className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <span>{formatSchedule(post)}</span>
            </div>
            {post.requiredItems?.length ? (
              <div>
                <span className="text-gray-500">준비물: </span>
                <span>{Array.isArray(post.requiredItems) ? post.requiredItems.join(", ") : post.requiredItems}</span>
              </div>
            ) : null}
            {post.precautions ? (
              <div>
                <span className="text-gray-500">주의사항: </span>
                <span>{post.precautions}</span>
              </div>
            ) : null}
            <div className="pt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/volunteer/${postId}/edit`)}
              >
                <Edit className="w-4 h-4 mr-1" />
                모집글 수정
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const next =
                    post.status === "RECRUITING"
                      ? "CLOSED"
                      : post.status === "CLOSED"
                        ? "RECRUITING"
                        : post.status;
                  if (next !== post.status)
                    updateStatus.mutate({
                      id: postId,
                      status:
                        next === "RECRUITING"
                          ? "recruiting"
                          : next === "CLOSED"
                            ? "closed"
                            : "completed",
                    });
                }}
              >
                {post.status === "RECRUITING" ? "모집 중지" : "다시 구인하기"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. 구인글 상태 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">구인글 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={post.status}
              onValueChange={(value) =>
                updateStatus.mutate({
                  id: postId,
                  status:
                    value === "RECRUITING"
                      ? "recruiting"
                      : value === "CLOSED"
                        ? "closed"
                        : "completed",
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POST_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              일정 변경 시 이미 신청한 참가자에게 일정 변경 안내가 전달됩니다.
            </p>
          </CardContent>
        </Card>

        {/* 3. 참가자 관리 */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            참가자 관리
          </h2>
          {applicants.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500 text-sm">
                아직 신청자가 없습니다.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {applicants.map((app) => {
                const att = attendanceLabel(app.attended, app.attendanceStatus);
                return (
                  <li key={app.id}>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">
                              {app.applicantName || `신청자 #${app.id}`}
                            </p>
                            <p className="text-sm text-gray-500">{app.applicantPhone}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge
                                variant={
                                  app.status === "APPROVED"
                                    ? "default"
                                    : app.status === "REJECTED"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {app.status === "PENDING"
                                  ? "승인대기"
                                  : app.status === "APPROVED"
                                    ? "승인"
                                    : app.status === "REJECTED"
                                      ? "거절"
                                      : app.status}
                              </Badge>
                              {att && (
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  <att.icon className="w-3 h-3" />
                                  {att.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            {app.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => approveMutation.mutate({ applicationId: app.id })}
                                >
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setRejectAppId(app.id)}
                                >
                                  거절
                                </Button>
                              </>
                            )}
                            {app.status === "APPROVED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  router.push(
                                    `/mypage/volunteer/${postId}/evaluate/${app.id}`
                                  )
                                }
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                평가하기
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-xs text-gray-500">
          승인·거절 시 신청자에게 알림이 발송됩니다. 거절 사유는 신청자에게 전달됩니다.
        </p>
      </div>

      <AlertDialog open={rejectAppId != null} onOpenChange={() => setRejectAppId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>신청 거절</AlertDialogTitle>
            <AlertDialogDescription>
              거절 사유를 선택하거나 입력하세요. 신청자에게 알림으로 전달됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <RadioGroup
            value={rejectReason}
            onValueChange={(v) => {
              setRejectReason(v);
              if (v !== "기타") {
                setRejectCustomReason("");
              }
            }}
            className="gap-2 py-2"
          >
            {REJECT_REASONS.map((r) => (
              <div key={r} className="flex items-center space-x-2">
                <RadioGroupItem value={r} id={`reject-${r}`} />
                <Label htmlFor={`reject-${r}`} className="text-sm font-normal cursor-pointer">
                  {r}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {rejectReason === "기타" && (
            <div className="mt-3 space-y-1">
              <Label htmlFor="reject-custom" className="text-xs text-gray-600">
                직접 입력
              </Label>
              <textarea
                id="reject-custom"
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500"
                rows={3}
                placeholder="거절 사유를 입력해 주세요."
                value={rejectCustomReason}
                onChange={(e) => setRejectCustomReason(e.target.value)}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (rejectAppId != null) {
                  const reason =
                    rejectReason === "기타"
                      ? rejectCustomReason.trim()
                      : rejectReason;
                  rejectMutation.mutate({ applicationId: rejectAppId, reason });
                }
              }}
              disabled={
                !rejectReason ||
                (rejectReason === "기타" && !rejectCustomReason.trim())
              }
              className="bg-destructive text-destructive-foreground"
            >
              거절하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
