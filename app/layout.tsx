import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "AI Video Studio — 고품질 AI 영상 제작";
const description = "아이디어부터 스토리보드, 프롬프트, 품질 검수와 내보내기까지 한곳에서 관리하는 한국어 AI 영상 스튜디오";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;

  return {
    title,
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title, description, images: [{ url: image, width: 1672, height: 941 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
