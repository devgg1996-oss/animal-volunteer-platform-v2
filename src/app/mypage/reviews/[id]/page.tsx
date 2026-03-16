"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star } from "lucide-react";

function stars(n: number) {
  const v = Math.max(1, Math.min(5, n));
  return Array.from({ length: 5 }, (_, i) => i < v);
}

export default function MyReceivedReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const idParam = params?.id;
  const reviewId = typeof idParam === "string" ? Number(idParam) : 0;
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });

  const { data, isLoading } = trpc.review.getMyReceivedById.useQuery(
    { id: reviewId },
    { enabled: isAuthenticated && reviewId > 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 space-y-4 text-center">
            <p className="text-gray-700 font-medium">평가 내역을 찾을 수 없습니다.</p>
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
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold flex-1">평가 내용</h1>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{data.volunteerPostTitle ?? "봉사 활동"}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {new Date(data.createdAt).toLocaleDateString("ko-KR")}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">작성자: {data.writerName || "-"}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-1">
              {stars(data.rating).map((on, idx) => (
                <Star
                  key={idx}
                  className={`w-5 h-5 ${on ? "text-amber-500 fill-amber-500" : "text-gray-300"}`}
                />
              ))}
              <span className="ml-2 text-sm text-gray-700 font-medium">{data.rating} / 5</span>
            </div>

            <div className="rounded-lg border bg-white p-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {data.comment?.trim() ? data.comment : "작성된 코멘트가 없습니다."}
              </p>
            </div>

            <div className="flex gap-2">
              {data.volunteerPostId != null && (
                <Button variant="outline" onClick={() => router.push(`/volunteer/${data.volunteerPostId}`)}>
                  모집글 보기
                </Button>
              )}
              <Button onClick={() => router.push("/mypage")}>마이페이지</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

