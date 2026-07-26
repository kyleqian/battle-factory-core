/**
 * S10 presentation-seam checkpoint (ROADMAP S10 §3, docs/presentation-seam-
 * scout.md §7.3 step 3): stages the real turn-5 KO (Onix's fatal hit on
 * Grovyle, 1hp -> 0 -- the committed `turn5-faint.json` window's own
 * precondition, `docs/battle-turn-notes.md` §23/§24) through the registered
 * hit chain and captures its real semantic event stream, so
 * `battleScene.ts`'s `drawTurn5RockSlideWindow` fainted branch can consume
 * kernel events instead of hardcoded literals. Follows
 * `factoryBattleScriptTerminalDecision.ts`'s staging pattern (same entry
 * label, same "run to the script's own end" loop), scoped down to a single
 * hit chain's event capture -- no `BattleDecisionReducer`/party/outcome
 * layer is needed for this window (it needs only the fainted message + the
 * KO's own `hp-change`, not a terminal boundary), matching
 * `battleScriptHitChainOpcode.test.ts`'s own already-committed KO-scenario
 * shape (`:1386-1539`).
 *
 * Ground truth, not fabricated, with one documented substitution:
 * species/stats/types are Onix's and Grovyle's real level-50 battle stats
 * (`tests/damageCalc.test.ts`'s own RAM-pinned `ONIX`/`GROVYLE` blocks,
 * sourced from `docs/battle-turn-notes.md` §5 / `turn-resolution-notes.md`
 * §2). HP is turn 5's own real pre-hit value (Grovyle 1, Onix 1 --
 * `docs/battle-turn-notes.md` §23/§24's own anchors
 * `anchorPlayerAfterTurn5Hp`/the turn-5 Grovyle-stays-at-1 finding). The
 * staged move is MOVE_STRENGTH, not the real turn's MOVE_ROCK_SLIDE: this
 * leaf branch's own rendered content (`hp-change{to:0}` + the fainted
 * message) never depends on which move caused the KO, and ROCK_SLIDE is
 * MOVE_TARGET_BOTH (a spread move) -- `Cmd_ppreduce`'s engine port has an
 * existing, correctly-scoped `unsupported-branch` for MOVE_TARGET_BOTH's
 * cross-side Pressure-counting logic (`battleScriptHitChainOpcode.ts:688-
 * 697`, a real, separate, already-pinned engine gap, unrelated to the
 * fainted-message seam this checkpoint proves). Substituting a
 * MOVE_TARGET_SELECTED move keeps every OTHER input (species/HP/side/the
 * resulting message) real while not depending on that unrelated barrier --
 * not a shim (no event payload is faked; the hit chain still runs for
 * real, computing real damage from real stats). The RNG seed is not turn
 * 5's own frame-0 value (this dossier's notes are tick/pixel-only, not
 * RNG-ledger, for turn 5) -- 919694434 is reused from this file's own
 * committed KO fixture (`battleScriptHitChainOpcode.test.ts:1408`): its
 * accuracycheck roll (56317 % 100 = 17) clears MOVE_STRENGTH's 100%
 * accuracy (as it did that fixture's own STRENGTH use), so this is a
 * genuine source-computed hit, not a forced one -- the specific damage
 * number is not pixel-relevant here (Grovyle's real 1 HP clamps to 0 under
 * any nonzero hit), only that it is computed by the real formula, which it
 * is.
 */
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptStatusRulesExternalPorts,
} from "./battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "./battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "./battleScriptMachine.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import type { BattleScriptSemanticEvent } from "./battleScriptEvents.ts";
import {
  resolveFaintPresentationWindowContent,
  type FaintPresentationWindowContent,
} from "./presentationEventWindowBridge.ts";
import { resolveBattleNameWithPrefix, resolveBattleStringLines } from "./battleStringResolver.ts";
import speciesNamesAsset from "../data/gen/species-names.json" with { type: "json" };

const SPECIES_NAMES = speciesNamesAsset.species as readonly { species: string; name: string }[];
function speciesDisplayName(speciesId: number): string {
  const entry = SPECIES_NAMES[speciesId];
  if (!entry) throw new Error(`turn5FaintPresentationStaging: no species-names.json entry at index ${speciesId}`);
  return entry.name;
}

const PROGRAM = loadBattleScriptProgram();
const ENTRY_LABEL = "BattleScript_HitFromAtkCanceler";
const B_WAIT_TIME_LONG = 64;
/** src/data/gen/moves.json MOVE_STRENGTH -- staged in place of ROCK_SLIDE, see module doc. */
const STAGED_MOVE = 70;
/** src/data/gen/species-names.json array index (== the real numeric species id). */
const SPECIES_ONIX = 95;
const SPECIES_GROVYLE = 278;
/** battleScriptHitChainOpcode.test.ts's own committed KO fixture seed -- see module doc. */
const KO_HIT_SEED = 919694434;

function battler(changes: Partial<BattleScriptRulesBattler>): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: 0,
    hp: changes.hp ?? 0,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0] as const),
    pp: changes.pp ?? Object.freeze([0, 0, 0, 0] as const),
    status1: 0,
    status2: 0,
    status3: 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: 0,
    partyIndex: 0,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" ? B_WAIT_TIME_LONG : null,
    resolveByteOperand: () => null,
  });
}

/**
 * Runs the ONIX -> GROVYLE (1hp -> 0) hit chain from
 * `BattleScript_HitFromAtkCanceler` to the script's own `end`, returning
 * every semantic event the registered opcodes emitted along the way. Called
 * once, at module load, by `battleScene.ts` -- "kernel runs at staging
 * time; presentation reads the event list" (this checkpoint's own
 * architecture rule). Pure: no shared/global state, no RNG or rules
 * mutation outside this call's own local machine instance.
 */
export type Turn5FaintHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  /** The final staged battlers, `species`/`side` read by the PC-to-window bridge's caller below -- never re-guessed. */
  battlers: Readonly<Record<number, Readonly<{ species: number; side: 0 | 1 }>>>;
}>;

export function stageTurn5FaintHitChain(): Turn5FaintHitChainResult {
  const onix = battler({
    side: 0,
    hp: 1,
    species: SPECIES_ONIX,
    attack: 51,
    defense: 187,
    spAttack: 36,
    spDefense: 72,
    types: ["TYPE_ROCK", "TYPE_GROUND"],
    moves: [STAGED_MOVE, 0, 0, 0],
    pp: [10, 0, 0, 0],
  });
  const grovyle = battler({
    side: 1,
    hp: 1,
    species: SPECIES_GROVYLE,
    attack: 103,
    defense: 56,
    spAttack: 91,
    spDefense: 71,
    types: ["TYPE_GRASS", "TYPE_GRASS"],
  });

  const rulesContext = createBattleScriptRulesContext({
    battlers: [onix, grovyle, battler({ side: 0 }), battler({ side: 1 })],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: STAGED_MOVE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
  });

  const ports = externalPorts();
  const execution = createBattleScriptStatusRulesExecution(PROGRAM, ENTRY_LABEL, rulesContext, KO_HIT_SEED, ports);
  let state = execution.state;
  for (let budget = 0; budget < 512; budget += 1) {
    const stepped = stepBattleScriptMachine(PROGRAM, state, execution.handlers);
    if (stepped.kind === "halted" && stepped.state.haltReason?.kind === "terminal") {
      return {
        events: stepped.state.events,
        battlers: Object.freeze({
          0: Object.freeze({ species: stepped.state.rulesContext.battlers[0].species, side: 0 as const }),
          1: Object.freeze({ species: stepped.state.rulesContext.battlers[1].species, side: 1 as const }),
        }),
      };
    }
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgePendingControllers(state);
      if (acknowledged === state) {
        throw new Error("turn5FaintPresentationStaging: Battle Script blocked without a safe controller acknowledgement");
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind !== "advanced" && stepped.kind !== "scheduler-progressed") {
      throw new Error(
        `turn5FaintPresentationStaging: staged ROCK_SLIDE KO hit chain stopped unexpectedly (${stepped.kind}) `
          + "before its own script completed",
      );
    }
    state = stepped.state;
  }
  throw new Error("turn5FaintPresentationStaging: staged hit chain did not reach its own script end in budget");
}

function acknowledgePendingControllers(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

export type Turn5FaintWindowResolution = FaintPresentationWindowContent & Readonly<{
  faintedSpecies: number;
  faintedSide: "player" | "opponent";
}>;

/**
 * The PC-to-window bridge (gap 7) applied to this staged run: resolves
 * which side fainted from the SAME staged rules-context battler this
 * module just ran (`battlers[faintedBattler].species`/`.side`), never
 * re-guessed from the event payload itself (the event's own `substitutions`
 * is always empty -- the kernel event stream carries the raw `messageId`
 * only; splicing the real nickname is the string resolver's job, gap 5).
 */
export function resolveTurn5FaintWindowContent(): Turn5FaintWindowResolution {
  const { events, battlers } = stageTurn5FaintHitChain();
  const content = resolveFaintPresentationWindowContent(events);
  if (!content) {
    throw new Error("turn5FaintPresentationStaging: staged hit chain did not produce a fainted-window event pair");
  }
  const faintedBattler = battlers[content.faintedBattler];
  if (!faintedBattler) {
    throw new Error(`turn5FaintPresentationStaging: no staged battler at index ${content.faintedBattler}`);
  }
  return Object.freeze({
    ...content,
    faintedSpecies: faintedBattler.species,
    faintedSide: faintedBattler.side === 0 ? "player" : "opponent",
  });
}

/**
 * The KO's own real settle (0 -- Grovyle faints) -- `docs/presentation-seam-
 * scout.md` §9.4 rung 5's own second consumption point of this SAME staged
 * chain: `battleScene.ts`'s `drawTurn5RockSlideAttack` reads Grovyle's own
 * `rockSlideOpponentHp` drain endpoint at an EARLIER point in turn 5's own
 * timeline than this window's fainted-message branch (`resolveTurn5FaintWindowLines`)
 * consumes it -- same KO hit chain, two call sites, not a second staged run.
 */
export function resolveTurn5FaintWindowKoHp(): number {
  const { events } = stageTurn5FaintHitChain();
  const koEvent = events.find((event) => event.kind === "hp-change" && event.to === 0);
  if (!koEvent || koEvent.kind !== "hp-change") {
    throw new Error("turn5FaintPresentationStaging: staged hit chain did not produce a KO hp-change event");
  }
  return koEvent.to;
}

/**
 * The full seam, end to end: stage -> bridge -> resolve. Battle Factory
 * battles are always trainer battles (`BATTLE_TYPE_TRAINER`, set in this
 * staging's own rules context construction is implicit -- singles hit
 * chains here never model a wild encounter), so the fainted battler's own
 * side is enough to pick "Foe "/no-prefix per `HANDLE_NICKNAME_STRING_CASE`
 * -- this is the ONLY call site that combines the string resolver (gap 5),
 * the PC-to-window bridge (gap 7), and this staged kernel run into the two
 * literal text lines `battleScene.ts` renders.
 */
export function resolveTurn5FaintWindowLines(): readonly string[] {
  const resolution = resolveTurn5FaintWindowContent();
  const nickname = speciesDisplayName(resolution.faintedSpecies);
  return resolveBattleStringLines(resolution.message.messageId, {
    B_DEF_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: resolution.faintedSide, isTrainerBattle: true, nickname }),
  });
}
