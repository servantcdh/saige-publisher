#!/usr/bin/env node
/**
 * append-self-eval.mjs
 *
 * saige-ds-visual-verify / saige-product-visual-verify가 산출한
 * fidelity-score.json(자칭 vs 실측)을 _self_evaluation_log.json의 biasLog에
 * 자동 append하고, 신뢰도(currentTrustScore)를 규칙대로 갱신한다.
 *
 * 끊겨 있던 "자동 append 배선"의 실제 구현체. 두 visual-verify skill이 6단계
 * 직후 이 스크립트를 호출한다. 본인 직관이 아니라 실측 갭으로 신뢰도를 움직이는
 * 단일 진입점.
 *
 * 사용:
 *   node append-self-eval.mjs --from-file /tmp/visual-verify-poc/SDS-217-fidelity-score.json
 *   node append-self-eval.mjs --ticket SDS-217 --track ds --self-claim 79 --measured 87.3
 *   node append-self-eval.mjs --from-file <f> --dry-run         # 쓰지 않고 결과만 출력
 *   node append-self-eval.mjs --from-file <f> --log <path>      # 대상 로그 경로 override (테스트용)
 *
 * 신뢰도 델타 규칙 (biasRules, JSON에도 명문화):
 *   gap = selfClaim - measured        (부호 있음. + = 과대 평가 = 위험 방향)
 *   |gap| ≤ 5   → +3  (calibrated, recovery)
 *   gap  > 10   → -5  (overclaim, 위험)
 *   gap  < -10  →  0  (underclaim, 안전하지만 보상 없음)
 *   그 외        →  0  (neutral)
 *   trustAfter = clamp(current + delta, 0, 100)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { selfEvalLog } from './saige-paths.mjs';

// 경로는 saige-paths.mjs가 해석 (env SAIGE_SELF_EVAL_LOG → 동호님 기본값 폴백)
const DEFAULT_LOG = selfEvalLog;

// ---- arg 파싱 (의존성 0) ----
function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--from-file': out.fromFile = next(); break;
      case '--log': out.log = next(); break;
      case '--ticket': out.ticket = next(); break;
      case '--track': out.track = next(); break;        // 'ds' | 'product'
      case '--self-claim': out.selfClaim = Number(next()); break;
      case '--measured': out.measured = Number(next()); break;
      case '--date': out.date = next(); break;          // YYYY-MM-DD
      case '--note': out.note = next(); break;
      case '--dry-run': out.dryRun = true; break;
      default:
        throw new Error(`알 수 없는 인자: ${a}`);
    }
  }
  return out;
}

const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function trustDelta(gap) {
  const absGap = Math.abs(gap);
  if (absGap <= 5) return 3;     // 잘 보정됨 → 회복
  if (gap > 10) return -5;       // 과대 평가 = 위험 방향
  return 0;                      // 과소(안전) 또는 5~10 구간 = 중립
}

function direction(gap) {
  if (gap > 5) return 'overclaim';
  if (gap < -5) return 'underclaim';
  return 'calibrated';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const logPath = args.log || DEFAULT_LOG;

  // fidelity-score.json 또는 명시 인자에서 입력 확보
  let ticket = args.ticket;
  let track = args.track;
  let selfClaim = args.selfClaim;
  let measured = args.measured;
  let date = args.date;
  let note = args.note;

  if (args.fromFile) {
    const f = JSON.parse(readFileSync(args.fromFile, 'utf8'));
    ticket ??= f.ticket;
    selfClaim ??= f.selfClaim;
    measured ??= f.avgScore;
    track ??= f.track;
    // fidelity-score.json의 timestamp에서 날짜 도출 (시스템 시계 의존 회피)
    if (!date && f.timestamp) date = String(f.timestamp).slice(0, 10);
  }

  if (ticket == null || selfClaim == null || measured == null) {
    throw new Error(
      'ticket / selfClaim / measured 가 모두 필요합니다 (--from-file 또는 명시 인자).',
    );
  }
  track ??= 'unknown';
  if (!date) date = new Date().toISOString().slice(0, 10);

  const gap = round1(selfClaim - measured);
  const delta = trustDelta(gap);
  const dir = direction(gap);

  // 로그 read/modify/write
  const log = JSON.parse(readFileSync(logPath, 'utf8'));
  const before = log.currentTrustScore;
  const after = clamp(before + delta, 0, 100);

  const entry = {
    date,
    ticket,
    track,
    selfClaim,
    measured: round1(measured),
    biasGap: gap,
    direction: dir,
    trustDelta: delta,
    trustAfter: after,
    ...(note ? { note } : {}),
  };

  log.biasLog = log.biasLog || [];
  log.biasLog.push(entry);

  if (delta !== 0) {
    log.currentTrustScore = after;
    log.trustScoreHistory = log.trustScoreHistory || [];
    log.trustScoreHistory.push({
      date,
      from: before,
      to: after,
      reason:
        `${ticket} visual-verify ${dir} — 자칭 ${selfClaim} vs 실측 ${round1(measured)} ` +
        `(gap ${gap > 0 ? '+' : ''}${gap}%p) → ${delta > 0 ? '+' : ''}${delta}`,
    });
  }

  // lastUpdated는 입력 timestamp(있으면) 우선, 없으면 시스템
  log.lastUpdated =
    (args.fromFile &&
      (() => {
        try {
          return JSON.parse(readFileSync(args.fromFile, 'utf8')).timestamp;
        } catch {
          return null;
        }
      })()) ||
    new Date().toISOString();

  const serialized = JSON.stringify(log, null, 2) + '\n';

  if (args.dryRun) {
    console.log('── DRY RUN (쓰지 않음) ──');
    console.log('append할 biasLog 항목:');
    console.log(JSON.stringify(entry, null, 2));
    console.log(`\n신뢰도: ${before} → ${after} (delta ${delta >= 0 ? '+' : ''}${delta})`);
    return;
  }

  writeFileSync(logPath, serialized);
  console.log(`✅ biasLog append 완료 → ${logPath}`);
  console.log(`   ${ticket} [${track}] gap ${gap > 0 ? '+' : ''}${gap}%p (${dir})`);
  console.log(`   신뢰도: ${before} → ${after} (delta ${delta >= 0 ? '+' : ''}${delta})`);
}

main();
