# SAIGE AI 퍼블리셔 스킬

Figma 시안을 SAIGE 코드(`design-system` / `safety-frontend`)로 **반자동 퍼블리싱**하는 Claude Code 스킬 모음. 라우팅 → 변환 → QA → 시각 검증 → 머지 게이트 → 핸드오프를 표준화한다.

> **상태: 내부 파일럿** — 저자 도그푸딩 검증 완료, 비저자 검증/실제 PR ship 전. 정식 사내 툴 승격 전 단계.

## ⚠️ 가장 기본 전제 — Figma MCP

이 스킬은 **전부 Figma 핸드오프에서 시작**한다. **Figma 데스크톱 앱의 Dev Mode MCP 서버**(`http://127.0.0.1:3845/sse`)가 없으면 아무것도 동작하지 않는다.
1. Figma 데스크톱 + 로그인 → **Dev Mode MCP server 활성화** (⚠️ Dev/Full seat 필요)
2. `claude mcp add --transport sse figma http://127.0.0.1:3845/sse`
3. `claude mcp list` → `figma: ... ✓ Connected` 확인

## 설치 (1분)

```bash
git clone <repo-url> ~/dev/saige-publisher   # private — 소유자에게 접근권 요청
cd ~/dev/saige-publisher
./install.sh        # 스킬 심볼릭 링크 + hook 설치 + env 안내 + 검증
```
설치 후 **Claude Code 재시작** → 스킬 자동 스캔.

전제(리포 클론·`pnpm install`·env)·검증·신뢰 경계 전체는 **[`_shared/README.md`](_shared/README.md)** 참고.

## 구성 (17 스킬 + 공용)

| 그룹 | 스킬 |
|---|---|
| 진입/라우팅 | `saige-publisher`(트랙 자동 판별), `figma-handoff-scanner` |
| DS 트랙 | `saige-ds-{session-start, figma-to-vex, qa, visual-verify, handoff}` |
| Product 트랙 | `saige-product-{session-start, page-scaffold, feature-patch, figma-to-emotion, qa, visual-verify, handoff}` |
| 공통 게이트 | `saige-premerge-review`, `saige-pr-create`(+ `hooks/`) |
| 공용 스크립트 | `_shared/{saige-paths, append-self-eval}`, `saige-ds-figma-to-vex/{icon-resolve, component-resolve}` |

## 신뢰 경계 (어디까지 자동)

- ✅ **정적·토큰 위생 좋은 시안**: 거의 결정론적 (토큰 ~100%, 아이콘 이름 ~92%)
- ⚠️ **사람 확인**: 아이콘 글리프, 컴포넌트 prop, 멀티스테이트 스코핑
- ❌ **자동화 밖(수동)**: 인터랙티브 동작 로직
- 모든 resolver는 **불확실하면 추정 대신 질문**(할루시네이션 금지).

## 설계 원칙

객관 측정 우선(자칭 금지) · 게이트 우회 불가(visual-verify / premerge / pr-create hook) · 사람 개입 최저 · 트랙 책임 분리.
