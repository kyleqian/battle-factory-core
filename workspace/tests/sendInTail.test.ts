// snd145 (S10A, ISSUES #146 remainder; docs/send-in-tail-model.md, docs/snd145-send-in-tail-live.md): the generated species-keyed
// send-in tail (src/data/sendInTail.ts) pinned against the committed 339-species direct-mGBA sweep (two identical runs, Scene OFF;
// k = frames after the body end, send-in start = k10) and the committed source-extracted tables it was generated from.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SEND_IN_TAIL_ANIM_IDS,
  SEND_IN_TAIL_FRONT_ANIM_DURATION,
  SEND_IN_TAIL_SPECIES,
  sendInTail,
} from "../src/data/sendInTail.ts";

const FX = "tools/integration/fixtures";
const json = (path: string) => JSON.parse(readFileSync(`${FX}/${path}`, "utf8"));
type Row = { species: number; slide: number | null; txt: number | null };
function sweep(name: string): Row[] {
  const rows: Row[] = [];
  for (const line of readFileSync(`${FX}/forced-switch/${name}`, "utf8").split("\n")) {
    const parts = line.split(/\s+/);
    if (parts.length < 2 || parts[1] === "FAILED") continue;
    const field = (key: string) => {
      const m = new RegExp(`${key} (\\d+)`).exec(line);
      return m ? Number(m[1]) : null;
    };
    rows.push({ species: Number(parts[0]), slide: field("hbslide"), txt: field("txtStart") });
  }
  return rows;
}

describe("snd145 send-in tail table", () => {
  it("is the committed source tables (S, animId, delay) for every Factory species, with the fitted A", () => {
    const tables = json("send-in-tail/front-anim-tables.json") as Record<string, [string, number]>;
    const frames = json("send-in-tail/front-sprite-frames.json") as Record<string, number>;
    const ids = json("forced-switch/factory-species-ids.json") as number[];
    expect(Object.keys(SEND_IN_TAIL_SPECIES).length).toBe(376);
    for (const species of ids) {
      const [s, anim, delay] = SEND_IN_TAIL_SPECIES[species]!;
      expect([s, SEND_IN_TAIL_ANIM_IDS[anim], delay]).toEqual([frames[String(species)] ?? 0, ...tables[String(species)]!]);
    }
    expect({ ...SEND_IN_TAIL_FRONT_ANIM_DURATION }).toEqual(json("send-in-tail/anim-duration.json"));
  });

  it("reproduces the opponent healthbox slide of all 338 swept species and the message start (slide + 26 or the measured cry-bound offset)", () => {
    const rows = sweep("species-sweep-opponent-target.txt").filter((r) => r.slide !== null);
    expect(rows.length).toBe(338);
    const slideMismatches = rows.filter((r) => sendInTail(r.species, "opponent").slideStart !== r.slide! - 10);
    expect(slideMismatches).toEqual([]);
    const withText = rows.filter((r) => r.txt !== null);
    const messageMismatches = withText.filter((r) => sendInTail(r.species, "opponent").messageStart !== r.txt! - 10);
    expect(messageMismatches).toEqual([]);
    // The closed form alone (slide + 26) holds for all but the 7 cry-bound species.
    expect(withText.filter((r) => r.txt! - r.slide! === 26).length).toBe(withText.length - 7);
    // Range: send-in +70 .. +234; spot checks over the frame-dominated / function-dominated / delayed / Castform classes.
    expect(Math.min(...rows.map((r) => r.slide! - 10))).toBe(70);
    expect(Math.max(...rows.map((r) => r.slide! - 10))).toBe(234);
    expect(sendInTail(385, "opponent").slideStart).toBe(sweep("species-sweep-opponent-target.txt").find((r) => r.species === 385)!.slide! - 10);
  });

  it("keeps the player slide constant (+65, Castform +66) and leaves the cry-bound player message unmodelled", () => {
    const rows = sweep("species-sweep-player-target.txt").filter((r) => r.slide !== null);
    expect(rows.length).toBe(339);
    expect(rows.filter((r) => sendInTail(r.species, "player").slideStart !== r.slide! - 10)).toEqual([]);
    expect(sendInTail(1, "player").messageStart).toBeNull();
  });
});
