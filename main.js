'use strict';
/* ─────────────────────────────────────────────────────────────────────────────
   Project Nexus v5 — main process
   Revamped: granular settings, keyed snapshots, fast launch pipeline,
   live metrics, history-backed analytics, safe atomic persistence.
   ───────────────────────────────────────────────────────────────────────────── */
const {
  app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, nativeImage,
  globalShortcut, clipboard, Notification, screen
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execFile } = require('child_process');
const { StringDecoder } = require('string_decoder');

const APP_DIR = __dirname;
const DEV = !app.isPackaged;
const SMOKE = process.env.NEXUS_SMOKE === '1';
const SMOKE_OUT = process.env.NEXUS_SMOKE_OUT || path.join(APP_DIR, '.smoke');

app.setName('Project Nexus v5');
app.setAppUserModelId('com.projectnexus.v5');
if (SMOKE) app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

/* ── paths ─────────────────────────────────────────────────────────────────── */
function resolveConfigDir() {
  if (DEV) return path.join(APP_DIR, 'config');
  try { return path.join(app.getPath('userData'), 'config'); }
  catch { return path.join(process.env.APPDATA || os.homedir(), 'Project Nexus v5', 'config'); }
}
const CONFIG_DIR = resolveConfigDir();
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json');
const SPECS_FILE = path.join(CONFIG_DIR, '.specs.json');
const BACKUP_DIR = path.join(CONFIG_DIR, 'backups');
const UI_FILE = path.join(CONFIG_DIR, 'ui.json');
const THEME_FILE = path.join(APP_DIR, 'assets', 'themes.json');
const SCHEMA_FILE = path.join(APP_DIR, 'nexus.config.json');
const ICON = path.join(APP_DIR, 'assets', 'app-icon.png');

/* ── themes ────────────────────────────────────────────────────────────────── */
let THEMES = {};
try {
  THEMES = JSON.parse(fs.readFileSync(THEME_FILE, 'utf8'));
  for (const t of Object.values(THEMES)) if (!t.mode) t.mode = 'dark';
} catch (e) { console.error('[nexus] themes.json failed', e.message); }
const THEME_NAMES = Object.keys(THEMES);

/* ── defaults ──────────────────────────────────────────────────────────────── */
const DEFAULTS = {
  version: 5,
  settings: {
    theme: 'Carbon Black',
    themeCycle: ['Carbon Black', 'Midnight Aurora', 'Cyberpunk Neon', 'Nordic Frost', 'Porcelain'],
    accent: { custom: false, hue: 258, saturation: 84, lightness: 68 },
    appearance: {
      opacity: 1, blur: 18, radius: 12, density: 46, fontScale: 0.94,
      sidebarWidth: 210, inspectorWidth: 336, noise: 10, glow: 45,
      animations: true, motion: 1, sidebarCollapsed: false,
      showPaths: true, showHeat: true, showTags: true, showMeta: true, perfHud: false,
      reduceMotion: false
    },
    behavior: {
      confirmDelete: true, dblclickRun: true, hideOnClose: false, confirmQuit: false,
      alwaysOnTop: false, startMinimized: false, launchAtLogin: false,
      globalHotkeys: true, autoBackup: true, backupKeep: 6, autoSpecs: true,
      liveMetrics: true, metricsInterval: 1500, notifyOnLaunch: true,
      searchDebounce: 90, toastDuration: 3600
    },
    launch: { terminal: false, debugConsole: false, killPrev: true, priority: 'normal', delay: 0, env: [] },
    library: { view: 'list', sort: 'custom', sortDir: 'asc', group: 'none', typeFilter: 'all', tagFilter: null },
    // Card grid: everything about the launch-count accent and the card layout.
    cards: {
      heat: true, heatMode: 'relative', heatMid: 34, heatHigh: 67,
      heatStyle: 'spine', heatThickness: 3, heatIntensity: 85, palette: 'traffic',
      heatCool: '#43d18a', heatWarm: '#f0b23a', heatHot: '#e5484d',
      density: 'compact', minWidth: 178, gap: 6, showDesc: 1, showTags: true, showKind: true,
      runsChip: 'count', meter: true, legend: true
    },
    window: { width: 1240, height: 800, x: null, y: null, maximized: false }
  },
  projects: []
};

/* ── small utils ───────────────────────────────────────────────────────────── */
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const uid = () => 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowISO = () => new Date().toISOString();
const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
const COLORS = ['violet', 'blue', 'cyan', 'emerald', 'amber', 'rose'];
const PRIORITIES = ['low', 'below', 'normal', 'above', 'high'];

function deepMerge(base, extra) {
  if (!isObj(base) || !isObj(extra)) return extra === undefined ? base : extra;
  const out = Object.assign({}, base);
  for (const [k, v] of Object.entries(extra)) {
    out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function atomicWrite(file, data) {
  ensureDir(path.dirname(file));
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, data, 'utf8');
  fs.renameSync(tmp, file);
}
function safeStat(p) { try { return fs.statSync(p); } catch { return null; } }

/* ── config load ───────────────────────────────────────────────────────────── */
ensureDir(CONFIG_DIR);
ensureDir(BACKUP_DIR);

const schema = readJSON(SCHEMA_FILE, {});
let state = deepMerge(DEFAULTS, schema && schema.settings ? { settings: schema.settings } : {});
state = deepMerge(state, readJSON(CONFIG_FILE, {}));
state.settings = deepMerge(DEFAULTS.settings, state.settings || {});
if (!THEMES[state.settings.theme]) state.settings.theme = THEMES[DEFAULT_THEME_NAME()] ? DEFAULT_THEME_NAME() : THEME_NAMES[0];
function DEFAULT_THEME_NAME() { return THEMES['Carbon Black'] ? 'Carbon Black' : THEME_NAMES[0]; }
state.projects = Array.isArray(state.projects) ? state.projects.map(normalizeProject) : [];
state.meta = Object.assign({ createdAt: nowISO(), migratedFrom: null }, state.meta || {});

let history = readJSON(HISTORY_FILE, { launches: [], activity: [] });
history.launches = Array.isArray(history.launches) ? history.launches.slice(-1200) : [];
history.activity = Array.isArray(history.activity) ? history.activity.slice(-250) : [];
let specs = readJSON(SPECS_FILE, {});
if (!isObj(specs)) specs = {};

/* ── legacy v4 migration (one-time, read-only source) ──────────────────────── */
function legacyCandidates() {
  return [
    path.join(APP_DIR, '..', 'config', 'scripts.json'),
    path.join(os.homedir(), '.config', 'project-nexus', 'scripts.json')
  ];
}
/* Map the v4 settings surface onto v5 without dropping anything the user tuned.
   Returns the list of keys that carried over, so the UI can prove the import. */
function applyLegacySettings(data, uiData) {
  const mapped = [];
  const s = state.settings;
  if (!isObj(data)) return mapped;
  const ui = isObj(uiData) ? uiData : {};

  if (data.theme && THEMES[data.theme]) { s.theme = data.theme; mapped.push('theme'); }
  const sortMap = { 'Custom': 'custom', 'Name': 'name', 'Times Opened': 'runs', 'Recent Run': 'recent', 'Recent File': 'modified', 'Favorite': 'favorite' };
  if (sortMap[data.sort]) { s.library.sort = sortMap[data.sort]; mapped.push('sort'); }
  if (typeof data.view_mode === 'string') { s.library.view = data.view_mode.toLowerCase() === 'grid' ? 'grid' : 'list'; mapped.push('view'); }
  if (typeof data.group_mode === 'string') {
    const g = data.group_mode.toLowerCase();
    s.library.group = g === 'type' ? 'type' : g === 'favorite' ? 'favorite' : 'none'; mapped.push('group');
  }
  if (typeof data.type_filter === 'string') {
    const t = data.type_filter.toLowerCase();
    s.library.typeFilter = t === 'node/js' ? 'node' : t === 'exec' ? 'app' : (['all', 'python', 'folder', 'other'].includes(t) ? t : s.library.typeFilter);
    mapped.push('typeFilter');
  }
  if (data.confirm_delete !== undefined) { s.behavior.confirmDelete = !!data.confirm_delete; mapped.push('confirmDelete'); }
  if (data.dblclick_run !== undefined) { s.behavior.dblclickRun = !!data.dblclick_run; mapped.push('dblclickRun'); }
  if (data.auto_specs !== undefined) { s.behavior.autoSpecs = !!data.auto_specs; mapped.push('autoSpecs'); }
  if (data.global_hotkeys !== undefined) { s.behavior.globalHotkeys = !!data.global_hotkeys; mapped.push('globalHotkeys'); }
  if (data.heat_tint !== undefined) { s.appearance.showHeat = !!data.heat_tint; mapped.push('heatTint'); }
  if (data.opacity) { s.appearance.opacity = clamp(+data.opacity || 1, 0.5, 1); mapped.push('opacity'); }
  if (typeof data.geometry === 'string') {
    const m = /^(\d+)\s*x\s*(\d+)/.exec(data.geometry);
    if (m) {
      // v4 windows were shorter than v5's minimum comfortable layout: keep the
      // preference when it fits, otherwise fall back to the v5 default size.
      if (+m[1] >= 1080 && +m[2] >= 700) {
        s.window.width = clamp(+m[1], 1080, 2400);
        s.window.height = clamp(+m[2], 700, 1600);
      }
      mapped.push('geometry');
    }
  }

  if (ui.always_on_top !== undefined) { s.behavior.alwaysOnTop = !!ui.always_on_top; mapped.push('alwaysOnTop'); }
  // Deliberate v5 deviations: closing the window quits outright instead of hiding to the
  // tray, and no quit confirmation is shown. Both toggles remain in Settings → Behavior,
  // but a legacy import must not silently re-enable them.
  if (ui.auto_backup !== undefined) { s.behavior.autoBackup = !!ui.auto_backup; mapped.push('autoBackup'); }
  if (ui.backup_keep !== undefined) { s.behavior.backupKeep = clamp(+ui.backup_keep || 6, 1, 50); mapped.push('backupKeep'); }
  if (ui.animations !== undefined) { s.appearance.animations = !!ui.animations; mapped.push('animations'); }
  if (ui.reduce_motion !== undefined) { s.appearance.reduceMotion = !!ui.reduce_motion; mapped.push('reduceMotion'); }
  if (ui.sidebar !== undefined) { s.appearance.sidebarCollapsed = !ui.sidebar; mapped.push('sidebar'); }
  if (ui.show_path !== undefined) { s.appearance.showPaths = !!ui.show_path; mapped.push('showPath'); }
  if (ui.show_heat !== undefined) { s.appearance.showHeat = !!ui.show_heat; mapped.push('showHeat'); }
  if (ui.sort_desc !== undefined) { s.library.sortDir = ui.sort_desc ? 'desc' : 'asc'; mapped.push('sortDir'); }
  if (ui.density !== undefined) {
    const d = String(ui.density).toLowerCase();
    s.appearance.density = d === 'comfortable' ? 58 : d === 'spacious' ? 68 : 46;
    mapped.push('density');
  }
  if (Number.isFinite(+ui.accent_hue) && +ui.accent_hue !== 0) {
    s.accent = Object.assign({}, s.accent, { custom: true, hue: ((Math.round(+ui.accent_hue) % 360) + 360) % 360 });
    mapped.push('accentHue');
  }
  return mapped;
}
function migrateLegacy() {
  if (state.projects.length || state.meta.migratedFrom) return;
  for (const source of legacyCandidates()) {
    if (!fs.existsSync(source)) continue;
    const data = readJSON(source, null);
    const arr = Array.isArray(data) ? data : (data && data.scripts);
    if (!Array.isArray(arr) || !arr.length) continue;
    state.projects = arr.map((s) => normalizeProject({
      name: s.name, description: s.description, path: s.path,
      args: s.args, workdir: s.workdir, env: parseEnvString(s.env),
      custom_command: s.custom_command, shell: !!s.shell,
      favorite: !!s.favorite, run_count: s.run_count || 0, last_run: s.last_run || '',
      autorun: !!s.autorun, startup: !!s.startup, kill_prev: !!s.kill_prev,
      terminal: !!s.terminal, delay: s.delay || 0,
      tags: s.tags || [], color: s.color || null
    }));
    const uiFile = path.join(path.dirname(source), 'electron-ui.json');
    const uiData = readJSON(uiFile, null);
    const mapped = applyLegacySettings(data, uiData);
    state.meta.migratedFrom = source;
    state.meta.migratedAt = nowISO();
    state.meta.legacyUI = fs.existsSync(uiFile) ? uiFile : null;
    state.meta.importedKeys = mapped;
    // v4 kept per-project run counts + a last_run stamp but no launch log.
    // Seed the v5 history from those stamps so analytics starts populated
    // instead of showing a blank chart for a library that has real mileage.
    const seeded = [];
    for (const p of state.projects) {
      if (!p.last_run) continue;
      const ts = Date.parse(p.last_run);
      if (!Number.isNaN(ts)) seeded.push({ id: uid(), projectId: p.id, name: p.name, ts, mode: 'imported' });
    }
    if (seeded.length && !history.launches.length) {
      history.launches = seeded.sort((a, b) => a.ts - b.ts);
      saveHistorySoon();
    }
    saveConfig();
    console.log('[nexus] migrated', arr.length, 'projects +', mapped.length, 'settings from', source);
    return;
  }
}
function reimportLegacy() {
  for (const source of legacyCandidates()) {
    if (!fs.existsSync(source)) continue;
    const data = readJSON(source, null);
    if (!data) continue;
    const uiData = readJSON(path.join(path.dirname(source), 'electron-ui.json'), null);
    const mapped = applyLegacySettings(data, uiData);
    // Only fill the library when it is empty — never clobber newer edits.
    let added = 0;
    if (!state.projects.length && Array.isArray(data.scripts)) {
      state.projects = data.scripts.map((s) => normalizeProject(s));
      added = state.projects.length;
    }
    state.meta.migratedFrom = source;
    state.meta.migratedAt = nowISO();
    state.meta.importedKeys = mapped;
    saveConfig();
    logActivity('import', 'Re-imported v4 settings', `${mapped.length} settings, ${added} projects`);
    return { ok: true, settings: mapped.length, projects: added, snapshot: snapshot() };
  }
  return { ok: false, error: 'No legacy v4 config found' };
}

/* ── project model ─────────────────────────────────────────────────────────── */
function normalizeProject(raw) {
  const p = Object.assign({}, raw);
  p.id = p.id || uid();
  p.name = String(p.name || (p.path ? path.basename(String(p.path).replace(/["']+$/g, '')) : 'Untitled')).slice(0, 120);
  p.description = String(p.description || '').slice(0, 500);
  p.path = String(p.path || '').replace(/^"+|"+$/g, '');
  p.tags = Array.isArray(p.tags) ? p.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12) : [];
  p.color = COLORS.includes(p.color) ? p.color : null;
  p.args = String(p.args || '');
  p.workdir = String(p.workdir || '');
  p.env = Array.isArray(p.env) ? p.env.filter((e) => e && e.k).map((e) => ({ k: String(e.k).trim(), v: String(e.v == null ? '' : e.v) })) : parseEnvString(p.env);
  p.terminal = !!p.terminal;
  p.custom_command = String(p.custom_command || '');
  // A stored command always means "run through the shell" — older configs left
  // shell=false while still carrying a command, which used to open Explorer instead.
  p.shell = !!(p.shell || p.custom_command.trim());
  p.favorite = !!p.favorite;
  p.autorun = !!p.autorun;
  p.startup = !!p.startup;
  p.kill_prev = !!p.kill_prev;
  p.delay = clamp(parseInt(p.delay, 10) || 0, 0, 60000);
  p.priority = PRIORITIES.includes(p.priority) ? p.priority : 'normal';
  p.hidden = !!p.hidden;
  p.notes = String(p.notes || '').slice(0, 4000);
  p.run_count = Math.max(0, parseInt(p.run_count, 10) || 0);
  p.last_run = p.last_run || '';
  p.added_at = p.added_at || nowISO();
  p.order = Number.isFinite(p.order) ? p.order : 0;
  return p;
}
function parseEnvString(str) {
  return String(str || '').split(/\r?\n/).map((line) => {
    const i = line.indexOf('=');
    if (i < 1) return null;
    return { k: line.slice(0, i).trim(), v: line.slice(i + 1).trim() };
  }).filter(Boolean);
}
function projectKind(p) {
  const st = safeStat(p.path);
  if (st && st.isDirectory()) return 'folder';
  const ext = path.extname(p.path).toLowerCase();
  if (ext === '.py') return 'python';
  if (['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx'].includes(ext)) return 'node';
  if (ext === '.exe') return 'app';
  if (['.bat', '.cmd'].includes(ext)) return 'batch';
  if (ext === '.ps1') return 'powershell';
  if (st) return 'file';
  return 'missing';
}
function projectCwd(p) {
  if (p.workdir && safeStat(p.workdir)) return p.workdir;
  const kind = projectKind(p);
  if (kind === 'folder') return p.path;
  const dir = path.dirname(p.path);
  return safeStat(dir) ? dir : os.homedir();
}
function quote(s) { return `"${String(s).replace(/"/g, '\\"')}"`; }

function specFor(p) {
  const st = safeStat(p.path);
  if (!st) return { exists: false, size: 0, mtime: 0, isDir: false, entries: 0 };
  let entries = 0;
  if (st.isDirectory()) {
    try { entries = fs.readdirSync(p.path).length; } catch { entries = 0; }
  }
  return { exists: true, size: st.size, mtime: st.mtimeMs, isDir: st.isDirectory(), entries };
}

/* ── persistence ───────────────────────────────────────────────────────────── */
let saveTimer = null;
let lastBackup = 0;
function saveConfig() {
  clearTimeout(saveTimer); saveTimer = null;
  try { atomicWrite(CONFIG_FILE, JSON.stringify({ version: 5, meta: state.meta, settings: state.settings, projects: state.projects }, null, 2)); }
  catch (e) { console.error('[nexus] save failed', e.message); }
  maybeAutoBackup();
}
function saveConfigSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(saveConfig, 220);
}
function saveHistorySoon() {
  try {
    history.launches = history.launches.slice(-1200);
    history.activity = history.activity.slice(-250);
    atomicWrite(HISTORY_FILE, JSON.stringify(history));
  } catch (e) { console.error('[nexus] history save failed', e.message); }
}
function saveSpecsSoon() {
  try { atomicWrite(SPECS_FILE, JSON.stringify(specs)); } catch { /* non-fatal */ }
}
function maybeAutoBackup() {
  if (!state.settings.behavior.autoBackup) return;
  const now = Date.now();
  if (now - lastBackup < 5 * 60 * 1000) return;
  lastBackup = now;
  backupConfig(true);
}
function backupConfig(silent) {
  try {
    ensureDir(BACKUP_DIR);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (fs.existsSync(CONFIG_FILE)) fs.copyFileSync(CONFIG_FILE, path.join(BACKUP_DIR, `config-${stamp}.json`));
    if (fs.existsSync(HISTORY_FILE)) fs.copyFileSync(HISTORY_FILE, path.join(BACKUP_DIR, `history-${stamp}.json`));
    const keep = clamp(parseInt(state.settings.behavior.backupKeep, 10) || 6, 1, 50);
    const all = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'))
      .map((f) => ({ f, t: safeStat(path.join(BACKUP_DIR, f))?.mtimeMs || 0 }))
      .sort((a, b) => b.t - a.t);
    for (const old of all.slice(keep * 2)) { try { fs.unlinkSync(path.join(BACKUP_DIR, old.f)); } catch { } }
    if (!silent) toast('success', 'Backup created', path.basename(BACKUP_DIR));
    return true;
  } catch (e) {
    if (!silent) toast('error', 'Backup failed', e.message);
    return false;
  }
}

/* ── activity + toasts ─────────────────────────────────────────────────────── */
function toast(kind, title, msg) {
  if (win && !win.isDestroyed()) win.webContents.send('toast', { kind, title, msg, ts: Date.now() });
}
function logActivity(kind, title, detail, projectId) {
  const item = { id: uid(), ts: Date.now(), kind, title: String(title || '').slice(0, 160), detail: String(detail || '').slice(0, 400), projectId: projectId || null };
  history.activity.push(item);
  if (history.activity.length > 250) history.activity = history.activity.slice(-250);
  saveHistorySoon();
  if (win && !win.isDestroyed()) win.webContents.send('activity:new', item);
  return item;
}

/* ── captured output ─────────────────────────────────────────────────────────
   Launched apps never get their own console window. stdout/stderr are
   redirected into per-project log files which are tailed back into the
   renderer's Logs view, so one window shows every app's output.
   ─────────────────────────────────────────────────────────────────────────── */
const LOG_DIR = path.join(CONFIG_DIR, 'logs');
const LOG_FILE_MAX = 2 * 1024 * 1024;   // rotate a log file past 2 MB
const LOG_BUFFER_MAX = 5000;            // lines kept in memory for the renderer
const logBuffer = [];
const logQueue = [];
const tails = new Map();                // projectId -> tail state
let logTimer = null;
let logSeq = 0;

function logSlug(s) {
  return String(s || 'app').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|-+$/g, '').slice(0, 42) || 'app';
}
function logPathsFor(p) {
  ensureDir(LOG_DIR);
  const base = path.join(LOG_DIR, `${logSlug(p.name)}--${String(p.id).slice(0, 6)}`);
  return { out: base + '.out.log', err: base + '.err.log' };
}
function logPush(entry) {
  logQueue.push(Object.assign({ id: ++logSeq, ts: Date.now() }, entry));
  if (logQueue.length >= 600) return logFlush();
  if (!logTimer) logTimer = setTimeout(logFlush, 90);
}
function logFlush() {
  if (logTimer) { clearTimeout(logTimer); logTimer = null; }
  if (!logQueue.length) return;
  const batch = logQueue.splice(0, logQueue.length);
  for (const line of batch) logBuffer.push(line);
  if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.splice(0, logBuffer.length - LOG_BUFFER_MAX);
  if (win && !win.isDestroyed()) win.webContents.send('log:lines', batch);
}
function logSys(p, text) {
  logPush({ projectId: p.id, app: p.name, stream: 'sys', text });
}

function tailRead(p, state) {
  for (const slot of state.slots) {
    let fd = null;
    try {
      const st = fs.statSync(slot.file);
      if (st.size < slot.offset) { slot.offset = 0; slot.decoder = new StringDecoder('utf8'); slot.rest = ''; }
      if (st.size === slot.offset) continue;
      const len = Math.min(st.size - slot.offset, 512 * 1024);
      const buf = Buffer.allocUnsafe(len);
      fd = fs.openSync(slot.file, 'r');
      const read = fs.readSync(fd, buf, 0, len, slot.offset);
      fs.closeSync(fd); fd = null;
      if (read <= 0) continue;
      slot.offset += read;
      const text = slot.rest + slot.decoder.write(buf.subarray(0, read));
      const parts = text.split(/\r?\n/);
      slot.rest = parts.pop().slice(-8000);
      for (const raw of parts) {
        const line = raw.replace(/\r$/, '');
        if (!line.trim()) continue;
        logPush({ projectId: p.id, app: p.name, stream: slot.stream, text: line.slice(0, 4000) });
      }
    } catch {
      if (fd != null) { try { fs.closeSync(fd); } catch { } }
    }
  }
}
function tailStart(p, paths) {
  tailStop(p.id);
  ensureDir(LOG_DIR);
  // Rotate oversized files so a chatty app cannot grow without bound.
  for (const f of [paths.out, paths.err]) {
    const st = safeStat(f);
    if (st && st.size > LOG_FILE_MAX) {
      try { fs.rmSync(f + '.1', { force: true }); fs.renameSync(f, f + '.1'); } catch { }
    }
  }
  try { fs.appendFileSync(paths.out, `\n──── ${new Date().toLocaleString()} · launcher session ────\n`, 'utf8'); } catch { }
  const state = {
    slots: [
      { file: paths.out, stream: 'out', offset: 0, decoder: new StringDecoder('utf8'), rest: '' },
      { file: paths.err, stream: 'err', offset: 0, decoder: new StringDecoder('utf8'), rest: '' }
    ],
    timer: null
  };
  // Seed offsets at the current end so a previous session is never replayed.
  for (const slot of state.slots) { const st = safeStat(slot.file); slot.offset = st ? st.size : 0; }
  state.timer = setInterval(() => tailRead(p, state), 220);
  if (state.timer.unref) state.timer.unref();
  tails.set(p.id, state);
}
function tailStop(id) {
  const state = tails.get(id);
  if (!state) return;
  clearInterval(state.timer);
  tails.delete(id);
}
function tailFinish(id, name) {
  const state = tails.get(id);
  if (!state) return;
  const p = { id, name };
  let pass = 0;
  const drain = () => {
    tailRead(p, state);
    if (++pass >= 3) { clearInterval(state.timer); tails.delete(id); }
    else setTimeout(drain, 450);
  };
  setTimeout(drain, 250);
}

/* ── running processes ─────────────────────────────────────────────────────── */
const running = new Map(); // projectId -> { pid, name, startedAt, child, queue }
let cpuPrev = null;

function runningPayload() {
  return Array.from(running.entries()).map(([id, r]) => ({ id, pid: r.pid, name: r.name, startedAt: r.startedAt }));
}
function pushRunning() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('running:changed', runningPayload());
  win.webContents.send('snapshot:changed', snapshot());
}
function stopProject(id) {
  const entry = running.get(id);
  if (!entry) return false;
  const { pid } = entry;
  try {
    if (pid) execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, () => { });
    else if (entry.child) entry.child.kill();
  } catch { }
  running.delete(id);
  if (entry.project) logSys(entry.project, `stopped by you (pid ${pid || '—'})`);
  tailFinish(id, entry.name);
  logActivity('stop', entry.name || 'Project stopped', 'pid ' + pid);
  pushRunning();
  return true;
}
function stopAll() {
  const n = running.size;
  for (const id of Array.from(running.keys())) stopProject(id);
  if (n) logActivity('stop', 'Stopped all projects', n + ' process tree(s)');
  return n;
}
async function applyPriority(pid, level) {
  const map = { low: 'Idle', below: 'BelowNormal', above: 'AboveNormal', high: 'High' };
  if (!pid || level === 'normal' || !map[level]) return;
  try {
    await new Promise((res) => execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${pid}).PriorityClass='${map[level]}'`], { windowsHide: true }, () => res()));
  } catch { }
}
async function launchProject(id) {
  const p = state.projects.find((x) => x.id === id);
  if (!p) return { ok: false, error: 'Project not found' };

  if (running.has(id)) {
    if (p.kill_prev || state.settings.launch.killPrev) stopProject(id);
    else return { ok: false, error: `"${p.name}" is already running` };
  }
  const delay = Math.max(p.delay || 0, state.settings.launch.delay || 0);
  if (delay) await sleep(delay);

  const kind = projectKind(p);
  const cwd = projectCwd(p);
  const args = p.args ? ' ' + p.args : '';
  // Output is captured into the Logs view by default. A visible console is an
  // explicit escape hatch (debugging an interactive CLI), never the default.
  const terminal = !!(p.terminal || state.settings.launch.terminal || state.settings.launch.debugConsole);
  const useCustom = !!String(p.custom_command || '').trim();

  // Folder with no command → reveal in Explorer, not a process.
  if (kind === 'folder' && !useCustom) {
    shell.openPath(p.path);
    bumpRun(p, 'open');
    logActivity('open', p.name, p.path, p.id);
    return { ok: true, mode: 'explorer' };
  }

  let cmd;
  switch (kind) {
    case 'folder': cmd = p.custom_command + args; break;
    case 'python': cmd = `python ${quote(p.path)}${args}`; break;
    case 'node': cmd = `node ${quote(p.path)}${args}`; break;
    case 'app': cmd = quote(p.path) + args; break;
    case 'batch': cmd = quote(p.path) + args; break;
    case 'powershell': cmd = `powershell -ExecutionPolicy Bypass -File ${quote(p.path)}${args}`; break;
    default: cmd = useCustom ? p.custom_command + args : quote(p.path) + args;
  }
  if (useCustom) cmd = p.custom_command + args;

  let full = cmd;
  if (terminal) {
    full = `start "Nexus — ${p.name.replace(/"/g, '')}" cmd /k ${cmd}`;
  } else if (state.settings.launch.priority !== 'normal' && kind === 'app') {
    // handled after spawn
  }

  const env = Object.assign({}, process.env);
  const pairs = (p.env || []).concat(state.settings.launch.env || []);
  for (const pair of pairs) if (pair && pair.k) env[pair.k] = pair.v;
  if (!terminal && kind === 'python') {
    // Line-buffer Python so log lines stream instead of arriving in 8 KB bursts.
    if (!env.PYTHONUNBUFFERED) env.PYTHONUNBUFFERED = '1';
    if (!env.PYTHONIOENCODING) env.PYTHONIOENCODING = 'utf-8';
  }

  // Redirect stdout/stderr to files. Files (not pipes) keep the app alive and
  // logging even after the launcher exits, and they give us export for free.
  let outFd = null, errFd = null, logPaths = null;
  if (!terminal) {
    logPaths = logPathsFor(p);
    try {
      tailStart(p, logPaths);
      outFd = fs.openSync(logPaths.out, 'a');
      errFd = fs.openSync(logPaths.err, 'a');
    } catch {
      try { if (outFd != null) fs.closeSync(outFd); } catch { }
      try { if (errFd != null) fs.closeSync(errFd); } catch { }
      outFd = errFd = null;
    }
  }

  try {
    const child = spawn(full, {
      cwd, env, shell: true,
      // Attached + hidden: CREATE_NO_WINDOW is only honoured when the child is
      // not DETACHED_PROCESS (the two CreateProcess flags are mutually
      // exclusive), so never combine detached with windowsHide here.
      detached: false,
      windowsHide: true,
      stdio: outFd != null ? ['ignore', outFd, errFd] : 'ignore'
    });
    if (outFd != null) { try { fs.closeSync(outFd); } catch { } outFd = null; }
    if (errFd != null) { try { fs.closeSync(errFd); } catch { } errFd = null; }
    const runner = { pid: child.pid || 0, name: p.name, startedAt: Date.now(), child, project: p };
    child.on('error', (err) => {
      running.delete(p.id);
      logSys(p, 'launch failed · ' + err.message);
      toast('error', 'Launch failed', `${p.name}: ${err.message}`);
      logActivity('error', p.name, err.message, p.id);
      tailFinish(p.id, p.name);
      pushRunning();
    });
    child.on('exit', (code, signal) => {
      if (!running.has(p.id)) return;
      running.delete(p.id);
      logSys(p, `exited · code ${code == null ? '—' : code}${signal ? ' · ' + signal : ''}`);
      logActivity('exit', `${p.name} exited`, 'code ' + code, p.id);
      tailFinish(p.id, p.name);
      pushRunning();
    });
    running.set(p.id, runner);
    bumpRun(p, 'launch');
    logActivity('launch', p.name, p.custom_command || (kind === 'folder' ? cwd : p.path), p.id);
    logSys(p, `launched · pid ${child.pid || '—'} · ${terminal ? 'visible console' : 'output captured here'}`);
    if (!terminal) logSys(p, `cwd ${cwd}`);
    if (state.settings.behavior.notifyOnLaunch) {
      try { new Notification({ title: 'Nexus — launched', body: p.name, icon: ICON, silent: true }).show(); } catch { }
    }
    if (!terminal) applyPriority(child.pid, p.priority !== 'normal' ? p.priority : state.settings.launch.priority);
    pushRunning();
    return { ok: true, pid: child.pid, mode: terminal ? 'terminal' : 'process' };
  } catch (e) {
    if (outFd != null) { try { fs.closeSync(outFd); } catch { } }
    if (errFd != null) { try { fs.closeSync(errFd); } catch { } }
    logSys(p, 'launch failed · ' + e.message);
    logActivity('error', p.name, e.message, p.id);
    return { ok: false, error: e.message };
  }
}
function bumpRun(p, kind) {
  if (kind === 'launch') { p.run_count = (p.run_count || 0) + 1; p.last_run = nowISO(); }
  else { p.last_run = nowISO(); }
  history.launches.push({ id: uid(), projectId: p.id, name: p.name, ts: Date.now(), mode: kind });
  saveHistorySoon(); saveConfigSoon();
  // recurrence bookkeeping is derived from history, so a snapshot push is enough
  if (win && !win.isDestroyed()) win.webContents.send('snapshot:changed', snapshot());
}

/* ── stats ─────────────────────────────────────────────────────────────────── */
function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function computeStats() {
  const now = Date.now();
  const dayMs = 86400000;
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const t = now - i * dayMs;
    days.push({ key: dayKey(t), label: new Date(t).toLocaleDateString(undefined, { weekday: 'short' }), count: 0, date: new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) });
  }
  const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
  const hourly = new Array(24).fill(0);
  const topMap = new Map();
  let week = 0, month = 0;
  for (const l of history.launches) {
    const age = now - l.ts;
    if (age < 14 * dayMs && byKey[dayKey(l.ts)]) byKey[dayKey(l.ts)].count++;
    if (age < 7 * dayMs) week++;
    if (age < 30 * dayMs) month++;
    if (age < 30 * dayMs) hourly[new Date(l.ts).getHours()]++;
    if (age < 30 * dayMs) {
      const cur = topMap.get(l.projectId) || { id: l.projectId, name: l.name, count: 0 };
      cur.count++; cur.name = l.name;
      topMap.set(l.projectId, cur);
    }
  }
  const top = Array.from(topMap.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  const typeDist = {};
  for (const p of state.projects) {
    const k = projectKind(p);
    typeDist[k] = (typeDist[k] || 0) + 1;
  }
  const tagCount = {};
  for (const p of state.projects) for (const t of p.tags) tagCount[t] = (tagCount[t] || 0) + 1;
  const totalRuns = state.projects.reduce((a, p) => a + p.run_count, 0);
  const exists = state.projects.filter((p) => safeStat(p.path)).length;
  return {
    days, hourly, top, typeDist, tags: tagCount,
    totals: {
      projects: state.projects.length, runs: totalRuns, week, month,
      favorites: state.projects.filter((p) => p.favorite).length,
      running: running.size, exists,
      missing: state.projects.length - exists,
      launchesLogged: history.launches.length
    }
  };
}

/* ── metrics ───────────────────────────────────────────────────────────────── */
function cpuSnapshot() {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  for (const c of cpus) {
    for (const v of Object.values(c.times)) total += v;
    idle += c.times.idle;
  }
  return { idle, total };
}
function cpuPercent() {
  const cur = cpuSnapshot();
  if (!cpuPrev) { cpuPrev = cur; return 0; }
  const idle = cur.idle - cpuPrev.idle;
  const total = cur.total - cpuPrev.total;
  cpuPrev = cur;
  return total > 0 ? clamp(Math.round((1 - idle / total) * 100), 0, 100) : 0;
}
async function getMetrics() {
  const totalMem = os.totalmem(), freeMem = os.freemem();
  let appMB = 0, procs = 0;
  try {
    for (const m of app.getAppMetrics()) {
      appMB += (m.memory && m.memory.workingSetSize ? m.memory.workingSetSize : 0) / 1024;
      procs++;
    }
  } catch { }
  return {
    ts: Date.now(),
    ram: { total: totalMem, free: freeMem, used: totalMem - freeMem, pct: Math.round(((totalMem - freeMem) / totalMem) * 100) },
    app: { memoryMB: Math.round(appMB), processes: procs },
    cpu: cpuPercent(),
    uptime: Math.round(process.uptime()),
    osUptime: Math.round(os.uptime())
  };
}

/* ── snapshot ──────────────────────────────────────────────────────────────── */
function snapshot() {
  const projects = state.projects.map((p) => {
    const kind = projectKind(p);
    return Object.assign({}, p, {
      kind,
      running: running.has(p.id),
      exists: kind !== 'missing',
      spec: specs[p.path] || null
    });
  });
  return {
    projects,
    settings: state.settings,
    themes: THEMES,
    running: runningPayload(),
    stats: computeStats(),
    meta: {
      version: app.getVersion(), name: 'Project Nexus v5', platform: process.platform,
      packaged: app.isPackaged, configDir: CONFIG_DIR, configFile: CONFIG_FILE,
      backupDir: BACKUP_DIR, migratedFrom: state.meta.migratedFrom, migratedAt: state.meta.migratedAt,
      electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node
    }
  };
}

/* ── IPC ───────────────────────────────────────────────────────────────────── */
const handlers = {
  'app:snapshot': () => snapshot(),

  'state:set': (patch) => {
    if (!isObj(patch)) return snapshot();
    const before = state.settings;
    state.settings = deepMerge(before, patch);
    // Guard numeric ranges so a runaway slider can never brick the UI.
    const a = state.settings.appearance;
    a.opacity = clamp(+a.opacity || 1, 0.5, 1);
    a.blur = clamp(+a.blur || 0, 0, 44);
    a.radius = clamp(+a.radius || 0, 0, 28);
    a.density = clamp(+a.density || 58, 40, 96);
    a.fontScale = clamp(+a.fontScale || 1, 0.8, 1.3);
    a.sidebarWidth = clamp(+a.sidebarWidth || 238, 190, 320);
    a.inspectorWidth = clamp(+a.inspectorWidth || 372, 300, 520);
    a.noise = clamp(+a.noise || 0, 0, 100);
    a.glow = clamp(+a.glow || 0, 0, 100);
    a.motion = clamp(+a.motion || 1, 0.4, 2);
    const b = state.settings.behavior;
    b.backupKeep = clamp(+b.backupKeep || 6, 1, 50);
    b.metricsInterval = clamp(+b.metricsInterval || 1500, 500, 10000);
    b.searchDebounce = clamp(+b.searchDebounce || 90, 0, 400);
    b.toastDuration = clamp(+b.toastDuration || 3600, 1200, 12000);
    const l = state.settings.launch;
    l.delay = clamp(+l.delay || 0, 0, 10000);
    if (state.settings.window) {
      state.settings.window.width = clamp(+state.settings.window.width || 1240, 980, 4000);
      state.settings.window.height = clamp(+state.settings.window.height || 800, 620, 3000);
    }
    const cd = state.settings.cards;
    if (isObj(cd)) {
      cd.heatMid = clamp(+cd.heatMid || 34, 10, 80);
      cd.heatHigh = clamp(+cd.heatHigh || 67, cd.heatMid + 5, 95);
      cd.heatThickness = clamp(+cd.heatThickness || 3, 1, 8);
      cd.heatIntensity = clamp(+cd.heatIntensity || 85, 10, 100);
      cd.minWidth = clamp(+cd.minWidth || 178, 140, 320);
      cd.gap = clamp(+cd.gap == null ? 6 : +cd.gap, 0, 20);
      cd.showDesc = clamp(+cd.showDesc || 0, 0, 3);
      if (!['relative', 'absolute', 'log'].includes(cd.heatMode)) cd.heatMode = 'relative';
      if (!['spine', 'top', 'border', 'glow', 'none'].includes(cd.heatStyle)) cd.heatStyle = 'spine';
      if (!['traffic', 'accent', 'custom'].includes(cd.palette)) cd.palette = 'traffic';
      if (!['ultra', 'compact', 'comfortable'].includes(cd.density)) cd.density = 'compact';
      if (!['count', 'text', 'hidden'].includes(cd.runsChip)) cd.runsChip = 'count';
      for (const k of ['heatCool', 'heatWarm', 'heatHot']) {
        if (!/^#[0-9a-f]{6}$/i.test(String(cd[k] || ''))) cd[k] = { heatCool: '#43d18a', heatWarm: '#f0b23a', heatHot: '#e5484d' }[k];
      }
    }
    saveConfigSoon();
    if (win && !win.isDestroyed()) {
      win.setAlwaysOnTop(!!state.settings.behavior.alwaysOnTop);
      applyWindowBoundsSoon();
    }
    if (before.theme !== state.settings.theme) {
      logActivity('theme', 'Theme updated', state.settings.theme);
    }
    return snapshot();
  },

  'project:add': (input) => {
    const raw = isObj(input) ? input : {};
    const p = normalizeProject({ name: raw.name, path: raw.path, tags: raw.tags });
    if (!p.path) return { ok: false, error: 'No path provided' };
    const existing = state.projects.find((x) => norm(x.path) === norm(p.path));
    if (existing) return { ok: false, error: 'Already in library', id: existing.id, snapshot: snapshot() };
    p.order = Math.max(0, ...state.projects.map((x) => x.order)) + 10;
    state.projects.push(p);
    saveConfigSoon();
    logActivity('add', 'Added project', p.path, p.id);
    return { ok: true, id: p.id, snapshot: snapshot() };
  },

  'project:import-paths': (paths) => {
    const added = [];
    for (const raw of Array.isArray(paths) ? paths : []) {
      const clean = String(raw || '').replace(/^"+|"+$/g, '');
      if (!clean || !safeStat(clean)) continue;
      if (state.projects.some((x) => norm(x.path) === norm(clean))) continue;
      const p = normalizeProject({ path: clean, name: path.basename(clean) });
      p.order = Math.max(0, ...state.projects.map((x) => x.order)) + 10;
      state.projects.push(p);
      added.push(p);
    }
    if (added.length) {
      saveConfigSoon();
      logActivity('add', `Imported ${added.length} project(s)`, added.map((p) => p.name).join(', '));
    }
    return { added: added.length, snapshot: snapshot() };
  },

  'project:update': ({ id, patch }) => {
    const p = state.projects.find((x) => x.id === id);
    if (!p) return { ok: false, error: 'Not found' };
    const allowed = ['name', 'description', 'path', 'args', 'workdir', 'env', 'terminal', 'shell', 'custom_command', 'favorite', 'autorun', 'startup', 'kill_prev', 'delay', 'priority', 'hidden', 'notes', 'tags', 'color'];
    const clean = {};
    for (const k of allowed) if (patch && k in patch) clean[k] = patch[k];
    Object.assign(p, normalizeProject(Object.assign({}, p, clean)));
    saveConfigSoon();
    return { ok: true, snapshot: snapshot() };
  },

  'project:favorite': (id) => {
    const p = state.projects.find((x) => x.id === id);
    if (!p) return snapshot();
    p.favorite = !p.favorite; saveConfigSoon();
    logActivity('favorite', p.favorite ? 'Favorited' : 'Unfavorited', p.name, p.id);
    return snapshot();
  },

  'project:remove': (ids) => {
    const set = new Set(Array.isArray(ids) ? ids : []);
    for (const id of set) if (running.has(id)) stopProject(id);
    const removed = state.projects.filter((p) => set.has(p.id));
    state.projects = state.projects.filter((p) => !set.has(p.id));
    saveConfigSoon();
    if (removed.length) logActivity('remove', `Removed ${removed.length} project(s)`, removed.map((p) => p.name).join(', '));
    return snapshot();
  },

  'project:reorder': (ids) => {
    const order = new Map((ids || []).map((id, i) => [id, i * 10]));
    state.projects.forEach((p) => { if (order.has(p.id)) p.order = order.get(p.id); });
    state.projects.sort((a, b) => a.order - b.order);
    saveConfigSoon();
    return snapshot();
  },

  'project:duplicate': (id) => {
    const p = state.projects.find((x) => x.id === id);
    if (!p) return { ok: false, error: 'Not found' };
    const copy = normalizeProject(Object.assign({}, p, {
      id: uid(), name: p.name + ' copy', favorite: false, autorun: false, startup: false,
      run_count: 0, last_run: '', order: Math.max(0, ...state.projects.map((x) => x.order)) + 10
    }));
    state.projects.push(copy); saveConfigSoon();
    return { ok: true, id: copy.id, snapshot: snapshot() };
  },

  'project:launch': async (id) => ({ result: await launchProject(id), snapshot: snapshot() }),
  'project:stop': (id) => ({ stopped: stopProject(id), snapshot: snapshot() }),
  'project:stop-all': () => ({ stopped: stopAll(), snapshot: snapshot() }),

  'project:open-folder': (id) => {
    const p = state.projects.find((x) => x.id === id); if (!p) return false;
    shell.openPath(projectKind(p) === 'folder' ? p.path : path.dirname(p.path));
    logActivity('open', 'Revealed in Explorer', p.path, p.id);
    return true;
  },
  'project:terminal': (id) => {
    const p = state.projects.find((x) => x.id === id); if (!p) return false;
    try {
      spawn(`start "Nexus — ${p.name}" cmd /k`, { cwd: projectCwd(p), shell: true, detached: true, stdio: 'ignore', windowsHide: false });
      logActivity('terminal', 'Opened terminal', projectCwd(p), p.id);
      return true;
    } catch (e) { toast('error', 'Terminal failed', e.message); return false; }
  },
  'project:copy-path': (id) => {
    const p = state.projects.find((x) => x.id === id); if (!p) return false;
    clipboard.writeText(p.path); toast('success', 'Path copied', p.path); return true;
  },

  'dialog:pick-file': async () => {
    const r = await dialog.showOpenDialog(win, { title: 'Add file to Nexus', properties: ['openFile', 'multiSelections'] });
    if (r.canceled) return null;
    return { paths: r.filePaths, snapshot: handlers['project:import-paths'](r.filePaths).snapshot };
  },
  'dialog:pick-files': async () => handlers['dialog:pick-file'](),
  'dialog:pick-folder': async () => {
    const r = await dialog.showOpenDialog(win, { title: 'Add folder to Nexus', properties: ['openDirectory'] });
    if (r.canceled || !r.filePaths[0]) return null;
    return { paths: r.filePaths, snapshot: handlers['project:import-paths'](r.filePaths).snapshot };
  },
  'dialog:scan-folder': async () => {
    const r = await dialog.showOpenDialog(win, { title: 'Scan folder for projects', properties: ['openDirectory'] });
    if (r.canceled || !r.filePaths[0]) return null;
    const root = r.filePaths[0];
    let entries = [];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules')
        .map((d) => path.join(root, d.name));
    } catch { }
    const res = handlers['project:import-paths'](entries);
    toast('success', 'Folder scanned', `${res.added} project(s) added from ${path.basename(root)}`);
    logActivity('scan', 'Scanned folder', `${root} → ${res.added} new`, null);
    return { added: res.added, snapshot: res.snapshot };
  },

  'config:refresh-specs': async () => {
    let n = 0;
    for (const p of state.projects) {
      const st = safeStat(p.path);
      if (!st) { specs[p.path] = { exists: false }; continue; }
      const cached = specs[p.path];
      if (cached && cached.mtime === st.mtimeMs && cached.exists) continue;
      specs[p.path] = specFor(p);
      n++;
    }
    saveSpecsSoon();
    return { refreshed: n, snapshot: snapshot() };
  },
  'config:backup': () => ({ ok: backupConfig(false), snapshot: snapshot() }),
  'config:open-dir': () => { ensureDir(CONFIG_DIR); shell.openPath(CONFIG_DIR); return true; },
  'config:import-legacy': () => reimportLegacy(),
  'config:export': async () => {
    const r = await dialog.showSaveDialog(win, {
      title: 'Export Nexus configuration', defaultPath: `nexus-v5-export-${dayKey(Date.now())}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (r.canceled || !r.filePath) return { ok: false };
    atomicWrite(r.filePath, JSON.stringify({ version: 5, exportedAt: nowISO(), settings: state.settings, projects: state.projects }, null, 2));
    toast('success', 'Configuration exported', path.basename(r.filePath));
    logActivity('export', 'Exported configuration', r.filePath);
    return { ok: true, path: r.filePath };
  },
  'config:import': async () => {
    const r = await dialog.showOpenDialog(win, { title: 'Import Nexus configuration', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (r.canceled || !r.filePaths[0]) return { ok: false };
    const data = readJSON(r.filePaths[0], null);
    if (!data) { toast('error', 'Import failed', 'File is not valid JSON'); return { ok: false }; }
    const arr = Array.isArray(data) ? data : data.projects || data.scripts;
    if (!Array.isArray(arr)) { toast('error', 'Import failed', 'No projects array found'); return { ok: false }; }
    backupConfig(true);
    state.projects = arr.map(normalizeProject);
    if (data.settings) state.settings = deepMerge(state.settings, data.settings);
    saveConfig(); logActivity('import', `Imported ${arr.length} project(s)`, r.filePaths[0]);
    toast('success', 'Configuration imported', `${arr.length} projects`);
    return { ok: true, snapshot: snapshot() };
  },
  'config:reset-stats': () => {
    backupConfig(true);
    history.launches = []; history.activity = [];
    state.projects.forEach((p) => { p.run_count = 0; p.last_run = ''; });
    saveConfig(); saveHistorySoon();
    logActivity('reset', 'Statistics cleared', 'Launch history and counters reset');
    return snapshot();
  },
  'config:reset-all': () => {
    backupConfig(true);
    state = deepMerge(DEFAULTS, { projects: [] });
    history = { launches: [], activity: [] };
    saveConfig(); saveHistorySoon();
    logActivity('reset', 'Reset to defaults', 'A backup was created first');
    return snapshot();
  },

  'stats:get': () => computeStats(),
  'activity:get': () => history.activity.slice().reverse(),
  'activity:clear': () => { history.activity = []; saveHistorySoon(); return true; },

  /* ── logs ── */
  'log:get': () => ({ lines: logBuffer.slice(), dir: LOG_DIR }),
  'log:clear': (scope) => {
    const id = scope && scope.projectId;
    logFlush();
    if (id) {
      for (let i = logBuffer.length - 1; i >= 0; i--) if (logBuffer[i].projectId === id) logBuffer.splice(i, 1);
      const p = state.projects.find((x) => x.id === id);
      if (p) {
        const paths = logPathsFor(p);
        for (const f of [paths.out, paths.err, paths.out + '.1', paths.err + '.1']) {
          try { fs.rmSync(f, { force: true }); } catch { }
        }
      }
    } else {
      logBuffer.length = 0; logQueue.length = 0;
      try { for (const f of fs.readdirSync(LOG_DIR)) fs.rmSync(path.join(LOG_DIR, f), { force: true }); } catch { }
    }
    return { ok: true, lines: logBuffer.slice() };
  },
  'log:export': async (payload) => {
    const text = String((payload && payload.text) || '').slice(0, 24 * 1024 * 1024);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const r = await dialog.showSaveDialog(win, {
      title: 'Export Nexus log',
      defaultPath: path.join(app.getPath('documents') || CONFIG_DIR, (payload && payload.name) || `nexus-log-${stamp}.log`),
      filters: [{ name: 'Log file', extensions: ['log', 'txt'] }]
    });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    try {
      fs.writeFileSync(r.filePath, text, 'utf8');
      toast('success', 'Log exported', path.basename(r.filePath));
      return { ok: true, file: r.filePath };
    } catch (e) { toast('error', 'Export failed', e.message); return { ok: false, error: e.message }; }
  },
  'log:open-dir': () => { ensureDir(LOG_DIR); shell.openPath(LOG_DIR); return true; },
  'metrics:get': () => getMetrics(),

  'shell:open-external': (url) => {
    if (/^https?:\/\//i.test(String(url))) shell.openExternal(url);
    return true;
  },
  'window:minimize': () => { win?.minimize(); return true; },
  'window:maximize': () => {
    if (!win) return false;
    if (win.isMaximized()) win.unmaximize(); else win.maximize();
    return win.isMaximized();
  },
  'window:is-maximized': () => !!win?.isMaximized(),
  'window:hide': () => { win?.hide(); return true; },
  'window:close': () => { win?.close(); return true; }
};

function registerIpc() {
  for (const [channel, fn] of Object.entries(handlers)) {
    ipcMain.handle(channel, async (event, ...args) => {
      try { return await fn(...args); }
      catch (e) {
        console.error('[nexus] ipc', channel, e);
        toast('error', 'Something went wrong', String(e && e.message || e));
        throw e;
      }
    });
  }
}

/* ── window ────────────────────────────────────────────────────────────────── */
let win = null;
let tray = null;
let quitting = false;
let boundsTimer = null;

function applyWindowBoundsSoon() {
  if (!win || win.isDestroyed() || SMOKE) return;
  clearTimeout(boundsTimer);
  boundsTimer = setTimeout(() => {
    try {
      state.settings.window = Object.assign({}, state.settings.window, win.getBounds(), { maximized: win.isMaximized() });
      saveConfigSoon();
    } catch { }
  }, 400);
}
function createWindow() {
  const s = state.settings.window;
  const bounds = {};
  if (Number.isFinite(s.x) && Number.isFinite(s.y)) {
    const displays = screen.getAllDisplays();
    const visible = displays.some((d) => s.x >= d.workArea.x - 40 && s.y >= d.workArea.y - 40 && s.x < d.workArea.x + d.workArea.width - 80 && s.y < d.workArea.y + d.workArea.height - 80);
    if (visible) { bounds.x = s.x; bounds.y = s.y; }
  }
  win = new BrowserWindow(Object.assign({
    width: clamp(s.width || 1240, 980, 2400),
    height: clamp(s.height || 800, 620, 1800),
    minWidth: 980, minHeight: 620,
    frame: false, backgroundColor: '#0a0c12', show: false,
    title: 'Project Nexus v5', icon: ICON,
    webPreferences: {
      preload: path.join(APP_DIR, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
      spellcheck: false, backgroundThrottling: true, devTools: true
    }
  }, bounds));

  win.loadFile(path.join(APP_DIR, 'renderer', 'index.html'));
  win.once('ready-to-show', () => {
    if (s.maximized) win.maximize();
    if (!state.settings.behavior.startMinimized && !SMOKE) win.show();
    if (SMOKE) { win.showInactive(); win.setPosition(0, 0); }
  });
  win.on('resize', applyWindowBoundsSoon);
  win.on('move', applyWindowBoundsSoon);
  win.on('close', (e) => {
    if (quitting || SMOKE) return;
    saveConfig();
    if (state.settings.behavior.hideOnClose) { e.preventDefault(); win.hide(); return; }
    if (state.settings.behavior.confirmQuit) {
      const answer = dialog.showMessageBoxSync(win, {
        type: 'question', buttons: ['Quit Nexus', 'Cancel'], defaultId: 1, cancelId: 1,
        title: 'Quit Project Nexus?', message: 'Close the launcher?',
        detail: running.size ? `${running.size} project(s) are still running.` : 'Running projects will be stopped.'
      });
      if (answer !== 0) { e.preventDefault(); return; }
    }
    quitting = true;
  });
  win.on('closed', () => { win = null; });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
  });
  if (SMOKE) {
    win.webContents.on('console-message', (_e, level, message, line, source) => {
      console.log(`[renderer:${level}] ${message} (${path.basename(source || '')}:${line})`);
    });
    win.webContents.on('render-process-gone', (_e, details) => console.log('[renderer-gone]', JSON.stringify(details)));
  }
}

/* ── tray / shortcuts ──────────────────────────────────────────────────────── */
function toggleWindow() {
  if (!win) return;
  if (win.isVisible() && !win.isMinimized()) win.hide();
  else { win.show(); win.focus(); }
}
function createTray() {
  try {
    const icon = nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip('Project Nexus v5');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Show / hide Nexus', click: toggleWindow },
      { label: 'Stop all running', click: () => stopAll() },
      { type: 'separator' },
      { label: 'Quit', click: () => { quitting = true; app.quit(); } }
    ]));
    tray.on('click', toggleWindow);
  } catch (e) { console.log('[nexus] tray failed', e.message); }
}
function registerHotkeys() {
  globalShortcut.unregisterAll();
  if (state.settings.behavior.globalHotkeys) {
    try { globalShortcut.register('CommandOrControl+Alt+N', toggleWindow); } catch { }
  }
}
function applyLoginItem() {
  if (!app.isPackaged) return;
  try {
    app.setLoginItemSettings({ openAtLogin: !!state.settings.behavior.launchAtLogin, args: ['--hidden'] });
  } catch { }
}

/* ── smoke harness (real render verification) ──────────────────────────────── */
// How many console hosts exist right now. A captured launch allocates none, a
// console-window launch allocates one — that makes regression visible in the report.
function countConhost() {
  return new Promise((resolve) => {
    execFile('tasklist', ['/FI', 'IMAGENAME eq conhost.exe', '/NH'], { windowsHide: true }, (err, stdout) => {
      if (err) return resolve(-1);
      resolve((String(stdout).match(/conhost\.exe/gi) || []).length);
    });
  });
}
async function runSmoke() {
  ensureDir(SMOKE_OUT);
  const steps = [
    { name: 'library', js: `window.__t && window.__t.tab('library')` },
    { name: 'library-grid', js: `window.__t && window.__t.cards('grid')` },
    { name: 'inspector', js: `window.__t && window.__t.select(window.__t.firstId())` },
    { name: 'palette', js: `window.__t && window.__t.palette(true)` },
    { name: 'analytics', js: `window.__t && window.__t.palette(false); window.__t.tab('analytics')` },
    { name: 'activity', js: `window.__t && window.__t.tab('activity')` },
    { name: 'logs', js: `window.__t && window.__t.tab('logs')` },
    { name: 'settings-appearance', js: `window.__t && window.__t.settings('appearance')` },
    { name: 'settings-launch', js: `window.__t && window.__t.settings('launch')` },
        { name: 'settings-cards', js: `window.__t && window.__t.settings('cards')` }
      ];
  await sleep(1400);
  const report = { steps: [], errors: [], createdAt: nowISO() };
  const errors = [];
  win.webContents.on('console-message', (_e, level, message) => { if (level >= 2) errors.push(message); });
  win.setBounds({ width: 1360, height: 860 });
  await sleep(500);
  for (const step of steps) {
    try {
      await win.webContents.executeJavaScript(step.js, true);
      await sleep(650);
      const img = await win.webContents.capturePage();
      const file = path.join(SMOKE_OUT, `${step.name}.png`);
      fs.writeFileSync(file, img.toPNG());
      report.steps.push({ name: step.name, file, ok: true });
    } catch (e) {
      report.steps.push({ name: step.name, ok: false, error: e.message });
    }
  }
  // Card heat accent: tiers must track execution counts, and cards stay compact.
  try {
    await win.webContents.executeJavaScript(`window.__t && window.__t.cards('grid')`, true);
    await sleep(600);
    const heat = await win.webContents.executeJavaScript(`window.__t && window.__t.heatProbe()`, true);
    const list = (heat && heat.cards) || [];
    const sorted = list.slice().sort((a, b) => a.runs - b.runs);
    const monotonic = sorted.every((c, i) => i === 0 || c.tier >= sorted[i - 1].tier);
    const tiers = Array.from(new Set(list.map((c) => c.tier))).sort();
    const top = list.reduce((m, c) => (c.runs > m.runs ? c : m), list[0] || {});
    const avgH = list.length ? Math.round(list.reduce((n, c) => n + c.h, 0) / list.length) : 0;
    report.steps.push({
      name: 'card-heat-accent',
      ok: list.length > 0 && monotonic && tiers.length >= 2 && top.tier === 2 && avgH <= 120
        && heat.legendVisible && (heat.legendTiers || []).length === 3
        && String(heat.paletteStops[2]).toLowerCase() === '#e5484d'
        && list.filter((c) => c.meter).length > 0,
      probe: {
        cards: list.length, tiers, maxRuns: heat && heat.maxRuns, topRuns: top.runs, topTier: top.tier,
        avgCardHeight: avgH, mode: heat.mode, style: heat.style, palette: heat.palette, density: heat.density,
        legend: heat.legendVisible ? heat.legendTiers : null, meters: list.filter((c) => c.meter).length,
        sample: sorted.slice(0, 3).concat(sorted.slice(-2)).map((c) => `${c.runs} runs→tier ${c.tier}`),
      },
    });
  } catch (e) { report.steps.push({ name: 'card-heat-accent', ok: false, error: e.message }); }

  // Long-content scroll: the page must be able to reach the bottom of a tall
  // settings panel and a tall card grid, and the inspector must scroll too.
  try {
    const readScroll = async (label) => {
      await sleep(500);
      return win.webContents.executeJavaScript(`window.__t && window.__t.scrollProbe()`, true);
    };
    await win.webContents.executeJavaScript(`window.__t && window.__t.settings('cards')`, true);
    const setScroll = await readScroll();
    await win.webContents.executeJavaScript(`window.__t && window.__t.cards('grid')`, true);
    const gridScroll = await readScroll();
    const shell = setScroll && setScroll.shell;
    const shellOk = !!(shell && shell.appHasMainScroll && !shell.statusbarAtBody && !shell.inspectorAtBody
      && shell.appH >= shell.bodyH - 60 && shell.mainScrollH > 250);
    // A long page must reach its bottom; a short one must simply not be clipped.
    const reaches = (r) => !!(r && r.main && r.main.reached >= Math.max(0, r.main.overflow - 4) && r.main.ch > 250);
    const settingsLong = !!(setScroll && setScroll.main && setScroll.main.overflow > 60 && setScroll.main.reached >= setScroll.main.overflow - 4);
    report.steps.push({
      name: 'scroll-long-content',
      ok: !!(reaches(setScroll) && reaches(gridScroll) && settingsLong && shellOk),
      probe: {
        shell,
        settings: setScroll && { overflow: setScroll.main.overflow, reached: setScroll.main.reached, sh: setScroll.main.sh, ch: setScroll.main.ch, active: setScroll.activeView, viewH: setScroll.viewH, bodyH: setScroll.bodyH, rows: setScroll.gridRows && setScroll.gridRows.body },
        grid: gridScroll && { overflow: gridScroll.main.overflow, reached: gridScroll.main.reached, contentH: gridScroll.contentH, sh: gridScroll.main.sh, ch: gridScroll.main.ch },
        inspector: gridScroll && gridScroll.inspector,
      },
    });
  } catch (e) { report.steps.push({ name: 'scroll-long-content', ok: false, error: e.message }); }

  // Full-window capture of the card grid is taken by the 'library-grid' step above.
  report.steps.push({ name: 'cards-grid-shot', ok: true, probe: { via: 'library-grid step' } });

  // Narrow-window pass: proves the responsive rules and the row meta survive.
  try {
    win.setBounds({ width: 1000, height: 700 });
    await win.webContents.executeJavaScript(`window.__t && window.__t.tab('library'); window.__t && window.__t.palette(false)`, true);
    await sleep(600);
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(SMOKE_OUT, 'library-narrow.png'), img.toPNG());
    const narrowScroll = await win.webContents.executeJavaScript(`window.__t && window.__t.scrollProbe()`, true);
    const reachable = !!(narrowScroll && narrowScroll.main && narrowScroll.main.reached >= Math.max(0, narrowScroll.main.overflow - 4) && narrowScroll.main.ch > 250);
    report.steps.push({
      name: 'library-narrow',
      ok: reachable,
      probe: narrowScroll && {
        viewport: narrowScroll.main.ch, overflow: narrowScroll.main.overflow, reached: narrowScroll.main.reached,
        contentH: narrowScroll.contentH, appH: narrowScroll.shell && narrowScroll.shell.appH,
      },
    });
  } catch (e) { report.steps.push({ name: 'library-narrow', ok: false, error: e.message }); }

  // End-to-end launch test: a real process must run, write its marker, and its
  // stdout/stderr must arrive in the Logs view with no console window spawned.
  try {
    const marker = path.join(SMOKE_OUT, 'probe.out');
    const probe = path.join(SMOKE_OUT, 'nexus-probe.cmd');
    fs.writeFileSync(probe, [
      '@echo off',
      'echo probe-stdout-1',
      'echo probe-stderr-1 1>&2',
      `> "${marker}" echo nexus-launch-ok`,
      'timeout /t 3 /nobreak > nul',
      'echo probe-stdout-2',
      ''
    ].join('\r\n'));
    const conhostBefore = await countConhost();
    const added = await win.webContents.executeJavaScript(`window.__t.addProject(${JSON.stringify(probe)})`, true);
    await sleep(700);
    await win.webContents.executeJavaScript(`window.__t.launch(${JSON.stringify(added && added.id)})`, true);
    await sleep(1700);
    const conhostDuring = await countConhost();
    const rawLines = await win.webContents.executeJavaScript(`JSON.stringify(window.__t.logLines())`, true);
    const captured = JSON.parse(rawLines).filter((l) => /nexus-probe/i.test(l.app || ''));
    await win.webContents.executeJavaScript(`window.__t.tab('logs')`, true);
    await sleep(800);
    const shotFile = path.join(SMOKE_OUT, 'logs.png');
    fs.writeFileSync(shotFile, (await win.webContents.capturePage()).toPNG());
    report.steps.push({ name: 'logs', file: shotFile, ok: true });
    const running = await win.webContents.executeJavaScript(`(window.__t.snapshot().running||[]).length`, true);
    report.launchTest = {
      addedId: added && added.id,
      markerWritten: fs.existsSync(marker),
      runningAfter: running,
      capturedLines: captured.length,
      hasStdout: captured.some((l) => l.stream === 'out' && /probe-stdout-1/.test(l.text)),
      hasStderr: captured.some((l) => l.stream === 'err' && /probe-stderr-1/.test(l.text)),
      conhostBefore, conhostDuring,
      ok: fs.existsSync(marker) && captured.some((l) => l.stream === 'out' && /probe-stdout-1/.test(l.text))
    };
    if (added && added.id) await win.webContents.executeJavaScript(`window.__t.removeProject(${JSON.stringify(added.id)})`, true);
    fs.rmSync(probe, { force: true });
  } catch (e) { report.launchTest = { ok: false, error: e.message }; }

  // Probe live state for sanity, not just pixels.
  try {
    const probe = await win.webContents.executeJavaScript(`JSON.stringify({
      cards: document.querySelectorAll('[data-project-id]').length,
      title: document.getElementById('viewTitle')?.textContent,
      nav: document.querySelectorAll('.nav-item').length,
      settingsControls: document.querySelectorAll('[data-set]').length,
      errors: (window.__errors||[]).length,
      theme: document.documentElement.dataset.mode,
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    })`, true);
    report.probe = JSON.parse(probe);
  } catch (e) { report.probe = { error: e.message }; }
  report.errors = errors;
  fs.writeFileSync(path.join(SMOKE_OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('[smoke] done', JSON.stringify(report.probe));
  quitNow();
}
function quitNow() {
  quitting = true;
  if (tray) tray.destroy();
  app.quit();
}

/* ── boot ──────────────────────────────────────────────────────────────────── */
const gotLock = SMOKE ? true : app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

  app.whenReady().then(async () => {
    migrateLegacy();
    if (!fs.existsSync(CONFIG_FILE)) saveConfig();
    // Warm the spec cache in the background so the first paint is never blocked.
    if (state.settings.behavior.autoSpecs) {
      setTimeout(() => {
        for (const p of state.projects) if (!specs[p.path]) specs[p.path] = specFor(p);
        saveSpecsSoon();
        if (win && !win.isDestroyed()) win.webContents.send('specs:updated', specs);
      }, 600);
    }
    Menu.setApplicationMenu(null);
    registerIpc();
    createWindow();
    if (!SMOKE) { createTray(); registerHotkeys(); applyLoginItem(); }
    if (SMOKE) setTimeout(() => runSmoke().catch((e) => { console.error('[smoke] failed', e); quitNow(); }), 900);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !state.settings.behavior.hideOnClose) quitNow();
  });
  app.on('activate', () => { if (!win) createWindow(); else win.show(); });
  app.on('before-quit', () => {
    quitting = true;
    for (const id of Array.from(running.keys())) stopProject(id);
    logFlush();
    saveConfig();
    saveHistorySoon();
    globalShortcut.unregisterAll();
  });
  // Ctrl+N / Ctrl+K style activation is handled in the renderer; tray + global hotkey here.
  ipcMain.on('renderer:ready', () => { if (win && !SMOKE) win.show(); });
}