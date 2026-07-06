---
name: saige-publisher
description: SAIGE 통합 AI 퍼블리셔 단일 진입점. Figma 핸드오프(시안/URL/선택 프레임)를 받아 ① DS 컴포넌트인지 ② safety-frontend 제품 페이지/기능인지 자동 판별(라우팅)하고, 해당 트랙의 전체 파이프라인(session-start → scan → convert → qa → visual-verify → premerge-review → handoff)을 끝까지 오케스트레이션한다. "이 시안 퍼블리싱해줘" / "Figma 받아서 구현해줘"처럼 트랙이 명시되지 않은 포괄 요청의 진입점. 트랙이 명확히 하나면(예: "DS Button 컴포넌트") 해당 트랙 skill을 직접 써도 되지만, 모호하거나 끝까지 자동 진행을 원하면 이 skill을 쓴다.
---

# saige-publisher

DS 트랙(7) + Product 트랙(7) + 공통(figma-handoff-scanner / saige-pr-create / premerge-review) **= 15 skills 위에 올라가는 라우터·오케스트레이터.** 팀에 퍼블리셔가 부재한 상황에서 본인이 그 역할을 자율화하는 최상위 진입점.

이 skill은 **새 로직을 거의 갖지 않는다.** 책임은 두 가지뿐:
1. **라우팅** — 핸드오프를 보고 어느 트랙·서브모드로 갈지 결정 (Phase 0)
2. **오케스트레이션** — 결정된 트랙의 하위 skill들을 순서대로 호출하고, 산출물을 다음 단계 입력으로 흘려보냄 (Phase 1–6)

## 핵심 디자인 원칙

| 원칙 | 적용 |
|---|---|
| **사람 개입 최저** | 자동 라우팅 → 자동 파이프라인. 사람 개입은 (a) 라우팅 모호 시 1회 질문 (b) PR 직전 시각 승인 (c) PD 공유 메시지 최종 검토 — 이 3곳뿐 |
| **할루시네이션 금지 (★ 최우선)** | 시안이 없거나 부족하면 추정으로 진행 X. 즉시 솔직 보고 + 대기. 라우팅 신호가 약하면 추정 X, 질문 |
| **충실도 우선 (match 먼저)** | 코드 전 계약 문서화(DOM/Token/Style + 레이어 시 Runtime/Layer/Positioning). border/radius/margin 근사·값 발명·DOM flatten 금지. 먼저 match → report → improve. 상세 [references/fidelity-contract.md](references/fidelity-contract.md) |
| **객관 측정** | 본인 자칭 X. visual-verify 실측 + self-eval 자동 append([[saige-ds-visual-verify]] 7단계) |
| **게이트 우회 불가** | visual-verify / premerge-review / saige-pr-create hook 토큰 — 셋 다 통과해야 PR. 본인 우회 X |
| **트랙 책임 분리** | publisher는 지휘만. 변환/검증 로직은 각 트랙 skill 소유. 중복 구현 X |

---

## Phase 0 — 라우팅 (이 skill의 본체)

핸드오프를 받으면 **먼저 트랙을 판별**한다. session-start가 트랙별로 갈리므로 라우팅이 가장 앞에 온다.

### 0-a. 입력 완전성 체크 (할루시네이션 게이트)

진행 전 반드시 확인. 하나라도 "부족"이면 **추정하지 말고 사용자에게 솔직 보고 후 대기**:

- [ ] Figma 시안 노드(프레임/컴포넌트셋)가 실제로 지정되었는가? (URL/node-id/선택)
- [ ] 시안이 구현에 필요한 상태/변형을 담고 있는가? (빈 프레임/placeholder 아님)
- [ ] 페이지/기능이면: 어느 라우트/위치에 붙는지 단서가 있는가?

부족 시 표준 멘트: *"시안의 X 부분이 비어 있어 추정으로 진행하면 할루시네이션이 됩니다. 해당 시안/명세를 받을 때까지 대기하겠습니다."* (위반 패턴 [[feedback-workflow-violations]] 재발 방지)

### 0-b. 트랙 판별 — 신호 테이블

`mcp__figma__get_metadata`(가벼운 메타 조회) + 사용자 표현으로 신호 수집:

| 신호 | → **DS 트랙** | → **Product 트랙** |
|---|---|---|
| Figma 노드 타입 | Component / Component Set (variant props 보유) | Frame/Section (전체 화면, 다중 섹션, GNB·LNB 포함) |
| 재사용 범위 | 범용 재사용 컴포넌트 (Button, Input, Tag, Cell) | 특정 라우트 화면/위젯 |
| 사용자 표현 | "컴포넌트", "DS", "디자인시스템", 컴포넌트명 단독 | "페이지", "화면", "라우트", 경로(`/...`), "~화면에 추가" |
| 산출 리포 | `design-system` (GitHub, base `develop`) | `safety-frontend` (Azure DevOps, base `dev`) |
| 산출 형태 | 4파일 보일러플레이트(`.tsx`/`.css.ts`/`.stories.tsx`/`index.ts`) | 페이지 scaffold 또는 기능 patch (emotion + 사내 DS) |
| 검증 환경 | Storybook iframe (컴포넌트 단위) | Vite dev server (페이지) / Storybook (위젯) |

### 0-c. Product 서브모드 분기

Product로 판별되면 **신설 vs 기존 추가**를 한 번 더 가른다:

| 신호 | → **scaffold (신설)** | → **feature-patch (기존 추가)** |
|---|---|---|
| 대상 라우트 | 신규 라우트 (미존재) | 기존 라우트/페이지 존재 |
| 사용자 표현 | "새 페이지", "신설", "만들어줘" | "이미 있는 X에 ~ 추가", "기존 화면 수정", "버튼/필터 추가" |
| skill | `saige-product-page-scaffold` | `saige-product-feature-patch` |

> feature-patch는 **enum/Record/Map 추가 시 모든 reference fan-out patch**가 핵심 책임([[workatheight-poc-learning]]). 누락 시 typecheck fail.

### 0-d. 판별 확신도 → 행동

- **확신 (신호 다수 일치)** → 자동 진행. 사용자에게 "DS 트랙으로 라우팅합니다" 1줄 통보만 (질문 X)
- **모호 (신호 충돌/부족)** → `AskUserQuestion`으로 **딱 1회** 질문. 추정 진행 절대 금지. 이게 사람 개입 3곳 중 하나
- 라우팅 결정은 로그로 남겨 사후 추적 (어느 신호로 어디로 갔는지)

---

## Phase 1–6 — 트랙 파이프라인 오케스트레이션

라우팅 후, 결정된 트랙의 skill을 순서대로 호출. **각 단계 산출물이 다음 단계 입력**이 된다.

### 통합 파이프라인 (트랙별 매핑)

| 단계 | 공통 의미 | **DS 트랙** | **Product 트랙** |
|---|---|---|---|
| 0 | 컨텍스트 정렬 | `saige-ds-session-start` | `saige-product-session-start` |
| 1 | 시안 풀세트 발견 | `figma-handoff-scanner` (공통) → `variantMatrix.json` | `figma-handoff-scanner` (공통) |
| 2 | 코드 생성 | `saige-ds-figma-to-vex` | scaffold: `saige-product-page-scaffold` / patch: `saige-product-feature-patch` → 변환은 `saige-product-figma-to-emotion` |
| 3 | 정적 검증 | `saige-ds-qa` | `saige-product-qa` |
| 4 | 시각 정합 실측 + self-eval | `saige-ds-visual-verify` | `saige-product-visual-verify` |
| 5 | 머지 권고 (PD 관점) | `saige-premerge-review` | `saige-premerge-review` (공유) |
| 6 | PR 생성 + 문서 + PD 공유 | `saige-ds-handoff` | `saige-product-handoff` |

### Phase 2 진입 전 필수 — 충실도 계약 (F1/F2/F3 방어)

시안/데모 소스가 있으면 **일반 React 구현이 아니라 퍼블리싱 복제**로 다룬다. convert 착수 시 [references/fidelity-contract.md](references/fidelity-contract.md)의 **실행 지시문을 그대로 채택**하라. 목표 4종: ① **Pixel-perfect** ② **Token-perfect** ③ **Component-faithful** ④ **Runtime-aware**.

**바로 코드 금지.** 먼저 순서대로 작성:
`1 Source Interpretation → 2 Component Mapping → 3 DOM Contract → 4 Token Manifest → 5 Style Manifest → 6 Runtime State Contract(런타임 시) → 7 Layer Stack(레이어 시) → 8 Positioning(드롭다운/팝오버/툴팁 시) → 9 Implementation Plan`

이 산출물이 반복된 3대 실패를 사전 봉쇄한다:

| | 실패 | 방어 산출물 (구현 전) |
|---|---|---|
| **F1** | border·radius·margin·padding·gap 디테일 드리프트 | Token Manifest + Style Manifest (모든 fidelity-sensitive 값에 행 1개, 근사 프리셋 금지, 토큰명 추측 금지, 토큰은 resolved 값 정확 일치 시만 raw 대체, **DS 컴포넌트 재사용 시 내부 resolved 델타 diff·보고**) |
| **F2** | 레이어 팝업 내부 레이아웃 붕괴 | Runtime State Contract + Layer Stack + Positioning Manifest (static markup·임의 z-index 금지, outside click·ESC·focus trap·return focus·scroll lock·enter/exit anim 누락 금지) |
| **F3** | DOM 계층 변형(flatten/merge/reorder/rename) | DOM Contract (노드별 보존 여부 명시) |

**완료 후 출력**: `1 Fidelity Checklist → 2 Design System Compliance Report → 3 Runtime Difference Report(런타임 시) → 4 Difference Report`. 불확실한 값/동작은 추정 금지 → `unconfirmed`. 완성 섣불리 선언 금지.

> **먼저 match, 그다음 report, 그다음에만 improve.** 계약이 사후 6게이트 하네스(Phase 4)의 구현 전 짝이다 — 사전 계약이 사후 실측을 통과시킨다. 매핑·템플릿·합리화 차단표는 계약 문서에.

### 단계 간 산출물 계약 (요약)

```
Phase 0 (route)  → { track, submode, figmaNodes }
  ↓
1 scanner        → variantMatrix.json  (cell별 propValues/nodeId/figmaImageUrl)
  ↓
1.5 계약(구현 전) → DOM Contract / Token·Style Manifest / (레이어 시)Runtime·Layer·Positioning
                   → references/fidelity-contract.md, 코드 전 필수 (F1/F2/F3 방어)
  ↓
2 convert        → 생성 파일 (DS 4파일 / Product 페이지·patch)
  ↓
3 qa             → 검증 리포트 (실패 항목만 명시, 자동 수정 제안)
  ↓
4 visual-verify  → /tmp/visual-verify-poc/<TICKET>-fidelity-score.json
                   → (자동) append-self-eval.mjs 호출 → biasLog 누적
  ↓
5 premerge       → 머지 권고 보고서 (시안 정합 매트릭스 / PD 예상질문 5)
  ↓
6 handoff        → saige-pr-create 게이트 통과 → PR + 문서 갱신 + PD 공유 초안
```

### 게이트 (Phase 4–6, 우회 불가)

1. **visual-verify 게이트** — 픽셀 점수 평균 ≥ 90% AND 모든 cell ≥ 80% **AND 6게이트 하네스 통과**(진실원천·계층 전수 diff·상태 매트릭스·메커니즘 충실도·토큰 해석·완전성 비평 — [[saige-product-visual-verify]] v0.5). **`avgScore`만으로 통과 금지, 게슈탈트("맞아 보임") done 금지** — 커버리지 회계("요소 N중 M확인, 미확인 X") 없으면 미통과. 미달 시 LLM 패치 loop. self-eval append는 본인 판단 없이 자동. 근거: 홈대시보드 데모가 픽셀 점수는 통과했는데 상태·인터랙션·토큰 갭 10라운드([[feedback-publisher-fidelity-retro]]).
2. **premerge 게이트** — 시안 정합 실측 vs 자칭 갭 체크. 과대 평가(+10%p↑)면 경고.
3. **saige-pr-create 게이트** — Figma 캡쳐 + 구현 캡쳐 + **사용자 시각 승인** → 토큰 발급 → `gh`/`az pr create`. PreToolUse hook(`~/.claude/hooks/pre-pr-create-check.sh`)이 토큰 없으면 차단. **본인 우회 X** ([[feedback-workflow-violations]]).

---

## 사람 개입 지점 (딱 3곳)

| # | 시점 | 무엇을 |
|---|---|---|
| 1 | Phase 0 라우팅 **모호 시에만** | DS/Product 또는 scaffold/patch 1회 선택 |
| 2 | Phase 6 PR 직전 | 시안 ↔ 구현 캡쳐 2장 보고 시각 승인 (saige-pr-create) |
| 3 | Phase 6 직후 | PD 비동기 공유 메시지 최종 검토 |

그 외 전 구간은 자동. 단 **어느 단계든 시안/명세 부족이 드러나면 즉시 중단 + 솔직 보고**(할루시네이션 금지가 자동 진행보다 우선).

---

## 중단·실패 처리

- **시안 부족** → 중단, 사용자에게 무엇이 부족한지 구체 보고, 명세/시안 대기
- **BE 의존성 미완** (API 미확정 등) → 해당 부분 명시 + 대기 결정을 사용자에게 (추정 mock 진행 X)
- **visual-verify 게이트 미달 + 패치 loop 소진** → 자동 롤백 + 실패 cell 보고
- **qa 실패** → 자동 수정 가능 항목은 패치 제안, 불가 항목은 명시

---

## 트랙 정책 차이 (오케스트레이션 시 주입)

| 항목 | DS | Product |
|---|---|---|
| Path alias | `@/tokens/*`, `@/components/*` | `@/*`, `@saige/*`, `@saige-ai/design-system` |
| 신규 UI 라이브러리 | vanilla-extract | **MUI 신설 금지** → 사내 DS 우선, 없으면 emotion `styled()` |
| PR 호스팅 / base | GitHub / `develop` | Azure DevOps / `dev` |
| 티켓 footer | (DS 규약) | `JIRA: <full SAFETYPRD url>` |
| Vercel preview | 미사용 (이정남님 개인 계정) | 미사용 (PNG/Notion/Teams 공유) |

---

## 적용 시점

- "이 Figma 시안 퍼블리싱해줘" — 트랙 미지정 포괄 요청
- "이 화면 구현해줘" / "이 컴포넌트 만들어줘" — 끝까지 자동 진행 원할 때
- 트랙이 본인에게도 한눈에 안 잡힐 때 (라우팅을 publisher에 위임)

**쓰지 않아도 되는 경우**: 트랙·단계가 명확하면 하위 skill 직접 호출이 더 가볍다 (예: "visual-verify만 돌려줘" → `saige-ds-visual-verify` 직접).

---

## 관련 skills

- 라우팅 입력: `figma-handoff-scanner` (공통)
- DS 트랙: [[saige-ds-session-start]] · `saige-ds-figma-to-vex` · `saige-ds-qa` · [[saige-ds-visual-verify]] · `saige-premerge-review` · `saige-ds-handoff`
- Product 트랙: `saige-product-session-start` · `saige-product-page-scaffold` · `saige-product-feature-patch` · `saige-product-figma-to-emotion` · `saige-product-qa` · `saige-product-visual-verify` · `saige-product-handoff`
- 공통 게이트: `saige-pr-create` (PR 강제 5단계 + hook)
- 구현 전 계약: [references/fidelity-contract.md](references/fidelity-contract.md) (DOM/Token/Style/Runtime/Layer/Positioning 매니페스트 — F1/F2/F3 방어)

## 관련 메모리

- [[saige-ds-skills-inventory]] — DS 트랙 7 skills 인벤토리
- [[saige-product-skills-inventory]] — Product 트랙 인벤토리 + 통합 publisher 구조(이 skill의 명세 출처)
- [[feedback-workflow-violations]] — 할루시네이션 금지 / 시각 승인 / 게이트 우회 금지
- [[cameramap-poc-learning]] · [[workatheight-poc-learning]] — 트랙별 첫 실증 사후학습

## 변경 이력

- v0.3.1 (2026-07-06): 실행 지시문 바인딩을 control-vs-treatment 마이크로테스트(각 5회, 블라인드 심판)로 실측 — 매니페스트 작성 0%→100%, F1 2.8→4.6, F3 flatten 20%→0%, faithful 20%→80%로 지시문 효과 확인. 유일 잔존 누수(**DS 재사용 컴포넌트의 내부 resolved 델타**: 메뉴 radius 8→4·z-index 40→100·anim 120→150ms가 재사용 뒤에 은닉, 근사 토큰이 정확 hex 스왑)를 닫는 규칙 추가 — "DS 재사용 시 내부 스타일 diff 필수" + "토큰은 resolved 정확 일치 시만 raw 대체" + Design System Compliance Report에 'DS 내부 델타' 행.
- v0.3 (2026-07-06): 구현 전 **충실도 계약**(references/fidelity-contract.md) 편입. react 스캐폴드 퍼블리싱의 3대 실패 — F1 디테일 드리프트(border/radius/margin 근사), F2 레이어 팝업 붕괴, F3 DOM 계층 변형 — 을 DOM/Token/Style/Runtime/Layer/Positioning 매니페스트로 사전 봉쇄. Phase 1.5로 배선(convert 직전 필수). 범용 fidelity 방법론을 SAIGE 스택(vanilla-extract/emotion/사내 DS)에 맞춰 재작성. 계약 문서에 **실행 지시문**(convert 착수 시 채택하는 명령 척추: 목표 4종 Pixel/Token/Component/Runtime-perfect + 산출물 9 + 완료 후 출력 4종[Fidelity Checklist / Design System Compliance Report / Runtime Difference Report / Difference Report] + `unconfirmed` 규칙) 추가.
- v0.2 (2026-07-01): visual-verify 게이트를 `avgScore` 단독 → **6게이트 하네스 통과 + 커버리지 회계** 병행으로 강화(게슈탈트 done 금지). 홈대시보드 데모 10라운드 회고 반영([[feedback-publisher-fidelity-retro]]).
- v0.1 (2026-06-09): 빈 디렉토리(6/8 생성)에 라우터·오케스트레이터 초안 작성. Phase 0 라우팅(트랙 판별 + Product 서브모드 + 할루시네이션 게이트) + Phase 1–6 통합 파이프라인 + 게이트 3종 + 사람 개입 3곳 정의. 15 skills 위 단일 진입점.
