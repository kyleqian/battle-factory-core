import { describe, expect, it } from "vitest";
import {
  opponentFaintSinkGeometry,
  resolveTurn13ResolutionAdapterPreview,
  TURN13_FORCED_SWITCH_AND_MURKROW_SWITCHIN_NOT_STAGED,
} from "../src/engine/turn13ResolutionAdapterPreview.ts";
import {
  TURN13_DRAGONBREATH_PRESS_TICK,
  TURN13_FAINT_SINK_START_TICK,
  TURN13_FAINT_SINK_STEPS,
  TURN13_HEALTHBOX_VANISH_TICK,
  opponentFaintDismissEligible,
  turn13FaintedTextStartTick,
  turn13FaintedTextVisibleChars,
} from "../src/engine/battleScene.ts";

/**
 * ISSUES #39 rank-2 groundwork regression pin (docs/battle-scene-
 * retirement-inventory.md rank-2 row). FORM USED: complete typed-view
 * structural equality against `battleScene.ts`'s own exported legacy
 * constants/functions -- not rendered-surface pixel hashing, matching rank
 * 1's own precedent (`battle2CommandAdapterEquivalence.test.ts`) and for the
 * same reason: this window's private per-species render primitives
 * (`drawTurn13MurkrowMaterialize`, `TURN13_MURKROW_WOBBLE_TABLE`, etc.) stay
 * module-private and are out of this slice's scope entirely (see the
 * "documented gap" block).
 *
 * The new fact this slice proves (not merely re-imported from entry 751):
 * the faint sink/healthbox-vanish geometry `battleScene.ts` hardcodes as
 * `TURN13_FAINT_SINK_STEPS`/`TURN13_HEALTHBOX_VANISH_TICK` is exactly what
 * `createBattleResolutionPresentation`'s own generic opponent-faint-timing
 * formula produces for Pidgeotto's real front-pic `yOffset` -- not an
 * independently-fit per-species constant.
 */
describe("turn13ResolutionAdapterPreview: #39 rank-2 groundwork equivalence (preview, not flipped)", () => {
  describe("DRAGON_BREATH damage/faint half (entry 751's staged kernel chain, reused)", () => {
    it("reproduces Pidgeotto's real 16 -> 0 KO and the single faint-cleanup status receipt", () => {
      const preview = resolveTurn13ResolutionAdapterPreview();
      expect(preview.hp).toEqual({ from: 16, to: 0 });
      expect(preview.faintedBattler).toBe(1);
      expect(preview.hasParalysisStatusChange).toBe(false);
    });

    it("resolves the same kickoff/faint lines the legacy dispatcher prints, sourced from the kernel string resolver", () => {
      const preview = resolveTurn13ResolutionAdapterPreview();
      expect(preview.kickoffLines).toEqual(["ONIX used", "DRAGONBREATH!"]);
      expect(preview.faintLines).toEqual(["Foe PIDGEOTTO", "fainted!"]);
    });

    it("the kernel-derived fainted-line text total is exactly the cap battleScene.ts's own turn13FaintedTextVisibleChars saturates at", () => {
      const preview = resolveTurn13ResolutionAdapterPreview();
      const faintTextTotal = preview.faintLines.reduce((sum, line) => sum + line.length, 0);
      const start = turn13FaintedTextStartTick(TURN13_DRAGONBREATH_PRESS_TICK);
      expect(turn13FaintedTextVisibleChars(start + faintTextTotal - 1, TURN13_DRAGONBREATH_PRESS_TICK))
        .toBe(faintTextTotal);
      expect(turn13FaintedTextVisibleChars(start + faintTextTotal + 50, TURN13_DRAGONBREATH_PRESS_TICK))
        .toBe(faintTextTotal);
      // The KO-dismiss button-gate only ever opens once the cap above (this
      // exact printed length) is reached -- oracle-confirmed eligible only
      // at/after that tick, never before.
      expect(opponentFaintDismissEligible(start + faintTextTotal - 2)).toBe(false);
    });
  });

  describe("faint sink/healthbox-vanish geometry: proven from the generic resolution formula, not re-derived per species", () => {
    it("computes the SAME steps/healthbox-vanish offset battleScene.ts hardcodes as TURN13_FAINT_SINK_STEPS/TURN13_HEALTHBOX_VANISH_TICK, from Pidgeotto's real front-pic yOffset (11)", () => {
      const preview = resolveTurn13ResolutionAdapterPreview();
      expect(preview.faintSink.steps).toBe(TURN13_FAINT_SINK_STEPS);
      expect(preview.faintSink.healthboxVanishFrame).toBe(
        TURN13_HEALTHBOX_VANISH_TICK - TURN13_FAINT_SINK_START_TICK,
      );
    });

    it("opponentFaintSinkGeometry is the general formula (not hardcoded to Pidgeotto's own yOffset=11)", () => {
      // Grovyle's own real front yOffset (4, battleScene.ts's own
      // GROVYLE_FAINT_SINK_STEPS=8 comment) exercises a second real species
      // through the same formula, confirming this isn't curve-fit to one
      // input.
      expect(opponentFaintSinkGeometry(4)).toEqual({
        steps: 8,
        healthboxVanishFrame: 19,
        minimumFrames: 21,
      });
    });
  });

  describe("documented gap: the forced-switch decision + Murkrow switch-in + turn-14 handoff are NOT staged here", () => {
    it("is named as an explicit, exported marker, not a silently-green omission", () => {
      expect(TURN13_FORCED_SWITCH_AND_MURKROW_SWITCHIN_NOT_STAGED).toBe(true);
    });
  });
});
