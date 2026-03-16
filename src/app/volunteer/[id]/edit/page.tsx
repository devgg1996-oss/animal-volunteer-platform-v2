"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowLeft,
  ImagePlus,
  Plus,
  X,
  MapPin,
  Save,
  Calendar,
  Clock,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressSearchWithMap } from "@/components/AddressSearchWithMap";
import { useFileUpload, fileToBase64 } from "@/hooks/useFileUpload";
import { getImageSrc } from "@/lib/utils";

export default function VolunteerEditPage() {
  const router = useRouter();
  const params = useParams();
  const postId = typeof params?.id === "string" ? parseInt(params.id, 10) : 0;
  const { user, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });

  const { data: post, isLoading } = trpc.volunteer.getById.useQuery(
    { id: postId },
    { enabled: isAuthenticated && postId > 0 }
  );

  type SlotDraft = {
    id?: number;
    date: string; // yyyy-mm-dd
    startTime: string;
    endTime: string;
    maxSlots: number;
    deleted?: boolean;
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [detailedLocation, setDetailedLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [newDate, setNewDate] = useState("");

  const initialThumbnail = useMemo(() => getImageSrc(post?.thumbnailImage ?? null), [post?.thumbnailImage]);
  const initialAdditionalImages = useMemo(() => {
    const list = (post as typeof post & { additionalImages?: string[] })?.additionalImages ?? [];
    return list.map((u) => getImageSrc(u)).filter((x): x is string => !!x);
  }, [post]);

  useEffect(() => {
    if (!post) return;
    setTitle(post.title ?? "");
    setDescription(typeof post.description === "string" ? post.description : "");
    setAddress(post.address ?? "");
    setDetailedLocation(post.detailedLocation ?? "");
    setLatitude(post.latitude ?? null);
    setLongitude(post.longitude ?? null);

    const schedules =
      (post as typeof post & {
        schedules?: { id: number; date: Date; startTime: string; endTime: string; maxSlots: number }[];
      })?.schedules ?? [];
    setSlots(
      schedules.map((s) => ({
        id: s.id,
        date: new Date(s.date).toISOString().slice(0, 10),
        startTime: s.startTime,
        endTime: s.endTime,
        maxSlots: s.maxSlots,
      }))
    );
  }, [post]);

  const uploadStorage = trpc.storage.upload.useMutation();
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

  const updateMutation = trpc.volunteer.update.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const addScheduleMutation = trpc.volunteer.addSchedule.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const updateScheduleMutation = trpc.volunteer.updateSchedule.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const deleteScheduleMutation = trpc.volunteer.deleteSchedule.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const [saving, setSaving] = useState(false);

  const groupedSlots = useMemo(() => {
    const m = new Map<string, { slot: SlotDraft; idx: number }[]>();
    slots.forEach((s, idx) => {
      if (s.deleted) return;
      const list = m.get(s.date) ?? [];
      list.push({ slot: s, idx });
      m.set(s.date, list);
    });
    for (const [k, list] of m.entries()) {
      list.sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
      m.set(k, list);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  const canSave = title.trim().length > 0 && description.trim().length > 0 && address.trim().length > 0;

  const addDate = () => {
    const d = newDate.trim();
    if (!d) {
      toast.error("날짜를 선택해주세요.");
      return;
    }
    if (groupedSlots.some(([date]) => date === d)) {
      toast.error("이미 추가된 날짜입니다.");
      return;
    }
    setSlots((prev) => [...prev, { date: d, startTime: "09:00", endTime: "12:00", maxSlots: 5 }]);
    setNewDate("");
  };

  const addSlot = (date: string) => {
    setSlots((prev) => [...prev, { date, startTime: "09:00", endTime: "12:00", maxSlots: 5 }]);
  };

  const updateSlot = (idx: number, patch: Partial<SlotDraft>) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const deleteSlot = (idx: number) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, deleted: true } : s)));
  };

  const deleteDate = (date: string) => {
    setSlots((prev) => prev.map((s) => (s.date === date ? { ...s, deleted: true } : s)));
  };

  const handleSave = async () => {
    if (!isAuthenticated || !user) return;
    if (!canSave) {
      toast.error("제목/설명/주소를 입력해 주세요.");
      return;
    }
    if (thumbnailUpload.isUploading || activityUpload.isUploading) {
      toast.error("이미지 업로드가 완료될 때까지 기다려주세요.");
      return;
    }

    const activeSlots = slots.filter((s) => !s.deleted);
    if (activeSlots.length === 0) {
      toast.error("최소 1개 이상의 일정 슬롯이 필요합니다.");
      return;
    }
    const invalid = activeSlots.some(
      (s) =>
        !s.date ||
        !s.startTime ||
        !s.endTime ||
        !Number.isFinite(s.maxSlots) ||
        s.maxSlots < 1
    );
    if (invalid) {
      toast.error("일정의 날짜/시간/모집 인원을 확인해주세요.");
      return;
    }

    const newThumbnail =
      thumbnailUpload.files.find((f) => f.status === "success" && f.uploadedUrl)?.uploadedUrl ??
      undefined;

    const uploadedAdditional = activityUpload.files
      .filter((f): f is typeof f & { uploadedUrl: string } => f.status === "success" && !!f.uploadedUrl)
      .map((f) => f.uploadedUrl);

    const nextAdditional =
      uploadedAdditional.length > 0 ? uploadedAdditional.slice(0, 8) : undefined;

    try {
      setSaving(true);
      await updateMutation.mutateAsync({
        id: postId,
        title: title.trim(),
        description: description.trim(),
        address: address.trim(),
        detailedLocation: detailedLocation.trim() || undefined,
        latitude,
        longitude,
        thumbnailImage: newThumbnail,
        additionalImages: nextAdditional,
      });

      const toDelete = slots.filter((s) => s.deleted && s.id).map((s) => s.id!) ;
      const toUpdate = slots.filter((s) => !s.deleted && s.id) as (SlotDraft & { id: number })[];
      const toAdd = slots.filter((s) => !s.deleted && !s.id);

      for (const id of toDelete) {
        await deleteScheduleMutation.mutateAsync({ scheduleId: id });
      }
      for (const s of toUpdate) {
        await updateScheduleMutation.mutateAsync({
          scheduleId: s.id,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          maxSlots: s.maxSlots,
        });
      }
      for (const s of toAdd) {
        await addScheduleMutation.mutateAsync({
          postId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          maxSlots: s.maxSlots,
        });
      }

      toast.success("모집글이 수정되었습니다.");
      router.push(`/mypage/volunteer/${postId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (postId <= 0 || Number.isNaN(postId)) {
    router.replace("/mypage");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 space-y-4 text-center">
            <p className="text-gray-700 font-medium">모집글을 찾을 수 없습니다.</p>
            <Button onClick={() => router.push("/mypage")}>마이페이지로</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/mypage/volunteer/${postId}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold truncate">모집글 수정</h1>
          </div>
          <Button onClick={handleSave} disabled={!canSave || updateMutation.isPending}>
            <Save className="w-4 h-4 mr-1" />
            {updateMutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>제목</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
              <p className="text-xs text-gray-500">{title.length}/80</p>
            </div>
            <div className="space-y-2">
              <Label>봉사 설명</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                maxLength={2200}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">{description.length}/2200</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-600" />
              봉사 위치
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AddressSearchWithMap
              value={{ address, detailedLocation, latitude, longitude }}
              onChange={(v) => {
                setAddress(v.address);
                setDetailedLocation(v.detailedLocation);
                setLatitude(v.latitude);
                setLongitude(v.longitude);
              }}
              mapHeight={220}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              봉사 일정
            </CardTitle>
            <p className="text-sm text-gray-500">
              날짜를 추가하고 시간 슬롯을 편집할 수 있어요.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="flex-1"
              />
              <Button type="button" onClick={addDate}>
                <Plus className="w-4 h-4 mr-1" />
                날짜 추가
              </Button>
            </div>

            {groupedSlots.length === 0 ? (
              <p className="text-sm text-gray-500">등록된 일정이 없습니다.</p>
            ) : (
              groupedSlots.map(([date, list]) => (
                <div key={date} className="rounded-lg border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-800">
                      {new Date(date + "T00:00:00Z").toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => addSlot(date)}>
                        <Plus className="w-4 h-4 mr-1" />
                        슬롯 추가
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => deleteDate(date)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        날짜 삭제
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {list.map(({ slot, idx }) => (
                      <div
                        key={slot.id ?? `new-${idx}`}
                        className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateSlot(idx, { startTime: e.target.value })}
                            className="w-[110px]"
                          />
                          <span className="text-gray-500">~</span>
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateSlot(idx, { endTime: e.target.value })}
                            className="w-[110px]"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            value={slot.maxSlots}
                            onChange={(e) =>
                              updateSlot(idx, { maxSlots: parseInt(e.target.value, 10) || 1 })
                            }
                            className="w-20"
                          />
                          <span className="text-sm text-gray-500">명</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => deleteSlot(idx)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          삭제
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            <p className="text-xs text-gray-500">
              저장을 누르면 일정 변경사항이 반영됩니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-orange-600" />
              이미지
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>현재 썸네일</Label>
              {initialThumbnail ? (
                <div className="relative w-full max-w-[320px] aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <Image src={initialThumbnail} alt="" fill className="object-cover" unoptimized />
                </div>
              ) : (
                <p className="text-sm text-gray-500">등록된 썸네일이 없습니다.</p>
              )}
              <Label className="mt-3 block">새 썸네일 업로드 (선택)</Label>
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
                <div className="relative w-full max-w-[320px] aspect-video rounded-lg overflow-hidden bg-gray-100">
                  {thumbnailUpload.files[0].status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
                      업로드 중…
                    </div>
                  )}
                  <Image src={thumbnailUpload.files[0].previewUrl} alt="" fill className="object-cover" unoptimized />
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
              <Label>현재 활동 이미지</Label>
              {initialAdditionalImages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {initialAdditionalImages.slice(0, 8).map((src, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                      <Image src={src} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">등록된 활동 이미지가 없습니다.</p>
              )}

              <Label className="mt-3 block">새 활동 이미지 업로드 (선택, 최대 8장)</Label>
              <div className="flex flex-wrap gap-2">
                {activityUpload.files.map((f) => (
                  <div key={f.id} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {f.status === "uploading" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs">
                        업로드 중
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
              <p className="text-xs text-gray-500">
                새 이미지를 업로드하면 업로드한 이미지로 교체됩니다(업로드하지 않으면 기존 유지).
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={handleSave}
          disabled={!canSave || saving || updateMutation.isPending}
        >
          {saving || updateMutation.isPending ? "저장 중..." : "수정사항 저장"}
        </Button>
      </div>
    </div>
  );
}

