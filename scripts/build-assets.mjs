// Builds the static SVGs used by the profile README:
//   assets/header.svg        glass banner (one sliding red light)
//   assets/typing.svg        typing-effect subtitle
//   assets/stack/*.svg       tech stack tiles
//   assets/social/*.svg      contact buttons
//
// Run from the repository root:
//   cd scripts && npm install && cd .. && node scripts/build-assets.mjs
//
// The output is committed, so the README never depends on an outside
// image service. Re-run this only when the text, colors or stack change.
//
// Style: minimal glass. Solid colors only (no gradients); surfaces are
// translucent with a hairline light border and a soft top highlight.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const icons = require('simple-icons');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

// Design tokens (the stats generator uses the same values).
const T = {
  bg: '#000000',
  glass: '#0C0C0C', // tile base, reads as dark glass on light and dark pages
  glassOpacity: 0.92,
  line: '#FFFFFF', // hairline border, used at low opacity
  text: '#F5F5F5',
  muted: '#8A8A8A',
  accent: '#E0AF68', // main color: the orange of the CSS tile
  sans: "'Segoe UI', -apple-system, BlinkMacSystemFont, Inter, 'Helvetica Neue', Arial, sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, 'Liberation Mono', monospace",
};

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function write(rel, svg) {
  const file = join(ASSETS, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, svg.trim() + '\n');
  console.log('wrote', rel);
}

// A glass surface: translucent fill, hairline border, top highlight.
function glassRect({ x = 0, y = 0, w, h, r, fill = T.glass, fillOpacity = T.glassOpacity }) {
  const i = 0.75;
  return `<rect x="${x + i}" y="${y + i}" width="${w - 2 * i}" height="${h - 2 * i}" rx="${r - i}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${T.line}" stroke-opacity="0.12" stroke-width="1.5"/>
  <path d="M${x + r} ${y + 1.6} H${x + w - r}" stroke="${T.line}" stroke-opacity="0.22" stroke-linecap="round"/>`;
}

// ---------------------------------------------------------------- header
// One quiet glass panel on pure black. The only motion is a short red light
// that slides slowly along the panel's top edge. Text is left-aligned to
// match the README body.
function header() {
  const W = 1200;
  const H = 240;
  const P = { x: 30, y: 30, w: 1140, h: 180, r: 26 };
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Zain Alloush, Software Developer</title>
  <desc id="desc">A minimal glass panel with the name Zain Alloush on a black background.</desc>
  <defs>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${T.bg}"/>
  </g>
  ${glassRect({ x: P.x, y: P.y, w: P.w, h: P.h, r: P.r, fill: '#FFFFFF', fillOpacity: 0.04 })}
  <rect x="${P.x + 60}" y="${P.y + 0.5}" width="120" height="2" rx="1" fill="${T.accent}">
    <animate attributeName="x" values="${P.x + 60};${P.x + P.w - 180};${P.x + 60}" dur="14s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1; .45 0 .55 1"/>
  </rect>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="21.5" fill="none" stroke="${T.line}" stroke-opacity="0.08"/>
  <text x="84" y="120" font-family="${T.sans}" font-size="64" font-weight="700" letter-spacing="6" fill="${T.text}">ZAIN ALLOUSH</text>
  <text x="86" y="164" font-family="${T.sans}" font-size="16" font-weight="600" letter-spacing="7" fill="${T.text}" fill-opacity="0.68">SOFTWARE DEVELOPER</text>
</svg>`;
}

// ---------------------------------------------------------------- typing
// Each line is one <text> whose glyphs sit on a fixed grid (the x list), so
// the reveal clip and the cursor stay aligned whatever monospace font the
// viewer has. Mid-tone colors keep it readable on GitHub's light and dark themes.
function typing(lines) {
  const W = 620;
  const H = 56;
  const size = 21;
  const cw = Math.round(size * 0.6 * 100) / 100; // monospace advance
  const baseline = 35;
  const typeMs = 62;
  const holdMs = 1900;
  const eraseMs = 26;
  const gapMs = 450;

  // Build the timeline: a list of [timeMs, lineIndex, visibleChars].
  const steps = [];
  let t = 0;
  lines.forEach((line, i) => {
    const n = line.length;
    for (let k = 1; k <= n; k++) { steps.push([t, i, k]); t += typeMs; }
    t += holdMs;
    for (let k = n - 1; k >= 0; k--) { steps.push([t, i, k]); t += eraseMs; }
    t += gapMs;
  });
  const total = t;
  const kt = (ms) => (ms / total).toFixed(5);

  const startX = () => 4; // left-aligned

  const clips = [];
  const texts = [];
  lines.forEach((line, i) => {
    const n = line.length;
    const x0 = startX(n + 1); // reserve one cell for the cursor
    const own = steps.filter((s) => s[1] === i);
    const firstT = own[0][0];
    const times = ['0'];
    const widths = ['0'];
    for (const [ms, , k] of own) { times.push(kt(ms)); widths.push((k * cw).toFixed(2)); }
    if (firstT === 0) { times.splice(0, 1); widths.splice(0, 1); }
    clips.push(`<clipPath id="c${i}"><rect x="${x0}" y="0" height="${H}" width="0"><animate attributeName="width" values="${widths.join(';')}" keyTimes="${times.join(';')}" calcMode="discrete" dur="${total}ms" repeatCount="indefinite"/></rect></clipPath>`);
    const xs = Array.from({ length: n }, (_, k) => (x0 + k * cw).toFixed(2)).join(' ');
    texts.push(`<text clip-path="url(#c${i})" x="${xs}" y="${baseline}" xml:space="preserve">${esc(line)}</text>`);
  });

  // Cursor: one x value per step, placed right after the last visible glyph.
  const cTimes = [];
  const cXs = [];
  for (const [ms, i, k] of steps) {
    cTimes.push(kt(ms));
    cXs.push((startX(lines[i].length + 1) + k * cw).toFixed(2));
  }
  if (cTimes[0] !== '0.00000') { cTimes.unshift('0'); cXs.unshift(cXs[0]); } else { cTimes[0] = '0'; }

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title">
  <title id="title">${esc(lines.join(' · '))}</title>
  <defs>
    ${clips.join('\n    ')}
  </defs>
  <style>
    text { font-family: ${T.mono}; font-size: ${size}px; fill: ${T.muted}; }
    .cursor { fill: ${T.accent}; animation: blink 1s steps(1) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .cursor { animation: none; } }
  </style>
  ${texts.join('\n  ')}
  <rect class="cursor" x="${cXs[0]}" y="${baseline - size + 3}" width="3" height="${size + 2}" rx="1">
    <animate attributeName="x" values="${cXs.join(';')}" keyTimes="${cTimes.join(';')}" calcMode="discrete" dur="${total}ms" repeatCount="indefinite"/>
  </rect>
</svg>`;
}

// ---------------------------------------------------------------- tiles
function stackTile(icon, label, color) {
  const W = 104;
  const H = 100;
  const s = 32;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
  <title id="t">${esc(label)}</title>
  ${glassRect({ w: W, h: H, r: 18 })}
  <path transform="translate(${(W - s) / 2} 20) scale(${s / 24})" fill="${color}" d="${icon.path}"/>
  <text x="${W / 2}" y="80" text-anchor="middle" font-family="${T.sans}" font-size="12.5" font-weight="600" fill="${T.muted}">${esc(label)}</text>
</svg>`;
}

function socialButton(icon, label) {
  const H = 44;
  const W = Math.round(40 + 22 + label.length * 8.6 + 18);
  const s = 18;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
  <title id="t">${esc(label)}</title>
  ${glassRect({ w: W, h: H, r: H / 2 })}
  <path transform="translate(18 ${(H - s) / 2}) scale(${s / 24})" fill="${T.text}" d="${icon.path}"/>
  <text x="${18 + s + 12}" y="${H / 2 + 5}" font-family="${T.sans}" font-size="14.5" font-weight="600" fill="${T.text}">${esc(label)}</text>
</svg>`;
}

// ---------------------------------------------------------------- content
const TYPING_LINES = [
  'Student.',
  'Builder.',
  'Future software developer.',
  'Learning every day.',
];

// Only technologies used in the public repositories.
const STACK = {
  dart: [icons.siDart, 'Dart', '#7AA2F7'],
  python: [icons.siPython, 'Python', '#BB9AF7'],
  javascript: [icons.siJavascript, 'JavaScript', '#7DCFFF'],
  html: [icons.siHtml5, 'HTML', '#9ECE6A'],
  css: [icons.siCss, 'CSS', '#E0AF68'],
  flutter: [icons.siFlutter, 'Flutter', '#F7768E'],
  fastapi: [icons.siFastapi, 'FastAPI', '#9ECE6A'],
  postgresql: [icons.siPostgresql, 'PostgreSQL', '#7AA2F7'],
  git: [icons.siGit, 'Git', '#E0AF68'],
  'github-actions': [icons.siGithubactions, 'GH Actions', '#7DCFFF'],
  pytest: [icons.siPytest, 'Pytest', '#BB9AF7'],
};

const SOCIAL = {
  x: [icons.siX, '@zain_28x'],
  instagram: [icons.siInstagram, '@zainalloush28'],
  email: [icons.siGmail, 'Email'],
};

write('header.svg', header());
write('typing.svg', typing(TYPING_LINES));
for (const [slug, [icon, label, color]] of Object.entries(STACK)) write(`stack/${slug}.svg`, stackTile(icon, label, color));
for (const [slug, [icon, label]] of Object.entries(SOCIAL)) write(`social/${slug}.svg`, socialButton(icon, label));
