---
name: saige-product-visual-verify
description: safety-frontend 페이지/위젯의 Figma 시안 ↔ Vite dev server 시각 정합도 자동 측정. Playwright + 로컬 Vite + Figma MCP screenshot 비교. Storybook 9.1.3 보유라 컴포넌트 단위는 Storybook 활용, 페이지 단위는 dev server 직접. Design Fidelity Score 0-100 산출.
---

# saige-product-visual-verify

safety-frontend 작업물의 시각 정합도 측정. DS의 `saige-ds-visual-verify`와 별개.

## 적용 시점

- 신규 페이지 작업 완료 후
- 머지 게이트 (PR 머지 전)
- 본인 자기평가 편향 검출

## 핵심 차이 (DS vs Product)

| 항목 | DS | Product |
|---|---|---|
| 시각 검증 대상 | Storybook iframe (컴포넌트 단위) | Vite dev server (페이지 단위) + Storybook (컴포넌트 단위) |
| URL 패턴 | `iframe.html?id={story-id}` | `localhost:4200/<route>` (또는 Vite 기본 포트) |
| 인증 우회 | (Storybook 인증 없음) | safety-frontend는 로그인 필요 → 테스트 모드 또는 mock 토큰 |

## ★ 시안 정합 하네스 (v0.5, 2026-07-01 회고 반영) — 픽셀 diff 위 필수 게이트

**계기:** 홈대시보드 데모(safety)에서 이 스킬의 **픽셀-diff 단독 검증이 10라운드의 갭을 못 잡아 사람이 일일이 짚어야 했다**. 근본 원인: 단일 프레임·다운스케일·라이브 데이터 노이즈·값 추측·짝퉁 기능·토큰 미해석. → 픽셀 diff 위에 아래 **6개 기계 게이트**를 필수로 얹는다. 상세 회고 [[feedback-publisher-fidelity-retro]].

**done 조건 재정의:** 게슈탈트("전체적으로 맞아 보인다")로 종료 **금지**. 6게이트 통과 + **커버리지 회계**("요소 N개 중 M개 확인, 미확인 X개 목록")를 남긴 뒤에야 done. `avgScore`(픽셀)만으로 통과시키지 말 것.

### 게이트 1 — 진실원천 해석 (값 추측 금지)
값(색·크기·radius·간격·차트옵션)을 **추측하는 순간 멈추고 정의처를 찾는다**: Figma 변수/토큰 → 컴포넌트 소스 → 라이브러리 기본값 → **레퍼런스의 실제 소스**. 특히 차트·복합 위젯이 번들(saige-charts 등)로 렌더되면 `demo.html`이 아니라 그 **번들 소스**(예: `charts-src/*Island.jsx`)를 읽어 ECharts option을 1:1 이식. (홈대시보드 실패: 바 option을 추측 → `charts-src/BarIsland.jsx`가 옆에 있었음.)

### 게이트 2 — 계층 전수 computed-style diff
픽셀뿐 아니라 **요소별 computed style**(box model·color·borderRadius·boxShadow·font·gap·border)을 **컨테이너~잎 전 계층**에서 레퍼런스와 대조. 잎만 재지 말고 **감싸는 래퍼도 잰다**(실패: 피드행은 맞았는데 감싸는 카드 래퍼가 radius8+shadow로 틀림). 앵커 견고화 필수: ①컨테이너로 스코프 ②동일 텍스트 요소 dedup ③상식체크(요소 top이 부모 top보다 위일 수 없음 — 내 계측도 이 오탐 냈음).

**실행 도구:** `~/.claude/skills/_shared/style-fidelity/`(spec-conformance 하네스, `node --test` 통과). `map.json`으로 요소 대응을 스코핑(레퍼런스 셀렉터↔앱 셀렉터 + 상태) → 드라이버(Playwright/chrome MCP)로 레퍼런스·앱 양쪽 지문 추출 → `diff.mjs`가 **불일치(radius 4↔8·옅은 그림자·1px·폰트)·토큰 미해석·커버리지 회계**를 리포트. `pass=false`면 게이트 미통과. 상세·드라이버 템플릿은 그 디렉토리 README.md. 게이트 3(상태)·게이트 5(토큰)도 이 도구가 일부 자동화(상태 매트릭스 추출 + tokenIssues).

### 게이트 3 — 상태 매트릭스 (단일 프레임 금지)
컴포넌트별 **상태 × 인터랙션**을 열거하고 **각각 트리거·검증**: default / hover / active / disabled / focus / empty / overflow / loading + click·drag·scroll·모달 open. 정적 1프레임은 페이드·pill·hover 툴팁·실시간 애니를 **원천적으로 못 본다**(홈대시보드 갭 다수가 여기).

### 게이트 4 — 메커니즘 충실도
레퍼런스가 **라이브러리/컴포넌트 X**를 쓰면 **X(또는 그 프리미티브)를 쓴다**. 시각만 흉내낸 짝퉁 금지(실패: 차트 hover를 라이브러리 네이티브 패널이 아닌 손툴팁으로 때움). "비슷해 보임" ≠ "같은 메커니즘".

### 게이트 5 — 토큰 해석 체크
레퍼런스 CSS 변수/디자인 토큰이 **타깃 앱 테마에 실제로 존재하는지** 확인. 없으면 매핑하거나 폴백값 지정. **미해석 `var(--x)` 사용 금지**(실패: `--bar-track`/`--success`/`--delta-up` 미정의 → 투명·무효 렌더, 코드는 "맞아 보이는데" 런타임이 달랐음).

### 게이트 6 — 완전성 비평 (마지막 패스)
"레퍼런스에 있는데 **내가 안 띄운 상태·안 트리거한 인터랙션·안 해석한 값**은?" 스스로 묻고 목록화 → 그게 다음 검증 대상.

### 라이브 데이터 노이즈
실시간 변하는 영역(숫자·피드·애니)은 **픽셀 diff에서 마스크**(안 그러면 diff가 노이즈로 뒤덮임). 구조·스타일 정합은 **게이트 2(computed-style diff)**로 판정 — 픽셀 diff는 레이아웃/색의 보조 지표로만.

## 동작 5단계

### 1단계 — Figma 시안 이미지 수집
- `mcp__figma__get_screenshot(nodeId)` — 페이지 또는 컴포넌트 cell
- 결과: `.visual-verify/<page>/figma/<cell-id>.png`

### 2단계 — Vite dev server 캡쳐 (페이지 단위)

```bash
cd $SAIGE_SF_ROOT
pnpm serve:qa  # 백그라운드, 보통 port 4200
# ready 대기
until curl -s -o /dev/null -w "%{http_code}" http://localhost:4200 2>&1 | grep -q "200\|302"; do sleep 3; done
# 인증 필요 시 mock 토큰 또는 테스트 모드
# Playwright 캡쳐
npx playwright screenshot \
  --viewport-size=1440,960 \
  --wait-for-timeout=10000 \
  "http://localhost:4200/camera-map" \
  /tmp/visual-verify-poc/<page>-actual.png
```

**주의**:
- safety-frontend는 **인증 필수** 라우트가 대부분. `ProtectedRouteGuard`로 redirect. 본인 캡쳐 시 인증 우회 필요:
  - 옵션 A: 로그인 페이지 자동화 (Playwright `page.fill()` + 로그인)
  - 옵션 B: Mock token을 `accessTokenStorage`에 사전 주입 (Playwright `page.evaluate(() => localStorage.setItem('accessToken', '...'))`)
  - 옵션 C: `localhost`에 테스트 계정 사용
- viewport 1440×960 (시안 카메라맵과 일치)
- `--wait-for-timeout=10000` (페이지가 무거우면 더)

### 3단계 — Storybook 캡쳐 (컴포넌트 단위)

safety-frontend도 Storybook 9.1.3 보유. 컴포넌트 단위 검증 시:
```bash
pnpm storybook  # port 6006
# DS 트랙과 동일 패턴
```

### 4단계 — Pixel Diff

- Playwright `expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.05 })`
- 또는 별도 `pixelmatch` library
- Figma 이미지를 baseline으로 사용 (Playwright snapshot 폴더에 저장)

### 5단계 — Design Fidelity Score

- DS와 동일 산출:
  - 95-100: ✅ 픽셀 perfect
  - 90-94: ✅ 통과
  - 80-89: ⚠️ 검토 필요
  - <80: ❌ 추가 작업 (LLM 패치 loop)

- **산출물 `/tmp/visual-verify-poc/<TICKET>-fidelity-score.json`** (DS 트랙과 동일 스키마 — hook 검증 + self-eval append 입력):
  ```json
  {
    "ticket": "SAFETYPRD-XXXX",
    "track": "product",
    "avgScore": 87.3,
    "minScore": 76,
    "cellCount": 12,
    "passCount": 9,
    "selfClaim": 85,
    "biasGap": 2.3,
    "timestamp": "2026-06-09T11:00:00Z"
  }
  ```
  `track: "product"`를 명시해 self-eval 로그에서 DS/Product 트랙을 구분.

### 6단계 — self-eval 자동 append (★ 2026-06-09 배선)

5단계의 fidelity-score.json 산출 **직후, 본인 판단 없이** 공유 헬퍼 호출 (DS 트랙과 동일 단일 진입점):

```bash
node ~/.claude/skills/_shared/append-self-eval.mjs \
  --from-file /tmp/visual-verify-poc/<TICKET>-fidelity-score.json
```

- `_self_evaluation_log.json`의 `biasLog`에 append + `biasRules`로 신뢰도 갱신
- 규칙: `|gap| ≤ 5 → +3` / `gap > 10 → -5(과대=위험)` / `gap < -10 → 0(과소=안전)`
- **강제 호출** — 건너뛰면 "visual-verify 자동 호출 누락" 위반 카운트
- DS 트랙 상세: [[saige-ds-visual-verify]] 7단계

## 인증 우회 표준 (safety-frontend 특화, 2026-06-09 갱신)

### ✅ 권장 — dev 계정 로그인 자동화 (env 주입)

본인 PoC 검증된 방법. mock token 우회는 BE API 호출 시 401 발생으로 폐기. **실제 dev 계정 로그인이 현실적 표준**.

**자격증명은 env로 주입** — 파일에 평문 금지 (이 repo는 git 추적·원격 푸시됨):
```bash
export SAIGE_DEV_USER="<dev 계정 ID>"
export SAIGE_DEV_PASS="<dev 계정 PW>"
```

**실측 셀렉터 (2026-07-01 홈대시보드 세션 검증):** ID=`input[name="id"]` (⚠️ `username` 아님), PW=`input[name="password"]`, 제출=`[data-testid="login_button"]`. testid는 wrapper이므로 실 input은 `name` 속성으로 타겟. 로그인 성공 시 **자동으로 `/dashboard`로 랜딩**(default route).

```typescript
// Playwright spec — dev 계정 자동 로그인 (자격증명은 env에서)
await page.goto('http://localhost:4200/login');
await page.fill('input[name="id"]', process.env.SAIGE_DEV_USER ?? '');       // ⚠️ name="id"
await page.fill('input[name="password"]', process.env.SAIGE_DEV_PASS ?? '');
await page.click('[data-testid="login_button"]');                            // testid 권장(폼 검증 통과 시 활성)

// 로그인 완료 대기 (로그인 성공 시 / → /dashboard 자동 랜딩)
await page.waitForURL('**/dashboard', { timeout: 15000 });

// 대상 페이지로 이동
await page.goto('http://localhost:4200/camera-map');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: '/tmp/visual-verify-poc/SAFETYPRD-xxx-actual.png' });
```

**대안 — chrome MCP 인터랙티브 (드래그·hover·상태 실측에 유리):** `mcp__plugin_superpowers-chrome_chrome__use_browser`. ★**핵심 함정: hidden 브라우저면 무거운 앱이 렌더 throttle로 React를 아예 안 띄운다**(`#root` 비어있음, **콘솔 에러도 없어** 원인 안 보임) → **반드시 `show_browser` 먼저** 호출 후 navigate. `set_viewport`는 show_browser가 리셋하므로 그 다음에. 게이트 3(상태 매트릭스)의 hover/drag_drop 실측은 이 경로가 편함. 상세 [[publisher-visual-verify-auth-gap]]. 자격증명 gitignore 로컬 파일(`e2e/.auth/visual-verify.local.json`)도 env 대안으로 가능(채팅·tool-param에 평문 노출 주의).

⚠️ **자격증명 평문 저장 금지** — 메모리에도 SKILL.md에도 평문 X. dev 환경 한정 계정이라도 이 repo가 git 추적·원격 푸시되므로 반드시 env(`SAIGE_DEV_USER`/`SAIGE_DEV_PASS`)로만 주입. (2026-06-10 갱신: 이전엔 "skill 파일은 git에 안 들어감" 전제로 평문 노출 OK였으나, git 저장소화로 전제 깨짐.)

### 폐기된 방법 — mock token 우회

본인 카메라맵 PoC에서 검증 — BE API 호출 시 401 발생. NavigateSyncProvider도 권한 체크. mock token 우회는 작동 X.

### 보조 — MSW 또는 별도 mock layer (선택)

API mock 필요한 케이스 (BE 미확정 영역) — MSW 별도 설정. 다만 본인 visual-verify 기본 흐름에서는 dev 계정 + 실제 API 사용이 정합도 측정에 더 정확.

## CI 통합 (Azure DevOps)

`.azuredevops/pipelines/<workflow>.yml`에 추가 (기존 CI 흐름 따름):
```yaml
- script: pnpm visual-verify --threshold 90
  displayName: 'Visual Verify'
```

머지 게이트: 평균 ≥ 90% AND 모든 cell ≥ 80%

## 자기평가 편향 검출

본인 자칭 정합도 vs 실측 자동 비교. 5단계 fidelity-score.json의 `selfClaim`(본인 자칭) vs `avgScore`(Playwright 실측) → 6단계 헬퍼가 `gap = selfClaim - avgScore`로 `_self_evaluation_log.json` biasLog에 누적. `track: "product"`로 구분. DS 트랙과 **동일 헬퍼(`append-self-eval.mjs`) 단일 진입점** 공유.

## 한계 / 알려진 이슈

- 인증 — dev 계정 자동 로그인이 표준(위 auth 레시피). mock token 우회는 폐기됨.
- 페이지가 무거우면 wait-for-timeout 늘리기 (10초 이상). chrome MCP는 hidden이면 아예 렌더 안 됨 → `show_browser` 필수.
- DrawingKit (Konva) 캔버스 렌더링 시간 추가 필요 가능.
- **픽셀 diff의 근본 한계(v0.5 하네스로 보완):** 단일 정적 프레임만 봐서 상태·인터랙션·라이브 애니를 못 본다. 다운스케일 캡처는 radius 4↔8·옅은 그림자·1px 테두리를 못 잡는다. 라이브 데이터는 diff를 노이즈로 덮는다. → `avgScore`만으로 판정 금지, 6게이트를 반드시 병행.

## 관련 skills

- `figma-handoff-scanner` (1단계)
- `saige-product-figma-to-emotion` (변환)
- `saige-product-qa` (정적 검증)
- DS 대응: [[saige-ds-visual-verify]]

## 참조

- safety-frontend CLAUDE.md [[safety-frontend-claude-md-ssot]]
- [[ds-visual-verify-poc]] — DS Button/DataGrid PoC 결과

## 변경 이력

- v0.5 (2026-07-01): **시안 정합 하네스 6게이트 추가** — 홈대시보드 데모에서 픽셀-diff 단독이 10라운드 갭을 못 잡은 회고 반영([[feedback-publisher-fidelity-retro]]). 진실원천 해석·계층 전수 computed-style diff·상태 매트릭스·메커니즘 충실도·토큰 해석·완전성 비평. done 조건을 게슈탈트 금지+커버리지 회계로 재정의. auth 셀렉터 실측 정정(`name="id"`, `[data-testid="login_button"]`) + chrome MCP show_browser 함정 명시([[publisher-visual-verify-auth-gap]]).
- v0.4 (2026-06-10): dev 자격증명 평문 제거 → env 주입(`SAIGE_DEV_USER`/`SAIGE_DEV_PASS`). git 저장소화로 "skill은 git에 안 들어감" 전제 깨짐.
- v0.3 (2026-06-09): self-eval append 배선 — fidelity-score.json 산출(5단계, 그동안 미산출) + 6단계 헬퍼 호출 추가. DS 트랙과 동일 `append-self-eval.mjs` 공유. track:"product"로 구분.
- v0.2 (2026-06-09): G24/G25 갭 해소 — mock token 우회 폐기 + dev 계정 자동 로그인이 표준. 카메라맵 PoC 사후학습.
- v0.1 (2026-06-08): Product 트랙 일반화 + 인증 우회 표준 명시.
