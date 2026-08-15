import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import walkup from "../src/data/gen/factory-brain-walkup-script.json" with { type: "json" };

describe("Factory Frontier Brain (Noland) walk-up script extraction", () => {
  it("pins the schema, brain-status constants, warp target, and heard-speech flag mechanism", () => {
    expect(walkup.schema).toBe("factory-brain-walkup-script/v1");
    expect(walkup.constants.frontierBrainStatus).toEqual({ NOT_READY: 0, SILVER: 1, GOLD: 2, STREAK: 3, STREAK_LONG: 4 });
    expect(walkup.constants.warpTarget).toEqual({ map: "MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM", x: 6, y: 11 });
    expect(walkup.heardBrainSpeechFlag.bits).toEqual({ silver: "1 << 8 (hasSymbol bucket 0)", gold: "1 << 9 (hasSymbol bucket 1)" });
    expect(walkup.music.sharedTrack).toBe("MUS_B_FACTORY");
    expect(walkup.music.mapsSharingTrack).toEqual([
      "BattleFrontier_BattleFactoryLobby",
      "BattleFrontier_BattleFactoryPreBattleRoom",
      "BattleFrontier_BattleFactoryBattleRoom",
    ]);
  });

  it("pins the shared PreBattleRoom call-scene: 7 brain-specific boxes + 1 flagged generic heal line", () => {
    const scenes = walkup.scenes;
    const messageAndYesNoEvents = ([
      ...scenes.preBattleRoomCallScene.events,
      ...scenes.askReadyForHead.events,
      ...scenes.askSwapBeforeHead.events,
      ...scenes.enterBattleRoom.events,
    ] as any[]).filter((event) => event.kind === "message" || event.kind === "yesno");

    expect(messageAndYesNoEvents).toHaveLength(8);
    const nonBrainSpecific = messageAndYesNoEvents.filter((event) => event.nonBrainSpecific);
    expect(nonBrainSpecific).toHaveLength(1);
    expect(nonBrainSpecific[0]!.label).toBe("BattleFrontier_BattleFactoryPreBattleRoom_Text_LetUsRestoreMons");
    expect(messageAndYesNoEvents.filter((event) => !event.nonBrainSpecific)).toHaveLength(7);

    // Verbatim spot-checks, control codes preserved as literal ROM macros.
    expect(scenes.preBattleRoomCallScene.events[1]).toMatchObject({
      label: "BattleFrontier_BattleFactoryPreBattleRoom_Text_LetUsRestoreMons",
      raw: "Thank you for competing!\\nLet us restore your POKéMON!$",
      pageCount: 1,
    });
    expect(scenes.preBattleRoomCallScene.events[5]).toMatchObject({
      label: "BattleFrontier_BattleFactoryPreBattleRoom_Text_WaitFewMoments",
      raw: "Excuse me! Excuse me, please!\\nMay I get you to wait a few moments?$",
    });
    expect(scenes.preBattleRoomCallScene.events[9]).toMatchObject({
      label: "BattleFrontier_BattleFactoryPreBattleRoom_Text_MessageFromHeadComeRightNow",
      pageCount: 3,
    });
    expect(scenes.askReadyForHead.events[0]).toMatchObject({
      label: "BattleFrontier_BattleFactoryPreBattleRoom_Text_PreparedToFaceHead",
      raw: "The FACTORY HEAD is demanding you.\\nAre you prepared to face him?$",
    });
    expect(scenes.enterBattleRoom.events[0]).toMatchObject({
      label: "BattleFrontier_BattleFactoryPreBattleRoom_Text_RightThisWay",
      raw: "Right this way, please!$",
    });

    // The attendant call-scene movement step lists.
    expect(scenes.preBattleRoomCallScene.events[6]).toMatchObject({
      kind: "movement",
      subject: "attendant",
      steps: ["walk_left", "walk_left", "walk_left"],
      stepCount: 3,
    });
    expect(scenes.preBattleRoomCallScene.events[8]).toMatchObject({
      kind: "movement",
      subject: "attendant",
      steps: ["walk_right", "walk_right", "walk_right", "face_down"],
      stepCount: 4,
    });
    expect(scenes.preBattleRoomCallScene.events.at(-1)).toEqual({ kind: "delay", frames: 16 });
  });

  it("pins the MULTI_GO_ON_RECORD_REST_RETIRE multichoice and the swap YESNO box", () => {
    const multichoice = walkup.scenes.askReadyForHead.events[1] as any;
    expect(multichoice).toMatchObject({
      kind: "multichoice",
      id: "MULTI_GO_ON_RECORD_REST_RETIRE",
      x: 19,
      y: 4,
      ignoreBPress: true,
      options: ["GO ON", "RECORD", "REST", "RETIRE"],
    });

    const yesno = walkup.scenes.askSwapBeforeHead.events[1] as any;
    expect(yesno).toMatchObject({
      kind: "yesno",
      boxType: "MSGBOX_YESNO",
      raw: "Before starting the battle, would you\\nlike to swap a POKéMON?$",
      options: ["YES", "NO"],
      branches: { NO: "EnterBattleRoom", MULTI_B_PRESSED: "EnterBattleRoom" },
    });
  });

  it("pins the shared EnterBattleRoom walk (Lv50/LvOpen step lists) and the BattleRoom warp target", () => {
    const variants = walkup.scenes.enterBattleRoom.events.filter((event) => event.kind === "movementVariant") as any[];
    expect(variants).toHaveLength(2);
    const lv50 = variants.find((v) => v.variant === "FRONTIER_LVL_50");
    const lvOpen = variants.find((v) => v.variant === "FRONTIER_LVL_OPEN");
    expect(lv50.guide.steps).toEqual(["walk_left", "walk_left", "walk_up", "walk_up", "set_invisible"]);
    expect(lv50.player.steps).toEqual(["walk_up", "walk_left", "walk_left", "walk_up", "walk_up"]);
    expect(lvOpen.guide.steps).toEqual(["walk_right", "walk_right", "walk_up", "walk_up", "set_invisible"]);
    expect(lvOpen.player.steps).toEqual(["walk_up", "walk_right", "walk_right", "walk_up", "walk_up"]);

    expect(walkup.scenes.enterBattleRoom.events.at(-1)).toEqual({
      kind: "warp",
      map: "MAP_BATTLE_FRONTIER_BATTLE_FACTORY_BATTLE_ROOM",
      x: 6,
      y: 11,
    });
  });

  it("pins Noland's brain-ready placement at (7,9), visible from start, contrasted with the hidden ordinary opponent", () => {
    const placement = walkup.scenes.battleRoomEntrance.placement;
    expect(placement.brainGfx).toMatchObject({ gfx: "OBJ_EVENT_GFX_NOLAND", female: false });
    expect(placement.position).toEqual({ x: 7, y: 9 });
    expect(placement.visibleFromStart).toBe(true);
    expect(placement.ordinaryOpponentContrast.hiddenStartPosition).toEqual({ x: 7, y: 1 });
  });

  it("pins line 8 verbatim and the entrance movement step lists", () => {
    const events = walkup.scenes.battleRoomEntrance.events;
    expect(events[0]).toMatchObject({
      kind: "message",
      label: "BattleFrontier_BattleFactoryBattleRoom_Text_GetAMoveOn",
      raw: "Hey, hey!\\nGet a move on!$",
      pages: ["Hey, hey!\\nGet a move on!"],
      pageCount: 1,
    });
    const noland = events.find((e) => e.kind === "movement" && (e as any).subject === "noland") as any;
    expect(noland.steps).toEqual(["walk_up", "walk_up", "walk_up", "face_left"]);
    const player = events.find((e) => e.kind === "movement" && (e as any).subject === "player") as any;
    expect(player.steps).toEqual(["walk_up", "walk_up", "walk_up", "walk_up", "walk_up", "face_right"]);
    const decoy = events.find((e) => e.kind === "movement" && (e as any).subject === "playerDecoy") as any;
    expect(decoy.steps).toEqual(player.steps);
  });

  it("pins all 6 scientist positions and their facing turns", () => {
    const call = walkup.scenes.battleRoomEntrance.events.find((e) => e.kind === "call") as any;
    expect(call.scientists).toHaveLength(6);
    const byId = Object.fromEntries(call.scientists.map((s: any) => [s.localId, s]));
    expect(byId.LOCALID_FACTORY_BATTLE_SCIENTIST_1).toMatchObject({ position: { x: 0, y: 6 }, facingTurn: "right" });
    expect(byId.LOCALID_FACTORY_BATTLE_SCIENTIST_2).toMatchObject({ position: { x: 0, y: 4 }, facingTurn: "right" });
    expect(byId.LOCALID_FACTORY_BATTLE_SCIENTIST_3).toMatchObject({ position: { x: 0, y: 8 }, facingTurn: "right" });
    expect(byId.LOCALID_FACTORY_BATTLE_SCIENTIST_4).toMatchObject({ position: { x: 12, y: 4 }, facingTurn: "left" });
    expect(byId.LOCALID_FACTORY_BATTLE_SCIENTIST_5).toMatchObject({ position: { x: 12, y: 6 }, facingTurn: "left" });
    expect(byId.LOCALID_FACTORY_BATTLE_SCIENTIST_6).toMatchObject({ position: { x: 12, y: 8 }, facingTurn: "left" });
  });

  it("pins silver's 8-page first-encounter speech and its 9-boxes-shorter repeat variant", () => {
    const { silverFirstEncounter, silverRepeat } = walkup.scenes;
    expect(silverFirstEncounter.events[0]).toMatchObject({
      kind: "message",
      label: "BattleFrontier_BattleFactoryBattleRoom_Text_NolandImFactoryHead",
      pageCount: 8,
    });
    expect((silverFirstEncounter.events[0] as any).raw).toContain("Hey, my name's NOLAND!");
    expect((silverFirstEncounter.events[0] as any).raw.endsWith("I'll be using rental POKéMON, too!$")).toBe(true);
    expect(silverFirstEncounter.events[2]).toMatchObject({
      label: "BattleFrontier_BattleFactoryBattleRoom_Text_ShakeOutKnowledgeBringItOn",
      raw: "Shake out every last bit of your\\nknowledge and bring it on!$",
      pageCount: 1,
    });
    expect(silverFirstEncounter.events).toHaveLength(4);

    expect(silverRepeat.events).toHaveLength(2);
    expect(silverRepeat.events[0]).toMatchObject({ label: "BattleFrontier_BattleFactoryBattleRoom_Text_ShakeOutKnowledgeBringItOn", pageCount: 1 });
    expect(silverRepeat.events[1]).toMatchObject({ kind: "call", label: "BattleFrontier_BattleFactoryBattleRoom_EventScript_DoNolandBattle" });
  });

  it("pins gold's 4-page first-encounter speech and its shorter repeat variant", () => {
    const { goldFirstEncounter, goldRepeat } = walkup.scenes;
    expect(goldFirstEncounter.events[0]).toMatchObject({
      kind: "message",
      label: "BattleFrontier_BattleFactoryBattleRoom_Text_HarderLookThanLastTime",
      pageCount: 4,
    });
    expect((goldFirstEncounter.events[0] as any).raw).toContain("NOLAND: Hey, hey! How's it going?");
    expect(goldFirstEncounter.events[2]).toMatchObject({
      label: "BattleFrontier_BattleFactoryBattleRoom_Text_AllRightBringItOn",
      raw: "All right!\\nBring it on!$",
      pageCount: 1,
    });
    expect(goldFirstEncounter.events).toHaveLength(4);

    expect(goldRepeat.events).toHaveLength(2);
    expect(goldRepeat.events[0]).toMatchObject({ label: "BattleFrontier_BattleFactoryBattleRoom_Text_AllRightBringItOn" });
  });

  it("reproduces the generated data byte-for-byte through --out-dir", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-brain-walkup-script-"));
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-brain-walkup-script.ts", "--out-dir", directory], { stdio: "pipe" });
    expect(readFileSync(join(directory, "factory-brain-walkup-script.json"))).toEqual(readFileSync("src/data/gen/factory-brain-walkup-script.json"));
  });
});
