// opl2: the engine's Open Level mode (src/engine/factoryLevelMode.ts, docs/opl2-open-level-engine.md). Level 50 stays the default and keeps
// its records' shape; Open Level deals from the Open Level set rows, drops the Level 50 high-tier guard and builds everything at level 100.
import { describe, expect, it } from "vitest";
import { FactorySession, OPEN_LEVEL_DEFAULT_DEAL_RNG_VALUE } from "../src/factorySession.ts";
import { createInitialState } from "../src/engine/core.ts";
import { calculateBeatUpMemberDamage } from "../src/engine/battleScriptBeatUpOpcode.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { generateFactoryBrainOpponent } from "../src/engine/factoryBrainOpponentGeneration.ts";
import {
  advanceFactoryLobbyAttendant,
  attendantAcceptsInput,
  createFactoryLobbyAttendantState,
  type FactoryLobbyAttendantState,
} from "../src/engine/factoryLobbyAttendant.ts";
import { generateFactoryOpponent } from "../src/engine/factoryOpponentGeneration.ts";
import { getFactoryRentalRange, getLevel50FactoryRentalRange } from "../src/engine/factoryRentalGeneration.ts";
import { generateFactoryRoundDeal } from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { carryForChallengeLevel, createInitialFactoryCarry, type FactoryCarry } from "../src/engine/factoryRoundChaining.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

const DEAL = { factoryWinStreak: 0, rentsCount: 0, playerTrainerId: 0, factorySymbolsCount: 0 as const, battleTowerLevel50WinStreak: 0 };

describe("opl2: Open Level generation", () => {
  it("deals the ROM's own Open Level draft from the ROM route's deal cursor (sets, trainer, level-100 stats)", () => {
    // ROM: oracle/bootstrap/factory.json with OPEN LEVEL chosen (one DOWN before tap 6, docs/opl1-open-level-rom.md), read at the draft:
    // rentalMons set ids, battle 1's trainer (trainerIds[0]) and the select screen's six records (level, maxHP, attack, defense, speed,
    // spAttack, spDefense). GenerateInitialRentalMons is entered with 0x08a74230 on that route, as on the Level 50 one.
    const rom = {
      setIds: [406, 381, 466, 438, 382, 430],
      trainerId: 63,
      stats: [
        [386, 287, 168, 188, 79, 168], [363, 124, 187, 127, 245, 160], [273, 352, 268, 190, 178, 230],
        [303, 198, 241, 106, 283, 201], [233, 331, 168, 232, 115, 128], [259, 144, 158, 271, 256, 208],
      ],
      experience: [1_000_000, 1_250_000, 1_250_000, 1_250_000, 1_640_000, 1_000_000],
    };
    const deal = generateFactoryRoundDeal({ ...DEAL, rngValue: OPEN_LEVEL_DEFAULT_DEAL_RNG_VALUE, lvlMode: "open" });
    expect(deal.rentals.rentals.map((r) => r.setId)).toEqual(rom.setIds);
    expect(deal.firstOpponent.trainerId).toBe(rom.trainerId);
    const members = deal.rentals.rentals.map((r) => createFactoryCorpusPartyMember(r));
    expect(members.map((m) => m.level)).toEqual([100, 100, 100, 100, 100, 100]);
    expect(members.map((m) => m.experience)).toEqual(rom.experience);
    expect(members.map((m) => [m.maxHP, m.attack, m.defense, m.speed, m.spAttack, m.spDefense])).toEqual(rom.stats);
    expect(deal.rentals.rentals.every((r) => r.fixedIv === 3)).toBe(true);
    // The first opponent at Open Level: level 100, sets from 372-467 (challenge 0).
    const opponents = (deal.firstOpponent.generation as ReturnType<typeof generateFactoryOpponent>).opponents;
    expect(opponents.map((o) => o.member.level)).toEqual([100, 100, 100]);
    expect(opponents.every((o) => o.setId >= 372 && o.setId <= 467)).toBe(true);
  });

  it("keeps Level 50 as it was: the anchor's six and trainer 50, records without a level field", () => {
    const deal = generateFactoryRoundDeal({ ...DEAL, rngValue: OPEN_LEVEL_DEFAULT_DEAL_RNG_VALUE });
    expect(deal.rentals.rentals.map((r) => r.setId)).toEqual([156, 149, 180, 153, 179, 181]);
    expect(deal.firstOpponent.trainerId).toBe(50);
    expect(deal.rentals.rentals.every((r) => !("level" in r))).toBe(true);
    expect(deal.rentals.rentals.map((r) => createFactoryCorpusPartyMember(r).level)).toEqual([50, 50, 50, 50, 50, 50]);
  });

  it("GetFactoryMonId's Open Level rows: 372-467 .. 660-755, then 372-881; the better range is the next row; challenge 7+ is row 7", () => {
    const open = (c: number, better: boolean) => { const r = getFactoryRentalRange(c, better, "open"); return [r.start, r.end]; };
    expect([0, 1, 2, 3, 4, 5, 6, 7, 20].map((c) => open(c, false))).toEqual([
      [372, 467], [468, 563], [564, 659], [660, 755], [372, 881], [372, 881], [372, 881], [372, 881], [372, 881],
    ]);
    expect([0, 1, 2, 3, 6, 7].map((c) => open(c, true))).toEqual([[468, 563], [564, 659], [660, 755], [372, 881], [372, 881], [372, 881]]);
    // Level 50 unchanged
    expect([0, 3, 6, 7].map((c) => { const r = getLevel50FactoryRentalRange(c, false); return [r.start, r.end]; }))
      .toEqual([[110, 199], [372, 467], [660, 755], [372, 849]]);
  });

  it("Open Level opponents and Noland may take sets above 849 (the high-tier guard is Level 50 only) and are level 100", () => {
    let rng = 0x1234_5678;
    let openHigh = 0;
    let brainHigh = 0;
    const saved = [372, 373, 374, 375, 376, 377];
    for (let i = 0; i < 300; i += 1) {
      rng = advanceRngValue(rng);
      const opp = generateFactoryOpponent({
        rngValue: rng, factoryWinStreak: 28, battleIndex: 0, storedTrainerIds: [], savedRentalSetIds: saved, playerTrainerId: 0,
        battleTowerLevel50WinStreak: 0, lvlMode: "open",
      });
      expect(opp.opponents.every((o) => o.member.level === 100 && o.setId >= 372 && o.setId <= 881)).toBe(true);
      openHigh += opp.opponents.filter((o) => o.setId > 849).length;
      const brain = generateFactoryBrainOpponent({ rngValue: rng, factoryWinStreak: 35, playerRentalSetIds: saved, playerTrainerId: 0, lvlMode: "open" });
      expect(brain.opponents.every((o) => o.member.level === 100)).toBe(true);
      brainHigh += brain.opponents.filter((o) => o.setId > 849).length;
    }
    expect(openHigh).toBeGreaterThan(0);
    expect(brainHigh).toBeGreaterThan(0);
  });
});

describe("opl2: per-level carry (factoryWinStreaks / factoryRentsCount / win-streak-active per level)", () => {
  const won = (carry: FactoryCarry, streak: number, rents: number): FactoryCarry => Object.freeze({ ...carry, factoryWinStreak: streak, rentsCount: rents });

  it("the same level continues when its flag is set, restarts when it is not", () => {
    const open = won(createInitialFactoryCarry(7, undefined, "open"), 7, 3);
    expect(carryForChallengeLevel(open, "open", true)).toBe(open);
    expect(carryForChallengeLevel(open, "open", false)).toMatchObject({ lvlMode: "open", factoryWinStreak: 0, rentsCount: 0 });
  });

  it("switching level keeps the left level's slots and brings the other's in only while it is active; symbols and BP are shared", () => {
    const lv50 = Object.freeze({ ...won(createInitialFactoryCarry(7), 14, 5), factorySymbolsCount: 1 as const, battlePoints: 20 });
    const toOpen = carryForChallengeLevel(lv50, "open", true);
    expect(toOpen).toMatchObject({ lvlMode: "open", factoryWinStreak: 0, rentsCount: 0, factorySymbolsCount: 1, battlePoints: 20 });
    expect(toOpen.otherLevel).toEqual({ factoryWinStreak: 14, rentsCount: 5, active: true });
    // Open is lost: its flag is cleared; back at Level 50 the Level 50 streak continues (its flag was never cleared).
    const backTo50 = carryForChallengeLevel(won(toOpen, 0, 0), "50", false);
    expect(backTo50).toMatchObject({ factoryWinStreak: 14, rentsCount: 5, factorySymbolsCount: 1, battlePoints: 20 });
    expect("lvlMode" in backTo50).toBe(false);
    expect(backTo50.otherLevel).toEqual({ factoryWinStreak: 0, rentsCount: 0, active: false });
    // An inactive other level starts at 0.
    expect(carryForChallengeLevel(backTo50, "open", true)).toMatchObject({ lvlMode: "open", factoryWinStreak: 0, rentsCount: 0 });
  });

  it("a Level 50 carry keeps its old shape", () => {
    const carry = createInitialFactoryCarry(7);
    expect(Object.keys(carry).sort()).toEqual(["battlePoints", "factorySymbolsCount", "factoryWinStreak", "playerTrainerId", "rentsCount"]);
    expect(carryForChallengeLevel(carry, "50", false)).toEqual(carry);
  });
});

describe("opl2: the Lobby's OPEN LEVEL", () => {
  function atLevelMenu(state: FactoryLobbyAttendantState): FactoryLobbyAttendantState {
    let s = state;
    const idle = { a: false, b: false, up: false, down: false };
    for (let i = 0; i < 4000 && !(s.screen === "level" && attendantAcceptsInput(s)); i += 1) {
      s = advanceFactoryLobbyAttendant(s, attendantAcceptsInput(s) && s.screen !== "level" ? { ...idle, a: true } : idle);
    }
    expect(s.screen).toBe("level");
    return s;
  }
  function choose(state: FactoryLobbyAttendantState): FactoryLobbyAttendantState {
    const idle = { a: false, b: false, up: false, down: false };
    let s = advanceFactoryLobbyAttendant(state, { ...idle, down: true });
    s = advanceFactoryLobbyAttendant(s, idle);
    expect(s.cursor).toBe(1);
    return advanceFactoryLobbyAttendant(s, { ...idle, a: true });
  }

  it("A on OPEN LEVEL does nothing without the option (the Level 50-only game)", () => {
    const s = choose(atLevelMenu(createFactoryLobbyAttendantState(0)));
    expect(s.screen).toBe("level");
    expect(s.chosenLevel).toBeUndefined();
  });

  it("with the option it asks to save, as LV. 50 does, and remembers the choice", () => {
    const s = choose(atLevelMenu(createFactoryLobbyAttendantState(0, { openLevel: true })));
    expect(s.screen).toBe("saveQuestion");
    expect(s.chosenLevel).toBe("open");
  });
});

describe("opl2: the session option", () => {
  it("level open: a level-100 Open Level draft; no seed deals from the ROM route's deal cursor", () => {
    const session = new FactorySession({ battleScene: "off", level: "open" });
    expect(session.state.factoryCarry.lvlMode).toBe("open");
    expect(session.state.openLevel).toBe(true);
    expect(session.state.pendingGeneratedRound?.rngValueBefore).toBe(OPEN_LEVEL_DEFAULT_DEAL_RNG_VALUE);
    const rentals = session.state.draftScreen.rentals;
    expect(rentals.map((r) => r.source.setId)).toEqual([406, 381, 466, 438, 382, 430]);
    // the draft's summary pages show the level-100 Pokemon
    expect(rentals.map((r) => r.level)).toEqual([100, 100, 100, 100, 100, 100]);
  });

  it("the default is the Level 50 game, unchanged", () => {
    const session = new FactorySession({ battleScene: "off" });
    expect(session.state).toEqual(createInitialState({ battleScene: "off" }));
    expect("openLevel" in session.state).toBe(false);
    expect(() => new FactorySession({ battleScene: "off", level: "open", openLevel: false })).toThrow(/openLevel/);
  });
});

describe("opl2: Beat Up reads the member's own level", () => {
  it("level 100 uses 100 * 2 / 5 + 2 = 42 (Cmd_trydobeatup, battle_script_commands.c:8990); the default stays level 50", () => {
    // SNEASEL (base Attack 95) into CROBAT (base Defense 80), power 10
    expect(calculateBeatUpMemberDamage(215, 169, 10, false)).toBe(Math.trunc(Math.trunc(95 * 10 * 22 / 80) / 50) + 2);
    expect(calculateBeatUpMemberDamage(215, 169, 10, false, 100)).toBe(Math.trunc(Math.trunc(95 * 10 * 42 / 80) / 50) + 2);
  });
});

describe("opl2: what Open Level adds to the move corpus", () => {
  it("the Open Level reachable moves are Level 50's plus OUTRAGE, in the EFFECT_RAMPAGE family Level 50 already reaches (THRASH, PETAL DANCE)", async () => {
    const topology = (await import("../src/data/gen/battle-script-topology.json", { with: { type: "json" } })).default as unknown as {
      counts: Record<string, number>;
      level50FactoryReachableEffects: { effect: string; moves: { move: string }[] }[];
      openLevelFactoryReachableEffects: { effect: string; moves: { move: string }[] }[];
    };
    const moves = (families: { moves: { move: string }[] }[]) => new Set(families.flatMap((f) => f.moves.map((m) => m.move)));
    const level50 = moves(topology.level50FactoryReachableEffects);
    const open = moves(topology.openLevelFactoryReachableEffects);
    expect([...open].filter((m) => !level50.has(m))).toEqual(["MOVE_OUTRAGE"]);
    expect([...level50].every((m) => open.has(m))).toBe(true);
    expect(topology.openLevelFactoryReachableEffects.map((f) => f.effect)).toEqual(topology.level50FactoryReachableEffects.map((f) => f.effect));
    expect(topology.openLevelFactoryReachableEffects.find((f) => f.effect === "EFFECT_RAMPAGE")!.moves.map((m) => m.move))
      .toEqual(["MOVE_THRASH", "MOVE_PETAL_DANCE", "MOVE_OUTRAGE"]);
    expect(topology.counts.openLevelFactoryReachableMoves).toBe(topology.counts.level50FactoryReachableMoves + 1);
  });
});

describe("opl2: the Open Level PreBattleRoom walk goes right", () => {
  it("is the Level 50 walk mirrored (ROM-probed rows: originX 32 - x, guide x 224 - x), east pictures flipped, the same 80 ticks", async () => {
    const { walkVisual, WALK_TICKS } = await import("../src/engine/prebattleRoom.ts");
    let playerFlips = 0;
    let guideFlips = 0;
    for (let e = 0; e < WALK_TICKS; e += 1) {
      const lv50 = walkVisual(e);
      const open = walkVisual(e, false, true);
      expect(open.originX).toBe(32 - lv50.originX);
      expect(open.originY).toBe(lv50.originY);
      expect(open.attendantX).toBe(224 - lv50.attendantX);
      expect([open.attendantY, open.attendantVisible, open.playerFrame, open.attendantFrame])
        .toEqual([lv50.attendantY, lv50.attendantVisible, lv50.playerFrame, lv50.attendantFrame]);
      expect("playerHFlip" in lv50 || "attendantHFlip" in lv50).toBe(false);
      if (open.playerHFlip) playerFlips += 1;
      if (open.attendantHFlip) guideFlips += 1;
      // the guide walks right in rows 0-31, the player in rows 16-47 (walk_up first)
      expect(open.attendantHFlip === true).toBe(e < 32);
      expect(open.playerHFlip === true).toBe(e >= 16 && e < 48);
    }
    expect([playerFlips, guideFlips]).toEqual([32, 32]);
    expect(walkVisual(200, false, true)).toEqual(walkVisual(WALK_TICKS - 1, false, true));
  });
});
