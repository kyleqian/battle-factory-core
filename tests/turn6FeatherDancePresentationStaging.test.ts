import { describe, expect, it } from "vitest";
import {
  resolveTurn6AtkFellLines,
  resolveTurn6FeatherDanceKickoffLines,
  resolveTurn6FeatherDanceWindowContent,
  stageTurn6FeatherDanceHitChain,
} from "../src/engine/turn6FeatherDancePresentationStaging.ts";

/**
 * Presentation-seam prep-scout, `turn6-featherdance.json`'s kickoff half
 * (`docs/presentation-seam-scout.md` §12.2): pins the real kernel event
 * inventory a staged PIDGEOTTO FEATHER_DANCE opponent-target chain produces
 * for turn 6's own real recorded FIRST use (ATK stage 6 -> 4), using the
 * real RNG seed this module derives from `docs/turn6-notes.md` §3's own
 * documented post-roll value.
 */
describe("turn6FeatherDancePresentationStaging: staged real FEATHER_DANCE opponent-target chain (docs/presentation-seam-scout.md §12.2)", () => {
  it("reaches the script's own terminal end, draws exactly 1 RNG call (the real accuracy roll), and never touches HP", () => {
    const result = stageTurn6FeatherDanceHitChain();
    expect(result.rngCalls).toBe(1);
    expect(result.rngValueAfter).toBe(1484887866); // docs/turn6-notes.md §3's own recorded post-roll value
    expect(result.events.some((e) => e.kind === "hp-change")).toBe(false);
  });

  it("lowers Onix's own ATK stat stage 6 -> 4 (a real FIRST use, not a repeat) via the real production stat-stage-change emission site (battleScriptStatBuffs.ts:296-303)", () => {
    const result = stageTurn6FeatherDanceHitChain();
    expect(result.atkStageAfter).toBe(4);
    const statEvent = result.events.find((e) => e.kind === "stat-stage-change");
    expect(statEvent).toMatchObject({ battler: 0, stat: "attack", from: 6, to: 4 });
  });

  it("emits STRINGID_USEDMOVE (this window's own kickoff text content) and STRINGID_DEFENDERSSTATFELL (the ATK-fell banner's own text, not STRINGID_ATTACKERSSTATFELL -- target===activeBattler for an opponent-target move)", () => {
    const { events } = stageTurn6FeatherDanceHitChain();
    const messageIds = events.filter((e) => e.kind === "message").map((e) => (e as { messageId: string }).messageId);
    expect(messageIds).toContain("STRINGID_USEDMOVE");
    expect(messageIds).toContain("STRINGID_DEFENDERSSTATFELL");
    expect(messageIds).not.toContain("STRINGID_ATTACKERSSTATFELL");
  });

  it("emits exactly the event-kind shape the registered opcodes produce for a singles, opponent-target, no-damage EFFECT_ATTACK_DOWN_2 use -- no faint-family, no hp-change, no health-bar-update anywhere in this stream", () => {
    const { events } = stageTurn6FeatherDanceHitChain();
    expect(events.some((e) => e.kind === "hp-change" || e.kind === "health-bar-update")).toBe(false);
    expect(events.some((e) => e.kind === "faint-animation" || e.kind === "play-faint-cry")).toBe(false);
    expect(events[0]).toMatchObject({ kind: "message", messageId: "STRINGID_USEDMOVE" });
  });

  it("decrements Pidgeotto's own FEATHER_DANCE PP 15 -> 14 (its first use this battle, docs/turn6-notes.md §4)", () => {
    const { events } = stageTurn6FeatherDanceHitChain();
    const ppEvent = events.find((e) => e.kind === "set-battler-pp-data");
    expect(ppEvent).toMatchObject({ battler: 1, movePosition: 2, pp: 14 });
  });

  it("resolveTurn6FeatherDanceKickoffLines resolves to \"Foe PIDGEOTTO used\\nFEATHERDANCE!\", byte-identical to TURN6_FEATHERDANCE_LINE1/2's own hardcoded literal (battleScene.ts:8860-8861)", () => {
    const lines = resolveTurn6FeatherDanceKickoffLines();
    expect(lines).toEqual(["Foe PIDGEOTTO used", "FEATHERDANCE!"]);
  });

  it("resolveTurn6AtkFellLines resolves line 2 (\"harshly fell!\") byte-identical to TURN6_ATKFELL_LINE2, but line 1 diverges from TURN6_ATKFELL_LINE1 by exactly one glyph: the extracted battle-message-templates.json segment for \"'s \" is a straight ASCII apostrophe, not the curly U+2019 the real font/charmap actually uses (battleMenu.ts:1559's own doc note) -- a real, newly-exposed residual (docs/presentation-seam-scout.md §12), not a bug in this staging module", () => {
    const lines = resolveTurn6AtkFellLines();
    expect(lines).toEqual(["ONIX's ATTACK", "harshly fell!"]); // straight apostrophe -- see this test's own name
    expect(lines[1]).toBe("harshly fell!");
  });

  it("resolveTurn6FeatherDanceWindowContent resolves both the kickoff message and the ATK stat-stage-change purely from the staged event stream's own provenance", () => {
    const content = resolveTurn6FeatherDanceWindowContent();
    expect(content).toEqual({
      message: { messageId: "STRINGID_USEDMOVE" },
      statFell: { messageId: "STRINGID_DEFENDERSSTATFELL", battler: 0, stat: "attack", from: 6, to: 4 },
    });
  });
});
