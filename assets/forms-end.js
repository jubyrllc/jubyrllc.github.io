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

   Grey until complete (2026-11-17, Ruby: "always grey out the buttons
   until they fill out all required fields"). While any VISIBLE field
   marked data-req is empty, the bar's main button and the end button
   both look greyed: aria-disabled + .is-incomplete, never the disabled
   attribute. A tap on either is caught first (capture phase), so the
   page's own handler never runs: the first empty field scrolls into view,
   takes focus, and gets a red outline for a moment. Once everything is
   in, the page's own click/submit logic runs untouched, format checks and
   all. A button the page disables itself keeps the page's state.

   Marking, in the page (each page marks exactly what its own submit
   check requires, never more):
     data-req                  on an input/select/textarea: needs a value
                               (checkbox: ticked; radio: one of its name)
                               on a container (a chip group, a field
                               wrapper): needs a chip .on / aria-checked /
                               aria-pressed, a ticked box, or a value
     data-req-one="key"        with data-req: any ONE field sharing the key
                               is enough ("one or both")
     data-req-if="selector"    with data-req: only counts while that box is
                               ticked (or that field has a value)
   Hidden fields (a later step, a branch not taken) never count.

   Options on the <script> tag:
     data-bar     the bar (default .ft-bar)
     data-after   put the button after this element instead of just
     data-before  before the bar (or before this element) */
(function(){
  var me = document.currentScript;
  function opt(n){ return me ? me.getAttribute('data-' + n) : null; }
  var BAR = opt('bar') || '.ft-bar', AFTER = opt('after'), BEFORE = opt('before');

  function init(){
    var css = document.createElement('style');
    css.textContent = '.is-incomplete{opacity:.45!important;cursor:default!important}'
      + '.gate-flag{outline:2px solid #C0392B!important;outline-offset:-2px!important}';
    document.head.appendChild(css);

    var wrap = document.createElement('div');
    wrap.className = 'form-end';
    wrap.hidden = true;
    var btn = document.createElement('button');
    btn.type = 'button';
    wrap.appendChild(btn);
    var bar = null, gated = null;

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

    /* ---- grey until complete ---- */
    function isField(el){ return /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName); }
    function filled(el){
      if (isField(el)) {
        if (el.type === 'checkbox') return el.checked;
        if (el.type === 'radio') {
          if (!el.name) return el.checked;
          return !!(el.form || document).querySelector('input[type=radio][name="' + el.name.replace(/"/g, '\\"') + '"]:checked');
        }
        if (el.type === 'file') return !!(el.files && el.files.length);
        return String(el.value || '').trim() !== '';
      }
      if (el.querySelector('.on, .selected, [aria-pressed="true"], [aria-checked="true"], input[type=checkbox]:checked, input[type=radio]:checked')) return true;
      return Array.prototype.some.call(el.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=hidden]), textarea, select'),
        function(i){ return String(i.value || '').trim() !== ''; });
    }
    function missing(){
      var out = [], groups = {}, order = [];
      Array.prototype.forEach.call(document.querySelectorAll('[data-req]'), function(el){
        if (!seen(el) || el.disabled) return;
        var cond = el.getAttribute('data-req-if');
        if (cond) { var c = document.querySelector(cond); if (!c || !filled(c)) return; }
        var one = el.getAttribute('data-req-one');
        if (one) { if (!groups[one]) { groups[one] = []; order.push(one); } groups[one].push(el); return; }
        if (!filled(el)) out.push(el);
      });
      order.forEach(function(k){ if (!groups[k].some(filled)) out.push(groups[k][0]); });
      return out.sort(function(a, b){ return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
    }
    function grey(el, on){
      if (on) {
        if (!el.classList.contains('is-incomplete')) el.classList.add('is-incomplete');
        if (el.getAttribute('aria-disabled') !== 'true') el.setAttribute('aria-disabled', 'true');
        el.setAttribute('data-gated', '');
      } else if (el.hasAttribute('data-gated')) {
        el.classList.remove('is-incomplete');
        el.removeAttribute('aria-disabled');
        el.removeAttribute('data-gated');
      }
    }
    function nudge(el){
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({block: 'center', behavior: reduce ? 'auto' : 'smooth'});
      var f = isField(el) ? el : el.querySelector('input:not([type=hidden]), select, textarea, button');
      if (f) try { f.focus({preventScroll: true}); } catch (_) {}
      el.classList.add('gate-flag');
      clearTimeout(el.__gateT);
      el.__gateT = setTimeout(function(){ el.classList.remove('gate-flag'); }, 1800);
    }

    /* Writes only what changed, so its own writes settle the observer. */
    function sync(){
      place();
      var p = primary();
      var shown = !!p && seen(bar) && seen(p);
      if (wrap.hidden === shown) wrap.hidden = !shown;
      if (gated && gated !== p) grey(gated, false);
      gated = p;
      if (!p) return;
      var t = label(p);
      var own = !!p.disabled || (p.getAttribute('aria-disabled') === 'true' && !p.hasAttribute('data-gated'));
      var g = !own && missing().length > 0;
      grey(p, g); grey(btn, g);
      if (btn.textContent !== t) btn.textContent = t;
      if (btn.disabled !== own) btn.disabled = own;
    }
    /* Capture phase on window: runs before any page handler, including
       the Enter-key submit, which the browser turns into a click. */
    window.addEventListener('click', function(e){
      var t = e.target && e.target.closest ? e.target.closest('button, a') : null;
      if (!t) return;
      place();
      var p = primary();
      if (t !== btn && t !== p) return;
      if (!p || p.disabled) return;
      var m = missing();
      sync();
      if (!m.length) return;
      e.preventDefault(); e.stopImmediatePropagation();
      nudge(m[0]);
    }, true);
    btn.addEventListener('click', function(){ var p = primary(); if (p && !p.disabled) p.click(); });
    ['input', 'change'].forEach(function(ev){ document.addEventListener(ev, sync, true); });
    document.addEventListener('click', function(){ setTimeout(sync, 0); });
    new MutationObserver(sync).observe(document.body, {subtree:true, childList:true, characterData:true,
      attributes:true, attributeFilter:['hidden', 'style', 'class', 'disabled', 'aria-disabled']});
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
