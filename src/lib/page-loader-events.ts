export const PAGE_LOADER_START_EVENT = "playnix:page-loader-start";

export function triggerPageLoader() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(PAGE_LOADER_START_EVENT));
}
