---
name: saige-pr-create
description: SAIGE 모든 PR 생성(DS GitHub / Product Azure DevOps) 전 강제 워크플로우. Figma 시안 캡쳐 + Storybook/dev server 캡쳐 + 사용자 시각 승인 + 승인 토큰 생성까지 통합. 본인 우회 불가 (PreToolUse hook이 토큰 없으면 gh/az pr create 자동 차단). 2026-06-09 SDS-217 폐기 사후학습.
---

# saige-pr-create

PR 생성 전 본인 워크플로우 갭(시안 미정독 / 사용자 시각 승인 누락) 자동 방지. **본인 자율 우회 불가** — PreToolUse hook(`~/.claude/hooks/pre-pr-create-check.sh`)이 승인 토큰 없으면 `gh pr create` / `az repos pr create` 명령 자체 차단.

## Why (도입 동기)

- SDS-216 v1: 자칭 97% → 실측 65% (32%p 과대 평가, 폐기)
- 카메라맵 PoC: 인프라(권한 module) 누락, 시안 정합도 미측정
- **SDS-217: 시안 자체 미정독, PR 생성 후 사용자 정정 받음**

본인 메모리 규칙([[feedback-premerge-pd-review]])만으로는 본인 실행 시 누락 반복. 시스템 레벨 강제 필요.

## 강제 메커니즘

### A. PreToolUse hook (시스템 레벨)
- 위치: `~/.claude/hooks/pre-pr-create-check.sh`
- 매처: `Bash` 명령 중 `gh pr create` / `az repos pr create` 패턴
- 동작: 승인 토큰 파일 `/tmp/visual-verify-poc/.approved-<TICKET>` 부재 시 `exit 2` (차단)
- 본인 우회 불가 (Claude Code가 명령 실행 자체 거부)

### B. 강제 6단계 워크플로우 (이 skill)

PR 생성하려면 본인이 반드시 다음 6단계 순차 수행:

#### 0단계 — 위반 메모리 사전 read (의무)
**PR 사이클 시작 전 본인이 반드시**:
- [[feedback-workflow-violations]] 사전 read — 본인 누적 위반 패턴 환기
- 본인 신뢰도(현재 65/100) 인지
- 같은 패턴 반복 회피 의식

미수행 시 본인이 같은 패턴 위반 반복 가능성 ↑.

#### 1단계 — figma-handoff-scanner 자율 호출 + 시안 풀세트 발견 보고서
- JIRA 티켓 키 명시 (SDS-XXX 또는 SAFETYPRD-XXXX)
- **`figma-handoff-scanner` 자율 호출 강제** — 사용자 개입 X
- 시안 풀세트 자동 스캔:
  - Component Set 풀세트 매트릭스 (variant × state)
  - 본인이 작업할 frame node-id
  - **미정독 영역 자동 검출** (본인이 못 본 sub-component)
- 산출물: `/tmp/visual-verify-poc/<TICKET>-discovery.md`
  ```markdown
  # <TICKET> 시안 풀세트 발견 보고서

  ## 작업 대상 frame
  - Wide variant: 4441:132695

  ## 발견된 variant 매트릭스
  | Component | Variant | Node ID | 본인 정독 |
  |---|---|---|---|
  | Row Ellipsis | Default | 1569:20107 | ✅ |
  | Row Ellipsis | Hovered | ... | ❌ 미정독 |
  | Dropdown | Default | 1682:28891 | ✅ |

  ## 미정독 영역 (본인 결정)
  - Row Ellipsis Hovered/Active: 본인 자율 결정 또는 사용자 확인
  - Dropdown menu item 펼친 상태: 시안 명세 없음 → 사용자 확인 필요
  ```

🚨 **시안 부재 또는 명세 부족 시 본인 추정으로 작업 절대 금지** (할루시네이션 금지 룰, 2026-06-09 사용자 명시). 본인 처리:

1. **즉시 솔직 보고** — 사용자에게 "어떤 영역 시안/명세 부족" 정확 명시
2. **담당자 요청 항목 정리** — 사용자가 PD/BE/디자이너에게 요청할 항목 (시안 추가 / 명세 작성 / API 확정 등)
3. **본인 대기** — 명세 받기 전까지 작업 보류, 본인 추정 코드 작성 X
4. **TODO/추정 코멘트도 X** — 코드에 본인 임시 결정 남기지 않음

본인 자율 작업 가능 영역:
- ✅ DS 표준 컨벤션 명확한 영역 (예: 4파일 구조, Path alias)
- ✅ 시안에 명시된 시각 정합 영역
- ✅ typecheck/lint/knip 자동 패치

본인 사용자 확인 + 담당자 요청 필요 영역:
- ❌ 시안에 명시 안 된 인터랙션/동작/라벨/placement
- ❌ BE API 응답 구조 미확정 영역
- ❌ DS 표준 vs 시안 명세 충돌 영역

#### 2단계 — Figma 시안 캡쳐
- `mcp__figma__get_screenshot(nodeId)` 호출
- 저장: `/tmp/visual-verify-poc/<TICKET>-figma.png`
- 풀세트 매트릭스면 cell별 다수 파일
- 본인 정독 매트릭스 사용자에게 보여줌 (선택)

#### 3단계 — 본인 구현 작업 (★ 신규 명시)

discovery.md + Figma 캡쳐 기반 본인 실제 코드 작업:

- **자율 작업 가능 영역만** (1단계의 ✅ 영역) → 코드 patch / generate
- **본인 추정 영역 = 작업 X** (1단계의 ❌ 영역) → 1단계로 되돌아가 사용자에게 솔직 보고 + 담당자 명세 요청

작업 중 본인이 매 commit마다 시안 정합 자기검증:
- 시안 명세 정확 매핑 했는가
- DS 표준 vs 시안 충돌 영역에 본인이 임의 결정 했는가
- 본인 추정 코드 작성하지 않았는가 (할루시네이션 금지 룰)

검증: typecheck/lint/knip 통과 + 본인 [[ds-claude-md-ssot]] 또는 [[safety-frontend-claude-md-ssot]] 규약 준수.

#### 4단계 — 구현 결과 캡쳐 + visual-verify 자동 호출 (★ v0.3 통합)

본인 manual 캡쳐 X. **visual-verify skill 자동 호출 강제**:
- DS: `saige-ds-visual-verify` → 로컬 Storybook + Playwright 자동 캡쳐 + pixel diff
- Product: `saige-product-visual-verify` → 로컬 Vite + dev 계정 자동 로그인(env 주입) + Playwright 자동 캡쳐 + pixel diff
- 저장: `/tmp/visual-verify-poc/<TICKET>-storybook.png` (DS) 또는 `<TICKET>-actual.png` (Product)
- **산출물 (★ hook 검증)**: `/tmp/visual-verify-poc/<TICKET>-fidelity-score.json` (정량 점수 + 본인 자칭 vs 실측 갭)

본인 자동 호출 누락 시 = G19 위반 = hook 차단 + 본인 신뢰도 감점.

#### 5단계 — premerge-review 자동 호출 + 사용자 시각 승인 (★ v0.3 통합)

본인 자동 호출 — **saige-premerge-review (DS) 또는 동등 Product premerge** 실행:
- 시안 정합 매트릭스 (visual-verify 실측 점수 자동 반영)
- 시나리오 커버리지 / PD 예상 질문 5개 / 머지 권고
- 본인 자칭 vs 실측 편향 갭 보고
- 산출물: `/tmp/visual-verify-poc/<TICKET>-premerge-review.md`

본인이 사용자에게 보여줄 자료:
- Figma 시안 캡쳐 + 본인 구현 캡쳐 (4단계 visual-verify 산출)
- fidelity-score.json (정량) + premerge-review.md (정성)
- 본인 자칭 vs 실측 편향 갭 (할루시네이션 검출 신호)

**사용자 명시 승인 대기**: "승인", "OK", "approve", "진행해" 등
- 사용자가 수정 요청 시 본인 코드 패치 → 3단계로 되돌아감
- 사용자가 추가 시안 확인 요청 시 → 1단계로 되돌아감

#### 6단계 — 승인 토큰 생성 + PR 생성
- 사용자 승인 받은 직후:
  ```bash
  mkdir -p /tmp/visual-verify-poc
  touch /tmp/visual-verify-poc/.approved-<TICKET>
  ```
- 즉시 `gh pr create` 또는 `az repos pr create` 호출
- Hook이 토큰 + discovery.md + 캡쳐 4파일 검증 통과 + **모두 1회용 소비** (`rm`)
- PR 생성 완료

## 차단 시나리오 (hook 강화 후)

본인이 위 6단계 누락하고 `gh pr create` 직접 호출하면 hook이 4파일 검증 후 차단:

```
🚫 PR 생성 차단됨 (워크플로우 갭 강제 메커니즘)

티켓: SDS-217

누락 항목:
  - 시안 풀세트 발견 보고서: /tmp/visual-verify-poc/SDS-217-discovery.md
  - Figma 시안 캡쳐: /tmp/visual-verify-poc/SDS-217-figma.png
  - 구현 캡쳐: /tmp/visual-verify-poc/SDS-217-storybook.png 또는 -actual.png
  - 사용자 승인 토큰: /tmp/visual-verify-poc/.approved-SDS-217

본인 완료 단계:
  1. figma-handoff-scanner 자율 호출 → variant 풀세트 매트릭스 산출 → discovery.md 저장
  2. Figma 시안 캡쳐 (cell별)
  3. 본인 구현 작업 + 시안 정합 자기검증
  4. 본인 구현 캡쳐
  5. 사용자에게 시안 + 구현 보여주고 시각 승인 받음
  6. 사용자 명시 승인 후 토큰 생성

🚨 절대 금지: 시안 부재/부족 시 본인 추정 작업 = 할루시네이션. 사용자에게 즉시 솔직 보고.
```

본인 우회 시도 (예: `--no-hooks` / `chmod -x` / hook 파일 삭제) 사용자 명시 허락 없이 절대 금지 (메모리 규칙).

## 사용자가 변경할 수 있는 부분

- Hook 비활성화: `~/.claude/settings.json`의 `hooks.PreToolUse` 제거
- 승인 토큰 수동 생성으로 우회 (다만 본인은 사용자 승인 없이 토큰 생성 X)

## 관련 skills

- 보조: `figma-handoff-scanner` (1단계 시안 확인)
- 보조: `saige-ds-visual-verify` / `saige-product-visual-verify` (2-3단계 캡쳐)
- 후속: `saige-ds-handoff` / `saige-product-handoff` (PR 생성 + 후속 정리)
- 위반 누적: [[feedback-workflow-violations]] (C단계)

## 변경 이력

- v0.1 (2026-06-09): SDS-217 폐기 사후학습. PreToolUse hook + 5단계 워크플로우 + 토큰 1회용 소비 메커니즘.
- v0.2 (2026-06-09): 본인 정독 후 갱신. 0단계(위반 메모리 사전 read 의무) + 3단계(본인 구현 작업 명시) 추가, 5단계 → 6단계 확장. 차단 시나리오 텍스트 hook 강화 반영.
