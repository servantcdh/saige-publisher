#!/usr/bin/env node
/**
 * icon-resolve.mjs — Figma 아이콘명(snake_case) → @saige-ai/icons export 결정론적 해석기.
 *
 * 목적: saige-ds-figma-to-vex가 시안의 아이콘을 코드로 옮길 때, 임의 추정(할루시네이션)
 * 없이 권위 소스(@saige-ai/icons 설치본)에 exact match될 때만 자동 사용하고,
 * 매핑이 불확실하면 UNRESOLVED로 보고해 호출자가 사용자에게 묻게 한다.
 *
 * 신뢰도 등급:
 *   high  — direct(snake→Icon+Pascal 직변환) 또는 alias가 레지스트리에 exact 존재 → 자동 사용 OK
 *   low   — 후행 style 세그먼트(bold/solid 등)를 떼야 매칭됨 → 글리프 다를 위험, 사용자 확인 권장
 *   none  — 어떤 규칙으로도 exact match 없음 → 반드시 사용자에게 질문 (추정 금지)
 *
 * 사용:
 *   node icon-resolve.mjs corner_fit magnifying_plus channels
 *   node icon-resolve.mjs --json chevron_down_bold warning_triangle
 *   node icon-resolve.mjs --dts <path> ...   # 레지스트리 .d.ts 경로 override
 */

import { readFileSync } from 'node:fs';

const DEFAULT_DTS =
  '/Users/donghochoi/Documents/design-system/node_modules/@saige-ai/icons/dist/index.d.ts';

// 검증된 의미 불일치만 등재 (예: Figma명과 export명이 어휘적으로 다른 경우).
// 비어 있는 게 기본 — 추정 alias보다 UNRESOLVED가 안전.
const ALIASES = {
  // 'figma_name': 'IconExactExport',
};

// 후행에 오면 떼고 base를 시도해볼 수 있는 style 세그먼트 (low 등급으로만)
const STYLE_SUFFIXES = new Set(['bold', 'solid', 'fill', 'filled', 'line', 'outline', 'regular']);

function loadRegistry(dtsPath) {
  const src = readFileSync(dtsPath, 'utf8');
  const set = new Set();
  for (const m of src.matchAll(/\bIcon[A-Z][A-Za-z0-9]+\b/g)) set.add(m[0]);
  if (set.size === 0) throw new Error(`레지스트리에서 Icon export를 못 찾음: ${dtsPath}`);
  return set;
}

function toPascal(name) {
  return name
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('');
}

export function resolveIcon(figmaName, registry) {
  const clean = String(figmaName).trim();

  // 1) 검증된 alias 우선
  if (ALIASES[clean] && registry.has(ALIASES[clean])) {
    return { figma: clean, export: ALIASES[clean], confidence: 'high', via: 'alias' };
  }

  // 2) direct 직변환 exact match
  const direct = 'Icon' + toPascal(clean);
  if (registry.has(direct)) {
    return { figma: clean, export: direct, confidence: 'high', via: 'direct' };
  }

  // 3) 후행 style 세그먼트 제거 후 base 시도 (low — 글리프 다를 수 있어 확인 필요)
  const segs = clean.split(/[_\-\s]+/).filter(Boolean);
  if (segs.length > 1 && STYLE_SUFFIXES.has(segs.at(-1).toLowerCase())) {
    const base = 'Icon' + toPascal(segs.slice(0, -1).join('_'));
    if (registry.has(base)) {
      return {
        figma: clean,
        export: base,
        confidence: 'low',
        via: `dropped-suffix:${segs.at(-1)}`,
      };
    }
  }

  // 4) 해석 불가 → 사용자에게 질문 (추정 금지)
  return { figma: clean, export: null, confidence: 'none', via: 'UNRESOLVED' };
}

// ---- CLI ----
function main() {
  const argv = process.argv.slice(2);
  let dts = DEFAULT_DTS;
  let json = false;
  const names = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dts') dts = argv[++i];
    else if (argv[i] === '--json') json = true;
    else names.push(argv[i]);
  }
  if (names.length === 0) {
    console.error('사용법: node icon-resolve.mjs [--json] [--dts <path>] <figma_icon_name>...');
    process.exit(2);
  }

  const registry = loadRegistry(dts);
  const results = names.map((n) => resolveIcon(n, registry));

  if (json) {
    console.log(JSON.stringify({ registrySize: registry.size, results }, null, 2));
    return;
  }

  const mark = { high: '✅', low: '⚠️', none: '❌' };
  console.log(`레지스트리: ${registry.size} icons (@saige-ai/icons)\n`);
  for (const r of results) {
    const target = r.export ?? '(UNRESOLVED — 사용자에게 질문)';
    console.log(`  ${mark[r.confidence]} ${r.figma.padEnd(22)} → ${target.padEnd(26)} [${r.via}]`);
  }
  const none = results.filter((r) => r.confidence === 'none');
  const low = results.filter((r) => r.confidence === 'low');
  console.log(
    `\n요약: high ${results.filter((r) => r.confidence === 'high').length} / low ${low.length} / none ${none.length}` +
      `  (총 ${results.length})`,
  );
  if (none.length || low.length) {
    console.log('→ low/none 항목은 자동 사용 금지. 사용자에게 확인 질문 (할루시네이션 방지).');
  }
}

// 직접 실행 시에만 CLI 동작 (import 시엔 resolveIcon만 노출)
if (import.meta.url === `file://${process.argv[1]}`) main();
