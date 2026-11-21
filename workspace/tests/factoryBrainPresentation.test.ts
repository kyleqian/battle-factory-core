/**
 * Noland presentation seam pins (source citations re-verified directly
 * against reference/pokeemerald this session, per
 * docs/noland-brain-staging-design.md §2.3):
 * - pic/class/name: GetFrontierBrainTrainerPicIndex/…Class/
 *   CopyFrontierBrainTrainerName (frontier_util.c:2443-2481), all reading
 *   gTrainers[TRAINER_NOLAND] (src/data/trainers.h:9712-9722):
 *   trainerPic = TRAINER_PIC_FACTORY_HEAD_NOLAND (86,
 *   include/constants/trainers.h:105), trainerClass =
 *   TRAINER_CLASS_FACTORY_HEAD (0x3e = 62,
 *   include/constants/trainers.h:350; display name "FACTORY HEAD",
 *   src/data/text/trainer_class_names.h:64), trainerName = "NOLAND".
 * - gender: IsFrontierBrainFemale (frontier_util.c:2483-2487) reads
 *   sFrontierBrainObjEventGfx[FRONTIER_FACILITY_FACTORY][1] = FALSE
 *   (frontier_util.c:674) -- male.
 */
import { describe, expect, it } from "vitest";
import { TRAINER_FRONTIER_BRAIN } from "../src/engine/factoryAiMaskSelection.ts";
import {
  CANONICAL_NOLAND_PRESENTATION,
  getFactoryTrainerPresentation,
} from "../src/engine/factoryTrainerPresentation.ts";
import { resolveFrontierTrainerPic } from "../src/engine/battleScene.ts";

describe("Frontier Brain (Noland) presentation identity", () => {
  it("pins every §2.3-sourced field for trainer id 1022", () => {
    expect(TRAINER_FRONTIER_BRAIN).toBe(1022);
    const noland = CANONICAL_NOLAND_PRESENTATION;
    expect(noland).toEqual({
      trainerId: 1022,
      trainerSourceId: "TRAINER_NOLAND",
      name: "NOLAND",
      facilityClassId: -1,
      facilityClass: "N/A",
      trainerClassId: 0x3e,
      trainerClass: "TRAINER_CLASS_FACTORY_HEAD",
      className: "FACTORY HEAD",
      trainerPicIndex: 86,
      trainerPic: "TRAINER_PIC_FACTORY_HEAD_NOLAND",
      gender: "male",
      speechBefore: ["", ""],
      // hdl1: the Silver tier's end-of-battle lines (gText_NolandWonSilver / gText_NolandDefeatSilver, frontier_brain.inc:31-37);
      // tests/hdl1HeadEndOfBattleLines.test.ts pins both tiers against the source.
      speechWin: ["Way to work!", "That was a good lesson, eh?"],
      speechLose: ["Good job!", "You know what you’re doing!"],
    });
  });

  it("is reachable only via the special-cased 1022 id, not folded into the ordinary corpus", () => {
    expect(() => getFactoryTrainerPresentation(1021)).toThrow(/missing Battle Frontier trainer 1021/);
    expect(() => getFactoryTrainerPresentation(300)).toThrow(/missing Battle Frontier trainer 300/);
    expect(getFactoryTrainerPresentation(1022)).toBe(CANONICAL_NOLAND_PRESENTATION);
  });

  it("resolves NOLAND's real 64x64 front picture through the production pic selector", () => {
    const pic = resolveFrontierTrainerPic(CANONICAL_NOLAND_PRESENTATION.trainerPic);
    expect(pic).toMatchObject({
      id: 86,
      symbol: "TRAINER_PIC_FACTORY_HEAD_NOLAND",
      width: 64,
      height: 64,
      yOffsetPx: 8,
    });
    expect(pic.tileset.tiles).toHaveLength(64);
    expect(pic.palette).toHaveLength(16);
  });
});
