#!/usr/bin/env -S npx tsx
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnBattleState,
  type FactoryFullTurnConfig,
} from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";

const ITEM_QUICK_CLAW = 183;
const STRENGTH = 70;
const SPLASH = 150;
const PROC_VALUE = 10727;
const NO_PROC_VALUE = 44835;

function require(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function config(randomTurnNumber: number, rngSeed = 0x1234_5678, moveId = STRENGTH): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed,
    initialRandomTurnNumber: randomTurnNumber,
    weather: 0,
    player: {
      species: 219,
      moveId,
      moves: [moveId, moveId, moveId, moveId],
      pp: [40, 40, 40, 40],
      ability: 40,
      item: ITEM_QUICK_CLAW,
      attack: 50,
      defense: 200,
      spAttack: 80,
      spDefense: 200,
      speed: 45,
      hp: 999,
      maxHp: 999,
      types: ["TYPE_FIRE", "TYPE_ROCK"],
    },
    trainer: {
      species: 235,
      moveId,
      moves: [moveId, moveId, moveId, moveId],
      pp: [40, 40, 40, 40],
      ability: 20,
      item: 0,
      attack: 20,
      defense: 200,
      spAttack: 20,
      spDefense: 200,
      speed: 95,
      hp: 999,
      maxHp: 999,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    },
  };
}

function runTurn(turnConfig: FactoryFullTurnConfig): Readonly<{
  state: FactoryFullTurnBattleState;
  events: readonly { payload: { kind: string; battler?: number } }[];
}> {
  const selfTarget = turnConfig.player.moveId === SPLASH;
  const initial = createFactoryFullTurnBattleState(turnConfig);
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: selfTarget ? 0 : 1 },
  });
  require(afterPlayer.kind === "decision-required", "expected trainer decision");
  const result = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: selfTarget ? 1 : 0 },
  });
  require(result.kind === "decision-required", "expected next-turn decision");
  return { state: result.state, events: result.events };
}

function ppOrder(result: ReturnType<typeof runTurn>): number[] {
  return result.events.flatMap(({ payload }) =>
    payload.kind === "set-battler-pp-data" ? [payload.battler as number] : []
  ).slice(0, 2);
}

const proc = runTurn(config(PROC_VALUE));
const noProc = runTurn(config(NO_PROC_VALUE));
require(JSON.stringify(ppOrder(proc)) === "[0,1]", `proc order drifted: ${ppOrder(proc)}`);
require(JSON.stringify(ppOrder(noProc)) === "[1,0]", `no-proc order drifted: ${ppOrder(noProc)}`);
require(
  proc.state.rng.calls === 9 && noProc.state.rng.calls === 9,
  `Quick Claw added an RNG draw: proc=${proc.state.rng.calls}, no-proc=${noProc.state.rng.calls}`,
);

// Each pair is read directly from the deterministic OFF ROM window. Splash
// consumes no hit-chain RNG, so the production boundary draw is the sole LCG
// step and must map rngSeed (raw gRngValue before Random()) to the exact ROM
// post-draw raw state and stored upper u16.
const boundaryAnchors = [
  { rngSeedBefore: 1780301801, gRngValue: 2938344616, randomTurnNumber: 44835 },
  { rngSeedBefore: 3656179860, gRngValue: 1019287415, randomTurnNumber: 15553 },
  { rngSeedBefore: 1154923059, gRngValue: 2996515370, randomTurnNumber: 45723 },
  { rngSeedBefore: 3795871350, gRngValue: 703067313, randomTurnNumber: 10727 },
] as const;

const aligned = boundaryAnchors.map((anchor) => {
  const state = runTurn(config(0xffff, anchor.rngSeedBefore, SPLASH));
  require(state.state.rng.calls === 1, `Splash boundary consumed ${state.state.rng.calls} draws`);
  require(
    state.state.rng.value === anchor.gRngValue,
    `LCG raw state mismatch: ${state.state.rng.value} != ${anchor.gRngValue}`,
  );
  require(
    state.state.rules.rulesContext.randomTurnNumber === anchor.randomTurnNumber,
    `stored random-turn mismatch: ${state.state.rules.rulesContext.randomTurnNumber} != ${anchor.randomTurnNumber}`,
  );
  return state.state.rules.rulesContext.randomTurnNumber;
});

console.log(JSON.stringify({
  verdict: "PASS",
  thresholdSides: [
    { value: PROC_VALUE, order: ["Magcargo", "Smeargle"], rngCalls: proc.state.rng.calls },
    { value: NO_PROC_VALUE, order: ["Smeargle", "Magcargo"], rngCalls: noProc.state.rng.calls },
  ],
  lcgBoundaryValues: aligned,
  reconciliation: "raw ROM gRngValue maps directly to FactoryFullTurnConfig.rngSeed at the same ledger anchor",
}, null, 2));
