---
name: saige-product-session-start
description: safety-frontend 작업 착수 시 프로젝트 상태(Nx 모노레포 / 라우트 / 서비스 12개 / 위젯 / 진행 중 PR / 미해결 SAFETYPRD 티켓)를 자동 파악. SAIGE Product 트랙 컨텍스트 정렬. DS의 saige-ds-session-start와 별개.
---

# saige-product-session-start

safety-frontend 작업 착수 시 본인이 알아야 할 컨텍스트를 자동 수집. DS 트랙과 분리.

## 적용 시점

- 새 safety-frontend 페이지/위젯 작업 시작 (예: 카메라맵)
- 장시간 휴지 후 product 작업 재개
- DS 트랙 → Product 트랙 전환

## 자동 수집 항목

### 1. safety-frontend CLAUDE.md SSOT
- 본인 메모리 [[safety-frontend-claude-md-ssot]] 우선 활용
- 메모리 outdated 의심 시 `$SAIGE_SF_ROOT/CLAUDE.md` 직접 read
- 12개 핵심 항목 요약 출력

### 2. 본인 관련 메모리
- [[fe-conventions-and-pitfalls]] — Product 함정 + 컨벤션
- [[fe-pr-review-process]] — Product PR 매뉴얼
- [[fe-handover-wiki]] — 강재영 인계 위키
- [[secret-loss-incident]] — 환경변수 시크릿 상태
- [[ws-pipeline-state]] — WebSocket 인계 상태
- [[division-architecture]] — SAFETY≡VIMS 동일 아키텍처
- [[qa-collaboration]] — QA 사이클 + Reviewed protocol

### 3. 현재 git 상태 (safety-frontend)
- 현재 브랜치 / 변경 사항 / unpushed
- 진행 중인 작업 컴포넌트/페이지

### 4. 진행 중인 SAFETYPRD 티켓
- Atlassian MCP로 본인 담당 active 티켓 조회
- 상태별 분류 (To Do / In Progress / Reviewed / Done)

### 5. 라우트 현황
- `apps/safety/saige/src/app/router.tsx` 인덱싱
- 신규 라우트가 기존과 conflict 없는지 검증

### 6. 서비스 패키지 12개 + 위젯 인덱싱
- `packages/services/<domain>/` 12개
- `packages/widgets/<domain>/` (camera, dashboard, domain, role, site, user 등)
- 신규 도메인이 기존과 분리/중복인지 확인

### 7. 의존성 흐름 + Path alias 검증
- `@saige/*` alias 12개 + `@saige/shared` + `@saige/widgets`
- 본인 작업이 의존성 흐름 (App → widgets → services → shared)을 준수하는지

### 8. PR 호스팅 + JIRA 컨텍스트
- Azure DevOps: `SaigeResearch/SaigeSafety/_git/saige-safety-frontend`
- Base 브랜치: `dev`
- JIRA project: `SAFETYPRD` (Atlassian: saige-product.atlassian.net)

## 출력 포맷

`product-session-context.md`:

```markdown
# safety-frontend Session Context — <timestamp>

## SSOT 핵심 (CLAUDE.md)
- 12개 항목 요약

## 진행 중인 작업
- 브랜치: <name>
- modified: ...

## 본인 담당 SAFETYPRD 티켓 (활성)
| Key | Title | Status |
|---|---|---|
| SAFETYPRD-xxxx | ... | In Progress |

## 라우트 현황 + 신규 등록 위치
- 기존: /login /dashboard /monitoring /report /settings/* /external-monitoring
- 신규 후보: /camera-map (또는 기존 sub-route)

## 서비스 패키지 12개 현황
- alarm, auth, camera, dashboard, domain, monitoring, report,
  resource, role, site, systemInfo, user
- 신규 도메인 (예: cameraMap) 추가 검토

## 적용 규칙 요약 (Product 트랙)
- Path alias `@saige/*`
- 의존성 흐름 (App → widgets → services → shared)
- CRUD 컨벤션 (display/register/update/delete)
- MUI + Emotion 스타일
- React Query (useSuspenseQuery + ensureQueryData)
- React Router v7 + lazy + Suspense + ProtectedRouteGuard
- Azure DevOps PR (`dev` base)

## 다음 작업 후보
- ① 카메라맵 페이지 신설 + 서비스 패키지 결정
- ② ...
```

## 사람 개입 최저 원칙

- 8개 영역 모두 자동. 사용자 입력 X
- 사용자는 보고서 받은 후 다음 작업 결정만
- 메모리 outdated 의심 시 본인이 자동 원본 read

## 관련 skills

- DS 대응: [[saige-ds-session-start]]
- 후속: `saige-product-figma-to-emotion` / `saige-product-page-scaffold` / `saige-product-qa`

## 변경 이력

- v0.1 (2026-06-08): Product 트랙 일반화. 카메라맵 PoC 대응.
