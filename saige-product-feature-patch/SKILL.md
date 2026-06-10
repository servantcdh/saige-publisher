---
name: saige-product-feature-patch
description: safety-frontend 기존 페이지/위젯에 User Story 명세 시안에 따른 신규 요소/기능을 추가 patch. 신설(scaffold) 아닌 patch 전용. **enum/Record/Map type 추가 시 모든 reference 자동 fan-out patch**가 핵심 책임. SAIGE Product 트랙.
---

# saige-product-feature-patch

신규 페이지/위젯 generate(scaffold)와 별개. 이미 구현된 페이지/위젯에 PD 명세 시안 따라 부분 변경 추가하는 skill.

## 핵심 디자인 원칙

| 차별점 | DS-Product page-scaffold | feature-patch (이 skill) |
|---|---|---|
| 시안 성격 | 실제 페이지 시안 | **User Story + 명세 문서** (PD 작성, Block 텍스트 + 컴포넌트 인스턴스 예시) |
| 작업 | 신규 생성 | **기존 코드 patch** |
| 결정적 책임 | 4파일 보일러플레이트 | **enum/Record/Map fan-out 자동 patch** |
| 검증 | typecheck/lint 표준 | + 기존 기능 regression 확인 |

## 적용 시점

- PD가 User Story 명세 시안(Block + 컴포넌트 인스턴스 + 텍스트 명세)을 작성
- 이미 구현된 페이지에 새 요소/기능 추가 필요
- 신규 enum 값 / Record 키 / EventType / AlarmType 등 추가
- 신규 컴포넌트 inline 추가 (기존 위치 + 명세 따라 새 인스턴스)

## 동작 6단계

### 1단계 — 명세 시안 read
- Figma `get_design_context` 또는 `get_metadata` 호출
- 명세 구조 파싱:
  - **Block 텍스트**: PD가 작성한 명세 (감지 조건 / 색상 / 우선순위 / 알림 스펙 등)
  - **컴포넌트 인스턴스**: Banner, Toast, Dialog 등 시안에 표시된 UI 예시
  - **숨김 처리 텍스트** (`hidden="true"`): 부가 명세 또는 제외 영역

### 2단계 — 적용 대상 기존 페이지 식별
- 명세에 등장하는 키워드(예: "고소작업", "안전모") grep으로 기존 코드 검색
- enum/constant 위치 식별 — 본인 카메라맵 PoC에서 학습한 위치:
  - `packages/shared/src/apis/base/constants/enums.ts` — EventType / AlarmType / ReviewStatus
  - `packages/services/monitoring/src/inference/utils/getEventVisualParams.ts` — 이벤트 색상/아이콘 매핑
  - `packages/services/dashboard/src/.../DashboardCameraEventGraph.tsx` — 통계 그래프
- 위젯/서비스 패키지 매핑 (monitoring vs alarm vs dashboard)

### 3단계 — fan-out 영향 분석 (★ 핵심)

신규 enum 값 추가 시 다음 패턴 모두 검색:
```bash
# 1. enum 직접 reference
grep -rln "EventType\.<EXISTING_KEY>" packages/

# 2. Record / Map (key 누락 typecheck fail 가능 영역)
grep -rln "EventType\]\:\|Record<EventType\|EventMap\|\\[EventType\\." packages/

# 3. Union type / discriminated union
grep -rln "EventType =\|: EventType\|extends EventType" packages/

# 4. i18n key (ko/en)
grep -rln "<existing_snake_case>" packages/shared/src/libs/tolgee/

# 5. switch case
grep -rln "case EventType\\." packages/
```

기대 결과: 단일 enum 추가가 **10+ 파일 fan-out** 영향 (본인 2026-06-09 work_at_height PoC에서 학습).

### 4단계 — patch 작성 (자동)

| 영역 | 자동 patch |
|---|---|
| `enums.ts` | 신규 enum 값 추가 (명세 우선순위 위치) |
| `getEventVisualParams.ts` | switch case 추가 (명세 색상) |
| Record/Map 정의들 | 신규 key + 기본값 (`[]`, `0`, 빈 객체 등) |
| switch case들 | default 외 신규 case 추가 (각 파일 패턴 따름) |
| i18n ko-KR.json / en-US.json | 신규 key (시안 명세 한국어 + 영문 번역) |
| Icon union narrowing | union narrowing 깨질 때 `if (!result.Icon) return null;` 추가 |

### 5단계 — 검증 (regression 포함)

```bash
pnpm typecheck && pnpm lint && pnpm knip
```

추가 검증:
- 기존 페이지 시각 회귀 (`saige-product-visual-verify` — 기존 페이지 캡쳐 vs patch 후)
- e2e CRUD smoke test 통과 (자동 트리거 — `safety-frontend` dev 머지 시)

### 6단계 — i18n + 메모리 갱신
- Tolgee key 추가 확인 (ko-KR + en-US 동기화)
- 본인 메모리에 enum/Record 변경 이력 기록 (다음 patch 시 참조)

## 명세 시안 파싱 패턴

User Story 명세는 일정 구조:
```
<section name="[User Story N] ...">
  <frame name="Features">
    <text name="<title>" />
    <frame name="Block">
      <text name="<명세 본문>" />   ← PD가 작성, key 정보
      <instance name="<컴포넌트명>" />  ← UI 예시 (Banner/Toast/Dialog)
    </frame>
    <frame name="Block" hidden="true">
      <text name="<숨김 명세>" />   ← 비활성 또는 부가 명세
    </frame>
  </frame>
</section>
```

본인이 명세 본문 텍스트에서 추출:
- 감지 조건 (예: "공간 인식 검사 활성화 되어야 함")
- 시각 스펙 (Color/Stroke/Fill — 본인 자동 매핑)
- 우선순위 (정렬 순서 — 본인 자동 sort 위치 결정)
- 알림 스펙 (기본 vs 중대한 분기)

## 본인 학습 케이스 — 고소작업(WORK_AT_HEIGHT) PoC

2026-06-09 work_at_height PoC에서 검증된 영향 범위 (10+ 파일):
- `enums.ts` EventType
- `getEventVisualParams.ts` switch
- `getIconWithLabelByEvent.tsx` Record
- `EventTypeIcon.tsx` union narrowing
- `UpdateEventDetectionTimeDialog.tsx` (3곳) Record index
- `InferenceEventDetectionItem.tsx` Record index
- `DashboardCameraEventGraph.tsx` (Desktop+Mobile) EventMap
- `cameraDetectPeriodCard.tsx` / `cameraEventCard.tsx` (6곳) Icon union

→ 단순 enum 1개 추가가 위 모든 reference 자동 patch 필요 = 본인 skill의 결정적 가치.

## 사람 개입 최저 원칙

- 명세 텍스트 → enum 값 매핑: 본인 자동 (한국어 → snake_case 변환)
- Icon 선택: 명세에 명시 없으면 본인 best-guess (예: "고소작업" → IconShieldWarning 유사 패턴)
- 우선순위 위치: 명세에 명시되어 있으면 자동, 모호하면 사용자 확인 1회

## 사용자 추가 입력 허용 시점 (예외)

- 명세에 매핑 가능한 Icon 없음 → 사용자 결정
- BE API 응답 enum 값 (snake_case 표기) 불분명 → BE 확정 후 진행
- 신규 컴포넌트 인스턴스 (Banner/Toast/Dialog) 적용 위치 모호 → 사용자 확인

## 관련 skills

- `figma-handoff-scanner` (1단계 시안 read)
- `saige-product-session-start` (컨텍스트)
- `saige-product-qa` (검증)
- `saige-product-visual-verify` (regression)
- `saige-premerge-review` (자기검증)
- `saige-product-handoff` (PR 생성)

## 참조

- 카메라맵 PoC [[cameramap-poc-learning]] — 페이지 신설 학습
- 본인 work_at_height PoC (2026-06-09) — 명세 patch + enum fan-out 학습
- safety-frontend SSOT [[safety-frontend-claude-md-ssot]]

## 변경 이력

- v0.1 (2026-06-09): work_at_height(고소작업) PoC 학습 기반 초안. enum fan-out 자동 patch가 핵심.
