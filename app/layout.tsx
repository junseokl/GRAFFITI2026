import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { NavBar } from "@/app/components/NavBar";

export const metadata: Metadata = {
  title: "GRAFFITI2026",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
