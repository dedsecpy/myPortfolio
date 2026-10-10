/* ==========================================================================
   AEJAZ — Portfolio interactions
   Smooth scroll · custom cursor · physics · scroll-driven scenes · easter eggs
   No dependencies. Everything runs on one requestAnimationFrame loop.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('is-ready');

  /* ------------------------------------------------------------------
     ✏️ Config — edit these
     ------------------------------------------------------------------ */
  const CONFIG = {
    email: 'hello@aejaz.dev',
    palettes: [
      { name: 'Aurora', css: ['#8b6cff', '#2fd6ff', '#ff5fb7'], gl: ['#06050e', '#4b2fd8', '#0a8fd1', '#c02a86', '#1d2fa8'] },
      { name: 'Sunset', css: ['#ff8a4c', '#ff4f8b', '#ffc65c'], gl: ['#0b0507', '#c4421a', '#b5175a', '#d98a1c', '#5a1aa8'] },
      { name: 'Ocean', css: ['#2ee6c8', '#3b9bff', '#7cf0ff'], gl: ['#030a0e', '#008c7e', '#0a55c4', '#06a3c4', '#2a1fa0'] },
      { name: 'Citrus', css: ['#c6ff4a', '#2ef0a0', '#3bc4ff'], gl: ['#050906', '#4f8f00', '#00936a', '#0a7fb8', '#2b5c12'] },
    ],
  };

  /* ------------------------------------------------------------------
     Utilities
     ------------------------------------------------------------------ */
  const qs = (s, c = document) => c.querySelector(s);
  const qsa = (s, c = document) => Array.from(c.querySelectorAll(s));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
  const pad2 = (n) => String(n).padStart(2, '0');
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutQuint = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ------------------------------------------------------------------
     Frame loop
     ------------------------------------------------------------------ */
  const tickers = [];
  const onTick = (fn) => {
    tickers.push(fn);
    return () => { const i = tickers.indexOf(fn); if (i > -1) tickers.splice(i, 1); };
  };
  let lastTime = performance.now();
  let elapsed = 0;
  const frame = (now) => {
    const dt = Math.min(Math.max((now - lastTime) / 1000, 0), 1 / 20);
    lastTime = now;
    elapsed += dt;
    const list = tickers.slice();
    for (let i = 0; i < list.length; i++) list[i](dt, elapsed);
    requestAnimationFrame(frame);
  };

  /* ------------------------------------------------------------------
     Resize manager (debounced, ignores mobile URL-bar jitter)
     ------------------------------------------------------------------ */
  const resizers = [];
  const onResize = (fn) => { resizers.push(fn); };
  let resizeTimer = 0;
  let lastWidth = window.innerWidth;
  const fireResize = () => resizers.forEach((fn) => fn());
  const queueResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fireResize, 160); };
  window.addEventListener('resize', () => {
    if (!finePointer && window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    queueResize();
  });
  if ('ResizeObserver' in window) new ResizeObserver(queueResize).observe(document.body);

  /* ------------------------------------------------------------------
     Observers
     ------------------------------------------------------------------ */
  const hasIO = 'IntersectionObserver' in window;
  const once = (el, cb, threshold = 0.3) => {
    if (!el) return;
    if (!hasIO) { cb(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { io.disconnect(); cb(); }
    }, { threshold });
    io.observe(el);
  };
  const watch = (el, margin = '0px') => {
    const state = { visible: false };
    if (!el) return state;
    if (!hasIO) { state.visible = true; return state; }
    new IntersectionObserver((entries) => {
      state.visible = entries[entries.length - 1].isIntersecting;
    }, { rootMargin: margin }).observe(el);
    return state;
  };

  /* ------------------------------------------------------------------
     Pointer
     ------------------------------------------------------------------ */
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  }, { passive: true });

  /* ------------------------------------------------------------------
     Smooth scroll (lightweight, Lenis-style). Native on touch devices.
     ------------------------------------------------------------------ */
  const scroll = (() => {
    const api = { y: window.scrollY, velocity: 0, locked: false, smooth: finePointer && !reduceMotion };
    let current = api.y;
    let target = api.y;
    let animating = false;
    let tween = null;
    const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);
    api.max = maxScroll;

    const resync = () => { current = target = window.scrollY; };
    const cancel = () => { if (animating || tween) { animating = false; tween = null; resync(); } };

    if (api.smooth) {
      window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) return; // pinch-zoom
        if (e.target instanceof Element && e.target.closest('[data-native-scroll]')) return;
        if (api.locked) { e.preventDefault(); return; }
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        e.preventDefault();
        let d = e.deltaY;
        if (e.deltaMode === 1) d *= 32;
        else if (e.deltaMode === 2) d *= window.innerHeight;
        if (tween) { tween = null; resync(); }
        if (!animating) resync();
        target = clamp(target + d, 0, maxScroll());
        animating = true;
      }, { passive: false });

      window.addEventListener('scroll', () => { if (!animating && !tween) resync(); }, { passive: true });
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) cancel();
      });
      window.addEventListener('pointerdown', (e) => { if (e.target === root) cancel(); });
    }

    api.update = (dt) => {
      if (tween) {
        const k = clamp((performance.now() - tween.start) / tween.dur);
        current = target = lerp(tween.from, tween.to, easeInOutQuint(k));
        window.scrollTo(0, current);
        if (k >= 1) tween = null;
      } else if (animating) {
        current = damp(current, target, 7.5, dt);
        if (Math.abs(target - current) < 0.5) { current = target; animating = false; }
        window.scrollTo(0, current);
      }
      const y = window.scrollY;
      api.velocity = damp(api.velocity, (y - api.y) / Math.max(dt, 1 / 240), 10, dt);
      api.y = y;
    };

    api.to = (dest, opts = {}) => {
      let y = typeof dest === 'number' ? dest : dest.getBoundingClientRect().top + window.scrollY + (opts.offset || 0);
      y = clamp(y, 0, maxScroll());
      if (!api.smooth) {
        window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
        return;
      }
      const dist = Math.abs(y - window.scrollY);
      animating = false;
      tween = { from: window.scrollY, to: y, start: performance.now(), dur: opts.duration || clamp(dist * 0.4, 700, 1800) };
    };

    api.lock = () => { api.locked = true; animating = false; tween = null; root.classList.add('is-locked'); };
    api.unlock = () => { api.locked = false; root.classList.remove('is-locked'); resync(); };
    return api;
  })();
  onTick((dt) => scroll.update(dt));

  /* ------------------------------------------------------------------
     Toast
     ------------------------------------------------------------------ */
  const toastEl = qs('#toast');
  let toastTimer = 0;
  const toast = (msg, ms = 2600) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), ms);
  };

  /* ------------------------------------------------------------------
     Text splitting
     ------------------------------------------------------------------ */
  function splitChars(el) {
    const text = el.textContent.trim();
    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    const wrap = document.createElement('span');
    wrap.className = 'chars';
    wrap.setAttribute('aria-hidden', 'true');
    const chars = Array.from(text).map((ch, i) => {
      const c = document.createElement('span');
      c.className = 'char';
      c.style.setProperty('--i', i);
      const inner = document.createElement('span');
      inner.className = 'char__in';
      inner.textContent = ch;
      c.appendChild(inner);
      wrap.appendChild(c);
      return c;
    });
    el.append(sr, wrap);
    return chars;
  }

  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'word';
            const wi = document.createElement('span');
            wi.className = 'word__in';
            wi.style.setProperty('--i', i++);
            wi.textContent = part;
            w.appendChild(wi);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    return qsa('.word__in', el);
  }

  function makeRoll(el) {
    const text = el.textContent.trim();
    el.textContent = '';
    const roll = document.createElement('span');
    roll.className = 'roll';
    const a = document.createElement('span');
    a.className = 'roll__a';
    a.textContent = text;
    const b = document.createElement('span');
    b.className = 'roll__b';
    b.setAttribute('aria-hidden', 'true');
    b.textContent = text;
    roll.append(a, b);
    el.appendChild(roll);
  }

  /** Smoothly tracks how close the cursor is to each element (0 → 1). */
  function proximity(els, radius) {
    const vals = els.map(() => 0);
    const written = els.map(() => '');
    const rects = [];
    const targets = els.map((el) => el.firstElementChild || el);
    return {
      vals,
      update(dt, enabled = true) {
        const on = enabled && finePointer && pointer.active && !reduceMotion;
        if (on) for (let i = 0; i < els.length; i++) rects[i] = els[i].getBoundingClientRect();
        for (let i = 0; i < els.length; i++) {
          let t = 0;
          if (on) {
            const r = rects[i];
            const d = Math.hypot(pointer.x - (r.left + r.width / 2), pointer.y - (r.top + r.height / 2));
            t = clamp(1 - d / radius);
            t = t * t * (3 - 2 * t);
          }
          let v = damp(vals[i], t, 7, dt);
          if (t === 0 && v < 0.002) v = 0;
          vals[i] = v;
          const s = v.toFixed(3);
          if (s !== written[i]) { written[i] = s; targets[i].style.setProperty('--p', s); }
        }
        return vals;
      },
    };
  }

  /* ------------------------------------------------------------------
     Preloader
     ------------------------------------------------------------------ */
  function runPreloader() {
    return new Promise((resolve) => {
      const pre = qs('.preloader');
      if (!pre) { root.classList.add('is-loaded'); resolve(); return; }
      const count = qs('.preloader__count', pre);
      const start = performance.now();
      const minTime = reduceMotion ? 250 : 1800;
      let ready = false;
      const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })));
      const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
      Promise.race([Promise.all([loaded, fonts]), new Promise((r) => setTimeout(r, 4500))]).then(() => { ready = true; });

      let shown = 0;
      const off = onTick(() => {
        const t = clamp((performance.now() - start) / minTime);
        const goal = Math.min(easeOutCubic(t) * 100, ready ? 100 : 88);
        shown = Math.max(shown, goal);
        const val = Math.round(shown);
        pre.style.setProperty('--p', val);
        if (count.textContent !== String(val)) count.textContent = val;
        if (val >= 100) {
          off();
          setTimeout(() => {
            pre.classList.add('is-done');
            root.classList.add('is-loaded');
            resolve();
            setTimeout(() => pre.remove(), 1400);
          }, 220);
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     Custom cursor
     ------------------------------------------------------------------ */
  function initCursor() {
    if (!finePointer) return;
    const ring = qs('.cursor-ring');
    const dot = qs('.cursor-dot');
    const label = qs('.cursor-ring__label');
    if (!ring || !dot || !label) return;
    root.classList.add('has-cursor');

    let x = pointer.x;
    let y = pointer.y;
    let mode = '';
    const setMode = (m, text) => {
      if (m === 'label' && label.textContent !== text) label.textContent = text;
      if (m === mode) return;
      mode = m;
      ring.dataset.mode = m;
      dot.dataset.mode = m;
    };
    setMode('default');

    document.addEventListener('pointerover', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      const c = t.closest('[data-cursor]');
      if (c) setMode('label', c.dataset.cursor);
      else if (t.closest('input:not([type="radio"]):not([type="checkbox"]), textarea')) setMode('text');
      else if (t.closest('a, button, label, select, [role="button"]')) setMode('hover');
      else setMode('default');
    });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') root.classList.add('cursor-on');
    }, { passive: true });
    window.addEventListener('mouseout', (e) => { if (!e.relatedTarget) root.classList.remove('cursor-on'); });
    window.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    window.addEventListener('pointerup', () => ring.classList.remove('is-down'));

    onTick((dt) => {
      x = damp(x, pointer.x, 16, dt);
      y = damp(y, pointer.y, 16, dt);
      ring.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
    });
  }

  /* ------------------------------------------------------------------
     Magnetic elements (spring physics)
     ------------------------------------------------------------------ */
  function initMagnetic() {
    if (!finePointer || reduceMotion) return;
    const items = qsa('[data-magnetic]').map((el) => ({
      el,
      inner: el.querySelector(':scope > [data-roll]'),
      k: parseFloat(el.dataset.magnetic) || 0.35,
      x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, rest: true,
    }));
    items.forEach((m) => {
      m.el.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = m.el.getBoundingClientRect();
        const cx = r.left + r.width / 2 - m.x;
        const cy = r.top + r.height / 2 - m.y;
        m.tx = (e.clientX - cx) * m.k;
        m.ty = (e.clientY - cy) * m.k;
        m.rest = false;
      });
      m.el.addEventListener('pointerleave', () => { m.tx = 0; m.ty = 0; });
    });
    onTick((dt) => {
      for (const m of items) {
        if (m.rest) continue;
        const ax = 170 * (m.tx - m.x) - 13 * m.vx;
        const ay = 170 * (m.ty - m.y) - 13 * m.vy;
        m.vx += ax * dt; m.vy += ay * dt;
        m.x += m.vx * dt; m.y += m.vy * dt;
        const settled = Math.abs(m.x - m.tx) < 0.05 && Math.abs(m.y - m.ty) < 0.05 && Math.abs(m.vx) < 0.5 && Math.abs(m.vy) < 0.5;
        if (settled) { m.x = m.tx; m.y = m.ty; m.vx = m.vy = 0; if (!m.tx && !m.ty) m.rest = true; }
        m.el.style.transform = m.rest ? '' : `translate3d(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px, 0)`;
        if (m.inner) m.inner.style.transform = m.rest ? '' : `translate3d(${(m.x * 0.35).toFixed(2)}px, ${(m.y * 0.35).toFixed(2)}px, 0)`;
      }
    });
  }

  /* ------------------------------------------------------------------
     3D tilt + flip + inner parallax layers
     ------------------------------------------------------------------ */
  function initTilt() {
    const items = qsa('[data-tilt]').map((el) => ({
      el,
      max: parseFloat(el.dataset.tilt) || 10,
      rx: 0, ry: 0, trx: 0, try: 0,
      flip: 0, vflip: 0, tflip: 0, flipped: false,
      layers: qsa('[data-depth]', el).map((l) => ({ el: l, d: parseFloat(l.dataset.depth) || 0 })),
      active: false,
    }));

    items.forEach((it) => {
      if (finePointer && !reduceMotion) {
        it.el.addEventListener('pointermove', (e) => {
          const r = it.el.getBoundingClientRect();
          const px = clamp((e.clientX - r.left) / r.width);
          const py = clamp((e.clientY - r.top) / r.height);
          it.try = (px - 0.5) * it.max * 2;
          it.trx = (0.5 - py) * it.max * 2;
          it.el.style.setProperty('--hx', `${(px * 100).toFixed(1)}%`);
          it.el.style.setProperty('--hy', `${(py * 100).toFixed(1)}%`);
          it.active = true;
        });
        it.el.addEventListener('pointerleave', () => { it.trx = 0; it.try = 0; });
      }
      if (it.el.hasAttribute('data-flip')) {
        const toggle = () => {
          it.tflip = it.tflip ? 0 : 180;
          it.active = true;
          it.el.setAttribute('aria-pressed', String(Boolean(it.tflip)));
        };
        it.el.addEventListener('click', toggle);
        it.el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
      }
    });

    onTick((dt) => {
      for (const it of items) {
        if (!it.active) continue;
        it.rx = damp(it.rx, it.trx, 8, dt);
        it.ry = damp(it.ry, it.try, 8, dt);
        if (reduceMotion) {
          it.flip = it.tflip;
        } else {
          // springy flip
          const a = 140 * (it.tflip - it.flip) - 17 * it.vflip;
          it.vflip += a * dt;
          it.flip += it.vflip * dt;
        }
        const done = Math.abs(it.rx - it.trx) < 0.01 && Math.abs(it.ry - it.try) < 0.01
          && Math.abs(it.flip - it.tflip) < 0.05 && Math.abs(it.vflip) < 0.05;
        if (done) {
          it.rx = it.trx; it.ry = it.try; it.flip = it.tflip; it.vflip = 0;
          if (!it.trx && !it.try) it.active = false;
        }
        const flipped = it.flip > 90;
        if (flipped !== it.flipped) { it.flipped = flipped; it.el.classList.toggle('is-flipped', flipped); }
        it.el.style.transform = `perspective(1100px) rotateX(${it.rx.toFixed(2)}deg) rotateY(${(it.ry + it.flip).toFixed(2)}deg)`;
        for (const l of it.layers) {
          l.el.style.transform = `translate3d(${(it.ry * l.d * 0.55).toFixed(2)}px, ${(-it.rx * l.d * 0.55).toFixed(2)}px, 0)`;
        }
      }
    });
  }

  /* ------------------------------------------------------------------
     Glass spotlight — edges light up as the cursor approaches
     ------------------------------------------------------------------ */
  function initSpotlight() {
    if (!finePointer) return;
    const setVars = (el, e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
      el.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
    };
    const reset = (el) => { el.style.setProperty('--mx', '-999px'); el.style.setProperty('--my', '-999px'); };

    let current = null;
    document.addEventListener('pointermove', (e) => {
      const g = e.target instanceof Element ? e.target.closest('.glass') : null;
      if (current && current !== g && !current.closest('[data-spotlight-group]')) reset(current);
      if (g) setVars(g, e);
      current = g;
    }, { passive: true });

    qsa('[data-spotlight-group]').forEach((group) => {
      const items = qsa('.glass', group);
      group.addEventListener('pointermove', (e) => items.forEach((it) => setVars(it, e)));
      group.addEventListener('pointerleave', () => items.forEach(reset));
    });
  }

  /* ------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------ */
  function initReveal() {
    const els = qsa('[data-reveal]');
    if (reduceMotion || !hasIO) { els.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------
     Navigation: hide on scroll, active section, mobile menu
     ------------------------------------------------------------------ */
  function initNav() {
    const nav = qs('#nav');
    const links = qsa('.nav__link');
    const indicator = qs('.nav__indicator');
    const burger = qs('.burger');
    const menu = qs('#menu');
    let lastY = 0;
    let hidden = false;
    let active = null;
    let menuOpen = false;

    const moveIndicator = (link) => {
      if (!indicator) return;
      if (!link) { indicator.style.opacity = '0'; return; }
      indicator.style.opacity = '1';
      indicator.style.width = `${link.offsetWidth}px`;
      indicator.style.transform = `translateX(${link.offsetLeft}px)`;
    };
    links.forEach((l) => l.addEventListener('pointerenter', () => moveIndicator(l)));
    qs('.nav__links')?.addEventListener('pointerleave', () => moveIndicator(active));

    const sections = links.map((l) => qs(l.getAttribute('href')));
    let ranges = [];
    const measure = () => {
      ranges = sections.map((s) => {
        if (!s) return { top: -1, bottom: -1 };
        const r = s.getBoundingClientRect();
        const top = r.top + window.scrollY;
        return { top, bottom: top + r.height };
      });
      moveIndicator(active);
    };
    onResize(measure);
    measure();

    const setMenu = (open) => {
      menuOpen = open;
      root.classList.toggle('menu-open', open);
      burger?.setAttribute('aria-expanded', String(open));
      burger?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (menu) { menu.setAttribute('aria-hidden', String(!open)); menu.inert = !open; }
      if (open) { scroll.lock(); hidden = false; nav.classList.remove('is-hidden'); } else { scroll.unlock(); }
    };
    burger?.addEventListener('click', () => setMenu(!menuOpen));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

    onTick(() => {
      const y = scroll.y;
      const mid = y + window.innerHeight * 0.5;
      let idx = -1;
      ranges.forEach((r, i) => { if (mid >= r.top && mid < r.bottom) idx = i; });
      const link = idx > -1 ? links[idx] : null;
      if (link !== active) {
        active?.classList.remove('is-active');
        link?.classList.add('is-active');
        active = link;
        moveIndicator(link);
      }
      const dy = y - lastY;
      if (Math.abs(dy) > 6) {
        const shouldHide = dy > 0 && y > window.innerHeight * 0.8 && !menuOpen;
        if (shouldHide !== hidden) { hidden = shouldHide; nav.classList.toggle('is-hidden', hidden); }
        lastY = y;
      }
    });

    return { close: () => { if (menuOpen) setMenu(false); } };
  }

  /* ------------------------------------------------------------------
     In-page links
     ------------------------------------------------------------------ */
  function initAnchors(nav, closeModal) {
    document.addEventListener('click', (e) => {
      const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      const href = a.getAttribute('href');
      if (href === '#') {
        e.preventDefault();
        toast('🔗 Link coming soon');
        return;
      }
      const target = qs(href);
      if (!target) return;
      e.preventDefault();
      nav.close();
      closeModal();
      scroll.to(href === '#home' ? 0 : target);
      if (e.detail === 0 && target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
    });
    qs('.to-top')?.addEventListener('click', () => scroll.to(0));
  }

  /* ------------------------------------------------------------------
     Hero: name, rotating roles, scroll-out choreography
     ------------------------------------------------------------------ */
  function initHero(fx) {
    const hero = qs('.hero');
    if (!hero) return;
    const name = qs('.hero__name', hero);
    const chars = splitChars(name);
    const fades = qsa('[data-hero-fade]', hero);
    const speeds = [0.3, 0.52, 0.2, 0.6, 0.38];
    const rots = [-7, 5, -3, 8, -5];
    let H = hero.offsetHeight;
    let lift = 0;
    const measure = () => {
      H = hero.offsetHeight;
      lift = parseFloat(getComputedStyle(name).fontSize) * 0.09;
    };
    onResize(measure);
    measure();

    // Poke a letter → it wobbles and sparks
    chars.forEach((c) => c.addEventListener('click', (e) => {
      const inner = c.firstElementChild;
      inner.classList.remove('is-jelly');
      void inner.offsetWidth;
      inner.classList.add('is-jelly');
      fx.confetti(e.clientX, e.clientY, 14, 0.5);
    }));

    const prox = proximity(chars, 340);
    let lastY = -1;
    onTick((dt) => {
      const y = scroll.y;
      if (y > H * 1.3 && lastY > H * 1.3) return;
      lastY = y;
      const vals = prox.update(dt, y < H * 0.8);
      const p = clamp(y / H);
      for (let i = 0; i < chars.length; i++) {
        const ty = -y * speeds[i % speeds.length] - vals[i] * lift;
        chars[i].style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) rotate(${(p * rots[i % rots.length]).toFixed(2)}deg)`;
      }
      const o = clamp(1 - p * 1.7).toFixed(3);
      const ty = (-y * 0.18).toFixed(1);
      for (const f of fades) {
        f.style.opacity = o;
        f.style.transform = `translate3d(0, ${ty}px, 0)`;
      }
    });

    initShapes(hero);
    initRotator();
  }

  /* Draggable, throwable glass shapes */
  function initShapes(hero) {
    const els = qsa('[data-shape]', hero);
    if (!els.length) return;
    let W = hero.offsetWidth;
    let H = hero.offsetHeight;
    const shapes = els.map((el, i) => ({
      el,
      fx: parseFloat(el.dataset.x) || 0.5,
      fy: parseFloat(el.dataset.y) || 0.5,
      mfx: parseFloat(el.dataset.mx || el.dataset.x) || 0.5,
      mfy: parseFloat(el.dataset.my || el.dataset.y) || 0.5,
      depth: parseFloat(el.dataset.depth) || 1,
      rot: parseFloat(el.dataset.rot) || 0,
      spin: parseFloat(el.dataset.spin) || 0,
      x: 0, y: 0, vx: 0, vy: 0, vr: 0, w: 0, h: 0, px: 0, py: 0, ox: 0, oy: 0,
      phase: i * 1.37, drag: null,
    }));

    let compact = null;
    const measure = () => {
      const nW = hero.offsetWidth;
      const nH = hero.offsetHeight;
      const nowCompact = window.innerWidth < 900;
      const relayout = nowCompact !== compact; // crossing the breakpoint → use that layout's home positions
      compact = nowCompact;
      shapes.forEach((s) => {
        s.w = s.el.offsetWidth;
        s.h = s.el.offsetHeight;
        if (relayout) {
          s.x = (compact ? s.mfx : s.fx) * nW - s.w / 2;
          s.y = (compact ? s.mfy : s.fy) * nH - s.h / 2;
          s.vx = s.vy = 0;
        } else if (W && H) { s.x *= nW / W; s.y *= nH / H; }
      });
      W = nW; H = nH;
    };
    measure();
    onResize(measure);

    shapes.forEach((s) => {
      s.el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        try { s.el.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
        s.drag = {
          id: e.pointerId,
          cx: e.clientX, cy: e.clientY,
          gx: e.clientX - (s.x + s.ox),
          gy: e.clientY + scroll.y - (s.y + s.oy),
        };
        s.vx = s.vy = 0;
        s.el.classList.add('is-dragging');
      });
      s.el.addEventListener('pointermove', (e) => {
        if (!s.drag || e.pointerId !== s.drag.id) return;
        s.drag.cx = e.clientX;
        s.drag.cy = e.clientY;
      });
      const release = (e) => {
        if (!s.drag || (e && e.pointerId !== s.drag.id)) return;
        s.drag = null;
        s.el.classList.remove('is-dragging');
        const sp = Math.hypot(s.vx, s.vy);
        const max = 3400;
        if (sp > max) { s.vx *= max / sp; s.vy *= max / sp; }
        s.vr += s.vx * 0.06;
      };
      s.el.addEventListener('pointerup', release);
      s.el.addEventListener('pointercancel', release);
      s.el.addEventListener('lostpointercapture', release);
    });

    let lastY = -1;
    onTick((dt, t) => {
      const sy = scroll.y;
      if (sy > H * 1.2 && lastY > H * 1.2) return;
      lastY = sy;
      const mx = pointer.x / window.innerWidth - 0.5;
      const my = pointer.y / window.innerHeight - 0.5;
      const live = finePointer && !reduceMotion;
      for (const s of shapes) {
        s.px = damp(s.px, live ? -mx * 50 * s.depth : 0, 3, dt);
        s.py = damp(s.py, live ? -my * 50 * s.depth : 0, 3, dt);
        const float = reduceMotion ? 0 : Math.sin(t * 0.8 + s.phase) * 14 * s.depth;
        s.ox = s.px;
        s.oy = s.py + float - sy * 0.35 * s.depth;

        if (s.drag) {
          const nx = s.drag.cx - s.drag.gx - s.ox;
          const ny = s.drag.cy + sy - s.drag.gy - s.oy;
          s.vx = lerp(s.vx, (nx - s.x) / dt, 0.4);
          s.vy = lerp(s.vy, (ny - s.y) / dt, 0.4);
          s.x = nx; s.y = ny;
        } else {
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          const fr = Math.pow(0.16, dt);
          s.vx *= fr; s.vy *= fr;
          const minX = -s.w * 0.3; const maxX = W - s.w * 0.7;
          const minY = -s.h * 0.3; const maxY = H - s.h * 0.7;
          if (s.x < minX) { s.x = minX; s.vx = Math.abs(s.vx) * 0.65; }
          else if (s.x > maxX) { s.x = maxX; s.vx = -Math.abs(s.vx) * 0.65; }
          if (s.y < minY) { s.y = minY; s.vy = Math.abs(s.vy) * 0.65; }
          else if (s.y > maxY) { s.y = maxY; s.vy = -Math.abs(s.vy) * 0.65; }
        }
        if (s.spin) {
          s.vr = damp(s.vr, 0, 1.4, dt);
          s.rot += (reduceMotion ? 0 : s.spin + s.vr) * dt;
        }
        s.el.style.transform = `translate3d(${(s.x + s.ox).toFixed(1)}px, ${(s.y + s.oy).toFixed(1)}px, 0) rotate(${s.rot.toFixed(2)}deg)`;
      }
    });
  }

  function initRotator() {
    const r = qs('.rotator');
    if (!r) return;
    const words = qsa(':scope > span', r);
    let i = 0;
    const fit = () => { r.style.width = `${words[i].offsetWidth}px`; };
    words[0].classList.add('is-active');
    fit();
    onResize(fit);
    if (document.fonts) document.fonts.ready.then(fit);
    if (reduceMotion) return;
    setInterval(() => {
      if (document.hidden) return;
      const prev = words[i];
      i = (i + 1) % words.length;
      const next = words[i];
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      next.classList.remove('is-leaving');
      next.classList.add('is-active');
      setTimeout(() => prev.classList.remove('is-leaving'), 800);
      fit();
    }, 2600);
  }

  /* ------------------------------------------------------------------
     Marquee — reacts to scroll speed and direction
     ------------------------------------------------------------------ */
  function initMarquee() {
    qsa('[data-marquee]').forEach((row) => {
      const track = qs('.marquee__track', row);
      const group = qs('.marquee__group', row);
      if (!track || !group) return;
      let unit = 0;
      const fill = () => {
        unit = group.offsetWidth;
        const needed = Math.ceil((row.offsetWidth * 1.3) / Math.max(unit, 1)) + 1;
        while (track.children.length < needed) track.appendChild(group.cloneNode(true));
      };
      fill();
      onResize(fill);
      if (document.fonts) document.fonts.ready.then(fill);

      const vis = watch(row, '100px');
      const dir = parseFloat(row.dataset.marquee) || 1;
      let x = 0;
      let sign = 1;
      let boost = 0;
      onTick((dt) => {
        if (!vis.visible || reduceMotion) return;
        const v = scroll.velocity;
        if (Math.abs(v) > 40) sign = v > 0 ? 1 : -1;
        boost = damp(boost, Math.min(Math.abs(v) / 220, 9), 5, dt);
        x -= dir * sign * (55 + boost * 70) * dt;
        if (unit) { x %= unit; if (x > 0) x -= unit; }
        track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      });
    });
  }

  /* ------------------------------------------------------------------
     About: scroll-scrubbed paragraph + counters
     ------------------------------------------------------------------ */
  function animateCount(el, end, dur = 2200) {
    const start = performance.now();
    const step = (now) => {
      const k = reduceMotion ? 1 : clamp((now - start) / dur);
      el.textContent = Math.round(end * easeOutExpo(k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function initAbout() {
    const lead = qs('[data-scrub-words]');
    if (lead) {
      const words = splitWords(lead);
      if (reduceMotion) {
        words.forEach((w) => { w.style.opacity = '1'; });
      } else {
        const vis = watch(lead, '60px');
        const last = words.map(() => -1);
        const n = words.length;
        onTick(() => {
          if (!vis.visible) return;
          const r = lead.getBoundingClientRect();
          const vh = window.innerHeight;
          const p = clamp((vh * 0.85 - r.top) / (vh * 0.5 + r.height * 0.45));
          for (let i = 0; i < n; i++) {
            const v = clamp((p * (n + 5) - i) / 5);
            const o = Math.round((0.16 + 0.84 * v) * 100) / 100;
            if (o !== last[i]) { last[i] = o; words[i].style.opacity = o; }
          }
        });
      }
    }
    qsa('[data-count]').forEach((el) => once(el, () => animateCount(el, parseFloat(el.dataset.count) || 0), 0.6));
  }

  /* ------------------------------------------------------------------
     Work: vertical scroll drives a horizontal gallery
     ------------------------------------------------------------------ */
  function initWork() {
    const section = qs('.work');
    if (!section) return;
    const pin = qs('.work__pin', section);
    const sticky = qs('.work__sticky', section);
    const track = qs('.work__track', section);
    const bar = qs('.work__progress span', section);
    const current = qs('.work__current', section);
    const total = qs('.work__total', section);
    const cards = qsa('.project', track);
    if (total) total.textContent = pad2(cards.length);

    if (reduceMotion) { section.classList.add('is-native'); return; }

    let distance = 0;
    let top = 0;
    let metrics = [];
    let skew = 0;
    let lastP = -1;
    let lastIdx = -1;

    const measure = () => {
      distance = Math.max(0, track.offsetWidth - root.clientWidth);
      pin.style.height = `${distance + sticky.offsetHeight}px`;
      top = pin.getBoundingClientRect().top + window.scrollY;
      metrics = cards.map((c) => ({ left: c.offsetLeft, w: c.offsetWidth, bg: qs('.art__bg', c) }));
      lastP = -1;
    };
    onResize(measure);
    measure();

    const vis = watch(section, '200px');
    onTick((dt) => {
      if (!vis.visible) return;
      const p = distance ? clamp((scroll.y - top) / distance) : 0;
      const pinned = p > 0 && p < 1;
      skew = damp(skew, pinned ? clamp(scroll.velocity / 2500, -1, 1) : 0, 6, dt);
      if (p === lastP && Math.abs(skew) < 0.002) return;
      lastP = p;
      const x = -p * distance;
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) skewX(${(-skew * 3).toFixed(3)}deg)`;
      if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
      const vw = root.clientWidth;
      metrics.forEach((m) => {
        const center = m.left + m.w / 2 + x - vw / 2;
        if (m.bg) m.bg.style.transform = `translate3d(${(-(center / vw) * 50).toFixed(1)}px, 0, 0)`;
      });
      const idx = Math.round(p * (cards.length - 1));
      if (idx !== lastIdx && current) { lastIdx = idx; current.textContent = pad2(idx + 1); }
    });
  }

  /* ------------------------------------------------------------------
     Project case-study modal
     ------------------------------------------------------------------ */
  function initModal() {
    const modal = qs('#modal');
    if (!modal) return () => {};
    const panel = qs('.modal__panel', modal);
    const content = qs('.modal__content', modal);
    const scroller = qs('.modal__scroll', modal);
    const closeBtn = qs('.modal__close', modal);
    let lastFocus = null;
    let open = false;

    const openModal = (project) => {
      const tpl = qs('template.project__details', project);
      const art = qs('.project__art', project);
      content.innerHTML = '';
      if (art) {
        const clone = art.cloneNode(true);
        qsa('.art__layer, .art__bg', clone).forEach((n) => { n.style.transform = ''; });
        content.appendChild(clone);
      }
      if (tpl) content.appendChild(tpl.content.cloneNode(true));
      scroller.scrollTop = 0;
      lastFocus = document.activeElement;
      modal.inert = false;
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-open');
      open = true;
      scroll.lock();
      setTimeout(() => closeBtn.focus({ preventScroll: true }), 60);
    };

    const closeModal = () => {
      if (!open) return;
      open = false;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      modal.inert = true;
      scroll.unlock();
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };

    qsa('.project').forEach((p) => {
      qs('.project__card', p)?.addEventListener('click', () => openModal(p));
    });
    modal.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.closest('[data-close]')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (!open) return;
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key === 'Tab') {
        const focusables = qsa('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', panel);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    return closeModal;
  }

  /* ------------------------------------------------------------------
     Skills bento
     ------------------------------------------------------------------ */
  const CODE = [
    ['k', 'const '], ['v', 'aejaz'], ['p', ' = {\n'],
    ['', '  role: '], ['s', "'Creative Developer'"], ['p', ',\n'],
    ['', '  stack: ['], ['s', "'TypeScript'"], ['p', ', '], ['s', "'React'"], ['p', ', '], ['s', "'WebGL'"], ['p', '],\n'],
    ['', '  loves: ['], ['s', "'design'"], ['p', ', '], ['s', "'motion'"], ['p', ', '], ['s', "'details'"], ['p', '],\n'],
    ['', '  coffee: '], ['n', 'Infinity'], ['p', ',\n'],
    ['f', '  build'], ['p', '(idea) {\n'],
    ['k', '    return '], ['', 'idea.'], ['f', 'toAwesome'], ['p', '();\n'],
    ['p', '  },\n};\n\n'],
    ['c', "// → let's build something great"],
  ];

  function initTyper() {
    const el = qs('[data-typer]');
    if (!el) return;
    const total = CODE.reduce((n, [, t]) => n + t.length, 0);
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const render = (count) => {
      let html = '';
      let left = count;
      for (const [cls, text] of CODE) {
        if (left <= 0) break;
        const part = text.slice(0, left);
        left -= part.length;
        html += cls ? `<span class="${cls}">${esc(part)}</span>` : esc(part);
      }
      el.innerHTML = `${html}<span class="caret"></span>`;
    };
    if (reduceMotion) { render(total); return; }
    render(0);
    once(el, () => {
      let shown = 0;
      let acc = 0;
      const off = onTick((dt) => {
        acc += dt * 40;
        const n = Math.floor(acc);
        if (!n) return;
        acc -= n;
        shown = Math.min(total, shown + n);
        render(shown);
        if (shown >= total) off();
      });
    }, 0.35);
  }

  function initParticles() {
    const canvas = qs('[data-particles]');
    if (!canvas) return;
    const tile = canvas.closest('.tile');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0;
    let h = 0;
    let pts = [];
    let c1 = '#2fd6ff';
    let c2 = '#8b6cff';
    const local = { x: -9999, y: -9999, on: false };

    const readColors = () => {
      const cs = getComputedStyle(root);
      c1 = cs.getPropertyValue('--a2').trim() || c1;
      c2 = cs.getPropertyValue('--a1').trim() || c2;
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((w * h) / 4800, 30, 120));
      pts = Array.from({ length: n }, () => {
        const a = Math.random() * Math.PI * 2;
        const sp = 8 + Math.random() * 16;
        return { x: Math.random() * w, y: Math.random() * h, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, bx: Math.cos(a) * sp, by: Math.sin(a) * sp, r: Math.random() * 1.6 + 0.6 };
      });
    };
    const toLocal = (e) => { const r = canvas.getBoundingClientRect(); local.x = e.clientX - r.left; local.y = e.clientY - r.top; };
    tile.addEventListener('pointermove', (e) => { toLocal(e); local.on = true; });
    tile.addEventListener('pointerleave', () => { local.on = false; });
    tile.addEventListener('pointerdown', (e) => {
      toLocal(e);
      for (const p of pts) {
        const dx = p.x - local.x; const dy = p.y - local.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 220) { const f = (1 - d / 220) * 700; p.vx += (dx / d) * f; p.vy += (dy / d) * f; }
      }
    });

    const vis = watch(tile, '50px');
    onResize(resize);
    resize();
    readColors();
    let n = 0;
    onTick((dt) => {
      if (!vis.visible) return;
      if (++n % 20 === 0) readColors();
      ctx.clearRect(0, 0, w, h);
      const R = 120;
      for (const p of pts) {
        if (local.on) {
          const dx = p.x - local.x; const dy = p.y - local.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / R) * 1400 * dt;
            p.vx += (dx / d) * f; p.vy += (dy / d) * f;
          }
        }
        p.vx = damp(p.vx, p.bx, 1.5, dt);
        p.vy = damp(p.vy, p.by, 1.5, dt);
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = c1;
      const L = 92;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const dx = a.x - b.x; const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < L * L) {
            ctx.globalAlpha = (1 - Math.sqrt(d2) / L) * 0.32;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      if (local.on) {
        ctx.strokeStyle = c2;
        for (const p of pts) {
          const d = Math.hypot(p.x - local.x, p.y - local.y);
          if (d < 170) {
            ctx.globalAlpha = (1 - d / 170) * 0.6;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(local.x, local.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = c1;
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    });
  }

  function initEasing() {
    const wrap = qs('.easing');
    if (!wrap) return;
    const ball = qs('.easing__ball', wrap);
    const track = qs('.easing__track', wrap);
    const curve = qs('.easing__curve', wrap);
    const buttons = qsa('[data-ease]', wrap);
    const EASES = {
      expo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      elastic: (t) => (t === 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
      bounce: (t) => {
        const n1 = 7.5625; const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
        if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
        t -= 2.625 / d1; return n1 * t * t + 0.984375;
      },
      back: (t) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    };
    let ease = 'expo';
    let t0 = elapsed;
    let travel = 0;
    const draw = () => {
      const f = EASES[ease];
      let d = '';
      for (let i = 0; i <= 80; i++) {
        const x = i / 80;
        d += `${i ? 'L' : 'M'}${(x * 100).toFixed(2)} ${(52 - f(x) * 42).toFixed(2)} `;
      }
      curve.setAttribute('d', d);
    };
    const measure = () => { travel = track.clientWidth - ball.offsetWidth - 8; };
    buttons.forEach((b) => b.addEventListener('click', () => {
      buttons.forEach((x) => x.classList.toggle('is-active', x === b));
      ease = b.dataset.ease;
      draw();
      t0 = elapsed;
    }));
    draw();
    onResize(measure);
    measure();
    if (reduceMotion) return;
    const vis = watch(wrap);
    onTick((dt, t) => {
      if (!vis.visible) return;
      const cycle = 3.4;
      const local = (((t - t0) % cycle) + cycle) % cycle;
      let k = 0;
      if (local < 1.1) k = EASES[ease](local / 1.1);
      else if (local < 1.7) k = 1;
      else if (local < 2.8) k = 1 - EASES[ease]((local - 1.7) / 1.1);
      ball.style.transform = `translate3d(${(k * travel).toFixed(2)}px, 0, 0)`;
    });
  }

  function initGauges() {
    const C = 2 * Math.PI * 34;
    qsa('.gauge').forEach((g, i) => once(g, () => {
      const score = parseFloat(g.dataset.score) || 100;
      const bar = qs('.gauge__bar', g);
      const num = qs('.gauge__num', g);
      setTimeout(() => {
        bar.style.strokeDashoffset = (C * (1 - score / 100)).toFixed(2);
        animateCount(num, score, 2000);
      }, i * 120);
    }, 0.5));
  }

  /* ------------------------------------------------------------------
     Experience timeline
     ------------------------------------------------------------------ */
  function initTimeline() {
    const tl = qs('.timeline');
    if (!tl) return;
    const fill = qs('.timeline__fill', tl);
    const items = qsa('.tl-item', tl);
    const vis = watch(tl, '200px');
    let last = -1;
    onTick(() => {
      if (!vis.visible) return;
      const r = tl.getBoundingClientRect();
      const p = clamp((window.innerHeight * 0.6 - r.top) / r.height);
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      fill.style.transform = `scaleY(${p.toFixed(4)})`;
      const lineY = p * r.height;
      items.forEach((it) => it.classList.toggle('is-active', it.offsetTop + 34 < lineY));
    });
  }

  /* ------------------------------------------------------------------
     Contact
     ------------------------------------------------------------------ */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }

  function initContact(fx) {
    const form = qs('#contact-form');
    if (form) {
      const fields = qsa('.field', form);
      fields.forEach((f) => {
        qs('input, textarea', f).addEventListener('input', () => f.classList.remove('is-invalid'));
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        let ok = true;
        fields.forEach((f) => {
          const inp = qs('input, textarea', f);
          const valid = inp.value.trim() !== '' && inp.checkValidity();
          f.classList.toggle('is-invalid', !valid);
          if (!valid) ok = false;
        });
        if (!ok) {
          form.classList.remove('shake');
          void form.offsetWidth;
          form.classList.add('shake');
          toast('✍️ Please fill in the highlighted fields');
          qs('.is-invalid input, .is-invalid textarea', form)?.focus();
          return;
        }
        const data = new FormData(form);
        const name = String(data.get('name') || '').trim();
        const email = String(data.get('email') || '').trim();
        const msg = String(data.get('message') || '').trim();
        const budget = data.get('budget') || 'Not sure yet';
        const btn = qs('.btn--submit', form);
        const label = qs('.btn__label', btn);
        btn.classList.add('is-sending');
        label.textContent = 'Sending…';
        setTimeout(() => {
          const subject = `New project enquiry — ${name}`;
          const body = `Hi Aejaz,\n\n${msg}\n\nBudget: ${budget}\n\n— ${name}\n${email}`;
          window.location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          btn.classList.remove('is-sending');
          label.textContent = 'Message ready ✓';
          const r = btn.getBoundingClientRect();
          fx.confetti(r.left + r.width / 2, r.top + r.height / 2, 60, 0.8);
          toast('✨ Opening your email app — talk soon!', 3400);
          form.reset();
          setTimeout(() => { label.textContent = 'Send message'; }, 4200);
        }, 900);
      });
    }

    qsa('[data-copy]').forEach((b) => b.addEventListener('click', () => {
      const text = b.dataset.copy;
      const hint = qs('.email-card__hint', b);
      copyText(text).then(() => {
        toast('📋 Email copied to clipboard');
        if (hint) { hint.textContent = 'Copied! ✓'; setTimeout(() => { hint.textContent = 'Click to copy ⧉'; }, 2200); }
      }).catch(() => { window.location.href = `mailto:${text}`; });
    }));

    // Headline lines slide past each other
    const title = qs('.contact__title');
    const lines = qsa('.contact__line');
    if (title && lines.length === 2 && !reduceMotion) {
      const vis = watch(title, '100px');
      onTick(() => {
        if (!vis.visible) return;
        const r = title.getBoundingClientRect();
        const p = clamp((window.innerHeight - r.top) / (window.innerHeight + r.height));
        const off = (0.5 - p) * 2;
        lines[0].style.transform = `translate3d(${(off * -5).toFixed(3)}vw, 0, 0)`;
        lines[1].style.transform = `translate3d(${(off * 5).toFixed(3)}vw, 0, 0)`;
      });
    }
  }

  /* ------------------------------------------------------------------
     Footer
     ------------------------------------------------------------------ */
  function initFooter() {
    const year = qs('[data-year]');
    if (year) year.textContent = new Date().getFullYear();
    const name = qs('.footer__name');
    if (!name) return;
    const chars = splitChars(name);
    once(name, () => name.classList.add('is-in'), 0.25);
    const prox = proximity(chars, 420);
    const vis = watch(name, '40px');
    onTick((dt) => { if (vis.visible) prox.update(dt); });
  }

  /* ------------------------------------------------------------------
     Palette switcher
     ------------------------------------------------------------------ */
  function initPalette() {
    const btn = qs('.palette-btn');
    const P = CONFIG.palettes;
    const meta = qs('meta[name="theme-color"]');
    let idx = 0;
    try { idx = (parseInt(localStorage.getItem('aejaz:palette'), 10) || 0) % P.length; } catch (_) { /* private mode */ }
    const apply = (i, instant) => {
      const p = P[i];
      ['--a1', '--a2', '--a3'].forEach((v, j) => root.style.setProperty(v, p.css[j]));
      if (window.Aurora) window.Aurora.setPalette(p.gl, instant);
      if (meta) meta.setAttribute('content', p.gl[0]);
    };
    apply(idx, true);
    btn?.addEventListener('click', () => {
      idx = (idx + 1) % P.length;
      apply(idx, false);
      try { localStorage.setItem('aejaz:palette', String(idx)); } catch (_) { /* noop */ }
      toast(`🎨 Palette — ${P[idx].name}`);
    });
  }

  /* ------------------------------------------------------------------
     Effects & easter eggs
     ------------------------------------------------------------------ */
  function initFX() {
    const layer = qs('.fx-layer');

    const confetti = (x, y, count = 90, power = 1) => {
      if (reduceMotion || !layer) return;
      const cs = getComputedStyle(root);
      const colors = ['--a1', '--a2', '--a3'].map((v) => cs.getPropertyValue(v).trim()).concat('#ffffff');
      const parts = [];
      for (let i = 0; i < count; i++) {
        const el = document.createElement('i');
        el.className = 'confetti';
        el.style.setProperty('--c', colors[i % colors.length]);
        const a = Math.random() * Math.PI * 2;
        const sp = (260 + Math.random() * 720) * power;
        parts.push({
          el, x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 420 * power,
          r: Math.random() * 360,
          vr: (Math.random() - 0.5) * 900,
          s: 0.5 + Math.random() * 0.8,
          life: 0,
          max: 1.6 + Math.random() * 1.2,
        });
        layer.appendChild(el);
      }
      const off = onTick((dt) => {
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.life += dt;
          p.vy += 1500 * dt;
          p.vx *= Math.pow(0.45, dt);
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.r += p.vr * dt;
          const o = 1 - clamp((p.life - p.max * 0.6) / (p.max * 0.4));
          p.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) rotate(${p.r.toFixed(1)}deg) scale(${p.s.toFixed(2)})`;
          p.el.style.opacity = o.toFixed(2);
          if (p.life >= p.max || p.y > window.innerHeight + 60) { p.el.remove(); parts.splice(i, 1); }
        }
        if (!parts.length) off();
      });
    };

    let partyTimer = 0;
    const party = () => {
      root.classList.add('is-party');
      if (window.Aurora) window.Aurora.setParty(true);
      toast('🎉 Party mode unlocked — you found the secret!', 3600);
      confetti(window.innerWidth / 2, window.innerHeight * 0.45, 140, 1.1);
      clearTimeout(partyTimer);
      partyTimer = setTimeout(() => {
        root.classList.remove('is-party');
        if (window.Aurora) window.Aurora.setParty(false);
      }, 8000);
    };

    // Type "aejaz" anywhere, or enter the Konami code
    const KONAMI = 'ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a';
    let keys = [];
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]')) return;
      keys.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      keys = keys.slice(-10);
      if (keys.slice(-5).join('') === 'aejaz' || keys.join(',') === KONAMI) { keys = []; party(); }
    });

    // Click ripple
    if (finePointer && !reduceMotion) {
      document.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (e.target instanceof Element && e.target.closest('input, textarea, [data-shape], .modal')) return;
        const r = document.createElement('span');
        r.className = 'click-ripple';
        r.style.left = `${e.clientX}px`;
        r.style.top = `${e.clientY}px`;
        document.body.appendChild(r);
        r.addEventListener('animationend', () => r.remove());
      });
    }

    // Tab title
    const title = document.title;
    document.addEventListener('visibilitychange', () => {
      document.title = document.hidden ? '👋 Come back soon — Aejaz' : title;
    });

    // Hello, fellow developer
    console.log('%c✦ Aejaz', 'font: 700 30px system-ui, sans-serif; color: #8b6cff;');
    console.log(`%cPeeking under the hood? I like you already. Let's build something → ${CONFIG.email}\n(psst: type "aejaz" on the page)`, 'color: #9aa; font-size: 12px;');

    return { confetti, party };
  }

  /* ------------------------------------------------------------------
     Scroll progress + background
     ------------------------------------------------------------------ */
  function initProgress() {
    const bar = qs('.scroll-progress span');
    if (!bar) return;
    let max = scroll.max();
    onResize(() => { max = scroll.max(); });
    let last = -1;
    onTick(() => {
      const p = max ? clamp(scroll.y / max) : 0;
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
    });
  }

  function initBackground() {
    if (!window.Aurora) return;
    const m = { x: 0.5, y: 0.6 };
    let max = scroll.max();
    onResize(() => { max = scroll.max(); });
    onTick((dt) => {
      m.x = damp(m.x, pointer.x / window.innerWidth, 2.2, dt);
      m.y = damp(m.y, 1 - pointer.y / window.innerHeight, 2.2, dt);
      window.Aurora.render(dt, {
        mouse: [m.x, m.y],
        scroll: max ? scroll.y / max : 0,
        vel: clamp(Math.abs(scroll.velocity) / 4000),
      });
    });
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  qsa('[data-roll]').forEach(makeRoll);
  qsa('[data-split]').forEach((el) => splitWords(el));

  initPalette();
  const fx = initFX();
  initCursor();
  initHero(fx);
  initMarquee();
  initAbout();
  initWork();
  const closeModal = initModal();
  initTyper();
  initParticles();
  initEasing();
  initGauges();
  initTimeline();
  initContact(fx);
  initFooter();
  const nav = initNav();
  initAnchors(nav, closeModal);
  initMagnetic();
  initTilt();
  initSpotlight();
  initProgress();
  initBackground();

  requestAnimationFrame((t) => { lastTime = t; frame(t); });

  scroll.lock();
  runPreloader().then(() => {
    scroll.unlock();
    initReveal();
    fireResize();
    let target = null;
    try { target = location.hash.length > 1 ? qs(location.hash) : null; } catch (_) { /* invalid selector */ }
    if (target) setTimeout(() => scroll.to(target), 700);
  });
})();
