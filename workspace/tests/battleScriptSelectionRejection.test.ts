import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  checkBattleScriptMoveLimitations,
  describeIllegalMoveSelection,
} from "../src/engine/battleScriptActionAdmission.ts";
import {
  legalMoveSelectionRejections,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import {
  createBattleCommandPresentation,
} from "../src/engine/battleCommandPresentation.ts";
import { createBattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";
import {
  resolveMoveSelectionRejectionMessageLines,
  resolveNoMovesLeftMessageLines,
} from "../src/engine/battleResolutionPresentation.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";

const TACKLE = 33; // power 35
const GROWL = 45; // power 0
const TORMENT_MOVE = 259; // power 0
const STRUGGLE = 165;
const CHOICE_BAND_ITEM = 186; // ITEM_CHOICE_BAND -> HOLD_EFFECT_CHOICE_BAND
const FACTORY = (1 << 19) | (1 << 3);

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    moves: changes.moves ?? ([TACKLE, GROWL, 0, 0] as const),
    pp: changes.pp ?? ([15, 15, 0, 0] as const),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0,
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    item: changes.item ?? 0,
    statStages: changes.statStages
      ?? ([6, 6, 6, 6, 6, 6, 6, 6] as const),
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 109,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function rules(
  changes: Partial<BattleScriptRulesContextInput> = {},
) {
  return createBattleScriptRulesContext({
    battlers: changes.battlers ?? [
      battler({ side: 0 }),
      battler({ side: 1, moves: [TACKLE, TACKLE, TACKLE, TACKLE], pp: [35, 35, 35, 35] }),
      battler({ side: 0, hp: 0 }),
      battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: changes.selectorRoles ?? {
      attacker: 0,
      target: 1,
      effectBattler: 1,
      fainted: null,
    },
    scriptingBattler: changes.scriptingBattler ?? 0,
    atkCancelerTracker: changes.atkCancelerTracker ?? 0,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? TACKLE,
    currentMovePosition: changes.currentMovePosition ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0,
    dmgMultiplier: changes.dmgMultiplier ?? 1,
    critMultiplier: changes.critMultiplier ?? 1,
    moveEffectByte: changes.moveEffectByte ?? 0,
    missType: changes.missType ?? 0,
    hitMarker: changes.hitMarker ?? 0,
    multiHitCounter: changes.multiHitCounter ?? 0,
    moveHistory: changes.moveHistory ?? { lastMoves: [0, 0, 0, 0] },
    choicedMove: changes.choicedMove ?? [0, 0, 0, 0],
    party: changes.party ?? {
      player: [{ species: 109, hp: 100, level: 50, personality: 1 }, {}, {}, {}, {}, {}],
      opponent: [{ species: 242, hp: 100, level: 50, personality: 1 }, {}, {}, {}, {}, {}],
    },
    battleTopology: changes.battleTopology ?? {
      battlersCount: 2,
      battleTypeFlags: FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  });
}

describe("describeIllegalMoveSelection: the six TrySetCantSelectMoveBattleScript causes (battle_util.c:976-1080)", () => {
  it("returns null for a plain legal slot", () => {
    const source = rules();
    expect(describeIllegalMoveSelection(source, 0, 0)).toBeNull();
  });

  it("does not misfire Disabled on an empty move slot sharing disabledMove's zero default (:983 MOVE_NONE guard)", () => {
    const source = rules({
      battlers: [
        battler({ side: 0, moves: [TACKLE, 0, 0, 0], disabledMove: 0 }),
        battler({ side: 1, moves: [TACKLE, TACKLE, TACKLE, TACKLE], pp: [35, 35, 35, 35] }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
    });
    expect(describeIllegalMoveSelection(source, 0, 1)).toBeNull();
  });

  it("cause 1: Disabled -- STRINGID_PKMNMOVEISDISABLED", () => {
    const source = rules({
      battlers: [
        battler({ side: 0, disabledMove: TACKLE }),
        battler({ side: 1, moves: [TACKLE, TACKLE, TACKLE, TACKLE], pp: [35, 35, 35, 35] }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
    });
    expect(describeIllegalMoveSelection(source, 0, 0)).toEqual({
      cause: "disabled",
      stringId: "STRINGID_PKMNMOVEISDISABLED",
      battler: 0,
      moveSlot: 0,
      move: TACKLE,
      currentMove: TACKLE,
      heldItem: 0,
    });
  });

  it("cause 2: Tormented -- STRINGID_PKMNCANTUSEMOVETORMENT", () => {
    const source = rules({
      battlers: [
        battler({ side: 0, status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT }),
        battler({ side: 1, moves: [TACKLE, TACKLE, TACKLE, TACKLE], pp: [35, 35, 35, 35] }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
      moveHistory: { lastMoves: [TACKLE, 0, 0, 0] },
    });
    expect(describeIllegalMoveSelection(source, 0, 0)).toEqual({
      cause: "tormented",
      stringId: "STRINGID_PKMNCANTUSEMOVETORMENT",
      battler: 0,
      moveSlot: 0,
      move: TACKLE,
      currentMove: TACKLE,
      heldItem: 0,
    });
  });

  it("does not misfire Torment for MOVE_STRUGGLE (:999 guard, inert but citation-exact)", () => {
    const source = rules({
      battlers: [
        battler({
          side: 0,
          moves: [STRUGGLE, 0, 0, 0],
          status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT,
        }),
        battler({ side: 1, moves: [TACKLE, TACKLE, TACKLE, TACKLE], pp: [35, 35, 35, 35] }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
      moveHistory: { lastMoves: [STRUGGLE, 0, 0, 0] },
    });
    expect(describeIllegalMoveSelection(source, 0, 0)).toBeNull();
  });

  it("cause 3: Taunt -- STRINGID_PKMNCANTUSEMOVETAUNT", () => {
    const source = rules({
      battlers: [
        battler({ side: 0, tauntTimer: 3 }),
        battler({ side: 1, moves: [TACKLE, TACKLE, TACKLE, TACKLE], pp: [35, 35, 35, 35] }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
    });
    expect(describeIllegalMoveSelection(source, 0, 1)).toEqual({
      cause: "taunt",
      stringId: "STRINGID_PKMNCANTUSEMOVETAUNT",
      battler: 0,
      moveSlot: 1,
      move: GROWL,
      currentMove: GROWL,
      heldItem: 0,
    });
  });

  it("cause 4: Imprison -- STRINGID_PKMNCANTUSEMOVESEALED (DEAD at Factory L50 singles, resolver-complete regardless)", () => {
    const source = rules({
      battlers: [
        battler({ side: 0, moves: [TACKLE, 0, 0, 0] }),
        battler({
          side: 1,
          moves: [TACKLE, TACKLE, TACKLE, TACKLE],
          pp: [35, 35, 35, 35],
          status3: 1 << 13, // STATUS3_IMPRISONED_OTHERS
        }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
    });
    expect(describeIllegalMoveSelection(source, 0, 0)).toEqual({
      cause: "imprison",
      stringId: "STRINGID_PKMNCANTUSEMOVESEALED",
      battler: 0,
      moveSlot: 0,
      move: TACKLE,
      currentMove: TACKLE,
      heldItem: 0,
    });
  });

  it("cause 5: Choice Band lock -- STRINGID_ITEMALLOWSONLYYMOVE, currentMove points at the still-allowed choiced move (:1057), not the rejected slot", () => {
    const source = rules({
      battlers: [
        battler({ side: 0, item: CHOICE_BAND_ITEM, moves: [TACKLE, GROWL, 0, 0] }),
        battler({ side: 1, moves: [TACKLE, TACKLE, TACKLE, TACKLE], pp: [35, 35, 35, 35] }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
      choicedMove: [TACKLE, 0, 0, 0],
    });
    expect(describeIllegalMoveSelection(source, 0, 1)).toEqual({
      cause: "choice-item",
      stringId: "STRINGID_ITEMALLOWSONLYYMOVE",
      battler: 0,
      moveSlot: 1,
      move: GROWL,
      currentMove: TACKLE,
      heldItem: CHOICE_BAND_ITEM,
    });
  });

  it("cause 6: No PP -- STRINGID_NOPPLEFT", () => {
    const source = rules({
      battlers: [
        battler({ side: 0, pp: [0, 15, 0, 0] }),
        battler({ side: 1, moves: [TACKLE, TACKLE, TACKLE, TACKLE], pp: [35, 35, 35, 35] }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
    });
    expect(describeIllegalMoveSelection(source, 0, 0)).toEqual({
      cause: "no-pp",
      stringId: "STRINGID_NOPPLEFT",
      battler: 0,
      moveSlot: 0,
      move: TACKLE,
      currentMove: TACKLE,
      heldItem: 0,
    });
  });

  it("multi-cause slot: Disabled (cause 1) and No PP (cause 6) both apply -- the LAST true cause wins (No PP), not the first", () => {
    const source = rules({
      battlers: [
        battler({ side: 0, disabledMove: TACKLE, pp: [0, 15, 0, 0] }),
        battler({ side: 1, moves: [TACKLE, TACKLE, TACKLE, TACKLE], pp: [35, 35, 35, 35] }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
    });
    expect(checkBattleScriptMoveLimitations(source, 0) & 0b1).toBe(0b1);
    expect(describeIllegalMoveSelection(source, 0, 0)?.cause).toBe("no-pp");
  });

  it("multi-cause slot: Taunt (cause 3) and Choice Band lock (cause 5) both apply -- the LAST true cause wins (Choice Band), not the first", () => {
    const source = rules({
      battlers: [
        battler({
          side: 0,
          tauntTimer: 3,
          item: CHOICE_BAND_ITEM,
          moves: [TACKLE, GROWL, 0, 0],
        }),
        battler({ side: 1, moves: [TACKLE, TACKLE, TACKLE, TACKLE], pp: [35, 35, 35, 35] }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
      choicedMove: [TACKLE, 0, 0, 0],
    });
    expect(describeIllegalMoveSelection(source, 0, 1)).toEqual({
      cause: "choice-item",
      stringId: "STRINGID_ITEMALLOWSONLYYMOVE",
      battler: 0,
      moveSlot: 1,
      move: GROWL,
      currentMove: TACKLE,
      heldItem: CHOICE_BAND_ITEM,
    });
  });

  it("rejects an out-of-range move slot", () => {
    const source = rules();
    expect(() => describeIllegalMoveSelection(source, 0, 4)).toThrow(/move slot 0\.\.3/);
  });
});

describe("legalMoveSelectionRejections: per-slot projection alongside legalMoveDecisions", () => {
  it("resolves null for every legal slot and the exact cause for a masked one", () => {
    const source = rules({
      battlers: [
        battler({
          side: 0,
          tauntTimer: 3,
          moves: [TACKLE, GROWL, TACKLE, TACKLE],
          pp: [15, 15, 15, 15],
        }),
        battler({ side: 1, moves: [TACKLE, TACKLE, TACKLE, TACKLE], pp: [35, 35, 35, 35] }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
    });
    const rejections = legalMoveSelectionRejections(source, 0);
    expect(rejections[0]).toBeNull();
    expect(rejections[1]?.cause).toBe("taunt");
    expect(rejections[2]).toBeNull();
    expect(rejections[3]).toBeNull();
  });
});

describe("battleCommandPresentation rejectionReasonBySlot: parallel to legalMoveBySlot (scout §2.2(b))", () => {
  it("carries a rejection reason only for the slot legalMoveBySlot omits", () => {
    const source = rules({
      battlers: [
        battler({
          side: 0,
          tauntTimer: 3,
          moves: [TACKLE, GROWL, TACKLE, TACKLE],
          pp: [15, 15, 15, 15],
        }),
        battler({ side: 1, moves: [TACKLE, TACKLE, TACKLE, TACKLE], pp: [35, 35, 35, 35] }),
        battler({ side: 0, hp: 0 }),
        battler({ side: 1, hp: 0 }),
      ],
    });
    const request = createBattleCommandRequest({
      requestId: 1,
      kind: "command",
      side: "player",
      battler: 0,
      legalDecisions: [
        { kind: "use-move", moveSlot: 0, targetBattler: 1 },
      ],
    });
    const presentation = createBattleCommandPresentation(request, source, 0);
    expect(presentation.legalMoveBySlot[0]).not.toBeNull();
    expect(presentation.rejectionReasonBySlot[0]).toBeNull();
    expect(presentation.legalMoveBySlot[1]).toBeNull();
    expect(presentation.rejectionReasonBySlot[1]).toEqual({
      cause: "taunt",
      stringId: "STRINGID_PKMNCANTUSEMOVETAUNT",
      battler: 0,
      moveSlot: 1,
      move: GROWL,
      currentMove: GROWL,
      heldItem: 0,
    });
    expect(presentation.rejectionReasonBySlot[2]).toBeNull();
    expect(presentation.rejectionReasonBySlot[3]).toBeNull();
  });
});

describe("resolveMoveSelectionRejectionMessageLines: the 4 STRINGID resolvers (ISSUES #72 scout §1.5)", () => {
  const field = Object.freeze({
    player: Object.freeze({
      side: "player" as const,
      battler: 0 as const,
      partyIndex: 0 as const,
      species: 12,
      name: "BUTTERFREE",
      level: 50,
      gender: "genderless" as const,
      hp: 95,
      maxHP: 95,
      status: "none" as const,
      moveIds: [TACKLE, GROWL, 0, 0] as const,
      currentPP: [15, 15, 0, 0] as const,
      ppBonuses: 0,
    }),
    opponent: Object.freeze({
      side: "trainer" as const,
      battler: 1 as const,
      partyIndex: 0 as const,
      species: 198,
      name: "MURKROW",
      level: 50,
      gender: "genderless" as const,
      hp: 142,
      maxHP: 142,
      status: "none" as const,
      moveIds: [TORMENT_MOVE, TORMENT_MOVE, TORMENT_MOVE, TORMENT_MOVE] as const,
      currentPP: [16, 16, 16, 16] as const,
      ppBonuses: 0,
    }),
  });

  it("STRINGID_NOPPLEFT has no placeholders at all", () => {
    expect(resolveMoveSelectionRejectionMessageLines({
      cause: "no-pp",
      stringId: "STRINGID_NOPPLEFT",
      battler: 0,
      moveSlot: 0,
      move: TACKLE,
      currentMove: TACKLE,
      heldItem: 0,
    }, field)).toEqual(["There’s no PP left for", "this move!"]);
  });

  it("STRINGID_PKMNCANTUSEMOVETORMENT names the tormented battler, no move name in the text", () => {
    expect(resolveMoveSelectionRejectionMessageLines({
      cause: "tormented",
      stringId: "STRINGID_PKMNCANTUSEMOVETORMENT",
      battler: 0,
      moveSlot: 0,
      move: TACKLE,
      currentMove: TACKLE,
      heldItem: 0,
    }, field)).toEqual(["BUTTERFREE can’t use the same", "move in a row due to the TORMENT!"]);
  });

  it("STRINGID_PKMNCANTUSEMOVETORMENT prefixes the opponent's own name with Foe", () => {
    expect(resolveMoveSelectionRejectionMessageLines({
      cause: "tormented",
      stringId: "STRINGID_PKMNCANTUSEMOVETORMENT",
      battler: 1,
      moveSlot: 0,
      move: TORMENT_MOVE,
      currentMove: TORMENT_MOVE,
      heldItem: 0,
    }, field)).toEqual(["Foe MURKROW can’t use the same", "move in a row due to the TORMENT!"]);
  });

  it("STRINGID_ITEMALLOWSONLYYMOVE names the held item and the still-allowed move", () => {
    expect(resolveMoveSelectionRejectionMessageLines({
      cause: "choice-item",
      stringId: "STRINGID_ITEMALLOWSONLYYMOVE",
      battler: 0,
      moveSlot: 1,
      move: GROWL,
      currentMove: TACKLE,
      heldItem: CHOICE_BAND_ITEM,
    }, field)).toEqual(["CHOICE BAND allows the", "use of only TACKLE!"]);
  });

  it("STRINGID_PKMNCANTUSEMOVETAUNT names the taunted battler and the rejected move (soak signature 4)", () => {
    // sText_PkmnCantUseMoveTaunt (battle_message.c:261); gCurrentMove is the
    // rejected move itself (battle_util.c:1016).
    expect(resolveMoveSelectionRejectionMessageLines({
      cause: "taunt",
      stringId: "STRINGID_PKMNCANTUSEMOVETAUNT",
      battler: 0,
      moveSlot: 1,
      move: GROWL,
      currentMove: GROWL,
      heldItem: 0,
    }, field)).toEqual(["BUTTERFREE can’t use", "GROWL after the TAUNT!"]);
  });

  it("STRINGID_PKMNCANTUSEMOVETAUNT prefixes the opponent's own name with Foe", () => {
    expect(resolveMoveSelectionRejectionMessageLines({
      cause: "taunt",
      stringId: "STRINGID_PKMNCANTUSEMOVETAUNT",
      battler: 1,
      moveSlot: 0,
      move: TORMENT_MOVE,
      currentMove: TORMENT_MOVE,
      heldItem: 0,
    }, field)).toEqual(["Foe MURKROW can’t use", "TORMENT after the TAUNT!"]);
  });

  it("STRINGID_PKMNMOVEISDISABLED names the battler's own disabled move (scout §1.5's other live gap)", () => {
    // sText_PkmnMoveIsDisabled (battle_message.c:259); gCurrentMove is the
    // rejected move itself (battle_util.c:986).
    expect(resolveMoveSelectionRejectionMessageLines({
      cause: "disabled",
      stringId: "STRINGID_PKMNMOVEISDISABLED",
      battler: 0,
      moveSlot: 0,
      move: TACKLE,
      currentMove: TACKLE,
      heldItem: 0,
    }, field)).toEqual(["BUTTERFREE’s TACKLE", "is disabled!"]);
  });

  it("keeps the completeness guard fatal for STRINGID_PKMNCANTUSEMOVESEALED (DEAD Imprison carrier -- no fallback)", () => {
    expect(() => resolveMoveSelectionRejectionMessageLines({
      cause: "imprison",
      stringId: "STRINGID_PKMNCANTUSEMOVESEALED",
      battler: 0,
      moveSlot: 0,
      move: TACKLE,
      currentMove: TACKLE,
      heldItem: 0,
    }, field)).toThrow(/no move-selection-rejection message resolver/);
  });

  it("STRINGID_PKMNHASNOMOVESLEFT (AreAllMovesUnusable's sibling, scout §1.2b) names the battler whose turn it is", () => {
    expect(resolveNoMovesLeftMessageLines(field, 0)).toEqual(["BUTTERFREE has no", "moves left!"]);
  });
});
