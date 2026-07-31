import { describe, expect, it } from "vitest";
import {
  resolveTurn5SitrusAdapterPreview,
  resolveTurn5SwitchInAdapterPreview,
  TURN5_PRESENTATION_TIMING_NOT_STAGED,
} from "../src/engine/turn5ResolutionAdapterPreview.ts";

/**
 * ISSUES #39 rank-3 groundwork (docs/battle-scene-retirement-inventory.md
 * rank-3 row): equivalence-proof-FIRST pin, NOT a flip -- battleScene.ts is
 * untouched, still rendering its own hand literals for the switch-in/Sitrus
 * half of the turn-5 window. This proves the typed adapter's own output
 * against those hand literals (most of which are unexported `const`s, so
 * this pins literal values with line citations rather than importing them,
 * the same shape rank 2's own switch-in test used for `MURKROW_LEVEL`/
 * hp-142 before those constants existed as exports).
 *
 * FORM USED: complete typed-view structural equality, matching rank 1/2's
 * own precedent -- not rendered-surface pixel hashing.
 */
describe("turn5ResolutionAdapterPreview: #39 rank-3 groundwork (preview, no flip)", () => {
  describe("switch-in half: DESTIN's real forced-switch decision, staged through runBattleScriptFaintedActionsOrchestration", () => {
    it(
      "resolves DESTIN's real replacement -- PIDGEOTTO, party slot 2, Lv50, full 156/156 HP -- matching "
        + "battleScene.ts's own unexported PIDGEOTTO_LEVEL (10224) / PIDGEOTTO_MAX_HP (10234) and "
        + "tests/destinCanonicalReplacements.test.ts's own proven decision (PIDGEOTTO over MURKROW)",
      () => {
        const switchIn = resolveTurn5SwitchInAdapterPreview();
        expect(switchIn.replacementSpecies).toBe("PIDGEOTTO");
        expect(switchIn.replacementPartyIndex).toBe(2);
        expect(switchIn.replacementLevel).toBe(50);
        expect(switchIn.replacementHp).toEqual({ current: 156, max: 156 });
      },
    );

    it(
      "sentOutLine2 is the real STRINGID_SWITCHINMON line-2 shape, byte-identical to battleScene.ts's own "
        + "unexported raw literal SWITCHIN_SENTOUT_LINE2 (10022, \"out PIDGEOTTO!\")",
      () => {
        const switchIn = resolveTurn5SwitchInAdapterPreview();
        expect(switchIn.sentOutLine2).toBe("out PIDGEOTTO!");
      },
    );
  });

  describe(
    "Sitrus half (this slice's own new stage): Onix's real held-item heal, staged through "
      + "runBattleEndTurnOrchestration's already-ported HOLD_EFFECT_RESTORE_HP case -- no ONIX/SITRUS branch added",
    () => {
      it(
        "reproduces Onix's real 1 -> 31 HP climb, matching battleScene.ts's own unexported "
          + "TURN5_SITRUS_HEAL_HP_START/_END (9629-9630) and docs/battle-turn-notes.md's own RAM-confirmed finding",
        () => {
          const sitrus = resolveTurn5SitrusAdapterPreview();
          expect(sitrus.hp).toEqual({ from: 1, to: 31 });
        },
      );

      it("consumes the berry (real removeitem opcode), matching the source's own one-shot proc", () => {
        const sitrus = resolveTurn5SitrusAdapterPreview();
        expect(sitrus.itemConsumed).toBe(true);
      });

      it(
        "resolves the real STRINGID_PKMNSITEMRESTOREDHEALTH text through the existing generic "
          + "resolveBattleStringLines (no new string-table mechanism), byte-identical to battleScene.ts's own "
          + "unexported TURN5_SITRUS_HEAL_LINE1/_LINE2 (9592-9593)",
        () => {
          const sitrus = resolveTurn5SitrusAdapterPreview();
          expect(sitrus.healLines).toEqual(["ONIX’s SITRUS BERRY", "restored health!"]);
        },
      );
    },
  );

  describe("documented gap: presentation TIMING (text-printer clocks, HP-bar cadence, menu-redraw handoff) is NOT staged here", () => {
    it("is named as an explicit, exported marker, not a silently-green omission", () => {
      expect(TURN5_PRESENTATION_TIMING_NOT_STAGED).toBe(true);
    });
  });
});
