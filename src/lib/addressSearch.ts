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
  _query: string
): Promise<AddressSearchResult[]> {
  // TODO: 지도 API 연동 시 이 함수에서 실제 검색 후 결과 반환
  // return await kakaoSearchAddress(query);
  // return await naverSearchAddress(query);
  // return await googleGeocode(query);
  return [];
}
