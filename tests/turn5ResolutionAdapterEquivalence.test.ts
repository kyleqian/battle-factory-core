import { describe, expect, it } from "vitest";
import {
  isTurn5NextCommandHandoffReady,
  resolveTurn5CompletedResolutionNextCommandHandoff,
  resolveTurn5FaintSinkGeometry,
  resolveTurn5SitrusAdapter,
  resolveTurn5SwitchInAdapter,
} from "../src/engine/turn5ResolutionAdapter.ts";
import { currentPPForActiveMon } from "../src/engine/battleMenu.ts";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import {
  GROVYLE_FAINT_SINK_START_TICK,
  GROVYLE_FAINT_SINK_STEPS,
  GROVYLE_HEALTHBOX_VANISH_TICK,
  TURN5_SITRUS_HEAL_HP_END,
  TURN5_SITRUS_HEAL_HP_START,
  TURN5_SITRUS_HEAL_LINE1,
  TURN5_SITRUS_HEAL_LINE2,
} from "../src/engine/battleScene.ts";

/**
 * ISSUES #39 rank-3 flip, both halves, regression pin (docs/battle-scene-
 * retirement-inventory.md rank-3 row). Formerly a pre-flip equivalence proof
 * (turn5ResolutionAdapterPreviewEquivalence.test.ts); the flip wired the
 * faint-sink geometry, PIDGEOTTO switch-in literals, and (half 2) the Sitrus
 * heal HP endpoints/message text into `battleScene.ts` --
 * `GROVYLE_FAINT_SINK_STEPS`/`GROVYLE_HEALTHBOX_VANISH_TICK`, `PIDGEOTTO_
 * LEVEL`, `pidgeottoHealthboxContent`, `SWITCHIN_SENTOUT_LINE2`, and
 * `TURN5_SITRUS_HEAL_HP_START`/`_END`/`TURN5_SITRUS_HEAL_LINE1`/`_LINE2` are
 * all now literally derived from this adapter's own output, not
 * independently re-stated -- so this pins the live production path for both
 * halves, not a standalone proof. The Sitrus presentation TIMING curves
 * (`turn5SitrusHealTextVisibleChars`, `turn5SitrusOnixHp`'s animation shape,
 * `turn5SitrusRingMatrix`, `turn5SitrusResettledBounceTick`) stay their own
 * oracle-pixel-fit closed forms, untouched by this flip.
 *
 * FORM USED: complete typed-view structural equality against `battleScene.ts`'s
 * own exported constants -- not rendered-surface pixel hashing, matching
 * rank 1/2's own precedent.
 */
describe("turn5ResolutionAdapter: #39 rank-3 kernel-to-typed-owner equivalence (production path, both halves)", () => {
  describe("faint sink/healthbox-vanish geometry: GROVYLE_FAINT_SINK_STEPS/GROVYLE_HEALTHBOX_VANISH_TICK are now literally derived from the generic resolution formula", () => {
    it("battleScene.ts's exported constants equal the adapter's own faintSink fields, evaluated at Grovyle's real front-pic yOffset (4)", () => {
      const faintSink = resolveTurn5FaintSinkGeometry();
      expect(faintSink.steps).toBe(GROVYLE_FAINT_SINK_STEPS);
      expect(faintSink.healthboxVanishFrame).toBe(
        GROVYLE_HEALTHBOX_VANISH_TICK - GROVYLE_FAINT_SINK_START_TICK,
      );
      // Numeric regression pin: the former hand-fit constants this flip
      // deleted (GROVYLE_FAINT_SINK_STEPS=8, GROVYLE_HEALTHBOX_VANISH_TICK
      // = GROVYLE_FAINT_SINK_START_TICK+19).
      expect(GROVYLE_FAINT_SINK_STEPS).toBe(8);
      expect(GROVYLE_HEALTHBOX_VANISH_TICK).toBe(GROVYLE_FAINT_SINK_START_TICK + 19);
    });
  });

  describe("switch-in half: DESTIN's real forced-switch decision, staged through runBattleScriptFaintedActionsOrchestration", () => {
    it(
      "resolves DESTIN's real replacement -- PIDGEOTTO, party slot 2, Lv50, full 156/156 HP -- matching "
        + "battleScene.ts's own PIDGEOTTO_LEVEL/pidgeottoHealthboxContent and "
        + "tests/destinCanonicalReplacements.test.ts's own proven decision (PIDGEOTTO over MURKROW)",
      () => {
        const switchIn = resolveTurn5SwitchInAdapter();
        expect(switchIn.replacementSpecies).toBe("PIDGEOTTO");
        expect(switchIn.replacementPartyIndex).toBe(2);
        expect(switchIn.replacementLevel).toBe(50);
        expect(switchIn.replacementHp).toEqual({ current: 156, max: 156 });
      },
    );

    it(
      "sentOutLine2 is the real STRINGID_SWITCHINMON line-2 shape, byte-identical to battleScene.ts's own "
        + "former raw literal SWITCHIN_SENTOUT_LINE2 (\"out PIDGEOTTO!\")",
      () => {
        const switchIn = resolveTurn5SwitchInAdapter();
        expect(switchIn.sentOutLine2).toBe("out PIDGEOTTO!");
      },
    );
  });

  describe(
    "Sitrus half (rank-3's own half 2, now wired): Onix's real held-item heal, staged through "
      + "runBattleEndTurnOrchestration's already-ported HOLD_EFFECT_RESTORE_HP case -- no ONIX/SITRUS branch added",
    () => {
      it(
        "battleScene.ts's own exported TURN5_SITRUS_HEAL_HP_START/_END equal a fresh, independently-computed "
          + "adapter call's real 1 -> 31 HP climb, matching docs/battle-turn-notes.md's own RAM-confirmed finding",
        () => {
          const sitrus = resolveTurn5SitrusAdapter();
          expect(sitrus.hp).toEqual({ from: 1, to: 31 });
          expect(TURN5_SITRUS_HEAL_HP_START).toBe(sitrus.hp.from);
          expect(TURN5_SITRUS_HEAL_HP_END).toBe(sitrus.hp.to);
          // Numeric regression pin: the former hand-fit constants this flip
          // deleted (TURN5_SITRUS_HEAL_HP_START=1, _END=31).
          expect(TURN5_SITRUS_HEAL_HP_START).toBe(1);
          expect(TURN5_SITRUS_HEAL_HP_END).toBe(31);
        },
      );

      it("consumes the berry (real removeitem opcode), matching the source's own one-shot proc", () => {
        const sitrus = resolveTurn5SitrusAdapter();
        expect(sitrus.itemConsumed).toBe(true);
      });

      it(
        "battleScene.ts's own exported TURN5_SITRUS_HEAL_LINE1/_LINE2 equal a fresh, independently-computed "
          + "adapter call's real STRINGID_PKMNSITEMRESTOREDHEALTH text, resolved through the existing generic "
          + "resolveBattleStringLines (no new string-table mechanism)",
        () => {
          const sitrus = resolveTurn5SitrusAdapter();
          expect(sitrus.healLines).toEqual(["ONIX’s SITRUS BERRY", "restored health!"]);
          expect(TURN5_SITRUS_HEAL_LINE1).toBe(sitrus.healLines[0]);
          expect(TURN5_SITRUS_HEAL_LINE2).toBe(sitrus.healLines[1]);
        },
      );
    },
  );

  describe("completed-resolution/next-command handoff (rank-2 predecessor retirement proof)", () => {
    it("publishes the core guard's settled redraw and input-ready facts for the following FIGHT reopen", () => {
      const handoff = resolveTurn5CompletedResolutionNextCommandHandoff();

      expect(handoff.nextCommand).toEqual({ redraw: "settled", input: "ready" });
      expect(isTurn5NextCommandHandoffReady(handoff)).toBe(true);
      expect(isTurn5NextCommandHandoffReady(null)).toBe(false);
    });

    it("publishes the persisted ROCK_SLIDE slot required by the turn-6 FIGHT dispatcher", () => {
      const handoff = resolveTurn5CompletedResolutionNextCommandHandoff();

      expect(handoff.persistedMoveSlot).toBe(0);
    });

    it("owns exactly the post-turn-5 menu PP receipt consumed by the live submenu", () => {
      const onix = rentalMoveset("ONIX");
      const handoff = resolveTurn5CompletedResolutionNextCommandHandoff();
      const receiptPp = currentPPForActiveMon(
        onix,
        true, true, true, true, handoff,
      );

      expect(receiptPp).toEqual([6, 20, 19, 10]);
      expect(handoff.playerPp).toEqual(receiptPp);
      expect(handoff.playerPp).toEqual([6, 20, 19, 10]);
    });
  });
});
