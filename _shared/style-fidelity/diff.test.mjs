// diff.test.mjs — style-fidelity 순수 로직 TDD.
// 실행: node --test  (또는 node --test diff.test.mjs)
//
// 회고(feedback-publisher-fidelity-retro)의 실제 실패 케이스를 테스트로 고정한다.
// 각 테스트는 "이 하네스가 그 라운드를 잡았을까?"에 대한 회귀 방어.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeColor, normalizeLength, normalizeShadow, normalizeGradient,
  compareValue, expandProps, splitTopLevel,
} from './props.mjs';
import { diffFingerprints } from './diff.mjs';

// helper: 단일 요소 spec/actual 조립
function oneEl(label, refProps, tgtProps, { states } = {}) {
  const wrap = (p) => ({ elements: { [label]: { matched: true, states: { default: p, ...(states || {}) } } }, meta: {} });
  return [wrap(refProps), wrap(tgtProps)];
}

// ── 색 정규화 ──────────────────────────────────────────────────
test('normalizeColor: hex #262a30 == rgb(38,42,48)', () => {
  assert.deepEqual(normalizeColor('#262a30'), { r: 38, g: 42, b: 48, a: 1 });
  assert.deepEqual(normalizeColor('rgb(38, 42, 48)'), { r: 38, g: 42, b: 48, a: 1 });
});
test('normalizeColor: shorthand #abc, rgba, transparent, %', () => {
  assert.deepEqual(normalizeColor('#abc'), { r: 170, g: 187, b: 204, a: 1 });
  assert.equal(normalizeColor('rgba(0,0,0,0)').a, 0);
  assert.deepEqual(normalizeColor('transparent'), { r: 0, g: 0, b: 0, a: 0 });
  assert.equal(normalizeColor('rgba(255,0,0,50%)').a, 0.5);
});
test('normalizeColor: 8-digit hex alpha', () => {
  const c = normalizeColor('#ff000080');
  assert.equal(c.r, 255); assert.equal(c.g, 0); assert.equal(c.b, 0);
  assert.ok(Math.abs(c.a - 0.5) < 0.01);
});
test('normalizeColor: currentcolor/none/garbage → null', () => {
  assert.equal(normalizeColor('currentColor'), null);
  assert.equal(normalizeColor('none'), null);
  assert.equal(normalizeColor('not-a-color'), null);
});

// ── 길이 정규화 ────────────────────────────────────────────────
test('normalizeLength: px→number, keyword 유지', () => {
  assert.equal(normalizeLength('4px'), 4);
  assert.equal(normalizeLength('4.5px'), 4.5);
  assert.equal(normalizeLength('0'), 0);
  assert.equal(normalizeLength('normal'), 'normal');
  assert.equal(normalizeLength('auto'), 'auto');
});

// ── 그림자 파싱 ────────────────────────────────────────────────
test('normalizeShadow: none → [], 단일 파싱(color+offsets)', () => {
  assert.deepEqual(normalizeShadow('none'), []);
  const s = normalizeShadow('rgba(38, 42, 48, 0.08) 0px 2px 8px 0px');
  assert.equal(s.length, 1);
  assert.deepEqual(s[0].color, { r: 38, g: 42, b: 48, a: 0.08 });
  assert.deepEqual(s[0].lengths, [0, 2, 8, 0]);
  assert.equal(s[0].inset, false);
});
test('normalizeShadow: inset + 다중 그림자', () => {
  const s = normalizeShadow('rgb(0,0,0) 0px 1px 2px, inset rgb(255,255,255) 0px 0px 0px 1px');
  assert.equal(s.length, 2);
  assert.equal(s[1].inset, true);
});
test('splitTopLevel: rgba 내부 쉼표 보호', () => {
  assert.deepEqual(splitTopLevel('rgba(1,2,3,4) 0px, rgb(5,6,7) 1px'), ['rgba(1,2,3,4) 0px', 'rgb(5,6,7) 1px']);
});

// ── gradient ───────────────────────────────────────────────────
test('normalizeGradient: 색 canonical화 + 공백 collapse로 동치 판정', () => {
  const a = 'linear-gradient(180deg, rgba(38,42,48,0.20) 0%, rgba(38, 42, 48, 0) 100%)';
  const b = 'linear-gradient(180deg,#262a3033 0%,#262a3000 100%)';
  assert.equal(normalizeGradient(a), normalizeGradient(b));
});

// ── compareValue: 회고 케이스 ─────────────────────────────────
test('compareValue: radius 4px vs 8px → 불일치 (게슈탈트가 놓친 것)', () => {
  const r = compareValue('borderTopLeftRadius', '4px', '8px');
  assert.equal(r.equal, false);
  assert.equal(r.kind, 'length');
});
test('compareValue: radius 4px vs 4.3px → 허용오차 내 일치', () => {
  assert.equal(compareValue('borderTopLeftRadius', '4px', '4.3px').equal, true);
});
test('compareValue: 색 hex vs rgb 동치 → 일치', () => {
  assert.equal(compareValue('backgroundColor', '#262a30', 'rgb(38, 42, 48)').equal, true);
});
test('compareValue: 옅은 그림자 present vs none → 불일치', () => {
  assert.equal(compareValue('boxShadow', 'rgba(0,0,0,0.08) 0px 2px 8px 0px', 'none').equal, false);
});
test('compareValue: 1px 테두리 vs 0px → 불일치', () => {
  assert.equal(compareValue('borderBottomWidth', '1px', '0px').equal, false);
});
test('compareValue: fontWeight bold 동치(700)', () => {
  assert.equal(compareValue('fontWeight', '700', '700').equal, true);
  assert.equal(compareValue('fontWeight', '400', '700').equal, false);
});
test('compareValue: 토큰 미해석 탐지 — ref 실색, target 투명', () => {
  const r = compareValue('backgroundColor', 'rgb(38,42,48)', 'rgba(0, 0, 0, 0)');
  assert.equal(r.tokenSuspect, true);
  assert.equal(r.equal, false);
});
test('compareValue: 양쪽 투명이면 토큰의심 아님', () => {
  const r = compareValue('backgroundColor', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)');
  assert.equal(r.tokenSuspect, false);
  assert.equal(r.equal, true);
});

// ── 적대검증 회귀(2026-07-01 워크플로 발견) ───────────────────
test('compareValue: letterSpacing normal == 0px (Chrome 기본값 오탐 방지)', () => {
  assert.equal(compareValue('letterSpacing', 'normal', '0px').equal, true);
  assert.equal(compareValue('letterSpacing', 'normal', '2px').equal, false); // 실제 자간은 잡힘
});
test('compareValue: transform none == 항등 matrix', () => {
  assert.equal(compareValue('transform', 'none', 'matrix(1, 0, 0, 1, 0, 0)').equal, true);
  assert.equal(compareValue('transform', 'none', 'matrix(1, 0, 0, 1, 0, 8)').equal, false);
  assert.equal(compareValue('transform', 'matrix(1,0,0,1,0,0)', 'matrix(1, 0, 0, 1, 0, 0)').equal, true);
});
test('compareValue: fontFamily 따옴표/콤마공백 무관 동치 (손작성 spec)', () => {
  assert.equal(compareValue('fontFamily', 'Roboto, sans-serif', '"Roboto", sans-serif').equal, true);
});
test('compareValue: 서로 다른 미파싱 색은 오통과 아님 (both-null false PASS 방지)', () => {
  assert.equal(compareValue('color', 'inherit', 'initial').equal, false);
  assert.equal(compareValue('color', 'navy', 'navy').equal, true);
  assert.equal(compareValue('color', 'foocolor', 'barcolor').equal, false); // 미등록끼리 다르면 불일치
});
test('compareValue: CSS named color == hex/rgb 등가물 (손작성 spec)', () => {
  assert.equal(compareValue('color', 'navy', 'rgb(0, 0, 128)').equal, true);
  assert.equal(compareValue('backgroundColor', 'orange', '#ffa500').equal, true);
  assert.equal(compareValue('color', 'rebeccapurple', 'rgb(102, 51, 153)').equal, true);
});
test('compareValue: transform 비수치 matrix를 항등으로 오판 안 함 (arraysClose NaN 가드)', () => {
  assert.equal(compareValue('transform', 'matrix(a,b,c,d,e,f)', 'none').equal, false);
});
test('compareValue: fontWeight 키워드 bold==700, normal==400', () => {
  assert.equal(compareValue('fontWeight', 'bold', '700').equal, true);
  assert.equal(compareValue('fontWeight', 'normal', '400').equal, true);
  assert.equal(compareValue('fontWeight', 'bold', '400').equal, false);
});
test('expandProps: props를 문자열로 잘못 줘도 silent-pass 안 함(배열 강제)', () => {
  assert.deepEqual(expandProps('borderRadius'), [
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
  ]);
});

// ── shorthand 확장 ────────────────────────────────────────────
test('expandProps: borderRadius → 4 corners, 빈 배열 → 전체', () => {
  assert.deepEqual(expandProps(['borderRadius']), [
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
  ]);
  assert.ok(expandProps([]).length > 30);
});

// ── diffFingerprints: 통합 ────────────────────────────────────
test('diff: 완전 일치 → pass, 커버리지 회계', () => {
  const [spec, actual] = oneEl('card', { borderTopLeftRadius: '4px' }, { borderTopLeftRadius: '4px' });
  const map = { elements: [{ label: 'card', reference: '.c', target: '.c', props: ['borderTopLeftRadius'] }] };
  const rep = diffFingerprints(spec, actual, map);
  assert.equal(rep.pass, true);
  assert.equal(rep.coverage.passedElements, 1);
  assert.equal(rep.coverage.comparedElements, 1);
});
test('diff: radius 불일치 → fail + mismatch 기록', () => {
  const [spec, actual] = oneEl('card', { borderTopLeftRadius: '4px' }, { borderTopLeftRadius: '8px' });
  const map = { elements: [{ label: 'card', reference: '.c', target: '.c', props: ['borderRadius'] }] };
  const rep = diffFingerprints(spec, actual, map);
  assert.equal(rep.pass, false);
  assert.ok(rep.mismatches.some((m) => m.prop === 'borderTopLeftRadius'));
});
test('diff: 타깃 셀렉터 매칭 실패 → unmatchedInTarget + not pass', () => {
  const spec = { elements: { card: { matched: true, states: { default: { color: 'rgb(0,0,0)' } } } } };
  const actual = { elements: { card: { matched: false } } };
  const map = { elements: [{ label: 'card', reference: '.c', target: '.x', props: ['color'] }] };
  const rep = diffFingerprints(spec, actual, map);
  assert.equal(rep.pass, false);
  assert.deepEqual(rep.coverage.unmatchedInTarget, ['card']);
  assert.equal(rep.coverage.comparedElements, 0);
});
test('diff: 상태 매트릭스 — hover 불일치 잡힘', () => {
  const spec = { elements: { btn: { matched: true, states: { default: { backgroundColor: 'rgb(0,0,0)' }, hover: { backgroundColor: 'rgb(50,50,50)' } } } } };
  const actual = { elements: { btn: { matched: true, states: { default: { backgroundColor: 'rgb(0,0,0)' }, hover: { backgroundColor: 'rgb(0,0,0)' } } } } };
  const map = { elements: [{ label: 'btn', reference: '.b', target: '.b', states: ['hover'], props: ['backgroundColor'] }] };
  const rep = diffFingerprints(spec, actual, map);
  assert.equal(rep.pass, false);
  assert.ok(rep.mismatches.some((m) => m.state === 'hover'));
});
test('diff: 토큰 이슈는 tokenIssues에도 별도 집계', () => {
  const [spec, actual] = oneEl('bar', { backgroundColor: 'rgb(102,199,28)' }, { backgroundColor: 'rgba(0,0,0,0)' });
  const map = { elements: [{ label: 'bar', reference: '.bar', target: '.bar', props: ['backgroundColor'] }] };
  const rep = diffFingerprints(spec, actual, map);
  assert.equal(rep.tokenIssues.length, 1);
  assert.equal(rep.tokenIssues[0].prop, 'backgroundColor');
});

// ── diff 회계 분기 (적대검증 발견: 통합 테스트가 단일요소·단일상태뿐) ──
test('diff: unmatchedInReference 집계', () => {
  const spec = { elements: { card: { matched: false } } };
  const actual = { elements: { card: { matched: true, states: { default: { color: 'rgb(0,0,0)' } } } } };
  const map = { elements: [{ label: 'card', reference: '.x', target: '.c', props: ['color'] }] };
  const rep = diffFingerprints(spec, actual, map);
  assert.deepEqual(rep.coverage.unmatchedInReference, ['card']);
  assert.equal(rep.pass, false);
});
test('diff: 다중요소 커버리지 6필드', () => {
  const spec = { elements: {
    a: { matched: true, states: { default: { color: 'rgb(0,0,0)' } } },
    b: { matched: true, states: { default: { color: 'rgb(0,0,0)' } } },
    c: { matched: false },
  } };
  const actual = { elements: {
    a: { matched: true, states: { default: { color: 'rgb(0,0,0)' } } },       // pass
    b: { matched: true, states: { default: { color: 'rgb(9,9,9)' } } },        // mismatch
    c: { matched: true, states: { default: { color: 'rgb(0,0,0)' } } },
  } };
  const map = { elements: [
    { label: 'a', reference: '.a', target: '.a', props: ['color'] },
    { label: 'b', reference: '.b', target: '.b', props: ['color'] },
    { label: 'c', reference: '.c', target: '.c', props: ['color'] },
  ] };
  const rep = diffFingerprints(spec, actual, map);
  assert.equal(rep.coverage.mappedElements, 3);
  assert.equal(rep.coverage.comparedElements, 2);   // c는 ref unmatched
  assert.equal(rep.coverage.passedElements, 1);
  assert.equal(rep.coverage.mismatchedElements, 1);
  assert.deepEqual(rep.coverage.unmatchedInReference, ['c']);
});
test('diff: token색+radius 동시 → mismatchedElements 1, tokenIssues 1', () => {
  const [spec, actual] = oneEl('w', { backgroundColor: 'rgb(102,199,28)', borderTopLeftRadius: '4px' },
                                    { backgroundColor: 'rgba(0,0,0,0)', borderTopLeftRadius: '8px' });
  const map = { elements: [{ label: 'w', reference: '.w', target: '.w', props: ['backgroundColor', 'borderTopLeftRadius'] }] };
  const rep = diffFingerprints(spec, actual, map);
  assert.equal(rep.coverage.mismatchedElements, 1);
  assert.equal(rep.tokenIssues.length, 1);
  assert.ok(rep.mismatches.length >= 2);
});
test('diff: options.lengthTol 전파로 pass 전환', () => {
  const [spec, actual] = oneEl('x', { paddingTop: '10px' }, { paddingTop: '11px' });
  const map = { elements: [{ label: 'x', reference: '.x', target: '.x', props: ['paddingTop'] }] };
  assert.equal(diffFingerprints(spec, actual, map).pass, false);                         // 기본 tol 0.5
  assert.equal(diffFingerprints(spec, actual, { ...map, options: { lengthTol: 2 } }).pass, true);
  assert.equal(diffFingerprints(spec, actual, map, { lengthTol: 2 }).pass, true);         // opts arg 우선
});
test('diff: 멀티매치 count 노출 — ambiguousSelectors + countMismatch', () => {
  const spec = { elements: { card: { matched: true, count: 12, states: { default: { color: 'rgb(0,0,0)' } } } } };
  const actual = { elements: { card: { matched: true, count: 8, states: { default: { color: 'rgb(0,0,0)' } } } } };
  const map = { elements: [{ label: 'card', reference: '.card', target: '.card', props: ['color'] }] };
  const rep = diffFingerprints(spec, actual, map);
  assert.ok(rep.coverage.ambiguousSelectors.includes('card'));   // count>1
  assert.ok(rep.coverage.countMismatch.some((c) => c.label === 'card' && c.reference === 12 && c.target === 8));
});
test('diff: 선언 상태가 양쪽 모두 없으면 자기모순(absent→absent) 대신 스킵', () => {
  const spec = { elements: { b: { matched: true, states: { default: { color: 'rgb(0,0,0)' } } } } };
  const actual = { elements: { b: { matched: true, states: { default: { color: 'rgb(0,0,0)' } } } } };
  const map = { elements: [{ label: 'b', reference: '.b', target: '.b', states: ['hover'], props: ['color'] }] };
  const rep = diffFingerprints(spec, actual, map);
  assert.ok(!rep.mismatches.some((m) => m.expected === 'absent' && m.actual === 'absent'));
  assert.equal(rep.pass, true);   // default 일치 + hover는 양쪽 미수집이라 스킵
});

// ── 재정형 이음새(회고 #9 방어) ───────────────────────────────
test('assembleSpec: fingerprint flat 산출 → diff nested 계약으로 변환', async () => {
  const { assembleSpec } = await import('./diff.mjs');
  const captured = [
    { state: 'default', raw: { card: { matched: true, count: 3, props: { color: 'rgb(0,0,0)' } }, gone: { matched: false, count: 0 } } },
    { state: 'hover', raw: { card: { matched: true, count: 3, props: { color: 'rgb(5,5,5)' } } } },
  ];
  const spec = assembleSpec(captured, { side: 'reference' });
  assert.equal(spec.elements.card.matched, true);
  assert.equal(spec.elements.card.count, 3);
  assert.deepEqual(spec.elements.card.states.default, { color: 'rgb(0,0,0)' });
  assert.deepEqual(spec.elements.card.states.hover, { color: 'rgb(5,5,5)' });
  assert.equal(spec.elements.gone.matched, false);
  assert.equal(spec.meta.side, 'reference');
});
