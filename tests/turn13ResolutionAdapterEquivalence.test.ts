import { describe, expect, it } from "vitest";
import {
  isTurn13NextCommandHandoffReady,
  opponentFaintSinkGeometry,
  resolveTurn13CompletedResolutionNextCommandHandoff,
  resolveTurn13ResolutionAdapter,
  resolveTurn13SwitchInAdapter,
} from "../src/engine/turn13ResolutionAdapter.ts";
import {
  TURN13_DRAGONBREATH_PRESS_TICK,
  TURN13_FAINT_SINK_START_TICK,
  TURN13_FAINT_SINK_STEPS,
  TURN13_HEALTHBOX_VANISH_TICK,
  opponentFaintDismissEligible,
  turn13FaintedTextStartTick,
  turn13FaintedTextVisibleChars,
} from "../src/engine/battleScene.ts";
import { currentPPForActiveMon } from "../src/engine/battleMenu.ts";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import { CANONICAL_OPPONENT_FLY_RESOLUTION } from "../src/engine/turn15FlyResolutionAdapter.ts";

/**
 * ISSUES #39 rank-2 regression pin (docs/battle-scene-retirement-
 * inventory.md rank-2 row). Formerly a pre-flip equivalence proof
 * (turn13ResolutionAdapterPreviewEquivalence.test.ts); the flip wired
 * turn13ResolutionAdapter.ts into `drawDragonBreathKoWindow`/
 * `drawFaintedOpponentWindow` (battleScene.ts) -- `TURN13_DRAGONBREATH_HP`,
 * the kickoff/faint line constants, and `TURN13_FAINT_SINK_STEPS`/
 * `TURN13_HEALTHBOX_VANISH_TICK` are now literally derived from this
 * adapter's own output, not independently re-stated -- so this now pins the
 * live production path, not a standalone proof.
 *
 * FORM USED: complete typed-view structural equality against `battleScene.ts`'s
 * own exported legacy constants/functions -- not rendered-surface pixel
 * hashing, matching rank 1's own precedent
 * (`battle2CommandAdapterEquivalence.test.ts`) and for the same reason: this
 * window's private per-species render primitives
 * (`drawTurn13MurkrowMaterialize`, `TURN13_MURKROW_WOBBLE_TABLE`, etc.) stay
 * module-private and are out of this slice's scope entirely (see the
 * "documented gap" block).
 */
describe("turn13ResolutionAdapter: #39 rank-2 kernel-to-typed-owner equivalence (production path)", () => {
  describe("DRAGON_BREATH damage/faint half (entry 751's staged kernel chain, reused)", () => {
    it("reproduces Pidgeotto's real 16 -> 0 KO and the single faint-cleanup status receipt", () => {
      const preview = resolveTurn13ResolutionAdapter();
      expect(preview.hp).toEqual({ from: 16, to: 0 });
      expect(preview.faintedBattler).toBe(1);
      expect(preview.hasParalysisStatusChange).toBe(false);
    });

    it("resolves the same kickoff/faint lines the production dispatcher prints, sourced from the kernel string resolver", () => {
      const preview = resolveTurn13ResolutionAdapter();
      expect(preview.kickoffLines).toEqual(["ONIX used", "DRAGONBREATH!"]);
      expect(preview.faintLines).toEqual(["Foe PIDGEOTTO", "fainted!"]);
    });

    it("the kernel-derived fainted-line text total is exactly the cap battleScene.ts's own turn13FaintedTextVisibleChars saturates at", () => {
      const preview = resolveTurn13ResolutionAdapter();
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

  describe("faint sink/healthbox-vanish geometry: TURN13_FAINT_SINK_STEPS/TURN13_HEALTHBOX_VANISH_TICK are now literally derived from the generic resolution formula", () => {
    it("battleScene.ts's exported constants equal the adapter's own faintSink fields, evaluated at Pidgeotto's real front-pic yOffset (11)", () => {
      const preview = resolveTurn13ResolutionAdapter();
      expect(preview.faintSink.steps).toBe(TURN13_FAINT_SINK_STEPS);
      expect(preview.faintSink.healthboxVanishFrame).toBe(
        TURN13_HEALTHBOX_VANISH_TICK - TURN13_FAINT_SINK_START_TICK,
      );
      // Numeric regression pin: the former hand-fit constants this flip
      // deleted (TURN13_FAINT_SINK_STEPS=7, TURN13_HEALTHBOX_VANISH_TICK=15977).
      expect(TURN13_FAINT_SINK_STEPS).toBe(7);
      expect(TURN13_HEALTHBOX_VANISH_TICK).toBe(15977);
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

  describe("switch-in half (this slice): the forced-switch decision + Murkrow switch-in are now staged, chained through runBattleScriptFaintedActionsOrchestration", () => {
    it("resolves DESTIN's real replacement -- MURKROW, party slot 1, Lv50, full 142/142 HP -- matching battleScene.ts's own MURKROW_LEVEL/hp-142 constants and destinCanonicalReplacements.test.ts's own proven decision", () => {
      const switchIn = resolveTurn13SwitchInAdapter();
      expect(switchIn.replacementSpecies).toBe("MURKROW");
      expect(switchIn.replacementPartyIndex).toBe(1);
      expect(switchIn.replacementLevel).toBe(50);
      expect(switchIn.replacementHp).toEqual({ current: 142, max: 142 });
    });

    it("sentOutLine2 is the real STRINGID_SWITCHINMON line-2 shape, byte-identical to battleScene.ts's own former raw literal TURN13_SWITCHIN_SENTOUT_LINE2", () => {
      const switchIn = resolveTurn13SwitchInAdapter();
      expect(switchIn.sentOutLine2).toBe("out MURKROW!");
    });
  });

  describe("completed-resolution/next-command handoff (rank-2 predecessor retirement proof)", () => {
    it("publishes the core guard's settled redraw and input-ready facts for the following FIGHT reopen", () => {
      const handoff = resolveTurn13CompletedResolutionNextCommandHandoff();

      expect(handoff.nextCommand).toEqual({ redraw: "settled", input: "ready" });
      expect(isTurn13NextCommandHandoffReady(handoff)).toBe(true);
      expect(isTurn13NextCommandHandoffReady(null)).toBe(false);
    });

    it("publishes the persisted DRAGON_BREATH slot required by the FIGHT dispatcher", () => {
      const handoff = resolveTurn13CompletedResolutionNextCommandHandoff();

      expect(handoff.persistedMoveSlot).toBe(2);
    });

    it("owns the turn-14 submenu's post-turn-13 DRAGON_BREATH PP receipt, not the already-completed FLY charge owner", () => {
      const onix = rentalMoveset("ONIX");
      const handoff = resolveTurn13CompletedResolutionNextCommandHandoff();
      const predecessorPp = currentPPForActiveMon(
        onix,
        true, true, true, true, true, true, true,
        true, true, true, true, true,
        handoff,
      )[2];
      const chargeOwnerPp = CANONICAL_OPPONENT_FLY_RESOLUTION
        .chargeResolution.segments[0]!.afterRules.rulesContext.battlers[0]!.pp[2];

      expect(predecessorPp).toBe(18);
      expect(handoff.dragonBreathPp).toEqual({ current: predecessorPp, max: 20 });
      expect(chargeOwnerPp).toBe(17);
      expect(handoff.dragonBreathPp.current).not.toBe(chargeOwnerPp);
    });
  });
});
