# SAIGE AI 퍼블리셔 스킬 — 셋업 & 사용 가이드

Figma 시안을 SAIGE 코드(design-system / safety-frontend)로 **반자동 퍼블리싱**하는 Claude Code 스킬 모음. 라우팅 → 변환 → QA → 시각 검증 → 머지 게이트 → 핸드오프를 표준화한다.

> 상태: **내부 파일럿 단계** (저자 도그푸딩 검증 완료, 비저자 검증 진행 예정). 정식 사내 툴 승격 전.

## 구성

| 그룹 | 스킬 |
|---|---|
| 진입/라우팅 | `saige-publisher`(트랙 자동 판별), `figma-handoff-scanner` |
| DS 트랙 | `saige-ds-{session-start, figma-to-vex, qa, visual-verify, handoff}` |
| Product 트랙 | `saige-product-{session-start, page-scaffold, feature-patch, figma-to-emotion, qa, visual-verify, handoff}` |
| 공통 게이트 | `saige-premerge-review`, `saige-pr-create` |
| 공용 스크립트 | `_shared/{saige-paths, append-self-eval}.mjs`, `saige-ds-figma-to-vex/{icon-resolve, component-resolve}.mjs` |

## 전제조건

1. Claude Code + Figma MCP 연결
2. 리포 클론: `design-system`, `safety-frontend`
3. design-system에 의존성 설치 (`pnpm install`) — `@saige-ai/icons` 필요 (아이콘 resolver 권위 소스)

## 경로 설정 (이식성)

모든 경로는 **`_shared/saige-paths.mjs` 한 곳**에서 해석한다. 하드코딩 없음.

- **표준 레이아웃**(`~/Documents/design-system`, `~/Documents/safety-frontend`)이면 **설정 불필요** — 바로 동작.
- **다른 위치**면 환경변수만 설정 (셸 프로필 또는 Claude Code settings `env`):

```bash
export SAIGE_DS_ROOT="/your/path/design-system"
export SAIGE_SF_ROOT="/your/path/safety-frontend"
# 선택 (보통 SAIGE_DS_ROOT에서 자동 파생):
export SAIGE_ICONS_DTS="$SAIGE_DS_ROOT/node_modules/@saige-ai/icons/dist/index.d.ts"
export SAIGE_SELF_EVAL_LOG="/your/memory/_self_evaluation_log.json"
```

**dev 자격증명** (Product visual-verify 로그인 자동화용) — 평문 파일 저장 금지, env로만:
```bash
export SAIGE_DEV_USER="<dev 계정 ID>"
export SAIGE_DEV_PASS="<dev 계정 PW>"
```

## 셋업 검증 (3개 resolver)

```bash
node saige-ds-figma-to-vex/icon-resolve.mjs corner_fit channels
node saige-ds-figma-to-vex/component-resolve.mjs --building "X" "Button" "Frobnicator"
node _shared/append-self-eval.mjs --ticket TEST --self-claim 90 --measured 88 --dry-run
```
모두 결과가 나오면 경로 정상. (`corner_fit→IconCornerFit`, `Button→<Button/>`, dry-run 점수 출력)

## PR 생성 게이트 (선택, 권장)

`saige-pr-create`의 강제 차단은 PreToolUse hook에 의존한다. 미설정 시 게이트가 *강제*되지 않을 뿐 스킬은 동작.
- hook: `~/.claude/hooks/pre-pr-create-check.sh`
- Claude Code settings의 PreToolUse에 등록 필요.

## ⚠️ 신뢰 경계 (어디까지 자동, 어디부터 사람)

객관 측정(PoC)으로 그린 경계:
- ✅ **정적·토큰 위생 좋은 시안**: 변환 거의 결정론적 (토큰 매핑 ~100%, 아이콘 이름 ~92%)
- ⚠️ **사람 확인 필수**: 아이콘 글리프 정확성, 컴포넌트 prop 매핑, 멀티스테이트 스코핑
- ❌ **자동화 범위 밖(수동)**: 인터랙티브 동작 로직
- 모든 resolver는 **불확실하면 추정 대신 사용자에게 질문**(할루시네이션 금지)이 원칙.

## 변경 이력

- 2026-06-10: git 저장소화 + 이식성 수술(하드코딩 경로 → `saige-paths.mjs` env/homedir 해석) + 본 README 신설.
