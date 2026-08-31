import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

// Live ROM receipt for AI_CV_Protect's FIRST rung and its user-status routes
// (`data/battle_ai_scripts.s:1894-1935`, ISSUES #137). Both arms are the same
// two-turn Level-50 Factory matchup and differ in exactly one bit of battle
// state -- the AI user's STATUS2_CURSED -- so they enter the decision at the
// identical RNG value:
//
//   AI user   Dusclops (FRONTIER_MON_DUSCLOPS_4, pure Ghost, single-ability
//             Pressure) with [Protect, Splash, Splash, Splash].
//   player    Gengar (pure single-ability Levitate) with four copies of its
//             one move: Splash (control) or Curse (reach).
//
// Turn 1 the AI user protects (Protect scores 101-102 vs Splash's flat 100,
// so it is the unique best move whatever the roll) -- Protect is priority +3,
// so it acts first and `sProtectSuccessRates[0] == 0xFFFF` always succeeds:
// `gDisableStructs[1].protectUses == 1` at the turn-2 decision in BOTH arms.
// MOVE_CURSE's `.flags == 0` (no FLAG_PROTECT_AFFECTED), so the Ghost Curse
// lands THROUGH the AI's Protect; the AI user is STATUS2_CURSED (0x10000000)
// when it decides on turn 2.
//
//   control (healthy, protectUses 1): +2 (ScoreUp2) -> `AI_CV_Protect2`'s
//     `if_random_less_than 128` -> `AI_CV_Protect4`'s `if_equal 0` fails ->
//     score -1 and a SECOND `if_random_less_than 128`. TWO CV draws;
//     decision = setup 4 + 2 + tie 1 = 7.
//   reach   (cursed, protectUses 1): `if_status2 AI_USER, STATUS2_CURSED,
//     AI_CV_Protect3` -> `get_last_used_bank_move AI_TARGET` is EFFECT_CURSE,
//     not EFFECT_LOCK_ON, so it ends at +-0 with ZERO CV draws;
//     decision = setup 4 + 0 + tie 1 = 5.
//
// The un-fixed port (`runCvProtect` before #137) has neither the
// `get_protect_count > 1` rung nor the three user-status routes, so it runs
// the ordinary +2/two-roll path in BOTH arms: 7 draws and a different RNG
// endpoint on the reach arm. That pre-fix divergence is banked in the
// receipt's `engineDivergence` block and never re-derived.

const SEEDS = [1, 5, 99] as const;
const ARMS = ["control", "reach"] as const;
type Arm = typeof ARMS[number];

const RECEIPT_PATH = "tools/probe/receipts/factory-ai-protect-live.json";
const MOVE_PROTECT = 182;
const MOVE_SPLASH = 150;
const MOVE_CURSE = 174;
const STATUS2_CURSED = 0x10000000;
const AI_MOVES = [MOVE_PROTECT, MOVE_SPLASH, MOVE_SPLASH, MOVE_SPLASH] as const;
const AI_START_PP = [10, 40, 40, 40] as const;
// Turn 1 is byte-identical across seeds (the AI's turn-1 Protect is forced by
// score, and no move in either arm rolls damage), so one fixed 256-frame
// window per arm brackets the turn-2 decision for every seed.
const CAPTURE_START: Readonly<Record<Arm, number>> = { control: 340, reach: 600 };
const DENSE_FRAMES = 192;
const TRACE_LAST_FRAME = 1072;

type Battler = Readonly<{
  species: number;
  hp: number;
  maxHp: number;
  level: number;
  pp: readonly number[];
  status1: number;
  status2: number;
  status3: number;
  types: readonly [number, number];
  stats: Readonly<{ attack: number; defense: number; speed: number; spAttack: number; spDefense: number }>;
}>;
type Capture = Readonly<{
  frame: number;
  state: { rngValue: number; battlers: { player: Battler; opponent: Battler } };
}>;

function rngStep(value: number): number {
  return (Math.imul(1103515245, value) + 24691) >>> 0;
}

function stepsToReach(start: number, target: number, maxSteps = 40): number | null {
  let value = start;
  for (let steps = 1; steps <= maxSteps; steps += 1) {
    value = rngStep(value);
    if (value === target) return steps;
  }
  return null;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run(arm: Arm, seed: number): Promise<Capture[]> {
  const fixture = JSON.parse(
    readFileSync(`tools/battle-lab/mechanic-factory-ai-cv-protect-${arm}-off.json`, "utf8"),
  );
  fixture.seed = seed;
  // Dense over the decision, then a coarse tail so the chosen move's PP
  // delta is still observed inside the lab's 256-capture cap.
  const dense = Array.from({ length: DENSE_FRAMES }, (_, index) => CAPTURE_START[arm] + index);
  const sparse: number[] = [];
  for (let frame = dense[dense.length - 1]! + 8; frame <= TRACE_LAST_FRAME; frame += 8) {
    sparse.push(frame);
  }
  fixture.trace.captureFrames = [...dense, ...sparse].slice(0, 256);
  const response = await fetch(`${oracleUrlForProfile("battle-scene-off")}/v1/battle-lab/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(fixture),
  });
  if (!response.ok) throw new Error(`battle-lab HTTP ${response.status}: ${await response.text()}`);
  return ((await response.json()) as { captures: Capture[] }).captures;
}

const request = createBattleCommandRequest({
  kind: "command",
  requestId: 1,
  side: "trainer",
  battler: 1,
  legalDecisions: [0, 1, 2, 3].map((moveSlot) => ({
    kind: "use-move" as const,
    moveSlot,
    targetBattler: 0,
  })),
});
const NEUTRAL_STAGES = Object.freeze({
  atk: 6, def: 6, spAtk: 6, spDef: 6, speed: 6, acc: 6, evasion: 6,
});
const TYPE_NAMES: Readonly<Record<number, string>> = {
  0: "TYPE_NORMAL", 1: "TYPE_FIGHTING", 2: "TYPE_FLYING", 3: "TYPE_POISON",
  4: "TYPE_GROUND", 5: "TYPE_ROCK", 6: "TYPE_BUG", 7: "TYPE_GHOST", 8: "TYPE_STEEL",
  10: "TYPE_FIRE", 11: "TYPE_WATER", 12: "TYPE_GRASS", 13: "TYPE_ELECTRIC",
  14: "TYPE_PSYCHIC", 15: "TYPE_ICE", 16: "TYPE_DRAGON", 17: "TYPE_DARK",
};

function typesOf(battler: Battler): readonly [string, string] {
  const first = TYPE_NAMES[battler.types[0]];
  const second = TYPE_NAMES[battler.types[1]];
  assert(first !== undefined && second !== undefined, `unmapped type ${battler.types.join("/")}`);
  return [first, second];
}

/**
 * The scored view the ROM itself is looking at when it commits the turn-2
 * decision: every stat, HP and status word is read out of the ROM capture at
 * the frame the 4-draw `BattleAI_SetupAIData` burst starts on.
 */
function viewAt(arm: Arm, capture: Capture): FactoryAiScoredView {
  const attacker = capture.state.battlers.opponent;
  const target = capture.state.battlers.player;
  const playerMove = arm === "reach" ? MOVE_CURSE : MOVE_SPLASH;
  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
    factory: Object.freeze({
      levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
    }),
    moves: AI_MOVES,
    attacker: Object.freeze({
      types: typesOf(attacker),
      attack: attacker.stats.attack,
      defense: attacker.stats.defense,
      spAttack: attacker.stats.spAttack,
      spDefense: attacker.stats.spDefense,
      speed: attacker.stats.speed,
      level: attacker.level,
      statStages: NEUTRAL_STAGES,
      // gDisableStructs[].isFirstTurn is 2 on send-out and decays once per
      // turn end, so the lead's turn-2 decision reads 1.
      isFirstTurn: 1,
      hp: attacker.hp,
      maxHp: attacker.maxHp,
      ability: "ABILITY_PRESSURE",
      // Turn 1's Protect succeeded (priority +3 => it acted first, and
      // sProtectSuccessRates[0] is 0xFFFF).
      protectUses: 1,
      ...((attacker.status2 & STATUS2_CURSED) !== 0 ? { isCursed: true } : {}),
    }),
    target: Object.freeze({
      species: target.species,
      types: typesOf(target),
      attack: target.stats.attack,
      defense: target.stats.defense,
      spAttack: target.stats.spAttack,
      spDefense: target.stats.spDefense,
      speed: target.stats.speed,
      level: target.level,
      statStages: NEUTRAL_STAGES,
      isFirstTurn: 1,
      hp: target.hp,
      maxHp: target.maxHp,
      ability: "ABILITY_LEVITATE",
      knownAbility: null,
      lastUsedMoveId: playerMove,
      knownMoveIds: [playerMove],
    }),
  });
}

type ArmRow = {
  seed: number;
  arm: Arm;
  captureDigest: string;
  decisionFrame: number;
  romDecisionDraws: number;
  romCvDraws: number;
  romRngBefore: number;
  romRngAfter: number;
  romChosenMoveSlot: number;
  romChosenMoveId: number;
  attackerCursed: boolean;
  attackerProtectUses: number;
  view: FactoryAiScoredView;
  engineDecisionDraws: number;
  engineRngAfter: number;
  engineChosenMoveSlot: number;
  engineCheckViabilityDeltas: readonly (number | null | undefined)[];
  matchesRom: boolean;
};

const rows: ArmRow[] = [];

for (const seed of SEEDS) {
  for (const arm of ARMS) {
    const [captures, rerun] = [await run(arm, seed), await run(arm, seed)];
    const digest = createHash("sha256").update(JSON.stringify(captures)).digest("hex");
    const rerunDigest = createHash("sha256").update(JSON.stringify(rerun)).digest("hex");
    assert(digest === rerunDigest, `${seed}/${arm}: rerun diverged (${digest} vs ${rerunDigest})`);

    const denseLastFrame = CAPTURE_START[arm] + DENSE_FRAMES - 1;
    const dense = captures.filter((capture) => capture.frame <= denseLastFrame);
    const transitions = dense.slice(0, -1)
      .map((capture, index) => ({ before: capture, after: dense[index + 1]! }))
      .filter(({ before, after }) => before.state.rngValue !== after.state.rngValue)
      .map((pair) => ({
        ...pair,
        steps: stepsToReach(pair.before.state.rngValue, pair.after.state.rngValue),
      }));
    // BattleAI_SetupAIData's four simulatedRNG draws land in one frame; the
    // whole CheckViability + ChooseMoveOrAction tie tail lands in the next.
    const setupIndex = transitions.findIndex((transition, index) => (
      transition.steps === 4
      && transitions[index + 1] !== undefined
      && transitions[index + 1]!.before.state.rngValue === transition.after.state.rngValue
      && (transitions[index + 1]!.steps ?? 0) >= 1
    ));
    assert(setupIndex >= 0, `${seed}/${arm}: no 4-draw AI setup burst in the capture window`);
    const setup = transitions[setupIndex]!;
    const tail = transitions[setupIndex + 1]!;
    const decisionDraws = 4 + tail.steps!;

    const attackerAtDecision = setup.before.state.battlers.opponent;
    assert(
      ((attackerAtDecision.status2 & STATUS2_CURSED) !== 0) === (arm === "reach"),
      `${seed}/${arm}: STATUS2_CURSED is ${attackerAtDecision.status2}, wrong for this arm`,
    );
    assert(
      attackerAtDecision.pp[0] === AI_START_PP[0] - 1,
      `${seed}/${arm}: AI user did not spend exactly one Protect PP on turn 1 (pp ${attackerAtDecision.pp.join(",")})`,
    );
    const executed = captures.find((capture) => (
      capture.frame > tail.after.frame
      && capture.state.battlers.opponent.pp.some((pp, slot) => pp !== attackerAtDecision.pp[slot])
    ));
    assert(executed, `${seed}/${arm}: the chosen move never executed inside the window`);
    const chosenSlot = executed.state.battlers.opponent.pp.findIndex(
      (pp, slot) => pp !== attackerAtDecision.pp[slot],
    );

    const view = viewAt(arm, setup.before);
    const engine = chooseFactoryAiScoredDecision({
      view,
      request,
      rng: { value: setup.before.state.rngValue, calls: 0 },
    });
    const engineChoice = engine.trace.tie.chosenDecision;
    assert(engineChoice.kind === "use-move", `${seed}/${arm}: engine did not choose a move`);
    const matchesRom = engine.trace.draws.length === decisionDraws
      && engine.rng.value === tail.after.state.rngValue
      && engineChoice.moveSlot === chosenSlot;

    rows.push({
      seed,
      arm,
      captureDigest: digest,
      decisionFrame: setup.before.frame,
      romDecisionDraws: decisionDraws,
      romCvDraws: decisionDraws - 5,
      romRngBefore: setup.before.state.rngValue,
      romRngAfter: tail.after.state.rngValue,
      romChosenMoveSlot: chosenSlot,
      romChosenMoveId: AI_MOVES[chosenSlot]!,
      attackerCursed: (attackerAtDecision.status2 & STATUS2_CURSED) !== 0,
      attackerProtectUses: 1,
      view,
      engineDecisionDraws: engine.trace.draws.length,
      engineRngAfter: engine.rng.value,
      engineChosenMoveSlot: engineChoice.moveSlot,
      engineCheckViabilityDeltas: engine.trace.slotScores.map((slot) => slot.checkViabilityDelta),
      matchesRom,
    });
    console.log(
      `${matchesRom ? "PASS" : "DIVERGE"} seed ${seed} ${arm}: ROM ${decisionDraws} draws `
      + `(4 setup + ${decisionDraws - 5} CV + 1 tie), chose slot ${chosenSlot} (move ${AI_MOVES[chosenSlot]}), `
      + `rng ${setup.before.state.rngValue} -> ${tail.after.state.rngValue}; engine `
      + `${engine.trace.draws.length} draws -> ${engine.rng.value} slot ${engineChoice.moveSlot}; digest ${digest.slice(0, 16)}`,
    );
  }
}

const previous = existsSync(RECEIPT_PATH)
  ? JSON.parse(readFileSync(RECEIPT_PATH, "utf8")) as { engineDivergence?: unknown }
  : {};
const engineDivergence = previous.engineDivergence ?? rows.map((row) => ({
  seed: row.seed,
  arm: row.arm,
  romDecisionDraws: row.romDecisionDraws,
  preFixEngineDecisionDraws: row.engineDecisionDraws,
  preFixEngineRngAfter: row.engineRngAfter,
  preFixEngineChosenMoveSlot: row.engineChosenMoveSlot,
  diverges: !row.matchesRom,
}));

writeFileSync(RECEIPT_PATH, `${JSON.stringify({
  schema: "factory-ai-protect-live-receipt/v1",
  issue: 137,
  source: "data/battle_ai_scripts.s:1894-1935 (AI_CV_Protect)",
  probe: "tools/probe/verify-factory-ai-protect-live.ts",
  fixtures: ARMS.map((arm) => `tools/battle-lab/mechanic-factory-ai-cv-protect-${arm}-off.json`),
  oracleProfile: "battle-scene-off",
  captureStart: CAPTURE_START,
  arms: rows,
  engineDivergence,
}, null, 2)}\n`);
console.log(`wrote ${RECEIPT_PATH}`);
if (rows.some((row) => !row.matchesRom)) {
  console.log("NOTE: at least one arm diverges from the kernel (expected before the #137 fix).");
}
