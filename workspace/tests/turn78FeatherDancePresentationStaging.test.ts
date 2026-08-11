import { describe, expect, it } from "vitest";
import {
  resolveTurn7AtkFellLines,
  resolveTurn7FeatherDanceKickoffLines,
  resolveTurn7FeatherDanceWindowContent,
  resolveTurn8AtkFellLines,
  resolveTurn8FeatherDanceKickoffLines,
  resolveTurn8FeatherDanceWindowContent,
  stageTurn7FeatherDanceHitChain,
  stageTurn8FeatherDanceHitChain,
} from "../src/engine/turn78FeatherDancePresentationStaging.ts";
import { TURN6_FEATHERDANCE_LINE1, TURN6_FEATHERDANCE_LINE2 } from "../src/engine/battleScene.ts";
import { TURN6_ATKFELL_LINE1, TURN6_ATKFELL_LINE2 } from "../src/engine/battleMenu.ts";

/**
 * ISSUES #39 rank-4 slice 3 (`docs/rank4-prep-scout.md` slice 3): pins the
 * real kernel event inventory turn 7's and turn 8's own repeat staged
 * FEATHER_DANCE chains produce, each using its own real entering ATK stage
 * and its own real RNG seed carried forward from the preceding turn's own
 * ledger (see `turn78FeatherDancePresentationStaging.ts`'s own top doc).
 */
describe("turn78FeatherDancePresentationStaging: #39 rank-4 slice 3", () => {
  describe("turn 7: Pidgeotto's 2nd FEATHER_DANCE use, Onix ATK stage 4 -> 2", () => {
    it("reaches the script's own terminal end, draws exactly 1 RNG call, and lands on docs/turn7-notes.md §3's own tick-8390 post-roll value", () => {
      const result = stageTurn7FeatherDanceHitChain();
      expect(result.rngCalls).toBe(1);
      expect(result.rngValueAfter).toBe(1495764607);
      expect(result.events.some((e) => e.kind === "hp-change")).toBe(false);
    });

    it("lowers Onix's own ATK stat stage 4 -> 2 (real cumulative 2nd drop, not turn 6's own 6 -> 4)", () => {
      const result = stageTurn7FeatherDanceHitChain();
      expect(result.atkStageAfter).toBe(2);
      const statEvent = result.events.find((e) => e.kind === "stat-stage-change");
      expect(statEvent).toMatchObject({ battler: 0, stat: "attack", from: 4, to: 2 });
    });

    it("emits STRINGID_USEDMOVE and STRINGID_DEFENDERSSTATFELL, decrements Pidgeotto's own FEATHER_DANCE PP 14 -> 13 (its 2nd use)", () => {
      const { events } = stageTurn7FeatherDanceHitChain();
      const messageIds = events.filter((e) => e.kind === "message").map((e) => (e as { messageId: string }).messageId);
      expect(messageIds).toContain("STRINGID_USEDMOVE");
      expect(messageIds).toContain("STRINGID_DEFENDERSSTATFELL");
      const ppEvent = events.find((e) => e.kind === "set-battler-pp-data");
      expect(ppEvent).toMatchObject({ battler: 1, movePosition: 2, pp: 13 });
    });

    it("resolveTurn7FeatherDanceWindowContent resolves the real staged from/to (4 -> 2), not turn 6's", () => {
      const content = resolveTurn7FeatherDanceWindowContent();
      expect(content).toEqual({
        message: { messageId: "STRINGID_USEDMOVE", substitutions: [] },
        statChange: { battler: 0, stat: "attack", from: 4, to: 2 },
        statFellMessage: { messageId: "STRINGID_DEFENDERSSTATFELL", substitutions: [] },
      });
    });

    it("resolveTurn7FeatherDanceKickoffLines / resolveTurn7AtkFellLines are byte-identical to battleScene.ts's own TURN6_FEATHERDANCE_LINE1/2 and TURN6_ATKFELL_LINE1/2 (same messageId, same magnitude -- text is turn-invariant, re-derived from turn 7's own facts, not copied)", () => {
      expect(resolveTurn7FeatherDanceKickoffLines()).toEqual([TURN6_FEATHERDANCE_LINE1, TURN6_FEATHERDANCE_LINE2]);
      expect(resolveTurn7AtkFellLines()).toEqual([TURN6_ATKFELL_LINE1, TURN6_ATKFELL_LINE2]);
    });
  });

  describe("turn 8: Pidgeotto's 3rd FEATHER_DANCE use, Onix ATK stage 2 -> 0 (hits the floor, ordinary fall text still plays)", () => {
    it("reaches the script's own terminal end, draws exactly 1 RNG call, and lands on docs/turn8-notes.md §3's own tick-9436 post-roll value", () => {
      const result = stageTurn8FeatherDanceHitChain();
      expect(result.rngCalls).toBe(1);
      expect(result.rngValueAfter).toBe(680271464);
      expect(result.events.some((e) => e.kind === "hp-change")).toBe(false);
    });

    it("lowers Onix's own ATK stat stage 2 -> 0 (lands exactly on MIN_STAT_STAGE)", () => {
      const result = stageTurn8FeatherDanceHitChain();
      expect(result.atkStageAfter).toBe(0);
      const statEvent = result.events.find((e) => e.kind === "stat-stage-change");
      expect(statEvent).toMatchObject({ battler: 0, stat: "attack", from: 2, to: 0 });
    });

    it("still emits the ordinary STRINGID_DEFENDERSSTATFELL, NOT STRINGID_STATSWONTDECREASE -- docs/turn8-notes.md §4's own floor-check-happens-before-decrement finding, kernel-confirmed", () => {
      const { events } = stageTurn8FeatherDanceHitChain();
      const messageIds = events.filter((e) => e.kind === "message").map((e) => (e as { messageId: string }).messageId);
      expect(messageIds).toContain("STRINGID_DEFENDERSSTATFELL");
      expect(messageIds).not.toContain("STRINGID_STATSWONTDECREASE");
      const ppEvent = events.find((e) => e.kind === "set-battler-pp-data");
      expect(ppEvent).toMatchObject({ battler: 1, movePosition: 2, pp: 12 });
    });

    it("resolveTurn8FeatherDanceWindowContent resolves the real staged from/to (2 -> 0)", () => {
      const content = resolveTurn8FeatherDanceWindowContent();
      expect(content).toEqual({
        message: { messageId: "STRINGID_USEDMOVE", substitutions: [] },
        statChange: { battler: 0, stat: "attack", from: 2, to: 0 },
        statFellMessage: { messageId: "STRINGID_DEFENDERSSTATFELL", substitutions: [] },
      });
    });

    it("resolveTurn8FeatherDanceKickoffLines / resolveTurn8AtkFellLines are byte-identical to battleScene.ts's own TURN6_FEATHERDANCE_LINE1/2 and TURN6_ATKFELL_LINE1/2", () => {
      expect(resolveTurn8FeatherDanceKickoffLines()).toEqual([TURN6_FEATHERDANCE_LINE1, TURN6_FEATHERDANCE_LINE2]);
      expect(resolveTurn8AtkFellLines()).toEqual([TURN6_ATKFELL_LINE1, TURN6_ATKFELL_LINE2]);
    });
  });
});
