#!/usr/bin/env node
/**
 * component-resolve.mjs — Figma data-name → @saige-ai/design-system 컴포넌트 인스턴스 해석기.
 *
 * 목적: composite 시안 변환 시, 시안이 기존 DS 컴포넌트(Button/IconButton/Switch…)를
 * 인스턴스로 조합하면 그 마크업을 평탄화(re-draw)하지 말고 DS 컴포넌트를 import해 재사용한다.
 * 아이콘 resolver와 같은 철학: 권위 레지스트리에 exact match될 때만 reuse, 불확실하면 질문(추정 금지).
 *
 * 분류(classification):
 *   reuse     — data-name이 DS export로 exact 정규화 + 레지스트리 존재 → `<Export/>` import해 재사용
 *   helper    — ⚡️ 프리픽스 Figma 오서링 헬퍼(Text Decorator/Icon Wrapper/Switch Group/Button Group)
 *               → DS 컴포넌트 아님. import X, 부모 스타일에 흡수(flatten)
 *   own-part  — 현재 만드는 컴포넌트의 하위 파트(예: "Image Viewer / Footer") → inline 생성, import X
 *   unresolved— 컴포넌트처럼 보이나 레지스트리에 없음 → 반드시 사용자에게 질문(추정 import 금지)
 *
 * 사용:
 *   node component-resolve.mjs --building "Image Viewer" "Button" "Icon Button" "⚡️ Text Decorator"
 *   node component-resolve.mjs --json --root <design-system path> "Switch"
 */

import { readFileSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dsRoot } from '../_shared/saige-paths.mjs';

// 경로는 _shared/saige-paths.mjs가 해석 (env SAIGE_DS_ROOT → homedir 폴백)
const DEFAULT_ROOT = dsRoot;
const HELPER_MARKERS = ['⚡️', '🪄', '🔁']; // Figma 오서링 헬퍼/슬롯 마커
// 마커 없이도 헬퍼로 취급하는 알려진 Figma 패턴 이름
const HELPER_NAMES = new Set(['Text Decorator', 'Icon Wrapper', 'Switch Group', 'Button Group', 'Slot']);

function walkIndexFiles(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walkIndexFiles(p, acc);
    else if (e === 'index.ts') acc.push(p);
  }
  return acc;
}

// 레지스트리: { ExportName: '@/components/<dir>' }  (value export만, type 제외)
function buildRegistry(root) {
  const compRoot = join(root, 'src', 'components');
  const reg = {};
  for (const idx of walkIndexFiles(compRoot)) {
    const src = readFileSync(idx, 'utf8');
    const dir = relative(compRoot, join(idx, '..')); // e.g. actions/button
    const importPath = `@/components/${dir}`;
    // export { A, B, type C }  /  export const X  /  export function X  /  export { default as X }
    for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
      for (let part of m[1].split(',')) {
        part = part.trim();
        if (!part || part.startsWith('type ')) continue;
        const named = part.replace(/^default as\s+/, '').trim();
        if (/^[A-Z][A-Za-z0-9]*$/.test(named)) reg[named] ??= importPath;
      }
    }
    for (const m of src.matchAll(/export\s+(?:const|function)\s+([A-Z][A-Za-z0-9]*)/g)) {
      reg[m[1]] ??= importPath;
    }
  }
  return reg;
}

function stripMarkers(name) {
  let n = name;
  for (const mk of HELPER_MARKERS) n = n.split(mk).join('');
  return n.trim();
}
function toPascal(name) {
  return name.split(/[\s_\-]+/).filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

export function resolveComponent(figmaName, registry, building) {
  const raw = String(figmaName);
  const hasHelperMarker = HELPER_MARKERS.some((mk) => raw.includes(mk));
  const clean = stripMarkers(raw);

  if (hasHelperMarker || HELPER_NAMES.has(clean)) {
    return { figma: raw, classification: 'helper', export: null };
  }
  // 현재 만드는 컴포넌트의 하위 파트 (예: "Image Viewer / Footer")
  if (building && clean.startsWith(building)) {
    return { figma: raw, classification: 'own-part', export: null };
  }

  // 슬래시 경로명: 우선 전체, 없으면 leaf 시도
  const candidates = [];
  candidates.push(toPascal(clean.replace(/\s*\/\s*/g, ' ')));
  if (clean.includes('/')) candidates.push(toPascal(clean.split('/').pop().trim()));

  for (const c of candidates) {
    if (registry[c]) {
      return { figma: raw, classification: 'reuse', export: c, importPath: registry[c] };
    }
  }
  // 슬래시 포함인데 매칭 실패 → 무언가의 하위 파트일 가능성 높음 → own-part(보수적, false import 회피)
  if (clean.includes('/')) {
    return { figma: raw, classification: 'own-part', export: null };
  }
  return { figma: raw, classification: 'unresolved', export: null };
}

// ---- CLI ----
function main() {
  const argv = process.argv.slice(2);
  let root = DEFAULT_ROOT, building = null, json = false;
  const names = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') root = argv[++i];
    else if (argv[i] === '--building') building = argv[++i];
    else if (argv[i] === '--json') json = true;
    else names.push(argv[i]);
  }
  if (names.length === 0) {
    console.error('사용법: node component-resolve.mjs [--json] [--building "<Name>"] [--root <ds>] <data-name>...');
    process.exit(2);
  }
  const registry = buildRegistry(root);
  const results = names.map((n) => resolveComponent(n, registry, building));

  if (json) {
    console.log(JSON.stringify({ registrySize: Object.keys(registry).length, building, results }, null, 2));
    return;
  }
  const mark = { reuse: '✅', helper: '⚡️', 'own-part': '🔧', unresolved: '❌' };
  console.log(`DS 컴포넌트 레지스트리: ${Object.keys(registry).length} exports` + (building ? `  | building: "${building}"` : '') + '\n');
  for (const r of results) {
    const t = r.classification === 'reuse' ? `<${r.export}/> from '${r.importPath}'`
      : r.classification === 'helper' ? '(헬퍼 — flatten, import X)'
      : r.classification === 'own-part' ? '(현재 컴포넌트 하위 파트 — inline 생성)'
      : '(UNRESOLVED — 사용자에게 질문)';
    console.log(`  ${mark[r.classification]} ${r.figma.padEnd(26)} → ${t}`);
  }
  const un = results.filter((r) => r.classification === 'unresolved');
  console.log(`\n요약: reuse ${results.filter(r=>r.classification==='reuse').length} / helper ${results.filter(r=>r.classification==='helper').length} / own-part ${results.filter(r=>r.classification==='own-part').length} / unresolved ${un.length}`);
  if (un.length) console.log('→ unresolved는 추정 import 금지. 사용자에게 확인 질문(누락 DS 컴포넌트인지/오타인지).');
}

// 심볼릭 링크로 설치돼도 동작하도록 realpath로 비교 (argv[1]은 심볼릭 경로일 수 있음)
const __invoked = process.argv[1] ? realpathSync(process.argv[1]) : '';
if (__invoked === fileURLToPath(import.meta.url)) main();
