// pic4 (2026-11-20 playtest, docs/pic1-live-field-pictures.md): Kyle's TUBER JASON stopped one tile above the player in the battle
// room. The ROM anchors every object event sprite at the bottom of its tile (event_object_movement.c:1461-1464:
// centerToCornerVecY = -(height >> 1); sprite->y += 16 + centerToCornerVecY, so the sprite's top is tile * 16 + 16 - height), and the
// three 16x16 trainer objects the Factory can draw (gObjectEventGraphicsInfo_TuberM / _TuberF / _NinjaBoy: width 16, height 16) stand
// on the same feet line as the 16x32 ones. The settled room shows the opponent level with the player (Kyle: "A POKEFAN stands level").
import { describe, expect, it } from "vitest";
import { renderBattleRoomEntryScene, opponentSheetNameForGfx } from "../src/engine/battleRoomRender";
import { entryStep, INITIAL_BATTLE_ROOM_STATE, SETTLED_SCENE_ELAPSED } from "../src/engine/battleRoom";
import { getFactoryTrainerPresentation } from "../src/engine/factoryTrainerPresentation";
import { facilityTrainerGfxIdForClass } from "../src/engine/factoryTrainerOverworldGfx";
import { recordDraws } from "../src/engine/drawRecord";
import npcs from "../src/assets/gen/battle-room-npcs.json" with { type: "json" };

function settledRoom(trainerId: number) {
  const trainer = getFactoryTrainerPresentation(trainerId);
  const { record } = recordDraws(() => renderBattleRoomEntryScene(
    new Uint8Array(240 * 160 * 4), entryStep(SETTLED_SCENE_ELAPSED), SETTLED_SCENE_ELAPSED, 0, 0, undefined,
    { ...INITIAL_BATTLE_ROOM_STATE, trainerPresentation: trainer },
  ));
  const opponent = record.overworldSprites.find((s) => s.role === "room-opponent")!;
  const player = record.overworldSprites.find((s) => s.role === "room-player")!;
  return { trainer, opponent, player };
}

/** One Factory trainer id per room sheet (the first in the trainer table). */
function trainerIdsBySheet(): Map<string, number> {
  const out = new Map<string, number>();
  for (let id = 0; id < 300; id += 1) {
    let trainer;
    try { trainer = getFactoryTrainerPresentation(id); } catch { continue; }
    const sheet = opponentSheetNameForGfx(facilityTrainerGfxIdForClass(trainer.facilityClassId));
    if (!out.has(sheet)) out.set(sheet, id);
  }
  return out;
}

describe("pic4: the battle room draws every trainer on the player's feet line", () => {
  it("the 16x16 room sheets are exactly TUBER_M, TUBER_F and NINJA_BOY", () => {
    const small = Object.entries((npcs as { opponents: Record<string, { frames: { rows: number }[] }> }).opponents)
      .filter(([, sheet]) => sheet.frames[0]!.rows * 8 === 16).map(([name]) => name).sort();
    expect(small).toEqual(["NINJA_BOY", "TUBER_F", "TUBER_M"]);
  });

  it("TUBER JASON (Kyle's battle 3) stands level with the player, as POKEFAN PEYTON does", () => {
    const tuber = settledRoom(25);
    expect([tuber.trainer.name, tuber.opponent.graphicsId, tuber.opponent.height]).toEqual(["JASON", "TUBER_M", 16]);
    const pokefan = settledRoom(36);
    expect([pokefan.trainer.name, pokefan.opponent.height]).toEqual(["PEYTON", 32]);
    expect(tuber.opponent.y + tuber.opponent.height).toBe(tuber.player.y + tuber.player.height);
    expect(pokefan.opponent.y + pokefan.opponent.height).toBe(pokefan.player.y + pokefan.player.height);
  });

  it("every Factory trainer sheet, small or tall, puts its feet on the player's feet line", () => {
    const ids = trainerIdsBySheet();
    expect(ids.has("TUBER_F") && ids.has("NINJA_BOY")).toBe(true);
    for (const [sheet, id] of ids) {
      const { opponent, player } = settledRoom(id);
      expect(opponent.graphicsId, sheet).toBe(sheet);
      expect(opponent.y + opponent.height, sheet).toBe(player.y + player.height);
    }
  });
});
