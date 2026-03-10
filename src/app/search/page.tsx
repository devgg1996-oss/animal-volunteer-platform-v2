"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { skipToken } from "@tanstack/react-query";
import { MapPin, Clock, Users, Search, Package } from "lucide-react";
import { getImageSrc } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  all: "전체",
  walk: "산책 봉사",
  cleaning: "청소 봉사",
  transport: "이동 봉사",
  other: "기타 봉사",
};

type PostItem = {
  id: number;
  title: string;
  category: string;
  address: string;
  authorName?: string;
  maxParticipants: number;
  currentApplications: number;
  distance?: number;
  earliestDate?: Date | null;
  durationText?: string | null;
  thumbnailImage?: string | null;
  hasRequiredItems?: boolean;
};

export default function SearchPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"distance" | "recent">("distance");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    setLocation({ latitude: 37.4979, longitude: 127.0276 });
  }, []);

  const { data: results = [] } = trpc.volunteer.searchByKeyword.useQuery(
    keyword.trim() && location
      ? { keyword: keyword.trim(), latitude: location.latitude, longitude: location.longitude }
      : skipToken,
    { enabled: keyword.trim().length > 0 && !!location }
  );

  const posts: PostItem[] = results.map((p) => ({
    ...p,
    authorName: (p as { authorName?: string }).authorName,
    earliestDate: (p as { earliestDate?: Date | null }).earliestDate,
    durationText: (p as { durationText?: string | null }).durationText,
    hasRequiredItems: (p as { hasRequiredItems?: boolean }).hasRequiredItems,
  }));

  const sortedPosts =
    sortBy === "distance"
      ? [...posts].sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
      : [...posts].sort(
          (a, b) =>
            new Date((b as { createdAt?: Date }).createdAt ?? 0).getTime() -
            new Date((a as { createdAt?: Date }).createdAt ?? 0).getTime()
        );

  const filteredByCategory =
    category === "all"
      ? sortedPosts
      : sortedPosts.filter((p) => p.category === category);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">검색</h1>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="봉사명, 2월 봉사, 초보 가능, 강아지 봉사 등"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-10 h-12 rounded-xl bg-white"
          />
        </div>

        <div className="flex gap-2 mb-6">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "distance" | "recent")}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">거리순</SelectItem>
              <SelectItem value="recent">최신순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {keyword.trim() ? (
          <>
            <p className="text-sm text-gray-600 mb-3">
              &quot;{keyword.trim()}&quot; 검색 결과
            </p>
            {filteredByCategory.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>검색 결과가 없습니다</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {filteredByCategory.map((post) => (
                  <li key={post.id}>
                    <Card
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
                      onClick={() => router.push(`/volunteer/${post.id}`)}
                    >
                      <div className="flex">
                        <div className="w-24 h-24 shrink-0 bg-orange-100 flex items-center justify-center text-3xl overflow-hidden">
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
                        <div className="p-3 flex-1 min-w-0">
                          <p className="text-xs text-gray-500 truncate">
                            {post.authorName || "작성자"}
                          </p>
                          <h3 className="font-medium text-gray-800 truncate mt-0.5" title={post.title}>
                            {post.title.slice(0, 46)}
                            {post.title.length > 46 ? "…" : ""}
                          </h3>
                          <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{post.address}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span>{CATEGORY_LABELS[post.category] || post.category}</span>
                            {post.earliestDate && (
                              <span>
                                {new Date(post.earliestDate).toLocaleDateString("ko-KR", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                            {post.durationText && <span>{post.durationText}</span>}
                            <span className="flex items-center gap-0.5">
                              <Users className="w-3 h-3" />
                              {post.currentApplications}/{post.maxParticipants}명
                            </span>
                            {post.hasRequiredItems && <Package className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="py-12 text-center text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>검색어를 입력하세요</p>
            <p className="text-sm mt-1">봉사명, 날짜, 키워드로 검색할 수 있습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
