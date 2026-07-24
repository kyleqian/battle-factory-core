import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import lookupsData from "../src/data/gen/facility-class-lookups.json" with { type: "json" };
import trainersData from "../src/data/gen/battle-frontier-trainers.json" with { type: "json" };

type Lookup = {
  facilityClass: { symbol: string; id: number };
  trainerPic: { symbol: string; id: number; frontPicCoords: { size: number; yOffset: number } };
  trainerClass: { symbol: string; id: number; displayName: string };
};

const catalog = lookupsData as { schema: string; count: number; entries: Lookup[] };
const byFacilityClass = new Map(catalog.entries.map((entry) => [entry.facilityClass.id, entry]));

describe("facility-class-lookups.json (complete Emerald Facility Class presentation lookup)", () => {
  it("reproduces the committed source-derived catalog byte-for-byte", () => {
    const path = "src/data/gen/facility-class-lookups.json";
    const before = readFileSync(path, "utf8");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-facility-class-lookups.ts"], { stdio: "pipe" });
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("preserves all source-declared Facility Classes and both lookup arrays in numeric order", () => {
    expect(catalog.schema).toBe("facility-class-lookups/v1");
    expect(catalog.count).toBe(82);
    expect(catalog.entries).toHaveLength(82);
    for (const [id, entry] of catalog.entries.entries()) {
      expect(entry.facilityClass).toEqual({ symbol: expect.stringMatching(/^FACILITY_CLASS_[A-Z0-9_]+$/), id });
      expect(entry.trainerPic.symbol).toMatch(/^TRAINER_PIC_[A-Z0-9_]+$/);
      expect(entry.trainerPic.id).toBeGreaterThanOrEqual(0);
      expect(entry.trainerPic.frontPicCoords).toEqual({ size: expect.any(Number), yOffset: expect.any(Number) });
      expect(entry.trainerClass.symbol).toMatch(/^TRAINER_CLASS_[A-Z0-9_]+$/);
      expect(entry.trainerClass.id).toBeGreaterThanOrEqual(0);
      expect(entry.trainerClass.displayName).toEqual(expect.any(String));
    }
  });

  it("joins every ordinary Frontier trainer to one exact Facility Class, front pic, and trainer-class row", () => {
    const trainers = trainersData as { count: number; entries: Array<{ id: number; name: string; facilityClass: { source: string; id: number } }> };
    expect(trainers.count).toBe(300);
    for (const trainer of trainers.entries) {
      const row = byFacilityClass.get(trainer.facilityClass.id);
      expect(row, `missing class ${trainer.facilityClass.source} for trainer ${trainer.id}`).toBeDefined();
      expect(row!.facilityClass.symbol).toBe(trainer.facilityClass.source);
      expect(row!.trainerPic.frontPicCoords.size).toBeGreaterThan(0);
    }
  });

  it("pins source aliases, named Factory trainers, shared names, and non-default front-pic offsets", () => {
    const get = (symbol: string) => catalog.entries.find((entry) => entry.facilityClass.symbol === symbol)!;
    expect(get("FACILITY_CLASS_BUG_CATCHER")).toMatchObject({
      facilityClass: { id: 67 }, trainerPic: { symbol: "TRAINER_PIC_BUG_CATCHER", id: 73, frontPicCoords: { size: 8, yOffset: 1 } },
      trainerClass: { symbol: "TRAINER_CLASS_BUG_CATCHER", id: 51, displayName: "BUG CATCHER" },
    });
    expect(get("FACILITY_CLASS_FISHERMAN")).toMatchObject({
      facilityClass: { id: 45 }, trainerPic: { symbol: "TRAINER_PIC_FISHERMAN", id: 55 },
      trainerClass: { symbol: "TRAINER_CLASS_FISHERMAN", id: 39, displayName: "FISHERMAN" },
    });
    const trainers = trainersData as { entries: Array<{ name: string; facilityClass: { source: string; id: number } }> };
    expect(trainers.entries.find((trainer) => trainer.name === "DESTIN")!.facilityClass).toEqual({ source: "FACILITY_CLASS_BUG_CATCHER", id: 67 });
    expect(trainers.entries.find((trainer) => trainer.name === "JENSON")!.facilityClass).toEqual({ source: "FACILITY_CLASS_FISHERMAN", id: 45 });
    expect(get("FACILITY_CLASS_COOLTRAINER_M").trainerClass).toEqual(get("FACILITY_CLASS_COOLTRAINER_F").trainerClass);
    expect(get("FACILITY_CLASS_BRENDAN_2").trainerPic).toEqual(get("FACILITY_CLASS_BRENDAN").trainerPic);
    expect(get("FACILITY_CLASS_SR_AND_JR").trainerPic.frontPicCoords).toEqual({ size: 8, yOffset: 2 });
    expect(catalog.entries.some((entry) => entry.trainerPic.symbol === "TRAINER_PIC_FACTORY_HEAD_NOLAND")).toBe(false);
  });
});
