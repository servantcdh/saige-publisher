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

### 0. Figma MCP 연동 — ★ 가장 기본 전제 (이게 없으면 아무것도 시작 안 됨)

모든 퍼블리싱은 Figma 핸드오프에서 출발한다(scanner·figma-to-vex/emotion·visual-verify 전부 `mcp__figma__*` 사용). 스킬이 쓰는 서버는 **`figma` = `http://127.0.0.1:3845/sse`** — **Figma 데스크톱 앱의 Dev Mode MCP 서버**다.

설정 순서:
1. **Figma 데스크톱 앱** 설치 + 로그인 (MCP 서버가 앱 *안에서* 돈다)
2. **Dev Mode MCP 서버 활성화** (Figma 메뉴 → Preferences → "Enable Dev Mode MCP server"). ⚠️ **Dev Mode 접근 가능한 시트(Pro/Org의 Dev·Full seat) 필요** — 비저자 최대 진입장벽
3. **Claude Code에 등록**: `claude mcp add --transport sse figma http://127.0.0.1:3845/sse`
4. **확인**: `claude mcp list` → `figma: ... ✓ Connected`

> 참고: 호스티드 옵션(`https://mcp.figma.com/mcp`)도 있으나 OAuth 인증 별도. 이 스킬은 로컬(127.0.0.1:3845) 기준.

### 나머지 전제
1. 리포 클론: `design-system`, `safety-frontend`
2. design-system에 의존성 설치 (`pnpm install`) — `@saige-ai/icons` 필요 (아이콘 resolver 권위 소스)

## 설치 (권장 — `install.sh`)

이 레포를 별도 위치에 클론한 뒤 `install.sh` 한 번 실행:
```bash
git clone <repo-url> ~/dev/saige-publisher   # private — 레포 소유자에게 접근권 요청
cd ~/dev/saige-publisher
./install.sh
```
`install.sh`가 하는 일:
- 스킬 디렉토리를 `~/.claude/skills/`에 **심볼릭 링크** (git pull 시 자동 반영. 심볼릭 경유 실행도 동작)
- PR 게이트 hook(`hooks/pre-pr-create-check.sh`) 설치 + settings 등록 스니펫 출력
- 환경변수 템플릿 출력 + resolver 3종 검증
- 멱등(재실행 안전). 비표준 위치는 `CLAUDE_SKILLS_DIR`/`CLAUDE_HOOKS_DIR`로 override.

설치 후 **Claude Code 재시작** → 스킬 스캔. PR 게이트 강제하려면 출력된 스니펫을 `settings.json` `hooks.PreToolUse`에 추가.

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
