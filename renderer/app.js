'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Project Nexus v5 — renderer
   Zero frameworks. Keyed DOM reuse, delegated events, rAF-batched renders.
   ═══════════════════════════════════════════════════════════════════════════ */
const api = window.nexus;
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason && e.reason.message || e.reason)));

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const uid = () => Math.random().toString(36).slice(2);

/* ── icons ────────────────────────────────────────────────────────────────── */
const svg = (d, extra = '') => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const ICON = {
  library: svg('<rect x="3" y="3.5" width="7" height="7" rx="1.6"/><rect x="14" y="3.5" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>'),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  pulse: svg('<path d="M2 12h4l2-6 4 12 2.5-6H22"/>'),
  gear: svg('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6h.08a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.08a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/>'),
  folder: svg('<path d="M3 7.5A2 2 0 0 1 5 5.5h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  python: svg('<path d="M12 3c-3 0-3.5 1.2-3.5 2.6V8h5v1H6.4C4.6 9 3 10.2 3 13s1.4 4 3.4 4H8v-2.4C8 12.2 9.2 11 11.5 11h4C17 11 18 10 18 8.6V5.6C18 3.8 16 3 12 3z"/><circle cx="9.5" cy="5.5" r=".9" fill="currentColor" stroke="none"/><path d="M12 21c3 0 3.5-1.2 3.5-2.6V16h-5v-1h7.1c1.8 0 3.4-1.2 3.4-4s-1.4-4-3.4-4H16v2.4c0 2.4-1.2 3.6-3.5 3.6h-4C7 13 6 14 6 15.4v3c0 1.8 2 2.6 6 2.6z"/><circle cx="14.5" cy="18.5" r=".9" fill="currentColor" stroke="none"/>'),
  node: svg('<path d="M12 2.6 20 7v10l-8 4.4L4 17V7z"/><path d="M9.5 15V9.4l5 5.6V9"/>'),
  app: svg('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 8h18M7 6h.01M9.5 6h.01"/>'),
  batch: svg('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9l2.5 2L7 13M12 15h5"/>'),
  powershell: svg('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9l3 3-3 3M13 15h4"/>'),
  file: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
  missing: svg('<path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  check: svg('<path d="M4 12l5 5L20 6"/>'),
  play: svg('<path d="M7 4.5 19 12 7 19.5z"/>'),
  stop: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
  trash: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
  star: svg('<path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"/>'),
  external: svg('<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
  terminal: svg('<path d="M4 5h16v14H4z"/><path d="M8 10l3 2.5L8 15M13 15.5h4"/>'),
  refresh: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  dots: svg('<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>'),
  log: svg('<path d="M4 5.5h16v13H4z"/><path d="M7.5 9.5h6M7.5 12.5h9M7.5 15.5h4"/>'),
};
const KIND = {
  folder: { label: 'Folder', tag: 'DIR', color: '#f0c04a', hue: 42, icon: ICON.folder },
  python: { label: 'Python', tag: 'PY', color: '#55d98a', hue: 145, icon: ICON.python },
  node: { label: 'Node', tag: 'JS', color: '#8ed468', hue: 100, icon: ICON.node },
  app: { label: 'App', tag: 'EXE', color: '#7c9cff', hue: 225, icon: ICON.app },
  batch: { label: 'Batch', tag: 'BAT', color: '#f59e5b', hue: 26, icon: ICON.batch },
  powershell: { label: 'PowerShell', tag: 'PS1', color: '#6cb8ff', hue: 203, icon: ICON.powershell },
  file: { label: 'File', tag: 'FILE', color: '#9aa4bb', hue: 218, icon: ICON.file },
  missing: { label: 'Missing', tag: 'MISS', color: '#e5484d', hue: 358, icon: ICON.missing },
};
const COLOR_HEX = { violet: '#a78bfa', blue: '#5b9dff', cyan: '#38d6d6', emerald: '#43d18a', amber: '#f0b23a', rose: '#f0708d' };
/* Launch-frequency accent: green (rare) → amber → red (heaviest). Fully configurable:
   mode (relative to the busiest project / absolute / log), thresholds, palette and
   the shape the accent takes on the card. */
const CARDS_DEFAULT = {
  heat: true, heatMode: 'relative', heatMid: 34, heatHigh: 67,
  heatStyle: 'spine', heatThickness: 3, heatIntensity: 85, palette: 'traffic',
  heatCool: '#43d18a', heatWarm: '#f0b23a', heatHot: '#e5484d',
  density: 'compact', minWidth: 178, gap: 6, showDesc: 1, showTags: true, showKind: true,
  runsChip: 'count', meter: true, legend: true,
};
let HEAT_MAX = 1;
function cardCfg() { return Object.assign({}, CARDS_DEFAULT, (S && S.settings && S.settings.cards) || {}); }
function heatPalette(cfg) {
  if (cfg.palette === 'custom') return [cfg.heatCool, cfg.heatWarm, cfg.heatHot];
  if (cfg.palette === 'accent') {
    const t = currentTheme();
    return [t.accent || '#43d18a', t.primary || '#7c9cff', '#e5484d'];
  }
  return ['#43d18a', '#f0b23a', '#e5484d'];
}
function heatFor(p) {
  const cfg = cardCfg();
  const runs = p.run_count || 0;
  let ratio;
  if (cfg.heatMode === 'absolute') ratio = Math.min(1, runs / 20);
  else if (cfg.heatMode === 'log') ratio = Math.min(1, Math.log2(runs + 1) / Math.log2(Math.max(2, HEAT_MAX) + 1));
  else ratio = Math.min(1, runs / Math.max(1, HEAT_MAX));
  const mid = (+cfg.heatMid || 34) / 100;
  const high = Math.max(mid + 0.05, (+cfg.heatHigh || 67) / 100);
  const tier = ratio < mid ? 0 : ratio < high ? 1 : 2;
  const pal = heatPalette(cfg);
  return { runs, ratio, tier, color: pal[tier], palette: pal };
}
/* Everything layout-ish is a CSS variable on the grid host, so changing a slider
   repaints without rebuilding a single card node. */
function applyCardLive() {
  const host = $('#libList');
  if (!host) return;
  const cfg = cardCfg();
  const dens = {
    ultra: { pad: '6px 8px 6px 10px', minH: 82, name: 10.5 },
    compact: { pad: '9px 10px 9px 12px', minH: 96, name: 11 },
    comfortable: { pad: '12px 13px 12px 15px', minH: 118, name: 12 },
  };
  const d = dens[cfg.density] || dens.compact;
  host.style.setProperty('--card-min', (+cfg.minWidth || 178) + 'px');
  host.style.setProperty('--card-gap', (+cfg.gap == null ? 6 : +cfg.gap) + 'px');
  host.style.setProperty('--card-pad', d.pad);
  host.style.setProperty('--card-min-h', d.minH + 'px');
  host.style.setProperty('--card-name-size', d.name + 'px');
  host.style.setProperty('--heat-w', (+cfg.heatThickness || 3) + 'px');
  host.style.setProperty('--heat-mult', ((+cfg.heatIntensity || 85) / 100).toFixed(2));
  host.style.setProperty('--card-desc-lines', String(+cfg.showDesc || 0));
  host.dataset.heatstyle = cfg.heatStyle;
  host.dataset.density = cfg.density;
  host.dataset.heat = cfg.heat ? 'on' : 'off';
}
function renderHeatLegend(list) {
  const el = $('#heatLegend');
  if (!el) return;
  const cfg = cardCfg();
  const show = cfg.legend && cfg.heat && ui.lib.view === 'grid';
  el.hidden = !show;
  if (!show) return;
  const counts = [0, 0, 0];
  for (const p of (list || visibleProjects())) counts[heatFor(p).tier]++;
  const pal = heatPalette(cfg);
  const names = ['low', 'mid', 'high'];
  el.innerHTML = '<span class="hl-label">runs</span>' + counts.map((n, i) =>
    `<span class="hl-item" data-tier="${i}" title="${names[i]} launch frequency"><i style="background:${pal[i]}"></i>${n}</span>`).join('');
}
const SORT_LABEL = { custom: 'Custom', name: 'Name', runs: 'Runs', recent: 'Recent', modified: 'Modified', favorite: 'Favorite', heat: 'Heat' };
const PRIOS = { low: 'Low', below: 'Below', normal: 'Normal', above: 'Above', high: 'High' };

/* ── state ────────────────────────────────────────────────────────────────── */
let S = null;
let booting = true;
const ui = {
  tab: 'library', query: '', quick: null,
  lib: { view: 'list', sort: 'custom', sortDir: 'asc', group: 'none', typeFilter: 'all', tagFilter: null },
  selected: new Set(), cursor: null, lastClicked: null,
  inspectorId: null, help: false, paletteOpen: false, palIndex: 0, palItems: [],
  activityFilter: 'all', settingsSection: 'appearance',
  log: { app: 'all', stream: 'all', q: '', follow: true, wrap: false },
  addOpen: false, menuOpen: false, dropDepth: 0, perfHud: false,
  metrics: null, pending: {}, saveTimer: null, savePending: false,
  dirtyFields: new Map(), fieldTimers: new Map(),
  renders: 0, lastRenderMs: 0, saveState: 'saved',
};
const libNodes = new Map();
let lastChipsSig = '';

/* ── helpers ──────────────────────────────────────────────────────────────── */
function fmtBytes(n) {
  if (n == null) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}
function relTime(ts) {
  if (!ts) return 'never';
  const t = typeof ts === 'number' ? ts : Date.parse(ts);
  if (!t || Number.isNaN(t)) return 'never';
  const d = Date.now() - t;
  if (d < 45000) return 'just now';
  if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
  if (d < 604800000) return Math.floor(d / 86400000) + 'd ago';
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function tsOf(p) {
  const t = p.last_run ? Date.parse(p.last_run) : 0;
  return Number.isNaN(t) ? 0 : t;
}
function deepMerge(a, b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return b === undefined ? a : b;
  const out = Object.assign({}, a);
  for (const [k, v] of Object.entries(b)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && a && typeof a[k] === 'object' && !Array.isArray(a[k]) ? deepMerge(a[k], v) : v;
  }
  return out;
}
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function setPath(obj, path, val) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) { if (!o[keys[i]] || typeof o[keys[i]] !== 'object') o[keys[i]] = {}; o = o[keys[i]]; }
  o[keys[keys.length - 1]] = val;
}
function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const n = parseInt(s.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return '#' + to(f(0)) + to(f(8)) + to(f(4));
}

/* ── theme + live variables ───────────────────────────────────────────────── */
function currentTheme() {
  return (S && S.themes[S.settings.theme]) || (S && Object.values(S.themes)[0]) || { bg: '#0a0c12', card_bg: '#131722', primary: '#7c9cff', text: '#e9ecf5', subtext: '#8a93a8', accent: '#4ade80', mode: 'dark' };
}
function applyTheme() {
  if (!S) return;
  const t = currentTheme();
  const a = S.settings.accent || {};
  const accent = a.custom ? hslToHex(+a.hue || 0, +a.saturation || 80, +a.lightness || 66) : t.primary;
  const accent2 = t.accent || accent;
  const dark = (t.mode || 'dark') !== 'light';
  const root = document.documentElement;
  const rgb = hexToRgb(accent);
  root.style.setProperty('--bg', t.bg);
  root.style.setProperty('--bg2', t.card_bg);
  root.style.setProperty('--card', t.card_bg);
  root.style.setProperty('--text', t.text);
  root.style.setProperty('--muted', t.subtext);
  root.style.setProperty('--primary', t.primary);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  root.style.setProperty('--accent-2', accent2);
  root.style.setProperty('--tint', dark ? '#ffffff' : '#0b0d14');
  root.style.setProperty('--on-accent', luminance(accent) > 0.45 ? '#080b12' : '#ffffff');
  root.dataset.mode = t.mode || 'dark';
  document.body.style.background = t.bg;
}
function applyLive() {
  if (!S) return;
  const a = S.settings.appearance;
  const root = document.documentElement;
  root.style.setProperty('--radius', a.radius + 'px');
  root.style.setProperty('--radius-sm', Math.max(6, Math.round(a.radius * 0.62)) + 'px');
  root.style.setProperty('--blur', a.blur + 'px');
  root.style.setProperty('--row-h', a.density + 'px');
  root.style.setProperty('--font-scale', a.fontScale);
  root.style.setProperty('--motion', a.motion);
  root.style.setProperty('--noise', a.noise);
  root.style.setProperty('--glow', a.glow);
  root.style.setProperty('--side-w', a.sidebarWidth + 'px');
  root.style.setProperty('--insp-w', a.inspectorWidth + 'px');
  root.style.setProperty('--ui-opacity', a.opacity);
  document.body.classList.toggle('no-anim', !a.animations);
  document.body.classList.toggle('reduce-motion', !!a.reduceMotion);
  $('#app').classList.toggle('sidebar-collapsed', !!a.sidebarCollapsed);
  $('#app').classList.toggle('inspector-open', !!ui.inspectorId);
  $('#inspector').setAttribute('aria-hidden', ui.inspectorId ? 'false' : 'true');
  document.body.style.setProperty('--density-scale', a.density / 58);
  applyCardLive();
}
function setTheme(name) {
  if (!S.themes[name]) return;
  S.settings.theme = name;
  patchSettings({ theme: name }, true);
  applyTheme();
  renderSidebar();
  renderSettings();
  toast('success', 'Theme applied', name);
}
function cycleTheme(dir) {
  const names = Object.keys(S.themes);
  const i = names.indexOf(S.settings.theme);
  setTheme(names[(i + (dir > 0 ? 1 : -1) + names.length) % names.length]);
}

/* ── snapshot plumbing ────────────────────────────────────────────────────── */
function adopt(snap, opts = {}) {
  if (!snap || !snap.projects) return;
  S = snap;
  const focused = document.activeElement;
  const typingInspector = !!(focused && focused.closest && focused.closest('#inspBody'));
  ui.lib = Object.assign({}, ui.lib, S.settings.library);
  if (ui.inspectorId && !S.projects.some((p) => p.id === ui.inspectorId)) ui.inspectorId = null;
  applyTheme();
  applyLive();
  renderSidebar();
  renderToolbar();
  renderLibrary();
  if (ui.inspectorId && !typingInspector && !opts.skipInspector) renderInspector();
  if (ui.tab === 'settings') renderSettings();
  if (ui.tab === 'analytics') renderAnalytics();
  if (ui.tab === 'activity') renderActivity();
  renderStatus();
  applyPerfHudState();
  booting = false;
}
async function call(promise, opts = {}) {
  try {
    const r = await promise;
    if (r && r.snapshot) adopt(r.snapshot, opts);
    return r;
  } catch (e) {
    toast('error', 'Action failed', e && e.message ? e.message : String(e));
    return null;
  }
}

/* settings are patched optimistically; the round-trip reconciles with main */
function patchSettings(patch, immediate = false) {
  S.settings = deepMerge(S.settings, patch);
  ui.lib = Object.assign({}, ui.lib, S.settings.library);
  applyTheme();
  applyLive();
  // Card controls repaint in place: layout values are CSS vars, the rest needs a
  // cheap re-render of the keyed card nodes (no node churn).
  if (patch && patch.cards) {
    clearTimeout(ui._cardLive);
    ui._cardLive = setTimeout(() => { applyCardLive(); renderLibrary(); }, 0);
  }
  ui.pending = deepMerge(ui.pending, patch);
  markDirty();
  clearTimeout(ui.saveTimer);
  const flush = async () => {
    const payload = ui.pending;
    ui.pending = {};
    try {
      const snap = await api.setSettings(payload);
      if (snap) {
        const keep = Object.keys(ui.pending).length > 0;
        if (!keep) { S = snap; }
        else { S.settings = deepMerge(S.settings, snap.settings); }
      }
      if (!Object.keys(ui.pending).length) markSaved();
    } catch { markSaved(); }
  };
  ui.saveTimer = setTimeout(flush, immediate ? 0 : 240);
}
function markDirty() {
  ui.saveState = 'dirty';
  const el = $('#savePill'); if (el) { el.textContent = 'Saving…'; el.classList.add('dirty'); }
}
function markSaved() {
  ui.saveState = 'saved';
  const el = $('#savePill'); if (el) { el.textContent = 'All changes saved'; el.classList.remove('dirty'); }
}

/* ── sidebar ──────────────────────────────────────────────────────────────── */
function renderSidebar() {
  if (!S) return;
  const t = S.stats.totals;
  $('#navLibCount').textContent = t.projects;
  $('#qfFav').textContent = t.favorites;
  $('#qfRun').textContent = S.running.length;
  $('#qfMiss').textContent = t.missing;
  $$('.side-filter').forEach((b) => b.classList.toggle('active', ui.quick === b.dataset.quick));
  $('#themeName').textContent = S.settings.theme;
  $('#themeDot').style.background = `linear-gradient(140deg, var(--accent), var(--accent-2))`;

  // tag cloud (keyed rebuild by signature)
  const tags = Object.entries(S.stats.tags).sort((a, b) => b[1] - a[1]).slice(0, 14);
  const cloud = $('#tagCloud');
  const sig = tags.map(([k, v]) => k + v).join('|') + '::' + (ui.lib.tagFilter || '');
  if (cloud.__sig !== sig) {
    cloud.__sig = sig;
    cloud.replaceChildren();
    if (!tags.length) {
      const hint = document.createElement('span');
      hint.className = 'env-empty'; hint.textContent = 'Add tags in the inspector';
      cloud.appendChild(hint);
      $('#tagHint').textContent = 'none yet';
    } else {
      $('#tagHint').textContent = tags.length + ' tags';
      for (const [tag, n] of tags) {
        const b = document.createElement('button');
        b.className = 'tag-pill' + (ui.lib.tagFilter === tag ? ' active' : '');
        b.dataset.tag = tag;
        b.textContent = `#${tag} ${n}`;
        b.title = `${n} project(s) tagged ${tag}`;
        cloud.appendChild(b);
      }
    }
  }
  const names = Object.keys(S.themes);
  $$('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.tab === ui.tab));
}

/* ── library filtering / grouping ─────────────────────────────────────────── */
function searchScore(p, q) {
  if (!q) return 1;
  const hay = p.__s || (p.__s = `${p.name} ${p.description} ${p.path} ${(p.tags || []).join(' ')}`.toLowerCase());
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;
  for (const tok of tokens) {
    const i = hay.indexOf(tok);
    if (i < 0) return -1;
    score += 10;
    if (p.name.toLowerCase().startsWith(tok)) score += 20;
    if (i < 12) score += 4;
  }
  return score;
}
function visibleProjects() {
  if (!S) return [];
  let list = S.projects.slice();
  const lib = ui.lib;
  if (ui.quick === 'favorites') list = list.filter((p) => p.favorite);
  if (ui.quick === 'running') list = list.filter((p) => p.running);
  if (ui.quick === 'missing') list = list.filter((p) => !p.exists);
  if (lib.typeFilter && lib.typeFilter !== 'all') list = list.filter((p) => p.kind === lib.typeFilter);
  if (lib.tagFilter) list = list.filter((p) => (p.tags || []).includes(lib.tagFilter));
  if (ui.query) list = list.filter((p) => searchScore(p, ui.query) >= 0);
  const dir = lib.sortDir === 'desc' ? -1 : 1;
  const cmp = {
    custom: (a, b) => (a.order - b.order) || a.name.localeCompare(b.name),
    name: (a, b) => a.name.localeCompare(b.name),
    runs: (a, b) => a.run_count - b.run_count,
    recent: (a, b) => tsOf(a) - tsOf(b),
    modified: (a, b) => ((a.spec && a.spec.mtime) || 0) - ((b.spec && b.spec.mtime) || 0),
    favorite: (a, b) => (Number(b.favorite) - Number(a.favorite)) || a.name.localeCompare(b.name),
    heat: (a, b) => (a.run_count || 0) - (b.run_count || 0),
  }[lib.sort] || ((a, b) => a.order - b.order);
  list.sort((a, b) => cmp(a, b) * dir || a.name.localeCompare(b.name));
  return list;
}
function groupProjects(list) {
  if (ui.lib.group === 'none') return [{ key: 'all', items: list }];
  const map = new Map();
  for (const p of list) {
    const key = ui.lib.group === 'type' ? p.kind : (p.favorite ? 'favorites' : 'other');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  const order = ui.lib.group === 'type' ? Object.keys(KIND) : ['favorites', 'other'];
  return order.filter((k) => map.has(k)).map((k) => ({
    key: k,
    title: ui.lib.group === 'type' ? (KIND[k] || { label: k }).label : (k === 'favorites' ? 'Favorites' : 'Everything else'),
    items: map.get(k),
  }));
}
function maxRuns() { return Math.max(1, ...S.projects.map((p) => p.run_count || 0)); }

/* ── library rendering (keyed) ────────────────────────────────────────────── */
function renderToolbar() {
  if (!S) return;
  const counts = { all: S.projects.length };
  const kinds = ['folder', 'python', 'node', 'app', 'batch', 'file', 'missing'];
  kinds.forEach((k) => counts[k] = S.projects.filter((p) => p.kind === k).length);
  const sig = JSON.stringify(counts) + ui.lib.typeFilter;
  const wrap = $('#typeChips');
  if (sig !== lastChipsSig) {
    lastChipsSig = sig;
    wrap.replaceChildren();
    const chips = [{ k: 'all', label: 'All' }].concat(kinds.map((k) => ({ k, label: KIND[k].label })));
    for (const c of chips) {
      if (c.k !== 'all' && !counts[c.k]) continue;
      const b = document.createElement('button');
      b.className = 'tchip' + (ui.lib.typeFilter === c.k ? ' on' : '');
      b.dataset.type = c.k;
      b.innerHTML = `${esc(c.label)}<b>${counts[c.k]}</b>`;
      wrap.appendChild(b);
    }
  } else {
    $$('.tchip', wrap).forEach((b) => b.classList.toggle('on', b.dataset.type === ui.lib.typeFilter));
  }
  $('#sortLabel').textContent = SORT_LABEL[ui.lib.sort] || 'Custom';
  $('#sortDir').textContent = ui.lib.sortDir === 'desc' ? '↓' : '↑';
  $('#groupLabel').textContent = ui.lib.group === 'none' ? 'None' : (ui.lib.group === 'type' ? 'Type' : 'Favorite');
  $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.viewMode === ui.lib.view));
  $('#libList').classList.toggle('grid', ui.lib.view === 'grid');
}

function rowHTML(p) {
  const k = KIND[p.kind] || KIND.file;
  return `
    <div class="rail"></div>
    <button class="sel-box" data-act="select" aria-label="Select project">✓</button>
    <div class="row-icon" style="--ic:${k.color}">${k.icon}</div>
    <div class="row-main">
      <div class="row-title">
        <span class="row-name"></span>
        <span class="badge" style="--ic:${k.color}">${k.tag}</span>
        <span class="row-tags"></span>
      </div>
      <div class="row-sub">
        <span class="row-desc"></span>
        <span class="row-thread" hidden><span class="run-pulse"></span>running</span>
      </div>
      <div class="row-path"></div>
    </div>
    <div class="row-meta">
      <div class="mstat"><b class="m-runs">0</b><span>runs</span></div>
      <div class="mstat"><b class="m-last">never</b><span>last run</span></div>
      <div class="heat"><i class="m-heat"></i></div>
    </div>
    <div class="row-actions">
      <button class="act run" data-act="run" title="Launch"><span class="a-ic"></span><span class="a-lbl">Run</span></button>
      <button class="act stop" data-act="stop" title="Stop" hidden><span class="a-ic"></span><span class="a-lbl">Stop</span></button>
      <button class="act" data-act="inspect" title="Edit in inspector">Edit</button>
      <button class="act more" data-act="menu" title="More actions">${ICON.dots}</button>
    </div>`;
}
function makeRow(p) {
  const el = document.createElement('article');
  el.className = 'row';
  el.dataset.projectId = p.id;
  el.setAttribute('role', 'listitem');
  el.innerHTML = rowHTML(p);
  el.__r = {
    name: $('.row-name', el), tags: $('.row-tags', el), desc: $('.row-desc', el),
    path: $('.row-path', el), runs: $('.m-runs', el), last: $('.m-last', el),
    heat: $('.m-heat', el), thread: $('.row-thread', el), runBtn: $('[data-act=run]', el),
    stopBtn: $('[data-act=stop]', el), ic: $('.row-icon', el), badge: $('.badge', el),
  };
  el.__r.runBtn.querySelector('.a-ic').innerHTML = ICON.play;
  el.__r.stopBtn.querySelector('.a-ic').innerHTML = ICON.stop;
  return el;
}
function updateRow(el, p) {
  const r = el.__r;
  const k = KIND[p.kind] || KIND.file;
  el.style.setProperty('--rail', p.color ? COLOR_HEX[p.color] : 'transparent');
  el.classList.toggle('selected', ui.selected.has(p.id));
  el.classList.toggle('cursor', ui.cursor === p.id);
  el.classList.toggle('running', !!p.running);
  el.dataset.kind = p.kind;
  setText(r.name, p.name);
  if (r.tags.__sig !== (p.tags || []).join(',')) {
    r.tags.__sig = (p.tags || []).join(',');
    r.tags.replaceChildren();
    for (const tag of (p.tags || []).slice(0, 3)) {
      const s = document.createElement('span'); s.className = 'row-tag'; s.textContent = '#' + tag; r.tags.appendChild(s);
    }
  }
  r.tags.hidden = !S.settings.appearance.showTags;
  setText(r.desc, p.description || '');
  r.desc.hidden = !p.description;
  r.thread.hidden = !p.running;
  setText(r.path, p.path);
  r.path.hidden = !S.settings.appearance.showPaths;
  setText(r.runs, p.run_count || 0);
  setText(r.last, p.last_run ? relTime(p.last_run) : 'never');
  r.heat.style.width = Math.round(((p.run_count || 0) / maxRuns()) * 100) + '%';
  $('.row-meta', el).style.display = S.settings.appearance.showMeta ? '' : 'none';
  $('.heat', el).parentElement.style.display = S.settings.appearance.showHeat ? '' : 'none';
  r.runBtn.hidden = !!p.running;
  r.stopBtn.hidden = !p.running;
  if (r.ic.dataset.kind !== p.kind) { r.ic.dataset.kind = p.kind; r.ic.innerHTML = k.icon; r.ic.style.setProperty('--ic', k.color); r.badge.style.setProperty('--ic', k.color); r.badge.textContent = k.tag; }
}
function cardHTML(p) {
  return `
    <div class="card-top">
      <div class="row-icon"></div>
      <div style="min-width:0;flex:1">
        <div class="card-name"></div>
        <div class="card-sub"></div>
      </div>
      <button class="fav-star" data-act="fav" title="Favorite">★</button>
    </div>
    <p class="card-desc"></p>
    <div class="card-tags"></div>
    <div class="card-foot">
      <span class="foot-runs">0 runs</span><span class="dot"></span><span class="foot-last">never</span>
      <button class="run-now" data-act="run">▶ Run</button>
    </div>
    <i class="card-meter" hidden></i>`;
}
function makeCard(p) {
  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.projectId = p.id;
  el.innerHTML = cardHTML(p);
  el.__r = {
    ic: $('.row-icon', el), name: $('.card-name', el), sub: $('.card-sub', el),
    desc: $('.card-desc', el), tags: $('.card-tags', el), runs: $('.foot-runs', el),
    last: $('.foot-last', el), fav: $('.fav-star', el), run: $('.run-now', el), meter: $('.card-meter', el),
  };
  return el;
}
function updateCard(el, p) {
  const r = el.__r; const k = KIND[p.kind] || KIND.file;
  const cfg = cardCfg();
  el.classList.toggle('selected', ui.selected.has(p.id));
  el.classList.toggle('cursor', ui.cursor === p.id);
  el.classList.toggle('running', !!p.running);
  el.classList.toggle('no-desc', !p.description || !(+cfg.showDesc));
  el.classList.toggle('hide-tags', !cfg.showTags);
  el.classList.toggle('hide-kind', !cfg.showKind);
  const heat = heatFor(p);
  const on = cfg.heat !== false;
  el.dataset.heat = on ? String(heat.tier) : 'off';
  el.style.setProperty('--heat', heat.color);
  el.style.setProperty('--heat-a', (0.22 + heat.ratio * 0.55).toFixed(2));
  el.style.setProperty('--heat-p', String(Math.round(heat.ratio * 100)));
  if (r.ic.dataset.kind !== p.kind) {
    r.ic.dataset.kind = p.kind; r.ic.innerHTML = k.icon; r.ic.style.setProperty('--ic', k.color);
  }
  setText(r.name, p.name);
  setText(r.sub, k.label + (p.color ? ' · labeled' : ''));
  setText(r.desc, p.description || 'No description yet.');
  if (r.tags.__sig !== (p.tags || []).join(',')) {
    r.tags.__sig = (p.tags || []).join(',');
    r.tags.replaceChildren();
    for (const t of (p.tags || []).slice(0, 4)) {
      const s = document.createElement('span'); s.className = 'row-tag'; s.textContent = '#' + t; r.tags.appendChild(s);
    }
  }
  setText(r.runs, cfg.runsChip === 'hidden' ? '' : cfg.runsChip === 'text'
    ? `${heat.runs} run${heat.runs === 1 ? '' : 's'}`
    : (heat.runs ? `${heat.runs}×` : 'new'));
  r.runs.hidden = cfg.runsChip === 'hidden';
  r.runs.title = `${heat.runs} launch${heat.runs === 1 ? '' : 'es'} · busiest project has ${HEAT_MAX}`;
  if (r.meter) {
    r.meter.hidden = !cfg.meter || !on;
    r.meter.dataset.tier = String(heat.tier);
    r.meter.title = `${Math.round(heat.ratio * 100)}% of the busiest project`;
  }
  setText(r.last, p.running ? 'running now' : relTime(p.last_run));
  r.fav.classList.toggle('on', !!p.favorite);
  r.run.textContent = p.running ? '■ Stop' : '▶ Run';
  r.run.dataset.act = p.running ? 'stop' : 'run';
}
function setText(node, v) { const s = String(v == null ? '' : v); if (node.textContent !== s) node.textContent = s; }

function renderLibrary() {
  if (!S) return;
  const t0 = performance.now();
  HEAT_MAX = Math.max(1, ...S.projects.map((p) => p.run_count || 0));   // stable under filters
  applyCardLive();
  const list = visibleProjects();
  const lib = $('#libList');
  const seen = new Set();
  const frag = document.createDocumentFragment();
  const groups = groupProjects(list);
  for (const g of groups) {
    if (g.title) {
      const key = 'h:' + g.key;
      let h = libNodes.get(key);
      if (!h) {
        h = document.createElement('div');
        h.className = 'group-head';
        h.innerHTML = `<span></span><span class="gh-line"></span><b></b>`;
        libNodes.set(key, h);
      }
      setText(h.firstElementChild, g.title);
      setText(h.querySelector('b'), g.items.length);
      frag.appendChild(h); seen.add(key);
    }
    for (const p of g.items) {
      let rec = libNodes.get(p.id);
      if (!rec) {
        rec = ui.lib.view === 'grid' ? makeCard(p) : makeRow(p);
        rec.classList.add('arrive');
        libNodes.set(p.id, rec);
      } else if (ui.lib.view === 'grid' && !rec.classList.contains('card')) {
        rec.remove(); rec = makeCard(p); libNodes.set(p.id, rec);
      } else if (ui.lib.view === 'list' && !rec.classList.contains('row')) {
        rec.remove(); rec = makeRow(p); libNodes.set(p.id, rec);
      }
      if (rec.classList.contains('row')) updateRow(rec, p); else updateCard(rec, p);
      frag.appendChild(rec); seen.add(p.id);
    }
  }
  for (const [key, node] of Array.from(libNodes)) {
    if (!seen.has(key)) { node.remove(); libNodes.delete(key); }
  }
  lib.appendChild(frag);

  // empty state
  const empty = $('#libEmpty');
  empty.hidden = list.length > 0;
  lib.hidden = list.length === 0;
  if (!list.length) {
    const filtering = ui.query || ui.quick || ui.lib.typeFilter !== 'all' || ui.lib.tagFilter;
    $('#emptyTitle').textContent = filtering ? 'No projects match' : 'Your library is empty';
    $('#emptyBody').textContent = filtering ? 'Try clearing filters or searching for something else.' : 'Add a file or folder to start launching projects from one place.';
  }
  $('#viewSub').textContent = subtitle(list);
  renderHeatLegend(list);
  const searchEl = $('#searchInput');
  if (document.activeElement !== searchEl && searchEl.value !== ui.query) searchEl.value = ui.query;
  $('.s-clear').hidden = !ui.query;
  renderQuickBar();
  updateBatchBar();
  ui.renders++;
  ui.lastRenderMs = Math.round((performance.now() - t0) * 10) / 10;
}
function subtitle(list) {
  const running = S.running.length;
  const parts = [`${list.length} of ${S.projects.length} project${S.projects.length === 1 ? '' : 's'}`];
  if (running) parts.push(`${running} running`);
  if (ui.lib.tagFilter) parts.push(`#${ui.lib.tagFilter}`);
  if (ui.lib.sort === 'custom' && !ui.query) parts.push('drag order');
  return parts.join('  ·  ');
}
function renderQuickBar() {
  const chips = [];
  if (ui.query) chips.push({ label: `"${ui.query}"`, kind: 'query' });
  if (ui.quick) chips.push({ label: ui.quick, kind: 'quick' });
  if (ui.lib.typeFilter !== 'all') chips.push({ label: (KIND[ui.lib.typeFilter] || {}).label || ui.lib.typeFilter, kind: 'type' });
  if (ui.lib.tagFilter) chips.push({ label: '#' + ui.lib.tagFilter, kind: 'tag' });
  const bar = $('#quickBar');
  bar.hidden = chips.length === 0;
  if (!chips.length) return;
  const wrap = $('#quickChips');
  wrap.replaceChildren();
  for (const c of chips) {
    const s = document.createElement('span');
    s.className = 'qb-chip';
    s.innerHTML = `${esc(c.label)}<button data-act="clear-chip" data-kind="${c.kind}" title="Remove filter">✕</button>`;
    wrap.appendChild(s);
  }
}

/* ── inspector ────────────────────────────────────────────────────────────── */
function projectById(id) { return S && S.projects.find((p) => p.id === id); }
function openInspector(id) {
  if (!projectById(id)) return;
  ui.inspectorId = id;
  renderInspector();
  applyLive();
}
function closeInspector() {
  ui.inspectorId = null;
  applyLive();
}
function envRow(k = '', v = '', act = 'env-del') {
  return `<div class="env-row"><input class="env-key" data-env="k" placeholder="KEY" value="${esc(k)}" spellcheck="false"><input class="env-val" data-env="v" placeholder="value" value="${esc(v)}" spellcheck="false"><button class="env-del" data-act="${act}" title="Remove">✕</button></div>`;
}
function renderInspector() {
  const p = projectById(ui.inspectorId);
  const body = $('#inspBody');
  if (!p) { body.innerHTML = ''; $('#inspSub').textContent = '—'; return; }
  const k = KIND[p.kind] || KIND.file;
  const tags = (p.tags || []).map((t) => `<span class="tag-chip">${esc(t)}<button data-act="tag-del" data-tag="${esc(t)}">✕</button></span>`).join('');
  const env = (p.env || []).map((e) => envRow(e.k, e.v)).join('');
  const colors = ['', ...Object.keys(COLOR_HEX)].map((c) => `<button class="swatch ${c ? '' : 'none'} ${(p.color || '') === c ? 'on' : ''}" data-act="color" data-color="${c}" style="${c ? `background:${COLOR_HEX[c]}` : ''}" title="${c || 'None'}"></button>`).join('');
  body.innerHTML = `
    <div class="insp-hero">
      <div class="row-icon" style="--ic:${k.color}">${k.icon}</div>
      <div class="insp-hero-meta">
        <div class="nm">${esc(p.name)}</div>
        <div class="pth" title="${esc(p.path)}">${esc(p.path)}</div>
      </div>
      ${p.running ? '<span class="run-dot" title="Running"></span>' : ''}
    </div>
    <div class="insp-actions">
      <button class="btn primary" data-act="insp-run">${p.running ? '■ Stop' : '▶ Run'}</button>
      <button class="btn ghost icon-only" data-act="insp-folder" title="Open containing folder">${ICON.folder}</button>
      <button class="btn ghost icon-only" data-act="insp-terminal" title="Open terminal here">${ICON.terminal}</button>
      <button class="btn ghost icon-only" data-act="insp-logs" title="Show this app's log">${ICON.log}</button>
      <button class="btn ghost icon-only" data-act="insp-copy" title="Copy path">${ICON.copy}</button>
    </div>

    <div class="insp-section">
      <div class="insp-sec-head"><h4>Identity</h4><button class="fav-star ${p.favorite ? 'on' : ''}" data-act="insp-fav" title="Favorite">★</button></div>
      <div class="field"><label for="fName">Name</label><input id="fName" type="text" data-field="name" value="${esc(p.name)}"></div>
      <div class="field"><label for="fDesc">Description</label><textarea id="fDesc" data-field="description" placeholder="What does this project do?">${esc(p.description)}</textarea></div>
      <div class="field"><label>Tags</label><div class="tag-editor"><span class="tag-list">${tags}</span><input id="tagInput" placeholder="Add tag + ↵" autocomplete="off"></div></div>
      <div class="field"><label>Color label</label><div class="swatches">${colors}</div></div>
    </div>

    <div class="insp-section">
      <div class="insp-sec-head"><h4>Target</h4><span class="field-hint">${k.label}${p.exists ? '' : ' · missing'}</span></div>
      <div class="field"><label for="fPath">Path</label><input id="fPath" type="text" data-field="path" value="${esc(p.path)}" spellcheck="false"></div>
      <div class="toggle-row">
        <div class="tr-copy"><b>Custom shell command</b><span>Run a command instead of the file directly</span></div>
        <label class="switch"><input type="checkbox" data-field="shell" ${p.shell ? 'checked' : ''}><span></span></label>
      </div>
      <div class="field" ${p.shell ? '' : 'style="display:none"'}>
        <label for="fCmd">Command</label>
        <input id="fCmd" type="text" data-field="custom_command" value="${esc(p.custom_command)}" placeholder="npm run dev" spellcheck="false">
      </div>
      <div class="field-row">
        <div class="field"><label for="fArgs">Arguments</label><input id="fArgs" type="text" data-field="args" value="${esc(p.args)}" placeholder="--port 3000" spellcheck="false"></div>
        <div class="field"><label for="fWork">Working dir</label><input id="fWork" type="text" data-field="workdir" value="${esc(p.workdir)}" placeholder="default" spellcheck="false"></div>
      </div>
    </div>

    <div class="insp-section">
      <div class="insp-sec-head"><h4>Execution</h4></div>
      <div class="toggle-row">
        <div class="tr-copy"><b>Console window</b><span>Debug only — runs in a real terminal instead of the Logs view</span></div>
        <label class="switch"><input type="checkbox" data-field="terminal" ${p.terminal ? 'checked' : ''}><span></span></label>
      </div>
      <div class="toggle-row">
        <div class="tr-copy"><b>Kill previous instance</b><span>Stop the old process before starting</span></div>
        <label class="switch"><input type="checkbox" data-field="kill_prev" ${p.kill_prev ? 'checked' : ''}><span></span></label>
      </div>
      <div class="toggle-row">
        <div class="tr-copy"><b>Launch on startup</b><span>Run automatically when Nexus opens</span></div>
        <label class="switch"><input type="checkbox" data-field="startup" ${p.startup ? 'checked' : ''}><span></span></label>
      </div>
      <div class="field"><label>Process priority</label>
        <div class="prio-seg">${Object.entries(PRIOS).map(([v, l]) => `<button data-act="prio" data-prio="${v}" class="${p.priority === v ? 'on' : ''}">${l}</button>`).join('')}</div>
      </div>
      <div class="field"><label for="fDelay">Launch delay · <b class="delay-val">${p.delay || 0} ms</b></label><input id="fDelay" type="range" min="0" max="5000" step="50" value="${p.delay || 0}" data-field="delay"><div class="field-hint">Wait before spawning — handy for network mounts.</div></div>
    </div>

    <div class="insp-section">
      <div class="insp-sec-head"><h4>Environment</h4><button class="mini-add" data-act="env-add">+ Add variable</button></div>
      <div class="env-list">${env || '<div class="env-empty">No environment overrides.</div>'}</div>
    </div>

    <div class="insp-section">
      <div class="insp-sec-head"><h4>Notes</h4></div>
      <div class="field"><textarea data-field="notes" placeholder="Anything worth remembering…" style="min-height:74px">${esc(p.notes)}</textarea></div>
    </div>

    <div class="insp-section">
      <div class="insp-sec-head"><h4>Details</h4></div>
      <div class="meta-grid">
        <div class="meta-cell"><span>Runs</span><b>${p.run_count || 0}</b></div>
        <div class="meta-cell"><span>Last run</span><b>${esc(relTime(p.last_run))}</b></div>
        <div class="meta-cell"><span>Size</span><b>${p.spec && p.spec.exists ? fmtBytes(p.spec.size) : (p.kind === 'folder' && p.spec ? p.spec.entries + ' items' : '—')}</b></div>
        <div class="meta-cell"><span>Modified</span><b>${p.spec && p.spec.mtime ? relTime(p.spec.mtime) : '—'}</b></div>
      </div>
    </div>

    <div class="insp-section">
      <div class="danger-zone">
        <p>Removing only forgets the entry — files stay untouched.</p>
        <button class="btn danger" data-act="insp-delete">Remove from library</button>
      </div>
    </div>`;
  $('#inspSub').textContent = p.name;
  const cmdField = $('[data-field=custom_command]', body)?.closest('.field');
  const shellToggle = $('[data-field=shell]', body);
  if (shellToggle && cmdField) shellToggle.addEventListener('change', () => { cmdField.style.display = shellToggle.checked ? '' : 'none'; });
}
function currentProject() { return projectById(ui.inspectorId); }
function queueFieldSave(id, patch) {
  const cur = ui.dirtyFields.get(id) || {};
  ui.dirtyFields.set(id, Object.assign(cur, patch));
  clearTimeout(ui.fieldTimers.get(id));
  markDirty();
  ui.fieldTimers.set(id, setTimeout(async () => {
    const payload = ui.dirtyFields.get(id) || {};
    ui.dirtyFields.delete(id);
    const r = await call(api.updateProject(id, payload), { skipInspector: true });
    if (r && r.ok) { markSaved(); renderLibrary(); }
  }, 420));
}
function updateLocalProject(id, patch) {
  const p = projectById(id);
  if (p) Object.assign(p, patch);
}

/* ── settings view ────────────────────────────────────────────────────────── */
const SHORTCUTS = [
  [['Ctrl', 'K'], 'Command palette'], [['/'], 'Focus search'], [['Esc'], 'Dismiss overlay / inspector'],
  [['Ctrl', '1'], 'Library'], [['Ctrl', '2'], 'Analytics'], [['Ctrl', '3'], 'Activity'], [['Ctrl', '4'], 'Logs'], [['Ctrl', '5'], 'Settings'],
  [['↑', '↓'], 'Move selection in library'], [['↵'], 'Launch cursor project'], [['Delete'], 'Remove selection'],
  [['Ctrl', 'B'], 'Collapse sidebar'], [['Ctrl', 'N'], 'Add file'], [['Ctrl', 'Shift', 'N'], 'Scan folder'],
  [['Ctrl', 'Shift', 'P'], 'Performance HUD'], [['Ctrl', 'Shift', 'T'], 'Cycle theme'], [['F1'], 'This shortcut map'],
  [['←', '→'], 'Move selection'], [['↵'], 'Launch focused project'],
];
function sectionAppearance() {
  const a = S.settings.appearance, acc = S.settings.accent;
  return `
  <div class="set-group"><h3>Theme</h3>
    <div class="set-row full"><div class="theme-grid">${Object.entries(S.themes).map(([name, t]) => `
      <button class="theme-tile ${S.settings.theme === name ? 'on' : ''}" data-theme-set="${esc(name)}">
        <span class="theme-swatches"><i style="background:${esc(t.bg)}"></i><i style="background:${esc(t.card_bg)}"></i><i style="background:${esc(t.primary)}"></i><i style="background:${esc(t.accent)}"></i></span>
        <b>${esc(name)}</b><span>${t.mode === 'light' ? 'Light' : 'Dark'}</span>
      </button>`).join('')}</div>
    </div>
  </div>
  <div class="set-group"><h3>Accent override</h3>
    ${toggleRow('accent.custom', 'Custom accent', 'Ignore the theme accent and use your own hue.')}
    <div class="set-row"><div class="set-copy"><b>Hue</b><span>0° red → 120° green → 240° blue</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="0" max="360" step="1" data-range="accent.hue" data-unit="°" value="${acc.hue}"><b class="range-val">${acc.hue}°</b></div></div></div>
    <div class="set-row"><div class="set-copy"><b>Saturation</b><span>How vivid the accent reads.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="0" max="100" step="1" data-range="accent.saturation" data-unit="%" value="${acc.saturation}"><b class="range-val">${acc.saturation}%</b></div></div></div>
    <div class="set-row"><div class="set-copy"><b>Lightness</b><span>Pastel at the top, neon at the bottom.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="30" max="85" step="1" data-range="accent.lightness" data-unit="%" value="${acc.lightness}"><b class="range-val">${acc.lightness}%</b></div></div></div>
  </div>
  <div class="set-group"><h3>Surface</h3>
    <div class="set-row"><div class="set-copy"><b>Window opacity</b><span>Fade the whole interface.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="50" max="100" step="1" data-range="appearance.opacity" data-unit="%" value="${Math.round(a.opacity * 100)}"><b class="range-val">${Math.round(a.opacity * 100)}%</b></div></div></div>
    <div class="set-row"><div class="set-copy"><b>Glass blur</b><span>Backdrop blur on panels and the chrome.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="0" max="44" step="1" data-range="appearance.blur" data-unit="px" value="${a.blur}"><b class="range-val">${a.blur}px</b></div></div></div>
    <div class="set-row"><div class="set-copy"><b>Corner radius</b><span>Cards, panels and controls.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="0" max="28" step="1" data-range="appearance.radius" data-unit="px" value="${a.radius}"><b class="range-val">${a.radius}px</b></div></div></div>
    <div class="set-row"><div class="set-copy"><b>Ambient glow</b><span>Strength of the aurora behind the glass.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="0" max="100" step="1" data-range="appearance.glow" data-unit="%" value="${a.glow}"><b class="range-val">${a.glow}%</b></div></div></div>
    <div class="set-row"><div class="set-copy"><b>Film grain</b><span>Subtle texture over the gradient.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="0" max="100" step="1" data-range="appearance.noise" data-unit="%" value="${a.noise}"><b class="range-val">${a.noise}%</b></div></div></div>
  </div>
  <div class="set-group"><h3>Motion</h3>
    ${toggleRow('appearance.animations', 'Animations', 'Entrance, hover and layout transitions.')}
    <div class="set-row"><div class="set-copy"><b>Animation speed</b><span>Multiplier applied to every transition.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="0.4" max="2" step="0.05" data-range="appearance.motion" data-unit="×" value="${a.motion}"><b class="range-val">${(+a.motion).toFixed(2)}×</b></div></div></div>
  </div>`;
}
function sectionCards() {
  const c = cardCfg();
  const opts = (key, list) => `<select data-set="${key}">${list.map(([v, l]) => `<option value="${v}" ${String(c[key]) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const rng = (key, label, hint, min, max, step, unit, val) => `
    <div class="set-row"><div class="set-copy"><b>${label}</b><span>${hint}</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="${min}" max="${max}" step="${step}" data-range="cards.${key}" data-unit="${unit}" value="${val}"><b class="range-val">${val}${unit === '×' ? '' : unit}</b></div></div></div>`;
  return `
  <div class="set-group"><h3>Execution-count accent</h3>
    ${toggleRow('cards.heat', 'Accent cards by launch count', 'Green = rarely launched, amber = middle, red = heaviest.')}
    <div class="set-row"><div class="set-copy"><b>Scale</b><span>How a run count becomes a position on the green→red scale.</span></div>
      <div class="set-control">${opts('heatMode', [['relative', 'Relative to busiest'], ['absolute', 'Absolute (20 runs = hot)'], ['log', 'Logarithmic']])}</div></div>
    <div class="set-row"><div class="set-copy"><b>Accent shape</b><span>Where the colour appears on the card.</span></div>
      <div class="set-control">${opts('heatStyle', [['spine', 'Left spine'], ['top', 'Top edge'], ['border', 'Full border'], ['glow', 'Outer glow'], ['none', 'No shape']])}</div></div>
    <div class="set-row"><div class="set-copy"><b>Palette</b><span>Traffic-light, derived from the theme, or your own three colours.</span></div>
      <div class="set-control">${opts('palette', [['traffic', 'Green / amber / red'], ['accent', 'Theme accent ramp'], ['custom', 'Custom colours']])}</div></div>
    ${c.palette === 'custom' ? `<div class="set-row"><div class="set-copy"><b>Custom stops</b><span>Low, middle and high launch frequency.</span></div>
      <div class="set-control" style="display:flex;gap:6px">
        <input type="color" data-set="cards.heatCool" value="${esc(c.heatCool)}" title="Low">
        <input type="color" data-set="cards.heatWarm" value="${esc(c.heatWarm)}" title="Middle">
        <input type="color" data-set="cards.heatHot" value="${esc(c.heatHot)}" title="High">
      </div></div>` : ''}
    ${rng('heatMid', 'Green → amber at', 'Percent of the scale where the middle tier starts.', 10, 80, 1, '%', c.heatMid)}
    ${rng('heatHigh', 'Amber → red at', 'Percent of the scale where the hot tier starts.', 15, 95, 1, '%', c.heatHigh)}
    ${rng('heatThickness', 'Spine / edge width', 'Thickness of the accent bar.', 1, 8, 1, 'px', c.heatThickness)}
    ${rng('heatIntensity', 'Accent intensity', 'How strongly the colour is painted.', 10, 100, 5, '%', c.heatIntensity)}
    ${toggleRow('cards.meter', 'Heat meter', 'A thin bar showing the exact share of the busiest project.')}
    ${toggleRow('cards.legend', 'Legend in the toolbar', 'Live counts of cards in each tier.')}
  </div>
  <div class="set-group"><h3>Card layout</h3>
    <div class="set-row"><div class="set-copy"><b>Density</b><span>Ultra is the tightest; comfortable gives the description room.</span></div>
      <div class="set-control">${opts('density', [['ultra', 'Ultra compact'], ['compact', 'Compact'], ['comfortable', 'Comfortable']])}</div></div>
    ${rng('minWidth', 'Minimum card width', 'Grid decides the column count from this.', 140, 320, 2, 'px', c.minWidth)}
    ${rng('gap', 'Grid gap', 'Space between cards.', 0, 20, 1, 'px', c.gap)}
    ${rng('showDesc', 'Description lines', '0 hides the description row entirely.', 0, 3, 1, '', c.showDesc)}
    ${toggleRow('cards.showKind', 'Kind sub-line', 'Folder / Python / EXE under the name.')}
    ${toggleRow('cards.showTags', 'Tags', 'Hashtags at the bottom of the card.')}
    <div class="set-row"><div class="set-copy"><b>Launch-count chip</b><span>What the chip in the footer reads.</span></div>
      <div class="set-control">${opts('runsChip', [['count', 'Number (12×)'], ['text', 'Text (12 runs)'], ['hidden', 'Hidden']])}</div></div>
    <div class="set-note">Double-click any card to launch it (respects Behavior → double-click to run). Sort by <b>Heat</b> to bring the reddest projects to the front.</div>
  </div>`;
}
function sectionLayout() {
  const a = S.settings.appearance;
  const preset = (p) => `<button class="btn ghost" data-act="preset" data-preset="${p.key}">${esc(p.label)}</button>`;
  return `
  <div class="set-group"><h3>Density presets</h3>
    <div class="set-row full">
      <div class="set-control" style="justify-content:flex-start;flex-wrap:wrap;gap:6px">
        ${[['ultra', 'Ultra compact'], ['compact', 'Compact'], ['comfortable', 'Comfortable'], ['roomy', 'Roomy']].map(preset).join('')}
      </div>
    </div>
    <div class="set-note">A preset sets row height, font scale, sidebar and inspector width in one click — every value stays individually adjustable below.</div>
  </div>
  <div class="set-group"><h3>Density</h3>
    <div class="set-row"><div class="set-copy"><b>Row height</b><span>${Math.round(a.density)}px per project row.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="40" max="96" step="1" data-range="appearance.density" data-unit="px" value="${a.density}"><b class="range-val">${a.density}px</b></div></div></div>
    <div class="set-row"><div class="set-copy"><b>Font scale</b><span>Scales every label in the app.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="0.8" max="1.3" step="0.01" data-range="appearance.fontScale" data-unit="×" value="${a.fontScale}"><b class="range-val">${(+a.fontScale).toFixed(2)}×</b></div></div></div>
    <div class="set-row"><div class="set-copy"><b>Default view</b><span>List is denser; grid is more visual.</span></div>
      <div class="set-control"><div class="seg">${['list', 'grid'].map((v) => `<button data-set-view="${v}" class="${ui.lib.view === v ? 'on' : ''}">${v === 'list' ? 'List' : 'Grid'}</button>`).join('')}</div></div></div>
    ${toggleRow('appearance.sidebarCollapsed', 'Collapsed sidebar', 'Icon-only rail, more room for projects.')}
    <div class="set-row"><div class="set-copy"><b>Sidebar width</b><span>Expanded sidebar width.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="190" max="320" step="2" data-range="appearance.sidebarWidth" data-unit="px" value="${a.sidebarWidth}"><b class="range-val">${a.sidebarWidth}px</b></div></div></div>
    <div class="set-row"><div class="set-copy"><b>Inspector width</b><span>Detail drawer width.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="300" max="520" step="2" data-range="appearance.inspectorWidth" data-unit="px" value="${a.inspectorWidth}"><b class="range-val">${a.inspectorWidth}px</b></div></div></div>
  </div>
  <div class="set-group"><h3>Row content</h3>
    ${toggleRow('appearance.showPaths', 'Show paths', 'File or folder location under each name.')}
    ${toggleRow('appearance.showTags', 'Show tags', 'Tag chips in list rows.')}
    ${toggleRow('appearance.showMeta', 'Show run stats', 'Run counter and last-opened column.')}
    ${toggleRow('appearance.showHeat', 'Show heat bar', 'Relative launch frequency.')}
  </div>`;
}
function sectionBehavior() {
  const b = S.settings.behavior;
  return `
  <div class="set-group"><h3>Interaction</h3>
    ${toggleRow('behavior.dblclickRun', 'Double-click to launch', 'Single click opens the inspector.')}
    ${toggleRow('behavior.confirmDelete', 'Confirm removals', 'Ask before forgetting a project.')}
    ${toggleRow('behavior.notifyOnLaunch', 'Launch notifications', 'Native toast when a process starts.')}
    <div class="set-row"><div class="set-copy"><b>Toast duration</b><span>How long in-app messages stay.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="1200" max="12000" step="200" data-range="behavior.toastDuration" data-unit="ms" value="${b.toastDuration}"><b class="range-val">${(b.toastDuration / 1000).toFixed(1)}s</b></div></div></div>
  </div>
  <div class="set-group"><h3>Window</h3>
    ${toggleRow('behavior.alwaysOnTop', 'Always on top', 'Keep Nexus above other windows.')}
    ${toggleRow('behavior.hideOnClose', 'Close to tray', 'Closing hides the window instead of quitting.')}
    ${toggleRow('behavior.confirmQuit', 'Confirm quit', 'Ask before exiting completely.')}
    ${toggleRow('behavior.startMinimized', 'Start hidden', 'Launch into the tray at login.')}
    ${toggleRow('behavior.launchAtLogin', 'Launch at login', 'Register Nexus with Windows startup (packaged builds).')}
    ${toggleRow('behavior.globalHotkeys', 'Global hotkey', 'Ctrl+Alt+N shows or hides Nexus from anywhere.')}
  </div>
  <div class="set-group"><h3>Data safety</h3>
    ${toggleRow('behavior.autoBackup', 'Automatic backups', 'Snapshot config at most every five minutes.')}
    <div class="set-row"><div class="set-copy"><b>Backups to keep</b><span>Older snapshots are pruned automatically.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="1" max="30" step="1" data-range="behavior.backupKeep" data-unit="" value="${b.backupKeep}"><b class="range-val">${b.backupKeep}</b></div></div></div>
  </div>`;
}
function sectionLaunch() {
  const l = S.settings.launch;
  return `
  <div class="set-group"><h3>Defaults</h3>
    ${toggleRow('launch.debugConsole', 'Visible console window', 'Debug hatch — every launch opens a real terminal instead of capturing here.')}
    ${toggleRow('launch.killPrev', 'Kill previous instance', 'Stop a running copy before launching again.')}
    <div class="set-row"><div class="set-copy"><b>Process priority</b><span>Windows scheduling class for spawned processes.</span></div>
      <div class="set-control"><select data-set="launch.priority">${Object.entries(PRIOS).map(([v, lb]) => `<option value="${v}" ${l.priority === v ? 'selected' : ''}>${lb}</option>`).join('')}</select></div></div>
    <div class="set-row"><div class="set-copy"><b>Default delay</b><span>Extra wait before every spawn.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="0" max="5000" step="50" data-range="launch.delay" data-unit="ms" value="${l.delay}"><b class="range-val">${l.delay}ms</b></div></div></div>
  </div>
  <div class="set-group"><h3>Global environment</h3>
    <div class="set-note">Merged into every launch. Project-level variables win on conflict.</div>
    <div class="env-list" id="globalEnv">${(l.env || []).map((e) => envRow(e.k, e.v, 'env-global-del')).join('') || '<div class="env-empty">No global variables.</div>'}</div>
    <div class="set-row full"><button class="btn ghost" data-act="global-env-add" style="width:max-content">+ Add global variable</button></div>
  </div>
  <div class="set-group"><h3>Captured output</h3>
    <div class="set-note">Apps run without a console window. Their stdout and stderr stream into the Logs view and are kept as a file per app (rotated at 2 MB).</div>
    <div class="set-row"><div class="set-copy"><b>Log files</b><span>Open the folder to inspect raw output outside Nexus.</span></div>
      <div class="set-control" style="display:flex;gap:6px"><button class="btn ghost" data-act="log-open-dir">Open folder</button><button class="btn ghost" data-act="log-export">Export</button><button class="btn ghost" data-act="log-clear">Clear</button></div></div>
  </div>`;
}
function sectionPerformance() {
  const b = S.settings.behavior;
  return `
  <div class="set-group"><h3>Runtime</h3>
    ${toggleRow('behavior.liveMetrics', 'Live system metrics', 'Poll CPU / memory while the window is visible.')}
    <div class="set-row"><div class="set-copy"><b>Metric interval</b><span>Lower is smoother, higher is cheaper.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="500" max="10000" step="250" data-range="behavior.metricsInterval" data-unit="ms" value="${b.metricsInterval}"><b class="range-val">${b.metricsInterval}ms</b></div></div></div>
    ${toggleRow('behavior.autoSpecs', 'Background file specs', 'Warm sizes and mtimes once after boot.')}
    <div class="set-row"><div class="set-copy"><b>Search debounce</b><span>Delay before filtering as you type.</span></div>
      <div class="set-control"><div class="range-wrap"><input type="range" min="0" max="300" step="10" data-range="behavior.searchDebounce" data-unit="ms" value="${b.searchDebounce}"><b class="range-val">${b.searchDebounce}ms</b></div></div></div>
    ${toggleRow('appearance.perfHud', 'Performance HUD', 'FPS, frame time, render cost and DOM size (Ctrl+Shift+P).')}
  </div>
  <div class="set-group"><h3>Diagnostics</h3>
    <div class="set-row"><div class="set-copy"><b>Render benchmark</b><span>Re-renders the library 30× and reports the average frame cost.</span></div>
      <div class="set-control"><button class="btn ghost" data-act="benchmark">Run benchmark</button></div></div>
    <div class="set-row"><div class="set-copy"><b>File specs</b><span>Refresh cached sizes and modification times.</span></div>
      <div class="set-control"><button class="btn ghost" data-act="refresh-specs">Refresh now</button></div></div>
    <div class="set-note" id="benchResult">Keyed DOM reuse · content-visibility skipping · delegated listeners · rAF-batched updates.</div>
  </div>`;
}
function sectionShortcuts() {
  return `<div class="set-group"><h3>Keyboard map</h3><div class="shortcut-table">${SHORTCUTS.map(([keys, label]) => `<div class="sc-row"><div class="sc-keys">${keys.map((k) => `<kbd>${esc(k)}</kbd>`).join('')}</div><span>${esc(label)}</span></div>`).join('')}</div></div>`;
}
function sectionStorage() {
  const m = S.meta;
  return `
  <div class="set-group"><h3>Where everything lives</h3>
    <div class="storage-paths">
      <div class="path-card"><code>${esc(m.configDir)}</code><button data-act="open-config">Open</button></div>
      <div class="path-card"><code>${esc(m.backupDir)}</code><button data-act="open-config">Open</button></div>
    </div>
    <div class="set-row full"><div class="kv"><dt>Config file</dt><dd>${esc(m.configFile)}</dd><dt>Migrated from</dt><dd>${esc(m.migratedFrom || 'fresh install')}</dd><dt>Projects</dt><dd>${S.projects.length}</dd><dt>Launch rows</dt><dd>${S.stats.totals.launchesLogged}</dd></div></div>
    <div class="set-row"><div class="set-copy"><b>Re-import v4 settings</b><span>Copies theme, sorting, window and behavior preferences again — the original app folder is never modified.</span></div><div class="set-control"><button class="btn ghost" data-act="import-legacy">Re-import</button></div></div>
  </div>
  <div class="set-group"><h3>Portability</h3>
    <div class="set-row"><div class="set-copy"><b>Backup now</b><span>Timestamped copy of config and history.</span></div><div class="set-control"><button class="btn ghost" data-act="backup">Back up</button></div></div>
    <div class="set-row"><div class="set-copy"><b>Export configuration</b><span>Share projects and preferences as JSON.</span></div><div class="set-control"><button class="btn ghost" data-act="export">Export…</button></div></div>
    <div class="set-row"><div class="set-copy"><b>Import configuration</b><span>Replaces the library after taking a backup.</span></div><div class="set-control"><button class="btn ghost" data-act="import">Import…</button></div></div>
  </div>
  <div class="set-group"><h3>Reset</h3>
    <div class="set-row"><div class="set-copy"><b>Clear statistics</b><span>Resets run counts and the activity timeline.</span></div><div class="set-control"><button class="btn ghost" data-act="reset-stats">Clear stats</button></div></div>
    <div class="set-row"><div class="set-copy"><b>Factory reset</b><span>Wipes projects and settings — a backup is taken first.</span></div><div class="set-control"><button class="btn danger" data-act="reset-all">Reset everything</button></div></div>
  </div>`;
}
function sectionAbout() {
  const m = S.meta;
  return `
  <div class="set-group"><div class="about-hero"><div class="about-orb">◆</div><div><h2>Project Nexus v5</h2><p>Granular launcher studio · Electron ${esc(m.electron)}</p></div></div>
    <div class="set-row full"><div class="kv">
      <dt>Version</dt><dd>${esc(m.version)}</dd>
      <dt>Chromium</dt><dd>${esc(m.chrome)}</dd>
      <dt>Node</dt><dd>${esc(m.node)}</dd>
      <dt>Platform</dt><dd>${esc(m.platform)}</dd>
      <dt>Data folder</dt><dd>${esc(m.configDir)}</dd>
    </div></div>
    <div class="set-row"><div class="set-copy"><b>Shortcut map</b><span>Every action has a key.</span></div><div class="set-control"><button class="btn ghost" data-act="help">Open &nbsp;F1</button></div></div>
    <div class="set-note">Built with a hand-written renderer: no framework, no runtime dependency beyond Electron. Glass surfaces, GPU-only motion and keyed DOM reconciliation keep the window responsive with large libraries.</div>
  </div>`;
}
function toggleRow(key, label, hint) {
  const v = !!getPath(S.settings, key);
  return `<div class="set-row"><div class="set-copy"><b>${esc(label)}</b><span>${esc(hint || '')}</span></div>
    <div class="set-control"><label class="switch"><input type="checkbox" data-set="${key}" ${v ? 'checked' : ''}><span></span></label></div></div>`;
}
function renderSettings() {
  if (!S) return;
  const body = $('#settingsBody');
  const sec = ui.settingsSection;
  const map = { appearance: sectionAppearance, layout: sectionLayout, cards: sectionCards, behavior: sectionBehavior, launch: sectionLaunch, performance: sectionPerformance, shortcuts: sectionShortcuts, storage: sectionStorage, about: sectionAbout };
  body.innerHTML = (map[sec] || sectionAppearance)();
  $$('.set-nav').forEach((b) => b.classList.toggle('active', b.dataset.section === sec));
  // paint range fills
  $$('input[type=range]', body).forEach(paintRange);
  const pill = $('#savePill');
  if (pill) {
    pill.textContent = ui.saveState === 'dirty' ? 'Saving…' : 'All changes saved';
    pill.classList.toggle('dirty', ui.saveState === 'dirty');
  }
}
function paintRange(input) {
  const min = +input.min || 0, max = +input.max || 100, val = +input.value || 0;
  const pct = clamp(((val - min) / (max - min)) * 100, 0, 100);
  input.style.setProperty('--fill', pct + '%');
  const out = input.parentElement.querySelector('.range-val');
  if (out) {
    const unit = input.dataset.unit;
    if (unit === '×') out.textContent = (+val).toFixed(2) + '×';
    else if (unit === '%') out.textContent = Math.round(val) + '%';
    else if (input.dataset.range === 'behavior.toastDuration') out.textContent = (val / 1000).toFixed(1) + 's';
    else out.textContent = val + (unit || '');
  }
}
const PRESETS = {
  ultra: { density: 40, fontScale: 0.88, radius: 10, sidebarWidth: 196, inspectorWidth: 318, blur: 12, noise: 6 },
  compact: { density: 46, fontScale: 0.94, radius: 12, sidebarWidth: 210, inspectorWidth: 336, blur: 18, noise: 10 },
  comfortable: { density: 58, fontScale: 1, radius: 14, sidebarWidth: 232, inspectorWidth: 360, blur: 22, noise: 14 },
  roomy: { density: 72, fontScale: 1.06, radius: 16, sidebarWidth: 248, inspectorWidth: 382, blur: 24, noise: 16 },
};
function applyDensityPreset(key) {
  const p = PRESETS[key];
  if (!p) return;
  patchSettings({ appearance: Object.assign({}, p) }, true);
  applyLive();
  if (ui.tab === 'settings') renderSettings();
  renderLibrary();
  toast('success', 'Layout preset', key.charAt(0).toUpperCase() + key.slice(1) + ' · ' + p.density + 'px rows');
}
function settingsValue(key, val) {
  const patch = {};
  if (key === 'appearance.opacity') val = clamp(+val / 100, 0.5, 1);
  if (key === 'appearance.density' || key === 'appearance.sidebarWidth' || key === 'appearance.inspectorWidth') val = +val;
  if (key === 'appearance.motion' || key === 'appearance.fontScale') val = +val;
  if (key === 'appearance.blur' || key === 'appearance.radius' || key === 'appearance.noise' || key === 'appearance.glow') val = +val;
  setPath(patch, key, val);
  patchSettings(patch);
  if (key === 'appearance.sidebarCollapsed') applyLive();
  if (key.startsWith('appearance.') && ui.tab === 'library') { /* live CSS already applied */ }
}

/* ── analytics ────────────────────────────────────────────────────────────── */
let chartLayout = null;
function renderAnalytics() {
  if (!S) return;
  const t = S.stats.totals;
  const kpis = [
    { label: 'Projects', num: t.projects, note: `${t.exists} reachable`, cls: '' },
    { label: 'Last 7 days', num: t.week, note: 'launches', cls: 'accent' },
    { label: 'All-time runs', num: t.runs, note: `${t.launchesLogged} logged`, cls: '' },
    { label: 'Running now', num: t.running, note: t.running ? 'processes alive' : 'idle', cls: 'green' },
    { label: 'Favorites', num: t.favorites, note: 'pinned', cls: '' },
    { label: 'Missing', num: t.missing, note: t.missing ? 'paths not found' : 'all healthy', cls: t.missing ? 'warn' : '' },
  ];
  $('#kpis').innerHTML = kpis.map((k) => `<div class="kpi ${k.cls}"><div class="kv-label">${k.label}</div><div class="kv-num">${k.num}</div><div class="kv-note">${esc(k.note)}</div></div>`).join('');

  // top list
  const top = S.stats.top;
  $('#topProjects').innerHTML = top.length ? top.map((p, i) => `<div class="rank-row"><span class="rk">${String(i + 1).padStart(2, '0')}</span><span class="rn">${esc(p.name)}</span><span class="rb"><i style="width:${Math.round((p.count / top[0].count) * 100)}%"></i></span><span class="rc">${p.count}</span></div>`).join('')
    : '<div class="rank-empty">Launch a project to start the leaderboard.</div>';

  // hourly
  const maxH = Math.max(1, ...S.stats.hourly);
  $('#hourStrip').innerHTML = S.stats.hourly.map((c, i) => `<div class="hs-cell" style="--o:${Math.round(6 + (c / maxH) * 88)}%;height:${Math.max(8, Math.round((c / maxH) * 100))}%" title="${String(i).padStart(2, '0')}:00 · ${c} launches"></div>`).join('');

  drawDayChart();
  drawTypeChart();
  updateSysPanel(ui.metrics);
}
function drawDayChart() {
  const cv = $('#chartDays'); if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth || 480, h = cv.clientHeight || 152;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue('--accent').trim() || '#7c9cff';
  const text = styles.getPropertyValue('--muted').trim() || '#8a93a8';
  const days = S.stats.days;
  const max = Math.max(4, ...days.map((d) => d.count));
  const padL = 26, padR = 8, padT = 12, padB = 26;
  const cw = (w - padL - padR) / days.length;
  const barW = Math.min(26, cw * 0.52);
  // grid
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth = 1;
  ctx.font = '9px ui-monospace, monospace';
  ctx.fillStyle = text;
  for (let i = 0; i <= 3; i++) {
    const y = padT + ((h - padT - padB) * i) / 3;
    ctx.beginPath(); ctx.moveTo(padL, y + .5); ctx.lineTo(w - padR, y + .5); ctx.stroke();
    const v = Math.round(max - (max * i) / 3);
    ctx.fillText(String(v), 4, y + 3);
  }
  chartLayout = { days: [], padL, padT, cw, h };
  days.forEach((d, i) => {
    const x = padL + cw * i + cw / 2;
    const bh = Math.max(d.count ? 3 : 1, ((h - padT - padB) * d.count) / max);
    const y = h - padB - bh + 1;
    const grd = ctx.createLinearGradient(0, y, 0, h - padB);
    grd.addColorStop(0, accent);
    grd.addColorStop(1, colorWithAlpha(accent, 0.18));
    ctx.fillStyle = d.count ? grd : 'rgba(255,255,255,.08)';
    roundRect(ctx, x - barW / 2, y, barW, bh, Math.min(3, barW / 2));
    ctx.fill();
    if (i % 2 === 0 || i === days.length - 1) {
      ctx.fillStyle = text;
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x, h - 9);
      ctx.textAlign = 'left';
    }
    chartLayout.days.push({ x, w: cw, d });
  });
  cv.__layout = chartLayout;
  const empty = $('#chartEmpty');
  if (empty) empty.hidden = days.some((d) => d.count > 0);
}
function colorWithAlpha(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawTypeChart() {
  const cv = $('#chartTypes'); if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = cv.clientWidth || 110;
  cv.width = size * dpr; cv.height = size * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const dist = Object.entries(S.stats.typeDist).sort((a, b) => b[1] - a[1]);
  const total = dist.reduce((a, [, n]) => a + n, 0) || 1;
  const cx = size / 2, cy = size / 2, rOuter = size / 2 - 4, rInner = rOuter * 0.66;
  let angle = -Math.PI / 2;
  const gap = 0.03;
  for (const [kind, n] of dist) {
    const sweep = (n / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, angle + gap / 2, angle + sweep - gap / 2);
    ctx.arc(cx, cy, rInner, angle + sweep - gap / 2, angle + gap / 2, true);
    ctx.closePath();
    ctx.fillStyle = (KIND[kind] || KIND.file).color;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    angle += sweep;
  }
  ctx.globalAlpha = 1;
  $('#typeLegend').innerHTML = dist.slice(0, 5).map(([k, n]) => `<div class="dl-row"><i style="background:${(KIND[k] || KIND.file).color}"></i>${esc((KIND[k] || KIND.file).label)}<b>${n}</b></div>`).join('') || '<div class="rank-empty">No projects.</div>';
}
function updateSysPanel(m) {
  const el = $('#sysPanel'); if (!el) return;
  if (!m) { el.innerHTML = '<div class="rank-empty">Collecting…</div>'; return; }
  const ramPct = m.ram.pct, cpu = m.cpu;
  el.innerHTML = `
    <div class="sys-row"><div class="sr-top"><span>CPU</span><b>${cpu}%</b></div><div class="sys-bar"><i style="width:${cpu}%"></i></div></div>
    <div class="sys-row"><div class="sr-top"><span>Memory</span><b>${ramPct}% · ${fmtBytes(m.ram.used)} / ${fmtBytes(m.ram.total)}</b></div><div class="sys-bar"><i style="width:${ramPct}%"></i></div></div>
    <div class="sys-row"><div class="sr-top"><span>Nexus footprint</span><b>${m.app.memoryMB} MB</b></div><div class="sys-bar"><i style="width:${clamp((m.app.memoryMB / 900) * 100, 2, 100)}%"></i></div></div>
    <div class="sys-row"><div class="sr-top"><span>Processes</span><b>${m.app.processes}</b></div></div>
    <div class="sys-row"><div class="sr-top"><span>App uptime</span><b>${Math.floor(m.uptime / 60)}m ${m.uptime % 60}s</b></div></div>`;
}

/* ── activity ─────────────────────────────────────────────────────────────── */
const ACT_FILTERS = [['all', 'Everything'], ['launch', 'Launches'], ['stop', 'Stops'], ['open', 'Opened'], ['add', 'Library'], ['error', 'Errors']];
function renderActivity() {
  if (!S) return;
  const f = $('#activityFilters');
  f.innerHTML = ACT_FILTERS.map(([k, l]) => `<button class="fchip ${ui.activityFilter === k ? 'on' : ''}" data-act-filter="${k}">${l}</button>`).join('');
  api.getActivity().then((items) => {
    if (ui.tab !== 'activity') return;
    const filtered = ui.activityFilter === 'all' ? items : items.filter((a) => {
      if (ui.activityFilter === 'launch') return a.kind === 'launch' || a.kind === 'exit';
      if (ui.activityFilter === 'stop') return a.kind === 'stop';
      if (ui.activityFilter === 'open') return a.kind === 'open' || a.kind === 'terminal';
      if (ui.activityFilter === 'add') return ['add', 'remove', 'import', 'export', 'scan', 'theme', 'favorite', 'reset'].includes(a.kind);
      return a.kind === 'error';
    });
    const list = $('#activityList');
    if (!filtered.length) { list.innerHTML = '<div class="act-empty">No events in this filter yet.</div>'; return; }
    list.innerHTML = filtered.map((a) => `
      <div class="act-item ${esc(a.kind)}">
        <span class="act-dot"></span>
        <div class="act-body">
          <div class="act-title"><span class="act-kind">${esc(a.kind)}</span><b>${esc(a.title)}</b></div>
          ${a.detail ? `<div class="act-detail" title="${esc(a.detail)}">${esc(a.detail)}</div>` : ''}
        </div>
        <span class="act-time">${esc(relTime(a.ts))}</span>
      </div>`).join('');
  });
}

/* ── logs (captured app output) ───────────────────────────────────────────── */
const LOG = { lines: [], appIds: new Set(), frame: 0, unseen: 0 };
const LOG_MAX = 5000;
const LOG_DOM_MAX = 1200;
const logPending = [];
let logNeedAppSync = false;

function logClock(ts) {
  const d = new Date(ts || Date.now());
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function logClean(text) {
  return String(text == null ? '' : text).replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').replace(/\t/g, '  ');
}
function logMatch(l) {
  const f = ui.log;
  if (f.app !== 'all' && l.projectId !== f.app) return false;
  if (f.stream !== 'all' && l.stream !== f.stream) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    if (!String(l.text).toLowerCase().includes(q) && !String(l.app).toLowerCase().includes(q)) return false;
  }
  return true;
}
function logRow(l) {
  const el = document.createElement('div');
  el.className = 'log-line ' + (l.stream || 'out');
  const text = logClean(l.text);
  el.innerHTML = `<span class="ll-time">${logClock(l.ts)}</span>`
    + `<span class="ll-app" title="${esc(l.app)}">${esc(l.app)}</span>`
    + `<span class="ll-tag">${l.stream === 'sys' ? 'sys' : l.stream}</span>`
    + `<span class="ll-text" title="${esc(text)}">${esc(text)}</span>`;
  return el;
}
function syncLogApps() {
  const sel = $('#logAppFilter');
  if (!sel) return;
  const map = new Map();
  for (const l of LOG.lines) if (!map.has(l.projectId)) map.set(l.projectId, l.app);
  // Keep an explicit selection even before that app has logged anything.
  if (ui.log.app !== 'all' && !map.has(ui.log.app)) {
    const p = (S ? S.projects : []).find((x) => x.id === ui.log.app);
    if (p) map.set(p.id, p.name); else ui.log.app = 'all';
  }
  const entries = Array.from(map.entries()).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  const sig = entries.map(([id, name]) => id + ':' + name).join('|');
  if (sel.dataset.sig === sig) { sel.value = ui.log.app; return; }
  sel.dataset.sig = sig;
  sel.innerHTML = '<option value="all">All apps</option>'
    + entries.map(([id, name]) => `<option value="${esc(id)}">${esc(name)}</option>`).join('');
  sel.value = ui.log.app;
}
function applyLogToggles() {
  $$('.log-toggle').forEach((b) => b.classList.toggle('on', !!ui.log[b.dataset.logToggle]));
  const rows = $('#logRows');
  if (rows) rows.classList.toggle('wrap', !!ui.log.wrap);
}
function scrollLogs() {
  const c = $('#logConsole');
  if (c) c.scrollTop = c.scrollHeight;
}
function setLogCount(n) {
  const el = $('#logCount');
  if (el) el.textContent = `${n} line${n === 1 ? '' : 's'}`;
}
function rebuildLogs() {
  const rows = $('#logRows');
  if (!rows) return;
  logPending.length = 0;
  syncLogApps();
  const visible = LOG.lines.filter(logMatch);
  const shown = visible.slice(-LOG_DOM_MAX);
  const frag = document.createDocumentFragment();
  for (const l of shown) frag.appendChild(logRow(l));
  rows.replaceChildren(frag);
  const empty = $('#logEmpty');
  if (empty) empty.hidden = shown.length > 0;
  setLogCount(shown.length);
  applyLogToggles();
  if (ui.log.follow) scrollLogs();
}
function ingestLog(batch) {
  for (const l of batch) {
    LOG.lines.push(l);
    if (!LOG.appIds.has(l.projectId)) { LOG.appIds.add(l.projectId); logNeedAppSync = true; }
    if (logMatch(l)) logPending.push(l);
  }
  if (LOG.lines.length > LOG_MAX) {
    LOG.lines.splice(0, LOG.lines.length - LOG_MAX);
    if (LOG.appIds.size > 40) { LOG.appIds = new Set(LOG.lines.map((l) => l.projectId)); }
  }
  if (ui.tab !== 'logs') {
    LOG.unseen += batch.length;
    const dot = $('#navLogDot');
    if (dot) dot.hidden = false;
    return;
  }
  if (!LOG.frame) LOG.frame = requestAnimationFrame(flushLog);
}
function flushLog() {
  LOG.frame = 0;
  const rows = $('#logRows');
  if (!rows) return;
  if (logNeedAppSync) { logNeedAppSync = false; syncLogApps(); }
  if (!logPending.length) return;
  const take = logPending.splice(0, logPending.length);
  const frag = document.createDocumentFragment();
  for (const l of take) frag.appendChild(logRow(l));
  rows.appendChild(frag);
  let over = rows.childElementCount - LOG_DOM_MAX;
  while (over-- > 0 && rows.firstElementChild) rows.firstElementChild.remove();
  const empty = $('#logEmpty');
  if (empty) empty.hidden = true;
  setLogCount(rows.childElementCount);
  if (ui.log.follow) scrollLogs();
}
function renderLogs() {
  if (!S) return;
  rebuildLogs();
  LOG.unseen = 0;
  const dot = $('#navLogDot');
  if (dot) dot.hidden = true;
}
function logExportText() {
  return LOG.lines.filter(logMatch)
    .map((l) => `[${new Date(l.ts).toLocaleString()}] ${l.app} ${l.stream === 'sys' ? '·' : l.stream.toUpperCase().padEnd(3)} ${logClean(l.text)}`)
    .join('\n');
}
async function exportLogs() {
  const text = logExportText();
  if (!text.trim()) { toast('info', 'Nothing to export', 'No lines match the current filter.'); return; }
  const appName = ui.log.app === 'all' ? 'all-apps' : String((LOG.lines.find((l) => l.projectId === ui.log.app) || {}).app || 'app');
  const name = `nexus-${appName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.log`;
  const r = await call(api.exportLog({ text, name }));
  if (r && r.ok) toast('success', 'Log exported', name);
}
async function clearLogs() {
  const scope = ui.log.app === 'all' ? {} : { projectId: ui.log.app };
  const r = await call(api.clearLog(scope));
  if (!r) return;
  LOG.lines = Array.isArray(r.lines) ? r.lines : [];
  LOG.appIds = new Set(LOG.lines.map((l) => l.projectId));
  if (ui.log.app !== 'all' && !LOG.appIds.has(ui.log.app)) ui.log.app = 'all';
  rebuildLogs();
  toast('success', 'Logs cleared', ui.log.app === 'all' ? 'Every captured line' : 'This app only');
}

/* ── view switching ───────────────────────────────────────────────────────── */
function setTab(tab, section) {
  if (!['library', 'analytics', 'activity', 'logs', 'settings'].includes(tab)) return;
  if (tab !== 'library' && ui.inspectorId) closeInspector();
  ui.tab = tab;
  if (tab === 'settings' && section) ui.settingsSection = section;
  $$('.view').forEach((v) => { v.hidden = v.dataset.view !== tab; });
  $$('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.tab === tab));
  const labels = { library: 'Library', analytics: 'Analytics', activity: 'Activity', logs: 'Logs', settings: 'Settings' };
  $('#tbContext').textContent = labels[tab];
  $('#mainScroll').scrollTop = 0;
  if (tab === 'analytics') renderAnalytics();
  if (tab === 'activity') { renderActivity(); historyHasNew = false; $('#navActivityDot').hidden = true; }
  if (tab === 'logs') renderLogs();
  if (tab === 'settings') renderSettings();
  if (tab === 'library') renderLibrary();
}

/* ── status bar ───────────────────────────────────────────────────────────── */
function renderStatus() {
  if (!S) return;
  const t = S.stats.totals;
  $('#sbProjects').textContent = `${t.projects} project${t.projects === 1 ? '' : 's'}`;
  $('#sbRuns').textContent = `${t.runs} runs`;
  $('#sbStatus').textContent = S.running.length ? `${S.running.length} running` : 'Ready';
  $('#sbDot').classList.toggle('busy', S.running.length > 0);
  $('#navActivityDot').hidden = !historyHasNew;
}

/* ── toasts / modal / menus ───────────────────────────────────────────────── */
let historyHasNew = false;
function toast(kind, title, msg) {
  const wrap = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || 'info');
  const ic = kind === 'error' ? '!' : kind === 'success' ? '✓' : 'i';
  el.innerHTML = `<span class="t-ic">${ic}</span><div><b>${esc(title)}</b>${msg ? `<p>${esc(msg)}</p>` : ''}</div>`;
  wrap.appendChild(el);
  const dur = (S && S.settings.behavior.toastDuration) || 3600;
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 220); }, dur);
  while (wrap.children.length > 4) wrap.firstElementChild.remove();
}
function confirmModal(title, body, confirmLabel = 'Confirm') {
  return new Promise((resolve) => {
    const m = $('#modal');
    $('#modalTitle').textContent = title;
    $('#modalBody').textContent = body;
    $('#modalConfirm').textContent = confirmLabel;
    m.hidden = false;
    const done = (v) => {
      m.hidden = true;
      $('#modalConfirm').onclick = null;
      $('#modalCancel').onclick = null;
      m.onclick = null;
      resolve(v);
    };
    $('#modalConfirm').onclick = () => done(true);
    $('#modalCancel').onclick = () => done(false);
    m.onclick = (e) => { if (e.target === m) done(false); };
  });
}
function promptModal(title, body, placeholder = '', initial = '') {
  return new Promise((resolve) => {
    const m = $('#modal');
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = `${esc(body)}<input id="modalInput" type="text" placeholder="${esc(placeholder)}" value="${esc(initial)}">`;
    const input = $('#modalInput', m);
    $('#modalConfirm').textContent = 'Apply';
    m.hidden = false;
    setTimeout(() => input.focus(), 40);
    const done = (v) => {
      m.hidden = true;
      $('#modalConfirm').onclick = null;
      $('#modalCancel').onclick = null;
      m.onclick = null;
      $('#modalBody').textContent = '';
      resolve(v);
    };
    $('#modalConfirm').onclick = () => done(input.value.trim());
    $('#modalCancel').onclick = () => done(null);
    input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); done(input.value.trim()); } };
    m.onclick = (e) => { if (e.target === m) done(null); };
    m.dataset.mode = 'prompt';
  });
}
function openMenu(anchor, items, opts = {}) {
  const menu = $('#ctxMenu');
  menu.innerHTML = items.map((it, i) => it.sep ? '<div class="ctx-sep"></div>' : `<button class="ctx-item ${it.danger ? 'danger' : ''}" data-menu-idx="${i}">${it.checked ? '✓ ' : ''}${esc(it.label)}${it.hint ? `<span class="ck">${esc(it.hint)}</span>` : ''}</button>`).join('');
  menu.hidden = false;
  const r = anchor.getBoundingClientRect();
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let x = opts.alignRight ? r.right - mw : r.left;
  let y = r.bottom + 6;
  x = clamp(x, 8, window.innerWidth - mw - 8);
  if (y + mh > window.innerHeight - 36) y = Math.max(8, r.top - mh - 6);
  menu.style.left = x + 'px'; menu.style.top = y + 'px';
  menu.onclick = (e) => {
    const b = e.target.closest('[data-menu-idx]');
    if (!b) return;
    const item = items[+b.dataset.menuIdx];
    closeMenu();
    if (item && item.run) item.run();
  };
  ui.menuOpen = true;
}
function closeMenu() { $('#ctxMenu').hidden = true; ui.menuOpen = false; }

/* ── palette ──────────────────────────────────────────────────────────────── */
function paletteActions() {
  const acts = [
    { id: 'tab:library', label: 'Go to Library', icon: '◆', hint: 'Ctrl 1', run: () => setTab('library') },
    { id: 'tab:analytics', label: 'Go to Analytics', icon: '◪', hint: 'Ctrl 2', run: () => setTab('analytics') },
    { id: 'tab:activity', label: 'Go to Activity', icon: '≋', hint: 'Ctrl 3', run: () => setTab('activity') },
    { id: 'tab:logs', label: 'Go to Logs', icon: '≡', hint: 'Ctrl 4', run: () => setTab('logs') },
    { id: 'logs:export', label: 'Export logs...', icon: '⭳', run: exportLogs },
    { id: 'tab:settings', label: 'Open Settings', icon: '⚙', hint: 'Ctrl 5', run: () => setTab('settings') },
    { id: 'add:file', label: 'Add file…', icon: '＋', run: addFile },
    { id: 'add:folder', label: 'Add folder…', icon: '▤', run: addFolder },
    { id: 'add:scan', label: 'Scan a folder for projects', icon: '⌕', run: scanFolder },
    { id: 'add:clipboard', label: 'Add project from clipboard path', icon: '⌘', run: addFromClipboard },
    { id: 'stop:all', label: 'Stop all running projects', icon: '■', run: async () => { const r = await call(api.stopAll()); if (r && r.stopped) toast('success', 'Stopped', `${r.stopped} process tree(s)`); } },
    { id: 'theme:next', label: 'Next theme', icon: '◐', hint: 'Ctrl Shift T', run: () => cycleTheme(1) },
    { id: 'theme:prev', label: 'Previous theme', icon: '◑', run: () => cycleTheme(-1) },
    { id: 'app:sidebar', label: 'Toggle sidebar', icon: '▥', hint: 'Ctrl B', run: toggleSidebar },
    { id: 'app:perf', label: 'Toggle performance HUD', icon: '◔', hint: 'Ctrl Shift P', run: togglePerfHud },
    { id: 'app:backup', label: 'Back up configuration now', icon: '⛁', run: async () => { const r = await call(api.backupNow()); if (r && r.ok) toast('success', 'Backup created', 'Config and history copied'); } },
    { id: 'app:export', label: 'Export configuration…', icon: '↥', run: () => call(api.exportConfig()) },
    { id: 'app:import', label: 'Import configuration…', icon: '↧', run: importConfig },
    { id: 'app:help', label: 'Keyboard shortcuts', icon: '⌨', hint: 'F1', run: showHelp },
    { id: 'app:specs', label: 'Refresh file specs', icon: '⟳', run: refreshSpecs },
  ];
  return acts;
}
function openPalette() {
  ui.paletteOpen = true;
  ui.palIndex = 0;
  const ov = $('#paletteOverlay');
  ov.hidden = false;
  const input = $('#paletteInput');
  input.value = '';
  renderPalette('');
  setTimeout(() => input.focus(), 30);
}
function closePalette() {
  ui.paletteOpen = false;
  $('#paletteOverlay').hidden = true;
}
function fuzzy(q, text) {
  if (!q) return 1;
  const t = text.toLowerCase(); q = q.toLowerCase();
  if (t.includes(q)) return 100 - t.indexOf(q);
  let ti = 0, score = 0;
  for (const ch of q) {
    const i = t.indexOf(ch, ti);
    if (i < 0) return -1;
    score += i === ti ? 6 : 2;
    ti = i + 1;
  }
  return score;
}
function renderPalette(q) {
  const results = [];
  for (const a of paletteActions()) {
    const s = fuzzy(q, a.label);
    if (s >= 0) results.push({ kind: 'action', item: a, score: s });
  }
  if (S) {
    for (const p of S.projects) {
      const s = fuzzy(q, `${p.name} ${(p.tags || []).join(' ')} ${p.path}`);
      if (s >= 0) results.push({ kind: 'project', item: p, score: s + 2 });
    }
  }
  results.sort((a, b) => b.score - a.score);
  const top = q ? results.slice(0, 12) : results.filter((r) => r.kind === 'action').slice(0, 8).concat(results.filter((r) => r.kind === 'project').slice(0, 4));
  ui.palItems = top;
  ui.palIndex = clamp(ui.palIndex, 0, Math.max(0, top.length - 1));
  const wrap = $('#paletteResults');
  if (!top.length) { wrap.innerHTML = '<div class="pal-empty">No match. Try a project name, tag or command.</div>'; return; }
  let html = '', lastKind = null, idx = 0;
  for (const r of top) {
    if (r.kind !== lastKind) {
      html += `<div class="pal-section">${r.kind === 'action' ? 'Commands' : 'Projects'}</div>`;
      lastKind = r.kind;
    }
    const sel = idx === ui.palIndex ? ' on' : '';
    if (r.kind === 'action') {
      html += `<div class="pal-item${sel}" data-pal="${idx}"><span class="pi-icon">${esc(r.item.icon)}</span><span>${esc(r.item.label)}</span>${r.item.hint ? `<span class="pi-key"><kbd>${esc(r.item.hint)}</kbd></span>` : ''}</div>`;
    } else {
      const k = KIND[r.item.kind] || KIND.file;
      html += `<div class="pal-item${sel}" data-pal="${idx}"><span class="pi-icon" style="color:${k.color};background:color-mix(in oklab, ${k.color} 12%, transparent)">${k.tag}</span><span>${esc(r.item.name)}</span><span class="pi-sub">${esc(r.item.path)}</span></div>`;
    }
    idx++;
  }
  wrap.innerHTML = html;
  const active = wrap.querySelector('.pal-item.on');
  if (active) active.scrollIntoView({ block: 'nearest' });
}
function runPaletteItem(idx) {
  const r = ui.palItems[idx];
  if (!r) return;
  closePalette();
  if (r.kind === 'action') r.item.run();
  else { launchProject(r.item.id); openInspector(r.item.id); }
}

/* ── actions ──────────────────────────────────────────────────────────────── */
async function launchProject(id) {
  const p = projectById(id);
  if (!p) return;
  if (p.running) return stopProject(id);
  const r = await call(api.launch(id), { skipInspector: false });
  if (r && r.result && !r.result.ok) toast('error', 'Could not launch', r.result.error);
  else if (r && r.result && p.kind === 'folder' && !p.custom_command) toast('success', 'Opened in Explorer', p.path);
  else toast('success', `Launching ${p.name}`, p.priority !== 'normal' ? `priority: ${p.priority}` : '');
}
async function stopProject(id) {
  const r = await call(api.stop(id));
  if (r && r.stopped) toast('success', 'Stopped', projectById(id)?.name || '');
}
async function addFile() { closeAdd(); const r = await call(api.pickFiles()); if (r && r.paths && r.paths.length) toast('success', `Added ${r.paths.length} file(s)`, ''); }
async function addFolder() { closeAdd(); const r = await call(api.pickFolder()); if (r && r.paths && r.paths.length) toast('success', 'Folder added', r.paths[0]); }
async function scanFolder() { closeAdd(); const r = await call(api.scanFolder()); if (r) toast('success', 'Scan complete', `${r.added} new project(s)`); }
async function addFromClipboard() {
  closeAdd();
  try {
    const text = await navigator.clipboard.readText();
    if (!text) { toast('error', 'Clipboard empty', ''); return; }
    const r = await call(api.importPaths(text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)));
    if (r) toast(r.added ? 'success' : 'error', r.added ? 'Added from clipboard' : 'Nothing added', r.added ? text : 'Path must exist');
  } catch (e) { toast('error', 'Clipboard unavailable', 'Paste the path into Add → file instead.'); }
}
async function refreshSpecs() { const r = await call(api.refreshSpecs()); if (r) toast('success', 'Specs refreshed', `${r.refreshed} updated`); }
async function importConfig() {
  const ok = await confirmModal('Import configuration?', 'Your current library is replaced. A backup is taken automatically first.', 'Import');
  if (!ok) return;
  const r = await call(api.importConfig());
  if (r && r.ok) toast('success', 'Imported', `${r.snapshot.projects.length} projects`);
}
function toggleSidebar() { settingsValue('appearance.sidebarCollapsed', !S.settings.appearance.sidebarCollapsed); renderSettings(); }
function togglePerfHud() {
  S.settings.appearance.perfHud = !S.settings.appearance.perfHud;
  patchSettings({ appearance: { perfHud: S.settings.appearance.perfHud } });
  applyPerfHudState();
  if (ui.tab === 'settings') renderSettings();
}
function showHelp() { ui.help = true; $('#help').hidden = false; $('#helpGrid').innerHTML = SHORTCUTS.map(([keys, label]) => `<div class="help-key">${keys.map((k) => `<kbd>${esc(k)}</kbd>`).join('')}</div><div class="help-val">${esc(label)}</div>`).join(''); }
function hideHelp() { ui.help = false; $('#help').hidden = true; }
function openAdd(anchor) {
  const pop = $('#addPopover');
  pop.hidden = false;
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  pop.style.left = clamp(r.right - w, 8, window.innerWidth - w - 8) + 'px';
  pop.style.top = (r.bottom + 6 + h > window.innerHeight ? r.top - h - 6 : r.bottom + 6) + 'px';
  ui.addOpen = true;
}
function closeAdd() { $('#addPopover').hidden = true; ui.addOpen = false; }
function selectProject(id, mode) {
  if (mode === 'toggle') {
    if (ui.selected.has(id)) ui.selected.delete(id); else ui.selected.add(id);
    ui.lastClicked = id;
  } else if (mode === 'range' && ui.lastClicked) {
    const ids = visibleProjects().map((p) => p.id);
    const a = ids.indexOf(ui.lastClicked), b = ids.indexOf(id);
    if (a >= 0 && b >= 0) {
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) ui.selected.add(ids[i]);
    }
  } else {
    ui.selected.clear();
    ui.selected.add(id);
    ui.lastClicked = id;
  }
  renderLibrary();
  updateBatchBar();
}
function updateBatchBar() {
  const bar = $('#batchBar');
  bar.hidden = ui.selected.size === 0;
  if (ui.selected.size) $('#bbCount').textContent = ui.selected.size;
  $$('[data-project-id]').forEach((el) => el.classList.toggle('selected', ui.selected.has(el.dataset.projectId)));
}
function selectedIds() { return Array.from(ui.selected); }

/* ── metrics + perf hud ───────────────────────────────────────────────────── */
let metricsTimer = null;
let perfRaf = null, perfFrames = 0, perfLast = performance.now(), perfFps = 0;
function startMetrics() {
  clearInterval(metricsTimer);
  const enabled = S && S.settings.behavior.liveMetrics;
  if (!enabled) { $('#sysRamVal').textContent = '—'; return; }
  const tick = async () => {
    if (document.hidden) return;
    try {
      const m = await api.metrics();
      ui.metrics = m;
      $('#sysRamBar').style.width = m.ram.pct + '%';
      $('#sysRamVal').textContent = m.ram.pct + '% · ' + fmtBytes(m.ram.used);
      $('#sbMemory').textContent = 'RAM ' + fmtBytes(m.ram.used);
      if (ui.tab === 'analytics') updateSysPanel(m);
    } catch { }
  };
  tick();
  metricsTimer = setInterval(tick, S.settings.behavior.metricsInterval || 1500);
}
function startPerfLoop() {
  if (perfRaf) return;
  const loop = () => {
    perfFrames++;
    const now = performance.now();
    if (now - perfLast >= 500) {
      perfFps = Math.round((perfFrames * 1000) / (now - perfLast));
      perfFrames = 0; perfLast = now;
      const hud = $('#perfHud');
      if (ui.perfHud) {
        hud.innerHTML = `<div class="ph-head">Performance</div>
          fps <b>${perfFps}</b> · frame <b>${(1000 / Math.max(1, perfFps)).toFixed(1)}ms</b><br>
          render <b>${ui.lastRenderMs}ms</b> · nodes <b>${document.querySelectorAll('*').length}</b><br>
          projects <b>${S ? S.projects.length : 0}</b> · rows <b>${document.querySelectorAll('[data-project-id]').length}</b><br>
          renders <b>${ui.renders}</b> · heap <b>${performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB' : '—'}</b>`;
      }
    }
    perfRaf = requestAnimationFrame(loop);
  };
  perfRaf = requestAnimationFrame(loop);
}
function applyPerfHudState() {
  ui.perfHud = !!(S && S.settings.appearance.perfHud);
  $('#perfHud').hidden = !ui.perfHud;
  if (ui.perfHud) startPerfLoop();
}

/* ── event wiring ─────────────────────────────────────────────────────────── */
if ($('#libList') && !$('#libList').dataset.dbl) {
  $('#libList').dataset.dbl = '1';
  $('#libList').addEventListener('dblclick', (e) => {
    if (e.target.closest('[data-act]')) return;
    const el = e.target.closest('[data-project-id]');
    if (!el) return;
    if (S && S.settings.behavior.dblclickRun === false) return;
    launchProject(el.dataset.projectId);
  });
}
document.addEventListener('click', (e) => {
  const t = e.target;
  const actEl = t.closest('[data-act]');
  if (!ui.menuOpen && !ui.addOpen) { /* menus handled below */ }
  if (ui.menuOpen && !t.closest('#ctxMenu') && !t.closest('[data-act="sort-menu"]') && !t.closest('[data-act="group-menu"]') && !t.closest('[data-act="menu"]')) closeMenu();
  if (ui.addOpen && !t.closest('#addPopover') && !t.closest('[data-act="add-menu"]')) closeAdd();

  const tabBtn = t.closest('[data-tab]');
  if (tabBtn) { setTab(tabBtn.dataset.tab); return; }

  if (t.closest('.tag-pill')) {
    const tag = t.closest('.tag-pill').dataset.tag;
    ui.lib.tagFilter = ui.lib.tagFilter === tag ? null : tag;
    patchSettings({ library: { tagFilter: ui.lib.tagFilter } });
    renderSidebar(); renderLibrary(); renderQuickBar();
    return;
  }
  if (t.closest('.tchip')) {
    ui.lib.typeFilter = t.closest('.tchip').dataset.type;
    patchSettings({ library: { typeFilter: ui.lib.typeFilter } });
    renderToolbar(); renderLibrary();
    return;
  }
  if (t.closest('[data-view-mode]')) {
    ui.lib.view = t.closest('[data-view-mode]').dataset.viewMode;
    patchSettings({ library: { view: ui.lib.view } });
    // view switches rebuild nodes of the other shape
    for (const [k, n] of libNodes) { n.remove(); } libNodes.clear();
    renderToolbar(); renderLibrary(); renderSettings();
    return;
  }
  if (t.closest('[data-quick]')) {
    const q = t.closest('[data-quick]').dataset.quick;
    ui.quick = ui.quick === q ? null : q;
    renderSidebar(); renderLibrary();
    return;
  }
  if (t.closest('[data-act-filter]')) {
    ui.activityFilter = t.closest('[data-act-filter]').dataset.actFilter;
    renderActivity();
    return;
  }
  if (t.closest('[data-log-toggle]')) {
    const key = t.closest('[data-log-toggle]').dataset.logToggle;
    ui.log[key] = !ui.log[key];
    applyLogToggles();
    if (key === 'follow' && ui.log.follow) scrollLogs();
    return;
  }
  if (t.closest('[data-section]')) {
    ui.settingsSection = t.closest('[data-section]').dataset.section;
    renderSettings();
    return;
  }
  if (t.closest('[data-theme-set]')) { setTheme(t.closest('[data-theme-set]').dataset.themeSet); return; }
  if (t.closest('[data-set-view]')) {
    ui.lib.view = t.closest('[data-set-view]').dataset.setView;
    patchSettings({ library: { view: ui.lib.view } });
    for (const [k, n] of libNodes) { n.remove(); } libNodes.clear();
    renderToolbar(); renderLibrary(); renderSettings();
    return;
  }
  if (t.closest('[data-pal]')) { runPaletteItem(+t.closest('[data-pal]').dataset.pal); return; }

  const rowEl = t.closest('[data-project-id]');
  if (rowEl && !actEl) {
    const id = rowEl.dataset.projectId;
    if (e.ctrlKey || e.metaKey) { selectProject(id, 'toggle'); openInspector(id); }
    else if (e.shiftKey) { selectProject(id, 'range'); }
    else { ui.selected.clear(); ui.cursor = id; openInspector(id); renderLibrary(); updateBatchBar(); }
    return;
  }

  if (!actEl) return;
  const act = actEl.dataset.act;
  const id = rowEl ? rowEl.dataset.projectId : ui.inspectorId;

  switch (act) {
    case 'run': launchProject(id); break;
    case 'stop': stopProject(id); break;
    case 'inspect': openInspector(id); break;
    case 'fav': e.stopPropagation(); toggleFavorite(id); break;
    case 'select': e.stopPropagation(); selectProject(id, e.shiftKey ? 'range' : 'toggle'); break;
    case 'menu': {
      const p = projectById(id); if (!p) break;
      const idx = S.projects.indexOf(p);
      openMenu(actEl, [
        { label: 'Run', run: () => launchProject(id) },
        { label: p.favorite ? 'Remove favorite' : 'Add favorite', run: () => toggleFavorite(id) },
        { label: 'Open inspector', run: () => openInspector(id) },
        { label: 'Duplicate', run: () => duplicateProject(id) },
        { sep: true },
        { label: 'Copy path', hint: 'Y', run: () => call(api.copyPath(id)) },
        { label: 'Open folder', run: () => call(api.openFolder(id)) },
        { label: 'Open terminal', run: () => call(api.openTerminal(id)) },
        { sep: true },
        { label: 'Move up', run: () => moveProject(id, -1), disabled: idx <= 0 },
        { label: 'Move down', run: () => moveProject(id, 1), disabled: idx >= S.projects.length - 1 },
        { sep: true },
        { label: 'Remove from library', danger: true, run: () => removeProjects([id]) },
      ], { alignRight: true });
      break;
    }
    case 'clear-search': ui.query = ''; renderLibrary(); break;
    case 'clear-chip': {
      const kind = actEl.dataset.kind;
      if (kind === 'query') ui.query = '';
      if (kind === 'quick') ui.quick = null;
      if (kind === 'type') ui.lib.typeFilter = 'all';
      if (kind === 'tag') ui.lib.tagFilter = null;
      patchSettings({ library: { typeFilter: ui.lib.typeFilter, tagFilter: ui.lib.tagFilter } });
      renderSidebar(); renderToolbar(); renderLibrary();
      break;
    }
    case 'clear-filters': clearFilters(); break;
    case 'add-menu': e.stopPropagation(); if (ui.addOpen) closeAdd(); else openAdd(actEl); break;
    case 'add-file': addFile(); break;
    case 'add-folder': addFolder(); break;
    case 'scan': scanFolder(); break;
    case 'paste-path': addFromClipboard(); break;
    case 'sort-menu': {
      openMenu(actEl, Object.entries(SORT_LABEL).map(([k, l]) => ({
        label: l, checked: ui.lib.sort === k, run: () => { ui.lib.sort = k; patchSettings({ library: { sort: k } }); renderToolbar(); renderLibrary(); }
      })).concat([{ sep: true }, {
        label: ui.lib.sortDir === 'asc' ? 'Descending' : 'Ascending',
        run: () => { ui.lib.sortDir = ui.lib.sortDir === 'asc' ? 'desc' : 'asc'; patchSettings({ library: { sortDir: ui.lib.sortDir } }); renderToolbar(); renderLibrary(); }
      }]));
      break;
    }
    case 'group-menu': {
      openMenu(actEl, [['none', 'None'], ['type', 'Type'], ['favorite', 'Favorite']].map(([k, l]) => ({
        label: l, checked: ui.lib.group === k, run: () => { ui.lib.group = k; patchSettings({ library: { group: k } }); renderToolbar(); renderLibrary(); }
      })));
      break;
    }
    case 'density-cycle': {
      const seq = [40, 46, 52, 62, 74];
      const next = seq[(seq.indexOf(S.settings.appearance.density) + 1) % seq.length] || 46;
      settingsValue('appearance.density', next);
      toast('success', 'Row height', next + 'px');
      break;
    }
    case 'preset': {
      applyDensityPreset(actEl.dataset.preset);
      break;
    }
    case 'refresh-specs': refreshSpecs(); break;
    case 'perf': togglePerfHud(); break;
    case 'palette': openPalette(); break;
    case 'help': showHelp(); break;
    case 'help-close': hideHelp(); break;
    case 'theme-prev': cycleTheme(-1); break;
    case 'theme-next': cycleTheme(1); break;
    case 'theme-menu': setTab('settings', 'appearance'); break;
    case 'sidebar': toggleSidebar(); break;
    case 'win-min': api.minimize(); break;
    case 'win-max': api.maximize(); break;
    case 'win-close': api.close(); break;
    case 'close-inspector': closeInspector(); break;
    case 'dup-project': duplicateProject(ui.inspectorId); break;
    case 'insp-run': {
      const p = projectById(ui.inspectorId);
      if (p) p.running ? stopProject(p.id) : launchProject(p.id);
      break;
    }
    case 'insp-folder': call(api.openFolder(id)); break;
    case 'insp-terminal': call(api.openTerminal(id)); break;
    case 'insp-logs': {
      const p = projectById(id);
      ui.log.app = p ? p.id : 'all';
      setTab('logs');
      break;
    }
    case 'insp-copy': call(api.copyPath(id)); toast('success', 'Path copied'); break;
    case 'insp-fav': toggleFavorite(id); renderInspector(); break;
    case 'prio': {
      const v = actEl.dataset.prio;
      updateLocalProject(id, { priority: v });
      queueFieldSave(id, { priority: v });
      $$('[data-act=prio]').forEach((b) => b.classList.toggle('on', b.dataset.prio === v));
      break;
    }
    case 'env-add': {
      const p = currentProject(); if (!p) break;
      p.env = (p.env || []).concat([{ k: '', v: '' }]);
      renderInspector(); break;
    }
    case 'env-del': {
      const row = actEl.closest('.env-row');
      const rows = $$('.env-row', $('#inspBody'));
      const idx = rows.indexOf(row);
      const p = currentProject(); if (!p) break;
      p.env = (p.env || []).filter((_, i) => i !== idx);
      saveFieldNow(p.id, { env: p.env });
      renderInspector();
      break;
    }
    case 'color': {
      const c = actEl.dataset.color || null;
      updateLocalProject(id, { color: c });
      saveFieldNow(id, { color: c });
      renderInspector(); renderLibrary();
      break;
    }
    case 'tag-del': {
      const tag = actEl.dataset.tag;
      const p = currentProject(); if (!p) break;
      const tags = (p.tags || []).filter((t) => t !== tag);
      updateLocalProject(id, { tags });
      saveFieldNow(id, { tags });
      renderInspector(); renderLibrary();
      break;
    }
    case 'insp-delete': removeProjects([id]); break;
    case 'reset-stats': {
      confirmModal('Clear statistics?', 'Run counts and the activity timeline will be erased. Projects are kept.', 'Clear').then((ok) => {
        if (ok) call(api.resetStats()).then(() => { toast('success', 'Statistics cleared'); renderAnalytics(); });
      });
      break;
    }
    case 'reset-all': {
      confirmModal('Factory reset?', 'Every project and preference is removed. A timestamped backup is written first.', 'Reset everything').then((ok) => {
        if (ok) call(api.resetAll()).then(() => { toast('success', 'Reset complete'); setTab('library'); });
      });
      break;
    }
    case 'benchmark': runBenchmark(); break;
    case 'backup': call(api.backupNow()).then((r) => { if (r && r.ok) toast('success', 'Backup created'); }); break;
    case 'export': call(api.exportConfig()).then((r) => { if (r && r.ok) toast('success', 'Exported', r.path); }); break;
    case 'import': importConfig(); break;
    case 'open-config': call(api.openConfigDir()); break;
    case 'import-legacy': {
      call(api.importLegacy()).then((r) => {
        if (r && r.ok) toast('success', 'v4 settings imported', `${r.settings} settings · ${r.projects} projects added`);
        else if (r) toast('error', 'Nothing to import', r.error || '');
      });
      break;
    }
    case 'clear-activity': call(api.clearActivity()).then(() => { renderActivity(); toast('success', 'Timeline cleared'); }); break;
    case 'log-clear': clearLogs(); break;
    case 'log-export': exportLogs(); break;
    case 'log-open-dir': call(api.openLogDir()); break;
    case 'batch-run': selectedIds().forEach((sid) => launchProject(sid)); break;
    case 'batch-fav': batchFavorite(); break;
    case 'batch-tag': batchTag(); break;
    case 'batch-stop': selectedIds().forEach((sid) => api.stop(sid)).then(() => call(api.snapshot()).then(adopt)); break;
    case 'batch-delete': removeProjects(selectedIds()); break;
    case 'batch-clear': ui.selected.clear(); renderLibrary(); updateBatchBar(); break;
    case 'modal-cancel': $('#modal').hidden = true; break;
    case 'global-env-add': {
      const env = (S.settings.launch.env || []).concat([{ k: '', v: '' }]);
      patchSettings({ launch: { env } });
      renderSettings();
      break;
    }
    case 'env-global-del': {
      const rows = $$('.env-row', $('#globalEnv'));
      const idx = rows.indexOf(actEl.closest('.env-row'));
      const env = (S.settings.launch.env || []).filter((_, i) => i !== idx);
      patchSettings({ launch: { env } });
      renderSettings();
      break;
    }
  }
});

/* double-click */
document.addEventListener('dblclick', (e) => {
  const row = e.target.closest('[data-project-id]');
  if (!row || e.target.closest('[data-act]')) return;
  if (!S || !S.settings.behavior.dblclickRun) return;
  launchProject(row.dataset.projectId);
});
/* right click */
document.addEventListener('contextmenu', (e) => {
  const row = e.target.closest('[data-project-id]');
  if (!row) return;
  e.preventDefault();
  const id = row.dataset.projectId;
  openMenu(row, [
    { label: 'Run project', run: () => launchProject(id) },
    { label: 'Inspect', run: () => openInspector(id) },
    { label: 'Copy path', run: () => call(api.copyPath(id)) },
    { sep: true },
    { label: 'Remove', danger: true, run: () => removeProjects([id]) },
  ], { alignRight: true });
});
/* keyboard */
document.addEventListener('keydown', (e) => {
  const inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === 'Escape') {
    if (ui.paletteOpen) return closePalette();
    if (ui.help) return hideHelp();
    if (!$('#modal').hidden) return $('#modalCancel').click();
    if (!$('#help').hidden) return hideHelp();
    if (ui.menuOpen) return closeMenu();
    if (ui.addOpen) return closeAdd();
    if (ui.inspectorId) return closeInspector();
    if (ui.query) { ui.query = ''; renderLibrary(); }
    return;
  }
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); ui.paletteOpen ? closePalette() : openPalette(); return; }
  if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); setTab('library'); $('#searchInput').focus(); return; }
  if (mod && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); togglePerfHud(); return; }
  if (mod && e.shiftKey && e.key.toLowerCase() === 't') { e.preventDefault(); cycleTheme(1); return; }
  if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleSidebar(); return; }
  if (mod && e.key.toLowerCase() === 'n') { e.preventDefault(); e.shiftKey ? scanFolder() : addFile(); return; }
  if (mod && ['1', '2', '3', '4', '5'].includes(e.key)) { e.preventDefault(); setTab(['library', 'analytics', 'activity', 'logs', 'settings'][+e.key - 1]); return; }
  if (e.key === 'F1' || (e.key === '?' && !inField)) { e.preventDefault(); showHelp(); return; }
  if (inField || ui.paletteOpen) {
    if (ui.paletteOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); ui.palIndex = Math.min(ui.palItems.length - 1, ui.palIndex + 1); renderPalette($('#paletteInput').value); }
      if (e.key === 'ArrowUp') { e.preventDefault(); ui.palIndex = Math.max(0, ui.palIndex - 1); renderPalette($('#paletteInput').value); }
      if (e.key === 'Enter') { e.preventDefault(); runPaletteItem(ui.palIndex); }
    }
    return;
  }
  if (e.key === '/' ) { e.preventDefault(); setTab('library'); $('#searchInput').focus(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const ids = ui.selected.size ? selectedIds() : (ui.cursor ? [ui.cursor] : []);
    if (ids.length) removeProjects(ids);
    return;
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (ui.tab !== 'library') return;
    e.preventDefault();
    const list = visibleProjects();
    const i = list.findIndex((p) => p.id === ui.cursor);
    const next = clamp(i + (e.key === 'ArrowDown' ? 1 : -1), 0, list.length - 1);
    if (list[next]) { ui.cursor = list[next].id; renderLibrary(); document.querySelector(`[data-project-id="${CSS.escape(ui.cursor)}"]`)?.scrollIntoView({ block: 'nearest' }); }
    return;
  }
  if (e.key === 'Enter' && ui.cursor) { launchProject(ui.cursor); return; }
});
/* search */
$('#searchInput').addEventListener('input', (e) => {
  const val = e.target.value;
  clearTimeout(ui.searchTimer);
  const d = (S && S.settings.behavior.searchDebounce) || 90;
  ui.searchTimer = setTimeout(() => { ui.query = val; renderLibrary(); }, d);
  $('.s-clear').hidden = !val;
});
$('#searchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const first = visibleProjects()[0];
    if (first) launchProject(first.id);
  }
});
/* palette input */
$('#paletteInput').addEventListener('input', (e) => { ui.palIndex = 0; renderPalette(e.target.value); });
/* settings controls (delegated) */
$('#settingsBody').addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.range) {
    const key = el.dataset.range;
    let val = el.type === 'range' ? +el.value : el.value;
    paintRange(el);
    if (key === 'appearance.opacity') { patchSettings({ appearance: { opacity: clamp(val / 100, 0.5, 1) } }); }
    else if (key.startsWith('accent.')) {
      if (!S.settings.accent.custom) patchSettings({ accent: { custom: true } });
      patchSettings({ accent: { [key.split('.')[1]]: val } });
    } else {
      const patch = {}; setPath(patch, key, val); patchSettings(patch);
    }
    if (key === 'appearance.motion') { clearTimeout(ui._mo); }
    return;
  }
  if (el.dataset.set && el.type === 'checkbox') {
    const key = el.dataset.set;
    const patch = {}; setPath(patch, key, el.checked);
    patchSettings(patch);
    return;
  }
  if (el.dataset.set && el.tagName === 'SELECT') {
    const key = el.dataset.set;
    const patch = {}; setPath(patch, key, el.value);
    patchSettings(patch);
    if (key === 'launch.priority') { /* applied next launch */ }
    return;
  }
  if (el.dataset.set && el.type === 'color') {
    const patch = {}; setPath(patch, el.dataset.set, el.value); patchSettings(patch);
    return;
  }
  if (el.classList.contains('env-key') || el.classList.contains('env-val')) {
    const editor = el.closest('#globalEnv');
    if (editor) {
      const rows = $$('.env-row', editor);
      const idx = rows.indexOf(el.closest('.env-row'));
      const env = (S.settings.launch.env || []).slice();
      env[idx] = env[idx] || { k: '', v: '' };
      env[idx][el.dataset.env] = el.value;
      patchSettings({ launch: { env } });
    }
    return;
  }
});
$('#settingsBody').addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.set && el.tagName === 'SELECT') {
    const patch = {}; setPath(patch, el.dataset.set, el.value); patchSettings(patch);
  }
});
/* inspector inputs (delegated) */
$('#inspBody').addEventListener('input', (e) => {
  const el = e.target;
  const id = ui.inspectorId;
  if (!id) return;
  if (el.dataset.field) {
    const field = el.dataset.field;
    let val = el.type === 'checkbox' ? el.checked : el.value;
    if (field === 'delay') val = +val;
    if (field === 'priority') val = el.value;
    updateLocalProject(id, { [field]: val });
    if (field === 'delay') { const d = $('.delay-val', $('#inspBody')); if (d) d.textContent = val + ' ms'; }
    if (field === 'name') { $('.insp-hero .nm').textContent = val; $('#inspSub').textContent = val; }
    if (field === 'shell') { const cmd = $('[data-field=custom_command]', $('#inspBody'))?.closest('.field'); if (cmd) cmd.style.display = val ? '' : 'none'; }
    queueFieldSave(id, { [field]: field === 'shell' ? val : val });
    return;
  }
  if (el.dataset.env) {
    const rows = $$('.env-row', $('#inspBody'));
    const idx = rows.indexOf(el.closest('.env-row'));
    const p = currentProject(); if (!p) return;
    const env = (p.env || []).slice();
    env[idx] = env[idx] || { k: '', v: '' };
    env[idx][el.dataset.env] = el.value;
    p.env = env;
    queueFieldSave(id, { env });
  }
});
$('#inspBody').addEventListener('keydown', (e) => {
  if (e.target.id === 'tagInput' && e.key === 'Enter') {
    e.preventDefault();
    const raw = e.target.value.trim().replace(/^#/, '');
    if (!raw) return;
    const p = currentProject(); if (!p) return;
    const tags = Array.from(new Set((p.tags || []).concat([raw]))).slice(0, 12);
    updateLocalProject(p.id, { tags });
    saveFieldNow(p.id, { tags });
    renderInspector(); renderLibrary();
    setTimeout(() => document.getElementById('tagInput')?.focus(), 20);
  }
});
/* drag & drop */
window.addEventListener('dragenter', (e) => { e.preventDefault(); ui.dropDepth++; $('#dropOverlay').hidden = false; });
window.addEventListener('dragover', (e) => { e.preventDefault(); });
window.addEventListener('dragleave', (e) => { e.preventDefault(); ui.dropDepth = Math.max(0, ui.dropDepth - 1); if (!ui.dropDepth) $('#dropOverlay').hidden = true; });
window.addEventListener('drop', async (e) => {
  e.preventDefault();
  ui.dropDepth = 0; $('#dropOverlay').hidden = true;
  const files = Array.from(e.dataTransfer.files || []);
  const paths = files.map((f) => api.pathForFile(f)).filter(Boolean);
  if (!paths.length) return;
  const r = await call(api.importPaths(paths));
  if (r) toast(r.added ? 'success' : 'error', r.added ? `Added ${r.added} project(s)` : 'Nothing added', r.added ? '' : 'Already in library or path missing');
});
window.addEventListener('resize', () => {
  if (ui.tab === 'analytics') { clearTimeout(ui._rz); ui._rz = setTimeout(() => { drawDayChart(); drawTypeChart(); }, 120); }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && S) startMetrics(); });
window.addEventListener('beforeunload', () => { if (ui.saveTimer) clearTimeout(ui.saveTimer); });

/* ── mutations ────────────────────────────────────────────────────────────── */
function saveFieldNow(id, patch) {
  clearTimeout(ui.fieldTimers.get(id));
  const merged = Object.assign({}, ui.dirtyFields.get(id) || {}, patch);
  ui.dirtyFields.delete(id);
  ui.fieldTimers.delete(id);
  return call(api.updateProject(id, merged), { skipInspector: true });
}
async function toggleFavorite(id) {
  const r = await call(api.toggleFavorite(id));
  if (r) { renderLibrary(); if (ui.inspectorId === id) renderInspector(); }
}
async function duplicateProject(id) {
  if (!id) return;
  const r = await call(api.duplicateProject(id));
  if (r && r.ok) toast('success', 'Duplicated', 'A copy was added to the library');
}
async function removeProjects(ids) {
  if (!ids.length) return;
  if (S.settings.behavior.confirmDelete) {
    const names = ids.map((id) => projectById(id)?.name).filter(Boolean);
    const ok = await confirmModal(ids.length === 1 ? 'Remove project?' : `Remove ${ids.length} projects?`, names.slice(0, 6).join(', ') + (names.length > 6 ? '…' : '') + ' — files are not touched.', 'Remove');
    if (!ok) return;
  }
  ui.selected.clear();
  if (ids.includes(ui.inspectorId)) closeInspector();
  const r = await call(api.removeProjects(ids));
  if (r) toast('success', 'Removed', `${ids.length} project(s)`);
  updateBatchBar();
}
function moveProject(id, dir) {
  const ids = S.projects.map((p) => p.id);
  const i = ids.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  call(api.reorderProjects(ids)).then(() => renderLibrary());
}
async function batchFavorite() {
  for (const id of selectedIds()) await api.toggleFavorite(id);
  const snap = await api.snapshot(); if (snap) adopt(snap);
  toast('success', 'Favorites updated', `${ui.selected.size} project(s)`);
}
async function batchTag() {
  const tag = await promptModal('Tag selected projects', `${ui.selected.size} project(s) will receive this tag.`, 'e.g. client-work');
  if (!tag) return;
  for (const id of selectedIds()) {
    const p = projectById(id);
    if (!p) continue;
    const tags = Array.from(new Set((p.tags || []).concat([tag.replace(/^#/, '')])));
    await api.updateProject(id, { tags });
  }
  const snap = await api.snapshot(); if (snap) adopt(snap);
  toast('success', 'Tagged', `#${tag.replace(/^#/, '')}`);
}
function clearFilters() {
  ui.query = ''; ui.quick = null;
  ui.lib.typeFilter = 'all'; ui.lib.tagFilter = null;
  patchSettings({ library: { typeFilter: 'all', tagFilter: null } });
  renderSidebar(); renderToolbar(); renderLibrary();
}
function runBenchmark() {
  const out = $('#benchResult');
  if (!out) return;
  out.textContent = 'Measuring…';
  const samples = [];
  let n = 0;
  const step = () => {
    if (n >= 30) {
      samples.sort((a, b) => a - b);
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      out.textContent = `30 renders · avg ${avg.toFixed(2)}ms · p95 ${samples[Math.floor(samples.length * 0.95)].toFixed(2)}ms · ${S.projects.length} projects · ${document.querySelectorAll('*').length} DOM nodes`;
      return;
    }
    const t0 = performance.now();
    renderLibrary();
    samples.push(performance.now() - t0);
    n++;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ── log view controls ────────────────────────────────────────────────────── */
(() => {
  const appSel = $('#logAppFilter');
  if (appSel) appSel.addEventListener('change', () => { ui.log.app = appSel.value; rebuildLogs(); });
  const streamSel = $('#logStreamFilter');
  if (streamSel) streamSel.addEventListener('change', () => { ui.log.stream = streamSel.value; rebuildLogs(); });
  const search = $('#logSearch');
  if (search) {
    let timer = null;
    search.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { ui.log.q = search.value.trim(); rebuildLogs(); }, 120);
    });
  }
  const consoleEl = $('#logConsole');
  if (consoleEl) {
    consoleEl.addEventListener('scroll', () => {
      const nearBottom = consoleEl.scrollHeight - consoleEl.scrollTop - consoleEl.clientHeight < 48;
      if (ui.log.follow !== nearBottom) { ui.log.follow = nearBottom; applyLogToggles(); }
    }, { passive: true });
  }
})();

/* ── boot ─────────────────────────────────────────────────────────────────── */
async function init() {
  try { S = await api.snapshot(); } catch (e) { document.body.innerHTML = `<pre style="padding:24px;color:#f88">${esc(e.message)}</pre>`; return; }
  ui.lib = Object.assign({}, ui.lib, S.settings.library);
  applyTheme(); applyLive();
  // nav icons
  $$('.nav-ic').forEach((n) => { n.innerHTML = ICON[n.dataset.ic] || ICON.library; });

  // auto-open favorite? no — open first project's inspector only on smoke test
  renderToolbar(); renderSidebar(); renderLibrary(); renderStatus(); startMetrics(); applyPerfHudState();
  markSaved();
  api.on('snapshot:changed', (s) => adopt(s));
  api.on('running:changed', () => { /* snapshot push follows */ });
  api.on('toast', (t) => toast(t.kind, t.title, t.msg));
  api.on('activity:new', () => { historyHasNew = true; $('#navActivityDot').hidden = ui.tab === 'activity'; });
  api.on('log:lines', (batch) => { if (Array.isArray(batch) && batch.length) ingestLog(batch); });
  api.getLog().then((r) => {
    if (!r || !Array.isArray(r.lines)) return;
    LOG.lines = r.lines.slice(-LOG_MAX);
    LOG.appIds = new Set(LOG.lines.map((l) => l.projectId));
    syncLogApps();
    if (ui.tab === 'logs') rebuildLogs();
  }).catch(() => { });
  api.on('specs:updated', (specs) => {
    if (!S) return;
    for (const p of S.projects) if (specs[p.path]) p.spec = specs[p.path];
    renderLibrary(); if (ui.inspectorId) renderInspector();
  });
  booting = false;
}

/* ══ test hooks ══ */
window.__t = {
  tab: (t) => setTab(t),
  settings: (sec) => { ui.settingsSection = sec; setTab('settings', sec); },
  select: (id) => openInspector(id),
  firstId: () => S && S.projects[0] && S.projects[0].id,
  palette: (on) => on ? openPalette() : closePalette(),
  snapshot: () => S,
  logLines: () => LOG.lines.map((l) => ({ app: l.app, stream: l.stream, text: l.text })),
  addProject: async (p) => { const r = await api.addProject(typeof p === 'string' ? { path: p } : p); if (r && r.snapshot) adopt(r.snapshot); return r; },
  launch: (id) => launchProject(id),
  removeProject: async (id) => { const s = await api.removeProjects([id]); if (s) adopt(s); return true; },
  /* card view + heat probe: used by the smoke runner to verify the accent scale */
  cards: (view = 'grid') => {
    ui.lib.view = view;
    for (const [, n] of libNodes) n.remove();
    libNodes.clear();
    patchSettings({ library: { view } });
    setTab('library');
    renderToolbar();
    renderLibrary();
    return { view, cards: document.querySelectorAll('.card').length };
  },
  heatProbe: () => {
    const cards = Array.from(document.querySelectorAll('.card'));
    const cfg = cardCfg();
    return {
      maxRuns: HEAT_MAX,
      mode: cfg.heatMode, style: cfg.heatStyle, palette: cfg.palette, density: cfg.density,
      paletteStops: heatPalette(cfg),
      legendVisible: !document.getElementById('heatLegend').hidden,
      legendTiers: Array.from(document.querySelectorAll('#heatLegend .hl-item')).map((el) => el.textContent.trim()),
      cards: cards.map((el) => {
        const p = projectById(el.dataset.projectId) || {};
        return {
          name: p.name, runs: p.run_count || 0,
          tier: el.dataset.heat === 'off' ? -1 : Number(el.dataset.heat),
          heat: el.style.getPropertyValue('--heat').trim(),
          alpha: Number(el.style.getPropertyValue('--heat-a')) || 0,
          h: Math.round(el.getBoundingClientRect().height),
          meter: !el.querySelector('.card-meter').hidden,
          runsText: (el.querySelector('.foot-runs') || {}).textContent || '',
        };
      }),
    };
  },
  /* scroll diagnostics: proves long content can actually reach its bottom */
  scrollProbe: () => {
    const probe = (el) => {
      if (!el) return null;
      const before = el.scrollTop;
      el.scrollTop = 1e6;
      const reached = Math.round(el.scrollTop);
      const overflow = Math.round(el.scrollHeight - el.clientHeight);
      el.scrollTop = before;
      return { overflow, reached, ok: overflow > 4 && reached > 4, css: getComputedStyle(el).overflowY, sh: el.scrollHeight, ch: el.clientHeight };
    };
    const activeView = document.querySelector('.view:not([hidden])');
    return {
      main: probe($('#mainScroll')),
      inspector: ui.inspectorId ? probe($('#inspBody')) : null,
      scrollTop: Math.round($('#mainScroll').scrollTop),
      viewH: activeView ? Math.round(activeView.scrollHeight) : null,
      activeView: activeView ? activeView.dataset.view : null,
      views: Array.from(document.querySelectorAll('.view')).map((v) => `${v.dataset.view}${v.hidden ? '(hidden)' : ''}:${Math.round(v.scrollHeight)}`),
      contentH: Math.round($('#libScroll').scrollHeight),
      bodyH: Math.round(document.getElementById('settingsBody').scrollHeight),
      chain: (() => {
        const out = [];
        let el = $('#mainScroll');
        while (el && el !== document.documentElement) {
          const r = el.getBoundingClientRect();
          out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${(el.className || '').toString().split(' ')[0]}: h=${Math.round(r.height)} w=${Math.round(r.width)} display=${getComputedStyle(el).display}`);
          el = el.parentElement;
        }
        return out;
      })(),
      gridRows: {
        body: getComputedStyle(document.body).gridTemplateRows,
        app: getComputedStyle(document.getElementById('app')).gridTemplateRows,
        bodyKids: Array.from(document.body.children).map((c) => `${c.tagName.toLowerCase()}${c.id ? '#' + c.id : ''}.${(c.className || '').toString().split(' ')[0]}=${Math.round(c.getBoundingClientRect().height)}`),
      },
      shell: (() => {
        const appEl = document.getElementById('app');
        const bd = document.body;
        const sb = document.querySelector('.statusbar');
        const ins = document.getElementById('inspector');
        const h = (el) => (el ? Math.round(el.getBoundingClientRect().height) : -1);
        return {
          bodyH: h(bd), appH: h(appEl), mainScrollH: $('#mainScroll').clientHeight,
          statusbarAtBody: sb ? sb.parentElement === bd : null,
          inspectorAtBody: ins ? ins.parentElement === bd : null,
          appHasMainScroll: !!appEl.querySelector('#mainScroll'),
        };
      })(),
    };
  },
};

init();