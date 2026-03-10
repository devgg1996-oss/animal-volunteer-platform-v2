import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { MapPin, Clock, Users, AlertCircle, Heart, Share2, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface RouteParams {
  id?: string;
}

export default function VolunteerDetail({ params }: { params: RouteParams }) {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const postId = params?.id ? parseInt(params.id, 10) : 0;
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const { data: postData, isLoading } = trpc.volunteer.getById.useQuery({ id: postId });
  const applyMutation = trpc.application.create.useMutation();
  const bookmarkMutation = trpc.bookmark.add.useMutation();

  if (!postId || isNaN(postId)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-orange-300 mx-auto mb-4" />
          <p className="text-gray-600">잘못된 접근입니다</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const handleApply = async () => {
    if (!isAuthenticated) {
      toast.error("로그인이 필요합니다");
      return;
    }

    if (!selectedScheduleId) {
      toast.error("일정을 선택해주세요");
      return;
    }

    if (!applicantName.trim()) {
      toast.error("이름을 입력해주세요");
      return;
    }

    if (!applicantPhone.trim()) {
      toast.error("전화번호를 입력해주세요");
      return;
    }

    setIsApplying(true);
    try {
      await applyMutation.mutateAsync({
        postId,
        scheduleId: selectedScheduleId,
        applicantName,
        applicantPhone,
      });
      toast.success("봉사 신청이 완료되었습니다!");
      setApplicantName("");
      setApplicantPhone("");
      setSelectedScheduleId(null);
    } catch (error: any) {
      toast.error(error.message || "신청 중 오류가 발생했습니다");
    } finally {
      setIsApplying(false);
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      toast.error("로그인이 필요합니다");
      return;
    }

    try {
      await bookmarkMutation.mutateAsync({
        postId,
        type: "post",
      });
      toast.success("북마크에 추가되었습니다!");
    } catch (error: any) {
      toast.error(error.message || "북마크 추가 중 오류가 발생했습니다");
    }
  };

  const categoryLabels: Record<string, string> = {
    walk: "산책",
    cleaning: "청소",
    transport: "이동봉사",
    other: "기타",
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
          <Button onClick={() => navigate("/")} className="mt-4">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const post = postData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-orange-100 shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </Button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* 썸네일 */}
        <div className="relative h-64 bg-gradient-to-br from-orange-200 to-orange-100 rounded-lg overflow-hidden mb-6">
          {post.thumbnailImage ? (
            <img
              src={post.thumbnailImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              🐾
            </div>
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-orange-600 hover:bg-orange-700">
              {categoryLabels[post.category] || post.category}
            </Badge>
            <Badge className="bg-blue-600 hover:bg-blue-700">
              {post.status === "recruiting" ? "모집 중" : post.status === "closed" ? "마감" : "완료"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽 콘텐츠 */}
          <div className="lg:col-span-2">
            {/* 기본 정보 */}
            <Card className="p-6 mb-6 border-0">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">{post.title}</h1>
                  {post.shelterName && (
                    <p className="text-lg text-orange-600 font-medium">{post.shelterName}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleBookmark}
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    <Heart className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-gray-300"
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* 위치 정보 */}
              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-100">
                <MapPin className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800">{post.address}</p>
                  {post.detailedLocation && (
                    <p className="text-sm text-gray-600">{post.detailedLocation}</p>
                  )}
                </div>
              </div>

              {/* 인원 정보 */}
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-600" />
                  <span>
                    현재 {post.currentApplications}명 / 최대 {post.maxParticipants}명
                  </span>
                </div>
              </div>
            </Card>

            <section className="bg-card text-card-foreground rounded-xl border shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">모집글 설명</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{typeof post.description === 'string' ? post.description : ''}</p>
            </section>

            {/* 필요 물품 */}
            {post.requiredItems && (
              <Card className="p-6 mb-6 border-0">
                <h2 className="text-xl font-bold text-gray-800 mb-4">필요한 물품</h2>
                <div className="flex flex-wrap gap-2">
                  {typeof post.requiredItems === "string"
                    ? JSON.parse(post.requiredItems).map((item: string, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {item}
                        </Badge>
                      ))
                    : Array.isArray(post.requiredItems) &&
                      (post.requiredItems as any[]).map((item: string, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {item}
                        </Badge>
                      ))}
                </div>
              </Card>
            )}

            {/* 주의사항 */}
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

          {/* 오른쪽 신청 폼 */}
          <div>
            <Card className="p-6 border-0 sticky top-20">
              <h2 className="text-xl font-bold text-gray-800 mb-4">봉사 신청</h2>

              {post.status !== "recruiting" && (
                <div className="mb-4 p-3 bg-gray-100 rounded text-sm text-gray-700">
                  이 모집글은 현재 신청을 받지 않습니다.
                </div>
              )}

              {/* 일정 선택 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  봉사 일정 선택
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {post.schedules && post.schedules.length > 0 ? (
                    post.schedules.map((schedule: any) => (
                      <button
                        key={schedule.id}
                        onClick={() => setSelectedScheduleId(schedule.id)}
                        className={`w-full p-3 rounded border-2 text-left transition ${
                          selectedScheduleId === schedule.id
                            ? "border-orange-600 bg-orange-50"
                            : "border-gray-200 hover:border-orange-300"
                        }`}
                        disabled={schedule.currentApplications >= schedule.maxSlots}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span className="font-semibold text-sm">
                            {new Date(schedule.date).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {schedule.startTime} ~ {schedule.endTime}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {schedule.currentApplications}/{schedule.maxSlots}명
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600">일정이 없습니다</p>
                  )}
                </div>
              </div>

              {/* 신청자 정보 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  이름
                </label>
                <Input
                  placeholder="이름을 입력하세요"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  disabled={!isAuthenticated}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  전화번호
                </label>
                <Input
                  placeholder="010-0000-0000"
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  disabled={!isAuthenticated}
                />
              </div>

              {/* 신청 버튼 */}
              <Button
                onClick={handleApply}
                disabled={!isAuthenticated || post.status !== "recruiting" || isApplying}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                size="lg"
              >
                {isApplying ? "신청 중..." : "봉사 신청하기"}
              </Button>

              {!isAuthenticated && (
                <p className="text-xs text-gray-600 text-center mt-3">
                  신청하려면 로그인이 필요합니다
                </p>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
