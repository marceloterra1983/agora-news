/** Viewport canônico — um único <meta> no HTML SSR. Pinch-zoom livre (sem trava de escala). */
export const VIEWPORT_CONTENT =
  "width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no";

/** Fonte de verdade do layout telefone (PWA, Safari/Chrome e WebView). */
export const PHONE_MEDIA = "(max-width: 640px)";

/**
 * Primeiro script do <head>: garante 1 viewport e marca `data-shell=phone`
 * quando UA / pointer:coarse / PWA standalone disserem que é aparelho móvel.
 * Se o PWA/WebView ignorar device-width e ficar ~980px, força width=<screen>.
 * CSS `@media (max-width: 640px)` continua sendo a regra de layout.
 */
export const PHONE_VIEWPORT_GUARD = `(function(){try{
var C=${JSON.stringify(VIEWPORT_CONTENT)};
var h=document.documentElement;
var list=document.querySelectorAll('meta[name="viewport"]');
var m=list[0];
if(!m){m=document.createElement("meta");m.setAttribute("name","viewport");(document.head||h).insertBefore(m,(document.head||h).firstChild);}
for(var i=1;i<list.length;i++){if(list[i].parentNode)list[i].parentNode.removeChild(list[i]);}
function apply(){
  var ua=navigator.userAgent||"";
  var mobile=/iPhone|iPod|Android.+Mobile|Windows Phone|webOS|IEMobile|WhatsApp|FBAN|FBAV|Instagram|Line\\/|CriOS|FxiOS/i.test(ua);
  var coarse=false,standalone=false;
  try{coarse=window.matchMedia("(pointer: coarse)").matches&&window.matchMedia("(hover: none)").matches;}catch(e){}
  try{standalone=window.matchMedia("(display-mode: standalone)").matches||window.matchMedia("(display-mode: minimal-ui)").matches||window.matchMedia("(display-mode: fullscreen)").matches||!!(navigator.standalone);}catch(e){}
  var sw=typeof screen!=="undefined"?screen.width:0;
  var layout=window.innerWidth||h.clientWidth||0;
  var scale=1,vvw=0;
  try{if(window.visualViewport){scale=visualViewport.scale||1;vvw=visualViewport.width||0;}}catch(e){}
  var phone=mobile||standalone||(coarse&&sw>0&&sw<=900);
  var content=C;
  var cssW=0;
  if(sw>0&&sw<=640)cssW=sw;
  else if(vvw>0&&vvw<=640)cssW=Math.round(vvw);
  if(phone&&cssW&&(layout>cssW+40||(scale>0&&scale<0.98))){
    content="width="+Math.round(cssW)+", initial-scale=1, viewport-fit=cover, shrink-to-fit=no";
  }
  m.setAttribute("content",content);
  if(phone) h.setAttribute("data-shell","phone");
}
apply();
try{requestAnimationFrame(apply);}catch(e){}
try{window.addEventListener("pageshow",apply);}catch(e){}
}catch(e){}})();`;
