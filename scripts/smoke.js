#!/usr/bin/env node
'use strict';
/* Nexus v5 smoke runner — boots the real app twice:
   pass 1 "fresh"  : no config yet → exercises the legacy import path
   pass 2 "reload" : boots again on the config pass 1 wrote → exercises
                     module-load normalisation of stored projects
   Each pass captures screenshots, probes the DOM and runs a real launch test.
   Uses a local Electron when installed, otherwise the parent folder's copy. */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const appDir = path.join(__dirname, '..');
const outRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.join(appDir, '.smoke');

function electronBin() {
  const candidates = [
    path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe'),
    path.join(appDir, '..', 'node_modules', 'electron', 'dist', 'electron.exe'),
    path.join(appDir, 'node_modules', '.bin', 'electron'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  console.error('No Electron binary found. Run `npm install` inside updated/ first.');
  process.exit(1);
}

function runPass(bin, outDir, label) {
  console.log(`\n[smoke] ${label} → ${outDir}`);
  const res = spawnSync(bin, [appDir], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { NEXUS_SMOKE: '1', NEXUS_SMOKE_OUT: outDir })
  });
  const file = path.join(outDir, 'report.json');
  const report = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  return { label, status: res.status, report };
}

const bin = electronBin();
fs.mkdirSync(outRoot, { recursive: true });
const passes = [
  runPass(bin, path.join(outRoot, 'fresh'), 'pass 1 · fresh install'),
  runPass(bin, path.join(outRoot, 'reload'), 'pass 2 · reload saved config'),
];

let failed = false;
for (const p of passes) {
  const rep = p.report;
  const ok = p.status === 0 && !!rep && rep.errors.length === 0 && rep.steps.every((s) => s.ok) && !!(rep.launchTest && rep.launchTest.ok);
  if (!ok) failed = true;
  console.log(`[smoke] ${p.label}: ${ok ? 'PASS' : 'FAIL'}`);
  if (rep) {
    console.log(`        cards=${rep.probe.cards} theme=${rep.probe.theme} renderer-errors=${rep.errors.length}`);
    console.log(`        launch test=${JSON.stringify(rep.launchTest)}`);
    console.log(`        steps=${rep.steps.map((s) => s.name + (s.ok ? '' : '!')).join(', ')}`);
  } else {
    console.log(`        no report produced (exit ${p.status})`);
  }
}
console.log(`\n[smoke] ${failed ? 'FAILURES PRESENT' : 'all passes green'} · artifacts in ${outRoot}`);
process.exit(failed ? 1 : 0);
