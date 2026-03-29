import { NextResponse, type NextRequest } from "next/server";

const APP_RUNTIME_VERSION = "2026-03-30-mobile-sync-1";

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  response.headers.set("x-playnix-app-version", APP_RUNTIME_VERSION);

  if (!isStaticAsset(pathname)) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");
  }

  return response;
}

export const config = {
  matcher: "/:path*",
};
