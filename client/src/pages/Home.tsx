import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Search, Heart, Clock, Users, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { skipToken } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface VolunteerPostWithDistance {
  id: number;
  title: string;
  category: string;
  shelterName: string | null;
  address: string;
  thumbnailImage: string | null;
  maxParticipants: number;
  currentApplications: number;
  distance: number;
  createdAt: Date;
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"distance" | "recent">("distance");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [posts, setPosts] = useState<VolunteerPostWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // 기본 위치 설정 (서울 강남역)
  useEffect(() => {
    const defaultLocation = { latitude: 37.4979, longitude: 127.0276 };
    setLocation(defaultLocation);
    setAddress("서울시 강남구 (기본 위치)");
  }, []);

  const searchByLocation = trpc.volunteer.searchByLocation.useQuery(
    location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          category: category as any,
          sortBy,
        }
      : skipToken,
    {
      enabled: !!location,
      refetchInterval: 30000, // 30초마다 새로고침
    }
  );

  const searchByKeyword = trpc.volunteer.searchByKeyword.useQuery(
    searchKeyword && location
      ? {
          keyword: searchKeyword,
          latitude: location.latitude,
          longitude: location.longitude,
        }
      : skipToken,
    {
      enabled: !!searchKeyword && !!location,
    }
  );

  // 현재 위치 가져오기
  const handleGetCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
          // 역지오코딩은 간단히 좌표로 표시
          setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setLocationLoading(false);
          toast.success("위치가 설정되었습니다");
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("위치를 가져올 수 없습니다");
          setLocationLoading(false);
        }
      );
    } else {
      toast.error("브라우저가 위치 서비스를 지원하지 않습니다");
      setLocationLoading(false);
    }
  };

  // 검색 결과 업데이트
  useEffect(() => {
    if (searchKeyword && searchByKeyword.data) {
      setPosts(searchByKeyword.data.map(p => ({ ...p, distance: p.distance || 0 })) as VolunteerPostWithDistance[]);
    } else if (searchByLocation.data) {
      setPosts(searchByLocation.data.map(p => ({ ...p, distance: p.distance || 0 })) as VolunteerPostWithDistance[]);
    }
  }, [searchByLocation.data, searchByKeyword.data, searchKeyword]);

  // 카테고리 변경 시 정렬 초기화
  const handleCategoryChange = (value: string) => {
    setCategory(value === "all" ? undefined : value);
  };

  const handlePostClick = (postId: number) => {
    navigate(`/volunteer/${postId}`);
  };

  const handleCreatePost = () => {
    if (!isAuthenticated) {
      toast.error("로그인이 필요합니다");
      return;
    }
    navigate("/volunteer/create");
  };

  const categoryLabels: Record<string, string> = {
    walk: "산책",
    cleaning: "청소",
    transport: "이동봉사",
    other: "기타",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-orange-100 shadow-sm">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🐾</div>
              <h1 className="text-2xl font-bold text-orange-600">동물 봉사 매칭</h1>
            </div>
            {isAuthenticated && user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{user.name || user.email}</span>
                <Button variant="outline" size="sm" onClick={() => navigate("/mypage")}>
                  마이페이지
                </Button>
              </div>
            )}
          </div>

          {/* 위치 설정 섹션 */}
          <div className="bg-orange-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-orange-600" />
              <span className="font-semibold text-gray-800">내 위치 설정</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="주소를 입력하거나 현재 위치를 사용하세요"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleGetCurrentLocation}
                disabled={locationLoading}
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                {locationLoading ? "위치 가져오는 중..." : "현재 위치"}
              </Button>
            </div>
            {location && (
              <p className="text-xs text-gray-600 mt-2">
                📍 {address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
              </p>
            )}
          </div>

          {/* 검색 및 필터 섹션 */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="봉사명, 보호소명 검색..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleCreatePost}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                봉사 공고 작성
              </Button>
            </div>

            {/* 필터 */}
            <div className="flex gap-2 flex-wrap">
              <Select value={category || "all"} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 카테고리</SelectItem>
                  <SelectItem value="walk">산책</SelectItem>
                  <SelectItem value="cleaning">청소</SelectItem>
                  <SelectItem value="transport">이동봉사</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "distance" | "recent")}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">거리순</SelectItem>
                  <SelectItem value="recent">최신순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container max-w-6xl mx-auto px-4 py-8">
        {!location ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-orange-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">위치를 설정해주세요</h2>
            <p className="text-gray-600 mb-6">주변 봉사 기회를 찾기 위해 위치 설정이 필요합니다</p>
            <Button
              onClick={handleGetCurrentLocation}
              disabled={locationLoading}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {locationLoading ? "위치 가져오는 중..." : "현재 위치 사용"}
            </Button>
          </div>
        ) : (
          <>
            {/* 봉사 리스트 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-gray-600">검색 결과가 없습니다</p>
                </div>
              ) : (
                posts.map((post) => (
                  <Card
                    key={post.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-0 bg-white"
                    onClick={() => handlePostClick(post.id)}
                  >
                    {/* 썸네일 */}
                    <div className="relative h-40 bg-gradient-to-br from-orange-200 to-orange-100 overflow-hidden">
                      {post.thumbnailImage ? (
                        <img
                          src={post.thumbnailImage}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          🐾
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3 bg-orange-600 hover:bg-orange-700">
                        {categoryLabels[post.category] || post.category}
                      </Badge>
                      {post.distance !== undefined && (
                        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-semibold text-gray-800">
                          {post.distance.toFixed(1)}km
                        </div>
                      )}
                    </div>

                    {/* 콘텐츠 */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-800 line-clamp-2 mb-2">
                        {post.title}
                      </h3>
                      {post.shelterName && (
                        <p className="text-sm text-orange-600 font-medium mb-2">{post.shelterName}</p>
                      )}
                      <p className="text-xs text-gray-600 mb-3 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {post.address}
                      </p>

                      {/* 인원 정보 */}
                      <div className="flex items-center gap-4 text-xs text-gray-600 mb-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-orange-600" />
                          <span>
                            {post.currentApplications}/{post.maxParticipants}명
                          </span>
                        </div>
                      </div>

                      {/* 버튼 */}
                      <Button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        size="sm"
                      >
                        상세보기
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
