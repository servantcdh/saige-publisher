#!/usr/bin/env bash
# install.sh — SAIGE AI 퍼블리셔 스킬 설치 (Claude Code).
#
# 레포의 스킬 디렉토리를 Claude Code 발견 위치(~/.claude/skills)에 심볼릭 링크하고,
# PR 생성 게이트 hook을 설치하며, 경로/검증을 안내한다. 멱등(재실행 안전).
#
# 사용:  ./install.sh
# 환경:  CLAUDE_SKILLS_DIR (기본 ~/.claude/skills) / CLAUDE_HOOKS_DIR (기본 ~/.claude/hooks)
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
HOOKS_DIR="${CLAUDE_HOOKS_DIR:-$HOME/.claude/hooks}"

echo "▶ SAIGE 퍼블리셔 스킬 설치"
echo "  repo:   $REPO_DIR"
echo "  skills: $SKILLS_DIR"
echo "  hooks:  $HOOKS_DIR"
mkdir -p "$SKILLS_DIR" "$HOOKS_DIR"

# ── 1. 스킬 디렉토리 → 발견 위치 심볼릭 링크 ──
if [ "$REPO_DIR" = "$SKILLS_DIR" ]; then
  echo "▶ 레포가 이미 발견 위치와 동일 — 심볼릭 링크 생략 (저자 머신 케이스)"
else
  echo "▶ 스킬 심볼릭 링크"
  for d in "$REPO_DIR"/*/; do
    name="$(basename "$d")"
    case "$name" in .git | hooks) continue ;; esac
    target="$SKILLS_DIR/$name"
    if [ -L "$target" ]; then
      rm "$target" # 기존 링크 갱신
    elif [ -e "$target" ]; then
      echo "  ⚠️  $name — 실제 폴더가 이미 존재, 건너뜀 (수동 확인 필요)"
      continue
    fi
    ln -s "$d" "$target"
    echo "  ✅ $name"
  done
fi

# ── 2. PR 생성 게이트 hook 설치 ──
echo "▶ PR 생성 게이트 hook"
if [ -f "$REPO_DIR/hooks/pre-pr-create-check.sh" ]; then
  cp "$REPO_DIR/hooks/pre-pr-create-check.sh" "$HOOKS_DIR/"
  chmod +x "$HOOKS_DIR/pre-pr-create-check.sh"
  echo "  ✅ $HOOKS_DIR/pre-pr-create-check.sh"
  echo "  ⚠️  아래 스니펫을 Claude Code settings.json 의 hooks.PreToolUse 에 추가하세요:"
  cat <<SNIP
    {
      "matcher": "Bash",
      "hooks": [{ "type": "command", "command": "$HOOKS_DIR/pre-pr-create-check.sh" }]
    }
SNIP
else
  echo "  ⏭️  hooks/pre-pr-create-check.sh 없음 — 게이트 미설치 (스킬은 동작)"
fi

# ── 3. 환경변수 안내 ──
echo "▶ 환경변수 (리포 레이아웃이 ~/Documents 와 다르면 셸 프로필에 추가)"
cat <<'ENVTPL'
  export SAIGE_DS_ROOT="$HOME/Documents/design-system"
  export SAIGE_SF_ROOT="$HOME/Documents/safety-frontend"
  export SAIGE_DEV_USER="<dev 계정 ID>"    # Product visual-verify 로그인
  export SAIGE_DEV_PASS="<dev 계정 PW>"
ENVTPL

# ── 4. 검증 (resolver 3종) ──
echo "▶ 검증"
ok=0
node "$REPO_DIR/saige-ds-figma-to-vex/icon-resolve.mjs" corner_fit >/dev/null 2>&1 \
  && { echo "  ✅ icon-resolve"; ok=$((ok + 1)); } \
  || echo "  ⚠️  icon-resolve 실패 — design-system 클론 + pnpm install(@saige-ai/icons) 확인"
node "$REPO_DIR/saige-ds-figma-to-vex/component-resolve.mjs" "Button" >/dev/null 2>&1 \
  && { echo "  ✅ component-resolve"; ok=$((ok + 1)); } \
  || echo "  ⚠️  component-resolve 실패 — SAIGE_DS_ROOT 확인"
node "$REPO_DIR/_shared/append-self-eval.mjs" --ticket T --self-claim 90 --measured 88 --dry-run >/dev/null 2>&1 \
  && { echo "  ✅ append-self-eval"; ok=$((ok + 1)); } \
  || echo "  ⚠️  append-self-eval 실패"

echo ""
echo "✔ 완료 ($ok/3 resolver OK). Claude Code 재시작 시 스킬이 스캔됩니다."
echo "  자세한 셋업·신뢰 경계: _shared/README.md"
