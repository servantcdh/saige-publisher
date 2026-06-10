---
name: saige-ds-session-start
description: SAIGE DS 작업 착수 시 프로젝트 상태(배포됨/진행 중/적용 규칙)를 자동 파악. CLAUDE.md SSOT / 본인 메모리 / 현재 git 상태 / 진행 중인 PR / 미해결 Jira 티켓을 한 번에 인덱싱하여 작업 컨텍스트 사전 정렬. Properly Studio ds-session-start-tw 차용 + SAIGE 컨텍스트 패치.
---

# saige-ds-session-start

DS 컴포넌트 작업 착수 시점에 본인이 알아야 할 모든 컨텍스트를 자동 수집. 본인 시간/사용자 시간 모두 절약.

## 적용 시점

- 새 DS 컴포넌트 작업 시작 시 (예: 사용자가 "카메라맵 퍼블리싱 시작하자" 명령)
- 장시간 휴지 후 작업 재개 시 (메모리 기반 컨텍스트 복원)
- 다른 컴포넌트로 작업 전환 시

## 자동 수집 항목 (사용자 추가 입력 X)

### 1. CLAUDE.md SSOT
- 본인 메모리 [[ds-claude-md-ssot]] 정독 결과 우선 활용
- 메모리가 outdated면 `/Users/donghochoi/Documents/design-system/CLAUDE.md` 직접 read
- 핵심 11개 항목 요약 출력

### 2. 본인 관련 메모리
- [[ds-component-standard]] — Button 정독 7가지 작업 표준
- [[ds-handover-wiki]] — 강재영 인계 위키 (미구현 4개 / 표준 절차)
- [[ds-datagrid-v2-decisions]] — SDS-216 v2 결정 내역
- [[feedback-premerge-pd-review]] / [[feedback-ds-knip-unused]] — 머지 전 검증 규칙
- [[commit-message-convention]] — Conventional + JIRA footer
- [[release-main-ownership]] — main 머지 권한

### 3. 현재 git 상태
- 현재 브랜치 / 변경 사항 / unpushed commit
- 진행 중인 작업이 있다면 어떤 컴포넌트인지

### 4. 진행 중인 PR
- `gh pr list` — design-system 리포의 본인 미머지 PR
- 각 PR의 CI 상태 / 리뷰 상태 / 머지 가능 여부

### 5. 미해결 Jira 티켓
- 본인 담당 SDS / SAFETYPRD 티켓 검색
- 상태별 분류 (진행 중 / 리뷰 / 머지 대기)

### 6. 컴포넌트 구현 현황
- `COMPONENT_STATUS.md` 자동 인덱싱
- 신규 작업 대상이 미구현인지 / Foundation인지 / 완료인지

### 7. 디자인 토큰 카탈로그
- `src/tokens/` 디렉토리 read (spacing/radius/colors/typography)
- 본인 변환 룰 [[saige-ds-figma-to-vex]] 활용 시 정확한 토큰 매핑

### 8. @saige-ai/icons 카탈로그
- `node_modules/@saige-ai/icons` 의 export 목록 인덱싱
- `figma-handoff-scanner`의 자산 매핑에 활용

## 출력 포맷

`session-context-report.md` 단일 보고서:

```markdown
# DS Session Context — <timestamp>

## SSOT (CLAUDE.md) 핵심
- 11개 항목 요약
- 본인 SDS-216 v2 위반 5개 갭 (참고)

## 진행 중인 작업
- 브랜치: <name>
- unpushed: N commits
- modified files: ...

## 진행 중인 PR
| PR # | Title | CI | Review | Mergeable |
|---|---|---|---|---|
| #33 | SDS-216 Foundation | ✅ | 대기 | ✅ |
| #34 | SDS-220 Convention | ✅ | 대기 | ✅ |

## 본인 담당 Jira (활성)
| Key | Title | Status |
|---|---|---|
| SDS-216 | DataGrid Foundation | In Review |
| SDS-217 | Row actions menu | To Do |
| SDS-218 | Column 관리 패널 | To Do |
| SDS-219 | Pagination + Narrow | To Do |
| SDS-220 | Figma Handoff Convention | In Review |

## 적용 규칙 요약
- Path alias `@/tokens` 필수
- 4파일 표준 + Showcase 엄격
- 토큰 사용 (spacing/radius/vars)
- push 전 `pnpm typecheck && pnpm lint && pnpm knip`
- 머지 전 saige-premerge-review

## 다음 작업 후보 (사용자 선택)
- ① 카메라맵 신규 작업 (시안 확정 후)
- ② SDS-217 Row actions 착수 (SDS-216 머지 후)
- ③ saige-ds-handoff skill 작성 마무리
- ④ 회귀 세트 구축
```

## 사람 개입 최저 원칙

- 8개 영역 모두 자동 수집. 사용자 입력 X
- 사용자는 보고서 받은 뒤 다음 작업만 결정
- 메모리 outdated 의심 시 본인이 자동으로 원본 read (사용자 확인 X)

## 관련 skills

- `figma-handoff-scanner` — 후속 단계 (시안 스캔)
- `saige-ds-figma-to-vex` — 후속 단계 (변환)
- `saige-ds-qa` — 후속 단계 (검증)
- `saige-ds-visual-verify` — 후속 단계 (시각 검증)
- `saige-premerge-review` — 후속 단계 (머지 게이트)
- `saige-ds-handoff` — 후속 단계 (PR 생성)
- `saige-ds-session-start` (이 skill) — **0단계 컨텍스트 정렬**

## 참조

- Properly Studio `ds-session-start-tw` — 차용 원천
- 본인 메모리 풀세트

## 변경 이력

- v0.1 (2026-06-08): 8개 자동 수집 영역 초안. 다음 카메라맵 작업 착수 시 첫 실증.
