import { describe, expect, it } from "vitest";
import {
  resolveTurn2EndeavorAttackLines,
  resolveTurn2EndeavorHpEndpoints,
  resolveTurn2EndeavorWindowContent,
  stageTurn2EndeavorHitChain,
} from "../src/engine/turn2EndeavorPresentationStaging.ts";
import turn2RamDumpAsset from "../src/data/gen/battle1-turn2-ram-dump.json" with { type: "json" };
import { advanceRngValue } from "../src/engine/rng.ts";

/**
 * Presentation-seam prep-scout, window 6 (`docs/presentation-seam-scout.md`
 * §13/§13.2): pins the real kernel event inventory a staged GROVYLE
 * ENDEAVOR -> ONIX hit chain produces for turn 2's own real recorded settle
 * (117 -> 101), using turn 2's own real RNG ledger entry
 * (`battle1-turn2-ram-dump.json`'s `rngLedger[0]`), not a reused/guessed
 * seed -- `turn2EndeavorPresentationStaging.ts`'s own module doc.
 */
describe("turn2EndeavorPresentationStaging: staged real MOVE_ENDEAVOR chain (docs/presentation-seam-scout.md §13.2)", () => {
  it("turn 2's own real recorded RNG ledger entry[0] round-trips through the real gen-3 LCG (src/engine/rng.ts's own advanceRngValue) to the ledger's own toValue -- the staged seed is turn 2's real recorded value, not guessed", () => {
    const ledger = (turn2RamDumpAsset as { rngLedger: { atTick: number; fromValue: number; steps: number; toValue: number }[] }).rngLedger;
    const first = ledger[0]!;
    expect(first).toMatchObject({ atTick: 2983, fromValue: 4098214719, steps: 1, toValue: 2002721862 });
    expect(advanceRngValue(first.fromValue)).toBe(first.toValue);
  });

  it("reaches the script's own terminal end -- Onix (target, side 0) 117 -> 101 under ENDEAVOR's real hp-difference formula (target.hp - attacker.hp = 117 - 101 = 16 damage), matching battleScene.ts's anchorPlayerAfterTurnHp for real", () => {
    const result = stageTurn2EndeavorHitChain();
    expect(result.targetHpAfter).toBe(101);
  });

  it("emits the same event-kind sequence turn 5's own sibling ENDEAVOR chain proves -- no resultmessage event, since bicbyte unconditionally clears both effectiveness flags before resultmessage runs (ENDEAVOR's own script)", () => {
    const { events } = stageTurn2EndeavorHitChain();
    expect(events.map((e) => e.kind)).toEqual([
      "message", // attackstring: STRINGID_USEDMOVE ("Foe GROVYLE used\nENDEAVOR!"'s own content event)
      "set-battler-pp-data", // ppreduce: Grovyle's ENDEAVOR slot, 15 -> 14
      "animation", // attackanimation: MOVE_ANIMATION
      "play-se", // effectivenesssound
      "animation", // hitanimation: HIT_ANIMATION
      "health-bar-update", // healthbarupdate: the animated bar's own target end value
      "hp-change", // datahpupdate: Onix's before/after HP
      "set-battler-sprite-visibility", // moveend pass-through, attacker
      "set-battler-sprite-visibility", // moveend pass-through, target
    ]);
  });

  it("attackstring's sourceLabel is BattleScript_EffectEndeavor (NOT BattleScript_HitFromAtkString) and datahpupdate's is BattleScript_HitFromAtkAnimation -- resolveRockSlidePresentationWindowContent's own override parameter bridges this, zero bridge edits", () => {
    const { events } = stageTurn2EndeavorHitChain();
    const message = events.find((e) => e.kind === "message" && e.messageId === "STRINGID_USEDMOVE");
    const hpChange = events.find((e) => e.kind === "hp-change");
    expect(message?.provenance.sourceLabel).toBe("BattleScript_EffectEndeavor");
    expect(hpChange?.provenance.sourceLabel).toBe("BattleScript_HitFromAtkAnimation");
  });

  it("hp-change carries Onix's real before_turn2 HP (117, battleScene.ts's anchorPlayerBattler.hp) as `from` and the real ENDEAVOR settle (101, anchorPlayerAfterTurnHp) as `to`, on battler 0 (Onix, the player side)", () => {
    const { events } = stageTurn2EndeavorHitChain();
    const hpChange = events.find((e) => e.kind === "hp-change");
    expect(hpChange).toMatchObject({ battler: 0, from: 117, to: 101 });
  });

  it("resolveTurn2EndeavorWindowContent bridges the staged run through presentationEventWindowBridge.ts's existing resolveRockSlidePresentationWindowContent unchanged (zero bridge edits, same finding turn 3's/turn 5's own modules already made)", () => {
    const content = resolveTurn2EndeavorWindowContent();
    expect(content.message.messageId).toBe("STRINGID_USEDMOVE");
    expect(content.hp).toMatchObject({ battler: 0, from: 117, to: 101 });
  });

  it("resolveTurn2EndeavorHpEndpoints exposes the real {from:117, to:101} pair for battleScene.ts's own endeavorHp call site at drawTurn2KickoffText", () => {
    expect(resolveTurn2EndeavorHpEndpoints()).toEqual({ from: 117, to: 101 });
  });

  it("the attack message resolves to 'Foe GROVYLE used'/'ENDEAVOR!' -- byte-identical to turn 5's own sibling module's output, the real move name", () => {
    expect(resolveTurn2EndeavorAttackLines()).toEqual(["Foe GROVYLE used", "ENDEAVOR!"]);
  });

  it("this chain does not exercise stat-stage-change", () => {
    const { events } = stageTurn2EndeavorHitChain();
    expect(events.some((e) => e.kind === "stat-stage-change")).toBe(false);
  });
});
