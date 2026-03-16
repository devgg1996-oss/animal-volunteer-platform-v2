declare global {
  interface Window {
    kakao?: any;
  }
}

let kakaoLoading: Promise<any> | null = null;
let loadedLibrariesKey = "";
let servicesLoading: Promise<void> | null = null;

type KakaoLoadOptions = {
  libraries?: Array<"services" | "clusterer" | "drawing">;
};

function loadScript(src: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = src;

    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      fn();
    };

    const timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error(`Timed out loading script: ${src}`)));
    }, timeoutMs);

    script.onload = () => {
      window.clearTimeout(timeoutId);
      finish(resolve);
    };
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      finish(() => reject(new Error(`Failed to load script: ${src}`)));
    };

    document.head.appendChild(script);
  });
}

async function ensureKakaoServices(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.kakao?.maps?.services?.Geocoder) return;
  if (!window.kakao?.maps) return;

  if (!servicesLoading) {
    // Kakao services library (Geocoder 등)
    // NOTE: sdk.js가 이미 readyState=2인 경우 libraries=services로 sdk.js를 다시 로드해도 무시될 수 있어 직접 로드
    const url = "https://t1.daumcdn.net/mapjsapi/js/libs/services/1.0.2/services.js";
    servicesLoading = (async () => {
      await loadScript(url, 5000);

      // services.js는 로드 직후 등록되지만, 안전하게 짧게 폴링
      const start = Date.now();
      while (!window.kakao?.maps?.services?.Geocoder) {
        if (Date.now() - start > 2000) {
          throw new Error("Kakao services loaded but Geocoder is unavailable");
        }
        await new Promise((r) => setTimeout(r, 50));
      }
    })().catch((e) => {
      servicesLoading = null;
      throw e;
    });
  }

  return servicesLoading;
}

export async function loadKakaoMap(options?: KakaoLoadOptions): Promise<any> {
  if (typeof window === "undefined") throw new Error("Kakao map can only load in browser");
  const required = new Set(options?.libraries ?? []);
  const hasMaps = !!window.kakao?.maps;
  const hasServices = !!window.kakao?.maps?.services;
  const needServices = required.has("services");

  // 이미 로드되어 있고, 필요한 라이브러리(services)가 있으면 그대로 사용
  if (hasMaps && (!needServices || hasServices)) return window.kakao;

  // 이미 maps는 있는데 services가 없으면: services 포함 스크립트를 다시 로드 시도
  // (과거에 libraries 없이 로드된 경우를 복구)
  if (hasMaps && needServices && !hasServices) {
    // sdk.js 재로드는 무시될 수 있으니 services.js를 직접 보장
    await ensureKakaoServices();
    return window.kakao;
  }

  if (!kakaoLoading) {
    kakaoLoading = new Promise((resolve, reject) => {
      const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
      if (!appKey) {
        reject(new Error("NEXT_PUBLIC_KAKAO_MAP_APP_KEY is not set"));
        return;
      }

      // 라이브러리는 스크립트 로드 시점에 결정되므로, 누락 방지를 위해 기본으로 모두 포함
      // (원하면 options.libraries로 제한 가능)
      const libsArr = options?.libraries?.length
        ? Array.from(new Set(options.libraries))
        : (["services", "clusterer", "drawing"] as const);
      const libs = libsArr.join(",");
      loadedLibrariesKey = libs;
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=${encodeURIComponent(libs)}`;
      let finished = false;
      const finish = (fn: () => void) => {
        if (finished) return;
        finished = true;
        fn();
      };
      const timeoutId = window.setTimeout(() => {
        finish(() => reject(new Error("Timed out loading Kakao map script")));
      }, 5000);
      script.onload = () => {
        finish(() => {
          try {
            window.kakao.maps.load(() => {
              window.clearTimeout(timeoutId);
              resolve(window.kakao);
            });
          } catch (e) {
            window.clearTimeout(timeoutId);
            reject(e);
          }
        });
      };
      script.onerror = () => {
        window.clearTimeout(timeoutId);
        finish(() => reject(new Error("Failed to load Kakao map script")));
      };
      document.head.appendChild(script);
    });
  }

  const kakao = await kakaoLoading;
  if (needServices) {
    await ensureKakaoServices();
  }
  return kakao;
}

export function getLoadedKakaoLibrariesKey() {
  return loadedLibrariesKey;
}

export async function ensureKakaoServicesLoaded() {
  await ensureKakaoServices();
}

