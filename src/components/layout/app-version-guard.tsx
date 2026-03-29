"use client";

import { useEffect } from "react";

const APP_RUNTIME_VERSION = "2026-03-30-mobile-sync-1";
const APP_VERSION_STORAGE_KEY = "playnix-app-runtime-version";
const APP_VERSION_RELOAD_FLAG = "playnix-app-version-reloaded";

export function AppVersionGuard() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentStoredVersion = window.localStorage.getItem(APP_VERSION_STORAGE_KEY);
    const hasReloadedForVersion =
      window.sessionStorage.getItem(APP_VERSION_RELOAD_FLAG) === APP_RUNTIME_VERSION;

    if (currentStoredVersion === APP_RUNTIME_VERSION) {
      return;
    }

    window.localStorage.setItem(APP_VERSION_STORAGE_KEY, APP_RUNTIME_VERSION);

    if (hasReloadedForVersion) {
      return;
    }

    window.sessionStorage.setItem(APP_VERSION_RELOAD_FLAG, APP_RUNTIME_VERSION);

    const resetAndReload = async () => {
      try {
        if ("caches" in window) {
          const cacheKeys = await window.caches.keys();
          await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
        }
      } catch {
        // Ignore cache API failures and continue with reload.
      }

      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("v", APP_RUNTIME_VERSION);
      window.location.replace(nextUrl.toString());
    };

    void resetAndReload();
  }, []);

  return null;
}
