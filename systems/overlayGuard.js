'use strict'
/**
 * 🛡️ حارس الشاشات المنبثقة (overlayGuard) — يُحقن تلقائياً في كل صفحات الموقع (HTML فقط)
 *
 * المشكلة: التطبيق مثبّت كـ PWA بلا شريط متصفح؛ أي شاشة كاملة (ترقية رانك، نتيجة، فتح صندوق...)
 * لو علقت أو ما فيها زر يشتغل ما كان فيه مخرج إلا بإغلاق التطبيق.
 *
 * الحل (إضافة فقط، لا يغيّر منطق أي صفحة):
 *  - يكتشف أي طبقة كاملة الشاشة (position:fixed + z-index ≥ 20 + تغطي الشاشة) تظهر.
 *  - يدفع حالة history واحدة عند ظهورها، فزر الرجوع/السحب (أندرويد) يغلقها بالضغط على زر «متابعة/إغلاق/تم»
 *    الموجود فيها بدل الخروج من التطبيق.
 *  - Esc يعمل بنفس الطريقة. لو الطبقة ما فيها زر مطابق لا يفعل شيئاً (ولا يعلّق المستخدم).
 */
const SCRIPT = `<script>(function(){
if(window.__ovGuard)return;window.__ovGuard=1;
var cur=null,pushed=false,ign=0,tm=0;
var BTN=/^\\s*(متابعة|متابعه|إغلاق|اغلاق|اغلق|تم|حسنا|حسناً|موافق|رجوع|إخفاء|✕|×|x|ok|close|continue|done)\\s*[!.👑✓✔]*\\s*$/i;
function shown(el){var cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'&&parseFloat(cs.opacity)>=0.05}
function isOv(el){
  if(!el||el.nodeType!==1)return false;
  var cs=getComputedStyle(el);
  if(cs.position!=='fixed'||!shown(el)||cs.pointerEvents==='none')return false;
  var z=parseInt(cs.zIndex,10);if(isNaN(z)||z<20)return false;
  var r=el.getBoundingClientRect();
  return r.width>=innerWidth*0.95&&r.height>=innerHeight*0.95;
}
function find(){
  var list=document.querySelectorAll('body>*,body>*>*'),best=null,bz=-1;
  for(var i=0;i<list.length;i++){var el=list[i];if(/^(SCRIPT|STYLE|LINK|CANVAS)$/.test(el.tagName))continue;
    if(isOv(el)){var z=parseInt(getComputedStyle(el).zIndex,10);if(z>=bz){best=el;bz=z}}}
  return best;
}
function dismiss(el){
  var bs=el.querySelectorAll('button,a,[role=button],.btn,[id*=close],[class*=close]');
  for(var i=0;i<bs.length;i++){var b=bs[i];if(!shown(b))continue;var t=(b.textContent||'').trim();
    if(BTN.test(t)||/close|-x$|^x$/i.test(b.id||'')){try{b.click()}catch(e){}return true}}
  return false;
}
function sync(){
  var o=find();
  if(o&&!cur){cur=o;try{history.pushState({ovg:1},'');pushed=true}catch(e){}}
  else if(!o&&cur){cur=null;if(pushed){pushed=false;if(history.state&&history.state.ovg){ign++;try{history.back()}catch(e){ign--}}}}
  else if(o)cur=o;
}
function later(){clearTimeout(tm);tm=setTimeout(sync,120)}
window.addEventListener('popstate',function(){
  if(ign>0){ign--;return}
  if(cur&&document.documentElement.contains(cur)&&shown(cur)){
    pushed=false;
    var ok=dismiss(cur);
    setTimeout(function(){var o=find();if(o){cur=o;try{history.pushState({ovg:1},'');pushed=true}catch(e){}}else{cur=null}},ok?450:0);
  }
});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&cur)dismiss(cur)});
function start(){
  try{new MutationObserver(later).observe(document.body,{attributes:true,attributeFilter:['class','style','hidden'],childList:true,subtree:true})}catch(e){}
  sync();
}
if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
})()</script>`

// Express middleware: يحقن السكربت قبل </body> في ردود HTML النصية فقط
function middleware(req, res, next) {
    const send = res.send
    res.send = function (body) {
        try {
            if (typeof body === 'string' && body.length < 5e6 && /^\s*<(!doctype|html)/i.test(body) && !body.includes('__ovGuard')) {
                const i = body.lastIndexOf('</body>')
                body = i >= 0 ? body.slice(0, i) + SCRIPT + body.slice(i) : body + SCRIPT
            }
        } catch (e) { /* لا يوقف الرد */ }
        return send.call(this, body)
    }
    next()
}

module.exports = { SCRIPT, middleware }
