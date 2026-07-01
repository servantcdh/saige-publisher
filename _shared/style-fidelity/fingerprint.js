// fingerprint.js — 브라우저 주입 computed-style 추출기.
//
// Playwright `page.evaluate(styleFingerprint, arg)` 또는 chrome MCP `eval`로 주입한다.
// **자기완결**이어야 한다 — page.evaluate는 함수 소스만 브라우저로 넘기므로
// 모듈 스코프의 다른 헬퍼를 참조하면 안 된다(전부 함수 내부에 둔다).
//
// 한 번 호출 = 현재 DOM 상태 1개 캡처. 상태 매트릭스(hover/active 등)는
// 드라이버가 상태를 트리거한 뒤 이 함수를 다시 호출해 조립한다.
//
// arg = { mapElements: [{label, reference, target, props?}], props: [전역 기본 prop], side: 'reference'|'target' }
// 반환 = { "<label>": { matched: bool, count: N, props: { <prop>: "<computedValue>" } } }

export function styleFingerprint(arg) {
  const { mapElements, props: globalProps, side } = arg;
  const result = {};
  for (const el of mapElements) {
    const selector = side === 'reference' ? el.reference : el.target;
    const propList = el.props && el.props.length ? el.props : globalProps;
    let node = null, count = 0;
    try {
      const nodes = document.querySelectorAll(selector);
      count = nodes.length;
      node = nodes[0] || null;
    } catch (e) {
      result[el.label] = { matched: false, count: 0, error: 'bad-selector: ' + String(e && e.message) };
      continue;
    }
    if (!node) { result[el.label] = { matched: false, count: 0 }; continue; }
    const cs = getComputedStyle(node);
    const propsOut = {};
    for (const p of propList) {
      // camelCase 프로퍼티 접근 (borderTopLeftRadius 등). getPropertyValue용 kebab도 대비.
      let v = cs[p];
      if (v == null || v === '') {
        const kebab = p.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
        v = cs.getPropertyValue(kebab);
      }
      propsOut[p] = v == null ? '' : String(v);
    }
    result[el.label] = { matched: true, count, props: propsOut };
  }
  return result;
}

// CommonJS/글로벌 폴백 (chrome MCP eval 문자열로 쓸 때 window에 붙이기)
if (typeof window !== 'undefined') window.__styleFingerprint = styleFingerprint;
