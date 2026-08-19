/** CSS no <head> — o publicado não pode depender só de /assets/*.css.
 * Viewport (phone-shell): width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no
 * — pinch-zoom livre, sem trava de escala. */
export const CRITICAL_CSS = `
html,body{margin:0;width:100%;max-width:100%;overflow-x:clip;overflow-wrap:break-word;background:#f2eee4;color:#161411;font-family:"Source Sans 3",system-ui,sans-serif;-webkit-text-size-adjust:100%;text-size-adjust:100%}
html.dark,html.dark body{background:#12100e;color:#f0e9e0}
a{color:inherit;text-decoration:none}
[data-chrome=compact]{position:sticky;top:0;z-index:40;border-bottom:1px solid #d5cfbf;background:#f2eee4}
html.dark [data-chrome=compact]{border-bottom-color:#2c2824;background:#12100e}
[data-chrome=compact] .row{display:flex;align-items:center;gap:12px;padding:12px 16px;max-width:42rem;margin:0 auto}
[data-chrome=compact] .pill{display:inline-flex;height:44px;align-items:center;border-radius:999px;background:#161411;color:#f2eee4;padding:0 16px;font-size:14px;font-weight:600}
[data-section-select]{-webkit-appearance:none;appearance:none;background-image:none}
html.dark [data-chrome=compact] .pill{background:#f0e9e0;color:#12100e}
[data-theme-toggle]{display:inline-flex;height:44px;align-items:center;gap:6px;border-radius:999px;border:1px solid #d5cfbf;background:#faf7f0;color:#161411;padding:0 12px;font-size:14px;font-weight:600;flex-shrink:0}
html.dark [data-theme-toggle]{border-color:#3d3832;background:#1a1714;color:#f0e9e0}
[data-chrome=tabs]{position:fixed;left:0;right:0;bottom:0;z-index:40;border-top:1px solid #d5cfbf;background:#f2eee4}
html.dark [data-chrome=tabs]{border-top-color:#2c2824;background:#12100e}
[data-chrome=tabs] a{display:flex;min-width:44px;min-height:44px;flex-direction:column;align-items:center;justify-content:center;font-size:12px;gap:2px}
a[data-cta=open-x]{display:grid;place-items:center;width:44px;height:44px;padding:0;border-radius:999px;border:1px solid #d5cfbf;background:transparent;color:#161411}
html.dark a[data-cta=open-x]{border-color:#3d3832;color:#f0e9e0}
[data-story]{border-bottom:1px solid #d5cfbf;padding:24px 16px;max-width:min(42rem,100%);margin:0 auto;overflow-wrap:anywhere}
html.dark [data-story]{border-bottom-color:#2c2824}
[data-story] h2,[data-story] h2 a{font-family:var(--font-display,Georgia),serif;font-size:1.25rem;line-height:1.35;font-weight:500;margin:0;text-align:left;overflow-wrap:anywhere}
[data-story] p{color:#6e695d;font-size:14px;margin:0 0 8px}
html.dark [data-story] p{color:#9a9286}
[data-post]{max-width:min(48rem,100%);margin:0 auto;overflow-wrap:anywhere}
[data-post] h1{font-family:var(--font-display,Georgia),serif;font-size:1.4rem;line-height:1.35;font-weight:500;letter-spacing:-0.01em;margin:12px 0 0;text-align:left;text-wrap:pretty}
[data-post] p{font-size:1.05rem;line-height:1.6;margin:16px 0 0}
`;
