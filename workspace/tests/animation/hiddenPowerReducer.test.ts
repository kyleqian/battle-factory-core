import { describe, expect, it } from "vitest";
import { createSceneOnMovePresentation, sceneOnHiddenPowerView } from "../../src/animation/sceneOnPresentation.ts";
import { hiddenPowerConfigFor, hiddenPowerLiveSlotsAt, hiddenPowerRowsFor } from "../../tools/compare/hiddenPowerFixture.ts";

describe("MOVE_HIDDEN_POWER pure source-relative reducer and typed seam", () => {
  it("matches all 360 source/component/order/palette/RNG rows", () => {
    const mismatches: string[] = [];
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const rows = hiddenPowerRowsFor(orientation);
      const config = hiddenPowerConfigFor(orientation, rows);
      const stage = createSceneOnMovePresentation(config);
      for (const [age, row] of rows.entries()) {
        const view = sceneOnHiddenPowerView({ ...stage, age });
        const taskNames = row.tasks.map((task: any) => task.func?.symbol);
        const sourceOrbs = row.sprites.filter((sprite: any) => [
          "gHiddenPowerOrbSpriteTemplate", "gHiddenPowerOrbScatterSpriteTemplate",
        ].includes(sprite.template?.symbol));
        const sourceBySlot = new Map(sourceOrbs.map((sprite: any) => [sprite.slot, sprite]));
        const actual = {
          sourceOffset: view.sourceOffset,
          sourceWait: view.sourceWait,
          scriptActive: view.scriptActive,
          animArg7: view.animArg7,
          resourcesLoaded: view.resourcesLoaded,
          scale: view.attackerScale,
          blend: view.blend,
          orbs: view.orbs.map((orb) => ({
            kind: orb.kind, slot: orb.slot, initialized: orb.initialized,
            x: orb.x, y: orb.y, x2: orb.x2, y2: orb.y2,
            subpriority: orb.subpriority, matrixNum: orb.matrixNum,
            matrix: orb.matrix, data: orb.data,
          })),
          painterSlots: view.painterOrder.map((owner) => view.orbs.find((orb) => orb.owner === owner)!.slot),
          animationRng: view.animationRng,
        };
        const expected = {
          sourceOffset: row.scriptOffset,
          sourceWait: row.scriptWait,
          scriptActive: row.animScriptActive,
          animArg7: row.animArgs[7],
          resourcesLoaded: row.tileTags.includes(10217) && row.paletteTags.includes(10217),
          scale: {
            active: taskNames.includes("AnimTask_ScaleMonAndRestore_Step"),
            value: row.battlerSprites.attacker.matrix[0],
          },
          blend: {
            active: taskNames.includes("AnimTask_BlendMonInAndOut_Step"),
            coefficient: taskNames.includes("AnimTask_BlendMonInAndOut_Step")
              ? row.tasks.find((task: any) => task.func?.symbol === "AnimTask_BlendMonInAndOut_Step").data[2] : 0,
            colorBgr555: 20479,
          },
          orbs: sourceOrbs.map((sprite: any) => ({
            kind: sprite.template.symbol === "gHiddenPowerOrbSpriteTemplate" ? "orbit" : "scatter",
            slot: sprite.slot,
            initialized: sprite.callback.symbol !== "AnimOrbitScatter",
            x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
            subpriority: sprite.subpriority, matrixNum: sprite.matrixNum,
            matrix: sprite.matrix, data: sprite.data,
          })),
          painterSlots: hiddenPowerLiveSlotsAt(row).length === 0 ? []
            : row.spriteOrder.filter((slot: number) => sourceBySlot.has(slot)).reverse(),
          animationRng: row.animationRng,
        };
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          mismatches.push(`${orientation}:${age}`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});
