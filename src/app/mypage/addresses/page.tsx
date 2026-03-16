"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Plus, Star } from "lucide-react";

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AddressSearchWithMap,
  type AddressValue,
} from "@/components/AddressSearchWithMap";

type Editing = {
  id?: number;
  name: string;
  address: AddressValue;
  isDefault: boolean;
};

const EMPTY_ADDRESS: AddressValue = {
  address: "",
  detailedLocation: "",
  latitude: null,
  longitude: null,
};

export default function AddressManagePage() {
  const router = useRouter();
  useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const { data: locations = [], isLoading } = trpc.userLocation.listMy.useQuery();

  const defaultLocation = useMemo(
    () => locations.find((l) => l.isDefault) ?? null,
    [locations]
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Editing>({
    name: "",
    address: EMPTY_ADDRESS,
    isDefault: false,
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const upsertMutation = trpc.userLocation.upsert.useMutation({
    onSuccess: async () => {
      toast.success("주소가 저장되었습니다.");
      setDialogOpen(false);
      await utils.userLocation.listMy.invalidate();
      await utils.userLocation.getDefault.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.userLocation.delete.useMutation({
    onSuccess: async () => {
      toast.success("주소가 삭제되었습니다.");
      setDeleteId(null);
      await utils.userLocation.listMy.invalidate();
      await utils.userLocation.getDefault.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const setDefaultMutation = trpc.userLocation.setDefault.useMutation({
    onSuccess: async () => {
      toast.success("기본 주소가 변경되었습니다.");
      await utils.userLocation.listMy.invalidate();
      await utils.userLocation.getDefault.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing({
      name: "",
      address: EMPTY_ADDRESS,
      isDefault: locations.length === 0,
    });
    setDialogOpen(true);
  };

  const openEdit = (id: number) => {
    const l = locations.find((x) => x.id === id);
    if (!l) return;
    setEditing({
      id: l.id,
      name: l.name,
      address: {
        address: l.formattedAddress ?? l.address1 ?? "",
        detailedLocation: l.address2 ?? "",
        latitude: l.latitude,
        longitude: l.longitude,
      },
      isDefault: l.isDefault,
    });
    setDialogOpen(true);
  };

  const canSave = Boolean(editing.name.trim()) && Boolean(editing.address.address.trim());

  const handleSave = () => {
    if (!canSave) {
      toast.error("주소 이름과 주소를 입력해 주세요.");
      return;
    }
    upsertMutation.mutate({
      id: editing.id,
      name: editing.name.trim(),
      formattedAddress: editing.address.address.trim(),
      detailedLocation: editing.address.detailedLocation.trim() || undefined,
      latitude: editing.address.latitude,
      longitude: editing.address.longitude,
      isDefault: editing.isDefault || undefined,
    });
  };

  useEffect(() => {
    // 편집 창이 열릴 때 기본주소가 없으면 체크를 켜두기
    if (!dialogOpen) return;
    if (editing.id) return;
    if (!defaultLocation) return;
  }, [dialogOpen, editing.id, defaultLocation]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/mypage")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold">주소 관리</h1>
            <p className="text-sm text-gray-500 mt-1">
              여러 주소를 저장하고 기본 주소를 설정할 수 있어요.
            </p>
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" />
            추가
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : locations.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-gray-500">
              <MapPin className="w-10 h-10 mx-auto mb-3 text-orange-400" />
              <p className="font-medium text-gray-700">저장된 주소가 없습니다</p>
              <p className="text-sm mt-1">자주 쓰는 주소를 추가해 두세요.</p>
              <Button className="mt-4" onClick={openCreate}>
                주소 추가
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {locations.map((l) => (
              <Card key={l.id} className={l.isDefault ? "border-orange-200" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="truncate">{l.name}</span>
                        {l.isDefault && (
                          <Badge className="bg-orange-600 text-white">기본</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                        <MapPin className="w-4 h-4 shrink-0 text-orange-500" />
                        <span className="truncate">
                          {l.formattedAddress ?? l.address1 ?? "-"}
                        </span>
                      </p>
                      {l.address2 && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          상세: {l.address2}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {!l.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate({ id: l.id })}
                          disabled={setDefaultMutation.isPending}
                        >
                          <Star className="w-4 h-4 mr-1" />
                          기본설정
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openEdit(l.id)}>
                        수정
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(l.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing.id ? "주소 수정" : "주소 추가"}</DialogTitle>
            <DialogDescription>
              주소 이름(예: 집/회사)과 주소를 저장하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="addr-name">주소 이름</Label>
              <Input
                id="addr-name"
                placeholder="예: 집, 회사, 학교"
                value={editing.name}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                maxLength={50}
              />
            </div>

            <AddressSearchWithMap
              value={editing.address}
              onChange={(v) => setEditing((p) => ({ ...p, address: v }))}
              mapHeight={220}
            />

            <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">기본 주소로 설정</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  홈에서 기본으로 사용할 주소입니다.
                </p>
              </div>
              <Button
                type="button"
                variant={editing.isDefault ? "default" : "outline"}
                onClick={() =>
                  setEditing((p) => ({ ...p, isDefault: !p.isDefault }))
                }
              >
                {editing.isDefault ? "설정됨" : "설정"}
              </Button>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              닫기
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={upsertMutation.isPending || !canSave}
            >
              {upsertMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>주소를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 주소는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteId != null && deleteMutation.mutate({ id: deleteId })}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

