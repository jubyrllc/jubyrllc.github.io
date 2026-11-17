/* The end-of-form button (2026-11-17). Ruby: "I'm worried people won't
   see the bar at the bottom and know to click it." Each form keeps its
   dark bar, and this repeats the bar's action as a full-width button
   right under the last card, so scrolling to the end lands on it.

   It owns no logic. It copies the bar's main button (the last button in
   the bar that is not Back) - label, disabled, shown or not - and a tap
   on it clicks that button. So both share every state the page already
   drives: validation, "Sending…", Continue vs Submit, hidden when the bar
   is hidden or the form is done. Pages re-render their bar, so it looks
   the bar up again on every change.

   Options on the <script> tag:
     data-bar     the bar (default .ft-bar)
     data-after   put the button after this element instead of just
     data-before  before the bar (or before this element) */
(function(){
  var me = document.currentScript;
  function opt(n){ return me ? me.getAttribute('data-' + n) : null; }
  var BAR = opt('bar') || '.ft-bar', AFTER = opt('after'), BEFORE = opt('before');

  function init(){
    var wrap = document.createElement('div');
    wrap.className = 'form-end';
    wrap.hidden = true;
    var btn = document.createElement('button');
    btn.type = 'button';
    wrap.appendChild(btn);
    var bar = null;

    function seen(el){ return !!el && !el.hidden && el.getClientRects().length > 0; }
    function primary(){
      if (!bar) return null;
      var all = Array.prototype.filter.call(bar.querySelectorAll('button, a.btn, a.ft-btn'), function(b){
        return !/back/i.test(b.id) && !b.classList.contains('btn--ghost') && !b.classList.contains('ghost')
          && !/^\s*back\s*$/i.test(b.textContent) && !/^back$/i.test(b.getAttribute('aria-label') || '');
      });
      return all.length ? all[all.length - 1] : null;
    }
    function place(){
      bar = document.querySelector(BAR);
      var ref = AFTER && document.querySelector(AFTER);
      if (ref) { if (ref.nextSibling !== wrap) ref.parentNode.insertBefore(wrap, ref.nextSibling); return; }
      ref = (BEFORE && document.querySelector(BEFORE)) || bar;
      if (ref) { if (ref.previousSibling !== wrap) ref.parentNode.insertBefore(wrap, ref); }
    }
    function label(p){
      var c = p.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('[aria-hidden="true"], .arw'), function(x){ x.remove(); });
      return c.textContent.replace(/\s+/g, ' ').trim();
    }
    /* Writes only what changed, so its own writes settle the observer. */
    function sync(){
      place();
      var p = primary();
      var shown = !!p && seen(bar) && seen(p);
      if (wrap.hidden === shown) wrap.hidden = !shown;
      if (!p) return;
      var t = label(p), d = !!p.disabled || p.getAttribute('aria-disabled') === 'true';
      if (btn.textContent !== t) btn.textContent = t;
      if (btn.disabled !== d) btn.disabled = d;
    }
    btn.addEventListener('click', function(){ var p = primary(); if (p && !p.disabled) p.click(); });
    new MutationObserver(sync).observe(document.body, {subtree:true, childList:true, characterData:true,
      attributes:true, attributeFilter:['hidden', 'style', 'class', 'disabled', 'aria-disabled']});
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
