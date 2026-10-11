# Aejaz — Portfolio

Personal site of **Aejaz Ahmad Ansari** ([@dedsecpy](https://github.com/dedsecpy)), web developer and AI & Data Science student at Amrita Vishwa Vidyapeetham, Bengaluru.

A glassmorphism portfolio with a live WebGL background, a custom cursor, physics, and scroll-driven scenes.
It's plain HTML/CSS/JS with **no build step and no dependencies**. Double-click `index.html` to run it.

```
index.html          ← all content lives here
css/style.css       ← design system (colours, glass, layout, responsive)
js/background.js    ← WebGL aurora background
js/main.js          ← interactions (scroll, cursor, physics, modal, form…)
assets/favicon.svg
assets/avatar.jpg   ← ID-card avatar (same as GitHub)
```

## Updating content

| What | Where |
| --- | --- |
| Email address | `index.html` (search `hello@aejaz.dev`) **and** `CONFIG.email` at the top of `js/main.js` |
| Social links | `.socials` in the Contact section |
| Stats (years on GitHub, repos…) | `.stats` in the About section (`data-count="…"`) |
| Projects | Each `<article class="project">` in the Work section. The `<template>` inside holds the case-study modal content |
| Journey | Each `<article class="tl-item">` in the Journey section |
| Avatar | `assets/avatar.jpg`, used in the About ID card |
| Typing code snippet | `CODE` in `js/main.js` |
| Colour palettes | `CONFIG.palettes` in `js/main.js` (Sunset is the default) |
| Rotating hero roles | `.rotator` spans in the hero |

Any link still set to `href="#"` shows a "Link coming soon" toast instead of jumping to the top.

## Features

- **Living WebGL aurora** that drifts, follows the cursor, shifts as you scroll, and ripples when you scroll fast
- **Glass material** with frosted blur, gradient edges, and edge light that follows the cursor
- **Draggable glass shapes** in the hero. Grab one and throw it.
- **Custom cursor**: a glass lens that morphs into labels ("Open", "Drag me", "Flip me"…)
- **Smooth scrolling**, with native scrolling kept on touch devices
- **Pinned horizontal gallery** of projects, with case-study modals
- Magnetic buttons, 3D tilt cards, a flippable ID card, word-by-word reveals, scroll-scrubbed text
- Interactive bento: particle playground, live-typing code, easing-curve demo, tech orbit, animated Lighthouse gauges
- **Palette switcher** with 4 themes (saved per visitor)
- Easter eggs: type **`aejaz`** anywhere (or the Konami code), poke the letters of the name, and check the browser console 👀

## Accessibility & performance

- Respects `prefers-reduced-motion`: animations are minimised, the gallery becomes a normal swipe carousel, and all content shows immediately
- Keyboard friendly: skip link, focus styles, focus-trapped modal, Escape closes overlays, flip card works with Enter/Space
- Background renders at reduced resolution (30fps on phones) and pauses work for off-screen sections
- Falls back to animated CSS gradients if WebGL isn't available

## Contact form

There's no backend. The form validates, then opens the visitor's email app with the message pre-filled.
To receive submissions directly, point the form at a service like [Formspree](https://formspree.io) or [Web3Forms](https://web3forms.com).

## Deploy

Upload the folder to any static host: **Netlify Drop**, **Vercel**, **GitHub Pages**, or **Cloudflare Pages**. No configuration needed.

> Fonts (Clash Display, Satoshi, JetBrains Mono) load from Fontshare and Google Fonts. Offline, the site falls back to system fonts.
