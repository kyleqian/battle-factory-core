// One-shot probe for docs/brain-transition-wiring-design.md §2 (RNG
// accounting). Reuses the already-committed gold/silver "round 7 reveal"
// proof-stage builders (tools/compare/factoryRoundIntroGeneralizationStage.ts)
// to reach the exact FactoryScheduledOpponentGeneration each fixture's own
// brain battle would carry, reads its post-party-generation `rngValue`
// (the orchestrator-level cursor, NOT core.ts's tick-level one), and draws
// `pickFrontierTransition` on it once — the same single Random() call
// `GetSpecialBattleTransition` performs in source immediately after
// `FillFactoryTrainerParty` returns (battle_tower.c:2093-2100). Read-only:
// does not touch src/, does not advance any state that gets rendered.
import "../../src/engine/monPicPixelsInstall.ts"; // iss215: standalone node run must install the sprite pixel provider (bnd257d)
import { createInitialState } from "../../src/engine/core.ts";
import { pickFrontierTransition } from "../../src/engine/opponentGen.ts";
import transitionsFrontierData from "../../src/data/gen/battle-transitions-frontier.json" with { type: "json" };
import {
  generatedGoldRoundRevealProofStage,
  generatedRoundRevealProofStage,
} from "../compare/factoryRoundIntroGeneralizationStage.ts";

const table = (transitionsFrontierData as { table: { id: number; name: string; family: string }[] }).table;

function report(label: string, state: ReturnType<typeof generatedRoundRevealProofStage>): void {
  const orchestrator = state.factoryRoundBattleOrchestrator;
  if (orchestrator === null) throw new Error(`${label}: no orchestrator`);
  const current = orchestrator.opponentGenerations.at(-1);
  if (current === undefined) throw new Error(`${label}: no opponentGenerations`);
  if (current.kind !== "frontier-brain") {
    throw new Error(`${label}: expected frontier-brain, got ${current.kind}`);
  }
  const postPartyRngValue = current.generation.rngValue;
  const pick = pickFrontierTransition(postPartyRngValue);
  const entry = table[pick.tableIndex]!;
  console.log(`${label}:`);
  console.log(`  status=${current.status} challengeNum=${Math.floor(orchestrator.round.rules.factoryWinStreak / 7)}`);
  console.log(`  post-party rngValue=0x${postPartyRngValue.toString(16)}`);
  console.log(`  raw=${pick.raw} tableIndex=${pick.tableIndex} transitionId=${pick.transitionId} name=${entry.name} family=${entry.family}`);
}

const initial = createInitialState();
report("gold (challenge 5, seed 2, streak 35)", generatedGoldRoundRevealProofStage(initial, 6));
report("silver (challenge 2, seed 70, streak 14)", generatedRoundRevealProofStage(initial, 6));
