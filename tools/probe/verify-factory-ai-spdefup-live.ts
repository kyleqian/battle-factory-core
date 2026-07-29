import { readFileSync } from "node:fs";
import {
  chooseFactoryAiScoredDecision,
  type FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { createBattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const SEEDS = [1, 99] as const;
const PATHS = {
  control: "tools/battle-lab/mechanic-factory-ai-cbm-spdefup-control-off.json",
  reach: "tools/battle-lab/mechanic-factory-ai-cbm-spdefup-reach-off.json",
} as const;
const EXPECTED_TOTAL_DRAWS = {
  control: { 1: 28, 99: 28 },
  reach: { 1: 58, 99: 56 },
} as const;

type Battler = {
  species: number;
  hp: number;
  maxHp: number;
  pp: number[];
  statStages: number[];
};
type State = {
  rngValue: number;
  battlers: { player: Battler; opponent: Battler };
  sideConditions: { opponent: { lightScreenTurns: number } };
};
type Capture = { frame: number; state: State };

function rngStep(value: number): number {
  return (Math.imul(1103515245, value) + 24691) >>> 0;
}

function stepsToReach(start: number, target: number, maxSteps: number): number | null {
  let value = start;
  for (let steps = 1; steps <= maxSteps; steps += 1) {
    value = rngStep(value);
    if (value === target) return steps;
  }
  return null;
}

async function run(path: string, seed: number): Promise<Capture[]> {
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  fixture.seed = seed;
  const response = await fetch(`${oracleUrlForProfile("battle-scene-off")}/v1/battle-lab/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(fixture),
  });
  if (!response.ok) throw new Error(`battle-lab HTTP ${response.status}: ${await response.text()}`);
  return ((await response.json()) as { captures: Capture[] }).captures;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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
const maxStageDecisionView: FactoryAiScoredView = Object.freeze({
  schema: "factory-ai-scored-view/v1",
  mode: "factory-level-50-singles",
  active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
  factory: Object.freeze({
    levelMode: 0,
    battleMode: 0,
    factoryWinStreak: 28,
    trainerOpponentId: 222,
  }),
  moves: [133, 113, 113, 113],
  attacker: Object.freeze({
    types: ["TYPE_GHOST", "TYPE_GHOST"],
    attack: 90, defense: 150, spAttack: 80, spDefense: 150, speed: 45, level: 50,
    statStages: Object.freeze({ ...neutralStages, spDef: 12 }),
    isFirstTurn: 0,
    hp: 115, maxHp: 115,
    lightScreenUp: true,
    ability: "ABILITY_PRESSURE",
  }),
  target: Object.freeze({
    species: 241,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    attack: 100, defense: 125, spAttack: 60, spDefense: 90, speed: 120, level: 50,
    statStages: neutralStages,
    isFirstTurn: 0,
    hp: 170, maxHp: 170,
    ability: "ABILITY_THICK_FAT",
    knownAbility: null,
    lastUsedMoveId: 233,
  }),
});

for (const seed of SEEDS) {
  const [controlA, controlB, reachA, reachB] = await Promise.all([
    run(PATHS.control, seed),
    run(PATHS.control, seed),
    run(PATHS.reach, seed),
    run(PATHS.reach, seed),
  ]);
  assert(JSON.stringify(controlA) === JSON.stringify(controlB), `seed ${seed}: control rerun diverged`);
  assert(JSON.stringify(reachA) === JSON.stringify(reachB), `seed ${seed}: reach rerun diverged`);

  const controlFirst = controlA[0]!.state;
  const controlLast = controlA.at(-1)!.state;
  const reachFirst = reachA[0]!.state;
  const reachLast = reachA.at(-1)!.state;
  assert(
    JSON.stringify(controlLast.battlers.opponent.pp) === "[18,30,30,30]"
      && controlLast.battlers.opponent.statStages[5] === 10,
    `seed ${seed}: control endpoint is not two Amnesia uses at SPDEF 10`,
  );
  assert(
    JSON.stringify(reachLast.battlers.opponent.pp) === "[17,30,30,29]"
      && reachLast.battlers.opponent.statStages[5] === 12,
    `seed ${seed}: reach endpoint is not three Amnesia uses then Light Screen slot 3`,
  );
  assert(
    controlLast.battlers.opponent.hp === 115 && reachLast.battlers.opponent.hp === 115,
    `seed ${seed}: Dusclops took damage`,
  );
  assert(
    stepsToReach(controlFirst.rngValue, controlLast.rngValue, 100)
      === EXPECTED_TOTAL_DRAWS.control[seed],
    `seed ${seed}: control total Random() ledger moved`,
  );
  assert(
    stepsToReach(reachFirst.rngValue, reachLast.rngValue, 100)
      === EXPECTED_TOTAL_DRAWS.reach[seed],
    `seed ${seed}: reach total Random() ledger moved`,
  );

  const decisionWindow = reachA.slice(0, -1).map((capture, index) => ({
    before: capture,
    after: reachA[index + 1]!,
  })).find(({ before, after }) => (
    before.frame >= 2_000
    && stepsToReach(before.state.rngValue, after.state.rngValue, 20) === 12
  ));
  assert(decisionWindow, `seed ${seed}: max-stage 12-draw decision window not found`);

  // The process-isolated caller attribution pins the first two window draws
  // to Cmd_seteffectwithchance and BattleTurnPassed. The remaining ten are
  // exactly the Factory AI receipt: setup x4, CV x5, tie x1.
  const engineStart = rngStep(rngStep(decisionWindow.before.state.rngValue));
  const engine = chooseFactoryAiScoredDecision({
    view: maxStageDecisionView,
    request,
    rng: { value: engineStart, calls: 0 },
  });
  assert(engine.trace.draws.length === 10, `seed ${seed}: engine decision is not 10 draws`);
  assert(engine.rng.value === decisionWindow.after.state.rngValue, `seed ${seed}: engine RNG endpoint differs`);
  assert(
    engine.trace.tie.chosenDecision.kind === "use-move"
      && engine.trace.tie.chosenDecision.moveSlot === 3,
    `seed ${seed}: engine did not choose the oracle's Light Screen slot 3`,
  );
  assert(
    engine.trace.slotScores[0]!.checkBadMoveDelta === -10
      && engine.trace.slotScores.slice(1).every((slot) => slot.checkBadMoveDelta === -8),
    `seed ${seed}: CBM score split is not Amnesia -10 vs active Light Screen -8`,
  );

  console.log(
    `PASS seed ${seed}: control PP [18,30,30,30] @ SPDEF 10; `
    + `reach PP [17,30,30,29] @ SPDEF 12; `
    + `draws ${EXPECTED_TOTAL_DRAWS.control[seed]}/${EXPECTED_TOTAL_DRAWS.reach[seed]}; `
    + `engine 10-draw receipt chose slot 3`,
  );
}
