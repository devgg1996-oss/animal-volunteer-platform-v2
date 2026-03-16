/**
 * 주소 검색 API 연동용 타입 및 스텁
 *
 * 실제 연동 시 아래 중 하나로 구현하면 됩니다.
 * - 카카오 주소 검색: https://postcode.map.daum.net/guide
 * - 네이버 지도 주소 검색: Geocoder API
 * - Google Maps Geocoding API (Map.tsx 주석 참고)
 */

export type AddressSearchResult = {
  address: string;
  roadAddress?: string;
  jibunAddress?: string;
  latitude: number;
  longitude: number;
};

/**
 * 주소 검색 (지도 API 연동 시 여기 구현)
 *
 * 예: 카카오
 *   window.daum.Postcode({ ... }).open({ oncomplete: (data) => { ... } });
 *
 * 예: Google Geocoder (Map.tsx 로드 후)
 *   const geocoder = new google.maps.Geocoder();
 *   geocoder.geocode({ address: query }, (results, status) => { ... });
 */
export async function searchAddress(
  query: string
): Promise<AddressSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  if (typeof window === "undefined") return [];

  const { loadKakaoMap, ensureKakaoServicesLoaded } = await import("@/lib/kakaoMap");
  const kakao = await loadKakaoMap({ libraries: ["services"] });
  await ensureKakaoServicesLoaded();

  return await new Promise<AddressSearchResult[]>((resolve) => {
    let finished = false;
    const finish = (results: AddressSearchResult[]) => {
      if (finished) return;
      finished = true;
      resolve(results);
    };

    // 안전장치: 4초 안에 응답이 없으면 비어있는 결과로 종료
    const timeoutId = window.setTimeout(() => {
      console.warn("Kakao addressSearch timeout");
      finish([]);
    }, 4000);

    if (!kakao?.maps?.services?.Geocoder) {
      console.warn("Kakao maps services.Geocoder is not available");
      window.clearTimeout(timeoutId);
      finish([]);
      return;
    }
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(q, (results: any[], status: string) => {
      window.clearTimeout(timeoutId);
      if (status !== kakao.maps.services.Status.OK || !Array.isArray(results)) {
        finish([]);
        return;
      }
      const mapped: AddressSearchResult[] = [];
      for (const r of results) {
        const lat = parseFloat(r?.y);
        const lng = parseFloat(r?.x);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        mapped.push({
          address: String(r?.address_name ?? ""),
          roadAddress: r?.road_address?.address_name ? String(r.road_address.address_name) : undefined,
          jibunAddress: r?.address?.address_name ? String(r.address.address_name) : undefined,
          latitude: lat,
          longitude: lng,
        });
      }
      finish(mapped);
    });
  });
}
