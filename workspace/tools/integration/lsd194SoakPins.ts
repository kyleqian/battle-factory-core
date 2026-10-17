// lsd194: the randomRoundSoak.test.ts pins that moved (docs/lsd194-print-floor-and-drain.md section 8): runs the same runSeed calls on any tree and prints
// frames / renderCalls / turn / battle / end state, so base 6b6d1d128, the floor-only 5a11553e1 and the final tree can be diffed for per-pin attribution.
//   node --experimental-strip-types --no-warnings tools/integration/lsd194SoakPins.ts
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator } from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createInitialState, type EngineState } from "../../src/engine/core.ts";
import { runSeed } from "../soak/randomRoundSoakDriver.ts";


const PIN_SEEDS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function strongRouteRecord(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv: 31,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function createSevenWinLiveState(): EngineState {
  const playerRentalRecords = [
    strongRouteRecord(664),
    strongRouteRecord(678),
    strongRouteRecord(527),
  ] as const;
  const orchestrator = beginFactoryRoundBattleStartIntro(
    createFactoryRoundBattleOrchestrator({
      id: "seven-win-live-seam-seed-21",
      rngValue: 21,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords,
        savedRentalRecords: [
          ...playerRentalRecords,
          strongRouteRecord(1),
          strongRouteRecord(2),
          strongRouteRecord(3),
        ],
      },
    }),
  );
  return {
    ...createInitialState(),
    factoryRoundBattleOrchestrator: orchestrator,
    rngMode: "frontierBattle",
    rngValue: orchestrator.round.rules.rngValue,
  };
}

// ---------------------------------------------------------------------------
// Orchestrator-level round carrier (mirrors factoryRoundChaining.test.ts's
// own driveGeneratedRoundToCompletion/driveTerminalToNextDraft/
// stateAtDecidedRound helpers) -- reused below to reach a chained-then-lost

const pick = (r: any) => ({ frames: r.frames, turn: r.turn, battle: r.battle, endState: r.endState, outcome: r.outcome, maxBattleDepth: r.maxBattleDepth,
  renderCalls: r.diagnostics?.renderCalls });
const out: Record<string, unknown> = {};
out["seven-wins seed21"] = pick(runSeed(21, { maxFrames: 200_000, renderEvery: 16, testPolicy: "strong-route", stateFactory: createSevenWinLiveState, collectDiagnostics: true, stopAtFirstRoundDecision: true } as never));
for (const policy of ["full", "vanilla"] as const) for (const seed of [0, 1])
  out[`${policy} seed${seed}`] = pick(runSeed(seed, { maxFrames: 600_000, renderEvery: 0, policy, stopAtFirstRoundDecision: true } as never));
console.log(JSON.stringify(out, null, 1));
