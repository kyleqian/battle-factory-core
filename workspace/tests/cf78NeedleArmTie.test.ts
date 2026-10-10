// cf78 (live audit 19 DEFECT 2; docs/cf78-castform-needle-arm.md): Needle Arm 302's burst creates n17 and n19 tie in SortSprites (ROM priority
// word 0x3ff, equal y), so the stable insertion sort keeps their START-order relation; the plan's final destroy group is FDERIVED with the
// pair sharing one rank (fixtures/cf78/plan-overrides.json), and every other sprite keeps the stored order.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeSpriteOrderPlan, spriteOrderProductionBodyPlan } from "../src/engine/spriteOrderEventTransform.ts";
import { SPRITE_ORDER_PRODUCTION_BODIES, SPRITE_ORDER_PRODUCTION_PLANS } from "../src/engine/spriteOrderProductionPlans.ts";
import {
  applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, type SpriteOrderState,
} from "../src/engine/spriteOrderProvider.ts";

const OLD_302 = "Cf;Cf;Cf;Cf;Cf/D0;Cf/D1;Cf/D2;Cf/D3;Cf/D4;Cf/D5;Cf/D6;Cf/D7;D8;D9;D10;D11;Cfffffffff;Cf;D13;D12,18,19,17,16,20,15,21,14";
const state = (free: readonly number[]): SpriteOrderState => ({ known: true, free, pendingDestroyed: [] });
// audit 19 (AUDIT19_TRACE): the host's free list before the 2nd Needle Arm of `[Needle Arm, Water Pulse]`, prompt, `[Needle Arm]` (== the
// ROM's): slot 10 ahead of slot 12. Completed with the entry order's remaining slots (same occupancy).
const AFTER_WATER_PULSE_HEAD = [3, 4, 10, 7, 9, 5, 14, 15, 12, 13, 11, 21];
const AFTER_WATER_PULSE = [...AFTER_WATER_PULSE_HEAD, ...KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER.filter((slot) => !AFTER_WATER_PULSE_HEAD.includes(slot))];
const run = (plan: ReturnType<typeof decodeSpriteOrderPlan>, free: readonly number[]) => {
  const cursor = applySpriteOrderUnitPlan(createSpriteOrderPlanCursor(state(free)), plan);
  expect(cursor.order.known).toBe(true);
  return cursor.order.free;
};
const before = (free: readonly number[], a: number, b: number) => free.indexOf(a) < free.indexOf(b);

describe("cf78: Needle Arm 302's SortSprites tie (n17 / n19) keeps the start order", () => {
  it("both rows use the one tie-modelled plan (index 162, rewritten in place)", () => {
    expect(SPRITE_ORDER_PRODUCTION_BODIES["302:player"]).toBe(162);
    expect(SPRITE_ORDER_PRODUCTION_BODIES["302:opponent"]).toBe(162);
    expect(SPRITE_ORDER_PRODUCTION_PLANS[162]).toBe(`${OLD_302}/P1,2,3,3,4,5,6,7,8`);
    expect(spriteOrderProductionBodyPlan(302, "player")).toEqual(spriteOrderProductionBodyPlan(302, "opponent"));
  });

  it("entry-like start (slot 12 ahead of 10: every plans69 probe, 38 / 44 audit-19 windows): identical to the old plan", () => {
    expect(before(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, 12, 10)).toBe(true);
    const fixed = run(spriteOrderProductionBodyPlan(302, "opponent")!, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
    expect(fixed).toEqual(run(decodeSpriteOrderPlan(OLD_302), KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER));
    expect(fixed.slice(0, 4)).toEqual([3, 11, 12, 10]);
  });

  it("start with slot 10 ahead of 12 (audit 19's 6 Water Pulse windows): the pair follows the start (ROM [3, 11, 10, 12, ...])", () => {
    const old = run(decodeSpriteOrderPlan(OLD_302), AFTER_WATER_PULSE);
    const fixed = run(spriteOrderProductionBodyPlan(302, "opponent")!, AFTER_WATER_PULSE);
    expect(old.slice(0, 4)).toEqual([3, 11, 12, 10]); // the defect: the stored placement
    expect(fixed.slice(0, 4)).toEqual([3, 11, 10, 12]);
    // Only the tied pair moves.
    expect(fixed.map((slot) => slot === 10 ? 12 : slot === 12 ? 10 : slot)).toEqual(old);
  });
});

// audit19Check.ts AUDIT19_LENDS_ONLY on the 16 committed needle scenarios (44 windows) against the committed audit-19 lends.txt: the 38
// matching lines byte-identical, the 6 differing ones now lend == ROM.
const NEEDLE = ["cacnea", "cacturne"].flatMap((mon) => ["shock-wave", "swift", "thunderbolt", "water-pulse"]
  .flatMap((move) => ["opp", "ply"].map((side) => `needle-${mon}-${move}-${side}`)));
const lendsOf = (scenario: string) => new Promise<string>((resolve, reject) => {
  const child = spawn(process.execPath, ["--experimental-strip-types", "--no-warnings", "tools/integration/audit19Check.ts",
    "tools/integration/fixtures/audit-19/fixtures", scenario, "/dev/null"], { env: { ...process.env, AUDIT19_LENDS_ONLY: "1" } });
  let out = "";
  child.stdout.on("data", (chunk) => { out += chunk; });
  child.on("error", reject);
  child.on("close", (code) => code === 0 ? resolve(out) : reject(new Error(`${scenario}: exit ${code}`)));
});

describe("cf78: audit 19's 44 Needle Arm windows through production", () => {
  it("38 lends unchanged, the 6 Water Pulse lends now equal the ROM", async () => {
    const committed = readFileSync("tools/integration/fixtures/audit-19/receipts/lends.txt", "utf8").split("\n")
      .filter((line) => line.includes('"fixture":"needle-'));
    expect(committed).toHaveLength(44);
    const now = (await Promise.all(NEEDLE.map(lendsOf))).join("").split("\n").filter((line) => line !== "");
    expect(now).toHaveLength(44);
    const byFixture = (lines: readonly string[]) => new Map(lines.map((line) => [JSON.parse(line).fixture as string, line]));
    const was = byFixture(committed), is = byFixture(now);
    let unchanged = 0, fixed = 0;
    for (const [fixture, line] of was) {
      const before = JSON.parse(line), after = JSON.parse(is.get(fixture)!);
      expect(after.live, fixture).toBe(true);
      expect(after.lend, fixture).toEqual(after.rom);
      if (before.same) { expect(is.get(fixture), fixture).toBe(line); unchanged += 1; }
      else { expect(fixture).toMatch(/water-pulse-(opp-c1|ply-c[12])\.json$/); fixed += 1; }
    }
    expect([unchanged, fixed]).toEqual([38, 6]);
  }, 240000);
});
