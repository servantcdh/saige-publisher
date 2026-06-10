---
name: figma-handoff-scanner
description: Use this skill when the user asks to inspect, scan, inventory, or implement a Figma design through Figma MCP without manually selecting every artboard.
---

# Figma Handoff Scanner

## Goal

Convert a Figma MCP root selection or Figma node URL into a structured implementation plan by:
1. Discovering the design structure
2. Building an inventory of screens/components
3. Splitting large frames into logical chunks
4. Fetching detailed design context only for necessary nodes
5. Producing an implementation plan before writing code

## Required Flow

### 1. Resolve Figma root

Accept one of:
- Current Figma selection
- Figma frame/layer URL
- List of Figma node URLs
- A handoff section URL

If no root is available, ask the user for a Figma frame URL or to select a root handoff section.

### 2. Inventory first

Before generating code, call `get_metadata` on the root.

Create an inventory with:
- node name
- node id
- type
- size
- parent path
- inferred role
- implementation priority
- skip reason, if ignored

Do not call `get_design_context` on the entire root unless it is small.

### 3. Classify nodes

Classify nodes as:
- screen
- component
- variant
- layout
- asset
- flow
- ignored

Use naming hints (optional convention — see project CLAUDE.md):
- @screen
- @component
- @flow
- @ignore
- @wip
- @done

When naming hints are absent, apply heuristics:
- archived/WIP detection: frame name contains `(WIP)`, `archive`, `old`, or node is hidden → ignore
- screen identification: top-level Frame with standard viewport sizes (e.g. 1440×900, 1280×800, 375×812)
- component identification: COMPONENT_SET node, or node with many INSTANCE children
- annotation/spec frame: name contains `🪄`, `Annotation`, `Guideline`, `Spec`, `Note`, or magic-emoji prefix → annotation (not production)
- DS token consumer detection: TEXT/RECTANGLE nodes referencing `var(--theme.palette.*)` → tokenized component candidates

### 4. Split large frames

For large screens, split into logical chunks:
- Header
- Sidebar
- Navigation
- Content
- Card
- Table
- Form
- Modal
- Empty State
- Error State
- Footer

Fetch design context chunk by chunk.

### 5. Build analysis queue

Prioritize:
- P0: route-level screens
- P1: reused components required by P0
- P2: variants and states
- P3: decorative assets or low-confidence nodes

### 6. Fetch details

For each queued node:
- call `get_design_context`
- call screenshot if visual validation is needed
- extract layout, spacing, typography, colors, states, assets
- map to existing code components where possible

### 7. Produce implementation plan + discovery report (SAIGE)

Before editing code, output:
- screens/routes
- component tree
- token mapping (project design tokens; for SAIGE DS see `saige-ds-figma-to-vex`)
- asset list (icons mapped to project icon package; for SAIGE see `@saige-ai/icons`)
- DS component reuse candidates (existing components in `src/components/**` to be reused)
- missing design states
- implementation order
- risks and assumptions

**SAIGE-specific** — when running under the `saige-pr-create` workflow, also write a discovery report file:

```
Path: /tmp/visual-verify-poc/<TICKET>-discovery.md

Content:
# <TICKET> 시안 풀세트 발견 보고서

## 작업 대상 frame
- <variant-name>: <node-id>

## 발견된 variant 매트릭스
| Component | Variant | Node ID | 본인 정독 |
|---|---|---|---|
| ... | ... | ... | ✅ / ❌ |

## 본인 자율 작업 영역 (✅)
- DS standard 명확 영역만

## 사용자 확인 + 담당자 요청 필요 영역 (❌)
- 시안 명세 없는 인터랙션/동작/라벨
- BE API 미확정
- DS 표준 vs 시안 충돌
```

This file is verified by the PreToolUse hook (`~/.claude/hooks/pre-pr-create-check.sh`) before allowing `gh pr create` / `az repos pr create`.

### 8. Code generation rules

When implementing:
- prefer existing components
- prefer design tokens over hardcoded values
- keep layout responsive
- avoid creating duplicate components
- **NEVER write code for areas with missing or ambiguous design spec** — report to the user immediately and wait for designer/PD spec. Do NOT write TODO/placeholder/estimation code. (SAIGE 2026-06-09 hallucination ban rule)

## Never Do

- Do not fetch the entire Figma file blindly.
- Do not call `get_design_context` on a huge root frame first.
- Do not implement before producing an inventory.
- Do not treat archived, WIP, or ignored frames as production screens.
- Do not overwrite existing design system components without checking usage.
- Do not bypass the project's design tokens — always go through tokens defined in the codebase (e.g. `vars.*`, `spacing.*`, `radius.*`).

## Related skills (project-specific layers)

- `saige-ds-figma-to-vex` — SAIGE-specific Tailwind→vanilla-extract mapping rules and asset name conventions (`data-name="funnel_simple"` → `IconFunnelSimple`)
- `saige-pr-create` — SAIGE PR creation enforcement (this skill is auto-called as step 1; discovery report verified by hook)
- SAIGE workflow violations memory: `[[feedback-workflow-violations]]` — read before each PR cycle to refresh awareness of recurring gaps

## Convention reference

If the project uses naming hints (`@screen`, `@ignore`, etc.), check the project's CLAUDE.md for the agreed-upon set. Naming hints are optional and improve accuracy when adopted; without them, fall back to the heuristics in step 3.
