import { describe, expect, it } from "vitest";
import { advanceRngValue } from "../src/engine/rng.ts";
import {
  resolveTurn13AccFellLines,
  resolveTurn13SandAttackKickoffLines,
  resolveTurn13SandAttackWindowContent,
  stageTurn13SandAttackHitChain,
} from "../src/engine/turn13SandAttackPresentationStaging.ts";

/**
 * Presentation-seam prep-scout, `turn13-sandattack.json`'s kickoff+
 * accuracy-drop half (`docs/presentation-seam-scout.md` §15.2): pins the
 * real kernel event inventory a staged PIDGEOTTO SAND_ATTACK opponent-target
 * chain produces for turn 13's own real recorded use (accuracy stage
 * 6 -> 5), using the real RNG seed this session's own live probe found.
 */
describe("turn13SandAttackPresentationStaging: staged real SAND_ATTACK opponent-target chain (docs/presentation-seam-scout.md §15.2)", () => {
  it("the staged seed round-trips to this session's own live-probed post-roll value (2173905089 -> 2287569056, docs/turn13-notes.md §2's own ledger row)", () => {
    expect(advanceRngValue(2173905089)).toBe(2287569056);
  });

  it("reaches the script's own terminal end, draws exactly 1 RNG call (the real accuracy roll), and never touches HP", () => {
    const result = stageTurn13SandAttackHitChain();
    expect(result.rngCalls).toBe(1);
    expect(result.rngValueAfter).toBe(2287569056);
    expect(result.events.some((e) => e.kind === "hp-change")).toBe(false);
  });

  it("lowers Onix's own accuracy stat stage 6 -> 5 (a real, non-floored drop) via the real production stat-stage-change emission site (battleScriptStatBuffs.ts:296-303)", () => {
    const result = stageTurn13SandAttackHitChain();
    expect(result.accStageAfter).toBe(5);
    const statEvent = result.events.find((e) => e.kind === "stat-stage-change");
    expect(statEvent).toMatchObject({ battler: 0, stat: "accuracy", from: 6, to: 5 });
  });

  it("emits STRINGID_USEDMOVE (this window's own kickoff text content) and STRINGID_DEFENDERSSTATFELL (the accuracy-fell banner's own text, not STRINGID_ATTACKERSSTATFELL -- target===activeBattler for an opponent-target move, exactly like turn 6's own FEATHER_DANCE, no role inversion)", () => {
    const { events } = stageTurn13SandAttackHitChain();
    const messageIds = events.filter((e) => e.kind === "message").map((e) => (e as { messageId: string }).messageId);
    expect(messageIds).toContain("STRINGID_USEDMOVE");
    expect(messageIds).toContain("STRINGID_DEFENDERSSTATFELL");
    expect(messageIds).not.toContain("STRINGID_ATTACKERSSTATFELL");
  });

  it("emits exactly the event-kind shape the registered opcodes produce for a singles, opponent-target, no-damage EFFECT_ACCURACY_DOWN use -- no faint-family, no hp-change, no health-bar-update anywhere in this stream", () => {
    const { events } = stageTurn13SandAttackHitChain();
    expect(events.some((e) => e.kind === "hp-change" || e.kind === "health-bar-update")).toBe(false);
    expect(events.some((e) => e.kind === "faint-animation" || e.kind === "play-faint-cry")).toBe(false);
    expect(events[0]).toMatchObject({ kind: "message", messageId: "STRINGID_USEDMOVE" });
  });

  it("decrements Pidgeotto's own SAND_ATTACK PP 15 -> 14 (docs/turn13-notes.md §3)", () => {
    const { events } = stageTurn13SandAttackHitChain();
    const ppEvent = events.find((e) => e.kind === "set-battler-pp-data");
    expect(ppEvent).toMatchObject({ battler: 1, movePosition: 3, pp: 14 });
  });

  it("resolveTurn13SandAttackKickoffLines resolves the production window's kickoff from the staged STRINGID_USEDMOVE event", () => {
    const lines = resolveTurn13SandAttackKickoffLines();
    expect(lines).toEqual(["Foe PIDGEOTTO used", "SAND-ATTACK!"]);
  });

  it("resolveTurn13AccFellLines resolves the production window's accuracy banner from the staged 6 -> 5 stat-stage-change, curly apostrophe included", () => {
    const lines = resolveTurn13AccFellLines();
    expect(lines).toEqual(["ONIX’s accuracy", "fell!"]);
  });

  it("resolveTurn13SandAttackWindowContent resolves the kickoff message, the accuracy stat-stage-change, and the stat-fell message through presentationEventWindowBridge.ts's own EXISTING bridge (resolveFeatherDanceKickoffPresentationWindowContent), UNCHANGED -- proving no new/widened bridge function is required for this shape", () => {
    const content = resolveTurn13SandAttackWindowContent();
    expect(content).toEqual({
      message: { messageId: "STRINGID_USEDMOVE", substitutions: [] },
      statChange: { battler: 0, stat: "accuracy", from: 6, to: 5 },
      statFellMessage: { messageId: "STRINGID_DEFENDERSSTATFELL", substitutions: [] },
    });
  });
});
