import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppLayout } from "@/components/AppLayout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "동물 봉사 플랫폼 (Animal Volunteer Platform)",
  description: "동물 봉사 매칭 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
