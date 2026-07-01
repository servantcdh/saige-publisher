// saige-paths.mjs — SAIGE 스킬 공용 경로 해석 (이식성 단일 소스).
//
// 해석 우선순위: 환경변수 → `~/Documents` 표준 레이아웃 폴백.
// 비표준 위치에 클론한 협업자는 환경변수만 설정하면 됨 (README.md 참고).
// 하드코딩 `/Users/<특정사용자>` 제거 — homedir() 기반이라 동일 레이아웃이면 누구나 동작.
import { homedir } from 'node:os';
import { join } from 'node:path';

const home = homedir();

/** design-system 리포 루트 */
export const dsRoot = process.env.SAIGE_DS_ROOT || join(home, 'Documents', 'design-system');

/** safety-frontend 리포 루트 */
export const sfRoot = process.env.SAIGE_SF_ROOT || join(home, 'Documents', 'safety-frontend');

/** @saige-ai/icons 타입 선언 — 아이콘 레지스트리 권위 소스 (dsRoot에서 파생) */
export const iconsDts =
  process.env.SAIGE_ICONS_DTS ||
  join(dsRoot, 'node_modules', '@saige-ai', 'icons', 'dist', 'index.d.ts');

/** 스킬 저장소(saige-publisher) 루트 = Claude 스킬 발견 위치. install.sh의 CLAUDE_SKILLS_DIR와 일치. */
export const skillsRoot = process.env.CLAUDE_SKILLS_DIR || join(home, '.claude', 'skills');

/** style-fidelity 하네스 디렉토리 (dep-free 코어 — 드라이버가 여기서 props/fingerprint/diff import). */
export const styleFidelityDir =
  process.env.SAIGE_STYLE_FIDELITY_DIR || join(skillsRoot, '_shared', 'style-fidelity');

/**
 * self-eval 로그 (메모리).
 * Claude Code 프로젝트 슬러그가 사용자/프로젝트별이라 env 우선. 폴백은 동호님 기본값.
 */
export const selfEvalLog =
  process.env.SAIGE_SELF_EVAL_LOG ||
  join(
    home,
    '.claude',
    'projects',
    '-Users-donghochoi-Documents-safety-frontend',
    'memory',
    '_self_evaluation_log.json',
  );
