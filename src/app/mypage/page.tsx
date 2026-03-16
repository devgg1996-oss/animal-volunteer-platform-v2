"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  User,
  Mail,
  ThermometerSun,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  Bell,
  FileText,
  Settings,
  LogOut,
  Home,
  Heart,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "승인대기",
  APPROVED: "승인",
  REJECTED: "거절",
  CANCELLED: "취소됨",
};

const POST_STATUS_LABEL: Record<string, string> = {
  RECRUITING: "구인중",
  CLOSED: "구인마감",
  COMPLETED: "활동완료",
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getDday(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "D-day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

export default function MyPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [remindOn, setRemindOn] = useState(true);
  const [newPostAlertOn, setNewPostAlertOn] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<number | null>(null);
  const [selectedApplicationDate, setSelectedApplicationDate] = useState<string | null>(null);

  const { data: applications = [], isLoading: appsLoading } =
    trpc.application.getMyApplicationsWithDetails.useQuery(undefined, {
      enabled: isAuthenticated,
    });

  const { data: myPosts = [], isLoading: postsLoading } =
    trpc.volunteer.getMyPosts.useQuery(undefined, {
      enabled: isAuthenticated,
    });

  const { data: reputation } = trpc.reputation.getMyReputation.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const todayStart = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  }, []);

  const upcoming = useMemo(
    () =>
      applications.filter(
        (a) =>
          (a.status === "PENDING" || a.status === "APPROVED") &&
          new Date(a.scheduleDate).getTime() >= todayStart
      ),
    [applications, todayStart]
  );

  const myApplicationsForStatusView = useMemo(() => {
    // 홈의 "나의 봉사 신청 현황"과 동일 컨셉: 최근 신청 내역 기준으로 상태 확인
    return [...applications]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);
  }, [applications]);

  const applicationDates = useMemo(() => {
    const dates = Array.from(
      new Set(
        myApplicationsForStatusView.map((app) =>
          new Date(app.scheduleDate).toISOString().slice(0, 10)
        )
      )
    )
      .sort()
      .reverse();
    return dates;
  }, [myApplicationsForStatusView]);

  useEffect(() => {
    if (!selectedApplicationDate && applicationDates.length > 0) {
      setSelectedApplicationDate(applicationDates[0]);
    }
  }, [applicationDates, selectedApplicationDate]);

  const applicationsForSelectedDate = useMemo(() => {
    if (!selectedApplicationDate) return [];
    return myApplicationsForStatusView.filter((app) => {
      const d = new Date(app.scheduleDate).toISOString().slice(0, 10);
      return d === selectedApplicationDate;
    });
  }, [myApplicationsForStatusView, selectedApplicationDate]);

  const completed = useMemo(
    () =>
      applications.filter(
        (a) =>
          new Date(a.scheduleDate).getTime() < todayStart || a.status === "CANCELLED"
      ),
    [applications, todayStart]
  );

  const cancelMutation = trpc.application.cancel.useMutation({
    onSuccess: () => {
      setShowCancelConfirm(null);
      toast.success("봉사 신청이 취소되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600 mb-4">로그인이 필요합니다.</p>
            <Button className="w-full" onClick={() => router.push("/login")}>
              로그인
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activityTemp = reputation
    ? Math.round(reputation.avgRating * 20)
    : user.activityTemperature ?? 0;
  const tempPercent = Math.min(100, Math.max(0, activityTemp));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">마이페이지</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/")}
            className="shrink-0"
          >
            <Home className="w-4 h-4 mr-1" />
            홈으로
          </Button>
        </div>
        {/* 1. 프로필 요약 */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden">
                {user.profileImage ? (
                  <Image
                    src={user.profileImage}
                    alt=""
                    width={64}
                    height={64}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <User className="w-8 h-8 text-orange-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">
                  {user.nickname || user.name || "이름 없음"}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{user.email || "-"}</span>
                </div>
              </div>
            </div>
            {/* 봉사활동 온도 */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <ThermometerSun className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium">봉사활동 온도</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all"
                  style={{ width: `${tempPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                참여·리뷰에 따라 변동됩니다. 노쇼 시 급격히 하락할 수 있습니다.
              </p>
            </div>
          </CardHeader>
        </Card>

        {/* 2. 나의 봉사 신청 현황 (홈과 동일 UI로 대체) */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            나의 봉사 신청 현황
          </h2>
          {appsLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 -mx-2 px-2">
              {/* 왼쪽: 날짜 리스트 (달력 역할) */}
              <div className="sm:w-1/3">
                <div className="rounded-lg border bg-white p-3 max-h-64 overflow-y-auto">
                  {applicationDates.length === 0 ? (
                    <p className="text-xs text-gray-500">신청 내역이 없습니다.</p>
                  ) : (
                    <ul className="space-y-1">
                      {applicationDates.map((d) => {
                        const dateObj = new Date(d + "T00:00:00Z");
                        const isSelected = selectedApplicationDate === d;
                        return (
                          <li key={d}>
                            <button
                              type="button"
                              onClick={() => setSelectedApplicationDate(d)}
                              className={`w-full text-left px-2 py-1 rounded-md text-xs ${
                                isSelected
                                  ? "bg-orange-100 text-orange-700 font-medium"
                                  : "hover:bg-gray-50 text-gray-700"
                              }`}
                            >
                              {dateObj.toLocaleDateString("ko-KR", {
                                month: "short",
                                day: "numeric",
                                weekday: "short",
                              })}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* 오른쪽: 선택한 날짜의 신청 내역 */}
              <div className="sm:w-2/3">
                <div className="rounded-lg border bg-white p-3 space-y-2 max-h-64 overflow-y-auto">
                  {applicationsForSelectedDate.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      선택한 날짜에 신청한 봉사 내역이 없습니다.
                    </p>
                  ) : (
                    applicationsForSelectedDate.map((app) => (
                      <Card
                        key={app.id}
                        className="p-3 cursor-pointer hover:shadow-sm transition-shadow border-gray-100"
                        onClick={() => router.push(`/mypage/applications/${app.id}`)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-800 text-sm truncate">
                              {app.postTitle}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {new Date(app.scheduleDate).toLocaleTimeString("ko-KR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              ({app.startTime}~{app.endTime})
                            </p>
                          </div>
                          <span
                            className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded ${
                              app.status === "APPROVED"
                                ? "bg-green-100 text-green-700"
                                : app.status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : app.status === "CANCELLED"
                                    ? "bg-gray-100 text-gray-600"
                                    : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {STATUS_LABEL[app.status] ?? app.status}
                          </span>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 3. 나의 봉사 내역 (평가 받은 활동만) */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            나의 봉사 내역
          </h2>
          <MyReceivedReviewsBlock />
        </section>

        {/* 4. 알림 설정 */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600" />
            알림 설정
          </h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">봉사 일정 리마인드 알림</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    봉사 전날 오후 5시에 알림을 보냅니다.
                  </p>
                </div>
                <Switch checked={remindOn} onCheckedChange={setRemindOn} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">새 봉사 등록 알림</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    관심 활동 또는 관심 작성자의 새 모집글 알림
                  </p>
                </div>
                <Switch checked={newPostAlertOn} onCheckedChange={setNewPostAlertOn} />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 5. 내가 작성한 봉사 구인글 (요약) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              내가 작성한 봉사 구인글
            </h2>
            <Button
              variant="outline"
              size="xs"
              className="text-xs h-7 px-2"
              onClick={() => router.push("/mypage/my-posts")}
            >
              전체 보기
            </Button>
          </div>
          {postsLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : myPosts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500 text-sm">
                작성한 구인글이 없습니다.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {myPosts.slice(0, 3).map((post) => (
                <li key={post.id}>
                  <Card
                    className="cursor-pointer hover:border-orange-300 transition-colors"
                    onClick={() => router.push(`/mypage/volunteer/${post.id}`)}
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{post.title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {POST_STATUS_LABEL[post.status] ?? post.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            모집 {post.maxParticipants}명 · 신청 {post.currentApplications}명
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                    </CardContent>
                  </Card>
                </li>
              ))}
              {myPosts.length > 3 && (
                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-gray-600"
                    onClick={() => router.push("/mypage/my-posts")}
                  >
                    나머지 {myPosts.length - 3}개 구인글 더 보기
                  </Button>
                </li>
              )}
            </ul>
          )}
        </section>

        {/* 6. 계정 관리 */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-600" />
            계정 관리
          </h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-sm text-gray-500">닉네임</Label>
                <p className="font-medium mt-1">{user.nickname || user.name || "-"}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">이메일 (로그인 ID)</Label>
                <p className="font-medium mt-1">{user.email || "-"}</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/mypage/profile")}
              >
                프로필 수정
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/mypage/addresses")}
              >
                <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                주소 관리
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/bookmarks")}
              >
                <Heart className="w-4 h-4 mr-2 fill-current text-red-500" />
                내 북마크
              </Button>
              <Button
                variant="outline"
                className="w-full text-gray-600"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-500 text-sm"
                onClick={() => toast.info("회원탈퇴는 준비 중입니다.")}
              >
                회원탈퇴
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function MyReceivedReviewsBlock() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: reviews = [], isLoading } = trpc.review.getMyReceived.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return <p className="text-sm text-gray-500">불러오는 중...</p>;
  }

  if (!reviews.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500 text-sm">
          평가받은 봉사 내역이 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id}>
          <Card className="hover:border-orange-200 transition-colors">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{r.volunteerPostTitle ?? "봉사 활동"}</p>
                <p className="text-xs text-gray-500 mt-1">
                  작성자: {r.writerName || "-"} · {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  평점 <span className="font-semibold">{r.rating}</span> / 5
                </p>
              </div>
              <div className="shrink-0 flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/mypage/reviews/${r.id}`)}
                >
                  평가 보기
                </Button>
                {r.volunteerPostId != null && (
                  <Button size="sm" variant="ghost" onClick={() => router.push(`/volunteer/${r.volunteerPostId}`)}>
                    모집글
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
