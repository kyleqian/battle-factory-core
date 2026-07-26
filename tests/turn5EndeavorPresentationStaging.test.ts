import { describe, expect, it } from "vitest";
import {
  resolveTurn5EndeavorKickoffLines,
  resolveTurn5EndeavorWindowContent,
  stageTurn5EndeavorHitChain,
} from "../src/engine/turn5EndeavorPresentationStaging.ts";

/**
 * Presentation-seam prep-scout, window 3 (`docs/presentation-seam-scout.md`
 * §9, ISSUES #39/#41): `turn5-rockslide.json`
 * (`drawTurn5EndeavorText`/`drawTurn5RockSlideWindow`'s attack branch,
 * `battleScene.ts`). `EFFECT_ENDEAVOR` is still `blocked-on-opcodes` in the
 * live census (`docs/executable-frontier-census.md` line 245) -- this pins
 * the nearest executable substitute (MOVE_STRENGTH, Grovyle-attacks-Onix
 * direction) live, proving the message+hp-change mechanism generalizes to
 * an opponent-side attacker for the first time this session (both
 * `turn1RockSlidePresentationStaging.ts` and `turn5FaintPresentationStaging.ts`
 * only ever staged the player-attacks-opponent direction).
 */
describe("turn5EndeavorPresentationStaging: staged executable substitute for the not-yet-executable ENDEAVOR (docs/presentation-seam-scout.md §9)", () => {
  it("reaches the script's own terminal end -- Onix (target, side 0) 88 -> 79 under MOVE_STRENGTH's real NORMAL-vs-ROCK/GROUND not-very-effective formula, not ENDEAVOR's own hp-difference formula (module doc: this proves the mechanism, not ENDEAVOR's own math)", () => {
    const result = stageTurn5EndeavorHitChain();
    expect(result.targetHpAfter).toBe(79);
  });

  it("emits the same event-kind family window 2's ROCK_SLIDE chain did, PLUS a NOT_VERY_EFFECTIVE resultmessage (real NORMAL-vs-ROCK/GROUND type math, not present in window 2's neutral-effectiveness chain) -- confirms this staged run is genuinely computed, not copied", () => {
    const { events } = stageTurn5EndeavorHitChain();
    expect(events.map((e) => e.kind)).toEqual([
      "message", // attackstring: STRINGID_USEDMOVE ("Foe GROVYLE used\nSTRENGTH!"'s own content event)
      "set-battler-pp-data", // ppreduce: Grovyle's STRENGTH slot, 15 -> 14
      "animation", // attackanimation: MOVE_ANIMATION
      "play-se", // effectivenesssound: not-very-effective hit sound
      "animation", // hitanimation: HIT_ANIMATION
      "health-bar-update", // healthbarupdate: the animated bar's own target end value
      "hp-change", // datahpupdate: Onix's before/after HP
      "message", // resultmessage: STRINGID_NOTVERYEFFECTIVE
      "set-battler-sprite-visibility", // moveend pass-through, attacker
      "set-battler-sprite-visibility", // moveend pass-through, target
    ]);
  });

  it("attackstring's sourceLabel is BattleScript_HitFromAtkString and datahpupdate's is BattleScript_HitFromAtkAnimation -- the SAME label family presentationEventWindowBridge.ts's resolveRockSlidePresentationWindowContent (built for window 2) keys on, confirming it applies unchanged to this opponent-attacker direction with zero bridge changes needed", () => {
    const { events } = stageTurn5EndeavorHitChain();
    const message = events.find((e) => e.kind === "message" && e.messageId === "STRINGID_USEDMOVE");
    const hpChange = events.find((e) => e.kind === "hp-change");
    expect(message?.provenance.sourceLabel).toBe("BattleScript_HitFromAtkString");
    expect(hpChange?.provenance.sourceLabel).toBe("BattleScript_HitFromAtkAnimation");
  });

  it("hp-change carries Onix's real turn-3-settled HP (88, battleScene.ts's anchorPlayerAfterTurn3Hp) as `from`, on battler 0 (Onix, the player side) -- the direction window 2's own ROCK_SLIDE chain never exercised (that one only ever wrote battler 1)", () => {
    const { events } = stageTurn5EndeavorHitChain();
    const hpChange = events.find((e) => e.kind === "hp-change");
    expect(hpChange).toMatchObject({ battler: 0, from: 88, to: 79 });
  });

  it("resolveRockSlidePresentationWindowContent (window 2's own bridge, unmodified) resolves this run's own message+hp pair without throwing", () => {
    const content = resolveTurn5EndeavorWindowContent();
    expect(content.message.messageId).toBe("STRINGID_USEDMOVE");
    expect(content.hp).toMatchObject({ battler: 0, from: 88, to: 79 });
  });

  it("the kickoff message resolves to 'Foe GROVYLE used'/'STRENGTH!' -- the real 'Foe ' prefix (HANDLE_NICKNAME_STRING_CASE, opponent side) live for the first time this session, not merely claimed 'mechanically identical' by analogy the way window 2's own TURN_KICKOFF_LINE1/2 was", () => {
    expect(resolveTurn5EndeavorKickoffLines()).toEqual(["Foe GROVYLE used", "STRENGTH!"]);
  });

  it("this chain does not exercise stat-stage-change or the ENTIRE hp-difference formula ENDEAVOR's own BattleScript_EffectEndeavor needs (setdamagetohealthdifference/bicbyte/adjustsetdamage, all unregistered per docs/executable-frontier-census.md line 245) -- named gap, not routed around", () => {
    const { events } = stageTurn5EndeavorHitChain();
    expect(events.some((e) => e.kind === "stat-stage-change")).toBe(false);
  });
});
