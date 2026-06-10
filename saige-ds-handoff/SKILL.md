---
name: saige-ds-handoff
description: SAIGE DS 컴포넌트 작업 마무리. saige-premerge-review 통과 후 PR 생성 + Phase 2 후속 티켓 자동 분리 + 메모리 자동 갱신 + COMPONENT_STATUS/README 갱신 자동 + Vercel Preview URL 확보 후 PD 비동기 공유 메시지 초안 자동 작성. 사람 개입 최저 — 사용자는 최종 확인만.
---

# saige-ds-handoff

DS 컴포넌트 작업 사이클의 마지막 단계. premerge-review 통과 후 모든 마무리 작업을 자동.

## 적용 시점

- `saige-premerge-review`가 "머지 진행" 권고 산출 후 즉시
- 사용자가 "PR 생성하자" 요청한 순간
- Foundation PR이라면 자동으로 Phase 2 티켓 분리 진행

## 0단계 — 본인 사전 read 의무 (★ 2026-06-09 추가)

PR 생성 사이클 진입 전 본인이 반드시:
- [[feedback-workflow-violations]] 사전 read — 본인 누적 위반 환기
- 본인 자기평가 신뢰도(현재 65/100) 인지
- 본인 자율 결정 영역 vs 사용자 확인 영역 분리 의식

🚨 **할루시네이션 절대 금지** (사용자 2026-06-09 명시):
- 시안 부재/명세 부족 영역에 본인 추정 코드 X
- PR 본문 작성 시도 본인 추정 표현 X
- 본인 위반 패턴 4건 누적 — 같은 패턴 반복 시 추가 강제 메커니즘 도입 위험

## 자동 수행 7단계

### 1단계 — PR 본문 자동 작성
입력: premerge-review-report.md + visual-verify summary + qa-report
산출: PR 본문 (Markdown):
- PR 타입 체크박스 (`- [x] feat / fix / docs / chore`)
- TL;DR (1-2문장, premerge-review 권고 반영)
- 변경 사항 (commit log 기반 + 자동 분류)
- 시안 정합도 (visual-verify 실측 점수 명시)
- 범위 외 (Phase 2 후속 티켓)
- 관련 이슈 (Jira 자동 링크)
- 추가 정보 (Storybook URL, 기술 메모)

### 2단계 — Documentation Update Rules 자동 갱신
CLAUDE.md SSOT 따라 3개 파일 자동 갱신:
- `COMPONENT_STATUS.md` — 컴포넌트 상태 (✅/🟡/❌)
- `README.md` — 컴포넌트 요약 + 변경 이력 항목
- `ELEMENTS2_POC_GUIDE.md` — 사용 예시 (Foundation은 보류 가능)

### 3단계 — Phase 2 후속 티켓 자동 분리
premerge-review의 "범위 외" 항목을 Jira 티켓으로 자동 생성:
- `mcp__atlassian__createJiraIssue` 호출
- 각 티켓에 본 PR(SDS-xxx) Relates 링크
- 티켓 description에 본 PR 컨텍스트 + Phase 2 의도 명시
- PR 본문에 신규 티켓 링크 추가

### 4단계 — 사전 검증 (push 전 마지막)
- `pnpm typecheck && pnpm lint && pnpm knip` 자동 실행
- 통과 시 다음 단계, 실패 시 자동 패치 시도 (saige-ds-qa의 자동 패치) + 재검증

### 5단계 — Commit 메시지 표준화
- 본인 작업의 마지막 commit이 Conventional Commits 형식인지 검증
- JIRA footer 명시 확인
- 한글 + 비개발자 친화 톤 검증 (Changelog 친화)
- 미달 시 마지막 commit 메시지 재작성 권고

### 6단계 — PR 생성 → `saige-pr-create` 위임 (★ 통합)

본인이 직접 `gh pr create` 호출 X. **`saige-pr-create` 6단계 워크플로우로 위임**:

1. figma-handoff-scanner 자율 호출 → discovery.md
2. Figma 시안 캡쳐
3. 본인 구현 작업 (이 skill의 1-5단계 결과물)
4. 본인 구현 캡쳐 (Storybook)
5. **사용자 시각 승인 (★ 필수)** — Figma + Storybook 두 캡쳐 보여줌 + 명시 승인 대기
6. 토큰 생성 + `gh pr create --base develop`

🚫 **hook 차단 메커니즘**: 본인이 5단계 사용자 승인 누락하고 직접 `gh pr create` 호출 시 PreToolUse hook이 차단 + 5단계 누락 메시지 출력. 본인 우회 불가.

PR 생성 후 CI 모니터링 (3-5분).

⚠️ **Vercel Preview URL은 사용 안 함** — 이정남님 개인 계정 소속. 회사 계정 이관까지 PD 공유는 다른 방식.

### 7단계 — PD 비동기 공유 메시지 초안 (Vercel URL 제거)

**현재 정책 (2026-06-08 결정)**: Vercel preview URL이 이정남님 개인 계정 보호로 PD 접근 불가. **회사 계정 이관 전까지는 메시지에 Vercel URL 포함 안 함**.

대안 공유 수단 (사용자 결정):
- Showcase PNG 캡쳐 첨부 (본인이 로컬 Storybook + Playwright로 캡쳐)
- Notion/Confluence 페이지 임베드
- 직접 화면 공유 (Teams 미팅)

산출 메시지 (Vercel URL 없는 형태):
```markdown
@<PD 이름> 님 <티켓> <컴포넌트> 1차 PR 공유드립니다.

이번 PR은 ... 1차 Foundation입니다.
실측 정합도 — 시각 ≈ XX% / 동작 = YY%.
<범위 외 항목>은 SDS-aaa/bbb/ccc로 분리해서 후속 진행할 예정입니다.

PR: <pr-url>
구현 결과 캡쳐: <첨부 또는 Notion 링크>

시안 정합 면에서 짚어주실 부분 있으시면 코멘트 부탁드립니다.
편하실 때 보시고 회신 주셔도 괜찮습니다.
```

**회사 계정 이관 후**: Vercel preview URL 다시 메시지 포함. SKILL.md도 그 시점에 갱신.

본인 점잖은 문체 + SAIGE 컨텍스트 자동 반영.

## 메모리 자동 갱신

다음 메모리 자동 업데이트:
- 새 컴포넌트 정보 → 본인 메모리에 component-specific 메모리 신설 (예: `ds-cameramap-v1-decisions.md`)
- visual-verify 실측 점수 → 자기평가 편향 누적 (`_self_evaluation_log.json`)
- 작업 사이클 회고 (배운 점 / 갭 / 후속 작업)

메모리 commit + push (servantcdh 개인 깃) — 사용자 이전 지시: "메모리도 내 개인 깃에 커밋하자"

## 사람 개입 최저 — 사용자 확인 시점

본인 자동 진행하되 다음 시점에 사용자 확인 1회:
- PR 본문 초안 검토 (최종 push 전)
- PD 공유 메시지 초안 검토 (실제 발송 전)
- Phase 2 티켓 분리가 의도와 맞는지 확인

이 외 모든 단계 자동.

## 사용자 추가 입력 허용 시점 (예외)

- visual-verify 점수가 낮아 머지 보류 권고 시 — 사용자 결정 (Foundation 분리 vs 추가 작업)
- 신규 컴포넌트가 기존 카테고리에 안 맞을 때 — 사용자 결정 (카테고리 신설)

## 관련 skills

- `figma-handoff-scanner` (1단계) → `saige-ds-figma-to-vex` (2) → `saige-ds-qa` (3) → `saige-ds-visual-verify` (4) → `saige-premerge-review` (5) → **`saige-ds-handoff` (6)**

## 워크플로우 통합 - 단일 호출 가능성

사용자 슬래시 명령 후보 (장기):
- `/publish-from-figma <figma-url> <jira-key>` → 1~6단계 자동 실행
- 본인이 각 단계 결과를 사용자에게 보고하며 진행

## 참조

- Properly Studio `ds-handoff-tw` 차용
- 본인 메모리: [[release-main-ownership]] / [[fe-pr-review-process]] / [[commit-message-convention]]
- SDS-216 #33 PR 생성 흐름 (본인 실증 사례)

## 변경 이력

- v0.1 (2026-06-08): 7단계 자동 마무리 초안. 카메라맵 첫 실증 예정.
- v0.2 (2026-06-09): 0단계(위반 메모리 사전 read + 할루시네이션 금지) 추가, 6단계 PR 생성을 `saige-pr-create` 6단계 워크플로우로 위임. 사용자 시각 승인 단계 명시 강조. SDS-217 폐기 사후학습.
