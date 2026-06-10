---
name: saige-ds-visual-verify
description: SAIGE @saige-ai/design-system 컴포넌트의 Figma 시안 ↔ Storybook 시각 정합도 자동 측정. Playwright(Storybook Test Runner의 내장) 기반 pixel diff + Design Fidelity Score 0-100 산출 + threshold 미달 시 LLM 자동 패치 loop. SDS-216에서 본인이 자칭한 정합도 vs 실측 갭(97% → 65%)을 자동 측정으로 해소.
---

# saige-ds-visual-verify

Figma 시안과 Storybook 구현 사이의 시각 정합도를 픽셀 단위로 자동 측정. 본인 자기평가 편향 검출 + threshold 미달 자동 패치 loop.

## 핵심 디자인 원칙

| 원칙 | 적용 |
|---|---|
| **객관 측정** | 본인 자칭 X, Playwright pixel diff 실측만 |
| **사람 개입 최저** | 자동 측정 + 자동 패치 loop. 사용자는 결과 보고만 받음 |
| **CI 게이트 통합** | PR 머지 전 자동 차단 (평균 <90% 또는 cell <80%) |
| **재사용 인프라** | DS 리포의 `@storybook/test-runner`(Playwright 내장) 활용. 신규 의존성 0 |

## 🚨 본인 자동 호출 강제 (★ 2026-06-09 추가)

본인 위반 패턴 추적: **본인이 PoC/PR 사이클에서 이 skill 호출 자체 안 하고 본인 LLM 시각 평가만 사용** (SDS-216 v2 / DataGrid / SDS-217 모두 동일).

→ **`saige-pr-create` v0.2의 4단계(구현 캡쳐) 자동 호출 강제**:
1. 본인이 manually capture 하지 않고 이 skill 호출
2. 산출: `/tmp/visual-verify-poc/<TICKET>-fidelity-score.json` (정량 점수)
3. hook이 이 파일 존재 + 점수 ≥ 80 검증 (산출물 없으면 PR 생성 차단)

본인 자동 호출 누락 시 = G19 위반 = 본인 신뢰도 추가 감점.

## 적용 시점

- 컴포넌트 작업 완료 후 PR 생성 직전 (자동 측정 + 머지 게이트)
- 시안 변경 후 회귀 검증
- 본인 자기평가 검증 (자칭 정합도 vs 실측 비교)

## 입력

1. **`variantMatrix.json`** — `figma-handoff-scanner` 출력. 각 cell의 `(propValues, nodeId, figmaImageUrl)` 매핑
2. **Storybook URL** — built static 서버 또는 dev 서버 (`http://localhost:6006`)
3. **컴포넌트 story 매핑** — 각 variant cell이 어떤 Storybook story 상태(args)에 대응하는지

## 동작 6단계

### 1단계 — Figma 시안 이미지 수집
- variantMatrix의 각 cell에 대해 `mcp__figma__get_screenshot(nodeId)` 호출
- 결과: cell별 PNG 파일 → `.visual-verify/<component>/figma/<cell-id>.png`

### 2단계 — Storybook 캡쳐 (로컬 표준)
- **Vercel preview 사용 금지** — design-system 리포의 Vercel project는 이정남님 개인 계정(Jay Lee's projects) 소속이라 본인 권한 X. 우회 시도(`get_access_to_vercel_url`)도 실패. Vercel preview는 PD 비동기 공유 용도만.
- **로컬 Storybook 표준**:
  ```bash
  cd $SAIGE_DS_ROOT
  pnpm storybook  # 백그라운드, port 6006
  # ready 대기
  until curl -s -o /dev/null -w "%{http_code}" http://localhost:6006 2>&1 | grep -q "200\|302"; do sleep 3; done
  # Playwright 캡쳐
  npx playwright screenshot \
    --viewport-size=1200,800 \
    --wait-for-timeout=5000 \
    --full-page \
    "http://localhost:6006/iframe.html?id={story-id}&viewMode=story" \
    /tmp/visual-verify-poc/{component}-{cell}.png
  ```
- **wait-for-timeout=5000 필수** — Storybook iframe 마운트 시간 필요. 없으면 빈 화면.
- **story ID 산출**: `{title kebab-case}--{story-name kebab-case}` (예: `Components/Actions/Button` → `components-actions-button--showcase`)
- 캡쳐 viewport: Figma cell의 정확한 사이즈 매칭 (variantMatrix의 size 정보 활용)
- 결과: `.visual-verify/<component>/storybook/<cell-id>.png`

### 3단계 — Pixel Diff 측정
- **Playwright 내장**: `expect(page).toHaveScreenshot()` 사용 (Figma 이미지를 baseline으로 설정)
- **또는** `pixelmatch` library 직접 호출 (더 세밀한 threshold 제어)
- 옵션:
  - `maxDiffPixelRatio`: 0.05 (5% 이하 통과)
  - `threshold`: 0.1 (픽셀당 색차이 허용도)
  - 또는 SSIM (Structural Similarity Index) 활용
- 결과: cell별 `(matched: boolean, diffPixelRatio: number, diffImagePath: string)`

### 4단계 — Design Fidelity Score 산출
- 각 cell: `score = (1 - diffPixelRatio) × 100`
- 컴포넌트 전체: `avg(cells.scores)`
- 분류:
  - **95-100**: ✅ 픽셀 perfect
  - **90-94**: ✅ 거의 동일 (통과)
  - **80-89**: ⚠️ 미세 차이 (검토 권장)
  - **<80**: ❌ 추가 작업 필요 (LLM 패치 loop 트리거)

### 5단계 — LLM 자동 패치 Loop (선택적, gbasin 패턴)
임계값 미달 시:
1. diff image 분석 → 차이 영역 식별 (좌표/크기/색)
2. 본인이 코드 패치 제안:
   - style.ts의 spacing/color/radius 값 조정
   - Component.tsx의 layout/order 수정
3. Storybook rebuild + 재 screenshot
4. 재 diff 측정
5. 통과 또는 max 5 loop. 미개선 시 자동 롤백

### 6단계 — 보고서 산출
산출물:
- `.visual-verify/<component>/report.md` — cell × score 표 + diff image 링크
- `.visual-verify/<component>/summary.json` — CI/머지 게이트용 구조화 결과
- **`/tmp/visual-verify-poc/<TICKET>-fidelity-score.json` (hook 검증 대상)** — 평균 점수 + cell별 점수 구조화:
  ```json
  {
    "ticket": "SDS-217",
    "track": "ds",
    "avgScore": 87.3,
    "minScore": 76,
    "cellCount": 60,
    "passCount": 47,
    "selfClaim": 79,
    "biasGap": -8.3,
    "timestamp": "2026-06-09T11:00:00Z"
  }
  ```
  (`biasGap = selfClaim - avgScore`, 음수 = 과소. 헬퍼는 파일의 biasGap을 신뢰하지 않고 selfClaim/avgScore에서 재계산하므로 단일 규약 보장.)

### 7단계 — self-eval 자동 append (★ 2026-06-09 배선)
6단계의 `fidelity-score.json`(selfClaim + avgScore 포함)을 산출한 **직후, 본인 판단 없이** 공유 헬퍼를 호출해 `_self_evaluation_log.json`의 `biasLog`에 append + 신뢰도 갱신:

```bash
node ~/.claude/skills/_shared/append-self-eval.mjs \
  --from-file /tmp/visual-verify-poc/<TICKET>-fidelity-score.json
```

- 입력: fidelity-score.json의 `ticket / selfClaim / avgScore / track / timestamp`를 그대로 읽음 (시스템 시계 의존 X — timestamp에서 날짜 도출)
- 동작: `gap = selfClaim - avgScore` 계산 → `biasLog` 항목 push → 신뢰도 델타 적용([[#biasrules]] 규칙)
- **강제 호출** — 본인이 fidelity-score.json만 만들고 이 단계를 건너뛰면 "visual-verify 자동 호출 누락" 위반 패턴에 카운트. 산출 직후 자동 실행.
- 신뢰도 델타 규칙(`_self_evaluation_log.json`의 `biasRules`): `|gap| ≤ 5 → +3` / `gap > 10 → -5(과대=위험)` / `gap < -10 → 0(과소=안전, 보상없음)`
- `--dry-run`으로 쓰지 않고 결과만 미리 볼 수 있음 (테스트/검증 시)

예시 보고서:
```markdown
# Visual Verify Report — DataGrid

총 cell: 60 (Component Set variant 풀세트)
평균 Design Fidelity Score: 87.3
통과: 47 cells (78%)
검토 필요: 10 cells (17%)
실패: 3 cells (5%)

## 실패 cells (LLM 패치 시도 후에도 미달)
| Cell | Props | Score | Diff | 추정 원인 |
|---|---|---|---|---|
| 1574:20204 | align=Left, sorting=None, type=Text | 76 | [link](./diff/...) | sort indicator 위치 차이 |
| ... |

## 본인 자기평가 vs 실측 (편향 검출)
- 본인 자칭: 시각 79%
- 실측 평균: 87.3%
- 편향 갭: -8.3%p (gap = selfClaim - measured. 음수 = 과소 평가 = 안전 방향)
```
> 부호 규약: `gap = selfClaim - measured`. **양수 = 과대(위험), 음수 = 과소(안전)**. 헬퍼(`append-self-eval.mjs`)·`biasRules`와 동일 규약.

## CI 통합 (PR 머지 전 게이트)

`.github/workflows/ci.yml`의 `Storybook E2E` 잡 확장 또는 신규 `Visual Verify` 잡:

```yaml
- name: Run Visual Verify
  run: pnpm visual-verify --threshold 90
```

게이트 조건:
- **통과**: 평균 ≥ 90% AND 모든 cell ≥ 80%
- **fail**: 위 조건 미달

## Playwright 활용 — DS 리포 기존 인프라 재사용

`@storybook/test-runner`(이미 설치됨)는 내부적으로 Playwright 사용. 본인 visual-verify는 다음 두 방식 중 선택:

### 방식 A: Test Runner `postVisit` hook (권장)
`.storybook/test-runner.ts` (또는 생성):
```typescript
import type { TestRunnerConfig } from '@storybook/test-runner';
import { compareWithFigma } from './visual-verify';

const config: TestRunnerConfig = {
  async postVisit(page, context) {
    // story가 렌더링 된 후
    const cellId = context.id;
    const figmaImage = await fetchFigmaScreenshot(cellId);
    const storybookImage = await page.screenshot();
    await compareWithFigma(cellId, figmaImage, storybookImage);
  },
};
export default config;
```

### 방식 B: 별도 Playwright spec (독립)
`tests/visual.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';
import variantMatrix from './variantMatrix.json';

for (const cell of variantMatrix.cells) {
  test(`visual-verify: ${cell.id}`, async ({ page }) => {
    await page.goto(`http://localhost:6006/iframe.html?args=${cell.storyArgs}`);
    await expect(page).toHaveScreenshot(`${cell.id}.png`, {
      maxDiffPixelRatio: 0.05,
    });
  });
}
```

본인 권장: **방식 A** — Test Runner와 일관성. 기존 CI 흐름에 자연스럽게 통합.

## 자기평가 편향 검출 (보조 축)

본인 메모리 [[feedback-premerge-pd-review]]의 5단계 자기검증에서 본인이 "시각 정합 ≈ 79%" 같은 자칭 수치를 출력함. visual-verify의 실측 값과 자동 비교:

| 본인 자칭 | 실측 | 편향 갭 | 신호 |
|---|---|---|---|
| 79% | 87% | -8%p | 본인 과소 평가 (안전, OK) |
| 97% | 65% | **+32%p** | 본인 **과대 평가** (위험, SDS-216 v1 사례) |

누적 기록 타깃은 **`_self_evaluation_log.json`의 `biasLog`** (마크다운 메모리 아님). 7단계 헬퍼(`append-self-eval.mjs`)가 자동 append하고 `biasRules`에 따라 `currentTrustScore`를 갱신. 과대 평가(gap > 10)는 −5, 잘 보정된 경우(|gap| ≤ 5)는 +3으로 신뢰도가 실측 갭을 따라 움직임. [[feedback-premerge-pd-review]]는 사람이 읽는 서술 기록, JSON 로그는 기계 누적 — 두 축 분리.

## 한계 / 알려진 이슈

- **Animation/transition** — Playwright는 정적 screenshot. transition/animation 검증은 별도
- **Hover/Active state** — Storybook story args로 강제 표시 필요
- **Dark mode** — Light/Dark 별도 cell로 다뤄야 함 (variantMatrix에 theme 차원 추가)
- **글꼴 렌더링 차이** — 시안과 실제 브라우저 렌더링 미세 차이 (anti-aliasing). threshold 5%로 흡수

## Vercel preview 정책 (2026-06-08 결정)

- **소유자**: 이정남님 개인 계정 (Jay Lee's projects)
- **본인 권한**: 없음. `mcp__claude_ai_Vercel__get_access_to_vercel_url` 우회 실패 확인
- **결정**: Vercel preview는 **완전 사용 중단**. 시각 검증은 로컬 Storybook 표준, PD 공유도 다른 수단(PNG/Notion/Teams) 사용
- **이유**: PD가 URL 클릭 시 이정남님 Vercel 로그인 페이지 만나고 못 들어감 — 공유 메시지 의미 X
- **재적용 시점**: design-system 리포의 Vercel project를 **회사 계정으로 이관 후** 재도입
- **머지 게이트**: 로컬 Storybook + Playwright 캡쳐만으로 정합도 측정

## 신규 의존성 — 검토

- `@storybook/test-runner` ✅ 이미 설치
- `playwright` ✅ Test Runner와 함께 자동 설치
- `pixelmatch` ❓ 옵션. Playwright `toHaveScreenshot` 충분하면 불필요
- `pngjs` ❓ pixelmatch 종속성

**결론**: Playwright `toHaveScreenshot` + Figma MCP `get_screenshot` 조합으로 신규 의존성 0 가능.

## 관련 skills

- `figma-handoff-scanner` — variantMatrix.json 입력 제공
- `saige-ds-figma-to-vex` — 변환 결과 시각 검증의 대상
- `saige-ds-qa` — 구조/문서 검증 (시각 검증과 직교)
- `saige-ds-visual-verify` (이 skill) — 픽셀 정합도 측정
- `saige-premerge-review` — 본인 자기검증 5단계에 실측 점수 반영

## 참조

- gbasin/figma-to-react — Playwright + ImageMagick RMSE loop 패턴 차용
- uiMatch CLI — Design Fidelity Score 0-100 개념 차용
- Storybook Test Runner: https://storybook.js.org/docs/writing-tests/test-runner
- Playwright `toHaveScreenshot`: https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot

## 변경 이력

- v0.1 (2026-06-08): DS 리포 기존 인프라(@storybook/test-runner) 활용 + gbasin loop 패턴 차용. 카메라맵 첫 실증 예정. CI 통합은 머지 게이트로 별도 단계.
- v0.2 (2026-06-09): G19 갭 해소 — 본인 자동 호출 강제 명시 + fidelity-score.json hook 검증 대상 산출. SDS-217 폐기 사후학습.
- v0.3 (2026-06-09): self-eval append 배선 — 7단계 추가(`append-self-eval.mjs` 강제 호출) + 누적 타깃을 마크다운 메모리 → `_self_evaluation_log.json` biasLog로 정정. biasLog가 빈 배열로 방치되던 끊긴 배선 연결.
