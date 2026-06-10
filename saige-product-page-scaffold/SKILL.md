---
name: saige-product-page-scaffold
description: safety-frontend 페이지 신설 시 표준 보일러플레이트(React Router v7 + lazy + Suspense + ErrorBoundary + ProtectedRouteGuard + service/widget 분리)를 자동 적용. **사내 DS @saige-ai/design-system 우선, MUI 신설 사용 금지**. SAIGE Product 트랙.
---

# saige-product-page-scaffold

safety-frontend 신규 페이지/위젯/서비스 추가 시 일관된 구조 적용. DS의 4파일 표준 대응.

## 핵심 정책

- **사내 DS `@saige-ai/design-system` 우선 사용**
- **MUI(`@mui/material`, `@mui/x-*`) 신설 import 금지** (사내 DS 마이그레이션 예정)
- 사내 DS에 없는 영역만 emotion `styled()` 또는 plain JSX

## 적용 시점

- 새 라우트 페이지 신설 (예: `/camera-map`)
- 새 위젯 신설 (`packages/widgets/<domain>/`)
- 새 서비스 모듈 신설 (`packages/services/<domain>/`)

## 페이지 구조 결정 룰

### 1. 페이지 단위 (라우트 화면)
위치: `apps/safety/saige/src/pages/<pageName>/`
구조:
```
pages/<pageName>/
├── <PageName>Page.tsx       # 페이지 컴포넌트 (lazy export default)
├── <PageName>Page.styles.ts # Emotion styled (사내 DS로 안 되는 영역만)
├── loader.ts                # React Router loader (서버 상태 prefetch)
├── ErrorBoundary.tsx        # 페이지 레벨 에러 핸들링 (선택)
└── index.ts                 # lazy export
```

### 2. 위젯 단위 (복합 UI)
위치: `packages/widgets/<domain>/src/`

### 3. 서비스 모듈 (CRUD 도메인) — safety-frontend 컨벤션
위치: `packages/services/<domain>/src/`
구조 (CRUD 4분류):
```
packages/services/<domain>/src/
├── @shared/   # 도메인 전용 (외부 X)
├── @x/        # 내부 비공개 (외부 export X)
├── display/   # 조회 / 목록 / 상세
├── register/  # 생성
├── update/    # 수정
├── delete/    # 삭제
└── index.ts   # 공개 export
```

## 보일러플레이트 표준

### 페이지 컴포넌트 (사내 DS 사용)

```tsx
import { Suspense } from 'react';
// 사내 DS import
import { Avatar, Button } from '@saige-ai/design-system';
// emotion styled (사내 DS에 없는 layout 등)
import styled from '@emotion/styled';

const PageContainer = styled.div`
  display: flex;
  height: 100%;
`;

export default function CameraMapPage() {
  return (
    <PageContainer>
      <Suspense fallback={<LoadingFallback />}>
        {/* 페이지 콘텐츠 — 사내 DS 위주 */}
      </Suspense>
    </PageContainer>
  );
}

export { loader } from './loader';
```

**MUI Box / Stack 사용 금지**. plain styled div + flex 또는 사내 DS Layout 컴포넌트(있다면).

### loader (TanStack React Query 통합)

```ts
import { queryClient } from '@/queryClient';
import { cameraMapQueryOptions } from '@saige/cameraMap';

export const loader = async () => {
  await queryClient.ensureQueryData(cameraMapQueryOptions());
  return null;
};
```

### 인증 보호 라우트
`ProtectedRouteGuard`로 wrapping (사내 또는 `@saige/shared` guards):
```tsx
import { ProtectedRouteGuard } from '@saige/shared';

<ProtectedRouteGuard>
  <CameraMapPage />
</ProtectedRouteGuard>
```

### 모바일 화면 (Stackflow)
위치: `apps/safety/saige/src/screens/`

## 의존성 흐름 (반드시 준수)

```
App → @saige/widgets → @saige/services/* → @saige/shared → 외부
```

추가: 사내 DS `@saige-ai/design-system`은 외부 의존성으로 어느 layer에서나 import 가능.

## TypeScript Path Alias

- `@/*` → `apps/safety/saige/src/*`
- `@saige/shared` / `@saige/widgets` / `@saige/<service>`
- `@saige-ai/design-system` (외부 npm)

## Provider 통합

`MultiProvider` 체인(`app/app.tsx`) — 변경 없음. MUI Theme Provider도 기존 코드 호환 위해 유지 (다만 신설 페이지에서 MUI 직접 사용 X).

## 검증 룰 (saige-product-qa 연계)

1. 새 페이지 등록 시 `app/router.tsx` 라우트 추가 확인
2. Path alias `@/*` / `@saige/*` 사용, 상대경로 금지
3. lazy + Suspense 적용 확인
4. `ProtectedRouteGuard` 사용 여부
5. **`useUserNavigateMap` GNB 메뉴 등록 필수** — `packages/shared/src/hooks/useUserNavigateMap/useUserNavigateMap.tsx`의 `gnbMap` 배열에 신규 라우트 추가. **이게 빠지면 `NavigateSyncProvider`가 403으로 강제 redirect**. ProtectedRouteGuard와 별개 layer.

   필수 필드: `{ label: t('word.<key>'), icon: <IconX />, path: '/<route>', key: '<key>', lnb?: [...], dynamicPath?: '/:id' }`

   추가 권한 필요 시: `useUserGnBMenuRole.ts`의 role 권한 매핑도 갱신. Tolgee i18n key + `@saige-ai/icons` 아이콘도 신규 시 추가.

   **2026-06-08 카메라맵 PoC에서 학습한 결정적 단계**.
6. **MUI 신설 import 금지 검증** — `from '@mui/material'` 또는 `from '@mui/x-*'` 새 import 발견 시 fail
7. 사내 DS import 권장 — `from '@saige-ai/design-system'` 우선

## 관련 skills

- `saige-product-figma-to-emotion` (변환, 사내 DS 우선)
- `saige-product-qa` (검증, MUI 신설 fail)
- `saige-product-session-start` (컨텍스트)

## 참조

- safety-frontend CLAUDE.md SSOT [[safety-frontend-claude-md-ssot]]
- 사내 DS 풀세트: COMPONENT_STATUS.md (45개)

## 변경 이력

- v0.1 (2026-06-08): 사내 DS 우선 + MUI 신설 금지 정책 반영.
