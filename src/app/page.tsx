"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { skipToken } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  Users,
  AlertCircle,
  Calendar,
  Package,
  Pencil,
  Settings,
} from "lucide-react";
import { getImageSrc } from "@/lib/utils";

const CATEGORY_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "walk", label: "산책 봉사" },
  { value: "cleaning", label: "청소 봉사" },
  { value: "transport", label: "이동 봉사" },
  { value: "other", label: "기타 봉사" },
];

type PostCard = {
  id: number;
  title: string;
  category: string;
  address: string;
  thumbnailImage: string | null;
  maxParticipants: number;
  currentApplications: number;
  distance: number;
  authorName?: string;
  earliestDate?: Date | null;
  durationText?: string | null;
  hasRequiredItems?: boolean;
  createdAt?: Date;
};

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"distance" | "recent">("distance");
  const [selectedLocationId, setSelectedLocationId] = useState<number | "">("");

  const { data: defaultMyLocation } = trpc.userLocation.getDefault.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: myLocations = [] } = trpc.userLocation.listMy.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    // 로그인: 기본 주소가 있으면 그걸 우선 적용
    if (isAuthenticated && defaultMyLocation) {
      const lat = defaultMyLocation.latitude;
      const lng = defaultMyLocation.longitude;
      if (lat != null && lng != null) {
        setLocation({ latitude: lat, longitude: lng });
      }
      setAddress(defaultMyLocation.formattedAddress ?? defaultMyLocation.address1 ?? "");
      setSelectedLocationId(defaultMyLocation.id);
    }
  }, [isAuthenticated, defaultMyLocation]);

  const searchByLocation = trpc.volunteer.searchByLocation.useQuery(
    location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          category: category === "all" ? undefined : (category as "walk" | "cleaning" | "transport" | "other"),
          sortBy,
        }
      : skipToken,
    { enabled: !!location, refetchInterval: 30000 }
  );

  const listAll = trpc.volunteer.listAll.useQuery(undefined, {
    enabled: !location,
    refetchOnWindowFocus: false,
  });

  const { data: myApplications = [] } = trpc.application.getMyApplicationsWithDetails.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const myUpcomingSchedules = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return myApplications
      .filter(
        (a) =>
          (a.status === "PENDING" || a.status === "APPROVED") &&
          new Date(a.scheduleDate).getTime() >= today.getTime()
      )
      .sort((a, b) => new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime())
      .slice(0, 5);
  }, [myApplications]);
  const myRecentApplicationsWithStatus = useMemo(() => {
    return [...myApplications]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [myApplications]);

  const applicationStatusLabel: Record<string, string> = {
    PENDING: "승인 대기",
    APPROVED: "승인완료",
    REJECTED: "승인거절",
    CANCELLED: "취소됨",
  };

  const posts: PostCard[] = useMemo(() => {
    const raw = location ? searchByLocation.data ?? [] : listAll.data ?? [];
    return raw.map((p) => ({
      ...p,
      authorName: (p as { authorName?: string }).authorName,
      earliestDate: (p as { earliestDate?: Date | null }).earliestDate,
      durationText: (p as { durationText?: string | null }).durationText,
      hasRequiredItems: (p as { hasRequiredItems?: boolean }).hasRequiredItems,
      distance: (p as { distance?: number }).distance ?? 0,
    }));
  }, [location, searchByLocation.data, listAll.data]);

  const handleCreatePost = () => {
    if (!isAuthenticated) {
      toast.error("로그인이 필요합니다");
      return;
    }
    router.push("/volunteer/create");
  };

  const categoryLabel = (cat: string) =>
    CATEGORY_OPTIONS.find((c) => c.value === cat)?.label ?? cat;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 상단: 로고 + 마이페이지/로그인 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <h1 className="text-lg font-bold text-orange-600">봉사 매칭</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => router.push("/bookmarks")}>
                  북마크
                </Button>
                <Button variant="ghost" size="sm" onClick={() => router.push("/mypage")}>
                  마이페이지
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => router.push("/login")}
              >
                로그인
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 배너 */}
        <section className="mb-6 rounded-2xl overflow-hidden bg-gradient-to-r from-orange-500 to-amber-500 shadow-md">
          <div className="px-5 py-8 text-white">
            <p className="text-sm font-medium opacity-90">함께 만드는 동물 봉사</p>
            <h2 className="text-xl font-bold mt-1">주변 봉사에 참여해 보세요</h2>
            <p className="text-sm mt-2 opacity-90">위치를 설정하면 가까운 봉사 모집글을 볼 수 있어요</p>
          </div>
        </section>

        {/* 위치 설정 */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-orange-500" />
              내 위치
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600"
              onClick={() => {
                if (!isAuthenticated) {
                  toast.error("로그인이 필요합니다");
                  return;
                }
                router.push("/mypage/addresses");
              }}
            >
              <Settings className="w-4 h-4 mr-1" />
              주소 관리
            </Button>
          </div>
          {isAuthenticated && myLocations.length > 0 ? (
            <>
              <select
                value={selectedLocationId}
                onChange={(e) => {
                  const v = e.target.value;
                  const id = v === "" ? "" : Number(v);
                  setSelectedLocationId(id);
                  const locItem = myLocations.find((l) => l.id === id);
                  if (locItem && locItem.latitude != null && locItem.longitude != null) {
                    setLocation({ latitude: locItem.latitude, longitude: locItem.longitude });
                    setAddress(locItem.formattedAddress ?? locItem.address1 ?? "");
                  } else {
                    // 좌표가 없으면 위치 기반 검색 해제 (전체 보기)
                    setLocation(null);
                    setAddress(locItem?.formattedAddress ?? locItem?.address1 ?? "");
                  }
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
              >
                <option value="">전체 지역 보기</option>
                {myLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} · {loc.formattedAddress ?? loc.address1 ?? ""}
                  </option>
                ))}
              </select>
              {location && (
                <p className="text-xs text-gray-500 mt-1">
                  📍 {address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              저장된 주소가 없습니다.{" "}
              <button
                type="button"
                className="underline text-orange-600"
                onClick={() => {
                  if (!isAuthenticated) {
                    router.push("/login");
                  } else {
                    router.push("/mypage/addresses");
                  }
                }}
              >
                주소 관리에서 주소를 추가해 주세요.
              </button>
            </p>
          )}
        </section>

        {/* 카테고리 · 정렬 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "distance" | "recent")}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
          >
            <option value="distance">거리순</option>
            <option value="recent">최신 등록순</option>
          </select>
        </div>

        {/* 나의 봉사 일정 (로그인 + 예정 일정 있을 때) */}
        {isAuthenticated && myUpcomingSchedules.length > 0 && (
          <section className="mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              나의 봉사 일정
            </h2>
            <div className="space-y-2">
              {myUpcomingSchedules.map((app) => (
                <Card
                  key={app.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow border-orange-100"
                  onClick={() => router.push(`/volunteer/${app.postId}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 truncate">{app.postTitle}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(app.scheduleDate).toLocaleDateString("ko-KR", {
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}{" "}
                        {app.startTime} ~ {app.endTime}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{app.postAddress}</span>
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium px-2 py-1 rounded ${
                        app.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {app.status === "APPROVED" ? "승인완료" : "승인 대기"}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* 나의 봉사 신청 현황 (승인/거절 확인) */}
        {isAuthenticated && myRecentApplicationsWithStatus.length > 0 && (
          <section className="mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-3">나의 봉사 신청 현황</h2>
            <div className="space-y-2">
              {myRecentApplicationsWithStatus.map((app) => (
                <Card
                  key={app.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow border-gray-100"
                  onClick={() => router.push(`/volunteer/${app.postId}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 truncate">{app.postTitle}</p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {new Date(app.scheduleDate).toLocaleDateString("ko-KR")} {app.startTime}~{app.endTime}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium px-2 py-1 rounded ${
                        app.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : app.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : app.status === "CANCELLED"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {applicationStatusLabel[app.status] ?? app.status}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* 주변 봉사 모집글 */}
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            {location ? "주변 봉사 모집" : "전체 봉사 모집"}
          </h2>
          {location ? searchByLocation.isLoading : listAll.isLoading ? (
            <div className="py-12 text-center text-gray-500">불러오는 중...</div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p>현재 모집 중인 봉사가 없습니다</p>
              <p className="text-sm mt-1">위치를 바꾸거나 검색에서 찾아보세요</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {posts.map((post) => (
                <li key={post.id}>
                  <Card
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.99] border-0 bg-white"
                    onClick={() => router.push(`/volunteer/${post.id}`)}
                  >
                    <div className="flex">
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
                          <p className="text-xs text-gray-500 truncate">
                            {post.authorName || "작성자"}
                          </p>
                          <h3 className="font-semibold text-gray-800 mt-0.5 line-clamp-2" title={post.title}>
                            {post.title.length > 46 ? post.title.slice(0, 46) + "…" : post.title}
                          </h3>
                          <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{post.address}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">
                            {categoryLabel(post.category)}
                          </span>
                          {post.earliestDate && (
                            <span className="text-xs text-gray-500">
                              {new Date(post.earliestDate).toLocaleDateString("ko-KR", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                          {post.durationText && (
                            <span className="text-xs text-gray-500 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {post.durationText}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 flex items-center gap-0.5">
                            <Users className="w-3 h-3" />
                            {post.currentApplications}/{post.maxParticipants}명
                          </span>
                          {post.hasRequiredItems && (
                            <Package className="w-4 h-4 text-gray-400" aria-label="준비물 있음" />
                          )}
                        </div>
                        {post.distance != null && post.distance < 999 && (
                          <p className="text-xs text-gray-400 mt-1">{post.distance.toFixed(1)}km</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Floating Action Button: 봉사 모집글 작성 */}
      <Button
        size="lg"
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg bg-orange-600 hover:bg-orange-700 text-white p-0"
        onClick={handleCreatePost}
        title="봉사 모집글 작성하기"
      >
        <Pencil className="w-6 h-6" />
      </Button>
    </div>
  );
}
