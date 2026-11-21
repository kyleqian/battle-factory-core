// rnc1 (docs/rnc1-rain-continues.md; fcs1 finding 1): at the end of a rainy turn the ROM plays B_ANIM_RAIN_CONTINUES = General_Rain
// (battle_anim_scripts.s:10511-10522) under "Rain continues to fall."; ours drew nothing (it asked for Rain Dance's body words under a
// move key the tick seam never activates) and held the command for Rain Dance's 187-row body. General_Rain is now drawn from its own
// reducer (rainDance.ts generalRainAtAge) with the words the tick seam records for the event, and the command is 122 rows.
// ROM values: the frame catcher's seed 19 Scene ON round (makeTrace --seed 19 --scene on --policy winning-swap), battle 2, first rain
// turn, re-run with a per-frame RAM watch (.integration/evidence/fix-rain/probe): ROM frame 13170 = command row 0 (the row the
// `waitmessage` ends), gAnimScriptActive rises at 13172, SE_M_RAIN_DANCE at 13175, the 80 words at 13189 + 3k, the script ends at
// 13292. The engine's frames outside the effect were already pixel-identical to the ROM's (12404 == 13170).
// fop1 (docs/fop1-first-opponent-order.md: a new challenge's first opponent is rolled in the ROM's order) moved seed 19's round: its
// battle 2 no longer has rain. The played-turn test now uses the catcher's seed 12 Scene ON (the only seed of 0..29 with a rain turn in
// its first 20,000 frames: battle 1, LUVDISC's RAIN DANCE), recorded the same way (the same RAM watch over the catcher's ROM run,
// .integration/evidence/fix-first-opponent/rain/): ROM frame 7622 = command row 0, gAnimScriptActive rises at 7624, the 80 words at
// 7641 + 3k, the script ends at 7744; with those words all 122 command rows of both rain turns are pixel-identical to the ROM's. The
// reducer test keeps seed 19's RAM-read words and rows (ROM values of General_Rain itself, whatever battle).
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { FactorySession } from "../src/factorySession.ts";
import { render } from "../src/engine/core.ts";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import { RAIN_CONTINUES_COMMAND_FRAMES, weatherContinuesCommandFrames } from "../src/engine/battleResolutionPresentation.ts";
import { advancePresentationRngHost, type PresentationRngHost } from "../src/engine/presentationRngHost.ts";
import { generalAnimationPresentationRngKey } from "../src/engine/wordsOrderUnits.ts";
import {
  generalRainAtAge, GENERAL_RAIN_SCRIPT_ROWS, GENERAL_RAIN_SE_AGE, GENERAL_RAIN_SPAWN_AGES,
} from "../src/animation/rainDance.ts";
import type { EngineState } from "../src/engine/core.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

/** The ROM's 20 spawn rows of words (x0, y0, x1, y1), gRng2Value read after every frame: draws at 13189 + 3k. */
const ROM_WORDS: readonly (readonly number[])[] = [[26133, 46233, 42852, 30954], [38055, 47081, 25395, 42357], [49155, 4604, 65430, 34184],
  [64669, 34100, 38055, 13318], [3510, 57060, 42611, 32396], [57403, 13568, 41293, 64018], [52698, 33705, 8511, 46035],
  [29996, 4838, 64065, 25656], [48042, 26397, 29877, 42556], [21927, 29367, 22154, 44360], [47659, 48256, 45700, 36818],
  [35780, 31465, 61132, 27860], [44112, 11944, 56423, 35004], [51281, 28675, 26574, 31862], [56802, 64350, 16482, 49308],
  [118, 51188, 26060, 12879], [19777, 59665, 38909, 3426], [51856, 16476, 16847, 40379], [30798, 1654, 28833, 14270],
  [11776, 36137, 18306, 63280]];

/** Seed 12's first rain turn (fop1): the ROM's 20 spawn rows of words, gRng2Value read after every frame: draws at 7641 + 3k. */
const ROM_WORDS_SEED12: readonly (readonly number[])[] = [
  [32747, 38202, 33140, 41840], [22271, 43569, 2550, 157], [34441, 3372, 16340, 28050], [42540, 17101, 57577, 32123],
  [31510, 19171, 19341, 32214], [21759, 42388, 11846, 35009], [22342, 5693, 33724, 15761], [28386, 39968, 23123, 53920],
  [49192, 29234, 33510, 63750], [46182, 22923, 22196, 8785], [46753, 28456, 38860, 36189], [57321, 52672, 59797, 52363],
  [26964, 49563, 51454, 60472], [1057, 50499, 22988, 42225], [50939, 10817, 37917, 37061], [59397, 16288, 63517, 24112],
  [10901, 35377, 64967, 45478], [42703, 10428, 14108, 30980], [11002, 2234, 20898, 38919], [3070, 6587, 46688, 46181]];

/**
 * Seed 12: ROM frame 7622 + row -> sha256 of the RGB framebuffer (16 hex). 0 / 9 / 96 / 97 / 121: the field as it is. (fop1 re-pin; seed
 * 19's before it, ROM frame 13170 + row: 0 81e63a98015946ce, 10 d16059a13cc713c9, 30 131c59b0324ab51e, 96 136f13d2ff17a843, ...)
 */
const ROM_FRAMES: Readonly<Record<number, string>> = {
  0: "3eafe083b1d19990", 9: "3eafe083b1d19990", 10: "cbc351dd8982f6d7", 13: "4c585a5c6b7f9e32", 16: "3b1f47c5efd926a6",
  19: "d180700a0a390dfd", 20: "d180700a0a390dfd", 21: "a201dbac6fe99d87", 30: "23551beb6f91d965", 45: "43929859f6b4ed1a",
  60: "95047cac3ebfbeb8", 78: "3fec598ddac0a5ae", 82: "714ae47f4e2da1ff", 83: "fb7d2c79850d3764", 86: "1c5f694272a86c61",
  89: "a46a89d79fccdd0b", 92: "f8586c54ac4a4169", 96: "3eafe083b1d19990", 97: "3eafe083b1d19990", 121: "3eafe083b1d19990",
};

/** The coefficient each ROM frame shows (5 field / battler pixels unblended by BlendPalette's formula), by script row (13172 + row). */
const ROM_SHOWN_COEFFICIENT: readonly (readonly [number, number])[] = [[0, 0], [7, 0], [8, 1], [11, 2], [14, 3], [17, 4], [80, 4],
  [81, 3], [84, 2], [87, 1], [90, 0], [119, 0]];

const sha = (state: EngineState) => {
  const rgba = render(state);
  const rgb = Buffer.alloc(240 * 160 * 3);
  for (let p = 0, q = 0; p < rgba.length; p += 4, q += 3) { rgb[q] = rgba[p]!; rgb[q + 1] = rgba[p + 1]!; rgb[q + 2] = rgba[p + 2]!; }
  return createHash("sha256").update(rgb).digest("hex").slice(0, 16);
};

/** The host with `key`'s recorded words replaced by the ROM's (render-only: nothing else of the host changes). */
const withRomWords = (state: EngineState, key: string): EngineState => {
  const host = state.presentationRng.host!;
  const bodies = host.bodies.map((body) => body.key === key ? { ...body, words: { ...body.words, draws: ROM_WORDS_SEED12 } } : body);
  return { ...state, presentationRng: { ...state.presentationRng, host: { ...host, bodies } as PresentationRngHost } };
};

type Row = { frame: number; state: EngineState; type: string | undefined; animation: unknown };

/** Seed 12 Scene ON (the catcher trace's player): play to battle 1's first RAIN_CONTINUES command and through 125 rows after it. */
function firstRainTurn() {
  const session = new FactorySession({ battleScene: "on", gameplaySeed: 3166254468, presentationSeed: 3997774045, start: "draft",
    challengeRequest: "hold" });
  const sounds: { frame: number; id: number | null; kind: string }[] = [];
  session.attachSoundSink({ push: (event) => sounds.push({ frame: event.frame, id: event.id, kind: event.kind }) });
  const player = new RandomPlayer(new Rng(12), new ActionLog(false), "winning-swap");
  let start: Row | null = null;
  const rows: Row[] = [];
  for (let frame = 0; frame < 20_000 && rows.length < 126; frame += 1) {
    session.tick(player.decide(session.state));
    const r = session.state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const command = r?.segments[r.segmentIndex]?.commands[r.commandIndex];
    if (start === null && command?.type === "general-animation" && command.animation === "RAIN_CONTINUES"
      && r!.lifecycle.phase === "presenting" && r!.lifecycle.phaseElapsed === 0) {
      start = { frame: session.frame, state: session.state, type: command.type, animation: command.animation };
    }
    if (start !== null) rows.push({ frame: session.frame, state: session.state, type: command?.type, animation: command && "animation" in command ? command.animation : undefined });
  }
  if (start === null) throw new Error("no RAIN_CONTINUES command in seed 12's first 20000 frames");
  const r = start.state.factoryRoundBattleOrchestrator!.battleResolutionPresentation!;
  const command = r.segments[r.segmentIndex]!.commands[r.commandIndex]!;
  if (command.type !== "general-animation") throw new Error("expected the general animation");
  const key = generalAnimationPresentationRngKey(r.resolutionId.requestId, r.segmentIndex, command.eventSequence);
  return { start, rows, key, command, sounds };
}

describe("rnc1: General_Rain at \"Rain continues to fall.\" (Scene ON)", () => {
  it("General_Rain's rows: the ROM's shown blend, drop lifetimes and script end (RAM-read rows)", () => {
    for (const [age, coefficient] of ROM_SHOWN_COEFFICIENT) {
      expect(generalRainAtAge(age, { draws: ROM_WORDS, occupiedSpriteSlots: [] }).hardwareCoefficient, `row ${age}`).toBe(coefficient);
    }
    const shown = (age: number) => generalRainAtAge(age, { draws: ROM_WORDS, occupiedSpriteSlots: [] }).displayedDrops;
    // The pair drawn on row 17 (13189) is first on screen on row 19 (13191: x 213 / 132, y 73 / 74 -> drops at OAM x 205 / 124).
    expect(shown(18)).toEqual([]);
    expect(shown(19).map((drop) => [drop.x, drop.y, drop.attr[1] & 0x1ff, drop.attr[0] & 0xff])).toEqual([[213, 73, 205, 57], [132, 74, 124, 58]]);
    // The last pair (drawn on row 74) is on screen through row 94 (13266); row 95 (13267) is the field as it is.
    expect(shown(94).length).toBeGreaterThan(0);
    expect(shown(95)).toEqual([]);
    expect(GENERAL_RAIN_SPAWN_AGES.at(-1)).toBe(74);
    // gAnimScriptActive: TRUE through row 119, FALSE at 120 (13292): the SE row 3 + the 117 rows IsSEPlaying holds SE_M_RAIN_DANCE.
    expect(GENERAL_RAIN_SE_AGE).toBe(3);
    expect(GENERAL_RAIN_SCRIPT_ROWS).toBe(120);
    expect(generalRainAtAge(119, { draws: ROM_WORDS, occupiedSpriteSlots: [] }).active).toBe(true);
    expect(generalRainAtAge(120, { draws: ROM_WORDS, occupiedSpriteSlots: [] }).active).toBe(false);
    // The command: jumpifbyte + playanimation (2 rows) + the script's 120; `end2` then runs where the rain-stopped branch's runs + 122.
    expect(RAIN_CONTINUES_COMMAND_FRAMES).toBe(122);
    expect(weatherContinuesCommandFrames("RAIN_CONTINUES")).toBe(122);
  });

  it("seed 12 battle 1, first rain turn: the ROM's frames with the ROM's words, the SE on row 5, 122 rows, the shared stream untouched", () => {
    const { start, rows, key, command, sounds } = firstRainTurn();
    expect(command.timing.minimumFrames).toBe(122);
    // The command holds rows 0..121; row 122 is the next command.
    expect(rows.slice(0, 122).every((row) => row.type === "general-animation" && row.animation === "RAIN_CONTINUES")).toBe(true);
    expect(rows[122]!.animation).not.toBe("RAIN_CONTINUES");
    // SE_M_RAIN_DANCE on command row 5 (seed 12's ROM: 7627 = 7622 + 5; seed 19's: 13175 = 13170 + 5), once.
    expect(sounds.filter((s) => s.kind === "se" && s.id === 127 && s.frame >= start.frame).map((s) => s.frame - start.frame)).toEqual([5]);
    // Every pinned row with the ROM's words is the ROM's frame.
    for (const [row, hash] of Object.entries(ROM_FRAMES)) {
      expect(sha(withRomWords(rows[Number(row)]!.state, key)), `row ${row}`).toBe(hash);
    }
    // With the session's own words (faithful random) the rain is drawn too: a live General_Rain body, not the field as it is.
    const r = rows[30]!.state.factoryRoundBattleOrchestrator!.battleResolutionPresentation!;
    const effect = createBattleResolutionPresentationRenderView(r, rows[30]!.state.presentationRng.host).effect;
    expect(effect).toMatchObject({ type: "move", age: 28, request: { moveId: 240, generalRain: true } });
    expect(sha(rows[30]!.state)).not.toBe(ROM_FRAMES[0]);
    // The general animation's words are the sub-stream recorded at row 0; through the command the shared stream only takes its
    // per-frame step (no body is activated, nothing is drawn from it).
    const hostAt = (row: number) => rows[row]!.state.presentationRng.host!;
    expect(hostAt(0).bodies.some((body) => body.key === key)).toBe(true);
    for (let row = 1; row < 122; row += 1) {
      expect(hostAt(row).bodies).toBe(hostAt(row - 1).bodies);
      expect(hostAt(row).state).toEqual(advancePresentationRngHost(hostAt(row - 1)).state);
    }
  });
});
