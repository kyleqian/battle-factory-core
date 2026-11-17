// hpd1 (docs/hpd1-hp-hold.md): the ordinary foe-hit `hp` command has no 28-frame floor: bar frames + 1 + the script rows to the next presented event.
// ROM: 20 fixed-damage windows (damage 10..90, shapes a / c, Scene ON and OFF). Hermetic: ROM receipts from the fixture, the model through production.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import speciesTypes from "../src/data/gen/species-types.json" with { type: "json" };
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { projectBattleResolutionCommands } from "../src/engine/battleResolutionPresentation.ts";
import { battleResolutionCommandDuration } from "../src/engine/battleResolutionPresentationRender.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../src/engine/battleScriptSourceConstants.ts";

type Case = { case: string; scene: "on" | "off"; shape: "a" | "c"; playerLevel: number; moveId: number; foeLevel: number; damage: number;
  rom: { barStart: number; barEnd: number; boxChange: number; menu: number } };
const cases = (JSON.parse(readFileSync("tools/integration/fixtures/hpd1/rom-holds.json", "utf8")) as { cases: Case[] }).cases;

const battler = (level: number, moveId: number, speed: number, hp: number) => {
  const entry = speciesTypes.species[18]!;
  return { species: 19, moveId, moves: [moveId, moveId, moveId, moveId], ability: 0, item: 0, personality: 0, attack: 100, defense: 100, spAttack: 100,
    spDefense: 100, speed, hp, maxHp: hp, level, types: [entry.types[0], entry.types[1]] as const };
};

// Player (L playerLevel) hits the foe (201 HP, Lv foeLevel); shape c: the foe moves first (Defense Curl) and the hit ends the turn; shape a: the foe's Tackle follows.
function production(c: Case) {
  let state = createFactoryFullTurnBattleState({
    requestId: 1, rngSeed: 305419897,
    player: battler(c.playerLevel, c.moveId, c.shape === "c" ? 40 : 120, 201), trainer: battler(c.foeLevel, c.shape === "c" ? 111 : 33, c.shape === "c" ? 120 : 40, 201),
  } as never);
  if (c.scene === "off") {
    const rulesContext = { ...state.rules.rulesContext, hitMarker: (state.rules.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) >>> 0 };
    state = { ...state, rules: { ...state.rules, rulesContext } } as typeof state;
  }
  const before = state.rules.rulesContext;
  const submit = (s: any, requestId: number, side: "player" | "trainer", foe: 0 | 1) => {
    try {
      return submitFactoryFullTurnDecision(s, { requestId, side, decision: { kind: "use-move", moveSlot: 0, targetBattler: foe } as never });
    } catch {
      return submitFactoryFullTurnDecision(s, { requestId, side, decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 - foe } as never });
    }
  };
  const a = submit(state, 1, "player", 1);
  const b = submit(a.state, 2, "trainer", 0);
  const make = (index: 0 | 1, level: number, moveId: number) => Object.freeze({
    species: 19, name: "RATTATA", side: index === 0 ? "player" as const : "trainer" as const, battler: index, partyIndex: 0 as const, level,
    hp: before.battlers[index].hp, maxHP: 201, gender: "male", status: "none" as const, moveIds: [moveId, moveId, moveId, moveId], currentPP: [10, 10, 10, 10] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, c.playerLevel, c.moveId), opponent: make(1, c.foeLevel, c.shape === "c" ? 111 : 33) }) as never;
  const commands = projectBattleResolutionCommands(b.events as never, before, b.state.rules.rulesContext, field, null);
  return { commands: commands as readonly any[], field };
}

describe("hpd1: ROM post-hit hold over 20 fixed-damage windows", () => {
  it("ROM: drain start -> next text-box change is damage + a per-shape constant (c 17, a 18), the same in both scenes (no floor, no bar-size term)", () => {
    for (const shape of ["a", "c"] as const) {
      const rows = cases.filter((c) => c.shape === shape);
      expect(new Set(rows.map((c) => c.damage)).size).toBeGreaterThanOrEqual(4);
      for (const c of rows) expect([c.case, c.scene, c.rom.boxChange - c.rom.barStart - c.damage]).toEqual([c.case, c.scene, shape === "c" ? 17 : 18]);
    }
    expect(cases.filter((c) => c.shape === "c").map((c) => c.rom.menu - c.rom.boxChange)).toEqual(Array(12).fill(8));
  });

  it("model: the hp command is bar + 1 + tail (c: tail 7 = rows datahpupdate -> first MoveEnd receipt; a: tail 1), floor-free for every damage, both scenes", () => {
    for (const c of cases) {
      const { commands, field } = production(c);
      const i = commands.findIndex((command) => command.type === "hp" && command.battler === 1);
      expect(i, c.case).toBeGreaterThan(0);
      const hp = commands[i]!;
      expect(hp.from - hp.to, c.case).toBe(c.damage);
      expect(hp.timing, c.case).toEqual({ minimumFrames: 0, tailFrames: c.shape === "c" ? 7 : 1 });
      expect(battleResolutionCommandDuration(hp, field), `${c.case}-${c.scene}`).toBe(c.damage + 1 + (c.shape === "c" ? 7 : 1));
    }
  });

  it("model: hit start -> turn end is damage + 18 (shape c), so ROM drain start -> action menu minus ours is one constant 7 for all six damages in both scenes", () => {
    const diffs = new Set<number>();
    for (const c of cases.filter((x) => x.shape === "c")) {
      const { commands, field } = production(c);
      const i = commands.findIndex((command) => command.type === "hp" && command.battler === 1);
      const ours = commands.slice(i).reduce((sum, command) => sum + battleResolutionCommandDuration(command, field), 0);
      expect(ours, c.case).toBe(c.damage + 18);
      diffs.add(c.rom.menu - c.rom.barStart - ours);
    }
    expect([...diffs]).toEqual([7]);
  });

  it("a hit on the player (no ROM window yet: the off108 Rest anchor moves -3 -> -14 without the floor) keeps the legacy 28-frame floor", () => {
    const { commands } = production(cases.find((c) => c.shape === "a")!);
    const onPlayer = commands.find((command) => command.type === "hp" && command.battler === 0);
    expect(onPlayer?.timing).toEqual({ minimumFrames: 28 });
  });
});
