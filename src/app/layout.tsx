import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import "../../styles/playnix-theme.css";
import "./globals.css";

import { GlobalRouteLoader } from "@/components/layout/global-route-loader";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "BEN10 | Gaming Marketplace",
  description:
    "BEN10 is a premium Omnitrix-inspired gaming marketplace for accounts, currency, boosting, items, top ups, and gift cards.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020307",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="background-frame" />
        <Suspense fallback={null}>
          <GlobalRouteLoader />
        </Suspense>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
