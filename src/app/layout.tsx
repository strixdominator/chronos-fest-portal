import React, { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "MILAN 2026 | College Event Registration & Digital QR Pass",
  description: "Official Alumni Entry Portal for Milan 2026. Secure instant verification via University Seat Number (USN) and OTP confirmation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <main style={{ minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
