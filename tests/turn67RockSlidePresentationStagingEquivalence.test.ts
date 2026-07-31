import { describe, expect, it } from "vitest";
import {
  resolveTurn6RockSlideAttackLines,
  resolveTurn6RockSlideHpEndpoints,
  resolveTurn6RockSlideWindowContent,
  resolveTurn7RockSlideAttackLines,
  resolveTurn7RockSlideHpEndpoints,
  resolveTurn7RockSlideWindowContent,
  stageTurn6RockSlideHitChain,
  stageTurn7RockSlideHitChain,
} from "../src/engine/turn67RockSlidePresentationStaging.ts";
import { ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2 } from "../src/engine/battleMenu.ts";

/**
 * ISSUES #39 rank-4 slice 1 (`docs/rank4-prep-scout.md` slice 1 + slice 4):
 * promoted from the equivalence-proof-first preview
 * (`turn67RockSlidePresentationStagingPreviewEquivalence.test.ts`,
 * `1c015a37`) now that `battleScene.ts` sources its turn-6/7 ROCK_SLIDE HP
 * endpoints and attack-kickoff text from this module
 * (`TURN6_PIDGEOTTO_AFTER_ROCKSLIDE_HP`/`TURN7_PIDGEOTTO_AFTER_ROCKSLIDE_HP`,
 * `battleScene.ts:11038`/`:11302`, both now `resolveTurn6/7RockSlideHpEndpoints().to`
 * calls rather than bare literals) -- this is the live production path's own
 * regression pin, not a standalone proof. Those two HP constants are still
 * unexported `const`s, so they are pinned with a line citation rather than
 * imported, the same convention rank 3's own preview equivalence test
 * (`turn5ResolutionAdapterPreviewEquivalence.test.ts`, `2fa31c96`) used for
 * `PIDGEOTTO_LEVEL`/`PIDGEOTTO_MAX_HP`. `ROCK_SLIDE_LINE1`/`LINE2` ARE
 * exported from `battleMenu.ts` (`battle2CommandAdapterEquivalence.test.ts`
 * already imports them the same way), so those are imported and compared
 * directly -- `battleScene.ts`'s own turn-6/7 ROCK_SLIDE windows no longer
 * read them directly (retired to `TURN6/7_ROCKSLIDE_ATTACK_LINE1/2`, this
 * module's own output), but every OTHER turn's own ROCK_SLIDE window in that
 * file still does, out of this slice's own scope.
 */
describe("turn67RockSlidePresentationStaging: #39 rank-4 slice 1 (production path, flipped)", () => {
  describe("turn 6: Onix ROCK_SLIDE -> Pidgeotto, real -2 ATK stage already applied by this turn's own FEATHER_DANCE", () => {
    it("reaches the script's own terminal end with the real recorded hit -- 156 -> 113 (-43), byte-identical to docs/turn6-notes.md §4 and battleScene.ts's own TURN6_PIDGEOTTO_AFTER_ROCKSLIDE_HP (11038)", () => {
      const result = stageTurn6RockSlideHitChain();
      expect(result.targetHpAfter).toBe(113);
    });

    it("entering ATK stage is the real 4 (-2 from neutral), not the shared stagePlayerHitChainToTerminalMachineState helper's hardcoded neutral 6 -- the scout-doc correction this module's own top doc explains", () => {
      const result = stageTurn6RockSlideHitChain();
      expect(result.attackerAtkStageEntering).toBe(4);
    });

    it("consumes exactly 4 Random() calls and lands on rngValueAfter byte-identical to docs/turn6-notes.md §3's own tick-8104 secondary-effect-roll entry (3551375038), round-tripping the real seed forward through the real formula", () => {
      const result = stageTurn6RockSlideHitChain();
      expect(result.rngValueAfter).toBe(3551375038);
    });

    it("emits the same event-kind sequence turn1/3/4's own ROCK_SLIDE modules already pin (message, ppreduce, animation, play-se, animation, health-bar-update, hp-change, message, 2x sprite-visibility)", () => {
      const { events } = stageTurn6RockSlideHitChain();
      expect(events.map((e) => e.kind)).toEqual([
        "message",
        "set-battler-pp-data",
        "animation",
        "play-se",
        "animation",
        "health-bar-update",
        "hp-change",
        "message",
        "set-battler-sprite-visibility",
        "set-battler-sprite-visibility",
      ]);
    });

    it("resolveTurn6RockSlideWindowContent bridges the staged run through presentationEventWindowBridge.ts's existing resolveRockSlidePresentationWindowContent unchanged (zero bridge edits)", () => {
      const content = resolveTurn6RockSlideWindowContent();
      expect(content.message).toMatchObject({ messageId: "STRINGID_USEDMOVE", substitutions: [] });
      expect(content.hp).toMatchObject({ battler: 1, from: 156, to: 113 });
    });

    it("resolveTurn6RockSlideHpEndpoints exposes the real {from, to} pair that now literally drives TURN6_PIDGEOTTO_AFTER_ROCKSLIDE_HP's own .to value", () => {
      expect(resolveTurn6RockSlideHpEndpoints()).toEqual({ from: 156, to: 113 });
    });

    it("resolveTurn6RockSlideAttackLines is byte-identical to battleMenu.ts's own exported ROCK_SLIDE_LINE1/LINE2 (\"ONIX used\"/\"ROCK SLIDE!\")", () => {
      expect(resolveTurn6RockSlideAttackLines()).toEqual([ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2]);
    });
  });

  describe("turn 7: repeats turn 6's exact move pair, real cumulative -4 ATK stage, own HP pair", () => {
    it("reaches the script's own terminal end with the real recorded hit -- 113 -> 82 (-31), byte-identical to docs/turn7-notes.md §4 and battleScene.ts's own TURN7_PIDGEOTTO_AFTER_ROCKSLIDE_HP (11302)", () => {
      const result = stageTurn7RockSlideHitChain();
      expect(result.targetHpAfter).toBe(82);
    });

    it("entering ATK stage is the real cumulative 2 (-4 from neutral, turns 6+7's own FEATHER_DANCE drops)", () => {
      const result = stageTurn7RockSlideHitChain();
      expect(result.attackerAtkStageEntering).toBe(2);
    });

    it("consumes exactly 4 Random() calls and lands on rngValueAfter byte-identical to docs/turn7-notes.md §3's own tick-9126 secondary-effect-roll entry (637293907)", () => {
      const result = stageTurn7RockSlideHitChain();
      expect(result.rngValueAfter).toBe(637293907);
    });

    it("resolveTurn7RockSlideWindowContent bridges the staged run through the same generic bridge, own HP pair", () => {
      const content = resolveTurn7RockSlideWindowContent();
      expect(content.message).toMatchObject({ messageId: "STRINGID_USEDMOVE", substitutions: [] });
      expect(content.hp).toMatchObject({ battler: 1, from: 113, to: 82 });
    });

    it("resolveTurn7RockSlideHpEndpoints exposes the real {from, to} pair that now literally drives TURN7_PIDGEOTTO_AFTER_ROCKSLIDE_HP's own .to value", () => {
      expect(resolveTurn7RockSlideHpEndpoints()).toEqual({ from: 113, to: 82 });
    });

    it("resolveTurn7RockSlideAttackLines is byte-identical to battleMenu.ts's own exported ROCK_SLIDE_LINE1/LINE2, re-derived from turn 7's own staged run (not copied from turn 6's)", () => {
      expect(resolveTurn7RockSlideAttackLines()).toEqual([ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2]);
    });
  });

  describe("cross-check: turn 6's real ATK stage vs. the broken shared-helper substitute this module's own top doc names", () => {
    it("the real, non-neutral entering ATK stage (4) is strictly below the shared helper's hardcoded neutral (6) -- confirms this module is NOT staging a no-op difference", () => {
      const result = stageTurn6RockSlideHitChain();
      expect(result.attackerAtkStageEntering).toBeLessThan(6);
    });
  });
});
