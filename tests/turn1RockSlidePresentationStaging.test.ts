import { describe, expect, it } from "vitest";
import { stageTurn1RockSlideHitChain } from "../src/engine/turn1RockSlidePresentationStaging.ts";

/**
 * Prep-scout proof-of-events (`docs/presentation-seam-scout.md` §8) for the
 * NEXT presentation window in the retirement path (ISSUES #39/#41):
 * `turn1-rockslide.json` (`drawRockSlideWindow`/`drawRockSlideAttack`,
 * `battleScene.ts:11771-11836`). Pins the real kernel event inventory a
 * staged ONIX ROCK_SLIDE -> GROVYLE hit chain produces today, so the
 * eventual window conversion has a mechanical, already-verified event list
 * to consume instead of re-deriving it from scratch.
 */
describe("turn1RockSlidePresentationStaging: staged real ROCK_SLIDE hit chain (docs/presentation-seam-scout.md §8)", () => {
  it("reaches the script's own terminal end with a genuine (non-fainting) hit -- 143 -> 97, matching turn 1's own real 'Grovyle survives' shape (real turn 1 settles 143 -> 101; this run's own RNG draw computes a different, still-real, damage roll)", () => {
    const result = stageTurn1RockSlideHitChain();
    expect(result.targetHpAfter).toBeGreaterThan(0);
    expect(result.targetHpAfter).toBeLessThan(143);
  });

  it("emits exactly the event-kind sequence the registered opcodes produce for a singles, no-Pressure, non-crit, neutral-effectiveness ROCK_SLIDE hit -- every kind §8's mapping table needs from this chain, in real dispatch order", () => {
    const { events } = stageTurn1RockSlideHitChain();
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
  });

  it("attackstring resolves to STRINGID_USEDMOVE with zero substitutions (the string resolver's own B_ATK_NAME_WITH_PREFIX/B_BUFF2 placeholders are spliced by the presentation-side resolver, not carried on the event itself -- same shape battleStringResolver.ts's turn5-faint precedent already established for STRINGID_TARGETFAINTED)", () => {
    const { events } = stageTurn1RockSlideHitChain();
    const message = events.find((e) => e.kind === "message");
    expect(message).toMatchObject({ messageId: "STRINGID_USEDMOVE", substitutions: [] });
  });

  it("hp-change carries Grovyle's real pre-hit HP (143, anchorOpponentBattler.hp's own value) as `from`, and a nonzero `to` -- the two RAM-dump reads (battleScene.ts:940-946) this window's opponent-healthbox render would stop needing", () => {
    const { events } = stageTurn1RockSlideHitChain();
    const hpChange = events.find((e) => e.kind === "hp-change");
    expect(hpChange).toMatchObject({ battler: 1, from: 143 });
    if (hpChange?.kind !== "hp-change") throw new Error("expected hp-change");
    expect(hpChange.to).toBeGreaterThan(0);
    expect(hpChange.to).toBeLessThan(143);
  });

  it("health-bar-update's healthValue is the DAMAGE DELTA (from - to, 46), not the settled end HP -- a real finding worth carrying forward: rockSlideOpponentHp's own two-endpoint interpolation (battleMenu.ts) needs hp-change's `from`/`to` pair, not this event's own field, which answers 'how far to animate the bar down' rather than 'where it ends up'", () => {
    const { events } = stageTurn1RockSlideHitChain();
    const healthBarUpdate = events.find((e) => e.kind === "health-bar-update");
    const hpChange = events.find((e) => e.kind === "hp-change");
    if (healthBarUpdate?.kind !== "health-bar-update" || hpChange?.kind !== "hp-change") {
      throw new Error("expected both health-bar-update and hp-change");
    }
    expect(healthBarUpdate.healthValue).toBe(hpChange.from - hpChange.to);
  });

  it("animation events carry the move id (157, MOVE_ROCK_SLIDE) as their first argument but no shake/rock-spawn choreography -- confirms §5 gap 6 (no frame-by-frame payload) is still open for this window's own ~10 rockSlide* helper functions", () => {
    const { events } = stageTurn1RockSlideHitChain();
    const animations = events.filter((e) => e.kind === "animation");
    expect(animations).toHaveLength(2);
    expect(animations[0]).toMatchObject({ animationId: "MOVE_ANIMATION", arguments: ["157", "0", "75", expect.any(String), "0", "0"] });
    expect(animations[1]).toMatchObject({ animationId: "HIT_ANIMATION", arguments: [] });
  });

  it("this ROCK_SLIDE hit chain specifically does not exercise stat-stage-change (the DOUBLE_TEAM evasion-rise banner's own STAT_ROSE_LINE1/2 input needs a SEPARATE DOUBLE_TEAM/EFFECT_EVASION_UP script run, not this ONIX-attacks-GROVYLE chain) -- correction to this scout's own §7.1/§7.2 #3 framing ('zero production emission sites anywhere in the kernel'): the main-lane step's pre-work (tests/battleScriptStatbuffchangeOpcode.test.ts's own 'Double Team' case) proved the kernel already constructs and threads this event end-to-end for a real move's own script entry label -- the gap was never-asserted-by-any-test, not never-emitted-by-any-code. This chain's own absence of the event is simply because ROCK_SLIDE has no stat effect, not because the event kind is unreachable.", () => {
    const { events } = stageTurn1RockSlideHitChain();
    expect(events.some((e) => e.kind === "stat-stage-change")).toBe(false);
  });
});
