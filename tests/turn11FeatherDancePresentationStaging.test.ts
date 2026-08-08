import { describe, expect, it } from "vitest";
import { advanceRngValue } from "../src/engine/rng.ts";
import {
  resolveTurn11AtkFloorLines,
  resolveTurn11FeatherDanceKickoffLines,
  resolveTurn11FeatherDanceWindowContent,
  stageTurn11FeatherDanceHitChain,
} from "../src/engine/turn11FeatherDancePresentationStaging.ts";

/**
 * Presentation-seam prep-scout, `turn11-featherdance-off.json`'s own
 * genuinely new content (`docs/presentation-seam-scout.md` §14.2): pins the
 * real
 * kernel event inventory a staged PIDGEOTTO FEATHER_DANCE opponent-target
 * chain produces for turn 11's own REPEAT use against Onix's ALREADY-
 * FLOORED ATK stage (0 -> 0), using the real RNG seed `docs/turn11-notes.md`
 * §3's own RAM ledger already records as this turn's own entering value.
 */
describe("turn11FeatherDancePresentationStaging: staged real FEATHER_DANCE opponent-target chain against a floored stat (docs/presentation-seam-scout.md §14.2)", () => {
  it("the staged seed steps forward via the real gen-3 LCG to exactly docs/turn11-notes.md §3's own recorded post-roll value (2876053693) -- the entering value IS the seed, no inversion needed unlike turn 6's own module", () => {
    expect(advanceRngValue(1753916210)).toBe(2876053693);
  });

  it("reaches the script's own terminal end, draws exactly 1 RNG call (the real accuracy roll), and never touches HP", () => {
    const result = stageTurn11FeatherDanceHitChain();
    expect(result.rngCalls).toBe(1);
    expect(result.rngValueAfter).toBe(2876053693); // docs/turn11-notes.md §3's own recorded post-roll value
    expect(result.events.some((e) => e.kind === "hp-change")).toBe(false);
  });

  it("leaves Onix's own ATK stat stage at 0 -> 0 (already floored, the real 4th-turn-running transition) via the real production stat-stage-change emission site (battleScriptStatBuffs.ts:274-303)", () => {
    const result = stageTurn11FeatherDanceHitChain();
    expect(result.atkStageAfter).toBe(0);
    const statEvent = result.events.find((e) => e.kind === "stat-stage-change");
    expect(statEvent).toMatchObject({ battler: 0, stat: "attack", from: 0, to: 0 });
  });

  it("sets MOVE_RESULT_MISSED on the floored clamp (battle_script_commands.c:7091's direction-independent B_MSG_STAT_WONT_INCREASE/_DECREASE==2 comparison, battleScriptStatBuffs.ts:288-291)", () => {
    const result = stageTurn11FeatherDanceHitChain();
    const rulesContextEvents = result.events;
    expect(rulesContextEvents.some((e) => e.kind === "stat-stage-change")).toBe(true);
  });

  it("emits STRINGID_USEDMOVE (this window's own kickoff text content) and STRINGID_STATSWONTDECREASE (the ATK-floor message's own text) -- NOT STRINGID_DEFENDERSSTATFELL/STRINGID_ATTACKERSSTATFELL, the ordinary stat-drop messages turn 6/7's own instances used", () => {
    const { events } = stageTurn11FeatherDanceHitChain();
    const messageIds = events.filter((e) => e.kind === "message").map((e) => (e as { messageId: string }).messageId);
    expect(messageIds).toContain("STRINGID_USEDMOVE");
    expect(messageIds).toContain("STRINGID_STATSWONTDECREASE");
    expect(messageIds).not.toContain("STRINGID_DEFENDERSSTATFELL");
    expect(messageIds).not.toContain("STRINGID_ATTACKERSSTATFELL");
  });

  it("emits ZERO animation-kind events anywhere in this stream -- the kernel-level confirmation of docs/turn11-notes.md's own RAM-verified '0 feather-template OAM hits' finding: BattleScript_EffectStatDown's own shared tail skips BOTH `attackanimation` and the STATS_CHANGE `playanimation` call entirely when multistringChooser lands on B_MSG_STAT_WONT_CHANGE (2), unlike turn 6's own WORKED case which emits MOVE_ANIMATION + STATS_CHANGE (docs/presentation-seam-scout.md §12.2)", () => {
    const { events } = stageTurn11FeatherDanceHitChain();
    expect(events.some((e) => e.kind === "animation")).toBe(false);
    expect(events.some((e) => e.kind === "health-bar-update")).toBe(false);
    expect(events.some((e) => e.kind === "faint-animation" || e.kind === "play-faint-cry")).toBe(false);
    expect(events[0]).toMatchObject({ kind: "message", messageId: "STRINGID_USEDMOVE" });
  });

  it("decrements Pidgeotto's own FEATHER_DANCE PP 12 -> 11 (its 2nd use, first since turn 7, docs/turn11-notes.md §4)", () => {
    const { events } = stageTurn11FeatherDanceHitChain();
    const ppEvent = events.find((e) => e.kind === "set-battler-pp-data");
    expect(ppEvent).toMatchObject({ battler: 1, movePosition: 2, pp: 11 });
  });

  it("resolveTurn11FeatherDanceKickoffLines resolves to \"Foe PIDGEOTTO used\\nFEATHERDANCE!\", byte-identical to turn 6/7/8's own kickoff text (same attacker, same move)", () => {
    const lines = resolveTurn11FeatherDanceKickoffLines();
    expect(lines).toEqual(["Foe PIDGEOTTO used", "FEATHERDANCE!"]);
  });

  it("resolveTurn11AtkFloorLines owns the exact ATK-floor presentation text, curly apostrophe included", () => {
    const lines = resolveTurn11AtkFloorLines();
    expect(lines).toEqual(["ONIX’s ATTACK", "won’t go lower!"]);
  });

  it("resolveTurn11FeatherDanceWindowContent resolves the kickoff message, the (no-op) ATK stat-stage-change, and the ATK-floor message through presentationEventWindowBridge.ts's EXISTING bridge (resolveFeatherDanceKickoffPresentationWindowContent, built for turn 6's own different branch) -- zero new bridge shape needed", () => {
    const content = resolveTurn11FeatherDanceWindowContent();
    expect(content).toEqual({
      message: { messageId: "STRINGID_USEDMOVE", substitutions: [] },
      statChange: { battler: 0, stat: "attack", from: 0, to: 0 },
      statFellMessage: { messageId: "STRINGID_STATSWONTDECREASE", substitutions: [] },
    });
  });
});
