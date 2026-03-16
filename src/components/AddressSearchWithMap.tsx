"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { searchAddress, type AddressSearchResult } from "@/lib/addressSearch";
import { MapPin } from "lucide-react";

export type AddressValue = {
  address: string;
  detailedLocation: string;
  latitude: number | null;
  longitude: number | null;
};

type AddressSearchWithMapProps = {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  /** 지도 미리보기 영역 높이 */
  mapHeight?: number;
  className?: string;
};

/**
 * 주소 검색 + 지도 미리보기
 *
 * 지도 API 연동 방법:
 * 1. 주소 검색: onSearchAddress prop으로 검색 함수 전달하거나, src/lib/addressSearch.ts 의 searchAddress() 구현
 * 2. 지도: NEXT_PUBLIC_FRONTEND_FORGE_API_KEY 설정 시 MapView 자동 표시. 또는 아래 MapPreview 영역을 카카오/네이버 지도 컴포넌트로 교체
 */
export function AddressSearchWithMap({
  value,
  onChange,
  mapHeight = 200,
  className,
}: AddressSearchWithMapProps) {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<AddressSearchResult[]>([]);

  const handleSearch = async () => {
    const q = value.address.trim();
    if (!q) {
      toast.error("주소를 입력해 주세요.");
      return;
    }
    setSearching(true);
    try {
      const list = await searchAddress(q);
      setResults(list);
      const first = list[0];
      if (!first) {
        toast.error("주소를 찾을 수 없습니다.");
        return;
      }
      onChange({
        ...value,
        address: first.roadAddress ?? first.address,
        latitude: first.latitude,
        longitude: first.longitude,
      });
      toast.success("주소가 설정되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "주소 검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  };

  const hasCoords = value.latitude != null && value.longitude != null;
  const mapCenter = hasCoords
    ? { lat: value.latitude!, lng: value.longitude! }
    : { lat: 37.5665, lng: 126.978 };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label>주소</Label>
        <div className="flex gap-2">
          <Input
            placeholder="예: 서울시 강남구 테헤란로"
            value={value.address}
            onChange={(e) =>
              onChange({
                ...value,
                address: e.target.value,
              })
            }
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
          />
          <Button type="button" onClick={handleSearch} disabled={searching}>
            {searching ? "검색 중..." : "검색"}
          </Button>
        </div>
      </div>

      {results.length > 0 && (
        <ul className="border rounded-lg divide-y max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                onClick={() =>
                  onChange({
                    ...value,
                    address: r.roadAddress ?? r.address,
                    latitude: r.latitude,
                    longitude: r.longitude,
                  })
                }
              >
                <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                <span>{r.roadAddress ?? r.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Label>상세 위치 설명 (선택)</Label>
        <Input
          placeholder="예: 1층 정문 앞, 주차장 옆"
          value={value.detailedLocation}
          onChange={(e) => onChange({ ...value, detailedLocation: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>지도 미리보기</Label>
        <MapPreview
          center={mapCenter}
          height={mapHeight}
          hasLocation={hasCoords}
          addressText={value.address}
          onLocationResolved={(loc) => {
            onChange({
              ...value,
              address: loc.addressName ?? value.address,
              latitude: loc.lat,
              longitude: loc.lng,
            });
          }}
        />
      </div>
    </div>
  );
}

/**
 * 지도 미리보기
 * - API 키가 있으면 MapView 사용 (Google Maps)
 * - 없거나 로드 실패 시 정적 이미지 또는 플레이스홀더
 * 카카오/네이버 연동 시 이 컴포넌트만 해당 지도 컴포넌트로 교체하면 됨
 */
function MapPreview({
  center,
  height,
  hasLocation,
  addressText,
  onLocationResolved,
}: {
  center: { lat: number; lng: number };
  height: number;
  hasLocation: boolean;
  addressText: string;
  onLocationResolved?: (loc: { lat: number; lng: number; addressName?: string }) => void;
}) {
  const kakaoKey =
    typeof process !== "undefined" && !!process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

  const [MapView, setMapView] = useState<React.ComponentType<{
    className?: string;
    initialCenter?: { lat: number; lng: number };
    initialZoom?: number;
    addressQuery?: string;
    showMarker?: boolean;
    onMapReady?: (map: unknown) => void;
    onError?: (error: unknown) => void;
    onLocationResolved?: (loc: { lat: number; lng: number; addressName?: string }) => void;
  }> | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!kakaoKey || mapError) return;
    import("@/components/Map")
      .then((m) => setMapView(() => m.MapView))
      .catch(() => setMapError(true));
  }, [kakaoKey, mapError]);

  const canShowMap = kakaoKey && MapView && (hasLocation || !!addressText.trim());
  const showLiveMap = canShowMap && !mapError;

  return (
    <div
      className="rounded-lg border bg-gray-100 overflow-hidden flex items-center justify-center"
      style={{ minHeight: height }}
    >
      {showLiveMap ? (
        <div className="w-full" style={{ height: `${height}px` }}>
          <MapView
            className="w-full h-full"
            initialCenter={center}
            initialZoom={15}
            addressQuery={!hasLocation ? addressText : undefined}
            showMarker={hasLocation || !!addressText.trim()}
            onError={() => setMapError(true)}
            onLocationResolved={onLocationResolved}
          />
        </div>
      ) : (
        <div className="p-4 text-center text-sm text-gray-500 w-full">
          {mapError ? (
            <>
              <p className="font-medium text-gray-700 mb-1">지도를 불러올 수 없습니다</p>
              <p className="text-xs mt-1">
                카카오 지도 설정을 확인해 주세요. (도메인 등록 / API 키)
              </p>
              {hasLocation && (
                <p className="text-xs mt-2">
                  좌표: {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
                </p>
              )}
            </>
          ) : hasLocation ? (
            <>
              <p className="font-medium text-gray-700 mb-1">📍 {addressText}</p>
              <p className="text-xs">
                좌표: {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
              </p>
              <p className="text-xs mt-2">
                카카오 지도 API 키를 설정하면 여기에 지도가 표시됩니다.
              </p>
            </>
          ) : (
            <p>주소를 검색해 선택하면 지도가 표시됩니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
