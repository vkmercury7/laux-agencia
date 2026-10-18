/**
 * Analytics event scaffolding for future Google Analytics 4 / Meta Pixel integrations.
 * No tracking IDs are declared and no cookies are set: events are queued locally in
 * window.dataLayer so a future consented integration can forward them. Opening a
 * WhatsApp conversation is tracked as click_whatsapp only — it does not prove a lead
 * was actually received (see click_whatsapp vs complete_diagnosis).
 */

export type LauxEvent =
  | "page_view"
  | "click_whatsapp"
  | "click_diagnostico_cta"
  | "start_diagnosis"
  | "complete_diagnosis"
  | "select_ad_budget"
  | "view_pricing"
  | "click_contract";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackEvent(event: LauxEvent, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...params, timestamp: Date.now() });
}

export function trackPageView(path: string) {
  trackEvent("page_view", { page_path: path });
}
