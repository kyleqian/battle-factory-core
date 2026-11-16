// cry3 (ISSUES #193 / #219): the source-derived cry length of every Factory species (src/data/cryModeFrames.ts, tools/audio/genCryModeFrames.py) equals every ROM measurement we hold.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CRY_ECHO_END_FRAMES, CRY_ECHO_START_FRAMES, CRY_FAINT_FRAMES, CRY_HIGH_PITCH_FRAMES, CRY_NORMAL_FRAMES, CRY_ROAR_2_FRAMES, CRY_WEAK_FRAMES,
} from "../src/data/cryModeFrames.ts";
import { FAINT_CRY_RESTORE_FRAMES } from "../src/data/faintCryFrames.ts";
import { SEND_IN_TAIL_OFF_CRY_FRAMES } from "../src/data/sendInTailOff.ts";
import { cryTaskLength } from "../src/engine/cryTaskLengths.ts";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const cry3 = fixture("cry3-lengths.json") as { NORMAL: [number, number][]; WEAK: [number, number][]; FAINT: [number, number][] };
const cry1 = fixture("cry1-lengths.json") as Record<"ES" | "EE" | "R2" | "HP", [number, number][]>;
const FACTORY_SPECIES = JSON.parse(readFileSync(new URL("../tools/integration/fixtures/forced-switch/factory-species-ids.json", import.meta.url), "utf8")) as number[];

describe("cry3 derived cry lengths", () => {
  it("covers every Factory species in both modes", () => {
    const ids = [...FACTORY_SPECIES].sort((a, b) => a - b);
    expect(Object.keys(CRY_NORMAL_FRAMES).map(Number).sort((a, b) => a - b)).toEqual(ids);
    expect(Object.keys(CRY_WEAK_FRAMES).map(Number).sort((a, b) => a - b)).toEqual(ids);
  });

  it("equals the oracle-measured BGM restore (length + 1) of every Factory species, NORMAL and WEAK", () => {
    expect(cry3.NORMAL).toHaveLength(FACTORY_SPECIES.length);
    expect(cry3.WEAK).toHaveLength(FACTORY_SPECIES.length);
    for (const [species, restore] of cry3.NORMAL) expect(CRY_NORMAL_FRAMES[species]! + 1, `NORMAL ${species}`).toBe(restore);
    for (const [species, restore] of cry3.WEAK) expect(CRY_WEAK_FRAMES[species]! + 1, `WEAK ${species}`).toBe(restore);
  });

  it("keeps the earlier WEAK measurements (Onix 78, aud251 chain windows 9 / 83 / 130 / 198) and the Jynx 140-tick note cap", () => {
    expect([9, 83, 95, 130, 198].map((s) => CRY_WEAK_FRAMES[s])).toEqual([61, 24, 78, 64, 53]);
    expect(CRY_WEAK_FRAMES[124]).toBe(140);
    expect(Math.max(...Object.values(CRY_WEAK_FRAMES))).toBe(140);
  });

  it("NORMAL equals the offs152 send-in cry table", () => {
    expect(CRY_NORMAL_FRAMES).toEqual(SEND_IN_TAIL_OFF_CRY_FRAMES);
  });

  it("the same derivation reproduces cry1's 149 measured cry-task species-modes and its fitted model", () => {
    const tables = { ES: CRY_ECHO_START_FRAMES, EE: CRY_ECHO_END_FRAMES, R2: CRY_ROAR_2_FRAMES, HP: CRY_HIGH_PITCH_FRAMES };
    const modes = { ES: "ECHO_START", EE: "ECHO_END", R2: "ROAR_2", HP: "HIGH_PITCH" } as const;
    let rows = 0;
    for (const key of ["ES", "EE", "R2", "HP"] as const) {
      for (const [species, length] of cry1[key]) {
        rows += 1;
        expect(tables[key][species]! + 1, `${key} ${species}`).toBe(length);
        expect(cryTaskLength(modes[key], species), `fit ${key} ${species}`).toBe(length);
      }
    }
    expect(rows).toBe(149);
  });

  it("the extractor output is committed byte for byte (needs reference/)", () => {
    const reference = new URL("../reference/pokeemerald/src/sound.c", import.meta.url);
    if (!existsSync(reference)) return;
    const out = join(mkdtempSync(join(tmpdir(), "cry3-")), "cryModeFrames.ts");
    execFileSync("python3", ["tools/audio/genCryModeFrames.py", out], { cwd: new URL("..", import.meta.url), stdio: "pipe" });
    expect(readFileSync(out, "utf8")).toBe(readFileSync(new URL("../src/data/cryModeFrames.ts", import.meta.url), "utf8"));
  });

  it("FAINT: the derivation equals the oracle on all species; aud241b's fitted table (still used by playFaintCry) is off on 24 of them", () => {
    expect(cry3.FAINT).toHaveLength(FACTORY_SPECIES.length);
    for (const [species, restore] of cry3.FAINT) expect(CRY_FAINT_FRAMES[species]! + 1, `FAINT ${species}`).toBe(restore);
    const fitWrong = cry3.FAINT.filter(([species, restore]) => FAINT_CRY_RESTORE_FRAMES[species] !== restore);
    expect(fitWrong).toHaveLength(24);
  });
});
