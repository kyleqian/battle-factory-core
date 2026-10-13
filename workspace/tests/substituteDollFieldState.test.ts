import { describe, expect, it } from "vitest";
import substituteAsset from "../src/animation/assets/substitute.json" with { type: "json" };
import {
  battleCommandFieldArtElevation, battleCommandFieldSpriteOrigin, createBattleCommandFieldArtView,
} from "../src/engine/battleCommandFieldArt.ts";
import type { BattleCommandFieldBattler } from "../src/engine/battleCommandPresentation.ts";
import type {
  BattleResolutionDisplayedField, BattleResolutionPresentationCommand,
} from "../src/engine/battleResolutionPresentation.ts";
import {
  applySubstituteDollCommand, createBattleResolutionPresentationRenderView, substituteDollAtCommandStart,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";

// S10A Substitute part 1 (docs/next-adapters-prep37.md s2-3): the presentation-only "doll shown" field flag.
// Doll pixels vs the ROM: tools/integration/substDollFieldCheck.ts (receipt tools/integration/fixtures/subst-live-receipt.json).
const SPECIES = { PERSIAN: 53, SLOWBRO: 80, GOLBAT: 42 } as const;
const mon = (side: "player" | "trainer", battler: 0 | 1, species: number) =>
  Object.freeze({ side, battler, partyIndex: 0, species, name: "X", level: 50, gender: "male", hp: 10, maxHP: 10,
    status: "none", moveIds: [164, 0, 0, 0], currentPP: [10, 0, 0, 0], ppBonuses: 0 }) as unknown as BattleCommandFieldBattler;
const FIELD: BattleResolutionDisplayedField = Object.freeze({
  player: mon("player", 0, SPECIES.PERSIAN), opponent: mon("trainer", 1, SPECIES.GOLBAT),
});
const anim = (battler: 0 | 1, moveId: number) => Object.freeze({
  type: "move-animation", eventSequence: 1, battler,
  animation: { moveId, attacker: battler, target: battler === 0 ? 1 : 0 }, timing: { minimumFrames: 1 },
}) as unknown as BattleResolutionPresentationCommand;
const cmd = (command: Record<string, unknown>) => Object.freeze(command) as unknown as BattleResolutionPresentationCommand;
const dolls = (f: BattleResolutionDisplayedField) => [f.player.substituteDoll === true, f.opponent.substituteDoll === true];

describe("Substitute doll field art (prep37 s3a)", () => {
  it("shows the source doll sheet + palette at the species-independent corner, never elevated", () => {
    const art = createBattleCommandFieldArtView({
      player: { ...FIELD.player, substituteDoll: true }, opponent: { ...FIELD.opponent, substituteDoll: true },
    });
    expect(art.player.pic.tileset).toBe(substituteAsset.back);
    expect(art.opponent.pic.tileset).toBe(substituteAsset.front);
    expect(art.player.pic.palette).toBe(substituteAsset.palette);
    expect(art.opponent.pic.palette).toBe(substituteAsset.palette);
    expect(battleCommandFieldSpriteOrigin(art.player, "player")).toEqual({ x: 40, y: 65 });
    // GetSubstituteSpriteDefault_Y - 32; elevated GOLBAT's doll ignores gEnemyMonElevation (prep37: 6898 / 6898 rows).
    expect(battleCommandFieldSpriteOrigin(art.opponent, "opponent")).toEqual({ x: 144, y: 24 });
    expect(battleCommandFieldArtElevation(art.opponent, "opponent")).toBe(0);
    expect([art.player.substituteDoll, art.opponent.substituteDoll]).toEqual([true, true]);
    // The mon identity / coords are untouched.
    expect(art.opponent.speciesSymbol).toBe("GOLBAT");
  });

  it("without the flag the field view is the mon (elevated GOLBAT keeps its elevation)", () => {
    const art = createBattleCommandFieldArtView(FIELD);
    expect(art.player.substituteDoll).toBeUndefined();
    expect(art.opponent.substituteDoll).toBeUndefined();
    expect(art.opponent.pic.tileset).not.toBe(substituteAsset.front);
    expect(battleCommandFieldArtElevation(art.opponent, "opponent")).toBe(8);
    expect(battleCommandFieldSpriteOrigin(art.opponent, "opponent").y).toBe(art.opponent.origin.y - 8);
  });
});

describe("Substitute doll lifecycle (presentation queue)", () => {
  it("a completed Substitute body shows its attacker as the doll (either side); other bodies do not", () => {
    expect(dolls(applySubstituteDollCommand(FIELD, anim(0, 164)))).toEqual([true, false]);
    expect(dolls(applySubstituteDollCommand(FIELD, anim(1, 164)))).toEqual([false, true]);
    expect(applySubstituteDollCommand(FIELD, anim(0, 33))).toBe(FIELD);
    // A request-less Scene OFF pause never sets it.
    expect(applySubstituteDollCommand(FIELD, cmd({ type: "move-animation", eventSequence: 1, battler: 0, timing: { minimumFrames: 1 } }))).toBe(FIELD);
  });

  it("clears at the fade message, the faint and the switch-out start (SUBSTITUTE_TO_MON first), per battler", () => {
    const both = applySubstituteDollCommand(applySubstituteDollCommand(FIELD, anim(0, 164)), anim(1, 164));
    expect(dolls(both)).toEqual([true, true]);
    const fade = cmd({ type: "message", eventSequence: 2, lines: ["a"], advance: "automatic", noCursor: false,
      timing: { minimumFrames: 1, holdFrames: 0 }, substituteFadeBattler: 1 });
    expect(dolls(substituteDollAtCommandStart(both, fade))).toEqual([true, false]);
    expect(dolls(applySubstituteDollCommand(both, fade))).toEqual([true, false]);
    expect(dolls(substituteDollAtCommandStart(both, cmd({ type: "faint", eventSequence: 3, battler: 0 })))).toEqual([false, true]);
    expect(dolls(substituteDollAtCommandStart(both, cmd({ type: "switch-out", eventSequence: 3, battler: 1 })))).toEqual([true, false]);
    // An ordinary message / hit / HP command keeps it.
    const plain = cmd({ type: "message", eventSequence: 4, lines: ["b"], advance: "automatic", noCursor: false, timing: { minimumFrames: 1, holdFrames: 0 } });
    expect(applySubstituteDollCommand(both, plain)).toBe(both);
    expect(applySubstituteDollCommand(both, cmd({ type: "hit-animation", eventSequence: 5, battler: 0 }))).toBe(both);
  });

  it("a switch-in shows the incoming battler as settled: an ordinary switch clears, a Baton Pass carry keeps the doll", () => {
    const subbed = applySubstituteDollCommand(FIELD, anim(0, 164));
    const incoming = mon("player", 0, SPECIES.SLOWBRO);
    const switchIn = (doll: boolean) => cmd({ type: "switch-in", eventSequence: 6, battler: 0, fromPartyIndex: 0, toPartyIndex: 1,
      incoming: doll ? { ...incoming, substituteDoll: true } : incoming, incomingStatus1: 0, timing: { minimumFrames: 1 }, settleHoldFrames: 0 });
    // The switch-out start already showed the mon; the incoming snapshot decides after the send-in.
    expect(dolls(substituteDollAtCommandStart(subbed, cmd({ type: "switch-out", eventSequence: 5, battler: 0 })))).toEqual([false, false]);
    expect(dolls(substituteDollAtCommandStart(subbed, switchIn(false)))).toEqual([true, false]);
    const segment = (doll: boolean) => ({ field: subbed, beforeRules: null, afterRules: null, events: [], commands: [switchIn(doll)] });
    const view = (doll: boolean, commandIndex: number) => createBattleResolutionPresentationRenderView({
      ...ROUTE_RESOLUTION, field: subbed, segments: [segment(doll)], segmentIndex: 0, commandIndex,
      lifecycle: { phase: "presenting", phaseElapsed: 0 },
    } as never).field;
    // During the send-in the incoming mon is drawn (Baton Pass included); once the switch-in completes the carry shows the doll.
    expect(dolls(view(true, 0))).toEqual([false, false]);
    expect(dolls(view(true, 1))).toEqual([true, false]);
    expect(dolls(view(false, 1))).toEqual([false, false]);
  });
});

// Ordinary generated-rental routes (tools/integration/substRouteScan.ts): rentals[0] uses Substitute on turn 1.
const ROUTE_RESOLUTION = (() => {
  let resolution: unknown = null;
  generatedCommandAnimationReplay(60, "on", [3], 28, true, true, (state) => {
    resolution ??= state.battleResolutionPresentation;
  });
  return resolution as Record<string, unknown>;
})();

describe("Substitute doll on ordinary routes", () => {
  const trace = (seed: number, streak: number, slots: readonly (0 | 1 | 2 | 3)[], scene: "on" | "off") => {
    const seen: string[] = [];
    let last = "";
    const run = generatedCommandAnimationReplay(seed, scene, slots, streak, true, true, (state) => {
      const r = state.battleResolutionPresentation;
      const field = r ? createBattleResolutionPresentationRenderView(r).field : state.battleCommandPresentation?.field;
      if (!field) return;
      const key = `${dolls(field).map(Number).join("")}@${r ? `${r.resolutionId.requestId}:${r.commandIndex}` : "prompt"}`;
      if (key.split("@")[0] !== last) seen.push(key);
      last = key.split("@")[0]!;
    });
    return { run, seen };
  };

  it("JYNX 11/35 Scene ON: doll after the body, kept through the opponent's hit on it, cleared at the fade message; next prompt", () => {
    const { run, seen } = trace(11, 35, [3, 0, 0], "on");
    expect(run.requests.map((q) => `${q.moveId}:${q.attacker}`).slice(0, 2)).toEqual(["164:0", "188:1"]);
    const types = run.commands.map((c) => c.type);
    const body = types.indexOf("move-animation");
    // The doll appears on the command after the 87-row-body command and goes at the faded message (command 9 of the first resolution).
    expect(seen).toEqual(["00@prompt", `10@1:${body + 1}`, "00@1:9"]);
    const fadeMessage = run.commands.find((c) => (c.command as { substituteFadeBattler?: number }).substituteFadeBattler !== undefined);
    expect((fadeMessage!.command as { substituteFadeBattler: number }).substituteFadeBattler).toBe(0);
    expect(run.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(run.state.battleCommandPresentation?.field.player.substituteDoll).toBeUndefined();
  }, 240000);

  it("BLISSEY 60/28: the doll stays up to the next prompts (both scenes from the body = STATUS2_SUBSTITUTE)", () => {
    for (const scene of ["on", "off"] as const) {
      const { run, seen } = trace(60, 28, [3, 0], scene);
      const prompt = run.state.battleCommandPresentation!;
      expect(prompt.lifecycle.phase).toBe("action-menu");
      expect(prompt.field.player.substituteDoll).toBe(true);
      expect(prompt.field.opponent.substituteDoll).toBeUndefined();
      const status2 = run.state.battle!.rules.rulesContext.battlers[0]!.status2;
      expect(status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_SUBSTITUTE).not.toBe(0);
      expect(seen[0]).toBe("00@prompt");
      // Both scenes: set inside the first resolution (after the body). sub157 (#153): Scene OFF plays the Substitute body too
      // (Cmd_attackanimation's exemption); before, it had no body request and showed the doll only from the next prompt.
      expect(seen[1]).toMatch(/^10@1:\d+$/);
    }
  }, 240000);
});
