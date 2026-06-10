#!/bin/bash
# PreToolUse hook — gh/az pr create 명령 차단
# 본인 워크플로우 갭(시안 미정독 / 사용자 시각 승인 누락) 자동 차단
# 2026-06-09 SDS-217 폐기 사후학습으로 도입

set -e

INPUT=$(cat)

# Bash 명령 추출
COMMAND=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input', {}).get('command', ''))")

# PR 생성 명령 패턴 매칭
if echo "$COMMAND" | grep -qE '(gh pr create|az repos pr create|az repos pr create)'; then
  # 티켓 키 추출 (SDS-XXX 또는 SAFETYPRD-XXXX)
  TICKET=$(echo "$COMMAND" | grep -oE '(SDS-[0-9]+|SAFETYPRD-[0-9]+)' | head -1)

  # 승인 토큰 + discovery + 캡쳐 + visual-verify fidelity 검증
  APPROVAL_FILE="/tmp/visual-verify-poc/.approved-${TICKET}"
  DISCOVERY_FILE="/tmp/visual-verify-poc/${TICKET}-discovery.md"
  FIGMA_FILE="/tmp/visual-verify-poc/${TICKET}-figma.png"
  STORYBOOK_FILE="/tmp/visual-verify-poc/${TICKET}-storybook.png"
  ACTUAL_FILE="/tmp/visual-verify-poc/${TICKET}-actual.png"
  FIDELITY_FILE="/tmp/visual-verify-poc/${TICKET}-fidelity-score.json"

  MISSING=""
  [ -z "$TICKET" ] && MISSING="${MISSING}
  - 티켓 키 감지 실패"
  [ ! -f "$DISCOVERY_FILE" ] && MISSING="${MISSING}
  - 시안 풀세트 발견 보고서: ${DISCOVERY_FILE}"
  [ ! -f "$FIGMA_FILE" ] && MISSING="${MISSING}
  - Figma 시안 캡쳐: ${FIGMA_FILE}"
  if [ ! -f "$STORYBOOK_FILE" ] && [ ! -f "$ACTUAL_FILE" ]; then
    MISSING="${MISSING}
  - 구현 캡쳐: ${STORYBOOK_FILE} 또는 ${ACTUAL_FILE}"
  fi
  [ ! -f "$FIDELITY_FILE" ] && MISSING="${MISSING}
  - visual-verify 정량 점수: ${FIDELITY_FILE}"
  [ ! -f "$APPROVAL_FILE" ] && MISSING="${MISSING}
  - 사용자 승인 토큰: ${APPROVAL_FILE}"

  if [ -n "$MISSING" ]; then
    cat <<EOM >&2
🚫 PR 생성 차단됨 (워크플로우 갭 강제 메커니즘)

티켓: ${TICKET:-감지 실패}

누락 항목:${MISSING}

본인 완료 단계:
  1. figma-handoff-scanner 자율 호출 → variant 풀세트 매트릭스 산출 → discovery.md 저장
  2. Figma 시안 캡쳐 (cell별)
  3. 본인 구현 캡쳐 (Storybook 또는 Vite dev server)
  4. 사용자에게 시안 + 구현 보여주고 시각 승인 받음
  5. 사용자 명시 승인 후 토큰 생성: touch ${APPROVAL_FILE}

🚨 절대 금지: 시안 부재/부족 시 본인 추정 작업 = 할루시네이션. 사용자에게 즉시 솔직 보고.

근거: SDS-216 v1 폐기 + SDS-217 폐기 + SDS-217 재도전 시 본인 추정 작업 패턴.
참조: ~/.claude/skills/saige-pr-create/SKILL.md
EOM
    exit 2
  fi

  # 통과 — 토큰 + discovery + fidelity-score 1회용 소비
  rm -f "$APPROVAL_FILE" "$DISCOVERY_FILE" "$FIDELITY_FILE"
fi

exit 0
