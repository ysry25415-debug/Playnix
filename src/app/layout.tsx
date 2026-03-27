import type { Metadata } from "next";

import "../../styles/playnix-theme.css";
import "./globals.css";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "BEN10 | Gaming Marketplace",
  description:
    "BEN10 is a premium Omnitrix-inspired gaming marketplace for accounts, currency, boosting, items, top ups, and gift cards.",
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
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
