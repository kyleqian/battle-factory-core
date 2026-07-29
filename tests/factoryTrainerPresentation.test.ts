import { describe, expect, it } from "vitest";
import {
  MSGBOX_LINE1,
  MSGBOX_LINE2,
  JENSON_MSGBOX_LINE1,
  JENSON_MSGBOX_LINE2,
  battleRoomQuote,
} from "../src/engine/battleRoom.ts";
import {
  TURN17_LOSS_LINE1,
  TURN17_LOSS_LINE2,
  TURN17_OUTCOME_LINE2,
  battleIntroEncounterParams,
  battleSendOutEncounterParams,
} from "../src/engine/battleScene.ts";
import {
  CANONICAL_DESTIN_PRESENTATION,
  CANONICAL_JENSON_PRESENTATION,
  factoryTrainerPresentationForOpponent,
  getFactoryTrainerPresentation,
} from "../src/engine/factoryTrainerPresentation.ts";

describe("generated Factory trainer presentation identity", () => {
  it("proves canonical trainer 50 byte-equivalent to every frozen DESTIN identity string before wiring", () => {
    const trainer = CANONICAL_DESTIN_PRESENTATION;

    expect(trainer).toMatchObject({
      trainerId: 50,
      name: "DESTIN",
      className: "BUG CATCHER",
      trainerPic: "TRAINER_PIC_BUG_CATCHER",
    });
    expect(trainer.speechBefore).toEqual([MSGBOX_LINE1, MSGBOX_LINE2]);
    expect(trainer.speechLose).toEqual([TURN17_LOSS_LINE1, TURN17_LOSS_LINE2]);
    expect(`${trainer.className} ${trainer.name}`)
      .toBe(battleIntroEncounterParams("destin").line1);
    expect(`${trainer.className} ${trainer.name} sent`)
      .toBe(battleSendOutEncounterParams("destin").line1);
    expect(`${trainer.className} ${trainer.name}!`).toBe(TURN17_OUTCOME_LINE2);
  });

  it("also proves established trainer 58 byte-equivalent to the JENSON control strings", () => {
    const trainer = CANONICAL_JENSON_PRESENTATION;

    expect(trainer).toMatchObject({
      trainerId: 58,
      name: "JENSON",
      className: "FISHERMAN",
      trainerPic: "TRAINER_PIC_FISHERMAN",
    });
    expect(trainer.speechBefore).toEqual([
      JENSON_MSGBOX_LINE1,
      JENSON_MSGBOX_LINE2,
    ]);
    expect(`${trainer.className} ${trainer.name}`)
      .toBe(battleIntroEncounterParams("jenson").line1);
    expect(`${trainer.className} ${trainer.name} sent`)
      .toBe(battleSendOutEncounterParams("jenson").line1);
  });

  it("varies generated name, class, and every Easy Chat speech by trainer id", () => {
    const destin = getFactoryTrainerPresentation(50);
    const jenson = getFactoryTrainerPresentation(58);

    expect(jenson.name).not.toBe(destin.name);
    expect(jenson.className).not.toBe(destin.className);
    expect(jenson.speechBefore).not.toEqual(destin.speechBefore);
    expect(jenson.speechWin).not.toEqual(destin.speechWin);
    expect(jenson.speechLose).not.toEqual(destin.speechLose);
  });

  it("drives the room quote and both battle-intro identity printers from generated semantic state", () => {
    const brady = factoryTrainerPresentationForOpponent({
      id: "factory-trainer-0",
      trainerName: "BRADY",
    });
    const destin = factoryTrainerPresentationForOpponent({
      id: "factory-trainer-50",
      trainerName: "DESTIN",
    });
    expect(brady).not.toBeNull();
    expect(destin).not.toBeNull();

    const consume = (trainer: NonNullable<typeof brady>) => ({
      roomQuote: battleRoomQuote({
        phase: "msgboxIdle",
        elapsed: 0,
        trainerPresentation: trainer,
      }),
      intro: battleIntroEncounterParams("destin", trainer).line1,
      sendOut: battleSendOutEncounterParams("destin", trainer).line1,
    });
    expect(consume(brady!)).toEqual({
      roomQuote: brady!.speechBefore,
      intro: `${brady!.className} ${brady!.name}`,
      sendOut: `${brady!.className} ${brady!.name} sent`,
    });
    expect(consume(brady!)).not.toEqual(consume(destin!));
  });
});
