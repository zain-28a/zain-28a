// Generates the GitHub statistics cards shown in the profile README:
//   assets/stats/overview.svg    contribution numbers, streaks, 26-week activity
//   assets/stats/languages.svg   most-used languages across public repositories
//
// Runs in .github/workflows/stats.yml with the workflow's GITHUB_TOKEN, so
// only public data is read. No third-party service is involved.
//
// Local preview without network: STATS_FIXTURE=path/to/data.json node scripts/generate-stats.mjs
// (the file holds the "user" object of the GraphQL response below).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'stats');
const LOGIN = process.env.GITHUB_USER || process.env.GITHUB_REPOSITORY_OWNER || 'zain-28a';

// Languages that only come from generated Flutter platform folders
// (android/, ios/, linux/, macos/, windows/) rather than hand-written code.
const EXCLUDED_LANGUAGES = new Set(['C++', 'C', 'CMake', 'Swift', 'Objective-C', 'Kotlin', 'Ruby', 'Batchfile', 'PowerShell']);
// The profile repository itself is not a project.
const EXCLUDED_REPOS = new Set([LOGIN.toLowerCase()]);

const T = {
  bg: '#0B0B12',
  surface: '#12121C',
  border: '#272738',
  track: '#1D1D2B',
  text: '#ECECF4',
  muted: '#9A9AB0',
  purple: '#8B5CF6',
  violet: '#A78BFA',
  blue: '#3B82F6',
  cyan: '#38BDF8',
  sans: "'Segoe UI', -apple-system, BlinkMacSystemFont, Inter, 'Helvetica Neue', Arial, sans-serif",
};
const LANG_COLORS = ['#8B5CF6', '#6D7CF5', '#3B82F6', '#38BDF8', '#A78BFA', '#64748B'];

const QUERY = `
query ($login: String!) {
  user(login: $login) {
    createdAt
    pullRequests { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false) {
      nodes {
        name
        stargazerCount
        languages(first: 20, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name } }
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

async function load() {
  if (process.env.STATS_FIXTURE) return JSON.parse(readFileSync(process.env.STATS_FIXTURE, 'utf8'));
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-stats' },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(`GraphQL error: ${JSON.stringify(body.errors || body)}`);
  return body.data.user;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => (n >= 10000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : n.toLocaleString('en-US'));

function streaks(days) {
  // days: [{date, contributionCount}] oldest first. Today may still be at 0,
  // so the current streak may end yesterday.
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  let i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--;
  for (; i >= 0 && days[i].contributionCount > 0; i--) current++;
  return { current, longest };
}

function summarize(user) {
  const c = user.contributionsCollection;
  const days = c.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
  const repos = user.repositories.nodes.filter((r) => !EXCLUDED_REPOS.has(r.name.toLowerCase()));
  const langs = new Map();
  for (const r of repos) {
    for (const e of r.languages.edges) {
      if (EXCLUDED_LANGUAGES.has(e.node.name)) continue;
      langs.set(e.node.name, (langs.get(e.node.name) || 0) + e.size);
    }
  }
  const weeks = c.contributionCalendar.weeks.slice(-26).map((w) => w.contributionDays.reduce((a, d) => a + d.contributionCount, 0));
  return {
    contributions: c.contributionCalendar.totalContributions,
    commits: c.totalCommitContributions,
    pullRequests: user.pullRequests.totalCount,
    repos: repos.length,
    stars: repos.reduce((a, r) => a + r.stargazerCount, 0),
    ...streaks(days),
    weeks,
    languages: [...langs.entries()].sort((a, b) => b[1] - a[1]),
  };
}

function card(W, H, title, body, extraStyle = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title">
  <title id="title">${esc(title)}</title>
  <defs>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${T.purple}" stop-opacity="0.7"/>
      <stop offset="0.5" stop-color="${T.border}"/>
      <stop offset="1" stop-color="${T.blue}" stop-opacity="0.7"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${T.purple}"/>
      <stop offset="1" stop-color="${T.cyan}"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${T.purple}"/>
      <stop offset="1" stop-color="${T.cyan}"/>
    </linearGradient>
  </defs>
  <style>
    .t { font-family: ${T.sans}; }
    .h { font-size: 15px; font-weight: 700; fill: ${T.text}; letter-spacing: 0.4px; }
    .k { font-size: 12px; font-weight: 600; fill: ${T.muted}; letter-spacing: 0.6px; }
    .v { font-size: 26px; font-weight: 700; fill: ${T.text}; }
    .s { font-size: 12.5px; fill: ${T.muted}; }
    .l { font-size: 13px; font-weight: 600; fill: ${T.text}; }
    ${extraStyle}
  </style>
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="16" fill="${T.bg}" stroke="url(#edge)" stroke-width="1.5"/>
  <rect x="24" y="24" width="4" height="16" rx="2" fill="url(#accent)"/>
  <text class="t h" x="38" y="37">${esc(title)}</text>
${body}
</svg>
`;
}

function overview(s) {
  const W = 495;
  const H = 230;
  const metrics = [
    ['CONTRIBUTIONS', fmt(s.contributions), 'past year'],
    ['COMMITS', fmt(s.commits), 'past year'],
    ['CURRENT STREAK', fmt(s.current), s.current === 1 ? 'day' : 'days'],
    ['LONGEST STREAK', fmt(s.longest), s.longest === 1 ? 'day' : 'days'],
    ['PULL REQUESTS', fmt(s.pullRequests), 'all time'],
    ['STARS', fmt(s.stars), `${s.repos} public repos`],
  ];
  const colW = (W - 48) / 3;
  const cells = metrics.map(([k, v, sub], i) => {
    const x = 24 + (i % 3) * colW;
    const y = 74 + Math.floor(i / 3) * 62;
    return `  <g class="t">
    <text class="k" x="${x}" y="${y}">${k}</text>
    <text class="v" x="${x}" y="${y + 30}">${esc(v)}<tspan class="s" dx="6">${esc(sub)}</tspan></text>
  </g>`;
  });

  // 26-week activity bars along the bottom.
  const top = 196;
  const barH = 22;
  const n = s.weeks.length;
  const gap = 3;
  const bw = (W - 48 - gap * (n - 1)) / n;
  const max = Math.max(1, ...s.weeks);
  const bars = s.weeks.map((v, i) => {
    const h = v === 0 ? 2 : Math.max(3, (v / max) * barH);
    const x = 24 + i * (bw + gap);
    return `<rect x="${x.toFixed(2)}" y="${(top + barH - h).toFixed(2)}" width="${bw.toFixed(2)}" height="${h.toFixed(2)}" rx="1.5" fill="${v === 0 ? T.track : 'url(#bar)'}"/>`;
  });
  const body = `${cells.join('\n')}
  <text class="t k" x="${W - 24}" y="37" text-anchor="end">LAST 26 WEEKS</text>
  <g>
    ${bars.join('\n    ')}
  </g>`;
  return card(W, H, 'GitHub Activity', body);
}

function languages(s) {
  const W = 495;
  const H = 230;
  const top = s.languages.slice(0, 6);
  const total = top.reduce((a, [, b]) => a + b, 0) || 1;
  const x0 = 24;
  const width = W - 48;

  // Stacked bar.
  let x = x0;
  const segs = top.map(([name, bytes], i) => {
    const w = (bytes / total) * width;
    const seg = `<rect x="${x.toFixed(2)}" y="58" width="${Math.max(0, w - 2).toFixed(2)}" height="10" fill="${LANG_COLORS[i]}"/>`;
    x += w;
    return seg;
  });

  // Legend: two columns of three.
  const legend = top.map(([name, bytes], i) => {
    const col = Math.floor(i / 3);
    const row = i % 3;
    const lx = x0 + col * (width / 2);
    const ly = 102 + row * 36;
    const pct = ((bytes / total) * 100).toFixed(1);
    return `  <g class="t">
    <circle cx="${lx + 6}" cy="${ly - 4}" r="5" fill="${LANG_COLORS[i]}"/>
    <text class="l" x="${lx + 20}" y="${ly}">${esc(name)}</text>
    <text class="s" x="${lx + width / 2 - 24}" y="${ly}" text-anchor="end">${pct}%</text>
  </g>`;
  });

  const body = `  <clipPath id="round"><rect x="${x0}" y="58" width="${width}" height="10" rx="5"/></clipPath>
  <g clip-path="url(#round)">
    <rect x="${x0}" y="58" width="${width}" height="10" fill="${T.track}"/>
    ${segs.join('\n    ')}
  </g>
${legend.join('\n')}
  <text class="t s" x="${x0}" y="${H - 18}">By code size across public repositories</text>`;
  return card(W, H, 'Most Used Languages', body);
}

const user = await load();
const stats = summarize(user);
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'overview.svg'), overview(stats));
writeFileSync(join(OUT, 'languages.svg'), languages(stats));
console.log(JSON.stringify({ ...stats, weeks: undefined }, null, 2));
