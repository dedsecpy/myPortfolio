/* ==========================================================================
   Aurora — a living WebGL gradient background.
   Soft colour fields drift with time, follow the cursor, and rearrange as
   you scroll so every section sits on a slightly different sky.
   Exposes window.Aurora = { render, setPalette, setParty }.
   ========================================================================== */
(() => {
  'use strict';

  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const fail = () => document.documentElement.classList.add('no-webgl');

  let gl = null;
  try {
    gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power',
    });
  } catch (e) { gl = null; }
  if (!gl) { fail(); return; }

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    uniform vec2  uRes;
    uniform float uTime;
    uniform vec2  uMouse;
    uniform float uScroll;
    uniform float uVel;
    uniform float uParty;
    uniform vec3  uC0;
    uniform vec3  uC1;
    uniform vec3  uC2;
    uniform vec3  uC3;
    uniform vec3  uC4;

    vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
      m = m * m; m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x  = a0.x  * x0.x   + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    float blob(vec2 p, vec2 c, float r) {
      vec2 d = p - c;
      return exp(-dot(d, d) / (r * r));
    }

    vec3 hueShift(vec3 c, float a) {
      const vec3 k = vec3(0.57735);
      float ca = cos(a);
      return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      float asp = uRes.x / uRes.y;
      vec2 p = vec2(uv.x * asp, uv.y);

      float t = uTime * 0.085;
      float s = uScroll * 6.28318;

      // Organic domain warp — stronger while scrolling fast
      vec2 warp = vec2(
        snoise(p * 1.1 + vec2(t * 1.3, -t)),
        snoise(p * 1.1 + vec2(-t, t * 1.1) + 11.7)
      );
      p += warp * (0.13 + uVel * 0.12);

      vec2 c1 = vec2(asp * (0.20 + 0.14 * sin(t * 1.7 + s)),            0.74 + 0.14 * cos(t * 1.3 + s * 0.5));
      vec2 c2 = vec2(asp * (0.82 + 0.12 * cos(t * 1.2 - s * 0.8)),      0.26 + 0.16 * sin(t * 1.9 + s * 0.7));
      vec2 c3 = vec2(asp * (0.58 + 0.22 * sin(t * 0.9 + 2.0 + s * 0.6)), 0.92 + 0.10 * sin(t * 2.3 + s));
      vec2 c4 = vec2(asp * (0.10 + 0.10 * cos(t * 2.1 + s * 1.3)),      0.10 + 0.12 * cos(t * 1.4 - s * 0.4));
      vec2 m  = vec2(uMouse.x * asp, uMouse.y);

      vec3 col = uC0;
      col = mix(col, uC1, blob(p, c1, 0.46) * 0.85);
      col = mix(col, uC2, blob(p, c2, 0.42) * 0.80);
      col = mix(col, uC3, blob(p, c3, 0.34) * 0.70);
      col = mix(col, uC4, blob(p, c4, 0.40) * 0.75);
      col = mix(col, mix(uC2, uC3, 0.5 + 0.5 * sin(t * 3.0)), blob(p, m, 0.24) * 0.5);

      // Silky luminance variation
      float n = snoise(p * 2.4 - t * 0.6);
      col *= 0.9 + n * 0.1;

      // Vignette
      vec2 q = uv - 0.5;
      q.x *= asp * 0.6;
      col *= smoothstep(1.2, 0.18, length(q));

      // Party mode 🎉
      col = mix(col, hueShift(col, uTime * 2.4) * 1.15, uParty);

      // Dither to kill banding
      col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('[Aurora] shader error:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { fail(); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { fail(); return; }
  gl.useProgram(prog);

  // One oversized triangle covers the screen
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uRes', 'uTime', 'uMouse', 'uScroll', 'uVel', 'uParty', 'uC0', 'uC1', 'uC2', 'uC3', 'uC4']
    .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    time: Math.random() * 100,
    colors: ['#0b0507', '#c4421a', '#b5175a', '#d98a1c', '#5a1aa8'].map(hexToRgb),
    target: null,
    party: 0,
    partyTarget: 0,
    frame: 0,
    lost: false,
  };
  state.target = state.colors.map((c) => c.slice());

  let lastW = 0;
  let lastH = 0;
  function resize() {
    const scale = coarse ? 0.35 : 0.5; // soft gradients don't need full resolution
    const w = Math.max(1, Math.round(window.innerWidth * scale));
    const h = Math.max(1, Math.round(window.innerHeight * scale));
    // On mobile, ignore small height changes caused by the URL bar
    if (w === lastW && Math.abs(h - lastH) < 80 * scale && lastH) return;
    lastW = w; lastH = h;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.uRes, w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); state.lost = true; fail(); });

  const lerp = (a, b, t) => a + (b - a) * t;

  window.Aurora = {
    /**
     * @param {number} dt seconds since last frame
     * @param {{mouse:number[], scroll:number, vel:number}} input
     */
    render(dt, input) {
      if (state.lost) return;
      state.frame++;
      state.time += dt * (reduce ? 0.15 : 1) * (1 + state.party * 2);

      const k = 1 - Math.exp(-3 * dt);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 3; j++) state.colors[i][j] = lerp(state.colors[i][j], state.target[i][j], k);
      }
      state.party = lerp(state.party, state.partyTarget, 1 - Math.exp(-4 * dt));

      // Phones: render at 30fps to save battery
      if (coarse && state.frame % 2) return;

      gl.uniform1f(U.uTime, state.time);
      gl.uniform2f(U.uMouse, input.mouse[0], input.mouse[1]);
      gl.uniform1f(U.uScroll, input.scroll);
      gl.uniform1f(U.uVel, input.vel);
      gl.uniform1f(U.uParty, state.party);
      gl.uniform3fv(U.uC0, state.colors[0]);
      gl.uniform3fv(U.uC1, state.colors[1]);
      gl.uniform3fv(U.uC2, state.colors[2]);
      gl.uniform3fv(U.uC3, state.colors[3]);
      gl.uniform3fv(U.uC4, state.colors[4]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    setPalette(hexes, instant) {
      state.target = hexes.map(hexToRgb);
      if (instant) state.colors = state.target.map((c) => c.slice());
    },

    setParty(on) { state.partyTarget = on ? 1 : 0; },
  };
})();
