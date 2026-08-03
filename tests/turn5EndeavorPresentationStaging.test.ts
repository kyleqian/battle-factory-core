import { describe, expect, it } from "vitest";
import {
  resolveTurn5EndeavorAttackLines,
  resolveTurn5EndeavorHpEndpoints,
  resolveTurn5EndeavorWindowContent,
  stageTurn5EndeavorHitChain,
} from "../src/engine/turn5EndeavorPresentationStaging.ts";

/**
 * Presentation-seam wiring, window 3 (`docs/presentation-seam-scout.md`
 * §9/§9.4 rung 2, ISSUES #39/#41): `turn5-rockslide.json`
 * (`drawTurn5EndeavorText`/`drawTurn5RockSlideWindow`'s attack branch,
 * `battleScene.ts`). `EFFECT_ENDEAVOR` is now executable (entry 464's own
 * registration) -- this pins the REAL MOVE_ENDEAVOR chain live
 * (Grovyle-attacks-Onix direction), replacing the earlier MOVE_STRENGTH
 * substitute.
 */
describe("turn5EndeavorPresentationStaging: real MOVE_ENDEAVOR chain (docs/presentation-seam-scout.md §9.4 rung 2)", () => {
  it("reaches the script's own terminal end -- Onix (target, side 0) 88 -> 1 under ENDEAVOR's real hp-difference formula (target.hp - attacker.hp = 88 - 1 = 87 damage), matching battleScene.ts's anchorPlayerAfterTurn5Hp for real, not a substitute move's damage", () => {
    const result = stageTurn5EndeavorHitChain();
    expect(result.targetHpAfter).toBe(1);
  });

  it("emits a SHORTER event chain than the old MOVE_STRENGTH substitute -- no resultmessage event at all, since bicbyte unconditionally clears both effectiveness flags before resultmessage runs (ENDEAVOR's own script), confirming this is genuinely computed by the real script, not the generic EFFECT_HIT tail", () => {
    const { events } = stageTurn5EndeavorHitChain();
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

  it("attackstring's sourceLabel is BattleScript_EffectEndeavor (NOT BattleScript_HitFromAtkString -- this script's own attackstring/ppreduce execute directly under its own top label, no intervening sub-label) and datahpupdate's is BattleScript_HitFromAtkAnimation (the trailing goto's real jump target) -- resolveRockSlidePresentationWindowContent's own override parameter bridges this, zero bridge edits", () => {
    const { events } = stageTurn5EndeavorHitChain();
    const message = events.find((e) => e.kind === "message" && e.messageId === "STRINGID_USEDMOVE");
    const hpChange = events.find((e) => e.kind === "hp-change");
    expect(message?.provenance.sourceLabel).toBe("BattleScript_EffectEndeavor");
    expect(hpChange?.provenance.sourceLabel).toBe("BattleScript_HitFromAtkAnimation");
  });

  it("hp-change carries Onix's real turn-3-settled HP (88, battleScene.ts's anchorPlayerAfterTurn3Hp) as `from` and the real ENDEAVOR settle (1, anchorPlayerAfterTurn5Hp) as `to`, on battler 0 (Onix, the player side)", () => {
    const { events } = stageTurn5EndeavorHitChain();
    const hpChange = events.find((e) => e.kind === "hp-change");
    expect(hpChange).toMatchObject({ battler: 0, from: 88, to: 1 });
  });

  it("resolveRockSlidePresentationWindowContent, passed this module's own attackstring label override, resolves this run's own message+hp pair without throwing", () => {
    const content = resolveTurn5EndeavorWindowContent();
    expect(content.message.messageId).toBe("STRINGID_USEDMOVE");
    expect(content.hp).toMatchObject({ battler: 0, from: 88, to: 1 });
  });

  it("resolveTurn5EndeavorHpEndpoints exposes the same real {from:88, to:1} pair for battleScene.ts's own endeavorHp call site", () => {
    expect(resolveTurn5EndeavorHpEndpoints()).toEqual({ from: 88, to: 1 });
  });

  it("the attack message resolves to 'Foe GROVYLE used'/'ENDEAVOR!' -- the real move name, not a substitute's", () => {
    expect(resolveTurn5EndeavorAttackLines()).toEqual(["Foe GROVYLE used", "ENDEAVOR!"]);
  });

  it("this chain does not exercise stat-stage-change", () => {
    const { events } = stageTurn5EndeavorHitChain();
    expect(events.some((e) => e.kind === "stat-stage-change")).toBe(false);
  });
});
