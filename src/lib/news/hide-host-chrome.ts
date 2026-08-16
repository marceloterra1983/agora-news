/**
 * Remove a faixa "Created with Grok / Remix" do host Grok.
 * Estratégia agressiva: texto + position fixed/sticky + heurística de rodapé.
 */

const HIDE_CSS = `
/* candidatos conhecidos */
[data-grok-chrome],
[data-testid*="grok" i],
[class*="GrokBadge" i],
[class*="grok-badge" i],
[class*="CreatedWithGrok" i],
[class*="created-with-grok" i],
a[href*="grok.com/remix" i],
a[href*="/remix" i] {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
  height: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  opacity: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* se o host marca o body */
body[data-grok-preview] [data-grok-chrome] {
  display: none !important;
}
`;

function hideEl(el: HTMLElement) {
  el.style.setProperty("display", "none", "important");
  el.style.setProperty("visibility", "hidden", "important");
  el.style.setProperty("pointer-events", "none", "important");
  el.style.setProperty("height", "0", "important");
  el.style.setProperty("max-height", "0", "important");
  el.style.setProperty("opacity", "0", "important");
  el.style.setProperty("overflow", "hidden", "important");
  el.setAttribute("data-agora-hidden-host", "1");
  // sobe até 3 níveis se o pai também for a faixa fixa
  let p: HTMLElement | null = el.parentElement;
  for (let i = 0; i < 3 && p; i++) {
    const t = (p.textContent || "").replace(/\s+/g, " ").trim();
    const st = window.getComputedStyle(p);
    const isOverlay =
      (st.position === "fixed" || st.position === "sticky") &&
      /created with grok/i.test(t) &&
      t.length < 120;
    if (isOverlay) hideEl(p);
    p = p.parentElement;
  }
}

function scan() {
  if (typeof document === "undefined") return;

  // 1) âncoras Remix / grok
  document.querySelectorAll('a[href*="remix" i], a[href*="grok.com" i]').forEach((a) => {
    const el = a as HTMLElement;
    const block = el.closest("div, footer, section, aside, nav") as HTMLElement | null;
    if (block && /created with grok|\bremix\b/i.test(block.textContent || "")) {
      hideEl(block);
    } else {
      hideEl(el);
    }
  });

  // 2) qualquer fixed/sticky no rodapé com o texto
  const all = document.body?.querySelectorAll("div, footer, section, aside, nav, span, p") ?? [];
  for (const node of Array.from(all)) {
    const el = node as HTMLElement;
    if (el.getAttribute("data-agora-hidden-host") === "1") continue;
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text || text.length > 100) continue;
    if (!/created with grok/i.test(text)) continue;
    if (!/\bremix\b/i.test(text) && text.length > 40) continue;

    const st = window.getComputedStyle(el);
    const fixed = st.position === "fixed" || st.position === "sticky";
    const rect = el.getBoundingClientRect();
    const nearBottom = rect.bottom > window.innerHeight - 120;
    const nearTop = rect.top < 80;
    // faixa típica: barra fina no topo ou rodapé
    if (fixed || nearBottom || nearTop || rect.height < 72) {
      hideEl(el);
    }
  }
}

export function installHideHostChrome() {
  if (typeof document === "undefined") return () => {};

  if (!document.getElementById("agora-hide-host-chrome")) {
    const style = document.createElement("style");
    style.id = "agora-hide-host-chrome";
    style.textContent = HIDE_CSS;
    document.head.appendChild(style);
  }

  scan();

  const obs = new MutationObserver(() => {
    // debounce leve
    window.clearTimeout((installHideHostChrome as unknown as { _t?: number })._t);
    (installHideHostChrome as unknown as { _t?: number })._t = window.setTimeout(scan, 80);
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  const timers = [300, 800, 1500, 3000].map((ms) => window.setTimeout(scan, ms));

  // re-scan ao voltar para o app (PWA)
  const onVis = () => {
    if (document.visibilityState === "visible") scan();
  };
  document.addEventListener("visibilitychange", onVis);

  return () => {
    obs.disconnect();
    timers.forEach((t) => window.clearTimeout(t));
    document.removeEventListener("visibilitychange", onVis);
  };
}
