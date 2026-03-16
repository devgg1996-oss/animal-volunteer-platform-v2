"use client";

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Clock, Users, AlertCircle, Heart, Share2, ArrowLeft } from "lucide-react";
import { getImageSrc } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function VolunteerDetailPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const postId = typeof id === "string" ? parseInt(id, 10) : 0;
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  const { data: postData, isLoading } = trpc.volunteer.getById.useQuery({ id: postId });
  const { data: myBookmarks = [] } = trpc.bookmark.getMyBookmarks.useQuery(
    { sortBy: "recent" },
    { enabled: isAuthenticated }
  );
  const bookmarkForPost = myBookmarks.find((b) => b.postId === postId);
  const isBookmarked = !!bookmarkForPost;

  const utils = trpc.useUtils();
  const addBookmarkMutation = trpc.bookmark.add.useMutation({
    onSuccess: () => {
      utils.bookmark.getMyBookmarks.invalidate();
      toast.success("북마크에 추가되었습니다!");
    },
    onError: (e) => toast.error(e.message),
  });
  const removeBookmarkMutation = trpc.bookmark.remove.useMutation({
    onSuccess: () => {
      utils.bookmark.getMyBookmarks.invalidate();
      toast.success("북마크에서 삭제되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const categoryLabels: Record<string, string> = {
    walk: "산책",
    cleaning: "청소",
    transport: "이동봉사",
    other: "기타",
  };

  if (!postId || isNaN(postId)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-orange-300 mx-auto mb-4" />
          <p className="text-gray-600">잘못된 접근입니다</p>
          <Button onClick={() => router.push("/")} className="mt-4">홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    router.push(`/volunteer/${postId}/apply`);
  };

  const handleBookmark = () => {
    if (!isAuthenticated) {
      toast.error("로그인이 필요합니다");
      return;
    }
    if (isBookmarked && bookmarkForPost) {
      removeBookmarkMutation.mutate({ bookmarkId: bookmarkForPost.id });
    } else {
      addBookmarkMutation.mutate({ postId, type: "post" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🐾</div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!postData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-orange-300 mx-auto mb-4" />
          <p className="text-gray-600">모집글을 찾을 수 없습니다</p>
          <Button onClick={() => router.push("/")} className="mt-4">홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  const post = postData as typeof postData & { schedules?: { id: number; date: Date; startTime: string; endTime: string; maxSlots: number; currentApplications: number }[] };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <header className="sticky top-0 z-40 bg-white border-b border-orange-100 shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="relative h-64 bg-gradient-to-br from-orange-200 to-orange-100 rounded-lg overflow-hidden mb-6">
          {getImageSrc(post.thumbnailImage) ? (
            <img src={getImageSrc(post.thumbnailImage)!} alt={post.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🐾</div>
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-orange-600 hover:bg-orange-700">{categoryLabels[post.category] || post.category}</Badge>
            <Badge className="bg-blue-600 hover:bg-blue-700">{post.status === "RECRUITING" || post.status === "recruiting" ? "모집 중" : post.status === "CLOSED" || post.status === "closed" ? "마감" : "완료"}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6 mb-6 border-0">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">{post.title}</h1>
                  {post.shelterName && <p className="text-lg text-orange-600 font-medium">{post.shelterName}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleBookmark}
                    className={isBookmarked ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100" : "border-orange-300 text-orange-600 hover:bg-orange-50"}
                  >
                    <Heart className={`w-5 h-5 ${isBookmarked ? "fill-current" : ""}`} />
                  </Button>
                  <Button variant="outline" size="icon" className="border-gray-300">
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-100">
                <MapPin className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800">{post.address}</p>
                  {post.detailedLocation && <p className="text-sm text-gray-600">{post.detailedLocation}</p>}
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-600" />
                  <span>현재 {post.currentApplications}명 / 최대 {post.maxParticipants}명</span>
                </div>
              </div>
            </Card>

            {/* 봉사 일정 및 시간대별 신청 현황 */}
            {((post as typeof post & {
              schedules?: { id: number; date: Date; startTime: string; endTime: string; maxSlots: number; currentApplications: number }[];
            }).schedules ?? []).length > 0 && (
              <section className="bg-card text-card-foreground rounded-xl border shadow-sm p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">봉사 일정 / 신청 현황</h2>
                <ul className="space-y-3">
                  {((post as typeof post & {
                    schedules?: { id: number; date: Date; startTime: string; endTime: string; maxSlots: number; currentApplications: number }[];
                  }).schedules ?? []).map((s) => {
                    const date = new Date(s.date);
                    const remain =
                      (s.maxSlots ?? 0) > 0
                        ? Math.max(0, (s.maxSlots ?? 0) - (s.currentApplications ?? 0))
                        : null;
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800">
                            {date.toLocaleDateString("ko-KR", {
                              month: "long",
                              day: "numeric",
                              weekday: "short",
                            })}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {s.startTime} ~ {s.endTime}
                          </p>
                        </div>
                        <div className="text-right text-xs text-gray-600 shrink-0">
                          <p>
                            현재{" "}
                            <span className="font-semibold text-gray-800">
                              {s.currentApplications}
                            </span>
                            명 신청
                          </p>
                          {s.maxSlots > 0 && (
                            <p>
                              최대 {s.maxSlots}명
                              {remain != null && (
                                <span className="ml-1 text-orange-600 font-semibold">
                                  (잔여 {remain}명)
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section className="bg-card text-card-foreground rounded-xl border shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">모집글 설명</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{typeof post.description === "string" ? post.description : ""}</p>
            </section>

            {post.additionalImages?.length ? (
              <section className="bg-card text-card-foreground rounded-xl border shadow-sm p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">활동 이미지</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {post.additionalImages.map((url, idx) => {
                    const src = getImageSrc(url);
                    return src ? (
                      <a
                        key={idx}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-video rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition"
                      >
                        <img src={src} alt={`활동 이미지 ${idx + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ) : null;
                  })}
                </div>
              </section>
            ) : null}

            {post.requiredItems ? (
              <Card className="p-6 mb-6 border-0">
                <h2 className="text-xl font-bold text-gray-800 mb-4">필요한 물품</h2>
                <div className="flex flex-wrap gap-2">
                  {(typeof post.requiredItems === "string" ? JSON.parse(post.requiredItems) : post.requiredItems)?.map((item: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{item}</Badge>
                  ))}
                </div>
              </Card>
            ) : null}

            {post.precautions && (
              <Card className="p-6 border-0 bg-yellow-50 border-l-4 border-yellow-400">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-yellow-900 mb-2">주의사항</h3>
                    <p className="text-yellow-800">{post.precautions}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div>
            <Card className="p-6 border-0 sticky top-20">
              <h2 className="text-xl font-bold text-gray-800 mb-4">봉사 신청</h2>
              {post.status !== "RECRUITING" && (
                <div className="mb-4 p-3 bg-gray-100 rounded text-sm text-gray-700">이 모집글은 현재 신청을 받지 않습니다.</div>
              )}
              <p className="text-sm text-gray-600 mb-4">
                봉사 신청하기를 누르면 일정 선택 및 신청자 정보 입력 화면으로 이동합니다.
              </p>
              <Button
                onClick={handleApplyClick}
                disabled={post.status !== "RECRUITING"}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                size="lg"
              >
                봉사 신청하기
              </Button>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>로그인이 필요합니다</DialogTitle>
            <DialogDescription>
              봉사 신청을 위해 로그인이 필요합니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowLoginDialog(false)}>
              취소
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                setShowLoginDialog(false);
                router.push(`/login?redirect=${encodeURIComponent(`/volunteer/${postId}/apply`)}`);
              }}
            >
              로그인 하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
