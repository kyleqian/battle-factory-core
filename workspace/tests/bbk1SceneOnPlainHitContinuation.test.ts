// bbk1 item 3 (chg4's narrowed rule): a Scene ON continuation whose first print is the player's own plain hit after the foe's locked move runs the confirm walk
// (ROM s830 d1: Ice Beam printstring at commit + 12, SE 183 71 = 71 after the change; T2 ON seed 830 487 -> 357, every other seed unchanged). A miss (s165 d11),
// the locked battler's own unleash (s310 d10) and a non-damaging first print keep the segment as the kernel emits it (T2 ON seeds 165 / 310 unchanged).
import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import {
  appendBattleResolutionLockedActionContinuation,
  createBattleResolutionPresentation,
  type BattleResolutionPresentationState,
} from "../src/engine/battleResolutionPresentation.ts";
import type { BattleState } from "../src/engine/battleDecisionBoundary.ts";
import type { BattleScriptPartyMemberState, BattleScriptPartyState } from "../src/engine/battleScriptRulesContext.ts";
import { submitFactoryFullTurnDecision, type FactoryFullTurnDecisionRules } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createFreshFactoryBattle } from "../src/engine/factoryBattleStart.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";

const SOLAR_BEAM = 76;
const FLY = 19;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));
const member = (setId: number): BattleScriptPartyMemberState => {
  const set = frontierMonsData.entries[setId]!;
  return createFactoryCorpusPartyMember({ setId, personality: natureByName.get(set.nature)!, fixedIv: 3, abilitySlot: 0 });
};
const party = (active: number): BattleScriptPartyState =>
  Object.freeze([member(active), member(300), member(301), member(302), member(303), member(304)]) as unknown as BattleScriptPartyState;

function submit(state: BattleState<FactoryFullTurnDecisionRules>, side: "player" | "trainer") {
  const request = state.boundary.kind === "decision-required" && state.boundary.request.kind === "command" ? state.boundary.request : null;
  if (request === null || request.side !== side) throw new Error(`expected a ${side} command boundary`);
  const decision = request.legalDecisions.find((d) => d.kind === "use-move" && d.moveSlot === 0)!;
  const transition = submitFactoryFullTurnDecision(state, { requestId: request.requestId, side, decision });
  if (transition.kind !== "decision-required") throw new Error("expected a command boundary");
  return { request, decision, transition };
}

function continuation(scene: "on" | "off", playerSet: number, foeSet: number, lockedMove: number) {
  const initial = createFreshFactoryBattle({ requestId: 1, rngSeed: 0, battleScene: scene, playerParty: party(playerSet), opponentParty: party(foeSet) });
  const player = submit(initial, "player");
  const charge = submit(player.transition.state, "trainer");
  const chargeResolution = createBattleResolutionPresentation({
    sourceRequest: player.request, sourceDecision: player.decision as never, beforeRules: initial.rules, transition: charge.transition,
    fieldBoundary: createBattleCommandPresentation(player.request, initial.rules.rulesContext, 0).field,
    confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 },
  });
  const completed: BattleResolutionPresentationState = Object.freeze({
    ...chargeResolution,
    commandIndex: chargeResolution.segments[0]!.commands.length,
    lifecycle: Object.freeze({ phase: "next-command-handoff" as const, phaseElapsed: 6 }),
    confirmHandoff: null,
  });
  const intervening = submit(charge.transition.state, "player");
  return appendBattleResolutionLockedActionContinuation({
    resolution: completed, transition: intervening.transition,
    fieldBoundary: createBattleCommandPresentation(intervening.request, charge.transition.state.rules.rulesContext, 0).field,
    lockedAction: { battler: 1, currentMove: lockedMove, currentMovePosition: 0 },
    sourceDecision: intervening.decision as never,
    confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 },
  });
}

describe("bbk1: Scene ON continuation after the foe's charging turn", () => {
  it("the player's plain hit (SENTRET Quick Attack into a charging SOLAR BEAM) runs the confirm walk first, as Scene OFF's does", () => {
    expect(continuation("on", 16, 272, SOLAR_BEAM).lifecycle.phase).toBe("confirm-handoff");
    expect(continuation("off", 16, 272, SOLAR_BEAM).lifecycle.phase).toBe("confirm-handoff");
  });

  it("a first print that is no damaging hit (METAPOD Harden while the foe's FLY is charged) keeps the segment's own clock in Scene ON", () => {
    expect(continuation("on", 8, 44, FLY).lifecycle.phase).toBe("presenting");
  });
});
