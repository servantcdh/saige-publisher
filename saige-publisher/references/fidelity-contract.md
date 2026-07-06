# 충실도 계약 (Fidelity Contract) — 구현 전 필수 산출물

> **언제 읽나**: Phase 2(convert) 진입 직전. 시안 또는 데모/기존 소스가 있는 **모든** 퍼블리싱.
> **왜 있나**: 아래 3대 실패가 반복 관찰됨. 이 계약은 실패 3종을 사전에 봉쇄하는 유일한 장치다.
> **핵심 원리**: **시안은 계약이다.** 코드가 계약과 어긋나면 코드가 틀린 것이다. 유사하게 만드는 게 아니라 구조·값·의도를 보존한다. 먼저 맞추고(match), 그 다음 차이를 보고(report), 그 다음에만 개선(improve).
> **이 작업은 일반 React 구현이 아니라 퍼블리싱 복제다.** 목표 4종: ① **Pixel-perfect** ② **Token-perfect** ③ **Component-faithful** ④ **Runtime-aware**.

---

## 반복된 3대 실패 (이 문서의 존재 이유)

| # | 실패 | 증상 | 이 문서의 방어선 |
|---|---|---|---|
| **F1** | **디테일 드리프트** | border·radius·margin·padding·gap·shadow를 근사값/누락으로 처리. `4px`를 `rounded-md`로, `13px`를 `text-sm`으로 뭉갬 | **§2 값 발명 금지** + Style Manifest + Token Manifest (모든 fidelity-sensitive 값에 행 1개) |
| **F2** | **레이어 팝업 붕괴** | 모달/드롭다운/툴팁 내부 레이아웃이 통째로 틀어짐. static markup으로 대충 구현, portal·positioning·z-index 무시 | **§3 런타임 레이어** + Runtime State Contract + Layer Stack + Positioning Manifest |
| **F3** | **DOM 계층 변형** | 래퍼를 flatten/merge/remove/split/reorder/rename. "시각적으로 같으니 됐다"며 구조를 임의 변경 | **§1 DOM 계층 보존** + DOM Contract (노드별 보존 여부 명시) |

**셋의 공통 원인**: 코드를 먼저 짜고 눈으로 맞춘다. **해법은 하나** — 코드 전에 계약을 문서화하고, 코드가 계약을 따르게 한다. 게슈탈트("맞아 보임")로 done 금지.

---

## 실행 지시문 (Phase 2 convert 착수 시 그대로 채택)

> 이 절이 런타임에 채택되는 **명령 척추**다. 아래 각 절은 그 템플릿·근거·합리화 차단표.

**목표 4종**: ① Pixel-perfect(시각·간격·border·radius 정확) ② Token-perfect(확인된 토큰, semantic 우선) ③ Component-faithful(사내 DS/DS 컴포넌트 충실) ④ Runtime-aware(레이어·상태·인터랙션 보존).

**바로 코드 금지.** 먼저 순서대로 작성(템플릿은 아래 각 절):

`1 Source Interpretation → 2 Component Mapping → 3 DOM Contract → 4 Token Manifest → 5 Style Manifest → 6 Runtime State Contract(런타임 UI 시) → 7 Layer Stack Manifest(레이어 시) → 8 Positioning Manifest(드롭다운/팝오버/툴팁 시) → 9 Implementation Plan`

**구현 규칙**:

- 원본 DOM 계층을 **보존**하라. wrapper를 제거·병합·순서 변경·rename 하지 마라. *(F3)*
- 리팩터링·단순화·컴포넌트 추출은 원본 재현이 끝난 뒤에만.
- 사내 DS 컴포넌트가 있으면 raw HTML로 대체하지 마라.
- **DS 컴포넌트를 재사용하면 그 내부 resolved 스타일(brand color·radius·height·padding·shadow·z-index·animation)을 데모와 diff하라.** 데모값과 다르면 (a) prop/override로 데모에 맞추거나, (b) DS 아이덴티티가 이겨야 하면 **그 충돌을 Design System Compliance Report에 `데모 X vs DS Y — 무엇이 이기나 + 근거`로 명시**하라. 조용히 DS 기본값을 렌더하지 마라. **실제로 렌더되는 값이 전부다** — 정확값을 import 안 되는 dead styled export나 매니페스트에만 적고 화면엔 DS 기본이 나오게 두지 마라. *(F1/F2 — 실측 2회 재현: 메뉴 radius 8→4·z-index 40→100·anim 120→150ms, 그리고 primary `#175CD3`가 DS Button brand `#DF2D58`로 대체돼 실렌더 누락)*
- 토큰명을 추측하지 마라. 확인된 토큰만. **semantic > primitive.** 단 **토큰은 resolved 값이 데모와 정확히 일치할 때만 raw를 대체** — 근사 토큰으로 정확 hex/px를 스왑 금지(예: `#E4E7EC`를 near neutral `#DEE2E7`로 바꾸지 마라). 불일치 시 raw + 주석. raw CSS는 최후 수단 + 이유 주석. *(F1)*
- **vanilla-extract(DS)/emotion(Product) 우선.** Tailwind 사용 시 `rounded-lg`·`p-4`·`gap-2`·`text-sm` 같은 근사 유틸 금지 → `rounded-[12px]`·`px-[20px]`·`gap-[6px]`처럼 정확값. *(F1)*
- 레이어 팝업·모달·드롭다운·토스트·툴팁은 정적 마크업이 아니라 **런타임 UI**로 다뤄라. *(F2)*
- portal 기반 UI를 inline DOM으로, inline UI를 임의로 portal로 바꾸지 마라. *(F2)*
- z-index를 `9999`·`10000`·`z-50`처럼 임의로 넣지 마라 → 기존 스케일/토큰. *(F2)*
- outside click · ESC close · focus trap · return focus · scroll lock · enter/exit animation을 누락하지 마라. *(F2)*
- 불확실한 값이나 동작은 추정 구현하지 말고 **`unconfirmed`로 남겨라.**

**완료 후 반드시 출력** (템플릿은 §완료 후 출력 4종):

`1 Fidelity Checklist → 2 Design System Compliance Report → 3 Runtime Difference Report(런타임 UI 시) → 4 Difference Report`

**완성 여부를 섣불리 선언하지 마라.** 남은 차이나 불확실성이 있으면 명확히 보고하라.

---

## 진실 원천 우선순위 (SAIGE)

가장 신뢰 가능한 소스부터:

1. **브라우저 렌더 결과** — Storybook iframe(DS) / Vite dev server(Product). 라이브가 있으면 이게 진실.
2. **computed style** — 브라우저에서 실측한 계산값 (raw CSS보다 우선)
3. **기존 소스 코드**
4. **Figma MCP** — `get_variable_defs`(토큰) → `get_metadata`(구조) → `get_screenshot`(시각). variant props 포함.
5. **사내 DS 문서 / 토큰 정의**
6. **스크린샷**
7. **시각 추정** — 최후. 반드시 주석 표기.

라이브/소스가 있으면 **브라우저 렌더 결과가 유일 진실**. 스크린샷만 있으면 추정값을 **명시적으로 표기**한다.

---

## 철칙 3

### §1. DOM 계층 보존 → **DOM Contract** (F3 방어)

시안의 DOM 계층(또는 시각 레이어 계층)을 최대한 보존한다. flatten·merge·remove·split·reorder·rename **금지** — 명시적으로 요구되지 않는 한.

**시각 유사성만으로는 부족하다. 구조 충실도가 필수다.**

구현 전 DOM Contract를 표로 작성한다:

| 노드 | 시맨틱 역할 | 래퍼 목적 | 레이아웃 책임 | 스타일 책임 | 상호작용 책임 | **보존 필수?** |
|---|---|---|---|---|---|---|
| `<article>` | 카드 루트 | — | flex column | surface bg + radius | — | ✅ |
| `<div>` | 헤더 래퍼 | 패딩 경계 | padding | — | — | ✅ |
| `<Button>` | 액션 | — | — | DS variant | onClick | ✅ |

DOM Contract 없이 구현 착수 금지.

**막을 합리화 (F3 재발 방지)**:

| 변명 | 현실 |
|---|---|
| "div 하나 줄여도 렌더 결과 같다" | 지금은 같아도 다음 상태/반응형에서 깨진다. 보존. |
| "래퍼가 의미 없어 보인다" | 의미를 모르는 것이지 없는 게 아니다. 목적을 DOM Contract에 적어보고 판단. |
| "더 깔끔한 JSX로" | 깔끔함은 match 이후. 먼저 구조를 복제. |
| "시맨틱하게 바꿔주는 게 낫다" | 시안이 계약. 개선은 Difference Report에 제안하고 승인 후. |

### §2. 값 발명 금지 (F1 방어)

다음 값에 **임의값·근사값 금지**:

`margin · padding · gap · width · height · border(폭/스타일/색) · border-radius · color · background · box-shadow · opacity · font-size · font-weight · line-height · letter-spacing · z-index · animation duration · easing · breakpoint`

추출값 · 기존 토큰 · 검증된 컴포넌트 prop만 사용. 확인 불가 시 **정확한 raw 값 + 주석**:

```
/* estimated from screenshot */
/* token not confirmed */
/* raw value: no matching token found */
```

조용히 기본값으로 대체 **절대 금지**: `p-4`, `gap-2`, `rounded-lg`, `text-sm`, `border-gray-200`, `z-50`, `9999`.

**막을 합리화 (F1 재발 방지)**:

| 변명 | 현실 |
|---|---|
| "대충 이 정도면 비슷하다" | 4px vs 6px는 눈에 띈다. 실측하거나 추정 주석. |
| "가까운 프리셋이 있다" | 프리셋이 시안값과 다르면 arbitrary value 쓴다. |
| "토큰이 있을 것 같다" | 추측 금지. 토큰 소스에서 확인되면만 사용. |

### §3. 런타임 레이어 = 상태 UI (F2 방어)

modal · dialog · layer popup · popover · dropdown · tooltip · toast · drawer · bottom sheet · context menu · command palette · date picker · select menu 는 **상태 기반 런타임 UI**다.

시안이 명시적으로 inline 렌더하지 않는 한 **static inline markup 금지**. portal 레이어를 inline DOM으로 옮기지 말고, inline 레이어를 portal로 바꾸지도 말 것(DS/소스가 요구하지 않는 한).

레이어가 있으면 **Runtime State Contract + Layer Stack Manifest + Positioning Manifest 3종 필수** (아래 템플릿).

---

## 필수 산출물 순서 (F 매핑)

코드로 직행 금지. 실행 지시문의 순서에 F 방어선을 붙이면:

| # | 산출물 | 조건 | 방어 |
|---|---|---|---|
| 1 | Source Interpretation | 항상 | — |
| 2 | Component Mapping | 항상 | Component-faithful |
| 3 | **DOM Contract** | 항상 | **F3** |
| 4 | **Token Manifest** | 항상 | **F1** |
| 5 | **Style Manifest** | 항상 | **F1** |
| 6 | Runtime State Contract | 런타임 UI 시 | **F2** |
| 7 | Layer Stack Manifest | 오버레이 시 | **F2** |
| 8 | Positioning Manifest | 드롭다운/팝오버/툴팁 시 | **F2** |
| 9 | Implementation Plan | 항상 | — |
| → | **구현** | | |
| 10 | Fidelity Checklist | 항상 | — |
| 11 | Design System Compliance Report | 항상 | Component-faithful |
| 12 | Runtime Difference Report | 런타임 UI 시 | F2 |
| 13 | Difference Report | 항상 | — |

---

## Component Mapping (SAIGE)

시안을 **먼저 기존 컴포넌트에 매핑**한 뒤 코드를 짠다. 구현 우선순위:

1. 기존 사내 DS 컴포넌트 (`@saige-ai/design-system`) / DS 컴포넌트
2. 기존 컴포넌트 variant·prop
3. 기존 semantic 토큰
4. 기존 component 토큰
5. 기존 primitive 토큰
6. raw CSS 값 (최후, 주석 필수)

기존 컴포넌트를 raw `div`/`button`/`input`으로 재구현 금지 — 매칭 컴포넌트가 없을 때만. 컴포넌트가 시안과 안 맞으면 **조용히 override하지 말고 mismatch를 Difference Report에 보고**.

**재사용 델타 diff (필수)**: 매핑한 DS 컴포넌트는 내부 resolved 스타일(radius·padding·shadow·z-index·animation)이 데모와 **다를 수 있다**. 매핑 즉시 데모값과 diff하고, 델타는 (a) prop/override로 보정 또는 (b) 보정 불가 시 Design System Compliance Report에 명시. 재사용이 내부 값을 조용히 이기게 두지 마라 — 실측에서 이게 F1/F2의 최대 은닉 경로였다.

매핑 표: `시안 파트 / 매칭 컴포넌트 / variant / size / state / slots / props / 미지원 차이 / raw 허용 여부`

---

## 매니페스트 템플릿

### Token Manifest (F1)

목표는 pixel-perfect가 아니라 **token-perfect**. semantic 토큰 > primitive 토큰.

| 디자인 속성 | 시안값 | 토큰명 | 카테고리 | 해석된 CSS | 확신도 | 폴백 | 비고 |
|---|---|---|---|---|---|---|---|
| surface bg | #FFFFFF | `vars.color.bg.surface` | semantic | #FFFFFF | high | — | — |
| radius | 12px | `radius.lg` | radius | 12px | med | `12px` | 토큰 미확인 시 raw |

- 카테고리: primitive / semantic / component / typography / spacing / radius / shadow / z-index / motion
- **토큰명 추측 금지.** 프로젝트 토큰 소스에 존재하는 것만.
- 확인 불가 → raw 값 + 사유 주석.
- primitive(`gray.900`, `blue.500`)보다 semantic(`color.text.primary`, `color.bg.surface`) 우선.

### Style Manifest (F1)

**모든 fidelity-sensitive 값에 행 1개.** 누락 = 보이는 갭(gap)이지 조용한 근사가 아니다.

| 속성 | 값 |
|---|---|
| 레이아웃 모델 / display | flex / grid / block |
| positioning | static / relative / absolute / fixed / sticky |
| width · height / min · max | |
| padding · margin · gap | |
| border 폭 · 스타일 · 색 | |
| border-radius | |
| background · shadow | |
| typography (size/weight/line-height/letter-spacing) | |
| text color / icon · button · input size | |
| align / overflow | |
| responsive / hover · focus · active · disabled | |

### vanilla-extract 규칙 (DS 트랙)

- 근사 raw px 남발 금지. `vars.*` 토큰 우선, 없으면 raw + 주석.
- 매핑 상세는 [[saige-ds-figma-to-vex]] (Tailwind 패턴 → SAIGE vars/spacing/radius/fontFamily). raw value는 경고.

```ts
// Bad — 근사·조용한 대체
padding: '16px 20px'
// Good — 검증된 토큰
padding: `${spacing.md} ${spacing.lg}`
// 토큰 미확인 — raw + 주석
borderRadius: '12px' /* raw value: no matching radius token */
```

### emotion 규칙 (Product 트랙)

- **사내 DS 컴포넌트 우선.** 없는 것만 `styled()`로 직접.
- **MUI 신설 import 금지** (마이그레이션 예정). 상세 [[saige-product-figma-to-emotion]].

### Runtime State Contract (F2, 레이어 있을 때)

- trigger element / opening · closing condition / initial state
- controlled or uncontrolled / render target / **portal 사용 여부**
- mount · unmount behavior / backdrop / **scroll lock** / **focus trap** / **return focus**
- keyboard interaction / outside click / **z-index layer** / **animation (enter·exit)** / responsive

render target 불명 시 **unconfirmed로 표기**. portal 레이어를 inline으로 옮기지 말 것.

### Layer Stack Manifest (F2, 오버레이 있을 때)

- backdrop / dialog / popup / tooltip / toast z-index
- header·sidebar 스택 관계 / 중첩 레이어 / clipping·overflow 위험 / scroll container 상호작용

`9999`·`10000`·`z-50` 같은 임의값 금지 — 기존 z-index 스케일/토큰만. **z-index 토큰 발명 금지.**

### Positioning Manifest (F2, anchored/floating 있을 때)

- positioning model / anchor / placement / alignment / offset
- collision behavior / boundary / viewport / transform-origin / scroll / responsive

anchor 기반 위치를 static margin으로 근사 **금지**. floating 라이브러리/DS popover 메커니즘을 쓰면 그 동작을 보존.

---

## 완료 후 출력 4종

**완성 여부 섣불리 선언 금지.** 남은 차이·불확실성은 반드시 명시.

> **리포트는 실제로 작성된 코드가 하는 일을 적는다** — 의도·이상형·계획이 아니라. 자칭 리포트는 Phase 4 `visual-verify` 실측 전까지 신뢰 금지(실측에서 조작·과대보고가 드러난다 — 실측 사례: 안 한 작업을 했다고 서술한 리포트가 온디스크 대조로 적발됨).

### 1. Fidelity Checklist

각 항목 0–5점. **4 미만이면 수정 계획 필수.**

DOM 계층 · 컴포넌트 충실도 · 토큰 충실도 · 간격 정확도 · border 정확도 · radius 정확도 · 타이포 정확도 · 색 정확도 · 레이아웃 정확도 · 런타임 동작 · 인터랙션 상태 · 접근성 · 반응형.

> 이 checklist는 **자칭**이므로 Phase 4 `visual-verify` **실측**으로 교차검증된다. 자칭 > 실측 갭(+10%p↑)이면 premerge 게이트가 경고.

### 2. Design System Compliance Report

- **사용한 컴포넌트**: 사내 DS/DS 컴포넌트 목록 (variant / size / state)
- **raw HTML fallback**: 사용처 + 사유(매칭 컴포넌트 부재 증명). 근거 없는 raw는 위반.
- **DS 컴포넌트 내부 델타**: 재사용 컴포넌트의 resolved brand color/radius/height/padding/shadow/z-index/animation vs 데모값 — `일치` / `override로 보정` / `충돌(데모 X vs DS Y, 승자+근거)` / `미해결(Difference Report 연동)`. **실렌더 기준으로 확인**(매니페스트·dead export가 아니라 화면에 실제 나오는 값). 재사용의 은닉 델타를 여기서 강제 노출.
- **override / mismatch**: 시안과 컴포넌트가 어긋난 지점 + 조치(조용한 override 금지 → 보고/승인)
- **금지 위반 여부**: Product=MUI 신설 import 없음 / DS=vanilla-extract 외 raw 스타일 없음

### 3. Runtime Difference Report *(런타임 UI 있을 때만)*

각 인터랙션을 `confirmed` / `unconfirmed` / `미구현`으로:

- outside click close · ESC close · focus trap · return focus · scroll lock
- enter animation · exit animation · portal render target · z-index layer

`unconfirmed`는 추정 구현 대신 그대로 남긴 항목 — 완료 아님.

### 4. Difference Report

보이는/동작상 차이가 남아 있으면 완료 주장 금지. 각 항목:

- **Area**:
- **Expected**:
- **Current**:
- **Cause**:
- **Fix**:
- **Status**:

---

## 6게이트 하네스와의 관계 (구현 전 ↔ 구현 후)

이 계약은 Phase 4 visual-verify 6게이트의 **구현 전 짝**이다. 사전 계약이 사후 실측을 통과시킨다.

| 6게이트 (구현 후 실측) | 이 계약 (구현 전) | 방어 실패 |
|---|---|---|
| 진실 원천 | 진실 원천 우선순위 | — |
| 계층 전수 diff | DOM Contract | F3 |
| 상태 매트릭스 | Runtime State Contract | F2 |
| 메커니즘 충실도 | Positioning / Runtime State Contract | F2 |
| 토큰 해석 | Token Manifest | F1 |
| 완전성 비평 | Style Manifest 커버리지 + Difference Report | F1 |

---

## Red Flags — STOP

- DOM Contract 없이 코드 착수 → F3
- border/radius/margin을 근사 프리셋(`rounded-lg`, `p-4`, `text-sm`)으로 → F1
- 레이어 팝업을 static inline markup으로 → F2
- z-index에 `9999`/`z-50` → F2
- 토큰명·variant 추측 → F1
- **DS 컴포넌트 기본 스타일(brand color/radius/anim)이 데모와 다른데 그대로 렌더 → F1/F2 은닉**
- **정확값을 매니페스트나 import 안 되는 styled export에만 적고 실렌더는 DS 기본**
- **리포트가 실제 코드가 아닌 "의도한 작업"을 서술** → Phase 4 실측 전까지 신뢰 금지
- "시각적으로 같으니 됐다" → 세 실패 전부의 신호

**하나라도 걸리면: 코드 멈추고 해당 매니페스트부터 작성.**
