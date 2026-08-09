import { describe, expect, it } from "vitest";
import controlFixture from "../tools/battle-lab/gate6-r2-hail-control-off.json" with { type: "json" };
import digFixture from "../tools/battle-lab/gate6-r2-hail-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/gate6-r2-off.json" with { type: "json" };

const HAIL = 1 << 7;
const UNDERGROUND = 1 << 7;

function assertCompleteLegalParty(
  fixture: typeof digFixture | typeof controlFixture,
): void {
  expect(fixture).toMatchObject({
    schemaVersion: 1,
    mode: "mechanicLab",
    profile: "battle-scene-off",
    level: 50,
    seed: 1,
  });
  expect(Object.keys(fixture.overrides)).toEqual(["parties"]);
  for (const side of [fixture.overrides.parties.player, fixture.overrides.parties.opponent]) {
    expect(side).toHaveLength(3);
    for (const mon of side) {
      expect(mon.level).toBe(50);
      expect(Object.keys(mon.ivs)).toHaveLength(6);
      expect(Object.keys(mon.evs)).toHaveLength(6);
      expect(mon.moves).toHaveLength(4);
      expect(mon.ppUps).toHaveLength(4);
      expect(mon).toHaveProperty("nature");
      expect(mon).toHaveProperty("item");
      expect(mon).toHaveProperty("abilitySlot");
      expect(mon).toHaveProperty("friendship");
      expect(mon).toHaveProperty("gender");
      expect(mon).toHaveProperty("shiny");
    }
  }
}

describe("Gate-6 R2 compact OFF-profile semantic receipt", () => {
  it("uses two complete legal parties and ordinary controller input rather than staged weather or volatile state", () => {
    assertCompleteLegalParty(digFixture);
    assertCompleteLegalParty(controlFixture);
    expect(digFixture.overrides.parties.player[0]).toMatchObject({
      species: 51,
      moves: [91, 91, 91, 91],
    });
    expect(controlFixture.overrides.parties.player[0]).toMatchObject({
      species: 51,
      moves: [45, 45, 45, 45],
    });
    for (const fixture of [digFixture, controlFixture]) {
      expect(fixture.overrides.parties.opponent[0]).toMatchObject({
        species: 144,
        moves: [258, 258, 258, 258],
      });
    }
    expect(digFixture.trace.segments).toEqual([
      { frames: 2, buttons: ["A"] },
      { frames: 30, buttons: [] },
      { frames: 2, buttons: ["A"] },
      { frames: 1400, buttons: [] },
    ]);
    expect(controlFixture.trace.segments).toEqual([
      { frames: 2, buttons: ["A"] },
      { frames: 30, buttons: [] },
      { frames: 2, buttons: ["A"] },
      { frames: 800, buttons: [] },
      { frames: 2, buttons: ["A"] },
      { frames: 30, buttons: [] },
      { frames: 2, buttons: ["A"] },
      { frames: 800, buttons: [] },
    ]);
  });

  it("pins two fresh byte-identical lab runs and two wrapper-validated compact probes", () => {
    expect(receipt).toMatchObject({
      schema: "gate6-r2-off-semantic-receipt/v1",
      cardId: "R2",
      oracleProfile: "battle-scene-off",
      sampledEveryTraceFrame: true,
    });
    expect(receipt.determinism).toEqual({
      freshRunCount: 2,
      artifactsCompared: [
        "gate6-r2-hail-off: manifest.json",
        "gate6-r2-hail-off: frame-*.png sorted by basename",
        "gate6-r2-hail-control-off: manifest.json",
        "gate6-r2-hail-control-off: frame-*.png sorted by basename",
        "tools/run-mgba-probe.py compact semantic JSON",
      ],
      ignoredNondeterministicPaths: [],
      temporaryOutputDirectoryPrefixesExcludedFromPathNames: true,
      digManifestSha256: "25925ff99b87e26cec4015d39cfa73cc3dd4a3471f444fb6b9c4cbade8d87aa2",
      digCapturePngBasenameSha256: "4b5126094f080961b04f55348a73f3bb02481f86021d3d724b753b80b114690d",
      groundedControlManifestSha256: "944bf8344af23b31f4c97391141240946178548580b2b770d39d45b2c869a356",
      groundedControlCapturePngBasenameSha256: "34b4ad1a884be3f6f96fd9f2109f473ded3a944d6e87188b9c2485027a28bd44",
      compactSemanticReceiptSha256: "78ced100a8cfdd09b8f8ca130aff4754da62d2c3593e88298966421cf217384b",
      byteIdentical: true,
    });
  });

  it("records Hail's underground immunity, post-surface floor(maxHP/16) chip, ordered message/controller work, and RNG", () => {
    const dig = receipt.scenarios.dig;
    const control = receipt.scenarios.groundedControl;
    expect(dig).toMatchObject({
      fixture: "tools/battle-lab/gate6-r2-hail-off.json",
      seed: 1,
      parties: {
        playerLead: { species: 51, item: 0, abilitySlot: 0, ability: 8, moves: [91, 91, 91, 91] },
        opponentLead: { species: 144, item: 0, abilitySlot: 0, ability: 46, moves: [258, 258, 258, 258] },
      },
    });
    expect(control).toMatchObject({
      fixture: "tools/battle-lab/gate6-r2-hail-control-off.json",
      seed: 1,
      parties: {
        playerLead: { species: 51, item: 0, abilitySlot: 0, ability: 8, moves: [45, 45, 45, 45] },
        opponentLead: { species: 144, item: 0, abilitySlot: 0, ability: 46, moves: [258, 258, 258, 258] },
      },
    });

    const { undergroundEntry, hailActivated, undergroundWeatherPass, surfaceExit, surfaceWeatherPass, surfaceChip } = dig.checkpoints;
    expect(undergroundEntry).toMatchObject({
      frame: 177,
      rngValue: 1621732966,
      weather: 0,
      weatherTurns: 0,
      currentMove: 91,
      battleMoveDamage: 128,
      player: { hp: 142, maxHp: 142, status3: UNDERGROUND, underground: true },
    });
    expect(hailActivated).toMatchObject({
      frame: 213,
      weather: HAIL,
      weatherTurns: 5,
      currentMove: 258,
      player: { hp: 142, status3: UNDERGROUND, underground: true },
    });
    expect(undergroundWeatherPass).toMatchObject({
      frame: 352,
      weather: HAIL,
      weatherTurns: 4,
      battleMoveDamage: 0,
      player: { hp: 142, status3: UNDERGROUND, underground: true },
    });
    expect(surfaceExit).toMatchObject({
      frame: 478,
      rngValue: 3278432283,
      weather: HAIL,
      weatherTurns: 4,
      currentMove: 91,
      player: { hp: 142, status3: 0, underground: false },
    });
    expect(surfaceWeatherPass).toMatchObject({
      frame: 811,
      rngValue: 1530931116,
      weather: HAIL,
      weatherTurns: 3,
      battleMoveDamage: 0,
      player: { hp: 142, status3: 0, underground: false },
    });
    expect(surfaceChip).toMatchObject({
      frame: 1043,
      rngValue: 1530931116,
      weather: HAIL,
      weatherTurns: 3,
      battleMoveDamage: 8,
      player: { hp: 134, maxHp: 142, status3: 0, underground: false },
    });
    expect(surfaceWeatherPass.player.hp - surfaceChip.player.hp).toBe(
      Math.floor(surfaceChip.player.maxHp / 16),
    );

    const { firstWeatherPass, firstChip, secondWeatherPass, secondChip } = control.checkpoints;
    expect(control.checkpoints.hailActivated).toMatchObject({
      frame: 308,
      rngValue: 2756097505,
      weather: HAIL,
      weatherTurns: 5,
      player: { hp: 142, status3: 0, underground: false },
    });
    expect(firstWeatherPass).toMatchObject({
      frame: 447,
      weather: HAIL,
      weatherTurns: 4,
      battleMoveDamage: 0,
      player: { hp: 142, status3: 0, underground: false },
    });
    expect(firstChip).toMatchObject({
      frame: 679,
      weather: HAIL,
      weatherTurns: 4,
      battleMoveDamage: 8,
      player: { hp: 134, maxHp: 142, status3: 0, underground: false },
    });
    expect(secondWeatherPass).toMatchObject({
      frame: 1276,
      rngValue: 2319805938,
      weather: HAIL,
      weatherTurns: 3,
      battleMoveDamage: 0,
      player: { hp: 134, status3: 0, underground: false },
    });
    expect(secondChip).toMatchObject({
      frame: 1508,
      weather: HAIL,
      weatherTurns: 3,
      battleMoveDamage: 8,
      player: { hp: 126, maxHp: 142, status3: 0, underground: false },
    });
    expect(firstWeatherPass.player.hp - firstChip.player.hp).toBe(Math.floor(firstChip.player.maxHp / 16));
    expect(secondWeatherPass.player.hp - secondChip.player.hp).toBe(Math.floor(secondChip.player.maxHp / 16));

    expect(dig.messageEvents.map(({ frame, text }) => [frame, text])).toEqual([
      [91, "DUGTRIO dug a hole!"],
      [188, "Foe ARTICUNO used\nHAIL!"],
      [250, "It started to hail!"],
      [353, "Hail continues to fall."],
      [480, "DUGTRIO used\nDIG!"],
      [652, "Foe ARTICUNO used\nHAIL!"],
      [714, "But it failed!"],
      [812, "Hail continues to fall."],
      [906, "DUGTRIO is pelted\nby HAIL!"],
    ]);
    expect(control.messageEvents.map(({ frame, text }) => [frame, text])).toEqual([
      [45, "DUGTRIO used\nGROWL!"],
      [181, "Foe ARTICUNO’s ATTACK\nfell!"],
      [283, "Foe ARTICUNO used\nHAIL!"],
      [345, "It started to hail!"],
      [448, "Hail continues to fall."],
      [542, "DUGTRIO is pelted\nby HAIL!"],
      [879, "DUGTRIO used\nGROWL!"],
      [1015, "Foe ARTICUNO’s ATTACK\nfell!"],
      [1117, "Foe ARTICUNO used\nHAIL!"],
      [1179, "But it failed!"],
      [1277, "Hail continues to fall."],
      [1371, "DUGTRIO is pelted\nby HAIL!"],
    ]);
    expect(dig.controllerEvents).toEqual([
      { frame: 91, kind: "message-print", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 53 },
      { frame: 188, kind: "message-print", activeBattler: 2, execFlags: 2, playerCommand: 51, opponentCommand: 16 },
      { frame: 250, kind: "message-print", activeBattler: 2, execFlags: 2, playerCommand: 51, opponentCommand: 16 },
      { frame: 353, kind: "message-print", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 51 },
      { frame: 480, kind: "message-print", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 53 },
      { frame: 652, kind: "message-print", activeBattler: 2, execFlags: 2, playerCommand: 51, opponentCommand: 16 },
      { frame: 714, kind: "message-print", activeBattler: 2, execFlags: 2, playerCommand: 51, opponentCommand: 16 },
      { frame: 812, kind: "message-print", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 51 },
      { frame: 906, kind: "message-print", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 51 },
    ]);
    expect(control.controllerEvents).toEqual([
      { frame: 45, kind: "message-print", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 53 },
      { frame: 181, kind: "message-print", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 52 },
      { frame: 283, kind: "message-print", activeBattler: 2, execFlags: 2, playerCommand: 51, opponentCommand: 16 },
      { frame: 345, kind: "message-print", activeBattler: 2, execFlags: 2, playerCommand: 51, opponentCommand: 16 },
      { frame: 448, kind: "message-print", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 51 },
      { frame: 542, kind: "message-print", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 51 },
      { frame: 879, kind: "message-print", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 53 },
      { frame: 1015, kind: "message-print", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 52 },
      { frame: 1117, kind: "message-print", activeBattler: 2, execFlags: 2, playerCommand: 51, opponentCommand: 16 },
      { frame: 1179, kind: "message-print", activeBattler: 2, execFlags: 2, playerCommand: 51, opponentCommand: 16 },
      { frame: 1277, kind: "message-print", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 51 },
      { frame: 1371, kind: "message-print", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 51 },
    ]);
    for (const scenario of [dig, control]) {
      expect(scenario.controllerEvents.map(({ frame }) => frame)).toEqual(
        scenario.messageEvents.map(({ frame }) => frame),
      );
      for (const event of scenario.controllerEvents) {
        expect(event).toMatchObject({ kind: "message-print", activeBattler: 2 });
        expect(event.execFlags).toBeGreaterThan(0);
      }
    }

    expect(dig.rngLedger).toEqual([
      { frame: 459, randomCalls: 1, rngBefore: 1621732966, rngAfter: 2756097505, currentMove: 0, chosenMoveByBattler: [0, 0] },
      { frame: 463, randomCalls: 9, rngBefore: 2756097505, rngAfter: 1160559944, currentMove: 0, chosenMoveByBattler: [0, 0] },
      { frame: 477, randomCalls: 1, rngBefore: 1160559944, rngAfter: 3278432283, currentMove: 91, chosenMoveByBattler: [0, 258] },
      { frame: 499, randomCalls: 1, rngBefore: 3278432283, rngAfter: 2319805938, currentMove: 91, chosenMoveByBattler: [0, 258] },
      { frame: 502, randomCalls: 1, rngBefore: 2319805938, rngAfter: 2184965245, currentMove: 91, chosenMoveByBattler: [0, 258] },
      { frame: 641, randomCalls: 1, rngBefore: 2184965245, rngAfter: 1530931116, currentMove: 91, chosenMoveByBattler: [0, 258] },
      { frame: 1058, randomCalls: 1, rngBefore: 1530931116, rngAfter: 3245321391, currentMove: 0, chosenMoveByBattler: [0, 0] },
      { frame: 1064, randomCalls: 9, rngBefore: 3245321391, rngAfter: 1038309310, currentMove: 0, chosenMoveByBattler: [0, 0] },
    ]);
    expect(control.rngLedger).toEqual([
      { frame: 44, randomCalls: 1, rngBefore: 1621732966, rngAfter: 2756097505, currentMove: 45, chosenMoveByBattler: [45, 258] },
      { frame: 694, randomCalls: 1, rngBefore: 2756097505, rngAfter: 1250713408, currentMove: 0, chosenMoveByBattler: [0, 0] },
      { frame: 700, randomCalls: 9, rngBefore: 1250713408, rngAfter: 3278432283, currentMove: 0, chosenMoveByBattler: [0, 0] },
      { frame: 878, randomCalls: 1, rngBefore: 3278432283, rngAfter: 2319805938, currentMove: 45, chosenMoveByBattler: [45, 258] },
      { frame: 1523, randomCalls: 1, rngBefore: 2319805938, rngAfter: 2184965245, currentMove: 0, chosenMoveByBattler: [0, 0] },
      { frame: 1529, randomCalls: 9, rngBefore: 2184965245, rngAfter: 1630250804, currentMove: 0, chosenMoveByBattler: [0, 0] },
    ]);
    expect(dig.final).toMatchObject({
      rngValue: 1038309310,
      weather: HAIL,
      weatherTurns: 3,
      player: { hp: 134, maxHp: 142, status3: 0, underground: false },
    });
    expect(control.final).toMatchObject({
      rngValue: 1630250804,
      weather: HAIL,
      weatherTurns: 3,
      player: { hp: 126, maxHp: 142, status3: 0, underground: false },
    });
  });
});
