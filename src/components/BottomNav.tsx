"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "홈", icon: Home },
  { href: "/search", label: "검색", icon: Search },
  { href: "/mypage", label: "마이페이지", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
      <div className="max-w-2xl mx-auto flex items-center justify-around h-14">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs transition-colors",
              isActive(href)
                ? "text-orange-600 font-medium"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="w-6 h-6" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
