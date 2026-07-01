# style-fidelity — 실측 computed-style diff 하네스

픽셀 diff가 **구조적으로 못 잡는 것**(모서리 반경 4↔8, 옅은 그림자, 1px 테두리, 폰트/간격, 미해석 토큰 색, 상태별 스타일)을 요소별 computed-style로 잡는다.

**계기:** safety 홈대시보드 데모에서 픽셀-diff 단독 검증이 10라운드의 갭을 못 잡아 사람이 일일이 짚어야 했다([[feedback-publisher-fidelity-retro]]). 이 하네스가 그 "사람이 회귀 테스트가 되는" 문제를 기계로 대체하는 첫 도구다. [[goal_visual_regression_ci]] / [[ds_visual_diff_pr_integration]]의 building block.

## 방법 — spec-conformance (두-트리 대응 회피)

demo.html DOM과 React DOM은 구조가 달라 **1:1 노드 대응이 난제**다. 그래서 두 트리를 직접 diff하지 않고:

1. **레퍼런스에서 값을 뽑아** `spec.json`(정답지) 생성 — demo.html을 렌더해 computed-style 추출, 또는 Figma 변수로 손 작성.
2. **타깃(앱)을 그 spec에 대조** — 앱을 렌더(인증 통과)해 같은 요소의 computed-style을 뽑아 diff.
3. **요소 대응은 사람이 `map.json`으로 스코핑**(retro 교훈: "scaffold=멀티스테이트 스펙, 사람 스코핑 필요").

imageviewer PoC(30/30)에서 검증된 방식.

## 파일

| 파일 | 역할 | 의존성 |
|---|---|---|
| `props.mjs` | **계약(SSOT)** — 지문 속성셋 + 정규화(색/길이/그림자/gradient/토큰탐지) | 없음(순수) |
| `fingerprint.js` | 브라우저 주입 추출기 (자기완결, `page.evaluate`/MCP `eval`) | 없음(브라우저) |
| `diff.mjs` | 순수 differ + CLI (커버리지 회계·토큰이슈 리포트) | props.mjs |
| `diff.test.mjs` | 순수 로직 TDD (`node --test`, 23 케이스) | props.mjs, diff.mjs |

`append-self-eval.mjs`와 같은 **dep-free ethos** — 핵심은 노드 표준 라이브러리만. 브라우저 구동만 호출자(Playwright/chrome MCP)가 제공.

## 계약 (데이터 형태)

**map.json** (사람이 작성 — 요소 대응 + 검사 범위):
```jsonc
{
  "elements": [
    { "label": "summary-card",
      "reference": ".card",                          // demo.html 셀렉터
      "target": "[class*=MonitoringSummary] .card",  // 앱 셀렉터
      "states": ["hover"],                           // default는 항상 포함
      "props": ["borderRadius", "boxShadow", "padding"] } // 생략 시 전체 지문셋
  ],
  "options": { "lengthTol": 0.5, "alphaTol": 0.03 }
}
```

**spec.json / actual.json** (extract 산출 — 동일 형태). ⚠️`fingerprint.js`는 상태 1개를 flat(`{label:{matched,count,props}}`)으로 반환하고, 드라이버가 `assembleSpec()`(diff.mjs, 순수·테스트됨)으로 아래 nested 형태로 재정형한다 — 이 변환이 유일한 load-bearing 이음새라 순수함수로 못박아 둠(회고 #9):
```jsonc
{
  "elements": {
    "summary-card": {
      "matched": true,
      "states": { "default": { "borderTopLeftRadius": "4px", "boxShadow": "none", ... },
                  "hover":   { ... } }
    }
  },
  "meta": { "url": "...", "side": "reference" }
}
```

**report.json** (diff 산출):
```jsonc
{
  "pass": false,
  "coverage": { "mappedElements": 12, "comparedElements": 11, "passedElements": 8,
                "mismatchedElements": 3, "unmatchedInReference": [], "unmatchedInTarget": ["feed-pill"] },
  "mismatches": [ { "label": "center-card", "state": "default", "prop": "borderTopLeftRadius",
                    "kind": "length", "expected": "4px", "actual": "8px" } ],
  "tokenIssues": [ { "label": "review-bar", "state": "default", "prop": "backgroundColor",
                     "expected": "rgb(102,199,28)", "actual": "rgba(0, 0, 0, 0)" } ],
  "summary": "12 mapped · 11 compared · 8 pass · 3 mismatch · ..."
}
```

**pass 조건:** `mismatches` 0 AND `unmatchedInReference` 0 AND `unmatchedInTarget` 0. **커버리지 회계**(mapped 대비 compared/passed)를 함께 봐야 함 — map에 없는 요소는 검증 범위 밖이라 "pass"가 "전부 확인"을 뜻하지 않는다(완전성은 map 커버리지에 의존).

## 사용법 A — Playwright 드라이버 (CI/자동, repo 내 실행)

repo(예: safety-frontend, playwright 보유)의 `e2e/`에 아래 드라이버를 두고 실행. 순수 헬퍼는 절대경로로 import(dep-free라 위치 무관), playwright는 repo node_modules에서 해석.

```js
// e2e/style-fidelity/run.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
// 경로 SSOT = _shared/saige-paths.mjs 의 styleFidelityDir. 비표준 위치 클론 협업자는
// CLAUDE_SKILLS_DIR(또는 SAIGE_STYLE_FIDELITY_DIR) env만 설정하면 됨(install.sh가 안내).
const SKILLS = process.env.CLAUDE_SKILLS_DIR || `${process.env.HOME}/.claude/skills`;
const SF = process.env.SAIGE_STYLE_FIDELITY_DIR || `${SKILLS}/_shared/style-fidelity`;
const { styleFingerprint } = await import(`${SF}/fingerprint.js`);
const { FINGERPRINT_PROPS, expandProps } = await import(`${SF}/props.mjs`);
const { diffFingerprints, formatReport, assembleSpec } = await import(`${SF}/diff.mjs`);

const map = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync('./e2e/style-fidelity/map.json', 'utf8')));
// map 요소별 props를 롱핸드로 미리 확장(shorthand는 노드에서만 펼침)
const mapElements = map.elements.map((e) => ({ ...e, props: expandProps(e.props) }));

// fingerprint.js는 상태 1개(flat)를 반환. 드라이버가 상태별로 모아 assembleSpec으로
// diff 소비 계약({matched,count,states})으로 재정형한다(회고 #9 이음새 — 순수함수라 테스트됨).
async function capture(page, side) {
  const captured = [];
  captured.push({ state: 'default', raw: await page.evaluate(styleFingerprint, { mapElements, props: FINGERPRINT_PROPS, side }) });
  for (const el of mapElements.filter((e) => (e.states || []).length)) {
    const sel = side === 'reference' ? el.reference : el.target;
    for (const st of el.states) {
      try {
        if (st === 'hover') await page.hover(sel, { timeout: 2000 });
        // active/focus 등 다른 상태는 여기서 트리거 배선(못 하면 그 상태는 커버리지에서 미확인으로 남음)
        captured.push({ state: st, raw: await page.evaluate(styleFingerprint, { mapElements: [el], props: FINGERPRINT_PROPS, side }) });
        await page.mouse.move(0, 0); // 인접 요소 hover 오염 방지(마우스 중립 복귀)
      } catch { /* 트리거 실패 → 그 상태는 미수집 → diff에서 스킵(양쪽 미수집) 또는 (state) 불일치 */ }
    }
  }
  return assembleSpec(captured, { side }); // count도 보존됨 → 멀티매치/개수불일치 리포트
}

const browser = await chromium.launch();
// ── 레퍼런스(demo.html) — file:// 또는 로컬 http
const refPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await refPage.goto(process.env.SF_REFERENCE_URL);         // 예: file:///.../demo.html
const spec = await capture(refPage, 'reference');
// ── 타깃(앱) — 인증 통과 후 대상 페이지
const tgtPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await tgtPage.goto('http://localhost:4200/login');
await tgtPage.fill('input[name="id"]', process.env.SAIGE_DEV_USER);        // ⚠️ name="id"
await tgtPage.fill('input[name="password"]', process.env.SAIGE_DEV_PASS);
await tgtPage.click('[data-testid="login_button"]');
await tgtPage.waitForURL('**/dashboard', { timeout: 15000 });
await tgtPage.goto(process.env.SF_TARGET_URL);            // 예: http://localhost:4200/dashboard
const actual = await capture(tgtPage, 'target');
await browser.close();

const report = diffFingerprints(spec, actual, { ...map, elements: mapElements });
writeFileSync('./e2e/style-fidelity/report.json', JSON.stringify(report, null, 2));
console.log(formatReport(report));
process.exit(report.pass ? 0 : 1);
```

> 자격증명은 env(`SAIGE_DEV_USER`/`SAIGE_DEV_PASS`)로만. gitignore `e2e/.auth/visual-verify.local.json`에서 로드해도 됨. **평문 커밋·채팅 붙여넣기 금지.**

## 사용법 B — chrome MCP (인터랙티브·상태 실측)

드래그·복잡한 상태를 손으로 확인할 때. ★**hidden이면 렌더 throttle로 React 미마운트 → `show_browser` 먼저**([[publisher-visual-verify-auth-gap]]). 로그인 후 `eval`로 `fingerprint.js`의 `__styleFingerprint({mapElements, props, side})`를 주입해 지문을 받고, 노드에서 `diff.mjs`로 대조.

## 사용법 C — base-vs-HEAD 회귀 모드 (DS visual-diff 통합)

앞의 A·B가 **spec-conformance**(구현 vs 시안, map 필요)라면, 이 모드는 **회귀**(base 빌드 vs PR 빌드, map 불필요)다. 같은 story의 base·HEAD 지문을 구조 키로 대조 → **픽셀 diff가 못 잡는 "렌더는 같은데 computed-style만 바뀐" 변경**(토큰 값 교체 등)을 잡는다. DS `visual-diff` 파이프라인은 이미 base·HEAD를 각각 Playwright로 캡처하므로, 그 캡처 세션에 지문 추출만 얹으면 픽셀 diff와 병렬로 공짜로 따라온다.

```js
// 캡처 시 (base·HEAD 각각): screenshot 직후 같은 page에서
const tree = await page.evaluate(styleFingerprintTree, { root: '#storybook-root', props: FINGERPRINT_PROPS });
writeFileSync(`${outDir}/${theme}/${id}.style.json`, JSON.stringify(tree));

// diff 시 (같은 id·theme의 before/after):
import { diffStyle } from '.../diff.mjs';
const styleDelta = diffStyle(beforeTree, afterTree); // → { changed, deltas:[{key,prop,before,after}], tokenIssues, added/removedKeys }
```

- `styleFingerprintTree`(fingerprint.js)가 root 서브트리를 구조 키(`tag[nth]/…`)로 전수 순회 → 스타일만 바뀐 노드가 base/HEAD에서 같은 키로 매칭.
- `diffStyle`(diff.mjs)은 `compareValue` 정규화를 **그대로 재사용**(hex↔rgb 등 동일 규칙). 순수 함수 → 테스트됨.
- ⚠️ **통합 함정:** visual-diff 뷰어의 "interesting" 필터가 `status !== 'unchanged'`(픽셀 기준)면 **style-only 변경이 통째로 누락**된다. `styleDelta.changed`를 OR로 넣어야 이 모드의 가치가 산다.

## 9-패턴 커버리지 맵 (회고 대비)

| # | 회고 실패 패턴 | 이 하네스가 잡는가 | 방식 |
|---|---|---|---|
| 1 | 표본검사를 전수로 착각 | △ | 커버리지 회계로 "미확인 X" 명시(**label 단위**). 단 map이 좁으면 못 잡음(사람 책임). ⚠️**한 label이 N노드에 매치되면 nodes[0]만 검사** → `ambiguousSelectors`로 경고하지만 노드 레벨 전수는 아님 |
| 2 | 계층 잘못 봄(래퍼 놓침) | ✅ | map에 래퍼·잎 각각 label → 래퍼도 대조 |
| 3 | 인터랙션/배선 후 회귀 | △ | 상태 매트릭스(hover/active)는 잡음. 모달 draft 같은 앱-로직 회귀는 범위 밖(e2e 몫) |
| 4 | 게슈탈트 done(radius4v8·그림자·1px) | ✅ | **정확히 이걸 위해 만듦** — length/shadow/border 정규화 대조 |
| 5 | 소스 안 읽고 추측 | ✗(도구 밖) | 진실원천 해석은 사람/스킬 게이트1. 도구는 값 대조만 |
| 6 | 짝퉁 메커니즘 | ✗(도구 밖) | 메커니즘 충실도는 스킬 게이트4(코드 리뷰) |
| 7 | 정적 캡처에 없는 상태 | ✅¹ | 상태 매트릭스로 트리거 후 재추출. ¹**드라이버가 그 상태를 트리거할 수 있을 때만** — hover는 배선됨, 그 외(active/focus/스크롤로만 보이는 pill·페이드)는 map author가 트리거를 배선해야 하고, 못 하면 양쪽 미수집으로 스킵(false-clean 아님, 커버리지에서 미확인) |
| 8 | 토큰 미해석(투명 렌더) | ✅ | ref 실색 vs target 투명 → tokenIssues |
| 9 | 포팅 이음새(계약 없음) | ✅(자기방어) | props.mjs 단일 계약 seam + `assembleSpec` 재정형 순수함수(테스트됨)로 fingerprint↔diff 형태 고정 |

**정직한 한계:** 도구는 #4·#8·#2를 결정론으로 잡고, #1·#3·#7은 부분(회계는 label 단위·상태는 트리거 가능한 것만). #5·#6은 **도구가 아니라 스킬 게이트(사람/리뷰)**의 몫 — 이 하네스는 6게이트 중 게이트 2(computed-style diff)·5(토큰)·3(상태) 일부를 자동화할 뿐, 진실원천·메커니즘은 여전히 판단이 필요하다. 추가로 **요소 개수 차이**(레퍼런스 12행 vs 앱 8행)는 `countMismatch`로 경고하지만 pass를 자동 실패시키진 않는다(map이 의도적으로 first-of-many를 겨냥할 수 있어서 — 사람이 판단). "픽셀 점수 통과 = done"을 "spec 대조 통과 + 커버리지 회계(멀티매치·개수불일치 경고 포함) = done의 필요조건"으로 올리는 것이 이 도구의 정확한 기여.

## visual-verify 스킬 배선

`saige-product-visual-verify` v0.5 게이트 2(계층 전수 computed-style diff)의 실행 도구. 스킬이 map.json을 스코핑 → 드라이버 실행 → report.json을 fidelity 판정에 포함. `avgScore`(픽셀)와 병행, `pass=false`면 머지 게이트 미통과.
