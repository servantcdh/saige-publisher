---
name: saige-premerge-review
description: SAIGE DS 컴포넌트·Product 페이지/기능의 머지 직전 PD 관점 엄격 자기검증을 자동 실행하는 **공통(트랙 무관)** skill. 시안 정합 매트릭스(실측) / 시나리오 커버리지 / PD 예상 질문 5개 / 머지 권고를 단일 보고서로 산출. 본인 자칭 정합도 vs visual-verify 실측 비교로 편향 검출. DS·Product 양쪽 handoff 6단계 직전에서 공유 호출. SDS-216 v1 폐기 사후학습(자칭 97% → 실측 65% 사례) 재발 방지.
---

# saige-premerge-review

PR 생성/머지 직전 자동 실행하는 **트랙 공통** skill (2026-06-09 `saige-ds-premerge-review`에서 공통화). 본인 메모리 [[feedback-premerge-pd-review]] 규칙을 skill 형태로 정형화 + visual-verify 실측 점수 자동 반영 + 누적 편향 기록.

> **트랙별 호출 매핑**: DS 트랙은 `saige-ds-visual-verify`/`saige-ds-qa`/`saige-ds-handoff`와, Product 트랙은 `saige-product-visual-verify`/`saige-product-qa`/`saige-product-handoff`와 짝을 이룬다. 아래 본문이 `saige-ds-*`를 예로 들면 Product 작업 시 대응 `saige-product-*`로 치환해 읽는다.

## 적용 시점

- `gh pr create`(DS, GitHub) 또는 `az repos pr create`(Product, Azure DevOps) 직전
- DS: develop → main / Product: feature → dev 머지 직전
- "이정도면 머지 가능" 자기 판단 든 순간

## 0단계 — 본인 사전 read 의무 (★ 2026-06-09 추가)

PR 사이클 진입 전 본인이 반드시:
- [[feedback-workflow-violations]] 사전 read — 본인 누적 위반 환기
- 본인 자기평가 신뢰도(현재 65/100) 인지

🚨 **할루시네이션 절대 금지** (사용자 2026-06-09 명시):
- 실측(visual-verify) 부재 시 자칭 정합도 산출 X — "측정 안 됨" 명시
- PD 예상 질문 5개 답변 시 본인이 답 못하는 항목은 명시적으로 "답 못함" 표시 + 사용자/PD에게 질문
- 본인 답변에 추정/임시 표현(예: "~인 듯", "~로 추정") X

## 적용 안 하는 경우

- 단순 typo / lint fix
- 머지 안 하는 작업 (WIP commit, 실험 commit)
- 사용자가 명시적으로 "검증 생략하고 머지" 지시

## 입력

1. **PR diff** (또는 commit list) — git log/diff에서 자동
2. **Figma URL / variantMatrix.json** — `figma-handoff-scanner` 결과
3. **visual-verify 결과** — 트랙별 `saige-ds-visual-verify` / `saige-product-visual-verify` 산출 fidelity-score.json (선택, 없으면 자칭 정합도만 보고)
4. **티켓 키** — PR 본문에서 자동 파싱 (DS: `SDS-xxx` / Product: `SAFETYPRD-xxxx`)

## 5단계 자동 검증

### 1단계 — 시안 정합 매트릭스 (실측 우선)

**실측 가용 시** (`visual-verify` 결과 있음):
- variant cell × Design Fidelity Score 표
- 통계: 평균 / 통과율 / 검토 필요 / 실패
- 본인 자칭 정합도 vs 실측 자동 비교

**실측 부재 시**:
- 본인 풀세트 매트릭스 산출 (figma-handoff-scanner 결과 활용)
- 각 항목 ✅/△/❌ 자체 평가 (자칭 수치)
- ⚠️ **경고 표시** — 실측 없음, 자칭 신뢰도 낮음 명시

산출 표:
```markdown
| 매트릭스 항목 | 시안 | 구현 | 정합 (자칭/실측) |
|---|---|---|---|
| Compound 골격 | ✅ | ✅ | 100% / 측정 안 됨 |
| ... |
```

### 2단계 — 사용자 시나리오 커버리지 (정성)

본인 작업 도메인에서 핵심 사용자 시나리오 6-8개 자동 추출 또는 사용자 확인:
- 컴포넌트 기본 사용
- 주요 인터랙션
- 에러 / 빈 상태
- 접근성 (키보드 / 스크린 리더)
- 모바일 / Narrow viewport

각 시나리오 ✅/△/❌ 평가 + 커버리지 %.

### 3단계 — 출시 가능성 + 어드밴티지

- 이 머지로 어떤 페이지/기능 마이그레이션 가능한지
- 기존 솔루션 대비 어드밴티지 명시
- 어드밴티지 답할 수 없으면 **Foundation PR로 명확 포지셔닝** 권고
- 또는 머지 보류 권고

### 4단계 — PD 예상 질문 5개

PD/리뷰어 입장에서 던질 만한 비판적 질문 5개 자동 생성:
- 본인 작업의 범위 / 한계
- 미구현 영역 일정
- 기존 인프라(MUI X 등) 대비 우위
- 마이그레이션 가능 시점
- 후속 티켓 분리 합리성

각 질문에 본인 답변 준비. 답 못하면 그 항목이 머지 전 갭.

### 5단계 — 머지 권고

- **머지 진행** / **보류** / **Foundation PR 포지셔닝** 중 선택
- Phase 2 후속 티켓 분리 시 SDS-xxx 번호 후보
- 일정 합의 필요 여부

## 자기평가 편향 검출 (보조 축)

본인 자칭 수치 vs visual-verify 실측 자동 비교:

```markdown
## 본인 자기평가 편향 검출

| 단계 | 본인 자칭 | 실측 | 편향 갭 | 신호 |
|---|---|---|---|---|
| 1차 산출 (자칭) | 시각 79% / 동작 50% | - | - | - |
| visual-verify 후 | - | 시각 87.3% / 동작 50% | -8.3%p (시각) | ✅ 안전 방향 |
```

누적 갭 기록: `~/.claude/.../memory/_self_evaluation_log.json`
- 본인 자칭이 +10%p 초과 과대 평가 시 신뢰도 낮음 표시
- 누적 평균이 안정적이면 본인 자기평가 신뢰 가능

## 출력 포맷

`premerge-review-report.md` 단일 보고서:

```markdown
# Pre-merge PD Review — <PR title>

PR: #<num>
JIRA: <key>
검증 시각: <ISO>

## 1. 시안 정합 매트릭스 (실측 우선)
[표]

## 2. 시나리오 커버리지
N/M (XX%)

## 3. 출시 가능성
- 마이그레이션 가능 영역: ...
- 어드밴티지: ...
- 권고 포지셔닝: Foundation / Production-ready / 보류

## 4. PD 예상 질문 5개 + 본인 답변
1. Q: ...
   A: ...
...

## 5. 머지 권고
- 권고: 머지 진행 / 보류 / Foundation 분리
- Phase 2 티켓: SDS-xxx, SDS-yyy

## 자기평가 편향 검출
[표]
```

## 머지 게이트 (정량 + 정성 결합)

PR이 머지 가능 조건 (트랙별 qa/visual-verify로 치환):
- ✅ qa 모두 통과 — DS: `saige-ds-qa` 8개 영역 / Product: `saige-product-qa` 10개 영역
- ✅ visual-verify 평균 ≥ 90%, 모든 cell ≥ 80% — DS: `saige-ds-visual-verify` / Product: `saige-product-visual-verify`
- ✅ `saige-premerge-review` 보고서의 5단계 모두 답변 가능
- ✅ PR 본문이 결과를 반영 (자칭 정합도 명시 시 실측과 갭 ≤ 10%p)

## 사용자 추가 입력 허용 시점 (예외)

원칙은 자동이지만 다음 케이스에 1회 허용:
- 시나리오 커버리지에서 핵심 시나리오 누락 의심 시 — 사용자 확인
- PD 예상 질문 5개 중 본인이 답 못하는 항목 1개 이상 — 사용자 결정 (보류 vs 진행)

## 자동 실행 — `saige-pr-create` v0.2 통합 (★ 2026-06-09 갱신)

본인 자동 호출 강제 — `saige-pr-create` v0.2의 **5단계(사용자 시각 승인)** 직전 자동 호출:

1. saige-pr-create v0.2 4단계(구현 캡쳐 + visual-verify) 완료
2. **이 skill 자동 실행** → premerge-review-report.md 산출
3. 사용자에게 시안 + 구현 + premerge 보고서 + visual-verify fidelity-score 통합 보여줌
4. 5단계 사용자 시각 승인 → 6단계 PR 생성

산출물: `/tmp/visual-verify-poc/<TICKET>-premerge-review.md` (선택, hook 검증 대상 아님)

**수동 트리거**: 슬래시 `/premerge-review` 또는 사용자 요청

## 관련 skills (트랙 공통 — DS / Product 짝)

- `figma-handoff-scanner` — 시안 풀세트 입력 (공통)
- 변환: DS `saige-ds-figma-to-vex` / Product `saige-product-figma-to-emotion` (+ scaffold/feature-patch)
- 구조 검증: DS `saige-ds-qa` / Product `saige-product-qa`
- 시각 정합 실측: DS `saige-ds-visual-verify` / Product `saige-product-visual-verify`
- `saige-premerge-review` (이 skill) — 머지 게이트 통합 (양 트랙 공유)
- PR 생성: DS `saige-ds-handoff` / Product `saige-product-handoff` → 둘 다 `saige-pr-create` 게이트 경유
- 오케스트레이션: `saige-publisher`가 트랙 판별 후 이 skill을 5단계로 호출

## 참조

- 본인 메모리: [[feedback-premerge-pd-review]] / [[ds-claude-md-ssot]] / [[ds-datagrid-v2-decisions]]
- SDS-216 사례: 본인 자칭 97% → PD 관점 65% 실측 (자기평가 편향 검출의 motivation)

## 변경 이력

- v0.1 (2026-06-08): 메모리 규칙 + visual-verify 실측 연계 + 편향 검출 자동화 초안. 카메라맵 첫 실증 예정.
- v0.2 (2026-06-09): G28/G30/G32 갭 해소 — 0단계(사전 read + 할루시네이션 금지) 추가, saige-pr-create v0.2 5단계 자동 통합 명시. 자칭 정합도 산출 시 실측 부재 명시 강제.
- v0.3 (2026-06-09): **`saige-ds-premerge-review` → `saige-premerge-review` 공통화 rename**. DS 전용에서 DS·Product 양 트랙 공유 skill로. description/입력/머지 게이트/관련 skills를 트랙 무관(qa·visual-verify·handoff를 DS/Product 짝으로)으로 일반화. 참조 10개 파일 일괄 갱신. (Product 트랙도 그동안 이 skill을 공통명으로 참조 중이라 dangling 해소.)
