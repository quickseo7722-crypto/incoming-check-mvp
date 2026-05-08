import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "進貨清點系統 MVP",
  description: "把供應商叫貨截圖轉成可清點任務的手機優先 Web App。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
