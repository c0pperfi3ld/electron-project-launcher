'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const PUSH = new Set(['snapshot:changed', 'running:changed', 'toast', 'activity:new', 'specs:updated', 'metrics:tick', 'log:lines']);

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('nexus', {
  // ── data ──
  snapshot: () => invoke('app:snapshot'),
  setSettings: (patch) => invoke('state:set', patch),
  addProject: (input) => invoke('project:add', input || {}),
  importPaths: (paths) => invoke('project:import-paths', paths || []),
  updateProject: (id, patch) => invoke('project:update', { id, patch }),
  removeProjects: (ids) => invoke('project:remove', ids || []),
  reorderProjects: (ids) => invoke('project:reorder', ids || []),
  duplicateProject: (id) => invoke('project:duplicate', id),
  toggleFavorite: (id) => invoke('project:favorite', id),

  // ── launch / process ──
  launch: (id) => invoke('project:launch', id),
  stop: (id) => invoke('project:stop', id),
  stopAll: () => invoke('project:stop-all'),

  // ── shell helpers ──
  openFolder: (id) => invoke('project:open-folder', id),
  openTerminal: (id) => invoke('project:terminal', id),
  copyPath: (id) => invoke('project:copy-path', id),
  openExternal: (url) => invoke('shell:open-external', url),

  // ── dialogs ──
  pickFile: () => invoke('dialog:pick-file'),
  pickFiles: () => invoke('dialog:pick-files'),
  pickFolder: () => invoke('dialog:pick-folder'),
  scanFolder: () => invoke('dialog:scan-folder'),

  // ── config ──
  refreshSpecs: () => invoke('config:refresh-specs'),
  exportConfig: () => invoke('config:export'),
  importConfig: () => invoke('config:import'),
  backupNow: () => invoke('config:backup'),
  openConfigDir: () => invoke('config:open-dir'),
  importLegacy: () => invoke('config:import-legacy'),

  resetStats: () => invoke('config:reset-stats'),
  resetAll: () => invoke('config:reset-all'),

  // ── analytics / activity / system ──
  getStats: () => invoke('stats:get'),
  getActivity: () => invoke('activity:get'),
  clearActivity: () => invoke('activity:clear'),
  metrics: () => invoke('metrics:get'),

  // ── captured app output ──
  getLog: () => invoke('log:get'),
  clearLog: (scope) => invoke('log:clear', scope || {}),
  exportLog: (payload) => invoke('log:export', payload || {}),
  openLogDir: () => invoke('log:open-dir'),

  // ── window ──
  minimize: () => invoke('window:minimize'),
  maximize: () => invoke('window:maximize'),
  hide: () => invoke('window:hide'),
  close: () => invoke('window:close'),
  isMaximized: () => invoke('window:is-maximized'),

  // ── drag & drop support (Electron 31+ hides File.path) ──
  pathForFile: (file) => {
    try { return webUtils.getPathForFile(file) || ''; } catch { return (file && file.path) || ''; }
  },

  on: (channel, cb) => {
    if (!PUSH.has(channel)) return () => {};
    const handler = (_e, payload) => cb(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  }
});