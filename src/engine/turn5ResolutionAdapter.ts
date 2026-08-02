/**
 * ISSUES #39 rank-3 flip (docs/battle-scene-retirement-inventory.md rank-3
 * row), both halves now landed: the Turn-5 ROCK_SLIDE KO (Onix -> Grovyle,
 * the OPPONENT's mon) -> Pidgeotto switch-in -> Sitrus heal window of
 * `battleScene.ts`'s turn-5 window sources its opponent-faint sink geometry,
 * PIDGEOTTO switch-in facts, and Sitrus heal HP endpoints/message text from
 * this adapter instead of hand-fit constants plus independently re-stated
 * literals. Formerly a preview proof
 * (`turn5ResolutionAdapterPreview.ts`/`...PreviewEquivalence.test.ts`, rank-1/
 * rank-2's own promotion pattern) -- see this module's own git history for
 * that precedent. Half 1 (faint-sink/switch-in) landed first; half 2
 * (Sitrus) reuses `resolveTurn5SitrusAdapter`, wiring its already-proven
 * facts into `battleScene.ts`'s `TURN5_SITRUS_HEAL_HP_START`/`_END` and
 * `TURN5_SITRUS_HEAL_LINE1`/`_LINE2` -- the presentation TIMING curves
 * themselves (`turn5SitrusHealTextVisibleChars`, `turn5SitrusOnixHp`'s
 * animation shape, `turn5SitrusRingMatrix`, `turn5SitrusResettledBounceTick`)
 * are untouched, still their own oracle-pixel-fit closed forms -- this flip
 * is the keying/content, not the choreography.
 *
 * KO/faint half: `turn5FaintPresentationStaging.ts` already stages Onix's
 * real ONIX(1hp)->GROVYLE(1hp) hit chain (MOVE_STRENGTH substituted for
 * ROCK_SLIDE -- that module's own module doc explains the substitution: an
 * unrelated, already-pinned `unsupported-branch` for MOVE_TARGET_BOTH's
 * cross-side Pressure counting, not a fabricated input) and battleScene.ts
 * already consumes its kickoff/faint text live
 * (`resolveTurn5FaintWindowLines`/`resolveTurn5FaintWindowKoHp`,
 * `battleScene.ts:796`). This module does NOT re-wire that half; it restages
 * the SAME real battlers/move/seed through the generic single-hit seam
 * (`stagePlayerHitChainToTerminalMachineState`,
 * `turn1RockSlidePresentationStaging.ts`) with the ADDITIONAL `party`/
 * `battleTopology` rank-2's own `turn13DragonBreathPresentationStaging.ts`
 * established (`TURN13_PARTY` precedent), so this run's own terminal state
 * can chain forward -- exactly rank 2's own two-stage shape
 * (`turn13ResolutionAdapter.ts`'s `resolveTurn13SwitchInAdapter`), reused
 * here for turn 5's OWN real switch-in decision.
 *
 * Switch-in half: chains into `runBattleScriptFaintedActionsOrchestration`
 * (the real `HandleFaintedMonActions` port) exactly as rank 2 does. DESTIN's
 * real turn-5 bench (GROVYLE slot 0, about to faint; MURKROW slot 1;
 * PIDGEOTTO slot 2) and the real decision -- PIDGEOTTO over MURKROW, via
 * `getMostSuitableMonToSwitchInto`'s pass-2 damage-fallback scoring --
 * are `tests/destinCanonicalReplacements.test.ts`'s own already-proven
 * fixture (species/moves/stats), reused verbatim, not re-derived.
 *
 * Sitrus half (this slice's own new stage, absent from rank 2's window):
 * chains the "resumed" state further into `runBattleEndTurnOrchestration`
 * (the real `BattleTurnPassed` port, `battleEndTurnOrchestration.ts`) --
 * its already-ported `HOLD_EFFECT_RESTORE_HP` case
 * (`battleEndTurnOrchestration.ts:1308-1316`, itself a straight port of
 * `battle_util.c:3336-3345`) reproduces Onix's own real Sitrus Berry proc
 * generically: no ONIX/SITRUS branch is added anywhere in this file, only
 * Onix's real item (142, `HOLD_EFFECT_RESTORE_HP`, param 30 --
 * `src/data/gen/item-hold-effects.json`) and real pre-heal HP (1/117, well
 * under the `hp <= maxHP/2` gate) feed the SAME generic end-turn item tick
 * every other held-item carrier already proven in
 * `tests/battleEndTurnOrchestration.test.ts` uses. The heal's own message
 * (`STRINGID_PKMNSITEMRESTOREDHEALTH`, `battle_message.c:492,805`) is
 * resolved through the existing generic `resolveBattleStringLines` --
 * already fully data-driven from the extracted 365-entry
 * `battle-message-templates.json` -- supplying only the two placeholder
 * resolvers (`B_SCR_ACTIVE_NAME_WITH_PREFIX`, `B_LAST_ITEM`) the same way
 * every other staging module in this file family supplies
 * `B_ATK_NAME_WITH_PREFIX`/`B_BUFF2`/etc: NOT a missing mechanism, just an
 * unsupplied resolver pair at this one call site. Onix's real HP climb
 * (1->31) and the real heal text
 * ("ONIX’s SITRUS BERRY"/"restored health!") this module reproduces now
 * literally ARE `battleScene.ts`'s own exported `TURN5_SITRUS_HEAL_HP_START`/
 * `_END` and `TURN5_SITRUS_HEAL_LINE1`/`_LINE2` -- see this module's own
 * equivalence test, which pins the live production path against a fresh,
 * independently-computed adapter call, the same shape rank-3 half 1's own
 * faint-sink/switch-in pins already established.
 *
 * ISSUES #57 (`387a34a1`): this module now REUSES
 * `turn1RockSlidePresentationStaging.ts`'s own shared
 * `stagePlayerHitChainToTerminalMachineState` wrapper instead of a local
 * staging pipeline. That helper's `battler()` normalizer used to silently
 * drop `maxHP`/`item` from its `Partial<BattleScriptRulesBattler>` input
 * (every caller's `changes.maxHP`/`changes.item` was discarded; `item` was
 * hardcoded `0`), so `createBattleScriptRulesContext`'s own `maxHP:
 * battler.maxHP ?? battler.hp` default would have silently collapsed to
 * Onix's CURRENT hp (1) instead of its real 117 -- wrongly failing the
 * Sitrus gate (`hp <= maxHP/2`). `387a34a1` fixed that gap directly in the
 * shared helper (now forwards `maxHP`/`item` verbatim, pinned by
 * `tests/stagePlayerHitChainMaxHpItem.test.ts`), so this module's own former
 * local workaround (its own `battler()` + direct
 * `createBattleScriptRulesContext`/`createBattleScriptStatusRulesExecution`/
 * `stepBattleScriptMachine` loop) is retired in favor of the shared seam.
 */
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptMachineState, BattleScriptOpcodeHandlers } from "./battleScriptMachine.ts";
import { stagePlayerHitChainToTerminalMachineState } from "./turn1RockSlidePresentationStaging.ts";
import { runBattleScriptFaintedActionsOrchestration } from "./battleScriptFaintedActionsOrchestration.ts";
import { runBattleEndTurnOrchestration } from "./battleEndTurnOrchestration.ts";
import { resolveBattleNameWithPrefix, resolveBattleStringLines } from "./battleStringResolver.ts";
import { rentalMoveset } from "./battleSetup.ts";
import {
  createLatestCompletedCommandHandoff,
  type LatestCompletedCommandHandoff,
} from "./nextCommandHandoff.ts";
import {
  frontYOffset,
  opponentFaintSinkGeometry,
  type Turn13FaintSinkGeometry,
} from "./turn13ResolutionAdapter.ts";
import speciesNamesAsset from "../data/gen/species-names.json" with { type: "json" };
import itemNamesAsset from "../data/gen/item-names.json" with { type: "json" };
import itemHoldEffectsAsset from "../data/gen/item-hold-effects.json" with { type: "json" };

type SpeciesNamesAsset = Readonly<{ species: readonly Readonly<{ species: string; name: string }>[] }>;
function speciesDisplayName(speciesId: number): string {
  const entry = (speciesNamesAsset as SpeciesNamesAsset).species[speciesId];
  if (entry === undefined) {
    throw new Error(`turn5ResolutionAdapter: species-names.json has no entry for species id ${speciesId}`);
  }
  return entry.name;
}

type ItemHoldEffectsAsset = Readonly<{ items: readonly Readonly<{ item: string; itemId: number }>[] }>;
type ItemNamesAsset = Readonly<{ items: readonly Readonly<{ item: string; name: string }>[] }>;
function itemDisplayName(itemId: number): string {
  const holdEffectEntry = (itemHoldEffectsAsset as ItemHoldEffectsAsset).items.find((row) => row.itemId === itemId);
  if (!holdEffectEntry) {
    throw new Error(`turn5ResolutionAdapter: item-hold-effects.json has no entry for item id ${itemId}`);
  }
  const nameEntry = (itemNamesAsset as ItemNamesAsset).items.find((row) => row.item === holdEffectEntry.item);
  if (!nameEntry) {
    throw new Error(`turn5ResolutionAdapter: item-names.json has no entry for ${holdEffectEntry.item}`);
  }
  return nameEntry.name;
}

/** docs/battle-turn-notes.md §13 / species-names.json array indices. */
const SPECIES_ONIX = 95;
const SPECIES_GROVYLE = 278;
const SPECIES_MURKROW = 198;
const SPECIES_PIDGEOTTO = 17;
/** src/data/gen/moves.json MOVE_STRENGTH -- staged in place of ROCK_SLIDE, see this module's own top doc and turn5FaintPresentationStaging.ts's own module doc for the unrelated barrier this substitution avoids. */
const STAGED_MOVE = 70;
/** turn5FaintPresentationStaging.ts's own committed KO_HIT_SEED (battleScriptHitChainOpcode.test.ts:1408). */
const KO_HIT_SEED = 919694434;
/** include/constants/battle.h:78 -- Factory always sets this bit; gates Cmd_getexp's own Frontier short-circuit. */
const BATTLE_TYPE_FACTORY = 1 << 19;
/** src/data/gen/item-hold-effects.json ITEM_SITRUS_BERRY (HOLD_EFFECT_RESTORE_HP, param 30). */
const ITEM_SITRUS_BERRY = 142;
/** STRINGID_PKMNSITEMRESTOREDHEALTH's own real messageId (battle_message.c:492,805), reused verbatim, not fabricated. */
const STRINGID_PKMNSITEMRESTOREDHEALTH = "STRINGID_PKMNSITEMRESTOREDHEALTH";

/**
 * ISSUES #39 rank-3 flip: Grovyle's own opponent-faint sink geometry, the
 * SAME generic formula `turn13ResolutionAdapter.ts`'s own
 * `opponentFaintSinkGeometry` already applies for Pidgeotto's faint
 * (`createBattleResolutionPresentation`'s own `steps = 8 - floor(yOffset/8)`,
 * `healthboxVanishFrame = 2*steps+3`), evaluated here for Grovyle's real
 * front-pic `yOffset` (`mon-pic-coords.json`) instead of `battleScene.ts`'s
 * own hand-fit `GROVYLE_FAINT_SINK_STEPS`/`GROVYLE_HEALTHBOX_VANISH_TICK`.
 */
export function resolveTurn5FaintSinkGeometry(): Turn13FaintSinkGeometry {
  return opponentFaintSinkGeometry(frontYOffset("GROVYLE"));
}

/**
 * DESTIN's real turn-5 bench (`docs/onix-readylag-destin-bench-probes.md`
 * Probe 2, `tests/destinCanonicalReplacements.test.ts`'s own proven
 * fixture): GROVYLE (slot 0, this hit's own real fainting target), MURKROW
 * (slot 1, full HP, never sent out this turn), PIDGEOTTO (slot 2, full HP,
 * the real winner). Onix's own player-side bench needs only itself (the
 * other benched mons are never read once `playerHp !== 0`).
 */
const TURN5_PARTY = Object.freeze({
  player: Object.freeze([
    { species: SPECIES_ONIX, hp: 1, level: 50 },
    { species: 0, hp: 0 },
    { species: 0, hp: 0 },
    { species: 0, hp: 0 },
    { species: 0, hp: 0 },
    { species: 0, hp: 0 },
  ]),
  opponent: Object.freeze([
    { species: SPECIES_GROVYLE, hp: 0, moves: [210, 283, 280, 104] as const }, // fainting this turn
    {
      species: SPECIES_MURKROW, hp: 142, level: 50,
      attack: 91, defense: 69, speed: 97, spAttack: 91, spDefense: 69,
      abilityNum: 0, moves: [185, 19, 259, 269] as const,
    },
    {
      species: SPECIES_PIDGEOTTO, hp: 156, level: 50,
      attack: 98, defense: 61, speed: 77, spAttack: 56, spDefense: 56,
      moves: [332, 98, 297, 28] as const,
    },
    { species: 0, hp: 0 },
    { species: 0, hp: 0 },
    { species: 0, hp: 0 },
  ]),
});

export type Turn5ResolutionAdapterMachineState = Readonly<{
  program: BattleScriptProgram;
  handlers: BattleScriptOpcodeHandlers<BattleScriptRulesContext>;
  state: BattleScriptMachineState<BattleScriptRulesContext>;
}>;

/**
 * Same real battlers/move/seed `turn5FaintPresentationStaging.ts` stages
 * (Onix hp 1, attack 51/defense 187/spAttack 36/spDefense 72, ROCK/GROUND;
 * Grovyle hp 1, attack 103/defense 56/spAttack 91/spDefense 71, GRASS/GRASS;
 * MOVE_STRENGTH substituted for ROCK_SLIDE), plus Onix's own real Sitrus
 * Berry item and maxHP (needed for this slice's own new Sitrus stage, inert
 * during the KO/faint script itself) and the real party/topology (needed to
 * chain into the fainted-actions orchestration, also inert during the KO
 * script itself -- same non-interference rank 2's own module doc notes).
 */
export function stageTurn5KoHitChainToTerminalMachineState(): Turn5ResolutionAdapterMachineState {
  return stagePlayerHitChainToTerminalMachineState({
    attacker: {
      hp: 1,
      maxHP: 117,
      species: SPECIES_ONIX,
      attack: 51,
      defense: 187,
      spAttack: 36,
      spDefense: 72,
      types: ["TYPE_ROCK", "TYPE_GROUND"],
      moves: [STAGED_MOVE, 0, 0, 0],
      pp: [10, 0, 0, 0],
      item: ITEM_SITRUS_BERRY,
    },
    target: {
      hp: 1,
      species: SPECIES_GROVYLE,
      attack: 103,
      defense: 56,
      spAttack: 91,
      spDefense: 71,
      types: ["TYPE_GRASS", "TYPE_GRASS"],
      partyIndex: 0,
    },
    currentMove: STAGED_MOVE,
    currentMovePosition: 0,
    moveEffectByte: 0,
    rngSeed: KO_HIT_SEED,
    party: TURN5_PARTY,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: BATTLE_TYPE_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  });
}

export type Turn5SwitchInAdapter = Readonly<{
  replacementSpecies: string;
  replacementPartyIndex: number;
  replacementLevel: number;
  replacementHp: Readonly<{ current: number; max: number }>;
  /** "out PIDGEOTTO!" -- the real STRINGID_SWITCHINMON line-2 shape, sourced from the real switched-in species. */
  sentOutLine2: string;
}>;

/**
 * Stages DESTIN's real turn-5 forced-switch dance and returns the typed
 * facts an eventual flip of `battleScene.ts`'s switch-in dispatcher would
 * consume. Throws if the staged chain does not resume with a healthy
 * replacement -- a real machine boundary this window's own real turn 5
 * never crosses.
 */
export function resolveTurn5SwitchInAdapter(): Turn5SwitchInAdapter {
  const { program, handlers, state } = stageTurn5KoHitChainToTerminalMachineState();
  const result = runBattleScriptFaintedActionsOrchestration(program, handlers, state);
  if (result.kind !== "resumed") {
    throw new Error(
      `turn5ResolutionAdapter: expected the forced-switch dance to resume with a healthy `
        + `replacement, got "${result.kind}" instead`,
    );
  }
  const replacement = result.state.rulesContext.battlers[1];
  const replacementSpecies = speciesDisplayName(replacement.species);
  return Object.freeze({
    replacementSpecies,
    replacementPartyIndex: replacement.partyIndex,
    replacementLevel: replacement.level,
    replacementHp: Object.freeze({ current: replacement.hp, max: replacement.maxHP }),
    sentOutLine2: `out ${replacementSpecies}!`,
  });
}

export type Turn5SitrusAdapter = Readonly<{
  hp: Readonly<{ from: number; to: number }>;
  healLines: readonly string[];
  itemConsumed: boolean;
}>;

/**
 * Chains the switch-in's own "resumed" state into
 * `runBattleEndTurnOrchestration` (the real `BattleTurnPassed` port) to
 * reach Onix's own real Sitrus Berry proc -- this slice's own new stage,
 * absent from rank 2's window. Throws if the end-turn pass does not settle
 * on `"next-turn"`, or if it does not emit Onix's own Sitrus heal message --
 * both real machine boundaries this window's own real turn 5 never crosses,
 * not silently-wrong defaults.
 */
export function resolveTurn5SitrusAdapter(): Turn5SitrusAdapter {
  const { program, handlers, state } = stageTurn5KoHitChainToTerminalMachineState();
  const faintedResult = runBattleScriptFaintedActionsOrchestration(program, handlers, state);
  if (faintedResult.kind !== "resumed") {
    throw new Error(
      `turn5ResolutionAdapter: expected the forced-switch dance to resume with a healthy `
        + `replacement, got "${faintedResult.kind}" instead`,
    );
  }
  const endTurnResult = runBattleEndTurnOrchestration(program, handlers, faintedResult.state);
  if (endTurnResult.kind !== "next-turn") {
    throw new Error(
      `turn5ResolutionAdapter: expected the end-turn pass to settle on "next-turn", `
        + `got "${endTurnResult.kind}" instead`,
    );
  }

  const onix = endTurnResult.state.rulesContext.battlers[0];
  const events = endTurnResult.state.events;
  const hpChangeEvent = [...events].reverse().find((event) => event.kind === "hp-change" && event.battler === 0);
  if (!hpChangeEvent || hpChangeEvent.kind !== "hp-change") {
    throw new Error("turn5ResolutionAdapter: end-turn pass did not emit Onix's own hp-change event");
  }
  const messageEvent = [...events].reverse().find(
    (event) => event.kind === "message" && event.messageId === STRINGID_PKMNSITEMRESTOREDHEALTH,
  );
  if (!messageEvent || messageEvent.kind !== "message") {
    throw new Error("turn5ResolutionAdapter: end-turn pass did not emit Onix's own Sitrus heal message");
  }

  const healLines = resolveBattleStringLines(messageEvent.messageId, {
    B_SCR_ACTIVE_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_ONIX) }),
    B_LAST_ITEM: () => itemDisplayName(ITEM_SITRUS_BERRY),
  });

  return Object.freeze({
    hp: Object.freeze({ from: hpChangeEvent.from, to: onix.hp }),
    healLines,
    itemConsumed: onix.item === 0,
  });
}

/**
 * Typed predecessor receipt for the next FIGHT command after turn 5.
 *
 * This deliberately does not project from this module's staged hit chain:
 * that chain substitutes STRENGTH and starts its local PP at `[10, 0, 0, 0]`
 * so it is useful for the already-owned KO/switch/Sitrus content, but not for
 * the real cumulative menu receipt. The immutable tuple below is the
 * completed canonical command boundary: ROCK_SLIDE has four prior uses
 * (turns 1, 3, 4, and 5), and DRAGON_BREATH has its one prior turn-2 use.
 * Switch-in and Sitrus facts remain in their existing dedicated adapters.
 */
export type Turn5CompletedResolutionNextCommandHandoff = Readonly<{
  /** Exact post-turn-5 player PP for `[ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM]`. */
  playerPp: readonly [number, number, number, number];
  /** `gMoveSelectionCursor` retained from turn 5's ROCK_SLIDE command. */
  persistedMoveSlot: 0;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Publishes turn 5's completed-command facts independently of the staged
 * content adapter. The existing live menu formula is the evidence for this
 * four-command cumulative receipt; it must not be inferred from adapter
 * presence or from a later turn's resolution owner.
 */
export function resolveTurn5CompletedResolutionNextCommandHandoff(): Turn5CompletedResolutionNextCommandHandoff {
  const [rockSlide, bind, dragonBreath, sandstorm] = rentalMoveset("ONIX").maxPP;
  return Object.freeze({
    playerPp: Object.freeze([
      rockSlide - 4,
      bind,
      dragonBreath - 1,
      sandstorm,
    ]) as readonly [number, number, number, number],
    persistedMoveSlot: 0 as const,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/** Normalizes the legacy turn-5 receipt into the generic command boundary. */
export function resolveTurn5LatestCompletedCommandHandoff(): LatestCompletedCommandHandoff {
  return createLatestCompletedCommandHandoff(
    resolveTurn5CompletedResolutionNextCommandHandoff(),
  );
}

/** Typed gate shared by the core's next-FIGHT reopen and its dispatcher. */
export function isTurn5NextCommandHandoffReady(
  handoff: Turn5CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn5CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
