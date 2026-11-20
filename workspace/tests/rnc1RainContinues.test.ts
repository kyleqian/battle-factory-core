// rnc1 (docs/rnc1-rain-continues.md; fcs1 finding 1): at the end of a rainy turn the ROM plays B_ANIM_RAIN_CONTINUES = General_Rain
// (battle_anim_scripts.s:10511-10522) under "Rain continues to fall."; ours drew nothing (it asked for Rain Dance's body words under a
// move key the tick seam never activates) and held the command for Rain Dance's 187-row body. General_Rain is now drawn from its own
// reducer (rainDance.ts generalRainAtAge) with the words the tick seam records for the event, and the command is 122 rows.
// ROM values: the frame catcher's seed 19 Scene ON round (makeTrace --seed 19 --scene on --policy winning-swap), battle 2, first rain
// turn, re-run with a per-frame RAM watch (.integration/evidence/fix-rain/probe): ROM frame 13170 = command row 0 (the row the
// `waitmessage` ends), gAnimScriptActive rises at 13172, SE_M_RAIN_DANCE at 13175, the 80 words at 13189 + 3k, the script ends at
// 13292. The engine's frames outside the effect were already pixel-identical to the ROM's (12404 == 13170).
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

/** ROM frame 13170 + row -> sha256 of the RGB framebuffer (16 hex). 0 / 9 / 97 / 121 / 122: the field as it is. */
const ROM_FRAMES: Readonly<Record<number, string>> = {
  0: "81e63a98015946ce", 9: "81e63a98015946ce", 10: "d16059a13cc713c9", 13: "fa0edb9ee1657b56", 16: "5a158f6966584373",
  19: "8317995c676830ba", 20: "8317995c676830ba", 21: "54907d95bd6ea77f", 30: "131c59b0324ab51e", 45: "ea2a19f765b52c74",
  60: "299b8ca4b0d151fe", 78: "4c2417709d5643ce", 82: "964d25e042816ea7", 83: "10c14397918f4bd0", 86: "a10caa44788e5914",
  89: "6a21ba20b8aa5163", 92: "ed36623f74ae28f7", 96: "136f13d2ff17a843", 97: "81e63a98015946ce", 121: "81e63a98015946ce",
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
  const bodies = host.bodies.map((body) => body.key === key ? { ...body, words: { ...body.words, draws: ROM_WORDS } } : body);
  return { ...state, presentationRng: { ...state.presentationRng, host: { ...host, bodies } as PresentationRngHost } };
};

type Row = { frame: number; state: EngineState; type: string | undefined; animation: unknown };

/** Seed 19 Scene ON (the catcher trace's player): play to battle 2's first RAIN_CONTINUES command and through 125 rows after it. */
function firstRainTurn() {
  const session = new FactorySession({ battleScene: "on", gameplaySeed: 152592338, presentationSeed: 446290577, start: "draft",
    challengeRequest: "hold" });
  const sounds: { frame: number; id: number | null; kind: string }[] = [];
  session.attachSoundSink({ push: (event) => sounds.push({ frame: event.frame, id: event.id, kind: event.kind }) });
  const player = new RandomPlayer(new Rng(19), new ActionLog(false), "winning-swap");
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
  if (start === null) throw new Error("no RAIN_CONTINUES command in seed 19's first 20000 frames");
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

  it("seed 19 battle 2, first rain turn: the ROM's frames with the ROM's words, the SE on row 5, 122 rows, the shared stream untouched", () => {
    const { start, rows, key, command, sounds } = firstRainTurn();
    expect(command.timing.minimumFrames).toBe(122);
    // The command holds rows 0..121; row 122 is the next command.
    expect(rows.slice(0, 122).every((row) => row.type === "general-animation" && row.animation === "RAIN_CONTINUES")).toBe(true);
    expect(rows[122]!.animation).not.toBe("RAIN_CONTINUES");
    // SE_M_RAIN_DANCE on command row 5 (ROM 13175 = 13170 + 5), once.
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
