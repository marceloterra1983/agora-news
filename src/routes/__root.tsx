import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { HideHostChrome } from "@/components/news/hide-host-chrome";
import { PwaRoot } from "@/components/news/pwa-install";
import { CRITICAL_CSS } from "@/lib/news/critical.css";
import { PHONE_VIEWPORT_GUARD, VIEWPORT_CONTENT } from "@/lib/news/phone-shell";
import { THEME_BOOT_SCRIPT } from "@/lib/news/theme";
import { SETTINGS_BOOT_SCRIPT } from "@/lib/news/settings";
import "../styles.css";

const APP_NAME = "Agora";
const host = import.meta.env.VITE_PUBLIC_HOSTNAME;
const ogImage = host ? `https://${host}/og.jpg` : undefined;

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,500;7..72,600&family=Source+Sans+3:wght@400;500;600;700&display=swap";

const FONT_LOAD_SCRIPT = `(function(){var l=document.createElement("link");l.rel="stylesheet";l.href=${JSON.stringify(FONT_HREF)};l.media="print";l.onload=function(){this.media="all"};document.head.appendChild(l);})();`;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const Route = createRootRoute({
  headers: () => ({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "CDN-Cache-Control": "no-store",
    Pragma: "no-cache",
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: VIEWPORT_CONTENT },
      { title: "Agora" },
      {
        name: "description",
        content: "Notícias de inteligência artificial, tecnologia e Brasil em um feed direto.",
      },
      { name: "application-name", content: APP_NAME },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "theme-color", content: "#f2eee4" },
      { name: "color-scheme", content: "light dark" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Agora" },
      { property: "og:description", content: "Notícias de inteligência artificial, tecnologia e Brasil em um feed direto." },
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
          ]
        : []),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-180.png" },
      { rel: "preconnect", href: "https://uqcaodtgrkphuhdkchyh.supabase.co" },
      { rel: "dns-prefetch", href: "https://api.fxtwitter.com" },
      { rel: "dns-prefetch", href: "https://pbs.twimg.com" },
      { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
    ],
    styles: [{ children: CRITICAL_CSS }],
  }),
  component: Root,
});

function Root() {
  return (
    <html lang="pt-BR" className="antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PHONE_VIEWPORT_GUARD }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_BOOT_SCRIPT }} />
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: FONT_LOAD_SCRIPT }} />
        <noscript>
          <link rel="stylesheet" href={FONT_HREF} />
        </noscript>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k="agora-cache-bust-v18";if(sessionStorage.getItem(k)==="1")return;var jobs=[];if("caches"in window)jobs.push(caches.keys().then(function(keys){return Promise.all(keys.map(function(c){return caches.delete(c)}))}));if(navigator.serviceWorker)jobs.push(navigator.serviceWorker.getRegistrations().then(function(regs){return Promise.all(regs.map(function(r){return r.update()}))}));Promise.all(jobs).then(function(){sessionStorage.setItem(k,"1")}).catch(function(){})}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <a
          href="#conteudo-principal"
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-paper focus:translate-y-0"
        >
          Pular para o conteúdo
        </a>
        <HideHostChrome />
        <PreviewHostBridge />
        <PwaRoot />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
