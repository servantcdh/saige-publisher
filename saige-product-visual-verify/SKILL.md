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

### ✅ 권장 — dev 계정 로그인 자동화 (admin/admin)

본인 PoC 검증된 방법. mock token 우회는 BE API 호출 시 401 발생으로 폐기. **실제 dev 계정 로그인이 현실적 표준**.

```typescript
// Playwright spec — dev 계정 자동 로그인
await page.goto('http://localhost:4200/login');
await page.fill('input[name="username"]', 'admin');
await page.fill('input[name="password"]', 'admin');
await page.click('button[type="submit"]');

// 로그인 완료 대기
await page.waitForURL('http://localhost:4200/dashboard', { timeout: 10000 });

// 대상 페이지로 이동
await page.goto('http://localhost:4200/camera-map');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: '/tmp/visual-verify-poc/SAFETYPRD-xxx-actual.png' });
```

⚠️ **본인 메모리에 평문 PW 저장 금지** (사용자 지시) — `admin/admin`은 dev 환경 한정 표준 계정이라 본인 메모리에 별도 저장 X. SKILL.md에 노출은 OK (skill 파일은 본인 메모리 git에 안 들어감).

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

- 인증 우회 — Mock token + API mock 필요 (또는 테스트 계정)
- 페이지가 무거우면 wait-for-timeout 늘리기 (10초 이상)
- DrawingKit (Konva) 캔버스 렌더링 시간 추가 필요 가능

## 관련 skills

- `figma-handoff-scanner` (1단계)
- `saige-product-figma-to-emotion` (변환)
- `saige-product-qa` (정적 검증)
- DS 대응: [[saige-ds-visual-verify]]

## 참조

- safety-frontend CLAUDE.md [[safety-frontend-claude-md-ssot]]
- [[ds-visual-verify-poc]] — DS Button/DataGrid PoC 결과

## 변경 이력

- v0.1 (2026-06-08): Product 트랙 일반화 + 인증 우회 표준 명시.
- v0.2 (2026-06-09): G24/G25 갭 해소 — mock token 우회 폐기 + dev 계정(admin/admin) 자동 로그인이 표준. 카메라맵 PoC 사후학습.
- v0.3 (2026-06-09): self-eval append 배선 — fidelity-score.json 산출(5단계, 그동안 미산출) + 6단계 헬퍼 호출 추가. DS 트랙과 동일 `append-self-eval.mjs` 공유. track:"product"로 구분.
