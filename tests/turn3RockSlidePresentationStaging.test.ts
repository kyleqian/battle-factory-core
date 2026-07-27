import { describe, expect, it } from "vitest";
import {
  resolveTurn3RockSlideHpEndpoints,
  resolveTurn3RockSlideWindowContent,
  stageTurn3RockSlideHitChain,
} from "../src/engine/turn3RockSlidePresentationStaging.ts";

/**
 * Presentation-seam retirement, prep-scout window 4
 * (`docs/presentation-seam-scout.md` §10.2/§10.3): pins the real kernel event
 * inventory a staged ONIX ROCK_SLIDE -> GROVYLE hit chain produces for turn
 * 3's own real recorded settle, using the real RNG ledger entries
 * `battle1-grovyle-faint-ram-dump.json` already carries for this exact
 * window (`turn3RockSlidePresentationStaging.ts`'s own module doc), so
 * `anchorOpponentAfterTurn2Hp`/`anchorOpponentAfterTurn3Hp`'s pairing stops
 * being asset-backed-but-unstaged -- the `hp-change` endpoints are
 * byte-identical to the real recorded 88 -> 41 settle, a survival, not a
 * faint. Closes the last unstaged link in Grovyle's own ROCK_SLIDE HP chain
 * (turns 1/4/5 already have staged proof via their own sibling modules).
 */
describe("turn3RockSlidePresentationStaging: staged real ROCK_SLIDE hit chain (docs/presentation-seam-scout.md §10.2/§10.3)", () => {
  it("reaches the script's own terminal end with the real recorded hit -- 88 -> 41, byte-identical to battleScene.ts's own anchorOpponentAfterTurn2Hp/anchorOpponentAfterTurn3Hp pair", () => {
    const result = stageTurn3RockSlideHitChain();
    expect(result.targetHpAfter).toBe(41);
  });

  it("emits exactly the event-kind sequence the registered opcodes produce for a singles, no-Pressure, non-crit, neutral-effectiveness ROCK_SLIDE hit -- same shape windows 2 and 3's own turn-1/turn-4 chains prove, no faint-family event anywhere in this stream", () => {
    const { events } = stageTurn3RockSlideHitChain();
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

  it("attackstring resolves to STRINGID_USEDMOVE with zero substitutions, matching windows 2 and 3's own turn-1/turn-4 chains", () => {
    const { events } = stageTurn3RockSlideHitChain();
    const message = events.find((e) => e.kind === "message");
    expect(message).toMatchObject({ messageId: "STRINGID_USEDMOVE", substitutions: [] });
  });

  it("hp-change carries Grovyle's real turn-3 pre-hit HP (88, battleScene.ts's own anchorOpponentAfterTurn2Hp) as `from` and the real settled HP (41, anchorOpponentAfterTurn3Hp) as `to` -- Grovyle SURVIVES, this is not a faint", () => {
    const { events } = stageTurn3RockSlideHitChain();
    const hpChange = events.find((e) => e.kind === "hp-change");
    expect(hpChange).toMatchObject({ battler: 1, from: 88, to: 41 });
    expect(hpChange && hpChange.kind === "hp-change" ? hpChange.to : null).not.toBe(0);
  });

  it("health-bar-update's healthValue is the DAMAGE DELTA (from - to, 47), not the settled end HP -- matching battleScene.ts's own already-committed doc finding for this exact delta", () => {
    const { events } = stageTurn3RockSlideHitChain();
    const healthBarUpdate = events.find((e) => e.kind === "health-bar-update");
    const hpChange = events.find((e) => e.kind === "hp-change");
    if (healthBarUpdate?.kind !== "health-bar-update" || hpChange?.kind !== "hp-change") {
      throw new Error("expected both health-bar-update and hp-change");
    }
    expect(healthBarUpdate.healthValue).toBe(47);
    expect(healthBarUpdate.healthValue).toBe(hpChange.from - hpChange.to);
  });

  it("resolveTurn3RockSlideWindowContent bridges the staged run through presentationEventWindowBridge.ts's existing resolveRockSlidePresentationWindowContent unchanged (zero bridge edits, same finding §9.2/§9's own turn-4 module already made)", () => {
    const content = resolveTurn3RockSlideWindowContent();
    expect(content.message).toMatchObject({ messageId: "STRINGID_USEDMOVE", substitutions: [] });
    expect(content.hp).toMatchObject({ battler: 1, from: 88, to: 41 });
  });

  it("resolveTurn3RockSlideHpEndpoints exposes the from/to pair battleScene.ts's rockSlideOpponentHp/opponentHealthboxContentForHp call sites at drawTurn3RockSlideAttack/drawTurn3RockSlideTurnEndSettledMenu need, replacing the anchorOpponentAfterTurn2Hp/anchorOpponentAfterTurn3Hp direct reads", () => {
    expect(resolveTurn3RockSlideHpEndpoints()).toEqual({ from: 88, to: 41 });
  });
});
