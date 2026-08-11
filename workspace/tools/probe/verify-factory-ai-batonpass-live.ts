import { readFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

// Real-ROM receipt for AI_CV_BatonPass (battle_ai_scripts.s:1978-2016).
// The two complete-party twins use the same Machoke -> Magikarp -> Aipom
// route. Two real Seismic Tosses leave Aipom at 30/130 HP; reach then uses
// one real Swagger (only Attack is stage 8), while control uses one real
// Confuse Ray (all stages remain neutral). The fixed controller timeline is
// generated from the committed Psych Up fixture cadence, not broad A-spam.

const SEEDS = [3, 23] as const;
const ROLES = ["reach", "control"] as const;
const AIPOM = 190;
const MACHOKE = 67;
const BATON_PASS = 226;
const SCRATCH = 10;
const SEISMIC_TOSS = 69;
const SWAGGER = 207;
const CONFUSE_RAY = 109;
const START_AIPOM_PP = [40, 35, 35, 35] as const;

type Role = (typeof ROLES)[number];
type Battler = {
  partyIndex: number;
  species: number;
  hp: number;
  maxHp: number;
  pp: number[];
  stats: { attack: number; defense: number; speed: number; spAttack: number; spDefense: number };
  statStages: number[];
  moves: number[];
  types: number[];
  ability: number;
  status2: number;
};
type PartyRecord = { checksumValid: boolean; hp: number; species: number };
type Capture = {
  frame: number;
  state: {
    rngValue: number;
    battlers: { player: Battler; opponent: Battler };
    parties: { player: PartyRecord[]; opponent: PartyRecord[] };
  };
};
type Transition = Readonly<{ before: Capture; after: Capture }>;

function rngStep(value: number): number {
  return (Math.imul(1103515245, value) + 24691) >>> 0;
}

function stepsToReach(start: number, target: number, maxSteps = 64): number | null {
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

function denseFrames(start: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => start + index);
}

function captureFrames(role: Role): number[] {
  // Swagger's message/animation tail is longer than Confuse Ray's, but both
  // windows contain a unique 1 + 4 + 1 decision transition and its first PP
  // decrement. 160 + 96 is exactly the oracle's 256-capture ceiling.
  return role === "reach"
    ? [...denseFrames(2270, 160), ...denseFrames(2700, 96)]
    : [...denseFrames(2070, 160), ...denseFrames(2700, 96)];
}

async function run(role: Role, seed: number): Promise<Capture[]> {
  const path = `tools/battle-lab/mechanic-factory-ai-cv-batonpass-${role}-off.json`;
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  fixture.seed = seed;
  assert(fixture.profile === "battle-scene-off", `${seed}/${role}: fixture is not Scene OFF`);
  assert(fixture.overrides.battlers === undefined, `${seed}/${role}: legacy battlers override present`);
  assert(fixture.overrides.parties.player.length === 3, `${seed}/${role}: player party is not complete`);
  assert(fixture.overrides.parties.opponent.length === 3, `${seed}/${role}: opponent party is not complete`);
  fixture.trace.captureFrames = captureFrames(role);
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

const neutralStages = Object.freeze({
  atk: 6, def: 6, spAtk: 6, spDef: 6, speed: 6, acc: 6, evasion: 6,
});

function stageView(values: number[]) {
  return Object.freeze({
    atk: values[1]!,
    def: values[2]!,
    spAtk: values[4]!,
    spDef: values[5]!,
    speed: values[3]!,
    acc: values[6]!,
    evasion: values[7]!,
  });
}

function decisionTransitions(captures: Capture[], role: Role): readonly Transition[] {
  const transitions = captures.slice(0, -1)
    .map((before, index) => ({ before, after: captures[index + 1]! }))
    .filter(({ before, after }) => (
      after.frame === before.frame + 1
      && before.state.rngValue !== after.state.rngValue
      && before.state.battlers.opponent.species === AIPOM
      && after.state.battlers.opponent.species === AIPOM
    ));
  const indices = transitions
    .map((_, index, list) => {
      const boundary = list[index];
      const setup = list[index + 1];
      const tie = list[index + 2];
      if (boundary === undefined || setup === undefined || tie === undefined) return -1;
      if (stepsToReach(boundary.before.state.rngValue, boundary.after.state.rngValue) !== 1) return -1;
      if (boundary.after.state.rngValue !== setup.before.state.rngValue) return -1;
      if (stepsToReach(setup.before.state.rngValue, setup.after.state.rngValue) !== 4) return -1;
      if (setup.after.state.rngValue !== tie.before.state.rngValue) return -1;
      if (stepsToReach(tie.before.state.rngValue, tie.after.state.rngValue) !== 1) return -1;
      const opponent = boundary.before.state.battlers.opponent;
      const stagedAttack = opponent.statStages[1]!;
      const otherStages = opponent.statStages.filter((_, stage) => stage !== 1);
      if (opponent.hp !== 30 || opponent.maxHp !== 130) return -1;
      if (role === "reach" && !(stagedAttack === 8 && otherStages.every((stage) => stage === 6))) return -1;
      if (role === "control" && !opponent.statStages.every((stage) => stage <= 7)) return -1;
      return index;
    })
    .filter((index) => index >= 0);
  assert(indices.length === 1, `${role}: expected one 1 + 4 + 1 Baton Pass decision window, found ${indices.length}`);
  const index = indices[0]!;
  return transitions.slice(index, index + 3);
}

function firstPpDelta(captures: Capture[], afterFrame: number, seed: number, role: Role): Transition {
  const candidates = captures.slice(0, -1)
    .map((before, index) => ({ before, after: captures[index + 1]! }))
    .filter(({ before, after }) => (
      after.frame === before.frame + 1
      && after.frame > afterFrame
      && before.state.battlers.opponent.species === AIPOM
      && after.state.battlers.opponent.species === AIPOM
      && after.state.battlers.opponent.pp.some((pp, slot) => pp !== before.state.battlers.opponent.pp[slot])
    ));
  assert(candidates.length === 1, `${seed}/${role}: expected one first Aipom PP delta after decision, found ${candidates.length}`);
  return candidates[0]!;
}

function liveView(role: Role, player: Battler, opponent: Battler): FactoryAiScoredView {
  const statusMove = role === "reach" ? SWAGGER : CONFUSE_RAY;
  return Object.freeze({
    schema: "factory-ai-scored-view/v1",
    mode: "factory-level-50-singles",
    active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
    factory: Object.freeze({
      levelMode: 0, battleMode: 0, factoryWinStreak: 28, trainerOpponentId: 222,
    }),
    moves: [BATON_PASS, SCRATCH, SCRATCH, SCRATCH],
    attacker: Object.freeze({
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      attack: opponent.stats.attack,
      defense: opponent.stats.defense,
      spAttack: opponent.stats.spAttack,
      spDefense: opponent.stats.spDefense,
      speed: opponent.stats.speed,
      level: 50,
      statStages: stageView(opponent.statStages),
      isFirstTurn: 2,
      hp: opponent.hp,
      maxHp: opponent.maxHp,
      ability: "ABILITY_RUN_AWAY",
      usablePartyMons: 1,
      isConfused: opponent.status2 !== 0,
    }),
    target: Object.freeze({
      species: MACHOKE,
      types: ["TYPE_FIGHTING", "TYPE_FIGHTING"],
      attack: player.stats.attack,
      defense: player.stats.defense,
      spAttack: player.stats.spAttack,
      spDefense: player.stats.spDefense,
      speed: player.stats.speed,
      level: 50,
      statStages: neutralStages,
      isFirstTurn: 0,
      hp: player.hp,
      maxHp: player.maxHp,
      ability: "ABILITY_GUTS",
      knownAbility: null,
      knownMoveIds: [SEISMIC_TOSS, statusMove],
      lastUsedMoveId: statusMove,
      usablePartyMons: 2,
    }),
  });
}

for (const seed of SEEDS) {
  for (const role of ROLES) {
    const [captures, rerun] = await Promise.all([run(role, seed), run(role, seed)]);
    assert(JSON.stringify(captures) === JSON.stringify(rerun), `${seed}/${role}: rerun diverged`);

    const [boundary, setup, tie] = decisionTransitions(captures, role);
    const pre = boundary.before;
    const player = pre.state.battlers.player;
    const opponent = pre.state.battlers.opponent;
    assert(player.species === MACHOKE && opponent.species === AIPOM, `${seed}/${role}: wrong active pair`);
    assert(player.stats.speed === 65 && opponent.stats.speed === 105, `${seed}/${role}: target speed gate is wrong`);
    assert(player.pp[0] === 17, `${seed}/${role}: two Aipom Seismic Toss hits were not staged after the relay KO`);
    assert(player.pp[1] === (role === "reach" ? 14 : 9), `${seed}/${role}: status move did not execute exactly once`);
    assert(opponent.hp === 30 && opponent.maxHp === 130, `${seed}/${role}: Aipom HP boundary is wrong`);
    assert(opponent.moves.join(",") === `${BATON_PASS},${SCRATCH},${SCRATCH},${SCRATCH}`, `${seed}/${role}: Aipom loadout differs`);
    assert(pre.state.parties.player.length === 3 && pre.state.parties.opponent.length === 3, `${seed}/${role}: parties were not retained`);
    assert(
      pre.state.parties.player.concat(pre.state.parties.opponent).every((party) => party.checksumValid),
      `${seed}/${role}: a party checksum is invalid`,
    );

    const engine = chooseFactoryAiScoredDecision({
      view: liveView(role, player, opponent),
      request,
      rng: { value: pre.state.rngValue, calls: 0 },
      turnStartRandomNumber: { owner: "decision" },
    });
    const chosen = engine.trace.tie.chosenDecision;
    assert(chosen.kind === "use-move", `${seed}/${role}: engine did not choose a move`);
    const ppTransition = firstPpDelta(captures, tie.after.frame, seed, role);
    const ppSlot = ppTransition.after.state.battlers.opponent.pp.findIndex(
      (pp, slot) => pp !== ppTransition.before.state.battlers.opponent.pp[slot],
    );
    const drawKinds = engine.trace.draws.map((draw) => draw.kind);
    assert(engine.trace.turnStartRandomNumber.owner === "decision", `${seed}/${role}: BattleTurnPassed ownership is implicit`);
    assert(engine.trace.draws.length === 6, `${seed}/${role}: expected exactly 6 decision draws`);
    assert(
      JSON.stringify(drawKinds) === JSON.stringify([
        "turn-start-random-number",
        "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng", "setup-simulated-rng",
        "best-move-tie",
      ]),
      `${seed}/${role}: draw kinds differ: ${drawKinds.join(",")}`,
    );
    assert(engine.rng.value === tie.after.state.rngValue, `${seed}/${role}: endpoint RNG differs`);
    assert(chosen.moveSlot === ppSlot, `${seed}/${role}: ROM PP-selected slot ${ppSlot} differs from engine ${chosen.moveSlot}`);
    assert(
      engine.trace.slotScores[0]!.checkViabilityDelta === (role === "reach" ? 0 : -2),
      `${seed}/${role}: Baton Pass CV gate differs`,
    );
    assert(
      role === "reach" ? ppSlot === 0 : ppSlot !== 0,
      `${seed}/${role}: ROM did not expose the staged Baton Pass split`,
    );

    console.log(`PASS ${JSON.stringify({
      seed,
      role,
      decisionPreFrame: pre.frame,
      ppFrame: ppTransition.after.frame,
      ppSlot,
      targetHp: player.hp,
      rngStart: pre.state.rngValue,
      rngEnd: engine.rng.value,
      drawKinds,
      cbmDeltas: engine.trace.slotScores.map((slot) => slot.checkBadMoveDelta),
      ttfDeltas: engine.trace.slotScores.map((slot) => slot.tryToFaintDelta),
      cvDeltas: engine.trace.slotScores.map((slot) => slot.checkViabilityDelta),
      scores: engine.trace.slotScores.map((slot) => slot.finalScore),
      chosenSlot: chosen.moveSlot,
    })}`);
  }
}
