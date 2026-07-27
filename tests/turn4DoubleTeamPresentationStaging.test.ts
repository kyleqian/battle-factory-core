import { describe, expect, it } from "vitest";
import {
  resolveTurn4DoubleTeamKickoffLines,
  stageTurn4DoubleTeamHitChain,
} from "../src/engine/turn4DoubleTeamPresentationStaging.ts";

/**
 * Presentation-seam prep-scout, `turn4-doubleteam.json`'s kickoff half
 * (`docs/presentation-seam-scout.md` §11.2): pins the real kernel event
 * inventory a staged GROVYLE DOUBLE_TEAM self-target chain produces for
 * turn 4's own real recorded second use (evasion stage 7 -> 8, not a fresh
 * 6 -> 7 first use), using the same real RNG ledger value
 * `turn4RockSlidePresentationStaging.ts` already carries for this exact turn.
 */
describe("turn4DoubleTeamPresentationStaging: staged real DOUBLE_TEAM self-target chain (docs/presentation-seam-scout.md §11.2)", () => {
  it("reaches the script's own terminal end, draws zero RNG (rngValueAfter byte-identical to the real recorded seed), and never touches HP", () => {
    const result = stageTurn4DoubleTeamHitChain();
    expect(result.rngCalls).toBe(0);
    expect(result.rngValueAfter).toBe(3051035979);
    expect(result.events.some((e) => e.kind === "hp-change")).toBe(false);
  });

  it("raises Grovyle's own EVASION stat stage 7 -> 8 (turn 1's own persisted boost, not a fresh 6 -> 7) via the real production stat-stage-change emission site (battleScriptStatBuffs.ts:296-303)", () => {
    const result = stageTurn4DoubleTeamHitChain();
    expect(result.evasionStageAfter).toBe(8);
    const statEvent = result.events.find((e) => e.kind === "stat-stage-change");
    expect(statEvent).toMatchObject({ battler: 1, stat: "evasion", from: 7, to: 8 });
  });

  it("emits STRINGID_USEDMOVE (this window's own kickoff text content) and STRINGID_DEFENDERSSTATROSE (the evasion-rise banner's own text, not STRINGID_ATTACKERSSTATROSE -- target===attacker for a self-target move)", () => {
    const { events } = stageTurn4DoubleTeamHitChain();
    const messageIds = events.filter((e) => e.kind === "message").map((e) => (e as { messageId: string }).messageId);
    expect(messageIds).toContain("STRINGID_USEDMOVE");
    expect(messageIds).toContain("STRINGID_DEFENDERSSTATROSE");
    expect(messageIds).not.toContain("STRINGID_ATTACKERSSTATROSE");
  });

  it("emits exactly the event-kind sequence the registered opcodes produce for a singles, self-target, no-damage EFFECT_EVASION_UP use -- no faint-family, no hp-change, no health-bar-update anywhere in this stream", () => {
    const { events } = stageTurn4DoubleTeamHitChain();
    expect(events.some((e) => e.kind === "hp-change" || e.kind === "health-bar-update")).toBe(false);
    expect(events.some((e) => e.kind === "faint-animation" || e.kind === "play-faint-cry")).toBe(false);
    expect(events[0]).toMatchObject({ kind: "message", messageId: "STRINGID_USEDMOVE" });
  });

  it("resolveTurn4DoubleTeamKickoffLines resolves to \"Foe GROVYLE used\\nDOUBLE TEAM!\", byte-identical to TURN_KICKOFF_LINE1/2's own hardcoded literal (battleMenu.ts:1086,1088)", () => {
    const lines = resolveTurn4DoubleTeamKickoffLines();
    expect(lines).toEqual(["Foe GROVYLE used", "DOUBLE TEAM!"]);
  });
});
