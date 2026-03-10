"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { searchAddress, type AddressSearchResult } from "@/lib/addressSearch";
import { cn } from "@/lib/utils";

export type AddressValue = {
  address: string;
  detailedLocation: string;
  latitude: number | null;
  longitude: number | null;
};

type AddressSearchWithMapProps = {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  /** 주소 검색 시 사용할 함수. 기본값은 @/lib/addressSearch.searchAddress (연동 전에는 빈 배열 반환) */
  onSearchAddress?: (query: string) => Promise<AddressSearchResult[]>;
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
  onSearchAddress = searchAddress,
  mapHeight = 200,
  className,
}: AddressSearchWithMapProps) {
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    const query = value.address.trim();
    if (!query) return;
    setSearching(true);
    setResults([]);
    try {
      const list = await onSearchAddress(query);
      setResults(list);
    } finally {
      setSearching(false);
    }
  }, [onSearchAddress, value.address]);

  const selectResult = useCallback(
    (r: AddressSearchResult) => {
      onChange({
        ...value,
        address: r.roadAddress ?? r.address,
        latitude: r.latitude,
        longitude: r.longitude,
      });
      setResults([]);
    },
    [value, onChange]
  );

  const hasCoords = value.latitude != null && value.longitude != null;
  const mapCenter = hasCoords
    ? { lat: value.latitude!, lng: value.longitude! }
    : { lat: 37.5665, lng: 126.978 };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label>주소 검색</Label>
        <div className="flex gap-2">
          <Input
            placeholder="주소를 입력한 뒤 검색"
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
          />
          <Button type="button" variant="outline" onClick={handleSearch} disabled={searching}>
            {searching ? "검색 중..." : "주소 검색"}
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
                onClick={() => selectResult(r)}
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
}: {
  center: { lat: number; lng: number };
  height: number;
  hasLocation: boolean;
  addressText: string;
}) {
  const forgeKey =
    typeof process !== "undefined" && !!process.env.NEXT_PUBLIC_FRONTEND_FORGE_API_KEY;

  const [MapView, setMapView] = useState<React.ComponentType<{
    className?: string;
    initialCenter?: { lat: number; lng: number };
    initialZoom?: number;
    onMapReady?: (map: unknown) => void;
  }> | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!forgeKey || mapError) return;
    import("@/components/Map")
      .then((m) => setMapView(() => m.MapView))
      .catch(() => setMapError(true));
  }, [forgeKey, mapError]);

  const showLiveMap = forgeKey && MapView && hasLocation;

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
          />
        </div>
      ) : (
        <div className="p-4 text-center text-sm text-gray-500 w-full">
          {hasLocation ? (
            <>
              <p className="font-medium text-gray-700 mb-1">📍 {addressText}</p>
              <p className="text-xs">
                좌표: {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
              </p>
              <p className="text-xs mt-2">
                지도 API 키를 설정하면 여기에 지도가 표시됩니다.
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
