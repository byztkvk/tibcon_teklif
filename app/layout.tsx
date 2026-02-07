import "./globals.css";
import type { Metadata, Viewport } from "next";
import AuthGate from "./components/AuthGate";

export const metadata: Metadata = {
  title: "Tibcon Teklif",
  description: "Teklif sistemi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tibcon Teklif",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#e30613",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
