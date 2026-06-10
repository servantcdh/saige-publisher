---
name: saige-ds-figma-to-vex
description: Figma MCP 출력(Tailwind 코드 패턴) → SAIGE @saige-ai/design-system의 vanilla-extract 변환 룰. Figma 시안을 SAIGE DS 컴포넌트 4파일 보일러플레이트(.tsx/.css.ts/.stories.tsx/index.ts)로 변환할 때 사용. Tailwind 클래스를 SAIGE vars/spacing/radius/fontFamily 토큰에 1:1 매핑하고 raw value는 경고 출력.
---

# saige-ds-figma-to-vex

Figma MCP의 `get_design_context` 출력(Tailwind 코드 패턴)을 SAIGE DS의 vanilla-extract 코드로 변환하는 표준 룰. SDS-216 DataGrid v2 작업에서 추출한 실증 패턴 기반.

## 적용 시점

- Figma 시안 + Jira 티켓 받아 새 DS 컴포넌트 퍼블리싱 착수할 때
- 기존 DS 컴포넌트 시안 정합 검증(시각 diff)할 때
- Figma MCP `get_design_context` 출력을 본인 코드로 변환할 때

## 변환 룰 매트릭스

### 1. Color (vars.color.*)

| Figma MCP 출력 패턴 | vanilla-extract 변환 |
|---|---|
| `bg-[var(--theme.palette.surface.light,...)]` | `background: vars.color.surface.light` |
| `bg-[var(--theme.palette.surface.field.default,...)]` | `background: vars.color.surface.field.default` |
| `bg-[var(--theme.palette.surface['item-selected'],...)]` | `background: vars.color.surface.itemSelected` ⚠️ kebab→camelCase |
| `bg-[var(--theme.palette.surface.action.hovered,...)]` | `background: vars.color.surface.action.hovered` |
| `bg-[var(--theme.palette.surface.action.selected,...)]` | `background: vars.color.surface.action.selected` |
| `border-[var(--theme.palette.outline.subtle,...)]` | `border: \`1px solid ${vars.color.outline.subtle}\`` |
| `border-[var(--theme.palette.outline.divider.common,...)]` | `borderColor: vars.color.outline.divider.common` |
| `text-[color:var(--theme.palette.text.title.strong,...)]` | `color: vars.color.text.title.strong` |
| `text-[color:var(--theme.palette.text.primary,...)]` | `color: vars.color.text.primary` |
| `text-[color:var(--theme.palette.text.secondary,...)]` | `color: vars.color.text.secondary` |
| `text-[color:var(--palette.magenta.500,...)]` (annotation only) | ❌ 무시 (시안 가이드라인 색) |

### 2. Spacing (spacing[N])

SAIGE spacing 토큰: `0/25(2px)/50(4px)/75(6px)/100(8px)/125(10px)/150(12px)/200(16px)/250(20px)/300(24px)/400(32px)/500(40px)/600(48px)/700(56px)/800(64px)/900(72px)/1000(80px)`

| Figma 패턴 | vex 변환 |
|---|---|
| `p-[var(--spacing.50,4px)]` | `padding: spacing[50]` |
| `gap-[var(--spacing.150,12px)]` | `gap: spacing[150]` |
| `pt-[6px] pb-[12px] px-[8px]` | `padding: \`${spacing[75]} ${spacing[100]} ${spacing[150]} ${spacing[100]}\`` |
| `mt-[4px]`, `mb-[8px]` etc | `marginTop: spacing[50]`, `marginBottom: spacing[100]` |
| `gap-[3px]` (raw, 토큰 미존재) | `gap: '3px'` + 경고 (커스텀, 추후 토큰화 검토) |

### 3. Radius (radius[N])

SAIGE radius 토큰: `25(2px)/50(4px)/100(8px)/150(12px)/200(16px)/round(9999px)`

| Figma 패턴 | vex 변환 |
|---|---|
| `rounded-[var(--radius.25,2px)]` | `borderRadius: radius[25]` |
| `rounded-[var(--radius.50,4px)]` | `borderRadius: radius[50]` |
| `rounded-[var(--radius.100,8px)]` | `borderRadius: radius[100]` |
| `rounded-full` | `borderRadius: radius.round` |

### 4. Size / Dimension

| Figma 패턴 | vex 변환 |
|---|---|
| `size-[16px]` | `width: '16px', height: '16px'` |
| `w-[200px]` | `width: '200px'` |
| `h-[36px]` | `height: '36px'` |
| `w-px` | `width: '1px'` |
| `min-w-px`, `min-h-px` | `minWidth: 0`, `minHeight: 0` |

### 5. Layout (flex)

| Figma 패턴 | vex 변환 |
|---|---|
| `flex flex-col` | `display: 'flex', flexDirection: 'column'` |
| `content-stretch` | (Tailwind default, 무시) |
| `items-center` | `alignItems: 'center'` |
| `items-end` | `alignItems: 'flex-end'` |
| `justify-center` | `justifyContent: 'center'` |
| `justify-end` | `justifyContent: 'flex-end'` |
| `justify-between` | `justifyContent: 'space-between'` |
| `shrink-0` | `flexShrink: 0` |
| `flex-1` | `flex: 1` |
| `flex-[1_0_0]` | `flex: '1 0 0'` |
| `flex-none` | `flex: 'none'` |

### 6. Position

| Figma 패턴 | vex 변환 |
|---|---|
| `relative` | `position: 'relative'` |
| `absolute` | `position: 'absolute'` |
| `inset-0` | `inset: 0` |
| `top-0 left-0` | `top: 0, left: 0` |
| `right-[1032px]` | `right: '1032px'` |
| `-translate-x-1/2` | `transform: 'translateX(-50%)'` |
| `-translate-y-1/2` | `transform: 'translateY(-50%)'` |
| `-rotate-90` | `transform: 'rotate(-90deg)'` |

### 7. Typography

SAIGE 폰트: `fontFamily.sans('Min Sans')`, `fontFamily.mono('Roboto Mono')`  
SAIGE fontSize: `10/11/12/14/16/18`  
SAIGE fontWeight: `regular(400)/medium(500)/semibold(600)/bold(700)`  
SAIGE lineHeight: `12/16/18/20/22/24/28`

| Figma 패턴 | vex 변환 |
|---|---|
| `font-['Min_Sans:Bold']` | `fontFamily: fontFamily.sans, fontWeight: fontWeight.bold` |
| `font-['Min_Sans:SemiBold']` | `fontFamily: fontFamily.sans, fontWeight: fontWeight.semibold` |
| `font-['Min_Sans:Medium']` | `fontFamily: fontFamily.sans, fontWeight: fontWeight.medium` |
| `font-['Min_Sans:Regular']` | `fontFamily: fontFamily.sans, fontWeight: fontWeight.regular` |
| `font-['Roboto_Mono']` | `fontFamily: fontFamily.mono` |
| `text-[12px]` | `fontSize: fontSize[12]` |
| `leading-[16px]` | `lineHeight: lineHeight[16]` |
| `not-italic` | `fontStyle: 'normal'` |

**typographyVariants 매핑 (선택, 권장)**:  
위 4-5개 속성 조합이 `typographyVariants` 항목과 일치하면 그 variant 사용:
- `{ sans, 12, bold, 16 }` → `typographyVariants['12bol']`
- `{ sans, 12, medium/semibold, 16 }` → `typographyVariants['12med']`
- `{ sans, 12, regular, 16 }` → `typographyVariants['12reg']`
- `{ mono, 12, bold/medium/regular, 16 }` → `typographyVariants['12bolTabular']/['12medTabular']/['12regTabular']`
- 동일 패턴: `14bol/14med/14reg`, `16bol/16med/16reg`, `11bol/11med/11reg`, `10med/10reg`
- 특별: `title1`(18/semibold/28), `title2`(16/semibold/24), `paragraph1`(14/reg/22), `paragraph2`(12/reg/18)

### 8. Misc

| Figma 패턴 | vex 변환 |
|---|---|
| `opacity-60` | `opacity: 0.6` |
| `whitespace-nowrap` | `whiteSpace: 'nowrap'` |
| `overflow-clip` / `overflow-hidden` | `overflow: 'hidden'` |
| `overflow-y-auto` | `overflowY: 'auto'` |
| `cursor-pointer` | `cursor: 'pointer'` |
| `cursor-col-resize` | `cursor: 'col-resize'` |
| `block` | `display: 'block'` |
| `inline-flex` | `display: 'inline-flex'` |
| `text-ellipsis` | `textOverflow: 'ellipsis'` |
| `word-break:break-word` | `wordBreak: 'break-word'` |

### 9. Icon (@saige-ai/icons) — ★ 2026-06-09 추가, 결정론적 매핑 + 추정 금지

DS 아이콘은 별도 패키지 **`@saige-ai/icons`(277개 export, PascalCase `Icon*`)**에서 온다. Figma는 아이콘을 snake_case `data-name`(예: `corner_fit`, `chevron_down_bold`)으로 노출하고, 에셋은 의미 없는 localhost 해시 SVG다. **절대 SVG를 인라인하지 말고**, 이름을 `@saige-ai/icons` export로 해석해 `<IconXxx />`로 렌더한다.

**해석은 추정하지 말고 resolver로 (할루시네이션 금지):**

```bash
node ~/.claude/skills/saige-ds-figma-to-vex/icon-resolve.mjs <figma_icon_name>...
# 예) node icon-resolve.mjs corner_fit chevron_down_bold channels
```

resolver 규칙 (권위 소스 = 설치된 `@saige-ai/icons/dist/index.d.ts`):
- **direct**: `snake_case` → `Icon{PascalCase}` exact match → `high` → 자동 사용 OK (예: `warning_triangle`→`IconWarningTriangle`, `chevron_down_bold`→`IconChevronDownBold`)
- **alias**: 검증된 의미 불일치만 등재 (기본 비어 있음 — 추정 alias 금지)
- **dropped-suffix**: 후행 style(bold/solid…) 떼야 매칭 → `low` → **글리프 다를 위험, 사용자 확인**
- **UNRESOLVED**: 어떤 규칙으로도 exact 없음 → `none` → **반드시 사용자에게 질문** (절대 비슷한 아이콘으로 때려넣지 않음. 예: `channels`는 RGB 채널 아이콘이라 후보 없음 → 질문)

**실측 신뢰도** (Image Viewer 12 아이콘): high 11 / none 1(`channels`) = **~92% 결정론적**. 나머지는 추정 대신 질문. → 변환 안정성 = "토큰 위생 × 아이콘 매핑률", 둘 다 객관 측정 가능.

> 데이터 출처: `data-name` 속성에서 아이콘명을 읽는다(에셋 URL 해시 X). `<img src="http://localhost:3845/...svg">`는 코드로 옮기지 않는다.

### 10. Component Instance 재사용 (@saige-ai/design-system) — ★ 2026-06-09 추가, 평탄화 금지

composite 시안은 기존 DS 컴포넌트(Button/IconButton/Switch…)를 **인스턴스로 조합**한다. `get_design_context`는 인스턴스를 평탄화된 마크업으로 펼쳐 주지만, **그 마크업을 그대로 re-draw하면 안 된다.** `data-name`이 DS 컴포넌트면 해당 마크업 서브트리를 `<Button/>` 등으로 **치환**하고 visible prop만 매핑한다.

**해석은 resolver로 (추정 금지):**

```bash
node ~/.claude/skills/saige-ds-figma-to-vex/component-resolve.mjs \
  --building "<만드는 컴포넌트명>" <data-name>...
# 예) node component-resolve.mjs --building "Image Viewer" "Button" "Icon Button" "⚡️ Text Decorator"
```

분류(권위 = design-system `src/components/**/index.ts`, 현재 92 export):
- **reuse** — `data-name`이 DS export로 정규화+exact 존재 → `<Export/>` import 재사용 (예: `Icon Button`→`<IconButton/> from '@/components/actions/icon-button'`, `Dropdown / Select`→`<Select/>`)
- **helper** — ⚡️/🪄 Figma 오서링 헬퍼(Text Decorator·Icon Wrapper·Switch Group·Button Group·Slot) → DS 컴포넌트 아님. **import X, 부모 스타일에 흡수(flatten)**
- **own-part** — 현재 만드는 컴포넌트의 하위 파트(`--building` 프리픽스, 예: `Image Viewer / Footer`) → **inline 생성**
- **unresolved** — 컴포넌트처럼 보이나 레지스트리에 없음 → **반드시 사용자 질문**(누락 DS 컴포넌트인지/오타인지). 추정 import 금지

**prop 매핑**: reuse 시 시안의 variant/visible 값만 컴포넌트 props로 옮긴다(예: Button label "Text", size, variant). prop API가 불확실하면 해당 컴포넌트 `index.ts`/`.tsx`의 Props 타입을 읽어 확인하고, 그래도 모호하면 질문. **존재하지 않는 prop을 지어내지 않는다.**

> 효과: composite가 DS 컴포넌트를 **재사용**해 유지보수성·일관성 유지(평탄화하면 qa의 "DS 우선" 위반 + 중복 마크업). Image Viewer 실측: 12 data-name → reuse 4 / helper 5 / own-part 2 / unresolved 1.

## 무시 / 제외 패턴 (Figma 출력 잡음)

- `data-node-id="..."` — Figma 좌표 정보 (annotation), 코드 X
- `data-name="..."` — Figma layer 이름, 코드 X
- `bg-[var(--palette.*.500,...)]` 단독 사용 (annotation guideline 색) — 시안 가이드라인, 무시
- `containerType: "size"` — 컨테이너 쿼리 고급 패턴, 케이스별 결정
- Tailwind responsive prefix (`md:`, `lg:`) — DS는 컨테이너 쿼리 우선, 케이스별

## 검증 룰 (변환 후 자동 체크)

1. **Raw value 경고**: `gap-[3px]` 등 spacing 토큰 미일치 → 경고 출력 + 가까운 토큰 추천
2. **palette 매핑 실패 fail**: `var(--theme.palette.*)` 패턴이 `vars.color.*`에 매핑 안 되면 fail (토큰 신설 또는 매핑 룰 추가)
3. **fontFamily 제약**: `'Min Sans'`/`'Roboto Mono'` 외 폰트면 fail (자체 폰트만 허용)
4. **annotation 색 사용 금지**: `var(--palette.magenta.500,...)` 등이 컴포넌트 코드에 사용되면 fail (시안 가이드라인 색은 코드 X)
5. **아이콘 인라인 SVG 금지 + 미해석 fail**: `<img src="...localhost:3845...svg">`를 코드에 남기면 fail. 모든 아이콘은 `icon-resolve.mjs`로 해석 → `high`만 자동 사용, `low/none`은 사용자 확인 전 진행 금지 (추정 렌더 = 할루시네이션)
6. **DS 컴포넌트 평탄화 금지**: `data-name`이 DS 컴포넌트(`component-resolve.mjs` → `reuse`)인데 마크업을 인라인으로 re-draw하면 fail. `<Button/>` 등으로 재사용. `unresolved`는 추정 import 금지·사용자 질문

## 4파일 표준 보일러플레이트

변환 결과는 다음 4파일 구조로 생성:

```
src/components/<category>/<component-name>/
├── ComponentName.tsx          # React 컴포넌트 (Compound 가능)
├── ComponentName.css.ts       # vanilla-extract style/recipe
├── ComponentName.stories.tsx  # Showcase 1개 (Light/Dark 토글 + 빈 상태 분기)
└── index.ts                   # 공개 export (외부 사용처 있는 type만 노출)
```

## 사용 예시

### 입력 (Figma MCP `get_design_context` 출력 일부)
```jsx
<div className="bg-[var(--theme.palette.surface.field.default,white)] border border-[var(--theme.palette.outline.subtle,#dee2e7)] border-solid rounded-[var(--radius.50,4px)] p-[var(--spacing.150,12px)] flex items-center gap-[var(--spacing.100,8px)]">
  <p className="font-['Min_Sans:Bold'] text-[12px] leading-[16px] text-[color:var(--theme.palette.text.title.strong,#1a1d21)]">
    Title
  </p>
</div>
```

### 출력 (변환 결과)
```typescript
// Component.css.ts
import { style } from '@vanilla-extract/css';
import { vars } from '../../../tokens/theme.css';
import { spacing, radius } from '../../../tokens/spacing';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../tokens/typography';

export const container = style({
  background: vars.color.surface.field.default,
  border: `1px solid ${vars.color.outline.subtle}`,
  borderRadius: radius[50],
  padding: spacing[150],
  display: 'flex',
  alignItems: 'center',
  gap: spacing[100],
});

export const title = style({
  fontFamily: fontFamily.sans,
  fontSize: fontSize[12],
  fontWeight: fontWeight.bold,
  lineHeight: lineHeight[16],
  color: vars.color.text.title.strong,
});
```

## 관련 skills (예정)

- `saige-ds-session-start` — 프로젝트 상태(배포됨/진행 중/적용 규칙) 파악
- `saige-ds-qa` — 4파일 구조/Showcase 표준/하드코딩 검사
- `saige-ds-visual-verify` — Figma 캡쳐 ↔ Storybook diff (gbasin RMSE loop + uiMatch)
- `saige-premerge-review` — PD 관점 5단계 자기검증 (메모리 규칙)
- `saige-ds-handoff` — PR 생성 + 메모리 갱신 + Phase 2 티켓 분리

## 참조

- SAIGE DS 토큰 구조: `/Users/donghochoi/Documents/design-system/src/tokens/{spacing,radius,theme.css,typography}.ts`
- SDS-216 v2 구현 (검증된 실증 케이스): `src/components/data-display/data-grid/`
- 출처 차용: `gbasin/figma-to-react` (MIT, Figma MCP + visual verify), Properly Studio 10 skills (MIT, DS 워크플로우 단계 분해)

## 변경 이력

- v0.1 (2026-06-08): SDS-216 DataGrid v2 작업 추출 기반 초안. 카메라맵 첫 실증 예정.
- v0.2 (2026-06-09): **아이콘 매핑 규칙(9번) + `icon-resolve.mjs` 결정론적 resolver 추가**. Image Viewer 실증에서 식별된 composite 변환 병목(아이콘) 해소 — snake_case→`@saige-ai/icons`(277) exact match, 미해석 시 추정 금지·사용자 질문. 검증 룰 5번(인라인 SVG 금지)+ 추가. 실측 ~92% 결정론적.
- v0.3 (2026-06-09): **컴포넌트 인스턴스 재사용 규칙(10번) + `component-resolve.mjs` 추가**. composite 두 번째 병목(DS 컴포넌트 평탄화) 해소 — `data-name`→DS export(92) 분류(reuse/helper/own-part/unresolved), 평탄화 금지+추정 import 금지. 검증 룰 6번 추가. Image Viewer 실측: reuse 4/helper 5/own-part 2/unresolved 1.
