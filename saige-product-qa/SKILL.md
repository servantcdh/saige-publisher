---
name: saige-product-qa
description: safety-frontend 신규/수정 작업의 CLAUDE.md SSOT 준수 검증. **MUI 신설 import 금지** + 사내 DS(@saige-ai/design-system) 우선 / Path alias / 의존성 흐름 / CRUD 컨벤션 / React Query 패턴 / 라우트 등록 / i18n / a11y / typecheck/lint/knip 10개 영역 자동 검사.
---

# saige-product-qa

safety-frontend 작업물의 SSOT 준수 검증. DS의 `saige-ds-qa`와 별개.

## 적용 시점

- 신규 페이지/위젯/서비스 작업 완료 후 PR 생성 직전
- 머지 전 검증 (`saige-premerge-review`와 함께)
- safety-frontend CLAUDE.md 변경 시 회귀

## 검증 10개 영역

### 1. 디렉토리 구조 (CRUD 컨벤션)

서비스 모듈: `packages/services/<domain>/src/{@shared,@x,display,register,update,delete}/`
페이지: `apps/safety/saige/src/pages/<pageName>/`

### 2. Path alias 검증

| 패턴 | 검증 |
|---|---|
| ❌ `from '../../../../packages/services/...'` | Fail |
| ✅ `from '@saige/<service>'` | OK |
| ✅ `from '@saige/shared'` | OK |
| ✅ `from '@saige-ai/design-system'` | OK (외부 DS) |
| ✅ `from '@/components/...'` (app 내부) | OK |

### 3. 의존성 흐름 (단방향)
```
App → @saige/widgets → @saige/services/* → @saige/shared
```
사내 DS `@saige-ai/design-system`은 외부 npm이라 어느 layer에서나 OK.

### 4. **MUI 신설 사용 금지** (핵심)

| 패턴 | 검증 |
|---|---|
| ❌ `import .* from '@mui/material'` (신설 파일) | **Fail** — 사내 DS로 교체 |
| ❌ `import .* from '@mui/x-data-grid-premium'` (신설) | **Fail** |
| ❌ `import .* from '@mui/x-*'` (신설) | **Fail** |
| ✅ 기존 파일의 MUI 유지 (마이그레이션 대기) | OK (점진 마이그레이션 권고만) |
| ✅ `import .* from '@saige-ai/design-system'` | **권장** |

**검증 방법**: git diff로 신설 파일 식별 후 MUI import 검색. 발견 시:
- 에러 메시지: "MUI 신설 사용 금지 (2026-06-08 정책). 사내 DS @saige-ai/design-system 대체 사용"
- 자동 추천: 사내 DS COMPONENT_STATUS.md 45개 중 일치하는 컴포넌트 제안

### 5. 사내 DS 우선 사용 확인

- 인터랙티브 요소 (Button, TextField, Select 등): 사내 DS에 있으면 무조건 사용
- 사내 DS 카탈로그 인덱싱: `node_modules/@saige-ai/design-system/dist/index.d.ts`
- 매칭 실패 시: emotion `styled()` 직접 작성 권장

### 6. React Query 패턴

- 서버 상태: `useSuspenseQuery` + route loader `ensureQueryData`
- 변이: `useMutation` + `queryClient.invalidateQueries`
- QueryClient: `retry: false`, `throwOnError: true`
- useState로 서버 데이터 관리 ❌

### 7. 라우트 등록

- `app/router.tsx`에 등록 확인
- `lazy + Suspense` 적용
- `ProtectedRouteGuard` (public 외)

### 8. i18n (Tolgee) 검증

- 사용자 노출 텍스트: `<T keyName>` 또는 `t('keyName')`
- 하드코딩 텍스트 ❌ (시스템 메시지 / debug 제외)
- 한국어 조사: Tolgee 커스텀 포매터 (`{name}이/가`)

### 9. a11y 검증

- 키보드 접근성 (`tabIndex`, `onKeyDown`)
- `aria-label` (icon-only 버튼 필수)
- Role 또는 시맨틱 HTML
- Focus visible

### 10. 사전 명령

```bash
pnpm typecheck && pnpm lint && pnpm knip
```

ESLint v9 flat config: React + Hooks + TanStack Query + Storybook 플러그인.

## 출력 포맷

`qa-report.md`:

```markdown
# saige-product-qa Report — <목표 작업>

## 통과 ✅
- [x] 디렉토리 구조
- [x] Path alias
- [x] 의존성 흐름
- [x] React Query 패턴
- [x] 라우트 등록
- [x] typecheck/lint/knip

## 실패 ❌
- ❌ **MUI 신설 사용** (CRITICAL): 
  - `apps/.../CameraMapPage.tsx:5` `import { Box } from '@mui/material'` 
  - → 권장: `import styled from '@emotion/styled'` + `const Container = styled.div\`...\`` 
  - 또는 `import { ... } from '@saige-ai/design-system'`

## 검토 필요 ⚠️
- ⚠️ i18n: 하드코딩 텍스트 3개
```

## 자동 패치 우선순위

1. **MUI → 사내 DS 자동 추천** (`@mui/material/Button` → `@saige-ai/design-system/Button`)
2. **MUI → emotion styled 자동 변환** (DS에 없을 때)
3. Path alias 치환
4. knip unused export 제거

## 관련 skills

- `saige-product-figma-to-emotion` (변환)
- `saige-product-page-scaffold` (보일러플레이트)
- `saige-product-visual-verify` (시각 검증)
- DS 대응: [[saige-ds-qa]]

## 참조

- safety-frontend CLAUDE.md [[safety-frontend-claude-md-ssot]]

## 변경 이력

- v0.1 (2026-06-08): MUI 신설 금지 정책 + 사내 DS 우선 검증 추가.
