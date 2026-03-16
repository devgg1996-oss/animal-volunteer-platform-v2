"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, MapPin, ExternalLink } from "lucide-react";

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "승인대기",
  APPROVED: "승인",
  REJECTED: "거절",
  CANCELLED: "취소됨",
};

export default function MyApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = typeof params?.id === "string" ? parseInt(params.id, 10) : 0;
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });

  const utils = trpc.useUtils();

  const { data: app, isLoading: appLoading } = trpc.application.getById.useQuery(
    { id: applicationId },
    { enabled: isAuthenticated && applicationId > 0 }
  );

  const postId = app?.postId ?? 0;
  const { data: post, isLoading: postLoading } = trpc.volunteer.getById.useQuery(
    { id: postId },
    { enabled: isAuthenticated && postId > 0 }
  );

  const cancelMutation = trpc.application.cancel.useMutation({
    onSuccess: async () => {
      toast.success("봉사 신청이 취소되었습니다.");
      await utils.application.getById.invalidate({ id: applicationId });
      await utils.application.getMyApplicationsWithDetails.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedSchedule = useMemo(() => {
    const schedules =
      (post as typeof post & {
        schedules?: { id: number; date: Date; startTime: string; endTime: string }[];
      })?.schedules ?? [];
    return app?.scheduleId ? schedules.find((s) => s.id === app.scheduleId) : null;
  }, [post, app?.scheduleId]);

  const kakaoMapUrl = useMemo(() => {
    if (!post?.latitude || !post?.longitude) return null;
    const { latitude, longitude } = post;
    return `https://map.kakao.com/link/map/봉사위치,${latitude},${longitude}`;
  }, [post?.latitude, post?.longitude]);

  if (applicationId <= 0 || Number.isNaN(applicationId)) {
    router.replace("/mypage");
    return null;
  }

  if (appLoading || postLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 space-y-4 text-center">
            <p className="text-gray-700 font-medium">신청 정보를 찾을 수 없습니다.</p>
            <Button onClick={() => router.push("/mypage")}>마이페이지로</Button>
          </CardContent>
        </Card>
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
          <h1 className="text-xl font-semibold flex-1">내 봉사 신청</h1>
          <Button variant="outline" size="sm" onClick={() => router.push(`/volunteer/${app.postId}`)}>
            모집글 보기
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">신청 정보</CardTitle>
              <Badge
                variant={
                  app.status === "APPROVED"
                    ? "default"
                    : app.status === "REJECTED"
                      ? "destructive"
                      : app.status === "CANCELLED"
                        ? "outline"
                        : "secondary"
                }
              >
                {STATUS_LABEL[app.status] ?? app.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">신청자</span>
              <span className="font-medium">{app.applicantName}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">연락처</span>
              <span className="font-medium">{app.applicantPhone}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">신청일</span>
              <span className="font-medium">
                {new Date(app.createdAt).toLocaleString("ko-KR")}
              </span>
            </div>
            {app.status === "REJECTED" && app.rejectionReason && (
              <div className="pt-2 border-t border-dashed border-gray-200 mt-2">
                <span className="text-gray-500 block mb-1">거절 사유</span>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {app.rejectionReason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">봉사 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-semibold text-lg">{post?.title ?? "-"}</p>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-gray-700">{post?.address ?? "-"}</p>
                {post?.detailedLocation ? (
                  <p className="text-xs text-gray-500 mt-0.5">{post.detailedLocation}</p>
                ) : null}
              </div>
            </div>

            {selectedSchedule ? (
              <div className="rounded-lg border bg-white p-3 space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <span>
                    {new Date(selectedSchedule.date).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>
                    {selectedSchedule.startTime} ~ {selectedSchedule.endTime}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">선택한 일정 정보를 찾을 수 없습니다.</p>
            )}

            {kakaoMapUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={kakaoMapUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  카카오 지도 열기
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        {(app.status === "PENDING" || app.status === "APPROVED") && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => cancelMutation.mutate({ applicationId: app.id })}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "취소 중..." : "봉사 신청 취소"}
          </Button>
        )}
      </div>
    </div>
  );
}

