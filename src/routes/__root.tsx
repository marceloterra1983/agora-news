import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { PwaRoot } from "@/components/news/pwa-install";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CRITICAL_CSS } from "@/lib/news/critical.css";
import { THEME_BOOT_SCRIPT } from "@/lib/news/theme";
import { SETTINGS_BOOT_SCRIPT } from "@/lib/news/settings";
import appCssInline from "../styles.css?inline";

const APP_NAME = "Agora";
const host = import.meta.env.VITE_PUBLIC_HOSTNAME;
const ogImage = host ? `https://${host}/og.jpg` : undefined;

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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "IA — NEWS" },
      { name: "description", content: "Notícias das pastas de NEWS no Google Drive." },
      { name: "application-name", content: APP_NAME },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "theme-color", content: "#f2eee4" },
      { name: "color-scheme", content: "light dark" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "IA — NEWS" },
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
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-180.png" },
      { rel: "preconnect", href: "https://uqcaodtgrkphuhdkchyh.supabase.co" },
      { rel: "preconnect", href: "https://api.fxtwitter.com" },
      { rel: "preconnect", href: "https://pbs.twimg.com" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,500;7..72,600&family=Source+Sans+3:wght@400;500;600;700&display=swap",
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
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_BOOT_SCRIPT }} />
        <HeadContent />
        <style dangerouslySetInnerHTML={{ __html: appCssInline }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(!("caches"in window))return;var k="agora-cache-bust-v9";if(sessionStorage.getItem(k)==="1")return;caches.keys().then(function(keys){return Promise.all(keys.map(function(c){return caches.delete(c)}))}).then(function(){sessionStorage.setItem(k,"1")}).catch(function(){})}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <PreviewHostBridge />
        <PwaRoot />
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={280} skipDelayDuration={120} disableHoverableContent>
            <AuthProvider>
              <Outlet />
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
