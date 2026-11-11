// Builds the static SVGs used by the profile README:
//   assets/header.svg        animated gradient banner
//   assets/typing.svg        typing-effect subtitle
//   assets/stack/*.svg       tech stack tiles
//   assets/social/*.svg      contact buttons
//
// Run from the repository root:
//   cd scripts && npm install && cd .. && node scripts/build-assets.mjs
//
// The output is committed, so the README never depends on an outside
// image service. Re-run this only when the text, colors or stack change.

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
  bg: '#0B0B12',
  surface: '#12121C',
  border: '#272738',
  text: '#ECECF4',
  muted: '#9A9AB0',
  purple: '#8B5CF6',
  violet: '#A78BFA',
  blue: '#3B82F6',
  cyan: '#38BDF8',
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

// ---------------------------------------------------------------- header
function header() {
  const W = 1200;
  const H = 300;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Zain Alloush, Software Developer</title>
  <desc id="desc">Dark banner with a slowly shifting purple and electric-blue glow.</desc>
  <defs>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#FFFFFF"/>
    </pattern>
    <linearGradient id="name" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse" spreadMethod="reflect">
      <stop offset="0" stop-color="${T.violet}"/>
      <stop offset="0.35" stop-color="#C4B5FD"/>
      <stop offset="0.65" stop-color="${T.cyan}"/>
      <stop offset="1" stop-color="${T.blue}"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="0 0; ${W / 2} 0; 0 0" dur="14s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${T.purple}" stop-opacity="0"/>
      <stop offset="0.5" stop-color="${T.violet}"/>
      <stop offset="1" stop-color="${T.blue}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${T.purple}" stop-opacity="0.55"/>
      <stop offset="0.5" stop-color="${T.border}" stop-opacity="0.6"/>
      <stop offset="1" stop-color="${T.blue}" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <style>
    .glow { animation: drift 16s ease-in-out infinite alternate; }
    .glow.b { animation-duration: 19s; animation-direction: alternate-reverse; }
    @keyframes drift { from { transform: translate(-60px, 10px); } to { transform: translate(80px, -20px); } }
    @media (prefers-reduced-motion: reduce) { .glow { animation: none; } }
  </style>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${T.bg}"/>
    <g filter="url(#blur)" opacity="0.55">
      <circle class="glow" cx="300" cy="120" r="170" fill="${T.purple}"/>
      <circle class="glow b" cx="900" cy="190" r="170" fill="${T.blue}"/>
    </g>
    <rect width="${W}" height="${H}" fill="url(#dots)" opacity="0.05"/>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="21.5" fill="none" stroke="url(#edge)"/>
  <text x="${W / 2}" y="158" text-anchor="middle" font-family="${T.sans}" font-size="76" font-weight="800" letter-spacing="8" fill="url(#name)">ZAIN ALLOUSH</text>
  <rect x="${W / 2 - 90}" y="186" width="180" height="2" rx="1" fill="url(#rule)"/>
  <text x="${W / 2}" y="226" text-anchor="middle" font-family="${T.sans}" font-size="19" font-weight="600" letter-spacing="9" fill="${T.muted}">SOFTWARE DEVELOPER</text>
</svg>`;
}

// ---------------------------------------------------------------- typing
// Each line is one <text> whose glyphs sit on a fixed grid (the x list), so
// the reveal clip and the cursor stay aligned whatever monospace font the
// viewer has. Mid-tone colors keep it readable on GitHub's light and dark themes. All timing is computed here and played with discrete SMIL steps.
function typing(lines) {
  const W = 820;
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

  const startX = (n) => Math.round((W - n * cw) / 2 * 100) / 100;

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
    <linearGradient id="ink" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${T.purple}"/>
      <stop offset="1" stop-color="${T.blue}"/>
    </linearGradient>
    ${clips.join('\n    ')}
  </defs>
  <style>
    text { font-family: ${T.mono}; font-size: ${size}px; fill: url(#ink); }
    .cursor { fill: ${T.blue}; animation: blink 1s steps(1) infinite; }
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
const tileDefs = (id) => `
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${T.purple}" stop-opacity="0.75"/>
      <stop offset="0.5" stop-color="${T.border}"/>
      <stop offset="1" stop-color="${T.blue}" stop-opacity="0.75"/>
    </linearGradient>
  </defs>`;

function stackTile(icon, label) {
  const W = 104;
  const H = 100;
  const s = 34;
  const scale = s / 24;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
  <title id="t">${esc(label)}</title>${tileDefs('e')}
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="18" fill="${T.surface}" stroke="url(#e)" stroke-width="1.5"/>
  <path transform="translate(${(W - s) / 2} 18) scale(${scale})" fill="${T.text}" d="${icon.path}"/>
  <text x="${W / 2}" y="80" text-anchor="middle" font-family="${T.sans}" font-size="12.5" font-weight="600" fill="${T.muted}">${esc(label)}</text>
</svg>`;
}

function socialButton(icon, label) {
  const H = 44;
  const W = 40 + 22 + label.length * 8.6 + 18;
  const s = 18;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W)}" height="${H}" viewBox="0 0 ${Math.round(W)} ${H}" role="img" aria-labelledby="t">
  <title id="t">${esc(label)}</title>${tileDefs('e')}
  <rect x="0.75" y="0.75" width="${Math.round(W) - 1.5}" height="${H - 1.5}" rx="${H / 2 - 1}" fill="${T.surface}" stroke="url(#e)" stroke-width="1.5"/>
  <path transform="translate(18 ${(H - s) / 2}) scale(${s / 24})" fill="${T.text}" d="${icon.path}"/>
  <text x="${18 + s + 12}" y="${H / 2 + 5}" font-family="${T.sans}" font-size="14.5" font-weight="600" fill="${T.text}">${esc(label)}</text>
</svg>`;
}

// ---------------------------------------------------------------- content
const TYPING_LINES = [
  'Building practical apps with Flutter and FastAPI',
  'Offline-first mobile apps with cloud sync',
  'Responsive, animated web interfaces',
  'Currently building Waffr',
];

// Only technologies used in the public repositories.
const STACK = {
  dart: [icons.siDart, 'Dart'],
  python: [icons.siPython, 'Python'],
  javascript: [icons.siJavascript, 'JavaScript'],
  html: [icons.siHtml5, 'HTML'],
  css: [icons.siCss, 'CSS'],
  flutter: [icons.siFlutter, 'Flutter'],
  fastapi: [icons.siFastapi, 'FastAPI'],
  postgresql: [icons.siPostgresql, 'PostgreSQL'],
  sqlalchemy: [icons.siSqlalchemy, 'SQLAlchemy'],
  git: [icons.siGit, 'Git'],
  'github-actions': [icons.siGithubactions, 'GH Actions'],
  pytest: [icons.siPytest, 'Pytest'],
  render: [icons.siRender, 'Render'],
};

const SOCIAL = {
  x: [icons.siX, '@zain_28x'],
  instagram: [icons.siInstagram, '@__zain28'],
  email: [icons.siGmail, 'Email'],
};

write('header.svg', header());
write('typing.svg', typing(TYPING_LINES));
for (const [slug, [icon, label]] of Object.entries(STACK)) write(`stack/${slug}.svg`, stackTile(icon, label));
for (const [slug, [icon, label]] of Object.entries(SOCIAL)) write(`social/${slug}.svg`, socialButton(icon, label));
