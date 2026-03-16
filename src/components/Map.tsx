import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ensureKakaoServicesLoaded, loadKakaoMap } from "@/lib/kakaoMap";

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  addressQuery?: string;
  showMarker?: boolean;
  onMapReady?: (map: unknown) => void;
  onError?: (error: unknown) => void;
  onLocationResolved?: (loc: { lat: number; lng: number; addressName?: string }) => void;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// 카카오 level: 1(가까움) ~ 14(멀리). Google zoom과 1:1이 아니라서 "대략" 매핑.
function zoomToKakaoLevel(zoom: number) {
  // zoom 15 -> level 1, zoom 12 -> level 4, zoom 8 -> level 8 근처
  const level = Math.round(16 - zoom);
  return clamp(level, 1, 14);
}

function createDefaultMarkerImage(kakao: any) {
  // 주황색 핀(SVG) - 배달앱 느낌으로 통일
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="44" viewBox="0 0 40 44">
  <path d="M20 43c8-12 14-20 14-28C34 6.7 27.7 0 20 0S6 6.7 6 15c0 8 6 16 14 28z" fill="#F97316"/>
  <circle cx="20" cy="15" r="6.5" fill="#ffffff"/>
  </svg>`;
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  const imageSize = new kakao.maps.Size(28, 32);
  const imageOption = { offset: new kakao.maps.Point(14, 32) };
  return new kakao.maps.MarkerImage(url, imageSize, imageOption);
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  addressQuery,
  showMarker = true,
  onMapReady,
  onError,
  onLocationResolved,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any | null>(null);
  const marker = useRef<any | null>(null);
  const geocoder = useRef<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const kakao = await loadKakaoMap();
      if (cancelled) return;
      if (!mapContainer.current) return;

      const center = new kakao.maps.LatLng(initialCenter.lat, initialCenter.lng);
      map.current = new kakao.maps.Map(mapContainer.current, {
        center,
        level: zoomToKakaoLevel(initialZoom),
      });

      await ensureKakaoServicesLoaded();
      if (kakao.maps.services && kakao.maps.services.Geocoder) {
        geocoder.current = new kakao.maps.services.Geocoder();
      } else {
        console.warn("Kakao maps services.Geocoder is not available");
        geocoder.current = null;
      }

      if (showMarker) {
        marker.current = new kakao.maps.Marker({
          position: center,
          image: createDefaultMarkerImage(kakao),
        });
        marker.current.setMap(map.current);
      }

      onMapReady?.(map.current);
    })().catch((e) => {
      // 지도 로드 실패 시: MapPreview가 fallback 처리
      console.error("Kakao map failed to initialize", e);
      onError?.(e);
    });
    return () => {
      cancelled = true;
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom, onMapReady, showMarker, onError]);

  useEffect(() => {
    if (!map.current || !window.kakao?.maps) return;
    const kakao = window.kakao;
    const center = new kakao.maps.LatLng(initialCenter.lat, initialCenter.lng);
    map.current.setCenter(center);
    map.current.setLevel(zoomToKakaoLevel(initialZoom));
    if (marker.current) marker.current.setPosition(center);
    if (showMarker && !marker.current) {
      marker.current = new kakao.maps.Marker({
        position: center,
        image: createDefaultMarkerImage(kakao),
      });
      marker.current.setMap(map.current);
    }
    if (!showMarker && marker.current) {
      marker.current.setMap(null);
      marker.current = null;
    }
  }, [initialCenter.lat, initialCenter.lng, initialZoom, showMarker]);

  useEffect(() => {
    const q = addressQuery?.trim();
    if (!q) return;
    if (!map.current || !window.kakao?.maps || !geocoder.current) return;
    const kakao = window.kakao;

    geocoder.current.addressSearch(q, (results: any[], status: string) => {
      if (status !== kakao.maps.services.Status.OK || !Array.isArray(results) || !results[0]) {
        // 주소 검색 실패는 치명적 에러가 아니므로 지도 fallback으로 전환하지 않는다.
        console.warn("Kakao geocoder: 주소로 위치를 찾을 수 없습니다.", q);
        return;
      }
      const lat = parseFloat(results[0]?.y);
      const lng = parseFloat(results[0]?.x);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn("Kakao geocoder: 주소 좌표 변환에 실패했습니다.", results[0]);
        return;
      }
      const center = new kakao.maps.LatLng(lat, lng);
      map.current.setCenter(center);
      if (showMarker) {
        if (!marker.current) {
          marker.current = new kakao.maps.Marker({
            position: center,
            image: createDefaultMarkerImage(kakao),
          });
          marker.current.setMap(map.current);
        } else {
          marker.current.setPosition(center);
        }
      }
      const addrName = results[0]?.address_name as string | undefined;
      if (addrName) {
        onLocationResolved?.({ lat, lng, addressName: addrName });
      } else {
        onLocationResolved?.({ lat, lng });
      }
    });
  }, [addressQuery, showMarker, onError, onLocationResolved]);

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}
