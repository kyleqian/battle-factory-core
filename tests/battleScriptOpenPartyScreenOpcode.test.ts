import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { stepBattleScriptMachine } from "../src/engine/battleScriptMachine.ts";

const program = loadBattleScriptProgram();
const TACKLE = 33;
const KARATE_CHOP = 2;
/** include/constants/battle.h. */
const BATTLE_TYPE_TRAINER = 1 << 3;
const BATTLE_TYPE_FRONTIER =
  (1 << 8) | (1 << 16) | (1 << 17) | (1 << 18) | (1 << 19) | (1 << 20) | (1 << 21);

/** species-types.json: 191=SUNKERN (GRASS/GRASS), 16=PIDGEY (NORMAL/FLYING), 66=MACHOP (FIGHTING/FIGHTING), 217=URSARING (NORMAL/NORMAL). */
const SUNKERN = 191;
const PIDGEY = 16;
const MACHOP = 66;
const URSARING = 217;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([TACKLE, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([35, 0, 0, 0]),
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
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  });
}

const EMPTY_SLOT: BattleScriptPartyMemberInput = { species: 0, isEgg: false, hp: 0 };

/** docs/forced-switch-ground-truth.md §2's own opponent bench: SUNKERN (fainted)/PIDGEY (Tackle)/MACHOP (Karate Chop). */
function opponentBench(): BattleScriptPartyMemberInput[] {
  return [
    { species: SUNKERN, hp: 0, moves: [TACKLE, 0, 0, 0] },
    { species: PIDGEY, hp: 100, moves: [TACKLE, 0, 0, 0] },
    { species: MACHOP, hp: 100, moves: [KARATE_CHOP, 0, 0, 0] },
    EMPTY_SLOT,
    EMPTY_SLOT,
    EMPTY_SLOT,
  ];
}

function context(contextChanges: Partial<BattleScriptRulesContextInput> = {}): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
      battler({ side: 1, species: SUNKERN, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 0 }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 0, effectBattler: 0, fainted: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: TACKLE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_TYPE_TRAINER | BATTLE_TYPE_FRONTIER,
      battlerPositions: [0, 1, 2, 3],
    },
    party: { player: [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT], opponent: opponentBench() },
    ...contextChanges,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
  });
}

const OPEN_PARTY_SCREEN_PC = program.instructions.find(
  (instruction) =>
    instruction.opcodeName === "B_SCR_OP_OPENPARTYSCREEN"
    && instruction.source.label === "BattleScript_FaintedMonTryChoose",
)!.programCounter;

function stepAtProgramCounter(pc: number, rulesContext: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_HandleFaintedMon",
    rulesContext,
    1,
    externalPorts(),
  );
  const patched = Object.freeze({ ...execution.state, programCounter: pc });
  return { execution, result: stepBattleScriptMachine(program, patched, execution.handlers) };
}

describe("production openpartyscreen (Cmd_openpartyscreen) dispatch, BS_FAINTED plain-battler branch", () => {
  it("registers B_SCR_OP_OPENPARTYSCREEN", () => {
    expect(program.instructions.find((i) => i.opcodeName === "B_SCR_OP_OPENPARTYSCREEN")).toBeDefined();
  });

  it(
    "docs/forced-switch-ground-truth.md §2a live ledger: AI/trainer side sends MACHOP (party index 2), "
      + "not PIDGEY (index 1) -- resolves synchronously and advances (zero controller wait modeled)",
    () => {
      const { result } = stepAtProgramCounter(OPEN_PARTY_SCREEN_PC, context());
      if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
      expect(result.state.programCounter).toBe(OPEN_PARTY_SCREEN_PC + 1);
      expect(result.state.rulesContext.monToSwitchIntoId[1]).toBe(2); // battler 1 (opponent) -> MACHOP
      // Zero Random() draws (docs/forced-switch-ground-truth.md §2b).
      expect(result.state.rng.calls).toBe(0);
    },
  );

  describe("player-side forced-switch decision (docs/forced-switch-ground-truth.md §3/§4 slice 10)", () => {
    function playerFaintedContext(party: Partial<BattleScriptRulesContextInput>) {
      return context({
        battlers: [
          battler({ side: 0, species: SUNKERN, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 0 }),
          battler({ side: 1, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        selectorRoles: { attacker: 0, target: 0, effectBattler: 0, fainted: 0 },
        ...party,
      });
    }

    it(
      "halts with a genuine player-choice-required reason naming the legal bench slots -- alive, "
        + "non-egg, not the fainted slot itself -- not an unsupported-branch placeholder",
      () => {
        const rc = playerFaintedContext({
          party: { player: opponentBench(), opponent: [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT] },
        });
        const { result } = stepAtProgramCounter(OPEN_PARTY_SCREEN_PC, rc);
        expect(result.kind).toBe("halted");
        expect(result.state.haltReason).toMatchObject({
          kind: "player-choice-required",
          battler: 0,
          faintedPartyIndex: 0,
          legalPartyIndexes: [1, 2], // PIDGEY, MACHOP -- SUNKERN (index 0) is the fainted slot itself
        });
        // Zero Random() draws -- this is a halt, not a controller round trip (docs §3d).
        expect(result.state.rng.calls).toBe(0);
      },
    );

    it("excludes egg slots from the legal replacement list", () => {
      const rc = playerFaintedContext({
        party: {
          player: [
            { species: SUNKERN, hp: 0 },
            { species: PIDGEY, hp: 100, isEgg: true },
            { species: MACHOP, hp: 100 },
            EMPTY_SLOT,
            EMPTY_SLOT,
            EMPTY_SLOT,
          ],
          opponent: [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT],
        },
      });
      const { result } = stepAtProgramCounter(OPEN_PARTY_SCREEN_PC, rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "player-choice-required", legalPartyIndexes: [2] });
    });

    it(
      "already-decided monToSwitchIntoId (a resume) advances instead of halting again, mirroring the "
        + "AI branch's own tail -- no re-scoring",
      () => {
        const rc = playerFaintedContext({
          party: { player: opponentBench(), opponent: [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT] },
          monToSwitchIntoId: [2, 6, 6, 6], // battler 0 already resolved to MACHOP (index 2); 6 = PARTY_SIZE sentinel
        });
        const { result } = stepAtProgramCounter(OPEN_PARTY_SCREEN_PC, rc);
        if (result.kind !== "advanced") throw new Error(`expected advance, got ${result.kind}`);
        expect(result.state.programCounter).toBe(OPEN_PARTY_SCREEN_PC + 1);
        expect(result.state.rulesContext.monToSwitchIntoId[0]).toBe(2); // unchanged -- not re-scored
        expect(result.state.rng.calls).toBe(0);
      },
    );
  });

  describe("(b) unsupported-branch barriers", () => {
    it("selects the sole legal trainer replacement without entering the irrelevant damage fallback", () => {
      const rc = context({
        party: {
          player: [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT],
          opponent: [
            { species: SUNKERN, hp: 0, moves: [TACKLE, 0, 0, 0] },
            { species: PIDGEY, hp: 100, moves: [TACKLE, 0, 0, 0] },
            EMPTY_SLOT,
            EMPTY_SLOT,
            EMPTY_SLOT,
            EMPTY_SLOT,
          ],
        },
      });
      const { result } = stepAtProgramCounter(OPEN_PARTY_SCREEN_PC, rc);
      if (result.kind !== "advanced") throw new Error(`expected advanced, got ${result.kind}`);
      expect(result.state.rulesContext.monToSwitchIntoId[1]).toBe(1);
      expect(result.state.rng.calls).toBe(0);
    });

    it("doubles topology: not modeled (Factory singles only)", () => {
      const rc = context({
        battlers: [
          battler({ side: 0, species: URSARING, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
          battler({ side: 1, species: SUNKERN, hp: 0, types: ["TYPE_GRASS", "TYPE_GRASS"], partyIndex: 0 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
        battleTopology: {
          battlersCount: 4,
          battleTypeFlags: BATTLE_TYPE_TRAINER | BATTLE_TYPE_FRONTIER | 1, // | BATTLE_TYPE_DOUBLE
          battlerPositions: [0, 1, 2, 3],
        },
      });
      const { result } = stepAtProgramCounter(OPEN_PARTY_SCREEN_PC, rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("pass-2 damage fallback needed: no bench mon has a super-effective move", () => {
      const rc = context({
        party: {
          player: [EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT, EMPTY_SLOT],
          opponent: [
            { species: SUNKERN, hp: 0, moves: [TACKLE, 0, 0, 0] },
            { species: PIDGEY, hp: 100, moves: [TACKLE, 0, 0, 0] },
            { species: URSARING, hp: 100, moves: [TACKLE, 0, 0, 0] },
            EMPTY_SLOT,
            EMPTY_SLOT,
            EMPTY_SLOT,
          ],
        },
      });
      const { result } = stepAtProgramCounter(OPEN_PARTY_SCREEN_PC, rc);
      expect(result.kind).toBe("halted");
      expect(result.state.haltReason).toMatchObject({ kind: "unsupported-branch" });
    });

    it("pass-through: the AI/singles/pass-1-resolved happy path never trips a barrier", () => {
      const { result } = stepAtProgramCounter(OPEN_PARTY_SCREEN_PC, context());
      expect(result.kind).toBe("advanced");
    });
  });
});
