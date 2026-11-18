/* ---------------------------------------------------------------------
   Google Analytics for jubyr.com, in one place (2026-11-18).
   Ruby: "add analytics to jubyr.com".

   Same pattern as margolis.events/assets/js/analytics.js: one file, one
   <script> line in the <head> of every public page. The measurement id,
   the opt-out and every event live here.

   NOT tagged on purpose: margolis-dashboard, margolis-login,
   margolis-reset, scripts, bookings and the redirect stubs. Those are
   house/staff pages and would only pollute the numbers.

   TO REMOVE: delete this file and the <script> line on each page.
   --------------------------------------------------------------------- */
(function () {
  'use strict';

  /* jubyr.com's OWN GA4 property, never the Margolis one (that belongs to
     the venue) or rubyjohnston.com. Empty = analytics off: nothing loads,
     nothing is sent. A wrong character fails silently, so read it off
     GA4 Admin -> Data streams -> the jubyr.com stream. */
  var GA_ID = 'G-L2VJD3HNG1';
  if (!GA_ID) return;

  /* ---- keep our own visits out ----
     Visit any page once with ?noga=1 and that browser stops reporting
     until ?noga=0. Read before gtag loads, so an opted-out browser never
     even fetches Google. */
  var OPT_OUT_KEY = 'jubyr-ga-off';
  function store(k) { try { return window[k]; } catch (e) { return null; } }
  var ls = store('localStorage'), ss = store('sessionStorage');
  try {
    var flag = new URLSearchParams(location.search).get('noga');
    if (flag === '1' && ls) ls.setItem(OPT_OUT_KEY, '1');
    if (flag === '0' && ls) ls.removeItem(OPT_OUT_KEY);
  } catch (e) {}
  try { if (ls && ls.getItem(OPT_OUT_KEY) === '1') return; } catch (e) {}

  /* ---- the tag ---- */
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);

  /* A lead counted once per page load per form, never twice. */
  var sent = {};
  function lead(form) {
    if (sent[form]) return;
    sent[form] = 1;
    gtag('event', 'generate_lead', { form: form });
  }

  /* ---- the two actions the site exists for: which buttons get pressed ----
     Every link to /consultation is "Book a free call", every link to
     /contact is "Send an inquiry". `where` says which part of the page. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var p;
    try { p = new URL(a.href, location.href).pathname.replace(/\.html$/, ''); } catch (err) { return; }
    var cta = p === '/consultation' ? 'book_call' : p === '/contact' ? 'inquiry' : '';
    if (!cta) return;
    var where = a.closest('.mnav, .nav') ? 'nav'
      : a.closest('.hero') ? 'hero'
      : a.closest('.mfoot, .footer') ? 'footer'
      : a.closest('section[id]') ? a.closest('section[id]').id : 'page';
    gtag('event', 'cta_click', { cta: cta, where: where });
  }, true);

  /* ---- leads, observed rather than wired into each page ----
     The call booking and the two intake forms all post to jubyr.tools.
     Watching fetch here keeps every page's own code untouched.
       jubyr-call-booking.php?action=book  ok      -> call
       intake.php            (no-cors POST)        -> client_book / partner
       consulting-intake.php (no-cors POST)        -> client_intake */
  var realFetch = window.fetch;
  if (realFetch) {
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      var p = realFetch.apply(this, arguments);
      try {
        if (/jubyr-call-booking\.php\?action=book/.test(url)) {
          p.then(function (r) {
            r.clone().json().then(function (d) { if (r.ok && d && d.ok) lead('call'); }).catch(function () {});
          }).catch(function () {});
        } else if (method === 'POST' && /\/intake\.php/.test(url)) {
          p.then(function () { lead(/partnerships/.test(location.pathname) ? 'partner' : 'client_book'); }).catch(function () {});
        } else if (method === 'POST' && /consulting-intake\.php/.test(url)) {
          p.then(function () { lead('client_intake'); }).catch(function () {});
        }
      } catch (e) {}
      return p;
    };
  }

  /* The inquiry form opens the visitor's email app and then shows its
     "your email app should open" note; that note appearing is the lead. */
  document.addEventListener('DOMContentLoaded', function () {
    /* The call page swaps its form for a ✓ card (.ft-done) once a call is
       booked OR, while live booking is not connected, once the request
       email opens. Either way that card is the lead. */
    var sched = document.getElementById('schedWrap');
    if (sched && 'MutationObserver' in window) {
      new MutationObserver(function () { if (sched.querySelector('.ft-done')) lead('call'); })
        .observe(sched, { childList: true, subtree: true });
    }
    var done = document.getElementById('inq-done');
    if (done && 'MutationObserver' in window) {
      new MutationObserver(function () { if (!done.hidden) lead('inquiry'); })
        .observe(done, { attributes: true, attributeFilter: ['hidden'] });
    }
  });

  /* Mailchimp signups send the visitor to a thank-you page; landing there
     is the lead. Once per browser session so a refresh does not count. */
  var ty = { '/thank-you': 'signup', '/thank-you-green-flag': 'green_flag', '/thank-you-wavelength': 'wavelength' }
    [location.pathname.replace(/\.html$/, '').replace(/\/$/, '')];
  if (ty) {
    var key = 'jubyr-ga-ty-' + ty;
    try {
      if (!ss || !ss.getItem(key)) { if (ss) ss.setItem(key, '1'); lead(ty); }
    } catch (e) { lead(ty); }
  }
})();
