/**
 * Tenta esconder a faixa "Created with Grok / Remix" injetada pelo host.
 * Se o elemento estiver fora do DOM do app (chrome do platform), não alcança.
 * No PWA instalado (display-mode: standalone) essa faixa costuma já sumir.
 */

const HIDE_CSS = `
[data-grok-chrome],
[data-testid*="grok-badge" i],
[class*="GrokBadge"],
[class*="grok-badge"],
[class*="CreatedWithGrok"],
a[href*="grok.com/remix"],
button[aria-label*="Remix" i] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  height: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  opacity: 0 !important;
}
`;

function looksLikeHostChrome(el: Element): boolean {
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  if (!text) return false;
  const hasCreated = /created with grok/i.test(text);
  const hasRemix = /\bremix\b/i.test(text);
  if (!(hasCreated || (hasRemix && text.length < 80))) return false;
  // faixa tipicamente fixa no rodapé/topo
  const style = window.getComputedStyle(el);
  const pos = style.position;
  if (pos !== "fixed" && pos !== "sticky" && pos !== "absolute") {
    // ainda pode ser o container interno — sobe 1 nível
    const parent = el.parentElement;
    if (!parent) return hasCreated && hasRemix;
    const ps = window.getComputedStyle(parent);
    if (ps.position !== "fixed" && ps.position !== "sticky") {
      return hasCreated && hasRemix && text.length < 60;
    }
  }
  return true;
}

function hideMatches(root: ParentNode = document) {
  const candidates = root.querySelectorAll
    ? root.querySelectorAll("div, footer, section, aside, nav")
    : [];
  for (const el of Array.from(candidates)) {
    if (!looksLikeHostChrome(el)) continue;
    const target = el as HTMLElement;
    target.style.setProperty("display", "none", "important");
    target.style.setProperty("visibility", "hidden", "important");
    target.style.setProperty("pointer-events", "none", "important");
    target.setAttribute("data-agora-hidden-host", "1");
  }
}

export function installHideHostChrome() {
  if (typeof document === "undefined") return () => {};

  // CSS de cobertura
  if (!document.getElementById("agora-hide-host-chrome")) {
    const style = document.createElement("style");
    style.id = "agora-hide-host-chrome";
    style.textContent = HIDE_CSS;
    document.head.appendChild(style);
  }

  hideMatches();

  const obs = new MutationObserver(() => hideMatches());
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // algumas injeções atrasam
  const t1 = window.setTimeout(() => hideMatches(), 500);
  const t2 = window.setTimeout(() => hideMatches(), 2000);

  return () => {
    obs.disconnect();
    window.clearTimeout(t1);
    window.clearTimeout(t2);
  };
}
