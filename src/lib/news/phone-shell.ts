/** Viewport canônico — um único <meta> no HTML SSR. */
export const VIEWPORT_CONTENT =
  "width=device-width, initial-scale=1, viewport-fit=cover";

/** Fonte de verdade do layout telefone (PWA, Safari/Chrome e WebView). */
export const PHONE_MEDIA = "(max-width: 640px)";

/**
 * Primeiro script do <head>: garante 1 viewport e marca `data-shell=phone`
 * quando UA / pointer:coarse / PWA standalone disserem que é aparelho móvel.
 * CSS `@media (max-width: 640px)` continua sendo a regra de layout.
 */
export const PHONE_VIEWPORT_GUARD = `(function(){try{
var C=${JSON.stringify(VIEWPORT_CONTENT)};
var h=document.documentElement;
var list=document.querySelectorAll('meta[name="viewport"]');
var m=list[0];
if(!m){m=document.createElement("meta");m.setAttribute("name","viewport");(document.head||h).insertBefore(m,(document.head||h).firstChild);}
for(var i=1;i<list.length;i++){if(list[i].parentNode)list[i].parentNode.removeChild(list[i]);}
m.setAttribute("content",C);
var ua=navigator.userAgent||"";
var mobile=/iPhone|iPod|Android.+Mobile|Windows Phone|webOS|IEMobile|WhatsApp|FBAN|FBAV|Instagram|Line\\/|CriOS|FxiOS/i.test(ua);
var coarse=false,standalone=false;
try{coarse=window.matchMedia("(pointer: coarse)").matches&&window.matchMedia("(hover: none)").matches;}catch(e){}
try{standalone=window.matchMedia("(display-mode: standalone)").matches||!!(navigator.standalone);}catch(e){}
var sw=typeof screen!=="undefined"?screen.width:0;
if(mobile||standalone||(coarse&&sw>0&&sw<=900)){
  h.setAttribute("data-shell","phone");
  if(window.innerWidth>480&&(mobile||sw<=640)) m.setAttribute("content",C);
}
}catch(e){}})();`;
