import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Video Studio — 아이디어를 영상으로",
  description: "프롬프트 설계부터 안전한 AI 영상 생성과 프로젝트 관리까지 한곳에서.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "AI Video Studio",
    description: "아이디어를 고품질 AI 영상으로 만드는 안전한 제작 작업 공간",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
