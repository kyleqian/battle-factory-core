import { describe, expect, it } from "vitest";
import {
  stagePlayerHitChain,
  stagePlayerHitChainToTerminalMachineState,
  stageTurn1RockSlideHitChain,
} from "../src/engine/turn1RockSlidePresentationStaging.ts";
import { runBattleScriptFaintedActionsOrchestration } from "../src/engine/battleScriptFaintedActionsOrchestration.ts";

/**
 * Presentation-seam retirement, window 2 (`docs/presentation-seam-scout.md`
 * §8, ISSUES #39/#41): `turn1-rockslide.json`
 * (`drawRockSlideWindow`/`drawRockSlideAttack`, `battleScene.ts`). Pins the
 * real kernel event inventory a staged ONIX ROCK_SLIDE -> GROVYLE hit chain
 * produces today, using turn 1's own real recorded RNG seed
 * (`turn1RockSlidePresentationStaging.ts`'s own module doc), so the window's
 * `hp-change` endpoints are byte-identical to the real recorded 143 -> 101
 * settle, not just "a different, still-real" roll.
 */
describe("turn1RockSlidePresentationStaging: staged real ROCK_SLIDE hit chain (docs/presentation-seam-scout.md §8)", () => {
  it("reaches the script's own terminal end with the real recorded hit -- 143 -> 101, byte-identical to battle1-turn1-ram-dump.json's own before_turn/after_turn.battler1.hp", () => {
    const result = stageTurn1RockSlideHitChain();
    expect(result.targetHpAfter).toBe(101);
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

  it("hp-change carries Grovyle's real pre-hit HP (143) as `from` and the real settled HP (101) as `to` -- the two RAM-dump reads (battleScene.ts's anchorOpponentBattler.hp/anchorOpponentAfterTurnHp) this window's opponent-healthbox render stops needing", () => {
    const { events } = stageTurn1RockSlideHitChain();
    const hpChange = events.find((e) => e.kind === "hp-change");
    expect(hpChange).toMatchObject({ battler: 1, from: 143, to: 101 });
  });

  it("health-bar-update's healthValue is the DAMAGE DELTA (from - to, 42), not the settled end HP -- a real finding worth carrying forward: rockSlideOpponentHp's own two-endpoint interpolation (battleMenu.ts) needs hp-change's `from`/`to` pair, not this event's own field, which answers 'how far to animate the bar down' rather than 'where it ends up'", () => {
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
    expect(animations[0]).toMatchObject({ animationId: "MOVE_ANIMATION", arguments: ["157", "0", "75", "42", "0", "0"] });
    expect(animations[1]).toMatchObject({ animationId: "HIT_ANIMATION", arguments: [] });
  });

  it("this ROCK_SLIDE hit chain specifically does not exercise stat-stage-change (the DOUBLE_TEAM evasion-rise banner's own STAT_ROSE_LINE1/2 input needs a SEPARATE DOUBLE_TEAM/EFFECT_EVASION_UP script run, not this ONIX-attacks-GROVYLE chain) -- correction to this scout's own §7.1/§7.2 #3 framing ('zero production emission sites anywhere in the kernel'): the main-lane step's pre-work (tests/battleScriptStatbuffchangeOpcode.test.ts's own 'Double Team' case) proved the kernel already constructs and threads this event end-to-end for a real move's own script entry label -- the gap was never-asserted-by-any-test, not never-emitted-by-any-code. This chain's own absence of the event is simply because ROCK_SLIDE has no stat effect, not because the event kind is unreachable.", () => {
    const { events } = stageTurn1RockSlideHitChain();
    expect(events.some((e) => e.kind === "stat-stage-change")).toBe(false);
  });
});

/**
 * ISSUES #39 rank-2 switch-in half: `stagePlayerHitChainToTerminalMachineState`
 * is the additive sibling `turn13ResolutionAdapter.ts` needs to chain a
 * staged hit chain's own terminal halt straight into
 * `runBattleScriptFaintedActionsOrchestration` -- both shapes (the
 * pre-existing reduced `{events, rngValueAfter, attacker, target}` view and
 * this new full machine-state view) must agree, and the new view must be a
 * directly usable `runBattleScriptFaintedActionsOrchestration` input with no
 * further construction.
 */
describe("stagePlayerHitChainToTerminalMachineState: additive full terminal state (ISSUES #39 rank-2)", () => {
  const TURN1_INPUT = Object.freeze({
    attacker: {
      hp: 143,
      species: 95, // SPECIES_ONIX
      attack: 51,
      defense: 187,
      spAttack: 36,
      spDefense: 72,
      types: ["TYPE_ROCK", "TYPE_GROUND"] as const,
      moves: [157, 0, 0, 0] as const, // MOVE_ROCK_SLIDE
      pp: [10, 0, 0, 0] as const,
    },
    target: {
      hp: 143,
      species: 278, // SPECIES_GROVYLE
      attack: 103,
      defense: 56,
      spAttack: 91,
      spDefense: 71,
      types: ["TYPE_GRASS", "TYPE_GRASS"] as const,
    },
    currentMove: 157,
    currentMovePosition: 0 as const,
    moveEffectByte: 0,
    rngSeed: 3485459011,
  });

  it("state.rulesContext.battlers[0]/[1] and events are byte-identical to stagePlayerHitChain's own reduced projection of the same input", () => {
    const reduced = stagePlayerHitChain(TURN1_INPUT);
    const { state } = stagePlayerHitChainToTerminalMachineState(TURN1_INPUT);
    expect(state.rulesContext.battlers[0]).toEqual(reduced.attacker);
    expect(state.rulesContext.battlers[1]).toEqual(reduced.target);
    expect(state.rng.value).toBe(reduced.rngValueAfter);
    expect(state.events).toEqual(reduced.events);
  });

  it("halts with a real terminal haltReason, ready to hand to runBattleScriptFaintedActionsOrchestration with no further construction", () => {
    const { program, handlers, state } = stagePlayerHitChainToTerminalMachineState(TURN1_INPUT);
    expect(state.haltReason?.kind).toBe("terminal");
    // Grovyle survives this hit (143 -> 101, non-lethal) -- the real,
    // provable "nothing to do" shape for this seam, not a fabricated stub.
    const result = runBattleScriptFaintedActionsOrchestration(program, handlers, state);
    expect(result.kind).toBe("no-fainted-battlers");
  });

  it("accepts the optional party input additively -- omitted (every pre-existing caller) still defaults to the empty party, unaffected", () => {
    const { state } = stagePlayerHitChainToTerminalMachineState(TURN1_INPUT);
    expect(state.rulesContext.party.opponent.every((member) => member.species === 0)).toBe(true);
  });
});
