"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, FileText, Filter, ChevronLeft, ChevronRight } from "lucide-react";

const POST_STATUS_LABEL: Record<string, string> = {
  RECRUITING: "구인중",
  CLOSED: "구인마감",
  COMPLETED: "활동완료",
};

const SORT_LABEL: Record<"newest" | "oldest", string> = {
  newest: "최신순",
  oldest: "오래된순",
};

export default function MyPostsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | "RECRUITING" | "CLOSED" | "COMPLETED">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { data: myPosts = [], isLoading } = trpc.volunteer.getMyPosts.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const filteredAndSorted = useMemo(() => {
    let list = myPosts;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    list = [...list].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });
    return list;
  }, [myPosts, statusFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredAndSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 space-y-4">
            <p className="text-center text-gray-600">로그인이 필요합니다.</p>
            <Button className="w-full" onClick={() => router.push("/login")}>
              로그인
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              내가 작성한 봉사 구인글
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              내가 등록한 봉사 구인글을 상태·정렬 기준에 따라 확인하고 관리할 수 있어요.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/mypage")}
            className="shrink-0"
          >
            <Home className="w-4 h-4 mr-1" />
            마이페이지
          </Button>
        </div>

        {/* 필터 / 정렬 */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Filter className="w-4 h-4 text-orange-600" />
              <span>필터 · 정렬</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-xs text-gray-500">구인 상태</span>
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as "all" | "RECRUITING" | "CLOSED" | "COMPLETED")
                }
              >
                <SelectTrigger className="h-9 w-full sm:w-40">
                  <SelectValue placeholder="전체 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="RECRUITING">구인중</SelectItem>
                  <SelectItem value="CLOSED">구인마감</SelectItem>
                  <SelectItem value="COMPLETED">활동완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-xs text-gray-500">정렬 기준</span>
              <Select
                value={sortOrder}
                onValueChange={(v) => setSortOrder(v as "newest" | "oldest")}
              >
                <SelectTrigger className="h-9 w-full sm:w-40">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{SORT_LABEL.newest}</SelectItem>
                  <SelectItem value="oldest">{SORT_LABEL.oldest}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 리스트 */}
        <section>
          {isLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : filteredAndSorted.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-gray-500 text-sm">
                조건에 맞는 구인글이 없습니다.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pageItems.map((post) => (
                <Card
                  key={post.id}
                  className="cursor-pointer hover:border-orange-300 transition-colors"
                  onClick={() => router.push(`/mypage/volunteer/${post.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{post.title}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-gray-500">
                        <Badge variant="secondary" className="text-[11px]">
                          {POST_STATUS_LABEL[post.status] ?? post.status}
                        </Badge>
                        <span>
                          모집 {post.maxParticipants}명 · 신청 {post.currentApplications}명
                        </span>
                        {post.createdAt && (
                          <span className="text-gray-400">
                            작성일{" "}
                            {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                              year: "2-digit",
                              month: "2-digit",
                              day: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* 페이지네이션 */}
        {filteredAndSorted.length > 0 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-gray-600">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

