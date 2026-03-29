"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { PAGE_LOADER_START_EVENT } from "@/lib/page-loader-events";

const MINIMUM_VISIBLE_MS = 1000;

export function GlobalRouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => {
    const query = searchParams?.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const [isVisible, setIsVisible] = useState(false);
  const hasMountedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (!isVisible || startedAtRef.current === null) {
      return;
    }

    const elapsed = performance.now() - startedAtRef.current;
    const delay = Math.max(0, MINIMUM_VISIBLE_MS - elapsed);

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      startedAtRef.current = null;
    }, delay);
  }, [isVisible, routeKey]);

  useEffect(() => {
    function startLoader() {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }

      startedAtRef.current = performance.now();
      setIsVisible(true);
    }

    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      if (anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }

      if (
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search &&
        nextUrl.hash === currentUrl.hash
      ) {
        return;
      }

      startLoader();
    }

    function handlePopState() {
      startLoader();
    }

    function handleManualStart() {
      startLoader();
    }

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener(PAGE_LOADER_START_EVENT, handleManualStart);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener(PAGE_LOADER_START_EVENT, handleManualStart);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <PageLoader
      label="Opening the next screen..."
      hint="BEN10 is loading the next page for you."
    />
  );
}
