/** CSS no <head> — o publicado não pode depender só de /assets/*.css.
 * Viewport (phone-shell): width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no
 * — pinch-zoom livre, sem trava de escala. */
export const CRITICAL_CSS = `
:root{--color-paper:#f2eee4;--color-paper-2:#e7e1d3;--color-ink:#161411;--color-mute:#686257;--color-line:#d5cfbf;--color-card:#faf7f0}
html.dark{--color-paper:#12100e;--color-paper-2:#1c1916;--color-ink:#f0e9e0;--color-mute:#9a9286;--color-line:#2c2824;--color-card:#1a1714}
html,body{margin:0;width:100%;max-width:100%;overflow-x:clip;overflow-wrap:break-word;background:var(--color-paper);color:var(--color-ink);font-family:"Source Sans 3",system-ui,sans-serif;-webkit-text-size-adjust:100%;text-size-adjust:100%}
a{color:inherit;text-decoration:none}
[data-chrome=compact]{position:sticky;top:0;z-index:40;border-bottom:1px solid var(--color-line);background:var(--color-paper)}
[data-chrome=compact] .row{display:flex;align-items:center;gap:12px;padding:12px 16px;max-width:42rem;margin:0 auto}
[data-chrome=compact] .pill{display:inline-flex;height:44px;align-items:center;border-radius:999px;background:var(--color-ink);color:var(--color-paper);padding:0 16px;font-size:14px;font-weight:600}
[data-section-switch]{display:inline-flex;height:44px;align-items:center;border-radius:999px;background:var(--color-paper-2);padding:2px;flex-shrink:0}
[data-theme-switch]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px;border-radius:999px;background:var(--color-paper-2);padding:2px}
[data-chrome=tabs]{position:fixed;left:0;right:0;bottom:0;z-index:40;border-top:1px solid var(--color-line);background:var(--color-paper)}
[data-chrome=tabs] a{display:flex;min-width:44px;min-height:44px;flex-direction:column;align-items:center;justify-content:center;font-size:12px;gap:2px}
a[data-cta=open-x]{display:grid;place-items:center;width:44px;height:44px;padding:0;border-radius:999px;border:1px solid var(--color-line);background:transparent;color:var(--color-ink)}
[data-story]{border-bottom:1px solid var(--color-line);padding:24px 16px;max-width:min(42rem,100%);margin:0 auto;overflow-wrap:anywhere}
[data-story] h2,[data-story] h2 a{font-family:var(--font-display,Georgia),serif;font-size:1.25rem;line-height:1.35;font-weight:500;margin:0;text-align:left;overflow-wrap:anywhere}
[data-story] p{color:var(--color-mute);font-size:14px;margin:0 0 8px}
[data-post]{max-width:min(48rem,100%);margin:0 auto;overflow-wrap:anywhere}
[data-post] h1{font-family:var(--font-display,Georgia),serif;font-size:1.4rem;line-height:1.35;font-weight:500;letter-spacing:-0.01em;margin:12px 0 0;text-align:left;text-wrap:pretty}
[data-post] p{font-size:1.05rem;line-height:1.6;margin:16px 0 0}
`;
