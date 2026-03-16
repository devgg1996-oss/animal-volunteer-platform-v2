"use client";

import { useMemo, useState } from "react";
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
  PENDING: "신청완료",
  APPROVED: "승인완료",
  REJECTED: "승인거절",
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

        {/* 2. 예정된 봉사 일정 */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            나의 봉사 일정 (예정된 활동)
          </h2>
          {appsLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : upcoming.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500 text-sm">
                예정된 봉사 일정이 없습니다.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((app) => (
                <li key={app.id}>
                  <Card
                    className="cursor-pointer hover:border-orange-300 transition-colors"
                    onClick={() => router.push(`/mypage/applications/${app.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{app.postTitle}</p>
                          {app.authorName && (
                            <p className="text-xs text-gray-500 mt-0.5">작성자: {app.authorName}</p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(app.scheduleDate)} · {app.startTime} ~ {app.endTime}
                          </p>
                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <span className="truncate">{app.postAddress}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {STATUS_LABEL[app.status] ?? app.status}
                            </Badge>
                            <span className="text-xs text-orange-600 font-medium">
                              {getDday(app.scheduleDate)}
                            </span>
                            <span className="text-xs text-gray-400">
                              신청일 {formatDate(app.createdAt)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                      </div>
                      {showCancelConfirm === app.id ? (
                        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-sm text-amber-800 mb-2">
                            정말 봉사 신청을 취소하시겠습니까? 취소 후에는 재신청이 필요할 수 있습니다.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowCancelConfirm(null);
                              }}
                            >
                              유지
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelMutation.mutate({ applicationId: app.id });
                              }}
                            >
                              취소하기
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-3 text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCancelConfirm(app.id);
                          }}
                        >
                          봉사활동 취소
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 3. 완료된 봉사 내역 */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            나의 봉사 내역 (완료된 활동)
          </h2>
          {completed.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500 text-sm">
                완료된 봉사 내역이 없습니다.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {completed.map((app, index) => (
                <li key={app.id}>
                  <Card
                    className="cursor-pointer hover:border-orange-200"
                    onClick={() => router.push(`/mypage/applications/${app.id}`)}
                  >
                    <CardContent className="p-4">
                      <p className="font-medium truncate">{app.postTitle}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(app.scheduleDate)} · {app.startTime} ~ {app.endTime}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {app.attended === true && (
                          <Badge className="bg-green-600">참석</Badge>
                        )}
                        {app.attended === false && (
                          <Badge variant="secondary">불참</Badge>
                        )}
                        {app.attended == null && app.status === "CANCELLED" && (
                          <Badge variant="outline">취소됨</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  {/* 추천: 3개마다 추천 카드 (최신 구인글) */}
                  {(index + 1) % 3 === 0 && index < completed.length - 1 && myPosts[0] && (
                    <Card
                      className="mt-3 border-dashed bg-orange-50/50 cursor-pointer"
                      onClick={() => router.push(`/mypage/volunteer/${myPosts[0].id}`)}
                    >
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <span className="text-sm text-gray-600">다른 봉사도 확인해 보세요</span>
                        <ChevronRight className="w-4 h-4" />
                      </CardContent>
                    </Card>
                  )}
                </li>
              ))}
            </ul>
          )}
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

        {/* 5. 내가 작성한 봉사 구인글 */}
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-600" />
            내가 작성한 봉사 구인글
          </h2>
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
              {myPosts.map((post) => (
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
