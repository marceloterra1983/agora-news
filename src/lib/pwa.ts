type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
let initialized = false;

function emit() {
  for (const fn of listeners) fn();
}

export function initPwa() {
  if (typeof window === "undefined") return;
  if (initialized) return;
  initialized = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });

  if (!("serviceWorker" in navigator)) return;
  // Prod only: a fetch-caching SW once served HTML as CSS.
  // This worker has no fetch handler — notifications only.
  if (!import.meta.env.PROD) return;
  void navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .then((reg) => {
      void reg.update();
    })
    .catch(() => {});
}

export function subscribePwa(fn: () => void) {
  initPwa();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function canPromptInstall() {
  return Boolean(deferred);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export async function promptInstall() {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  emit();
  return outcome === "accepted";
}
