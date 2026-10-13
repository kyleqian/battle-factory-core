// offs152 (S10A, ISSUES #146 remainder; docs/offs152-scene-off-send-in-tail.md): the Scene OFF OPPONENT send-in tail pinned against
// the committed direct-mGBA Scene OFF sweep of the 339 stageable Factory species (forcedSwitchRomProbe.py with the OFF snapshot, two
// byte-identical fresh runs; k = frames after the ON-equivalent body end, send-in start = k 10), and the generated cry table
// (src/data/sendInTailOff.ts) against the compiled cry samples it is derived from.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };
import { SEND_IN_TAIL_OFF_CRY_FRAMES } from "../src/data/sendInTailOff.ts";
import { SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming } from "../src/engine/battleResolutionPresentation.ts";
import { frontSendOutAffineAtTick } from "../src/animation/sendOutDispatcher.ts";
import { rotateToSidesTwiceFrameAtTick } from "../src/animation/speciesIdleAnim.ts";
import {
  opponentSwitchInDuration,
  sceneOffOpponentSwitchInDuration,
  sceneOffOpponentSwitchInHealthboxSlideElapsed,
  sceneOffOpponentSwitchInLagElapsed,
  sceneOffOpponentSwitchInVisualDelay,
} from "../src/engine/switchInTail.ts";

const FX = "tools/integration/fixtures";
const nameOf = (species: number) => speciesStats.species.find((s) => s.id === species)!.name.replace(/^SPECIES_/, "");
/** The in-game nickname (Factory mons carry their species name): the source spellings that differ from the SPECIES_ symbol. */
const NICKNAMES: Record<string, string> = { FARFETCHD: "FARFETCH'D", MR_MIME: "MR. MIME", HO_OH: "HO-OH", NIDORAN_F: "NIDORAN♀", NIDORAN_M: "NIDORAN♂" };
const nickname = (species: number) => NICKNAMES[nameOf(species)] ?? nameOf(species);
type Row = { species: number; ball: number; y2: number; slide: number; txt: number };
function sweep(name: string): Row[] {
  const rows: Row[] = [];
  for (const line of readFileSync(`${FX}/offs152/${name}`, "utf8").split("\n")) {
    const parts = line.split(/\s+/);
    if (parts.length < 2 || parts[1] === "FAILED") continue;
    const field = (key: string) => Number(new RegExp(`${key} (\\d+)`).exec(line)![1]);
    rows.push({ species: Number(parts[0]), ball: field("ball"), y2: field("y2start"), slide: field("hbslide"), txt: field("txtStart") });
  }
  return rows;
}

describe("offs152: Scene OFF opponent send-in tail", () => {
  const rows = sweep("species-sweep-opponent-target-off.txt");

  it("the committed OFF sweep: 339 species, ball k 10, y2 start + 1 only for CASTFORM / SPINDA", () => {
    expect(rows).toHaveLength(339);
    expect(rows.every((r) => r.ball === 10)).toBe(true);
    expect(rows.filter((r) => r.y2 !== 29).map((r) => r.species).sort((a, b) => a - b)).toEqual([308, 385]);
    for (const r of rows) expect(sceneOffOpponentSwitchInVisualDelay(r.species)).toBe(r.y2 - 29);
  });

  it("slide 339 / 339 and next printstring 339 / 339 (k - 10 = switch-in elapsed)", () => {
    for (const r of rows) {
      expect(sceneOffOpponentSwitchInHealthboxSlideElapsed(r.species)).toBe(r.slide - 10);
      expect(sceneOffOpponentSwitchInDuration(r.species, nickname(r.species))).toBe(r.txt - 10);
    }
  });

  it("the message is slide-bound (62 / 63 by nickname length) or cry-bound (cry + 37): 54 / 285 species", () => {
    const long = (species: number) => (nickname(species).length >= 7 ? 1 : 0);
    const cryBound = rows.filter((r) => SEND_IN_TAIL_OFF_CRY_FRAMES[r.species]! + 37 > 62 + long(r.species));
    expect([rows.length - cryBound.length, cryBound.length]).toEqual([54, 285]);
    for (const r of rows.filter((x) => !cryBound.includes(x))) expect(r.txt - 10).toBe(62 + long(r.species));
    for (const r of cryBound) {
      expect(r.txt - 10).toBe(sceneOffOpponentSwitchInVisualDelay(r.species) + SEND_IN_TAIL_OFF_CRY_FRAMES[r.species]! + 37);
    }
  });

  it("the cry table is the compiled samples' length (ceil(samples * 16777216 / (rate * 280896))), 376 Factory species", () => {
    const ids = JSON.parse(readFileSync(`${FX}/forced-switch/factory-species-ids.json`, "utf8")) as number[];
    expect(Object.keys(SEND_IN_TAIL_OFF_CRY_FRAMES).map(Number).sort((a, b) => a - b)).toEqual([...ids].sort((a, b) => a - b));
    const header = (file: string) => {
      const b = readFileSync(`reference/pokeemerald/sound/direct_sound_samples/cries/${file}.bin`);
      return { rate: b.readUInt32LE(4) / 1024, samples: b.readUInt32LE(12) };
    };
    for (const [file, species] of [["oddish", 43], ["pidgey", 16], ["typhlosion", 157]] as const) {
      const { rate, samples } = header(file);
      expect(SEND_IN_TAIL_OFF_CRY_FRAMES[species]).toBe(Math.ceil((samples * 16777216) / (rate * 280896)));
    }
  });

  it("long-nickname lag frame: on the slide start for cries >= 24 frames, the next frame below; none for short nicknames", () => {
    expect(sceneOffOpponentSwitchInLagElapsed(304, "TAILLOW")).toBe(37); // cry 17
    expect(sceneOffOpponentSwitchInLagElapsed(19, "RATTATA")).toBe(37); // cry 23
    expect(sceneOffOpponentSwitchInLagElapsed(10, "CATERPIE")).toBe(36); // cry 24
    expect(sceneOffOpponentSwitchInLagElapsed(385, "CASTFORM")).toBe(37); // slide 37 (+1 send-in)
    expect(sceneOffOpponentSwitchInLagElapsed(341, "SPHEAL")).toBeNull();
  });

  it("switchInTiming: Scene OFF opponent = the OFF tail minus the waitstate hold; Scene ON unchanged; player unchanged", () => {
    expect(switchInTiming(1, 304, false, "TAILLOW").minimumFrames).toBe(63 - SWITCH_IN_WAITSTATE_HOLD_FRAMES);
    expect(switchInTiming(1, 157, false, "TYPHLOSION").minimumFrames).toBe(145 - SWITCH_IN_WAITSTATE_HOLD_FRAMES);
    expect(switchInTiming(1, 304, true, "TAILLOW").minimumFrames).toBe(opponentSwitchInDuration(304) - SWITCH_IN_WAITSTATE_HOLD_FRAMES);
    expect(switchInTiming(0, 304, false, "TAILLOW").minimumFrames).toBe(91);
  });
});

describe("offs152 R6: SOLROCK (ROTATE_TO_SIDES_TWICE) front send-in matrix", () => {
  it("falls back to the reducer's affineWrites[] rotation (fra151 remainder 2)", () => {
    for (const tick of [1, 10, 40, 128]) {
      const write = rotateToSidesTwiceFrameAtTick(tick)!.affineWrites.at(-1)!;
      const theta = ((write.rotationU16 >> 8) / 128) * Math.PI;
      const c = Math.trunc(Math.cos(theta) * 256) + 0;
      const s = Math.trunc(Math.sin(theta) * 256) + 0;
      expect(frontSendOutAffineAtTick("SOLROCK", tick)).toEqual([c, -s + 0, s, c]);
    }
    expect(frontSendOutAffineAtTick("SOLROCK", 10)).not.toEqual([256, 0, 0, 256]);
  });
});
