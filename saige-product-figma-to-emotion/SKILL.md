---
name: saige-product-figma-to-emotion
description: Figma MCP 출력(Tailwind 코드) → safety-frontend의 사내 DS(@saige-ai/design-system) + Emotion styled() 변환 룰. **신설 페이지부터 MUI 사용 금지** (사내 DS 마이그레이션 예정, 일거리 증가 회피). 사내 DS에 없는 컴포넌트만 emotion styled로 직접 작성. SAIGE Product 트랙.
---

# saige-product-figma-to-emotion

Figma 시안 → safety-frontend 코드 변환의 SAIGE Product 트랙 매핑 룰. DS 트랙(`saige-ds-figma-to-vex`)과 별개.

## 핵심 정책 (2026-06-08 결정)

| 사용 우선순위 | 컴포넌트 |
|---|---|
| **1순위** | **사내 DS `@saige-ai/design-system`** — Button, IconButton, SearchBar, Filter, Checkbox, Switch, Select, ComboBox, Tabs, Dialog, TextField, TextArea, Avatar, Tooltip, Toast 등 풀세트 |
| 2순위 | Emotion `styled()` 직접 작성 — 사내 DS에 없는 경우만 |
| ❌ **금지** | **MUI 컴포넌트 신설 사용** (`@mui/material`, `@mui/x-*`) — 기존 코드 유지는 OK, 신규는 절대 X |

**이유**: safety-frontend는 MUI → 사내 DS 마이그레이션 예정. 신설 페이지에 MUI 사용 시 마이그레이션 일거리 증가. 신설부터 사내 DS로 통일.

## 적용 시점

- safety-frontend 신규 페이지/위젯/서비스 모듈 퍼블리싱
- Figma 시안의 Tailwind 코드를 사내 DS + Emotion으로 변환

## 변환 룰 매트릭스

### 1. Color (사내 DS `vars` 사용)

사내 DS는 vanilla-extract지만 safety-frontend는 Emotion. 두 가지 방식:

**방식 A — 사내 DS 컴포넌트 + 그 자체 토큰 (권장)**:
- DS 컴포넌트(`Button`, `IconButton` 등)는 자체 토큰 내장 → 사용자가 직접 색 지정 X
- 본인 컴포넌트 신설이 필요한 경우만 방식 B

**방식 B — Emotion `styled()` + 사내 DS 토큰 직접 사용**:
- 사내 DS export: `vars` (from `@saige-ai/design-system` 또는 별도 토큰 export)
- 실제 export 확인 필요 (사내 DS 공개 토큰 API)
- 또는 hardcoded → 추후 토큰화

| Figma 패턴 | 변환 |
|---|---|
| `bg-[var(--theme.palette.surface.light,...)]` | 사내 DS 컴포넌트 사용 / 또는 `styled.div\`background: <DS surface light>\`` |
| `text-[color:var(--palette.magenta.500,...)]` (annotation) | ❌ 무시 |

### 2. Spacing

| Figma | 변환 |
|---|---|
| `p-[var(--spacing.50,4px)]` | `padding: 4px` (직접) 또는 사내 DS 스페이싱 토큰 |
| `gap-[var(--spacing.150,12px)]` | `gap: 12px` |

> 사내 DS의 spacing 토큰 export 패턴 확인 후 통일 사용 권장.

### 3. Layout

| Figma | 변환 |
|---|---|
| `flex flex-col` | `styled.div\`display: flex; flex-direction: column;\`` 또는 `<div style={{ display: 'flex', flexDirection: 'column' }}>` |
| `items-center` | `align-items: center` |
| `gap-[16px]` | `gap: 16px` |

**MUI Box / Stack / Grid 사용 금지**. emotion styled 또는 plain div 사용.

### 4. 인터랙티브 컴포넌트 매핑

| Figma 의도 | 사내 DS (1순위) | Emotion styled (2순위, DS 없을 때) |
|---|---|---|
| Button | `import { Button } from '@saige-ai/design-system'` | — |
| IconButton | `import { IconButton } from '@saige-ai/design-system'` | — |
| Text Field | `import { TextField } from '@saige-ai/design-system'` | — |
| Search Bar | `import { SearchBar } from '@saige-ai/design-system'` | — |
| Select / Dropdown | `import { Select, SimpleSelect } from '@saige-ai/design-system'` | — |
| Combo Box | `import { ComboBox } from '@saige-ai/design-system'` | — |
| Checkbox | `import { Checkbox } from '@saige-ai/design-system'` | — |
| Switch | `import { Switch } from '@saige-ai/design-system'` | — |
| Filter (multi-select) | `import { Filter } from '@saige-ai/design-system'` | — |
| Date Picker | `import { DatePicker } from '@saige-ai/design-system'` | — |
| Tabs | `import { Tabs } from '@saige-ai/design-system'` | — |
| Dialog | `import { Dialog, SimpleDialog } from '@saige-ai/design-system'` | — |
| Bottom Sheet | `import { BottomSheet } from '@saige-ai/design-system'` | — |
| Tooltip | `import { Tooltip, TooltipIcon, TooltipText } from '@saige-ai/design-system'` | — |
| Toast | `import { Toast, useToast } from '@saige-ai/design-system'` | — |
| Avatar | `import { Avatar } from '@saige-ai/design-system'` | — |
| **DataGrid** | `import { DataGrid } from '@saige-ai/design-system'` (SDS-216 머지 후) | (현재는 MUI X DataGrid 마이그레이션 대기) |
| Card / Action Bar / App Bar | 사내 DS 풀세트 활용 | — |

사내 DS COMPONENT_STATUS 풀세트: 44개 + DataGrid Foundation = 45개. 신설 페이지가 사용할 컴포넌트 대부분이 이미 사내 DS에 존재.

### 5. 사내 DS에 없는 영역 — Emotion `styled()` 직접

평면도 / 캔버스 / 지도 / 차트 등 SAIGE 특화 영역:
- **평면도 + 카메라 마커 + 영역 마킹**: `packages/shared/src/drawingKit/` (Konva 기반) 활용
- **지도 (위경도)**: `packages/shared/src/libs/leaflet/` (Leaflet)
- **차트**: ECharts 직접 (사내 DS에 없음)

이 영역들은 emotion `styled()` 또는 plain JSX로 작성.

### 6. Typography

사내 DS에 `Typography` 컴포넌트 있음:
```tsx
import { Typography } from '@saige-ai/design-system';

<Typography variant="title1">...</Typography>
<Typography variant="14bol">...</Typography>
```

variant: `title1, title2, paragraph1, paragraph2, 16bol/med/reg, 14bol/med/reg, 12bol/med/reg, 12bolTabular/medTabular/regTabular, 11bol/med/reg, 10med/reg`.

### 7. 무시 / 제외 패턴

- `data-node-id` / `data-name` — Figma annotation
- `var(--palette.magenta.500,...)` 단독 (guideline 색) — 무시
- MUI 기존 import (`@mui/material`, `@mui/x-*`) — 신설은 절대 추가 X

## 검증 룰

1. **MUI 신설 사용 fail**: `import .* from '@mui/material'` 또는 `@mui/x-*` 새 import 감지 → 에러 + 사내 DS 대체 추천
2. **사내 DS 미존재 컴포넌트 fail**: 사내 DS 카탈로그(`@saige-ai/design-system`)에 없는 임의 컴포넌트 import 시 → 경고 + Emotion styled 직접 작성 권장
3. **Emotion styled 권장**: plain CSS-in-JS는 가능, 다만 hardcoded 색/spacing은 사내 DS 토큰 또는 추후 토큰화 검토 코멘트 자동 추가

## 마이그레이션 컨텍스트

safety-frontend MUI 기존 사용 영역 (마이그레이션 대상, 신설 X):
- MUI X DataGrid Premium 6.19.4 → 사내 DS DataGrid (Phase 2 완료 시 마이그레이션)
- MUI primitives (Button, TextField 등) → 사내 DS (점진 마이그레이션)
- DatePicker → 사내 DS DatePicker

본인 작업 영향:
- 본인 신설 코드는 **사내 DS만 사용** → 마이그레이션 시 무영향
- 본인 기존 MUI 코드 수정 시 → 사내 DS 대체로 동시 마이그레이션 (선택)

## 관련 skills

- `figma-handoff-scanner` (1단계, 공통)
- `saige-product-page-scaffold` (페이지 보일러플레이트)
- `saige-product-qa` (검증, MUI 신설 fail)
- DS 대응 skill: [[saige-ds-figma-to-vex]]

## 참조

- safety-frontend CLAUDE.md SSOT (본인 메모리 [[safety-frontend-claude-md-ssot]])
- 사내 DS 풀세트: COMPONENT_STATUS.md (45개)
- DrawingKit: `packages/shared/src/drawingKit/`
- Leaflet: `packages/shared/src/libs/leaflet/`

## 변경 이력

- v0.1 (2026-06-08): MUI 사용 금지 + 사내 DS 우선 정책 반영 (사용자 지시).
