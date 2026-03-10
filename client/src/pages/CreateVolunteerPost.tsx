import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ChevronRight, ChevronLeft, AlertCircle, Shirt, Droplet, Gloves, UtensilsCrossed, Mask } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface CreatePostFormData {
  // STEP 2: 기본 정보
  title: string;
  description: string;
  
  // STEP 3: 위치
  address: string;
  detailedLocation: string;
  latitude: number;
  longitude: number;
  
  // STEP 4: 준비물
  requiredItems: string[];
  
  // STEP 5: 일정
  schedules: ScheduleSlot[];
}

interface ScheduleSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  maxParticipants: number;
}

interface ScheduleDate {
  date: string;
  slots: ScheduleSlot[];
}

const PRESET_ITEMS = [
  { id: "comfortable-clothes", label: "편한 복장", icon: Shirt },
  { id: "tumbler", label: "개인 텀블러", icon: Droplet },
  { id: "gloves", label: "작업용 장갑", icon: Gloves },
  { id: "lunch", label: "개인 도시락", icon: UtensilsCrossed },
  { id: "mask", label: "마스크", icon: Mask },
];

export default function CreateVolunteerPost() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<CreatePostFormData>({
    title: "",
    description: "",
    address: "",
    detailedLocation: "",
    latitude: 0,
    longitude: 0,
    requiredItems: [],
    schedules: [],
  });

  const [schedulesByDate, setSchedulesByDate] = useState<ScheduleDate[]>([]);
  const [selectedPresetItems, setSelectedPresetItems] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [newCustomItem, setNewCustomItem] = useState("");

  // 로그인 체크
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-orange-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">로그인이 필요합니다</p>
          <Button onClick={() => navigate("/")} className="bg-orange-600 hover:bg-orange-700">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // STEP 1: 담당자 인증
  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">담당자 정보 확인</h2>
      <Card className="p-6 border-0 bg-green-50 border-l-4 border-green-500">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-700 font-medium">인증 완료</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">단체명</label>
              <p className="text-lg font-semibold text-gray-800">{user.name || "정보 없음"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">담당자 이름</label>
              <p className="text-lg font-semibold text-gray-800">{user.name || "정보 없음"}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">연락처</label>
              <p className="text-lg font-semibold text-gray-800">{user.email || "정보 없음"}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  // STEP 2: 기본 정보
  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">봉사 모집글 기본 정보</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
          <Input
            placeholder="예: 동물보호소 산책 봉사자 모집"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="text-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
          <textarea
            placeholder="봉사 내용, 활동 목적, 주의사항을 작성해주세요"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-32"
          />
        </div>
      </div>
    </div>
  );

  // STEP 3: 위치
  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">봉사 위치</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">주소</label>
          <div className="flex gap-2">
            <Input
              placeholder="주소를 검색하세요"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="flex-1"
            />
            <Button className="bg-orange-600 hover:bg-orange-700">검색</Button>
          </div>
        </div>

        {formData.address && (
          <>
            <div className="bg-gray-200 rounded-lg h-48 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">지도 미리보기</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">상세 위치 설명 (선택)</label>
              <Input
                placeholder="예: 정문 앞 주차장"
                value={formData.detailedLocation}
                onChange={(e) => setFormData({ ...formData, detailedLocation: e.target.value })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );

  // STEP 4: 준비물
  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">준비물 설정</h2>
      
      {/* 기본 제공 준비물 */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3">기본 준비물</h3>
        <div className="grid grid-cols-2 gap-3">
          {PRESET_ITEMS.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedPresetItems.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedPresetItems(selectedPresetItems.filter(id => id !== item.id));
                  } else {
                    setSelectedPresetItems([...selectedPresetItems, item.id]);
                  }
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 bg-white hover:border-orange-300"
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? "text-orange-600" : "text-gray-400"}`} />
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 직접 입력 */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3">추가 준비물</h3>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="준비물을 입력하세요"
            value={newCustomItem}
            onChange={(e) => setNewCustomItem(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && newCustomItem.trim()) {
                setCustomItems([...customItems, newCustomItem]);
                setNewCustomItem("");
              }
            }}
          />
          <Button
            onClick={() => {
              if (newCustomItem.trim()) {
                setCustomItems([...customItems, newCustomItem]);
                setNewCustomItem("");
              }
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            추가
          </Button>
        </div>

        {/* 선택된 준비물 목록 */}
        <div className="flex flex-wrap gap-2">
          {selectedPresetItems.map((itemId) => {
            const item = PRESET_ITEMS.find(i => i.id === itemId);
            return (
              <Badge key={itemId} className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                {item?.label}
              </Badge>
            );
          })}
          {customItems.map((item, idx) => (
            <Badge
              key={`custom-${idx}`}
              className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
              onClick={() => setCustomItems(customItems.filter((_, i) => i !== idx))}
            >
              {item} ✕
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );

  // 네비게이션
  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return true; // 인증은 항상 완료
      case 2:
        return formData.title.trim() && formData.description.trim();
      case 3:
        return formData.address.trim();
      case 4:
        return selectedPresetItems.length > 0 || customItems.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-orange-100 shadow-sm">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-orange-600">봉사 모집글 작성</h1>
            <span className="text-sm text-gray-600">STEP {currentStep}/8</span>
          </div>
          {/* 진행 바 */}
          <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-600 transition-all duration-300"
              style={{ width: `${(currentStep / 8) * 100}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container max-w-2xl mx-auto px-4 py-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {/* 네비게이션 버튼 */}
        <div className="flex gap-3 mt-8 sticky bottom-0 bg-white py-4 -mx-4 px-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            이전
          </Button>
          <Button
            onClick={() => {
              if (canProceedToNext()) {
                setCurrentStep(Math.min(8, currentStep + 1));
              } else {
                toast.error("필수 항목을 입력해주세요");
              }
            }}
            disabled={!canProceedToNext()}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            다음
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}
