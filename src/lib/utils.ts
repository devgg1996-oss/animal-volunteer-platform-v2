import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 봉사 모집글 썸네일/활동 이미지 URL.
 * 로컬 업로드(/uploads/...)는 API 경로(/api/uploads/...)로 통일해 서빙 보장.
 */
export function getImageSrc(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  if (url.startsWith("/uploads/") && !url.startsWith("/api/uploads/")) {
    return `/api${url}`;
  }
  return url;
}
