"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Pencil,
  Shirt,
  Coffee,
  HandMetal,
  UtensilsCrossed,
  VenetianMask,
  ImagePlus,
  X,
} from "lucide-react";
import { AddressSearchWithMap } from "@/components/AddressSearchWithMap";
import { useFileUpload, fileToBase64 } from "@/hooks/useFileUpload";

const STEPS = [
  "담당자 인증",
  "기본 정보",
  "봉사 위치",
  "준비물",
  "일정 관리",
  "일정 요약",
  "최종 확인",
  "등록 완료",
];

const PRESET_ITEMS = [
  { id: "clothes", label: "편한 복장", icon: Shirt },
  { id: "tumbler", label: "개인 텀블러", icon: Coffee },
  { id: "gloves", label: "작업용 장갑", icon: HandMetal },
  { id: "lunch", label: "개인 도시락", icon: UtensilsCrossed },
  { id: "mask", label: "마스크", icon: VenetianMask },
];

type TimeSlot = { startTime: string; endTime: string; maxSlots: number };
type DateSchedule = { date: string; slots: TimeSlot[] };

export default function VolunteerCreatePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);

  // Step 1
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const contactEmail = user?.email ?? "";
  const [emailCode, setEmailCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [verified, setVerified] = useState(false);

  // Step 2
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const uploadStorage = trpc.storage.upload.useMutation();
  const sendEmailVerification = trpc.auth.sendEmailVerification.useMutation();
  const verifyEmail = trpc.auth.verifyEmail.useMutation();
  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      const fileBase64 = await fileToBase64(file);
      const res = await uploadStorage.mutateAsync({
        fileBase64,
        contentType: file.type || "image/jpeg",
        filename: file.name,
      });
      return res.url;
    },
    [uploadStorage]
  );

  const thumbnailUpload = useFileUpload({
    uploadFn: uploadImage,
    accept: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSize: 5 * 1024 * 1024,
  });
  const activityUpload = useFileUpload({
    uploadFn: uploadImage,
    accept: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSize: 5 * 1024 * 1024,
  });

  // Step 3
  const [address, setAddress] = useState("");
  const [detailedLocation, setDetailedLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Step 4
  const [selectedPreset, setSelectedPreset] = useState<Record<string, boolean>>({});
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");

  // Step 5
  const [schedules, setSchedules] = useState<DateSchedule[]>([]);
  const [newDate, setNewDate] = useState("");

  const createPost = trpc.volunteer.create.useMutation();
  const addSchedule = trpc.volunteer.addSchedule.useMutation();

  const handleStep1Complete = () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error("담당자 이름과 연락처를 모두 입력해주세요.");
      return;
    }
    if (!contactEmail) {
      toast.error("이메일 정보가 없습니다. 프로필에서 이메일을 먼저 등록해주세요.");
      return;
    }
    if (!emailVerified) {
      toast.error("이메일 인증을 완료해 주세요.");
      return;
    }
    setVerified(true);
    toast.success("담당자 정보 인증이 완료되었습니다.");
  };

  const canGoNext = useCallback(() => {
    if (step === 1) return verified;
    if (step === 2) return title.trim().length > 0 && description.trim().length > 0;
    if (step === 3) return address.trim().length > 0;
    if (step === 5) {
      if (schedules.length === 0) return false;
      return schedules.every(
        (d) =>
          d.slots.length > 0 &&
          d.slots.every((s) => s.startTime && s.endTime && s.maxSlots >= 1)
      );
    }
    return true;
  }, [step, verified, title, description, address, schedules]);

  const handleNext = () => {
    if (step === 1 && !verified) {
      toast.error("인증을 완료한 후 다음 단계로 이동할 수 있습니다.");
      return;
    }
    if (step === 2 && (!title.trim() || !description.trim())) {
      toast.error("제목과 봉사 설명을 입력해주세요.");
      return;
    }
    if (step === 3 && !address.trim()) {
      toast.error("봉사 위치(주소)를 입력해주세요.");
      return;
    }
    if (step === 5) {
      const invalid = schedules.some(
        (d) =>
          d.slots.length === 0 ||
          d.slots.some(
            (s) =>
              !s.startTime ||
              !s.endTime ||
              s.maxSlots < 1
          )
      );
      if (invalid) {
        toast.error("모든 날짜에 최소 1개 이상의 유효한 시간 슬롯을 추가해주세요.");
        return;
      }
    }
    if (step < 8) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const addDate = () => {
    if (!newDate.trim()) {
      toast.error("날짜를 선택해주세요.");
      return;
    }
    if (schedules.some((s) => s.date === newDate)) {
      toast.error("이미 추가된 날짜입니다.");
      return;
    }
    setSchedules((prev) => [...prev, { date: newDate, slots: [] }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewDate("");
  };

  const addSlot = (date: string) => {
    setSchedules((prev) =>
      prev.map((d) =>
        d.date === date
          ? { ...d, slots: [...d.slots, { startTime: "09:00", endTime: "12:00", maxSlots: 5 }] }
          : d
      )
    );
  };

  const updateSlot = (date: string, slotIndex: number, field: keyof TimeSlot, value: string | number) => {
    setSchedules((prev) =>
      prev.map((d) =>
        d.date === date
          ? {
              ...d,
              slots: d.slots.map((s, i) =>
                i === slotIndex ? { ...s, [field]: value } : s
              ),
            }
          : d
      )
    );
  };

  const removeSlot = (date: string, slotIndex: number) => {
    setSchedules((prev) =>
      prev.map((d) =>
        d.date === date
          ? { ...d, slots: d.slots.filter((_, i) => i !== slotIndex) }
          : d
      )
    );
  };

  const removeDate = (date: string) => {
    setSchedules((prev) => prev.filter((d) => d.date !== date));
  };

  const togglePreset = (id: string) => {
    setSelectedPreset((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addCustomItem = () => {
    const v = customInput.trim();
    if (!v) return;
    if (customItems.includes(v)) {
      toast.error("이미 추가된 준비물입니다.");
      return;
    }
    setCustomItems((prev) => [...prev, v]);
    setCustomInput("");
  };

  const removeCustomItem = (item: string) => {
    setCustomItems((prev) => prev.filter((i) => i !== item));
  };

  const getRequiredItemsList = (): string[] => {
    const fromPreset = PRESET_ITEMS.filter((p) => selectedPreset[p.id]).map((p) => p.label);
    return [...fromPreset, ...customItems];
  };

  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    if (thumbnailUpload.isUploading || activityUpload.isUploading) {
      toast.error("이미지 업로드가 완료될 때까지 기다려주세요.");
      return;
    }
    const lat = latitude ?? 37.5665;
    const lng = longitude ?? 126.978;
    const requiredItems = getRequiredItemsList();
    try {
      const thumbnailUrl =
        thumbnailUpload.files.find((f) => f.status === "success" && f.uploadedUrl)?.uploadedUrl ?? undefined;
      const activityUrls = activityUpload.files
        .filter((f): f is typeof f & { uploadedUrl: string } => f.status === "success" && !!f.uploadedUrl)
        .map((f) => f.uploadedUrl)
        .slice(0, 8);

      const { id: postId } = await createPost.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category: "other",
        shelterName: orgName.trim(),
        latitude: lat,
        longitude: lng,
        address: address.trim(),
        detailedLocation: detailedLocation.trim() || undefined,
        thumbnailImage: thumbnailUrl,
        additionalImages: activityUrls.length > 0 ? activityUrls : undefined,
        requiredItems: requiredItems.length > 0 ? requiredItems : undefined,
        precautions: undefined,
        maxParticipants: Math.max(1, schedules.flatMap((d) => d.slots).reduce((s, sl) => s + sl.maxSlots, 0)),
      });

      for (const d of schedules) {
        for (const slot of d.slots) {
          await addSchedule.mutateAsync({
            postId,
            date: d.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            maxSlots: slot.maxSlots,
          });
        }
      }

      setStep(8);
      toast.success("봉사 모집글이 등록되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "등록에 실패했습니다.");
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600 mb-4">로그인 후 봉사 모집글을 작성할 수 있습니다.</p>
            <Button className="w-full" onClick={() => router.push("/login")}>
              로그인
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => (step === 1 ? router.push("/") : handleBack)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">봉사 모집글 작성</h1>
          <div className="w-10" />
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 min-w-[20px] rounded ${
                i + 1 === step ? "bg-orange-500" : i + 1 < step ? "bg-orange-300" : "bg-gray-200"
              }`}
              title={STEPS[i]}
            />
          ))}
        </div>
        <p className="text-sm text-gray-500 mb-4">STEP {step}. {STEPS[step - 1]}</p>

        {/* STEP 1 */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-orange-600" />
                담당자 정보 확인
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {verified ? (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2">
                  <p className="font-medium text-green-800">인증 완료</p>
                  {orgName && (
                    <p className="text-sm text-green-700">단체명: {orgName}</p>
                  )}
                  <p className="text-sm text-green-700">담당자: {contactName}</p>
                  <p className="text-sm text-green-700">연락처: {contactPhone}</p>
                  <p className="text-sm text-green-700">이메일: {contactEmail}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>
                      단체명
                      <span className="ml-1 text-xs text-gray-400">(선택)</span>
                    </Label>
                    <Input
                      placeholder="단체/센터 이름"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      담당자 이름
                      <span className="ml-1 text-xs text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="담당자 성함"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      연락처
                      <span className="ml-1 text-xs text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="010-0000-0000"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      이메일
                      <span className="ml-1 text-xs text-red-500">*</span>
                    </Label>
                    <Input value={contactEmail} disabled />
                    {!contactEmail && (
                      <p className="text-xs text-red-500 mt-1">
                        프로필에서 이메일을 먼저 등록해 주세요. 이메일이 없으면 모집글을 등록할 수 없습니다.
                      </p>
                    )}
                  </div>
                  {contactEmail && (
                    <div className="space-y-2">
                      <Label>이메일 인증</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={async () => {
                            try {
                              await sendEmailVerification.mutateAsync({ email: contactEmail });
                              toast.success("인증 코드가 이메일로 발송되었습니다. 메일함을 확인해 주세요.");
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "인증 코드 발송에 실패했습니다.");
                            }
                          }}
                          disabled={sendEmailVerification.isPending || emailVerified}
                        >
                          {emailVerified
                            ? "이메일 인증 완료"
                            : sendEmailVerification.isPending
                              ? "발송 중..."
                              : "인증 코드 발송"}
                        </Button>
                      </div>
                      {!emailVerified && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="이메일로 받은 인증 코드를 입력하세요"
                            value={emailCode}
                            onChange={(e) => setEmailCode(e.target.value)}
                          />
                          <Button
                            type="button"
                            onClick={async () => {
                              if (!emailCode.trim()) {
                                toast.error("인증 코드를 입력해 주세요.");
                                return;
                              }
                              try {
                                await verifyEmail.mutateAsync({ email: contactEmail, code: emailCode.trim() });
                                setEmailVerified(true);
                                toast.success("이메일 인증이 완료되었습니다.");
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "이메일 인증에 실패했습니다.");
                              }
                            }}
                            disabled={verifyEmail.isPending}
                          >
                            {verifyEmail.isPending ? "인증 중..." : "인증하기"}
                          </Button>
                        </div>
                      )}
                      {emailVerified && (
                        <p className="text-xs text-green-700 mt-1">
                          이 이메일은 담당자 연락처로 사용되며, 수정할 수 없습니다.
                        </p>
                      )}
                    </div>
                  )}
                  <Button className="w-full" onClick={handleStep1Complete}>
                    담당자 정보 인증 완료
                  </Button>
                </>
              )}
              {verified && (
                <Button variant="outline" className="w-full" onClick={() => setStep(2)}>
                  다음 단계
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">봉사 모집글 기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  placeholder="봉사 모집 제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                />
                <p className="text-xs text-gray-500">{title.length}/80</p>
              </div>
              <div className="space-y-2">
                <Label>봉사 설명</Label>
                <Textarea
                  placeholder="봉사 내용, 활동 목적, 주의사항 등을 작성해주세요"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  maxLength={2200}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">{description.length}/2200</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImagePlus className="w-4 h-4" />
                  대표 이미지 (썸네일)
                </Label>
                <p className="text-xs text-gray-500">목록·상세에 노출됩니다. 1장, 5MB 이하 권장.</p>
                {thumbnailUpload.files.length === 0 ? (
                  <label className="flex flex-col items-center justify-center gap-2 h-28 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const list = e.target.files;
                        if (list?.length) {
                          thumbnailUpload.clearFiles();
                          thumbnailUpload.addFiles(list);
                        }
                        e.target.value = "";
                      }}
                    />
                    <Plus className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-500">클릭하여 업로드</span>
                  </label>
                ) : (
                  <div className="relative w-full max-w-[280px] aspect-video rounded-lg overflow-hidden bg-gray-100">
                    {thumbnailUpload.files[0].status === "uploading" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
                        업로드 중…
                      </div>
                    )}
                    {thumbnailUpload.files[0].status === "error" && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-700 text-sm p-2">
                        <span>업로드 실패</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => thumbnailUpload.retryUpload(thumbnailUpload.files[0].id)}
                        >
                          재시도
                        </Button>
                      </div>
                    )}
                    <Image
                      src={thumbnailUpload.files[0].previewUrl}
                      alt="썸네일"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                      onClick={() => thumbnailUpload.removeFile(thumbnailUpload.files[0].id)}
                      aria-label="삭제"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImagePlus className="w-4 h-4" />
                  활동 관련 이미지 (최대 8장)
                </Label>
                <p className="text-xs text-gray-500">봉사 활동 사진을 올려주세요. 5MB 이하 권장.</p>
                <div className="flex flex-wrap gap-2">
                  {activityUpload.files.map((f) => (
                    <div key={f.id} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {f.status === "uploading" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs">
                          업로드 중
                        </div>
                      )}
                      {f.status === "error" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-600 text-xs p-1">
                          <span>실패</span>
                          <button
                            type="button"
                            className="underline"
                            onClick={() => activityUpload.retryUpload(f.id)}
                          >
                            재시도
                          </button>
                        </div>
                      )}
                      <Image src={f.previewUrl} alt="" fill className="object-cover" unoptimized />
                      <button
                        type="button"
                        className="absolute top-0.5 right-0.5 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                        onClick={() => activityUpload.removeFile(f.id)}
                        aria-label="삭제"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {activityUpload.files.length < 8 && (
                    <label className="w-20 h-20 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100 shrink-0">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        multiple
                        onChange={(e) => {
                          const list = e.target.files;
                          if (list?.length) {
                            const rest = 8 - activityUpload.files.length;
                            const toAdd = Array.from(list).slice(0, rest);
                            activityUpload.addFiles(toAdd);
                          }
                          e.target.value = "";
                        }}
                      />
                      <Plus className="w-6 h-6 text-gray-400" />
                    </label>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                봉사 위치
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AddressSearchWithMap
                value={{
                  address,
                  detailedLocation,
                  latitude,
                  longitude,
                }}
                onChange={(v) => {
                  setAddress(v.address);
                  setDetailedLocation(v.detailedLocation);
                  setLatitude(v.latitude);
                  setLongitude(v.longitude);
                }}
                mapHeight={200}
              />
            </CardContent>
          </Card>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">준비물 설정</CardTitle>
              <p className="text-sm text-gray-500">참가자가 준비할 물품을 선택하세요.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {PRESET_ITEMS.map(({ id, label, icon: Icon }) => (
                  <label
                    key={id}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPreset[id] ? "border-orange-500 bg-orange-50" : "border-gray-200"
                    }`}
                  >
                    <Checkbox
                      checked={!!selectedPreset[id]}
                      onCheckedChange={() => togglePreset(id)}
                    />
                    <Icon className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <Label>직접 입력</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="준비물 입력 후 추가"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomItem())}
                  />
                  <Button type="button" variant="outline" onClick={addCustomItem}>
                    추가
                  </Button>
                </div>
              </div>
              {getRequiredItemsList().length > 0 && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">선택된 준비물</p>
                  <ul className="flex flex-wrap gap-2">
                    {getRequiredItemsList().map((item) => (
                      <li
                        key={item}
                        className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded border text-sm"
                      >
                        {item}
                        {customItems.includes(item) && (
                          <button
                            type="button"
                            className="text-gray-400 hover:text-red-500"
                            onClick={() => removeCustomItem(item)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 5 */}
        {step === 5 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  봉사 일정 관리
                </CardTitle>
                <p className="text-sm text-gray-500">날짜를 추가한 뒤, 각 날짜에 시간 슬롯을 추가하세요.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addDate}>
                    <Plus className="w-4 h-4 mr-1" />
                    날짜 추가
                  </Button>
                </div>
              </CardContent>
            </Card>

            {schedules.map((ds) => (
              <Card key={ds.date}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {new Date(ds.date + "Z").toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => removeDate(ds.date)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ds.slots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-gray-50"
                    >
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateSlot(ds.date, idx, "startTime", e.target.value)}
                        className="w-[100px]"
                      />
                      <span className="text-gray-500">~</span>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateSlot(ds.date, idx, "endTime", e.target.value)}
                        className="w-[100px]"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={slot.maxSlots}
                        onChange={(e) => updateSlot(ds.date, idx, "maxSlots", parseInt(e.target.value, 10) || 1)}
                        className="w-16"
                      />
                      <span className="text-sm text-gray-500">명</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 shrink-0"
                        onClick={() => removeSlot(ds.date, idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => addSlot(ds.date)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    시간 슬롯 추가
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* STEP 6 */}
        {step === 6 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">모집 일정 요약</CardTitle>
              <p className="text-sm text-gray-500">등록한 일정을 확인하고 수정하려면 아래 버튼을 누르세요.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {schedules.map((ds) => (
                <div key={ds.date} className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium">
                    {new Date(ds.date + "Z").toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <ul className="space-y-1">
                    {ds.slots.map((s, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {s.startTime} ~ {s.endTime} · 모집 {s.maxSlots}명
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={() => setStep(5)}>
                <Pencil className="w-4 h-4 mr-2" />
                일정 수정하기
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 7 */}
        {step === 7 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">최종 확인</CardTitle>
              <p className="text-sm text-gray-500">신청자에게 보이는 화면 형태로 요약합니다.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">제목</p>
                <p className="font-medium">{title || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">봉사 설명</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{description || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">위치</p>
                <p className="text-sm">{address || "-"}</p>
                {detailedLocation && <p className="text-sm text-gray-600">{detailedLocation}</p>}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">준비물</p>
                <p className="text-sm">
                  {getRequiredItemsList().length > 0 ? getRequiredItemsList().join(", ") : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">봉사 일정</p>
                <ul className="space-y-2">
                  {schedules.map((ds) => (
                    <li key={ds.date} className="text-sm">
                      {new Date(ds.date + "Z").toLocaleDateString("ko-KR")} ·{" "}
                      {ds.slots.map((s) => `${s.startTime}~${s.endTime}(${s.maxSlots}명)`).join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 8 */}
        {step === 8 && (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold">등록이 완료되었습니다</h2>
              <p className="text-sm text-gray-600">
                마이페이지에서 일정을 수정하거나 참가자를 관리할 수 있습니다.
              </p>
              <Button className="w-full" onClick={() => router.push("/mypage")}>
                마이페이지로 이동
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
                홈으로
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer nav */}
        {step < 8 && step !== 1 && (
          <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto px-4 py-3 bg-white border-t flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleBack}>
              이전
            </Button>
            {step === 7 ? (
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={createPost.isPending}
              >
                {createPost.isPending ? "등록 중..." : "봉사 모집글 등록하기"}
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleNext} disabled={!canGoNext()}>
                {step === 6 ? "다음 (최종 확인)" : step === 5 ? "다음 (일정 요약)" : "다음"}
              </Button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
