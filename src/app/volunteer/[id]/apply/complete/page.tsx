"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  Share2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useMemo } from "react";

const CATEGORY_LABEL: Record<string, string> = {
  walk: "산책",
  cleaning: "청소",
  transport: "이동봉사",
  other: "기타",
};

export default function VolunteerApplyCompletePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = typeof params?.id === "string" ? parseInt(params.id, 10) : 0;
  const scheduleIdParam = searchParams.get("scheduleId");
  const scheduleId = scheduleIdParam ? parseInt(scheduleIdParam, 10) : 0;
  const { isAuthenticated } = useAuth();

  const { data: post, isLoading } = trpc.volunteer.getById.useQuery(
    { id: postId },
    { enabled: postId > 0 }
  );

  const selectedSchedule = useMemo(() => {
    const schedules = (post as typeof post & { schedules?: { id: number; date: Date; startTime: string; endTime: string }[] })?.schedules ?? [];
    return schedules.find((s) => s.id === scheduleId);
  }, [post, scheduleId]);

  const kakaoMapUrl = useMemo(() => {
    if (!post?.latitude || !post?.longitude) return null;
    const { latitude, longitude } = post;
    return `https://map.kakao.com/link/map/봉사위치,${latitude},${longitude}`;
  }, [post?.latitude, post?.longitude]);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/volunteer/${postId}` : "";
  const shareText = "같이 봉사하러 갈래요?";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast.success("링크가 복사되었습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  const requiredItems = post?.requiredItems
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

  if (!isAuthenticated) {
    router.replace("/");
    return null;
  }

  if (postId <= 0 || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Button onClick={() => router.push("/")}>홈으로</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold flex-1">신청 완료</h1>
        </div>

        <div className="text-center py-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-gray-800">봉사 신청이 완료되었습니다</h2>
        </div>

        {/* 신청 봉사 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">신청 봉사 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-semibold text-lg">{post.title}</p>
            {post.shelterName && (
              <p className="text-gray-600">작성자(단체): {post.shelterName}</p>
            )}
            <p className="text-gray-600">
              봉사 카테고리: {CATEGORY_LABEL[post.category] ?? post.category}
            </p>
            {selectedSchedule && (
              <>
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
                    {selectedSchedule.startTime} - {selectedSchedule.endTime}
                  </span>
                </div>
              </>
            )}
            {requiredItems.length > 0 && (
              <p className="text-gray-600">준비물: {requiredItems.join(", ")}</p>
            )}
            {post.precautions && (
              <p className="text-gray-600">주의사항: {post.precautions}</p>
            )}
          </CardContent>
        </Card>

        {/* 봉사 위치 안내 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-600" />
              봉사 위치
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">{post.address}</p>
            {post.detailedLocation && (
              <p className="text-sm text-gray-600">{post.detailedLocation}</p>
            )}
            {post.latitude != null && post.longitude != null ? (
              <div className="rounded-lg overflow-hidden border">
                <div className="w-full h-56">
                  <MapView
                    className="w-full h-full"
                    initialCenter={{ lat: post.latitude, lng: post.longitude }}
                    initialZoom={15}
                    showMarker
                  />
                </div>
                <div className="px-3 py-2 text-xs text-gray-500 bg-white border-t">
                  좌표: {post.latitude.toFixed(5)}, {post.longitude.toFixed(5)}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-gray-100 h-48 flex items-center justify-center">
                <p className="text-sm text-gray-500">지도를 표시할 수 없습니다 (좌표 없음)</p>
              </div>
            )}
            <div className="flex gap-2">
              {kakaoMapUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={kakaoMapUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    카카오 지도 열기
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 함께 봉사 가기 (공유) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="w-5 h-5 text-orange-600" />
              함께 봉사 가기
            </CardTitle>
            <p className="text-sm text-gray-500">친구에게 봉사 활동을 공유해보세요.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="w-full" asChild>
              <a
                href={`https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                카카오톡 공유
              </a>
            </Button>
            <Button variant="outline" className="w-full" onClick={handleCopyLink}>
              <Copy className="w-4 h-4 mr-2" />
              링크 복사
            </Button>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => router.push("/")}>
          홈으로
        </Button>
      </div>
    </div>
  );
}
