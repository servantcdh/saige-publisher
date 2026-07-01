#!/usr/bin/env node
// diff.mjs — style-fidelity 순수 differ + CLI.
//
// 레퍼런스 spec(정답지에서 뽑은 computed-style)과 타깃 actual(앱에서 뽑은 것)을
// map(요소 대응 + 검사 프로퍼티/상태)에 따라 대조 → 불일치·토큰이슈·커버리지 회계 리포트.
//
// 순수 로직(diffFingerprints)은 브라우저/파일시스템 무관 → diff.test.mjs로 TDD.
// CLI는 --spec/--actual/--map/--out JSON 경로를 받아 리포트 파일을 쓴다.
//
// spec/actual 형태(= extract 산출, fingerprint.js가 상태별로 채움):
//   { elements: { "<label>": { matched: bool, states: { default:{prop:raw,…}, hover:{…} } } },
//     meta: { url, … } }
// map 형태:
//   { elements: [ { label, reference:"<sel>", target:"<sel>", states?:["hover"], props?:["borderRadius",…] } ],
//     options?: { lengthTol, alphaTol } }

import { readFileSync, writeFileSync } from 'node:fs';
import { compareValue, expandProps, FINGERPRINT_PROPS } from './props.mjs';

// ── 순수 코어 ──────────────────────────────────────────────────
export function diffFingerprints(referenceSpec, targetActual, map, opts = {}) {
  const options = { ...(map.options || {}), ...opts };
  const refEls = (referenceSpec && referenceSpec.elements) || {};
  const tgtEls = (targetActual && targetActual.elements) || {};
  const mapEls = (map && map.elements) || [];

  const mismatches = [];
  const tokenIssues = [];
  const unmatchedInReference = [];
  const unmatchedInTarget = [];
  const ambiguousSelectors = []; // 셀렉터가 여러 노드에 매치(nodes[0]만 검사됨) — retro #1 노드레벨 경고
  const countMismatch = [];      // ref/target 매치 개수 상이 — 구조적 완전성 신호
  let comparedElements = 0;
  let passedElements = 0;
  let mismatchedElements = 0;

  for (const el of mapEls) {
    const label = el.label;
    const refEntry = refEls[label];
    const tgtEntry = tgtEls[label];
    const refMatched = refEntry && refEntry.matched !== false && refEntry.states;
    const tgtMatched = tgtEntry && tgtEntry.matched !== false && tgtEntry.states;

    if (!refMatched) unmatchedInReference.push(label);
    if (!tgtMatched) unmatchedInTarget.push(label);
    if (!refMatched || !tgtMatched) continue; // 한쪽이라도 없으면 대조 불가

    // 멀티매치·개수 불일치 회계 (fingerprint가 노출한 count를 버리지 않는다)
    if ((refEntry.count > 1) || (tgtEntry.count > 1)) ambiguousSelectors.push(label);
    if (refEntry.count != null && tgtEntry.count != null && refEntry.count !== tgtEntry.count) {
      countMismatch.push({ label, reference: refEntry.count, target: tgtEntry.count });
    }

    comparedElements++;
    const props = expandProps(el.props);
    const declared = Array.isArray(el.states) ? el.states : [];
    const states = ['default', ...declared.filter((s) => s !== 'default')];
    let elementHasMismatch = false;

    for (const state of states) {
      const refState = refEntry.states[state];
      const tgtState = tgtEntry.states[state];
      if (!refState && !tgtState) continue; // 양쪽 모두 미수집 → 대조 대상 아님(자기모순 absent→absent 회피)
      if (!refState || !tgtState) {
        // 상태가 한쪽에만 있음 → 불일치로 기록
        mismatches.push({ label, state, prop: '(state)', kind: 'state', expected: refState ? 'present' : 'absent', actual: tgtState ? 'present' : 'absent' });
        elementHasMismatch = true;
        continue;
      }
      for (const prop of props) {
        const expected = refState[prop];
        const actual = tgtState[prop];
        if (expected === undefined && actual === undefined) continue; // 둘 다 미수집 → 스킵
        const r = compareValue(prop, expected ?? '', actual ?? '', options);
        if (r.tokenSuspect) tokenIssues.push({ label, state, prop, expected: r.expected, actual: r.actual });
        if (!r.equal) {
          mismatches.push({ label, state, prop, kind: r.kind, expected: r.expected, actual: r.actual, tokenSuspect: r.tokenSuspect });
          elementHasMismatch = true;
        }
      }
    }
    if (elementHasMismatch) mismatchedElements++;
    else passedElements++;
  }

  const coverage = {
    mappedElements: mapEls.length,
    comparedElements,
    passedElements,
    mismatchedElements,
    unmatchedInReference,
    unmatchedInTarget,
    ambiguousSelectors,
    countMismatch,
  };
  const pass = mismatches.length === 0 && unmatchedInReference.length === 0 && unmatchedInTarget.length === 0;

  const summary =
    `${coverage.mappedElements} mapped · ${comparedElements} compared · ${passedElements} pass · ` +
    `${mismatchedElements} mismatch · ${unmatchedInReference.length} unmatched-in-ref · ` +
    `${unmatchedInTarget.length} unmatched-in-target · ${mismatches.length} prop diffs · ${tokenIssues.length} token issues` +
    (ambiguousSelectors.length ? ` · ⚠️${ambiguousSelectors.length} ambiguous-selector` : '') +
    (countMismatch.length ? ` · ⚠️${countMismatch.length} count-mismatch` : '');

  return { pass, coverage, mismatches, tokenIssues, summary };
}

// ── base-vs-HEAD 회귀 모드 (visual-diff 통합) ──────────────────
// styleFingerprintTree 산출 2개(before/after, 같은 셀렉터 공간)를 구조 키로 대조.
// 픽셀 diff가 못 잡는 "렌더는 같은데 computed-style만 바뀐" 변경(토큰 교체 등)을 잡는 게 핵심 가치.
// before/after = { nodes: { '<key>': { tag, props } } }.
// 반환 = { changed, deltas:[{key,tag,prop,kind,before,after,tokenSuspect}], tokenIssues, addedKeys, removedKeys, summary }
export function diffStyle(before, after, opts = {}) {
  const bNodes = (before && before.nodes) || {};
  const aNodes = (after && after.nodes) || {};
  const deltas = [];
  const tokenIssues = [];
  const addedKeys = [];
  const removedKeys = [];

  const keys = new Set([...Object.keys(bNodes), ...Object.keys(aNodes)]);
  for (const key of keys) {
    const b = bNodes[key];
    const a = aNodes[key];
    if (!b) { addedKeys.push(key); continue; }   // HEAD에만 있는 노드
    if (!a) { removedKeys.push(key); continue; } // base에만 있는 노드
    const props = new Set([...Object.keys(b.props || {}), ...Object.keys(a.props || {})]);
    for (const prop of props) {
      const be = b.props[prop];
      const ae = a.props[prop];
      if (be === undefined && ae === undefined) continue;
      const r = compareValue(prop, be ?? '', ae ?? '', opts); // before=expected, after=actual
      if (r.tokenSuspect) tokenIssues.push({ key, tag: a.tag, prop, before: r.expected, after: r.actual });
      if (!r.equal) deltas.push({ key, tag: a.tag, prop, kind: r.kind, before: r.expected, after: r.actual, tokenSuspect: r.tokenSuspect });
    }
  }

  const changed = deltas.length > 0 || addedKeys.length > 0 || removedKeys.length > 0;
  return {
    changed,
    deltas,
    tokenIssues,
    addedKeys,
    removedKeys,
    summary: `${deltas.length} style deltas · ${addedKeys.length} added · ${removedKeys.length} removed nodes` +
      (tokenIssues.length ? ` · ${tokenIssues.length} token issues` : ''),
  };
}

// 재정형 이음새(회고 #9 방어): fingerprint.js flat 산출을 diff 소비 계약으로 변환하는 순수 함수.
// captured = [{ state, raw: {label: {matched, count, props}} }]  (drivers가 상태별로 채움)
// → { elements: { label: { matched, count, states:{[state]:props} } }, meta }
export function assembleSpec(captured, meta = {}) {
  const elements = {};
  for (const { state, raw } of captured) {
    for (const [label, v] of Object.entries(raw || {})) {
      if (!elements[label]) elements[label] = { matched: false, count: v.count ?? 0, states: {} };
      if (v.matched) {
        elements[label].matched = true;
        if (v.count != null) elements[label].count = v.count;
        elements[label].states[state] = v.props || {};
      }
    }
  }
  return { elements, meta };
}

// 사람이 읽는 리포트 텍스트 (완전성 비평 게이트: 미확인 명시)
export function formatReport(report) {
  const lines = [];
  lines.push(report.pass ? '✅ STYLE-FIDELITY PASS' : '❌ STYLE-FIDELITY FAIL');
  lines.push(report.summary);
  lines.push('');
  const c = report.coverage;
  if (c.unmatchedInReference.length) lines.push(`⚠️ 레퍼런스에서 셀렉터 매칭 실패: ${c.unmatchedInReference.join(', ')}`);
  if (c.unmatchedInTarget.length) lines.push(`⚠️ 타깃에서 셀렉터 매칭 실패: ${c.unmatchedInTarget.join(', ')}`);
  if (c.ambiguousSelectors?.length) lines.push(`⚠️ 셀렉터 다중 매칭(nodes[0]만 검사됨 — map을 좁히길): ${c.ambiguousSelectors.join(', ')}`);
  if (c.countMismatch?.length) {
    lines.push('⚠️ 요소 개수 불일치(구조적 신호 — 픽셀 diff도 못 잡음):');
    for (const cm of c.countMismatch) lines.push(`  - ${cm.label}: 레퍼런스 ${cm.reference}개 ↔ 타깃 ${cm.target}개`);
  }
  if (report.tokenIssues.length) {
    lines.push('', '🎨 토큰 미해석 의심 (레퍼런스엔 값, 타깃은 투명/none):');
    for (const t of report.tokenIssues) lines.push(`  - ${t.label} [${t.state}] ${t.prop}: 기대 ${t.expected} → 실제 ${t.actual}`);
  }
  if (report.mismatches.length) {
    lines.push('', '📐 computed-style 불일치:');
    for (const m of report.mismatches) {
      const tag = m.tokenSuspect ? ' (토큰의심)' : '';
      lines.push(`  - ${m.label} [${m.state}] ${m.prop} (${m.kind}): 기대 ${fmt(m.expected)} → 실제 ${fmt(m.actual)}${tag}`);
    }
  }
  if (report.pass) lines.push('', '커버리지 회계: 매핑 전부 대조·일치. (단, map에 없는 요소는 검증 범위 밖 — 완전성은 map 커버리지에 의존.)');
  return lines.join('\n');
}

function fmt(v) {
  if (v === '' || v == null) return '(빈값)';
  return String(v);
}

// ── CLI ───────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { out[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; }
  }
  return out;
}

function isMain() {
  return process.argv[1] && process.argv[1].endsWith('diff.mjs');
}

if (isMain()) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.spec || !args.actual || !args.map) {
    console.error('usage: node diff.mjs --spec <ref.json> --actual <target.json> --map <map.json> [--out <report.json>]');
    process.exit(2);
  }
  const spec = JSON.parse(readFileSync(args.spec, 'utf8'));
  const actual = JSON.parse(readFileSync(args.actual, 'utf8'));
  const map = JSON.parse(readFileSync(args.map, 'utf8'));
  const report = diffFingerprints(spec, actual, map);
  if (args.out && typeof args.out === 'string') writeFileSync(args.out, JSON.stringify(report, null, 2));
  console.log(formatReport(report));
  process.exit(report.pass ? 0 : 1);
}
