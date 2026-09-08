import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { sunnyDayAtAge, type SunnyDayLiveInputs } from "../../src/animation/sunnyDay.ts";

const order = Array.from({ length: 64 }, (_, index) => index);
const inputs: SunnyDayLiveInputs = {
  attackerSide: "player", targetSide: "opponent",
  attackerSpecies: "BELLOSSOM", targetSpecies: "WALREIN",
  attackerGeometry: { centerX: 72, centerY: 91, cornerX: 40, cornerY: 59 },
  targetGeometry: { centerX: 176, centerY: 40, cornerX: 144, cornerY: 8 },
  raySlots: [3, 4, 5, 7], spriteOrder: order,
  paletteBanks: { background: [0, 1, 2, 3], attackerPartner: 17 },
};

describe("MOVE_SUNNY_DAY source-relative reducer checkpoint", () => {
  it("ports the complete component lifetimes without granting framebuffer acceptance", () => {
    expect(sunnyDayAtAge(0, inputs)).toMatchObject({ active: true, resourceLoaded: false, source: { offset: 0, pointerParity: 1 } });
    expect(sunnyDayAtAge(7, inputs)).toMatchObject({ palette: { active: true, direction: "up", coefficient: 1 }, blend: { enabled: true, eva: 13, evb: 3 } });
    expect(sunnyDayAtAge(18, inputs).palette.coefficient).toBe(6);
    expect(sunnyDayAtAge(20, inputs)).toMatchObject({ source: { offset: 85, wait: 6 }, audio: { active: true, currentPan: -63 }, visualTaskCount: 1 });
    expect(sunnyDayAtAge(44, inputs).rays.map((ray) => [ray.allocationSlot, ray.localAge])).toEqual([[3, 24], [4, 16], [5, 8], [7, 0]]);
    expect(sunnyDayAtAge(80, inputs).rays[0]).toMatchObject({ allocationSlot: 3, localAge: 60, callback: "DestroyAnimSprite", x2: 139, y2: 79, remaining: 0, matrix: [-240, -217, 217, -240] });
    expect(sunnyDayAtAge(81, inputs).rays.map((ray) => ray.allocationSlot)).toEqual([4, 5, 7]);
    expect(sunnyDayAtAge(106, inputs).palette).toMatchObject({ active: true, direction: "down", coefficient: 5 });
    expect(sunnyDayAtAge(117, inputs).palette.coefficient).toBe(0);
    expect(sunnyDayAtAge(119, inputs)).toMatchObject({ monbg: { update: true, clear: true }, blend: { enabled: false } });
    expect(sunnyDayAtAge(147, inputs).audio.active).toBe(true);
    expect(sunnyDayAtAge(148, inputs).audio.active).toBe(false);
    expect(sunnyDayAtAge(156, inputs)).toMatchObject({ active: true, resourceLoaded: true });
    expect(sunnyDayAtAge(157, inputs)).toMatchObject({ active: false, resourceLoaded: false, firstInactiveCleanup: true, visualTaskCount: 0, soundTaskCount: 0 });
  });

  it("keeps sides, species, geometry, palette banks, allocator slots, and painter order live", () => {
    const changedOrder = order.filter((slot) => ![12, 2, 30, 9].includes(slot));
    const changed = sunnyDayAtAge(44, {
      ...inputs,
      attackerSide: "opponent", targetSide: "player",
      attackerSpecies: "TORKOAL", targetSpecies: "SURSKIT",
      attackerGeometry: { centerX: 181, centerY: 47, cornerX: 149, cornerY: 15 },
      targetGeometry: { centerX: 68, centerY: 86, cornerX: 36, cornerY: 54 },
      raySlots: [12, 2, 30, 9], spriteOrder: [9, 30, ...changedOrder, 2, 12],
      paletteBanks: { background: [3, 5], attackerPartner: 19 },
    });
    expect(changed.live).toMatchObject({ attackerSide: "opponent", attackerSpecies: "TORKOAL", targetSpecies: "SURSKIT", attackerGeometry: { centerX: 181 } });
    expect(changed.painterSlots).toEqual([12, 2, 30, 9]);
    expect(changed.palette).toMatchObject({ backgroundBanks: [3, 5], attackerPartnerBank: 19 });
    expect(changed.audio).toMatchObject({ startPan: 63, targetPan: -64, currentPan: 38 });
  });

  it("keeps the seam narrow and derives species, sides, and geometry from live battlers", () => {
    const seam = readFileSync("src/animation/sceneOnPresentation.ts", "utf8");
    expect(seam).toContain('readonly move: "SUNNY_DAY";');
    expect(seam).toContain('Pick<SunnyDayLiveInputs, "raySlots" | "spriteOrder" | "paletteBanks">');
    expect(seam).toContain("attackerSide: attacker.geometry.side");
    expect(seam).toContain("attackerSpecies: attacker.species");
    expect(seam).toContain("centerX: attacker.geometry.animationCenter.x");
    expect(seam).toContain("cornerY: target.geometry.spriteCorner.y");
  });

  it("regenerates only ANIM_TAG_SUNLIGHT byte-for-byte", () => {
    const before = readFileSync("src/animation/assets/sunny-day.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractSunnyDayAsset.ts"]);
    expect(readFileSync("src/animation/assets/sunny-day.json")).toEqual(before);
  });

  it("matches all 316 retained bilateral component rows without claiming framebuffers", () => {
    let matched = 0;
    for (const side of ["player", "opponent"] as const) {
      const rows = JSON.parse(gunzipSync(readFileSync(`tools/compare/evidence/sunny-day-${side}-dense-state.json.gz`)).toString("utf8")).frames as any[];
      const live: SunnyDayLiveInputs = side === "player" ? { ...inputs, spriteOrder: rows[0]!.spriteOrder } : {
        ...inputs,
        attackerSide: "opponent", targetSide: "player",
        attackerSpecies: "BELLOSSOM", targetSpecies: "WALREIN",
        raySlots: [3, 4, 5, 7], spriteOrder: rows[0]!.spriteOrder,
      };
      rows.forEach((row, age) => {
        const view = sunnyDayAtAge(age, live);
        const rays = row.sprites.filter((sprite: any) => sprite.template?.symbol === "gSunlightRaySpriteTemplate");
        const palette = row.tasks.find((task: any) => task.func?.symbol === "AnimTask_BlendSpriteColor_Step2");
        expect({ offset: view.source.offset, wait: view.source.wait, active: view.active }).toEqual({ offset: row.scriptOffset, wait: row.scriptWait, active: row.animScriptActive });
        expect(view.rays.map((ray) => [ray.allocationSlot, ray.x2, ray.y2, ray.matrix, ray.callback])).toEqual(
          rays.map((ray: any) => [ray.slot, ray.x2, ray.y2, ray.matrix, ray.callback.symbol]),
        );
        expect(view.palette.active ? [view.palette.delayCounter, view.palette.coefficient] : null).toEqual(palette ? [palette.data[9], palette.data[10]] : null);
        expect(view.monbg.update).toBe(row.tasks.some((task: any) => task.func?.symbol === "Task_UpdateMonBg"));
        expect(view.monbg.clear).toBe(row.tasks.some((task: any) => task.func?.symbol === "Task_ClearMonBg"));
        expect([view.visualTaskCount, view.soundTaskCount]).toEqual([row.visualTaskCount, row.soundTaskCount]);
        matched += 1;
      });
    }
    expect(matched).toBe(316);
  });

  it("rejects invalid side, allocation, geometry, and palette inputs", () => {
    expect(() => sunnyDayAtAge(0, { ...inputs, targetSide: "player" })).toThrow(/battler/);
    expect(() => sunnyDayAtAge(0, { ...inputs, raySlots: [3, 3, 5, 7] })).toThrow(/allocation/);
    expect(() => sunnyDayAtAge(0, { ...inputs, paletteBanks: { background: [], attackerPartner: 17 } })).toThrow(/palette/);
  });
});
