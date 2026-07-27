import { describe, expect, it } from "vitest";
import {
  resolveTurn4RockSlideHpEndpoints,
  resolveTurn4RockSlideWindowContent,
  stageTurn4RockSlideHitChain,
} from "../src/engine/turn4RockSlidePresentationStaging.ts";

/**
 * Presentation-seam retirement, the turn-4 settle staging gap
 * (`docs/presentation-seam-scout.md` §9.3/§9.4's own named residual, entries
 * 465/468/487): pins the real kernel event inventory a staged ONIX
 * ROCK_SLIDE -> GROVYLE hit chain produces for turn 4's own real recorded
 * settle, using the real RNG ledger entries `battle1-grovyle-faint-ram-
 * dump.json` already carries for this exact window (`turn4RockSlide
 * PresentationStaging.ts`'s own module doc), so `anchorOpponentAfterTurn4Hp`
 * stops being a bare literal with no staged proof -- the `hp-change`
 * endpoints are byte-identical to the real recorded 41 -> 1 settle, a
 * survival, not a faint.
 */
describe("turn4RockSlidePresentationStaging: staged real ROCK_SLIDE hit chain (docs/presentation-seam-scout.md §9.3/§9.4)", () => {
  it("reaches the script's own terminal end with the real recorded hit -- 41 -> 1, byte-identical to battle1-grovyle-faint-ram-dump.json's own \"4892\"/\"5926\" battler1.hp snapshots", () => {
    const result = stageTurn4RockSlideHitChain();
    expect(result.targetHpAfter).toBe(1);
  });

  it("emits exactly the event-kind sequence the registered opcodes produce for a singles, no-Pressure, non-crit, neutral-effectiveness ROCK_SLIDE hit -- same shape window 2's own turn-1 chain proved, no faint-family event anywhere in this stream", () => {
    const { events } = stageTurn4RockSlideHitChain();
    expect(events.map((e) => e.kind)).toEqual([
      "message", // attackstring: STRINGID_USEDMOVE ("ONIX used\nROCK SLIDE!"'s own content event)
      "set-battler-pp-data", // ppreduce: Onix's ROCK_SLIDE slot, 10 -> 9
      "animation", // attackanimation: MOVE_ANIMATION, the rockSlide* choreography's own trigger
      "play-se", // effectivenesssound: neutral-effectiveness hit sound
      "animation", // hitanimation: HIT_ANIMATION, the healthbox-wobble/blink trigger
      "health-bar-update", // healthbarupdate: the animated bar's own target end value
      "hp-change", // datahpupdate: Grovyle's before/after HP
      "set-battler-sprite-visibility", // moveend pass-through, attacker (not fainted/invisible)
      "set-battler-sprite-visibility", // moveend pass-through, target (not fainted/invisible)
    ]);
    expect(events.some((e) => e.kind === "faint-animation" || e.kind === "play-faint-cry")).toBe(false);
  });

  it("attackstring resolves to STRINGID_USEDMOVE with zero substitutions, matching window 2's own turn-1 chain", () => {
    const { events } = stageTurn4RockSlideHitChain();
    const message = events.find((e) => e.kind === "message");
    expect(message).toMatchObject({ messageId: "STRINGID_USEDMOVE", substitutions: [] });
  });

  it("hp-change carries Grovyle's real turn-4 pre-hit HP (41, battleScene.ts's own anchorOpponentAfterTurn3Hp) as `from` and the real settled HP (1, anchorOpponentAfterTurn4Hp) as `to` -- Grovyle SURVIVES, this is not a faint", () => {
    const { events } = stageTurn4RockSlideHitChain();
    const hpChange = events.find((e) => e.kind === "hp-change");
    expect(hpChange).toMatchObject({ battler: 1, from: 41, to: 1 });
    expect(hpChange && hpChange.kind === "hp-change" ? hpChange.to : null).not.toBe(0);
  });

  it("health-bar-update's healthValue is the DAMAGE DELTA (from - to, 40), not the settled end HP -- turn 4's own real drain is 2 less than turn 1's 42, matching battleScene.ts's own already-committed doc finding", () => {
    const { events } = stageTurn4RockSlideHitChain();
    const healthBarUpdate = events.find((e) => e.kind === "health-bar-update");
    const hpChange = events.find((e) => e.kind === "hp-change");
    if (healthBarUpdate?.kind !== "health-bar-update" || hpChange?.kind !== "hp-change") {
      throw new Error("expected both health-bar-update and hp-change");
    }
    expect(healthBarUpdate.healthValue).toBe(40);
    expect(healthBarUpdate.healthValue).toBe(hpChange.from - hpChange.to);
  });

  it("resolveTurn4RockSlideWindowContent bridges the staged run through presentationEventWindowBridge.ts's existing resolveRockSlidePresentationWindowContent unchanged (zero bridge edits, same finding §9.2 already made for the opposite attacker direction)", () => {
    const content = resolveTurn4RockSlideWindowContent();
    expect(content.message).toMatchObject({ messageId: "STRINGID_USEDMOVE", substitutions: [] });
    expect(content.hp).toMatchObject({ battler: 1, from: 41, to: 1 });
  });

  it("resolveTurn4RockSlideHpEndpoints exposes the from/to pair battleScene.ts's rockSlideOpponentHp/opponentHealthboxContentForHp call sites need, replacing the anchorOpponentAfterTurn4Hp literal", () => {
    expect(resolveTurn4RockSlideHpEndpoints()).toEqual({ from: 41, to: 1 });
  });
});
