export const TALLY_FORM_ID = "9q8l55";
export const TALLY_FORM_URL = "https://tally.so/r/9q8l55";
export const CONTACT_EMAIL = "hello@thethinkingarchitects.com.ng";

declare global {
  interface Window {
    Tally?: {
      openPopup: (formId: string, options?: Record<string, unknown>) => void;
    };
  }
}

export function triggerTallyPopup(fallback?: () => void) {
  if (typeof window !== "undefined" && window.Tally?.openPopup) {
    window.Tally.openPopup(TALLY_FORM_ID, {
      layout: "modal",
      emoji: { text: "👋", animation: "wave" },
    });
    return;
  }

  if (fallback) {
    fallback();
    return;
  }

  if (typeof window !== "undefined") {
    window.location.assign(TALLY_FORM_URL);
  }
}
