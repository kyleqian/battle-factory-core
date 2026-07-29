import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import trainerPicsData from "../src/assets/gen/frontier-trainer-pics.json" with { type: "json" };
import trainersData from "../src/data/gen/battle-frontier-trainers.json" with { type: "json" };
import facilityLookupsData from "../src/data/gen/facility-class-lookups.json" with { type: "json" };

type TrainerPic = {
  id: number;
  symbol: string;
  width: number;
  height: number;
  yOffsetPx: number;
  tileset: { columns: number; rows: number; tiles: number[][] };
  palette: Array<{ r: number; g: number; b: number }>;
};

const catalog = trainerPicsData as { schema: string; count: number; entries: TrainerPic[] };
const byPicId = new Map(catalog.entries.map((entry) => [entry.id, entry]));
const facilityById = new Map(facilityLookupsData.entries.map((entry) => [entry.facilityClass.id, entry]));

// This is the exact ordinary Frontier surface, in numeric TRAINER_PIC order.
const USED_PICTURE_IDS = [
  0, 2, 3, 4, 5, 7, 9, 11, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 27,
  28, 29, 30, 31, 32, 33, 34, 35, 48, 49, 51, 52, 53, 55, 56, 57, 58, 59, 60,
  61, 62, 63, 64, 65, 66, 68, 73, 74, 75, 77,
] as const;

describe("frontier-trainer-pics.json (ordinary 300-trainer front-picture surface)", () => {
  it("reproduces the committed source-derived catalog byte-for-byte", () => {
    const path = "src/assets/gen/frontier-trainer-pics.json";
    const before = readFileSync(path, "utf8");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-frontier-trainer-pics.ts"], { stdio: "pipe" });
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("enumerates all and only the 50 TRAINER_PIC ids reached by ordinary Frontier trainers", () => {
    expect(catalog.schema).toBe("frontier-trainer-pics/v1");
    expect(catalog.count).toBe(50);
    expect(catalog.entries.map((entry) => entry.id)).toEqual(USED_PICTURE_IDS);
    for (const entry of catalog.entries) {
      expect(entry.symbol).toMatch(/^TRAINER_PIC_[A-Z0-9_]+$/);
      expect(entry.width).toBe(64);
      expect(entry.height).toBe(64);
      expect(entry.tileset).toMatchObject({ columns: 8, rows: 8 });
      expect(entry.tileset.tiles).toHaveLength(64);
      expect(entry.tileset.tiles.every((tile) => tile.length === 64)).toBe(true);
      expect(entry.palette).toHaveLength(16);
      expect(entry.yOffsetPx % 8).toBe(0);
    }
  });

  it("joins every corpus trainer through its facility class to an extracted front picture", () => {
    expect(trainersData.count).toBe(300);
    for (const trainer of trainersData.entries) {
      const facility = facilityById.get(trainer.facilityClass.id);
      expect(facility, `trainer ${trainer.id} has a known facility class`).toBeDefined();
      const picture = byPicId.get(facility!.trainerPic.id);
      expect(picture, `trainer ${trainer.id} (${trainer.name}) pic ${facility!.trainerPic.id} is extracted`).toBeDefined();
      expect(picture!.symbol).toBe(facility!.trainerPic.symbol);
    }
  });
});
