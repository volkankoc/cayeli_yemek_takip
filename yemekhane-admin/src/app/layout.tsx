import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yemekhane Takip Sistemi",
  description: "Yemekhane yönetim ve takip paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${nunito.variable} ${geistMono.variable} antialiased`} style={{ fontFamily: 'var(--font-sans)' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
