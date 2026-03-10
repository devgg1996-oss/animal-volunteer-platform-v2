"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

const BOTTOM_NAV_PATHS = ["/", "/search", "/mypage"];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showBottomNav = BOTTOM_NAV_PATHS.some((p) => p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <>
      {children}
      {showBottomNav && <BottomNav />}
    </>
  );
}
