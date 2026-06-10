---
name: saige-ds-qa
description: SAIGE @saige-ai/design-system 신규/수정 컴포넌트의 SSOT(CLAUDE.md) 준수 검증. 4파일 구조 / Path alias / Showcase 엄격 표준 / 디자인 토큰 사용 / a11y / knip / Documentation Update Rules 8개 영역을 자동 검사. 사람 개입 최저 원칙 — 검증 실패 항목만 명시 후 자동 수정 가능한 건 수정 패치 제안.
---

# saige-ds-qa

SAIGE DS 컴포넌트 작업물의 CLAUDE.md SSOT 준수 검증 skill. SDS-216 v2에서 본인이 위반한 5개 갭(Path alias / 문서 3파일 / commit changelog / JIRA footer / title 컨벤션) 같은 누락을 사전 검출.

## 적용 시점

- 신규 컴포넌트 작업 완료 후 PR 생성 직전
- 기존 컴포넌트 수정 후 push 직전
- 머지 전 검증 단계 (`saige-premerge-review`와 함께)
- CLAUDE.md 변경 시 기존 컴포넌트 회귀 검증

## 검증 8개 영역

### 1. 4파일 구조 검증

**규약** (CLAUDE.md line 36-43):
```
src/components/<category>/<component-name>/
├── ComponentName.tsx
├── ComponentName.css.ts
├── ComponentName.stories.tsx
└── index.ts
```

**검사 항목**:
- 4파일 모두 존재
- `.css.ts` 파일이 `recipe()` 또는 `style()` 사용
- `.tsx` 파일이 `.css.ts`에서 export된 스타일 import
- `index.ts`가 컴포넌트와 외부 사용처 있는 type만 re-export (knip 회피)

**자동 패치 가능**: 파일 누락 시 보일러플레이트 생성

### 2. Path alias 검증

**규약** (CLAUDE.md line 98-99): `@/*` maps to `src/*`

**검사 패턴**:
- ❌ Fail: `from '../../../tokens/...'`
- ❌ Fail: `from '../../tokens/...'`
- ✅ OK: `from '@/tokens/...'`

**자동 패치 가능**: 상대경로 → `@/*` 치환 (regex 변환)

**제외**: 동일 폴더 내 `./` import는 OK (Component.tsx → ./Component.css.ts)

### 3. Showcase 엄격 표준 검증

**규약** (CLAUDE.md line 198-339, 본인 메모리 [[ds-component-standard]] 7가지):

| 검사 항목 | 기대값 |
|---|---|
| `parameters.layout` | `'fullscreen'` |
| `tags` | `['autodocs']` 포함 |
| `parameters.docs.description.component` | 존재 + `## ComponentName` 헤더 + `### 기본 사용법` + `### Props` |
| Showcase story 개수 | 정확히 1개 (`Showcase` 명) |
| `sectionStyle.marginBottom` | `'48px'` |
| `labelStyle.fontSize` | `'14px'` |
| `labelStyle.fontWeight` | `600` |
| `labelStyle.color` (light/dark) | `'#3A3F46'` / `'#F5F7F9'` |
| `labelStyle.fontFamily` | `'Pretendard, -apple-system, sans-serif'` |
| `containerStyle.padding` | `'24px'` |
| `containerStyle.minHeight` | `'100vh'` |
| `containerStyle.background` (light/dark) | `'#F5F7F9'` / `'#1A1D21'` |
| `rowStyle.gap` | `'16px'` |
| `toggleButtonStyle.marginBottom` | `'32px'` |
| Theme Toggle 텍스트 | `{isDark ? 'Dark' : 'Light'} Theme` (이모지 금지) |
| `themeClass` 적용 | `lightThemeClass` / `darkThemeClass` 전환 |

**자동 패치 가능**: 일부 (sectionStyle marginBottom 등 단순 값)

### 4. Storybook Title 컨벤션 검증

**규약** (CLAUDE.md line 107-111):
- 폴더는 단수형, title은 **복수형** 권장
- 예외: 기존 컴포넌트들이 단수형 사용 중인 카테고리는 일관성 우선 (예: `data-display` → `Data Display` 유지)

**검사**:
- title 형식: `Components/<Category>/<ComponentName>`
- 카테고리는 기존 컴포넌트와 일관성 검증 (grep으로 확인)

### 5. 디자인 토큰 사용 검증 (하드코딩 검출)

**규약**: spacing/radius/color/font 모두 토큰 사용. raw value 최소화.

**검사 패턴**:
- ❌ Fail: `padding: '12px'` (spacing 토큰 미사용)
- ❌ Fail: `borderRadius: '4px'` (radius 토큰 미사용)
- ❌ Fail: `color: '#262A30'` (vars.color 미사용)
- ❌ Fail: `fontFamily: 'Min Sans, ...'` 직접 명시
- ✅ OK: `padding: spacing[150]`
- ✅ OK: `borderRadius: radius[50]`
- ✅ OK: `color: vars.color.text.primary`
- ✅ OK: `fontFamily: fontFamily.sans`

**예외**: typography 비표준 size/lineHeight 케이스 (예: `'13px'`)는 경고만 (CLAUDE.md에 13px 토큰 없으면 ad-hoc 허용 + 토큰화 검토 추천)

### 6. a11y 검증

**규약** (CLAUDE.md line 686-715):
- `IconButton`은 **`aria-label` 필수**
- 인터랙티브 요소는 `role` 명시 또는 적절한 HTML 시맨틱
- 키보드 접근성 (`tabIndex`, `onKeyDown`)

**검사 패턴**:
- 모든 `<IconButton>` 사용처에 `aria-label` 존재
- `role="..."` 사용 시 valid ARIA role
- Storybook Test Runner axe rules strict 통과 (별도 단계 → `saige-ds-visual-verify` skill에서 실행)

### 7. knip 검증

**규약** (본인 메모리 [[feedback-ds-knip-unused]]): push 전 `pnpm knip` 실행, unused export 0개.

**검사**:
- `pnpm knip` 실행 후 출력이 빈 줄
- index.ts의 export 중 외부 사용처 없는 type/value 검출
- Stories는 `./Component` 직접 import이라 index.ts 경유 사용처로 카운트 안 됨 — 주의

**자동 패치 가능**: index.ts에서 unused export 제거

### 8. Documentation Update Rules 검증

**규약** (CLAUDE.md line 437-450): 컴포넌트 작업 후 3개 문서 갱신 필수.

**검사 항목**:
- `COMPONENT_STATUS.md` — 해당 컴포넌트의 상태 항목 존재 (✅/🟡/❌)
- `README.md` — `## 컴포넌트 요약` 표에 컴포넌트 명 포함
- `README.md` — `## 변경 이력` 표에 해당 작업 항목 존재
- `ELEMENTS2_POC_GUIDE.md` — 새 컴포넌트 사용 예시 (Foundation 단계는 보류 가능)

**자동 패치 가능**: 갱신 누락 항목 자동 추가 (Foundation 명시 형식)

## 검증 결과 출력 포맷

산출물 `qa-report.md`:

```markdown
# saige-ds-qa Report — <ComponentName>

작업물: `src/components/<category>/<name>/`
검증 시각: <ISO timestamp>

## 통과 ✅ (N/8)

- [x] 4파일 구조
- [x] Path alias
- [x] Showcase 엄격 표준
- [x] Storybook Title
- [x] knip

## 실패 ❌ (M/8)

### Documentation Update Rules
- ❌ `COMPONENT_STATUS.md`에 항목 없음 → 자동 패치 가능 (`🟡 1차 (Foundation, SDS-216)` 추가)
- ❌ `README.md` 변경 이력 누락 → 자동 패치 가능

### a11y
- ⚠️ `DataGrid.tsx:303` `<IconButton ... />` aria-label 누락 → 수동 수정 필요

## 자동 패치 적용 후 재검증 권장
```

## 자동 패치 우선순위

1. **자동 적용 후 재검증**: Path alias 치환 / knip unused export 제거 / sectionStyle 값 통일
2. **사용자 확인 후 적용**: 문서 갱신 (COMPONENT_STATUS / README) — 내용 상상해서 적기보다 본인이 작업 내용 정확히 알 때만
3. **사용자 수동 수정**: a11y aria-label 누락 / Showcase 구조 큰 변경 / Storybook Title 컨벤션 모호

## 사람 개입 최저 원칙

- 모든 검증 항목에서 자동 패치 가능한 것은 우선 적용 → 재검증 → 잔여만 보고
- 잔여 보고는 짧고 명확 (파일:라인:문제:권고 형식)
- 검증 통과 시 단순 "✅ All 8 areas passed" 보고

## 사용자 추가 입력 허용 시점 (예외)

- 문서 갱신 내용이 모호한 경우 (예: ELEMENTS2_POC_GUIDE 가이드 깊이) — 본인 best-guess + 사용자 확인
- 카테고리 신설 필요 시 (기존 8개 카테고리 외) — 사용자 결정 요청

## 관련 skills

- `figma-handoff-scanner` — 1단계 시안 스캔 (입력)
- `saige-ds-figma-to-vex` — 2단계 변환 (코드 생성)
- `saige-ds-qa` (이 skill) — 3단계 검증
- `saige-ds-visual-verify` — 4단계 시각 정합 (Figma ↔ Storybook diff)
- `saige-premerge-review` — 5단계 PD 관점 자기검증
- `saige-ds-handoff` — 6단계 PR 생성

## 참조

- CLAUDE.md SSOT: `$SAIGE_DS_ROOT/CLAUDE.md`
- 본인 메모리: [[ds-claude-md-ssot]] / [[feedback-ds-knip-unused]] / [[ds-component-standard]] / [[ds-datagrid-v2-decisions]]

## 변경 이력

- v0.1 (2026-06-08): SDS-216 v2 5개 갭 사후 학습 + CLAUDE.md SSOT 정독 결과 기반 초안. 카메라맵 첫 실증 예정.
