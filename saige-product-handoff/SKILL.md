---
name: saige-product-handoff
description: safety-frontend 작업 마무리. saige-premerge-review 통과 후 Azure DevOps PR 생성 (dev base, 템플릿 적용) + JIRA SAFETYPRD footer + 본인 메모리 갱신 + PD 비동기 공유. Vercel preview 미사용 (이정남님 개인 계정, 회사 계정 이관까지 PD 공유는 PNG/Notion/Teams).
---

# saige-product-handoff

safety-frontend 작업 사이클 마지막 단계. DS의 `saige-ds-handoff`와 별개.

## 적용 시점

- `saige-premerge-review` 통과 후
- 사용자가 "PR 생성" 요청
- Foundation PR이면 Phase 2 후속 SAFETYPRD 티켓 자동 분리

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

`.azuredevops/pull_request_template.md` 템플릿 따름:

```markdown
## PR 타입
- [x] feat / fix / refactor / docs / chore / test

## TL;DR
1-2문장 요약

## 변경 사항
- (기능/동작 단위 불릿)

## 관련 이슈
- [SAFETYPRD-xxxx](https://saige-product.atlassian.net/browse/SAFETYPRD-xxxx)

## 추가 정보
- 시각 정합도, 시안 캡쳐, 참고 문서 등
```

### 2단계 — Documentation Update Rules
safety-frontend는 DS만큼 엄격한 문서 갱신 규칙 X. 다만 다음 가능:
- CHANGELOG (있다면)
- README 변경 사항 (해당 시)
- 신규 라우트 → `app/router.tsx`에 등록 확인

### 3단계 — Phase 2 후속 SAFETYPRD 티켓 자동 분리

본인 premerge-review의 "범위 외" 항목을 SAFETYPRD 티켓으로 자동 생성:
- `mcp__atlassian__createJiraIssue` 호출
- 프로젝트: `SAFETYPRD`
- 각 티켓에 본 PR Relates 링크
- 티켓 description에 본 PR 컨텍스트 + Phase 2 의도

### 4단계 — 사전 검증

```bash
pnpm typecheck && pnpm lint && pnpm knip
```

통과 시 다음 단계, 실패 시 자동 패치 시도 (saige-product-qa 자동 패치) + 재검증.

### 5단계 — Commit 메시지 표준화

- Conventional Commits 형식
- **JIRA footer 필수**: `JIRA: https://saige-product.atlassian.net/browse/SAFETYPRD-xxxx`
- 한국어 가능 (DS Changelog 친화 톤만큼 엄격하지 X, 다만 명확성 권장)

### 6단계 — PR 생성 → `saige-pr-create` 위임 (★ 통합)

본인이 직접 `az repos pr create` 호출 X. **`saige-pr-create` 6단계 워크플로우로 위임**:

1. figma-handoff-scanner 자율 호출 → discovery.md
2. Figma 시안 캡쳐
3. 본인 구현 작업 (이 skill의 1-5단계 결과물)
4. 본인 구현 캡쳐 (Vite dev server)
5. **사용자 시각 승인 (★ 필수)** — Figma + 본인 캡쳐 두 캡쳐 보여줌 + 명시 승인 대기
6. 토큰 생성 + `az repos pr create --target-branch dev`

🚫 **hook 차단 메커니즘**: 본인이 5단계 사용자 승인 누락하고 직접 `az repos pr create` 호출 시 PreToolUse hook이 차단 + 5단계 누락 메시지 출력. 본인 우회 불가.

PR 제목 형식: `[브랜치명] 커밋 메시지 요약`
- 예: `[SAFETYPRD-1857] feat: AMR 영역 추가 다이얼로그 드로잉 기능 구현`

Base 브랜치: **`dev`**

### 7단계 — PD 비동기 공유 (Vercel 미사용)

**현재 정책 (2026-06-08)**: Vercel preview URL 사용 안 함 (이정남님 개인 계정).

대안 공유 수단:
- Showcase PNG 캡쳐 첨부 (본인이 로컬 Vite + Playwright로 캡쳐)
- Notion/Confluence 페이지 임베드
- 직접 화면 공유 (Teams 미팅)

산출 메시지 초안:

```markdown
@<PD 이름> 님 SAFETYPRD-xxxx <페이지/위젯> 작업 공유드립니다.

이번 PR은 ... 1차 Foundation입니다.
실측 정합도 — 시각 ≈ XX%.
<범위 외 항목>은 SAFETYPRD-aaa/bbb로 분리해서 후속 진행할 예정입니다.

PR: <azure-devops-pr-url>
구현 결과 캡쳐: <첨부 또는 Notion 링크>

시안 정합 면에서 짚어주실 부분 있으시면 코멘트 부탁드립니다.
편하실 때 보시고 회신 주셔도 괜찮습니다.
```

## 메모리 자동 갱신

다음 메모리 자동 업데이트:
- 새 페이지/위젯 정보 → 본인 메모리에 component-specific 메모리 신설 (예: `safety_cameramap_v1_decisions.md`)
- visual-verify 실측 점수 → 자기평가 편향 누적 (`_self_evaluation_log.json`)
- 작업 사이클 회고

메모리 commit + push (servantcdh 개인 깃).

## 사람 개입 최저 — 사용자 확인 시점

자동 진행하되 다음 1회 확인:
- PR 본문 초안 검토 (최종 push 전)
- PD 공유 메시지 초안 검토
- Phase 2 SAFETYPRD 티켓 분리 확인

## 사용자 추가 입력 허용 시점

- visual-verify 점수가 낮아 머지 보류 권고 시
- 신규 라우트가 기존과 conflict 시
- 신규 서비스 패키지 신설 여부

## 관련 skills

- 전체 파이프라인: `saige-product-session-start` → `figma-handoff-scanner` → `saige-product-figma-to-emotion` → `saige-product-qa` → `saige-product-visual-verify` → `saige-premerge-review` → **`saige-product-handoff` (현재)**
- DS 대응: [[saige-ds-handoff]]

## 참조

- safety-frontend CLAUDE.md PR 규칙 (line 285-311)
- [[release-main-ownership]] / [[fe-pr-review-process]]
- Azure DevOps: https://dev.azure.com/SaigeResearch/SaigeSafety/_git/saige-safety-frontend

## 변경 이력

- v0.1 (2026-06-08): Product 트랙 일반화 + Vercel preview 미사용 정책 반영.
- v0.2 (2026-06-09): 0단계(위반 메모리 사전 read + 할루시네이션 금지) 추가, 6단계 PR 생성을 `saige-pr-create` 6단계 워크플로우로 위임. 사용자 시각 승인 단계 명시 강조. SDS-217 폐기 사후학습.
