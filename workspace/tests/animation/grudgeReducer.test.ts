import { describe, expect, it } from "vitest";
import { createSceneOnMovePresentation, sceneOnGrudgeView } from "../../src/animation/sceneOnPresentation.ts";
import { grudgeConfigFor, grudgeRowsFor } from "../../tools/compare/grudgeFramebuffer.ts";

describe("MOVE_GRUDGE pure source-relative reducer", () => {
  it("matches every retained source, flame, register, resource, order, and animation-RNG row", () => {
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const rows = grudgeRowsFor(orientation);
      const config = grudgeConfigFor(orientation, rows);
      const stage = createSceneOnMovePresentation(config);
      for (const [age, row] of rows.entries()) {
        const view = sceneOnGrudgeView({ ...stage, age });
        const flames = row.sprites.filter((sprite: any) => sprite.template?.symbol === "gGrudgeFlameSpriteTemplate");
        const slots = config.animationProfile.flameSlots;
        const taskNames = row.tasks.map((task: any) => task.func?.symbol);
        expect({
          sourceOffset: view.sourceOffset,
          sourceWait: view.sourceWait,
          scriptActive: view.scriptActive,
          flames: view.flames.map((flame) => ({
            slot: flame.slot, x: flame.x, y: flame.y, x2: flame.x2, y2: flame.y2,
            priority: flame.priority, subpriority: flame.subpriority, frame: flame.frame, data: flame.data,
          })),
          painterSlots: view.flamePainterOrder.map((index) => slots[index]),
          monBg: view.monBg,
          blend: view.blend,
          resourcesLoaded: view.resourcesLoaded,
          animationRng: view.animationRng,
        }).toEqual({
          sourceOffset: row.scriptOffset,
          sourceWait: row.scriptWait,
          scriptActive: row.animScriptActive,
          flames: flames.map((flame: any) => ({
            slot: flame.slot, x: flame.x, y: flame.y, x2: flame.x2, y2: flame.y2,
            priority: (flame.attr[2] >> 10) & 3, subpriority: flame.subpriority,
            frame: ((flame.attr[2] & 1023) - 305) / 8,
            data: flame.data,
          })),
          painterSlots: flames.length === 0
            ? []
            : row.spriteOrder.filter((slot: number) => slots.includes(slot)).reverse(),
          monBg: {
            active: taskNames.includes("Task_UpdateMonBg"),
            clearing: taskNames.includes("Task_ClearMonBg"),
          },
          blend: {
            active: age >= 46 && age <= 133,
            eva: age >= 46 && age <= 133 ? row.registers.bldalpha & 31 : 0,
            evb: age >= 46 && age <= 133 ? (row.registers.bldalpha >> 8) & 31 : 0,
          },
          resourcesLoaded: row.paletteTags.includes(10253) && row.tileTags.includes(10253),
          animationRng: row.animationRng,
        });
      }
    }
  });
});
