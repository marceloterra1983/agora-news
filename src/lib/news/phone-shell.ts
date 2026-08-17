/** Viewport canônico — um único <meta> no HTML SSR. Pinch-zoom livre (sem trava de escala). */
export const VIEWPORT_CONTENT =
  "width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no";

/** Fonte de verdade do layout telefone (PWA, Safari/Chrome e WebView). */
export const PHONE_MEDIA = "(max-width: 640px)";

/**
 * Primeiro script do <head>: marca `data-shell=phone` e pina width no telefone.
 * A aba do Chrome Android já fica certa com o pin. O WebAPK/standalone ainda
 * aplica overview (scale < 1) ou ignora o meta depois do first paint — por isso
 * só nesse modo: minimum-scale=1 + CSS zoom = 1/scale. Pinch-zoom de pinça livre.
 */
export const PHONE_VIEWPORT_GUARD = `(function(){try{
var C=${JSON.stringify(VIEWPORT_CONTENT)};
var h=document.documentElement;
var seenStandalone=false;
function meta(){
  var list=document.querySelectorAll('meta[name="viewport"]');
  var m=list[0];
  if(!m){m=document.createElement("meta");m.setAttribute("name","viewport");(document.head||h).insertBefore(m,(document.head||h).firstChild);}
  for(var i=1;i<list.length;i++){if(list[i].parentNode)list[i].parentNode.removeChild(list[i]);}
  return m;
}
function apply(){
  var m=meta();
  var ua=navigator.userAgent||"";
  var android=/Android/i.test(ua);
  var mobile=/iPhone|iPod|Android.+Mobile|Windows Phone|webOS|IEMobile|WhatsApp|FBAN|FBAV|Instagram|Line\\/|CriOS|FxiOS/i.test(ua);
  var coarse=false,standalone=false;
  try{coarse=window.matchMedia("(pointer: coarse)").matches&&window.matchMedia("(hover: none)").matches;}catch(e){}
  try{standalone=window.matchMedia("(display-mode: standalone)").matches||window.matchMedia("(display-mode: minimal-ui)").matches||window.matchMedia("(display-mode: fullscreen)").matches||!!(navigator.standalone);}catch(e){}
  if(standalone) seenStandalone=true;
  var installed=standalone||seenStandalone;
  var sw=typeof screen!=="undefined"?screen.width:0;
  var sh=typeof screen!=="undefined"?screen.height:0;
  var shortSide=Math.min(sw||0,sh||0)||sw||0;
  var scale=1,vvw=0;
  try{if(window.visualViewport){scale=visualViewport.scale||1;vvw=visualViewport.width||0;}}catch(e){}
  var phone=mobile||(installed&&(coarse||(shortSide>0&&shortSide<=640)))||(coarse&&shortSide>0&&shortSide<=900);
  var content=C;
  var cssW=0;
  if(shortSide>0&&shortSide<=640)cssW=shortSide;
  else if(vvw>0&&vvw<=640)cssW=Math.round(vvw);
  else if(phone&&(installed||android||mobile))cssW=360;
  var userPinched=scale>1.02;
  if(phone&&cssW&&!userPinched){
    content="width="+Math.round(cssW)+", initial-scale=1, viewport-fit=cover, shrink-to-fit=no";
    if(installed) content="width="+Math.round(cssW)+", initial-scale=1, minimum-scale=1, viewport-fit=cover, shrink-to-fit=no";
    h.style.width="100%";
    h.style.maxWidth="100%";
    h.style.overflowX="hidden";
  }
  if(installed&&!userPinched){
    var restore=1;
    if(scale>0&&scale<0.98) restore=1/scale;
    else{
      var layoutW=Math.max(h.clientWidth||0,h.scrollWidth||0);
      var visualW=vvw||window.innerWidth||0;
      if(layoutW>visualW+40&&visualW>0) restore=layoutW/visualW;
    }
    if(restore>3) restore=3;
    if(restore>1.02){
      var z=Math.round(restore*1000)/1000;
      h.style.zoom=String(z);
      h.style.setProperty("--agora-standalone-zoom",String(z));
    }else{
      h.style.zoom="";
      h.style.removeProperty("--agora-standalone-zoom");
    }
  }
  m.setAttribute("content",content);
  if(phone) h.setAttribute("data-shell","phone");
}
apply();
try{requestAnimationFrame(apply);}catch(e){}
try{window.addEventListener("pageshow",apply);}catch(e){}
try{window.addEventListener("load",function(){apply();setTimeout(apply,0);});}catch(e){}
try{window.addEventListener("orientationchange",function(){setTimeout(apply,50);});}catch(e){}
try{if(document.head){new MutationObserver(apply).observe(document.head,{childList:true});}}catch(e){}
}catch(e){}})();`;
