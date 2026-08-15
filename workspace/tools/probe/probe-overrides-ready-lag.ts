// Probe: does `overrides.parties` staging itself shift the battle-start
// ready-lag gate (`generatedBattleStartCommandReady`)?
//
// docs/trainer-pic-off-window-scout.md round 11 / PROGRESS.md 1261 found a
// flat +7-tick lag between the app's formula-predicted ready frame and the
// oracle's own menu-open frame, reproduced identically across two different
// opponent species. Both reproducing fixtures build the oracle party via
// `overrides.parties` (mechanicLab / factoryBrain-with-pinned-parties); all
// three previously-validated exact ready-lag points use real `factoryLegal`
// rental generation with no override. This script isolates the staging
// mechanism as a variable: it runs a `factoryLegal` scenario once, reads back
// the ROM-generated parties from the semantic capture, then reruns the exact
// same route through `mechanicLab` with `overrides.parties` pinned to
// byte-for-byte the same six Pokemon. Because the parties are identical,
// every downstream battle event should be identical too; any per-frame sha256
// delta in the dense send-out-to-ready capture stream is then attributable to
// the staging mechanism alone, not to species/cry differences.
//
// Usage:
//   node --experimental-strip-types tools/probe/probe-overrides-ready-lag.ts
//   node --experimental-strip-types tools/probe/probe-overrides-ready-lag.ts --brain

const ORACLE_URL =
  process.env.POKEBENCH_ORACLE_URL ??
  process.env.POKEBENCH_MAIN_ORACLE_URL ??
  "http://127.0.0.1:8014";
const PROFILE = "battle-scene-off";

interface Ivs {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  spAttack: number;
  spDefense: number;
}

interface PersistentMon {
  species: number;
  level: number;
  nature: number;
  ivs: Ivs;
  evs: Ivs;
  moves: number[];
  ppUps: number[];
  item: number;
  abilitySlot: number;
  friendship: number;
  personality: number;
  gender: "male" | "female" | "genderless";
  shiny: boolean;
}

interface Capture {
  frame: number;
  sha256: string;
  pngBase64?: string;
  state?: {
    engine?: {
      playerControllerCommand?: number;
      controllerExecFlags?: number;
    };
    parties?: {
      player: PersistentMon[];
      opponent: PersistentMon[];
    };
  };
}

interface BattleLabResponse {
  totalFrames: number;
  captures: Capture[];
  battleLab?: {
    preCheckpointCaptures?: Capture[];
    opponentParty?: PersistentMon[];
    fixedIv?: number;
  };
}

async function postBattleLab(body: Record<string, unknown>): Promise<BattleLabResponse> {
  const response = await fetch(`${ORACLE_URL}/v1/battle-lab/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profile: PROFILE, ...body }),
  });
  if (!response.ok) {
    throw new Error(
      `oracle /v1/battle-lab/run failed: HTTP ${response.status}: ${await response.text()}`,
    );
  }
  return (await response.json()) as BattleLabResponse;
}

// Only the fields `overrides.parties` accepts (oracle/BATTLE_LAB.md
// "Mechanic Lab complete-party builder") — the echo carries extra derived
// fields (experience, pp, ability, types, hp/maxHp, stats, otId, status,
// checksumValid) that the builder does not take as input.
function toOverride(mon: PersistentMon): Record<string, unknown> {
  return {
    species: mon.species,
    level: mon.level,
    nature: mon.nature,
    ivs: mon.ivs,
    evs: mon.evs,
    moves: mon.moves,
    ppUps: mon.ppUps,
    item: mon.item,
    abilitySlot: mon.abilitySlot,
    friendship: mon.friendship,
    gender: mon.gender,
    shiny: mon.shiny,
    personality: mon.personality,
  };
}

function readyFrame(captures: Capture[]): number | null {
  for (const capture of captures) {
    const engine = capture.state?.engine;
    if (engine?.playerControllerCommand === 18 && engine?.controllerExecFlags === 1) {
      return capture.frame;
    }
  }
  return null;
}

// Collapse a same-order, same-content transition sequence into contiguous
// offset segments. "Transitions" are frames whose sha256 differs from the
// previous frame's — the informative event boundaries (text box updates,
// throw-visible, materialize, menu-open) as opposed to the long static runs
// between them, where any nearby frame's sha is indistinguishable from any
// other and per-frame offset search is ambiguous.
function transitions(captures: Capture[]): Array<{ frame: number; sha: string }> {
  const result: Array<{ frame: number; sha: string }> = [];
  let prevSha: string | null = null;
  for (const capture of captures) {
    if (capture.sha256 !== prevSha) {
      result.push({ frame: capture.frame, sha: capture.sha256 });
      prevSha = capture.sha256;
    }
  }
  return result;
}

interface OffsetSegment {
  fromIndex: number;
  toIndex: number;
  baseFromFrame: number;
  pinnedFromFrame: number;
  offset: number;
}

interface DifferentialResult {
  label: string;
  verdict: string;
  guilty: boolean;
  baseFrameCount: number;
  pinnedFrameCount: number;
  contentMatches: boolean;
  segments: OffsetSegment[];
  baseReadyFrame: number | null;
  pinnedReadyFrame: number | null;
}

function diffTransitionOffsets(
  baseCaptures: Capture[],
  pinnedCaptures: Capture[],
): { contentMatches: boolean; segments: OffsetSegment[]; mismatchIndex: number | null } {
  const baseTrans = transitions(baseCaptures);
  const pinnedTrans = transitions(pinnedCaptures);
  const n = Math.min(baseTrans.length, pinnedTrans.length);
  let mismatchIndex: number | null = null;
  for (let i = 0; i < n; i++) {
    if (baseTrans[i].sha !== pinnedTrans[i].sha) {
      mismatchIndex = i;
      break;
    }
  }
  const contentMatches =
    mismatchIndex === null && baseTrans.length === pinnedTrans.length;

  const segments: OffsetSegment[] = [];
  let segStart = 0;
  const offsetAt = (i: number) => pinnedTrans[i].frame - baseTrans[i].frame;
  for (let i = 1; i <= n; i++) {
    if (i === n || offsetAt(i) !== offsetAt(segStart)) {
      segments.push({
        fromIndex: segStart,
        toIndex: i - 1,
        baseFromFrame: baseTrans[segStart].frame,
        pinnedFromFrame: pinnedTrans[segStart].frame,
        offset: offsetAt(segStart),
      });
      segStart = i;
    }
  }
  return { contentMatches, segments, mismatchIndex };
}

async function runDifferential(
  label: string,
  baseScenario: Record<string, unknown>,
  buildPinnedScenario: (parties: { player: PersistentMon[]; opponent: PersistentMon[] }) => Record<string, unknown>,
): Promise<DifferentialResult> {
  console.log(`\n=== ${label}: base (factoryLegal/factoryBrain, no override) ===`);
  const baseResult = await postBattleLab(baseScenario);
  const baseParties = baseResult.captures[0]?.state?.parties;
  if (!baseParties) {
    throw new Error(`${label}: base run's postcheckpoint capture had no state.parties`);
  }
  console.log(
    `  base party: player=[${baseParties.player.map((m) => m.species).join(",")}] ` +
      `opponent=[${baseParties.opponent.map((m) => m.species).join(",")}]`,
  );

  const pinnedScenario = buildPinnedScenario(baseParties);
  console.log(`=== ${label}: pinned (mechanicLab/factoryBrain, overrides.parties = base echo) ===`);
  const pinnedResult = await postBattleLab(pinnedScenario);
  const pinnedParties = pinnedResult.captures[0]?.state?.parties;
  if (pinnedParties) {
    console.log(
      `  pinned party: player=[${pinnedParties.player.map((m) => m.species).join(",")}] ` +
        `opponent=[${pinnedParties.opponent.map((m) => m.species).join(",")}]`,
    );
  }

  const baseCaptures = baseResult.battleLab?.preCheckpointCaptures ?? [];
  const pinnedCaptures = pinnedResult.battleLab?.preCheckpointCaptures ?? [];
  if (baseCaptures.length === 0 || pinnedCaptures.length === 0) {
    throw new Error(`${label}: missing battleLab.preCheckpointCaptures on one or both runs`);
  }
  console.log(`  base preCheckpoint frames: ${baseCaptures.length}, pinned: ${pinnedCaptures.length}`);

  const baseReadyFrame = readyFrame(baseCaptures);
  const pinnedReadyFrame = readyFrame(pinnedCaptures);
  console.log(
    `  ready-gate frame (playerControllerCommand==18 && controllerExecFlags==1): ` +
      `base=${baseReadyFrame ?? "not reached"}, pinned=${pinnedReadyFrame ?? "not reached"}` +
      (baseReadyFrame !== null && pinnedReadyFrame !== null
        ? `, delta=${pinnedReadyFrame - baseReadyFrame >= 0 ? "+" : ""}${pinnedReadyFrame - baseReadyFrame}`
        : ""),
  );

  const { contentMatches, segments, mismatchIndex } = diffTransitionOffsets(baseCaptures, pinnedCaptures);
  console.log(`  content-identical transition sequence: ${contentMatches}`);
  if (!contentMatches) {
    console.log(
      `  WARNING: transition sha content diverges at transition index ${mismatchIndex} — ` +
        `the two runs are not showing the same visual content, offsets below are not a clean ` +
        `timing-only comparison`,
    );
  }
  console.log(`  offset table (per contiguous transition-index run, base frame -> pinned frame):`);
  for (const seg of segments) {
    console.log(
      `    transitions [${seg.fromIndex}..${seg.toIndex}]: base frame ${seg.baseFromFrame} -> ` +
        `pinned frame ${seg.pinnedFromFrame}  offset ${seg.offset >= 0 ? "+" : ""}${seg.offset}`,
    );
  }

  const nonZero = segments.find((seg) => seg.offset !== 0);
  const guilty = contentMatches && nonZero !== undefined;
  const verdict = guilty
    ? `${label}: staging shifts ready-lag by ${nonZero!.offset >= 0 ? "+" : ""}${nonZero!.offset} ` +
      `at frame ${nonZero!.baseFromFrame} (base) / ${nonZero!.pinnedFromFrame} (pinned)`
    : contentMatches
      ? `${label}: staging is innocent — offsets all zero`
      : `${label}: INCONCLUSIVE — base and pinned runs show different content, not just different timing`;
  console.log(`  VERDICT: ${verdict}`);

  return {
    label,
    verdict,
    guilty,
    baseFrameCount: baseCaptures.length,
    pinnedFrameCount: pinnedCaptures.length,
    contentMatches,
    segments,
    baseReadyFrame,
    pinnedReadyFrame,
  };
}

// --- Scenario 1: ordinary factoryLegal trainer (the BATTLE_LAB.md example
// request), the same construction shape as the three already-validated
// 0-residual ready-lag points (real rental generation, no override). ---
const FACTORY_LEGAL_BASE = {
  schemaVersion: 1,
  mode: "factoryLegal",
  level: 50,
  challengeNum: 0,
  battleNum: 0,
  trainerId: 50,
  rentalSwapCount: 0,
  playerSetIds: [156, 149, 180],
  opponentSetIds: [188, 184, 135],
  seed: 305419896,
  preCheckpointCaptureAllFrames: true,
  trace: { segments: [], captureFrames: [0] },
};

function buildMechanicLabPinned(parties: { player: PersistentMon[]; opponent: PersistentMon[] }) {
  return {
    schemaVersion: 1,
    mode: "mechanicLab",
    level: 50,
    challengeNum: 0,
    battleNum: 0,
    trainerId: 50,
    rentalSwapCount: 0,
    playerSetIds: [156, 149, 180],
    opponentSetIds: [188, 184, 135],
    seed: 305419896,
    preCheckpointCaptureAllFrames: true,
    overrides: {
      parties: {
        player: parties.player.map(toOverride),
        opponent: parties.opponent.map(toOverride),
      },
    },
    trace: { segments: [], captureFrames: [0] },
  };
}

// --- Scenario 1b: the exact route tuple (trainerId 109, challengeNum 2,
// battleNum 0, seed 70) that the already-published +7-reproducing
// factory-mechanic-pupitar-delcatty-readylag-probe.json used for its
// mechanicLab side — reused here as the *base* (factoryLegal) side of a
// same-route differential, so this isn't just "override is innocent in
// general" but "override is innocent at the specific route depth the +7
// was actually observed at." ---
const FACTORY_LEGAL_BASE_MATCHED_ROUTE = {
  schemaVersion: 1,
  mode: "factoryLegal",
  level: 50,
  challengeNum: 2,
  battleNum: 0,
  trainerId: 109,
  rentalSwapCount: 0,
  playerSetIds: [267, 268, 269],
  opponentSetIds: [349, 353, 292],
  seed: 70,
  preCheckpointCaptureAllFrames: true,
  trace: { segments: [], captureFrames: [0] },
};

function buildMechanicLabPinnedMatchedRoute(parties: { player: PersistentMon[]; opponent: PersistentMon[] }) {
  return {
    schemaVersion: 1,
    mode: "mechanicLab",
    level: 50,
    challengeNum: 2,
    battleNum: 0,
    trainerId: 109,
    rentalSwapCount: 0,
    playerSetIds: [267, 268, 269],
    opponentSetIds: [349, 353, 292],
    seed: 70,
    preCheckpointCaptureAllFrames: true,
    overrides: {
      parties: {
        player: parties.player.map(toOverride),
        opponent: parties.opponent.map(toOverride),
      },
    },
    trace: { segments: [], captureFrames: [0] },
  };
}

// --- Scenario 2 (optional, --brain): factoryBrain, silver (challengeNum 2)
// — same real ROM generation on both sides (FillFactoryBrainParty for the
// opponent, rental generation for the player), same pin-back-through-
// overrides.parties pattern used by the two +7-reproducing fixtures. ---
const FACTORY_BRAIN_BASE = {
  schemaVersion: 1,
  mode: "factoryBrain",
  level: 50,
  challengeNum: 2,
  playerSetIds: [267, 268, 269],
  rentalSwapCount: 0,
  seed: 70,
  preCheckpointCaptureAllFrames: true,
  trace: { segments: [], captureFrames: [0] },
};

function buildFactoryBrainPinned(parties: { player: PersistentMon[]; opponent: PersistentMon[] }) {
  return {
    schemaVersion: 1,
    mode: "factoryBrain",
    level: 50,
    challengeNum: 2,
    playerSetIds: [267, 268, 269],
    rentalSwapCount: 0,
    seed: 70,
    preCheckpointCaptureAllFrames: true,
    overrides: {
      parties: {
        player: parties.player.map(toOverride),
        opponent: parties.opponent.map(toOverride),
      },
    },
    trace: { segments: [], captureFrames: [0] },
  };
}

async function main() {
  const runBrain = process.argv.includes("--brain");
  const results: DifferentialResult[] = [];

  results.push(
    await runDifferential("factoryLegal-vs-mechanicLab", FACTORY_LEGAL_BASE, buildMechanicLabPinned),
  );
  results.push(
    await runDifferential(
      "factoryLegal-vs-mechanicLab-matched-+7-route",
      FACTORY_LEGAL_BASE_MATCHED_ROUTE,
      buildMechanicLabPinnedMatchedRoute,
    ),
  );

  if (runBrain) {
    results.push(
      await runDifferential("factoryBrain-vs-factoryBrain+overrides", FACTORY_BRAIN_BASE, buildFactoryBrainPinned),
    );
  } else {
    console.log(
      "\n(skipping factoryBrain ± differential — pass --brain to include it; primary " +
        "factoryLegal-vs-mechanicLab differential above already answers the core question)",
    );
  }

  console.log("\n=== SUMMARY ===");
  for (const result of results) console.log(result.verdict);

  const anyGuilty = results.some((r) => r.guilty);
  const anyInconclusive = results.some((r) => !r.contentMatches);
  process.exitCode = anyInconclusive ? 2 : anyGuilty ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 3;
});
