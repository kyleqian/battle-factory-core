import { describe, expect, it } from "vitest";
import {
  resolveTurn5FaintSinkGeometry,
  resolveTurn5SitrusAdapter,
  resolveTurn5SwitchInAdapter,
  TURN5_PRESENTATION_TIMING_NOT_STAGED,
} from "../src/engine/turn5ResolutionAdapter.ts";
import {
  GROVYLE_FAINT_SINK_START_TICK,
  GROVYLE_FAINT_SINK_STEPS,
  GROVYLE_HEALTHBOX_VANISH_TICK,
} from "../src/engine/battleScene.ts";

/**
 * ISSUES #39 rank-3 flip, half 1 of 2 regression pin (docs/battle-scene-
 * retirement-inventory.md rank-3 row). Formerly a pre-flip equivalence proof
 * (turn5ResolutionAdapterPreviewEquivalence.test.ts); the flip wired the
 * faint-sink geometry and PIDGEOTTO switch-in literals into
 * `battleScene.ts` -- `GROVYLE_FAINT_SINK_STEPS`/`GROVYLE_HEALTHBOX_VANISH_
 * TICK`, `PIDGEOTTO_LEVEL`, `pidgeottoHealthboxContent`, and
 * `SWITCHIN_SENTOUT_LINE2` are now literally derived from this adapter's own
 * output, not independently re-stated -- so this now pins the live
 * production path for that half, not a standalone proof. The Sitrus half
 * (`resolveTurn5SitrusAdapter`) remains a standalone proof only -- see the
 * "documented gap" block, rank-3's own explicit half-2 boundary.
 *
 * FORM USED: complete typed-view structural equality against `battleScene.ts`'s
 * own exported constants -- not rendered-surface pixel hashing, matching
 * rank 1/2's own precedent.
 */
describe("turn5ResolutionAdapter: #39 rank-3 kernel-to-typed-owner equivalence (production path, half 1 of 2)", () => {
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
    "Sitrus half (proven, not yet wired -- rank-3's own half 2): Onix's real held-item heal, staged through "
      + "runBattleEndTurnOrchestration's already-ported HOLD_EFFECT_RESTORE_HP case -- no ONIX/SITRUS branch added",
    () => {
      it(
        "reproduces Onix's real 1 -> 31 HP climb, matching battleScene.ts's own unexported "
          + "TURN5_SITRUS_HEAL_HP_START/_END (9629-9630) and docs/battle-turn-notes.md's own RAM-confirmed finding",
        () => {
          const sitrus = resolveTurn5SitrusAdapter();
          expect(sitrus.hp).toEqual({ from: 1, to: 31 });
        },
      );

      it("consumes the berry (real removeitem opcode), matching the source's own one-shot proc", () => {
        const sitrus = resolveTurn5SitrusAdapter();
        expect(sitrus.itemConsumed).toBe(true);
      });

      it(
        "resolves the real STRINGID_PKMNSITEMRESTOREDHEALTH text through the existing generic "
          + "resolveBattleStringLines (no new string-table mechanism), byte-identical to battleScene.ts's own "
          + "unexported TURN5_SITRUS_HEAL_LINE1/_LINE2 (9592-9593)",
        () => {
          const sitrus = resolveTurn5SitrusAdapter();
          expect(sitrus.healLines).toEqual(["ONIX’s SITRUS BERRY", "restored health!"]);
        },
      );
    },
  );

  describe("documented gap: the Sitrus half's own presentation TIMING is NOT staged here", () => {
    it("is named as an explicit, exported marker, not a silently-green omission", () => {
      expect(TURN5_PRESENTATION_TIMING_NOT_STAGED).toBe(true);
    });
  });
});
