import { describe, expect, it } from "vitest";
import {
  resolveTurn8BindKickoffLines,
  resolveTurn8BindWindowContent,
  resolveTurn8MissLines,
  stageTurn8BindHitReceipts,
  stageTurn8BindMiss,
} from "../src/engine/turn8BindPresentationStaging.ts";
import { TURN8_BIND_LINE1, TURN8_BIND_LINE2, TURN8_MISS_LINE1, TURN8_MISS_LINE2 } from "../src/engine/battleScene.ts";

/**
 * ISSUES #39 rank-4 slice 5 (final rank-4 slice, `docs/rank4-prep-scout.md`
 * §2.4/§3 item 5): pins the real kernel event inventory turn 8's own BIND
 * kickoff + miss staged chain produces (the canonical MISS), plus the
 * on-hit trap-start branch as a kernel-only receipt -- honest: no
 * presentation window renders that branch, the canonical line always misses
 * (see `turn8BindPresentationStaging.ts`'s own top doc).
 */
describe("turn8BindPresentationStaging: #39 rank-4 slice 5", () => {
  describe("the canonical MISS", () => {
    it("reaches the script's own terminal end, draws exactly 1 RNG call, and lands on docs/turn8-notes.md §3's own tick-9844 post-roll value", () => {
      const result = stageTurn8BindMiss();
      expect(result.rngValueAfter).toBe(3780969147);
    });

    it("emits the event-kind sequence a miss takes (message, ppreduce, message, 2x sprite-visibility) -- no animation/hp-change at all", () => {
      const { events } = stageTurn8BindMiss();
      expect(events.map((e) => e.kind)).toEqual([
        "message",
        "set-battler-pp-data",
        "message",
        "set-battler-sprite-visibility",
        "set-battler-sprite-visibility",
      ]);
    });

    it("decrements Onix's own BIND PP 20 -> 19 even on the miss (ppreduce runs before the accuracy branch resolves)", () => {
      const result = stageTurn8BindMiss();
      expect(result.onixBindPpAfter).toBe(19);
    });

    it("leaves Pidgeotto's own HP unchanged at 82 (BIND missed, no damage)", () => {
      const result = stageTurn8BindMiss();
      expect(result.pidgeottoHpAfter).toBe(82);
    });

    it("emits STRINGID_USEDMOVE under BattleScript_PrintMoveMissed's own sourceLabel (NOT BattleScript_HitFromAtkString -- a miss takes a different label for the same fixed messageId) and STRINGID_ATTACKMISSED under BattleScript_MoveMissed", () => {
      const { events } = stageTurn8BindMiss();
      const messages = events.filter((e) => e.kind === "message") as readonly { messageId: string; provenance: { sourceLabel: string } }[];
      expect(messages.map((m) => ({ messageId: m.messageId, sourceLabel: m.provenance.sourceLabel }))).toEqual([
        { messageId: "STRINGID_USEDMOVE", sourceLabel: "BattleScript_PrintMoveMissed" },
        { messageId: "STRINGID_ATTACKMISSED", sourceLabel: "BattleScript_MoveMissed" },
      ]);
    });

    it("resolveTurn8BindWindowContent resolves the real staged {message, missMessage} pair via the new generic bridge resolver", () => {
      const content = resolveTurn8BindWindowContent();
      expect(content).toEqual({
        message: { messageId: "STRINGID_USEDMOVE", substitutions: [] },
        missMessage: { messageId: "STRINGID_ATTACKMISSED", substitutions: [] },
      });
    });

    it("resolveTurn8BindKickoffLines / resolveTurn8MissLines are byte-identical to battleScene.ts's own TURN8_BIND_LINE1/2 and TURN8_MISS_LINE1/2 hand literals", () => {
      expect(resolveTurn8BindKickoffLines()).toEqual([TURN8_BIND_LINE1, TURN8_BIND_LINE2]);
      expect(resolveTurn8MissLines()).toEqual([TURN8_MISS_LINE1, TURN8_MISS_LINE2]);
    });
  });

  describe("the HIT branch -- kernel receipt only, NOT this turn's own real outcome (the canonical line misses)", () => {
    it("reaches the script's own terminal end via the SAME BattleScript_EffectTrap entry, dealing real (non-zero) damage to Pidgeotto", () => {
      const receipts = stageTurn8BindHitReceipts();
      expect(receipts.targetHpAfter).toBeLessThan(82);
      expect(receipts.targetHpAfter).toBeGreaterThanOrEqual(0);
    });

    it("stamps the real trap-start facts: STATUS2_WRAPPED set on Pidgeotto, wrappedBy Onix (battler 0), wrappedMove BIND (20)", () => {
      const receipts = stageTurn8BindHitReceipts();
      const STATUS2_WRAPPED_MASK = (1 << 13) | (1 << 14) | (1 << 15);
      expect(receipts.targetStatus2 & STATUS2_WRAPPED_MASK).not.toBe(0);
      expect(receipts.targetWrappedBy).toBe(0);
      expect(receipts.targetWrappedMove).toBe(20);
    });

    it("emits STRINGID_USEDMOVE under BattleScript_HitFromAtkString's own sourceLabel (the SAME label ROCK_SLIDE's own kickoff uses -- a hit merges into the generic hit chain) and the trap on-hit message STRINGID_PKMNSQUEEZEDBYBIND", () => {
      const { events } = stageTurn8BindHitReceipts();
      const messages = events.filter((e) => e.kind === "message") as readonly { messageId: string; provenance: { sourceLabel: string } }[];
      expect(messages[0]).toMatchObject({ messageId: "STRINGID_USEDMOVE" });
      expect(messages[0]!.provenance.sourceLabel).toBe("BattleScript_HitFromAtkString");
      expect(messages.map((m) => m.messageId)).toContain("STRINGID_PKMNSQUEEZEDBYBIND");
    });
  });
});
