"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { skipToken } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Heart, AlertCircle } from "lucide-react";
import { getImageSrc } from "@/lib/utils";

export default function BookmarksPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "distance">("recent");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const { data: bookmarks = [], isLoading } = trpc.bookmark.getMyBookmarks.useQuery(
    isAuthenticated
      ? {
          sortBy,
          latitude: sortBy === "distance" && location ? location.latitude : undefined,
          longitude: sortBy === "distance" && location ? location.longitude : undefined,
        }
      : skipToken,
    { enabled: isAuthenticated }
  );

  const utils = trpc.useUtils();
  const removeBookmarkMutation = trpc.bookmark.remove.useMutation({
    onSuccess: () => {
      utils.bookmark.getMyBookmarks.invalidate();
      toast.success("북마크에서 삭제되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <AlertCircle className="w-12 h-12 text-orange-300 mx-auto mb-4" />
          <p className="text-center text-gray-600 mb-4">로그인 후 북마크 목록을 볼 수 있습니다.</p>
          <Button className="w-full" onClick={() => router.push("/login?redirect=/bookmarks")}>
            로그인
          </Button>
        </Card>
      </div>
    );
  }

  const statusLabel = (status: string) =>
    status === "RECRUITING" || status === "recruiting"
      ? "모집 중"
      : status === "CLOSED" || status === "closed"
        ? "마감"
        : "완료";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            내 북마크
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {bookmarks.length > 0 && (
          <div className="flex justify-end mb-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "recent" | "distance")}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
            >
              <option value="recent">최근 저장순</option>
              <option value="distance">거리순</option>
            </select>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-gray-500">불러오는 중...</div>
        ) : bookmarks.length === 0 ? (
          <div className="py-12 text-center">
            <Heart className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">저장한 북마크가 없습니다</p>
            <p className="text-sm text-gray-500 mt-1">봉사 모집글에서 하트를 눌러 저장해보세요</p>
            <Button
              className="mt-4 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => router.push("/")}
            >
              봉사 모집 보기
            </Button>
          </div>
        ) : (
          <ul className="space-y-4">
            {bookmarks.map((bm) => {
              if (bm.postId == null || !bm.post) return null;
              const post = bm.post;
              return (
                <li key={bm.id}>
                  <Card
                    className="overflow-hidden border-0 bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div
                      className="flex cursor-pointer active:scale-[0.99]"
                      onClick={() => router.push(`/volunteer/${bm.postId}`)}
                    >
                      <div className="w-28 h-28 shrink-0 bg-orange-100 flex items-center justify-center text-4xl">
                        {getImageSrc(post.thumbnailImage) ? (
                          <img
                            src={getImageSrc(post.thumbnailImage)!}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          "🐾"
                        )}
                      </div>
                      <div className="p-3 flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          {post.shelterName && (
                            <p className="text-xs text-gray-500 truncate">{post.shelterName}</p>
                          )}
                          <h3 className="font-semibold text-gray-800 mt-0.5 line-clamp-2" title={post.title}>
                            {post.title}
                          </h3>
                          <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{post.address}</span>
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">
                            {statusLabel(post.status)}
                          </span>
                          {bm.distance != null && bm.distance < 999 && (
                            <span className="text-xs text-gray-400">{bm.distance.toFixed(1)}km</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="px-3 pb-3 pt-0 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBookmarkMutation.mutate({ bookmarkId: bm.id });
                        }}
                        disabled={removeBookmarkMutation.isPending}
                      >
                        <Heart className="w-4 h-4 fill-current mr-1" />
                        북마크 해제
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
