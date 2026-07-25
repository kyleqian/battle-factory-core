import { describe, expect, it } from "vitest";
import type { BattleMon, BattleParty } from "../src/engine/battleScenario.ts";
import {
  deriveBattleResolutionFromTerminalBoundary,
  mapStatus1ToBattleStatus,
  mapTerminalOutcomeToResolutionOutcome,
  type BattleResolutionTerminalRulesSlice,
} from "../src/engine/battleResolutionAdapter.ts";
import type { BattleScriptPartyState } from "../src/engine/battleScriptRulesContext.ts";

const STATUS1_SLEEP = 3; // 3 turns remaining, within the 3-bit sleep-turn mask.
const STATUS1_POISON = 1 << 3;
const STATUS1_BURN = 1 << 4;
const STATUS1_FREEZE = 1 << 5;
const STATUS1_PARALYSIS = 1 << 6;
const STATUS1_TOXIC_POISON = 1 << 7;

function mon(id: string, hp = 100, status: BattleMon["status"] = "none"): BattleMon {
  return { id, species: id.toUpperCase(), maxHp: 100, hp, status };
}

function party(prefix: string): BattleParty {
  return [mon(`${prefix}-0`), mon(`${prefix}-1`), mon(`${prefix}-2`)];
}

function partySlice(hps: readonly [number, number, number, number, number, number]): BattleScriptPartyState {
  return hps.map((hp) => ({ species: 1, isEgg: false, hp })) as unknown as BattleScriptPartyState;
}

function rulesSlice(overrides: Partial<BattleResolutionTerminalRulesSlice> = {}): BattleResolutionTerminalRulesSlice {
  return {
    battlers: [
      { side: 0, partyIndex: 0, status1: 0 },
      { side: 1, partyIndex: 0, status1: 0 },
    ],
    battleTopology: { battlersCount: 2 },
    party: {
      player: partySlice([100, 0, 0, 0, 0, 0]),
      opponent: partySlice([100, 0, 0, 0, 0, 0]),
    },
    ...overrides,
  };
}

describe("mapTerminalOutcomeToResolutionOutcome", () => {
  it("maps player-win to win", () => {
    expect(mapTerminalOutcomeToResolutionOutcome("player-win")).toBe("win");
  });

  it("maps trainer-win to loss", () => {
    expect(mapTerminalOutcomeToResolutionOutcome("trainer-win")).toBe("loss");
  });

  it(
    "maps draw to loss -- the Factory battle-room script has exactly one case (WON); "
      + "LOST and DREW both warp to the identical lost-challenge branch "
      + "(docs/battle-resolution-adapter-ground-truth.md §4)",
    () => {
      expect(mapTerminalOutcomeToResolutionOutcome("draw")).toBe("loss");
    },
  );
});

describe("mapStatus1ToBattleStatus", () => {
  it("maps 0 to none", () => {
    expect(mapStatus1ToBattleStatus(0)).toBe("none");
  });

  it("maps every STATUS1_* bit to its BattleStatus vocabulary entry", () => {
    expect(mapStatus1ToBattleStatus(STATUS1_SLEEP)).toBe("sleep");
    expect(mapStatus1ToBattleStatus(STATUS1_POISON)).toBe("poison");
    expect(mapStatus1ToBattleStatus(STATUS1_BURN)).toBe("burn");
    expect(mapStatus1ToBattleStatus(STATUS1_FREEZE)).toBe("freeze");
    expect(mapStatus1ToBattleStatus(STATUS1_PARALYSIS)).toBe("paralysis");
    expect(mapStatus1ToBattleStatus(STATUS1_TOXIC_POISON)).toBe("toxic");
  });

  it("prefers toxic over plain poison (GetAilmentFromStatus's STATUS1_PSN_ANY collapses these; BattleStatus keeps them distinct)", () => {
    expect(mapStatus1ToBattleStatus(STATUS1_TOXIC_POISON | STATUS1_POISON)).toBe("toxic");
  });
});

describe("deriveBattleResolutionFromTerminalBoundary", () => {
  it("carries id/species/maxHp forward from the pre-battle snapshot unchanged", () => {
    const resolution = deriveBattleResolutionFromTerminalBoundary({
      rngValue: 42,
      outcome: "player-win",
      rulesContext: rulesSlice(),
      preBattlePlayerParty: party("player"),
      preBattleOpponentParty: party("foe"),
    });
    resolution.playerParty.forEach((member, index) => {
      expect(member.id).toBe(`player-${index}`);
      expect(member.species).toBe(`PLAYER-${index}`);
      expect(member.maxHp).toBe(100);
    });
  });

  it("overlays hp from the kernel party slice, not the pre-battle snapshot", () => {
    const resolution = deriveBattleResolutionFromTerminalBoundary({
      rngValue: 1,
      outcome: "player-win",
      rulesContext: rulesSlice({
        party: {
          player: partySlice([55, 0, 80, 0, 0, 0]),
          opponent: partySlice([0, 0, 0, 0, 0, 0]),
        },
      }),
      preBattlePlayerParty: party("player"),
      preBattleOpponentParty: party("foe"),
    });
    expect(resolution.playerParty.map((member) => member.hp)).toEqual([55, 0, 80]);
  });

  it("maps a fainted slot (hp 0) to status none regardless of prior status or an active battler's status1", () => {
    const resolution = deriveBattleResolutionFromTerminalBoundary({
      rngValue: 1,
      outcome: "player-win",
      rulesContext: rulesSlice({
        battlers: [
          { side: 0, partyIndex: 0, status1: STATUS1_BURN },
          { side: 1, partyIndex: 0, status1: 0 },
        ],
        party: {
          player: partySlice([0, 0, 0, 0, 0, 0]),
          opponent: partySlice([0, 0, 0, 0, 0, 0]),
        },
      }),
      preBattlePlayerParty: [mon("player-0", 100, "toxic"), mon("player-1"), mon("player-2")],
      preBattleOpponentParty: party("foe"),
    });
    expect(resolution.playerParty[0]).toMatchObject({ hp: 0, status: "none" });
  });

  it("maps the slot mirrored by a live battler to that battler's real status1", () => {
    const resolution = deriveBattleResolutionFromTerminalBoundary({
      rngValue: 1,
      outcome: "player-win",
      rulesContext: rulesSlice({
        battlers: [
          { side: 0, partyIndex: 0, status1: STATUS1_PARALYSIS },
          { side: 1, partyIndex: 2, status1: 0 },
        ],
        party: {
          player: partySlice([70, 0, 0, 0, 0, 0]),
          opponent: partySlice([0, 0, 90, 0, 0, 0]),
        },
      }),
      preBattlePlayerParty: [mon("player-0", 100, "none"), mon("player-1"), mon("player-2")],
      preBattleOpponentParty: [mon("foe-0"), mon("foe-1"), mon("foe-2", 100, "burn")],
    });
    expect(resolution.playerParty[0]).toMatchObject({ hp: 70, status: "paralysis" });
    expect(resolution.opponentParty[2]).toMatchObject({ hp: 90, status: "none" });
  });

  it(
    "keeps a benched (not fainted, not battler-active) slot at its pre-battle status -- the kernel's "
      + "party slice tracks only species/isEgg/hp, not bench status (battleScriptRulesContext.ts:233-237)",
    () => {
      const resolution = deriveBattleResolutionFromTerminalBoundary({
        rngValue: 1,
        outcome: "player-win",
        rulesContext: rulesSlice({
          battlers: [
            { side: 0, partyIndex: 0, status1: 0 },
            { side: 1, partyIndex: 2, status1: 0 },
          ],
          party: {
            player: partySlice([100, 60, 0, 0, 0, 0]),
            opponent: partySlice([0, 0, 90, 0, 0, 0]),
          },
        }),
        preBattlePlayerParty: [mon("player-0"), mon("player-1", 100, "paralysis"), mon("player-2")],
        preBattleOpponentParty: [mon("foe-0"), mon("foe-1"), mon("foe-2", 100, "none")],
      });
      expect(resolution.playerParty[1]).toMatchObject({ hp: 60, status: "paralysis" });
    },
  );

  it("passes rngValue through unchanged (already the right shape, docs/round-controller-outcome-seam.md §3 row 4)", () => {
    const resolution = deriveBattleResolutionFromTerminalBoundary({
      rngValue: 919694434,
      outcome: "player-win",
      rulesContext: rulesSlice(),
      preBattlePlayerParty: party("player"),
      preBattleOpponentParty: party("foe"),
    });
    expect(resolution.rngValue).toBe(919694434);
  });

  it("maps a draw (synthetic terminal state -- a live positive capture is not cheap, per the ground-truth doc) to a loss resolution", () => {
    const resolution = deriveBattleResolutionFromTerminalBoundary({
      rngValue: 7,
      outcome: "draw",
      rulesContext: rulesSlice({
        party: {
          player: partySlice([0, 0, 0, 0, 0, 0]),
          opponent: partySlice([0, 0, 0, 0, 0, 0]),
        },
      }),
      preBattlePlayerParty: party("player"),
      preBattleOpponentParty: party("foe"),
    });
    expect(resolution.outcome).toBe("loss");
    expect(resolution.playerParty.every((member) => member.status === "none")).toBe(true);
  });
});
