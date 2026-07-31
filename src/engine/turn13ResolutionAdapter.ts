/**
 * ISSUES #39 rank-2 flip (docs/battle-scene-retirement-inventory.md rank-2
 * row): the DRAGON_BREATH -> Pidgeotto faint half of the Turn-13 window
 * (`battleScene.ts:13303-14123`, excluding the already-semantic SAND_ATTACK
 * half, plus replacement helpers `10272-10470`) now sources its HP,
 * kickoff/faint text, and faint-sink geometry from this adapter instead of
 * three separate direct imports of the staging module plus a hand-fit sink
 * constant. Formerly a preview proof
 * (`turn13ResolutionAdapterPreview.ts`/`turn13ResolutionAdapterPreviewEquivalence.test.ts`);
 * `drawDragonBreathKoWindow`/`drawFaintedOpponentWindow` now consume it live.
 *
 * Reuses entry 751's staged real kernel hit chain
 * (`turn13DragonBreathPresentationStaging.ts`, `77cb49d0`) for the HP/faint
 * half -- already oracle-proven (`turn13-dragonbreath-faint.json` 141/141).
 * This slice's own new proof: the faint sink/healthbox-vanish geometry is
 * not an independently-fit legacy constant but the SAME generic formula
 * `createBattleResolutionPresentation`'s own faint-timing branch already
 * bakes in (`battleResolutionPresentation.ts:696-699`,
 * `steps = 8 - floor(yOffset/8)`, `healthboxVanishFrame = 2*steps+3`),
 * evaluated here for Pidgeotto's real front-pic `yOffset`
 * (`mon-pic-coords.json`) instead of battleScene.ts's own hand-fit
 * `TURN13_FAINT_SINK_STEPS`/`faintHealthboxVanishTick` call.
 *
 * SWITCH-IN HALF (rank-2's second flip, this slice): the forced-switch
 * decision (DESTIN choosing MURKROW) and the Murkrow switch-in are now
 * staged too, chaining `stageTurn13DragonBreathHitChainToTerminalMachineState`'s
 * real terminal `BattleScriptMachineState` (`turn13DragonBreathPresentationStaging.ts`,
 * itself built on `turn1RockSlidePresentationStaging.ts`'s additive
 * `stagePlayerHitChainToTerminalMachineState`) straight into
 * `runBattleScriptFaintedActionsOrchestration`
 * (`battleScriptFaintedActionsOrchestration.ts`, the real
 * `HandleFaintedMonActions` port). Its own `openpartyscreen` opcode handler
 * (`battleScriptOpenPartyScreenOpcode.ts`) calls the real AI scoring
 * function (`battleAiSwitchInto.ts`'s `getMostSuitableMonToSwitchInto`,
 * already proven against both of DESTIN's real send-outs in
 * `tests/destinCanonicalReplacements.test.ts`/
 * `docs/destin-canonical-replacements-decision-proof.md`) against DESTIN's
 * real bench (`docs/onix-readylag-destin-bench-probes.md` Probe 2,
 * `docs/battle-turn-notes.md` HEADLINE 3 for MURKROW's full stat block) and
 * the real `switchindataupdate` opcode rebuilds the incoming battler's
 * species/level/HP from that same bench -- no fabricated content.
 * `runFaintedBattlerHandlers`'s own "resumed" result (`battleOutcome`
 * still 0, a real healthy replacement now active) is this window's own
 * real outcome, not a terminal WON/LOST -- the battle genuinely continues
 * into turn 14.
 *
 * Still unowned here, named per this slice's own brief: the turn-14
 * dispatcher and slot-2 PP mirroring (`battleScene.ts`'s `turn13Resolved`/
 * turn-14 consumers, entry 751) -- a later step's own flip, not this one's.
 *
 * Two corrections to this slice's own brief, made explicit so a later flip
 * does not inherit them: (a) the fainting mon is PIDGEOTTO, not "Grovyle" --
 * Grovyle faints at turn 5 (rank 3's own window) and never appears in this
 * window; (b) "forced party select" does not apply -- Pidgeotto and Murkrow
 * are both DESTIN's (the opponent trainer's) own mons, so this is the AI's
 * own automatic replacement (no player decision, no rendered party-select
 * screen). `partySelect.ts`'s typed forced selector
 * (`createPartySelectStateFromForcedSwitch`, line ~162) explicitly throws
 * unless `request.side === "player"` and has no caller on this
 * trainer-side path.
 */
import monPicCoordsData from "../data/gen/mon-pic-coords.json" with { type: "json" };
import speciesNamesAsset from "../data/gen/species-names.json" with { type: "json" };
import {
  resolveTurn13DragonBreathFaintLines,
  resolveTurn13DragonBreathHpEndpoints,
  resolveTurn13DragonBreathKickoffLines,
  resolveTurn13DragonBreathWindowContent,
  stageTurn13DragonBreathHitChainToTerminalMachineState,
  turn13DragonBreathHasParalysisStatusChange,
} from "./turn13DragonBreathPresentationStaging.ts";
import { runBattleScriptFaintedActionsOrchestration } from "./battleScriptFaintedActionsOrchestration.ts";

type MonPicCoordsAsset = Readonly<{
  front: Readonly<Record<string, Readonly<{ yOffset: number }>>>;
}>;

/** Reused by turn5ResolutionAdapter.ts's own faint-sink geometry (the same generic front-pic yOffset lookup, a different species). */
export function frontYOffset(speciesSymbol: string): number {
  const entry = (monPicCoordsData as MonPicCoordsAsset).front[speciesSymbol];
  if (entry === undefined) {
    throw new Error(
      `turn13ResolutionAdapter: mon-pic-coords.json has no front entry for ${speciesSymbol}`,
    );
  }
  return entry.yOffset;
}

export type Turn13FaintSinkGeometry = Readonly<{
  /** Kept top-down tile rows to erase, `createBattleResolutionPresentation`'s own `steps`. */
  steps: number;
  /** Frames from the sink's own start to the opponent healthbox vanishing, relative. */
  healthboxVanishFrame: number;
  minimumFrames: number;
}>;

/**
 * `createBattleResolutionPresentation`'s own opponent-side faint-timing
 * formula (`battleResolutionPresentation.ts:696-699`), reused verbatim here
 * rather than re-derived, evaluated for a real front-pic `yOffset`.
 */
export function opponentFaintSinkGeometry(yOffset: number): Turn13FaintSinkGeometry {
  const steps = 8 - Math.floor(yOffset / 8);
  const healthboxVanishFrame = 2 * steps + 3;
  return Object.freeze({ steps, healthboxVanishFrame, minimumFrames: healthboxVanishFrame + 2 });
}

export type Turn13ResolutionAdapter = Readonly<{
  hp: Readonly<{ from: number; to: number }>;
  kickoffLines: readonly string[];
  faintLines: readonly string[];
  faintedBattler: number;
  hasParalysisStatusChange: boolean;
  faintSink: Turn13FaintSinkGeometry;
}>;

/**
 * The typed resolution facts this window's dispatcher
 * (`drawDragonBreathKoWindow`/`drawFaintedOpponentWindow`, `battleScene.ts`)
 * consumes for its DRAGON_BREATH/faint half, all sourced from entry 751's
 * staged kernel hit chain -- no fabricated content, no turn-number key.
 */
export function resolveTurn13ResolutionAdapter(): Turn13ResolutionAdapter {
  const content = resolveTurn13DragonBreathWindowContent();
  return Object.freeze({
    hp: resolveTurn13DragonBreathHpEndpoints(),
    kickoffLines: resolveTurn13DragonBreathKickoffLines(),
    faintLines: resolveTurn13DragonBreathFaintLines(),
    faintedBattler: content.faint.faintedBattler,
    hasParalysisStatusChange: turn13DragonBreathHasParalysisStatusChange(),
    faintSink: opponentFaintSinkGeometry(frontYOffset("PIDGEOTTO")),
  });
}

/**
 * Named gap marker (docs/battle-scene-retirement-inventory.md rank-2's own
 * "Missing bridge" column), narrowed by this slice: the switch-in decision
 * and the incoming battler's own species/level/HP are now staged below
 * (`resolveTurn13SwitchInAdapter`). Only the turn-14 dispatcher/slot-2 PP
 * mirroring stay unowned -- see this module's own top doc.
 */
export const TURN13_TURN14_HANDOFF_NOT_STAGED = true;

type SpeciesNamesAsset = Readonly<{ species: readonly Readonly<{ species: string; name: string }>[] }>;

function speciesDisplayName(speciesId: number): string {
  const entry = (speciesNamesAsset as SpeciesNamesAsset).species[speciesId];
  if (entry === undefined) {
    throw new Error(`turn13ResolutionAdapter: species-names.json has no entry for species id ${speciesId}`);
  }
  return entry.name;
}

export type Turn13SwitchInAdapter = Readonly<{
  replacementSpecies: string;
  replacementPartyIndex: number;
  replacementLevel: number;
  replacementHp: Readonly<{ current: number; max: number }>;
  /** "out MURKROW!" -- the STRINGID_SWITCHINMON family's own line-2 shape (`battleResolutionPresentation.ts`'s own precedent), sourced from the real switched-in species, not a raw literal. */
  sentOutLine2: string;
}>;

/**
 * Stages DESTIN's real turn-13 forced-switch dance (see this module's own
 * top doc) and returns the typed facts this window's switch-in dispatcher
 * (`drawTurn13SwitchinFieldBase`/`murkrowHealthboxContent`/
 * `TURN13_SWITCHIN_SENTOUT_LINE2`, `battleScene.ts`) consumes. Throws if
 * the staged chain does not resume with a healthy replacement -- a real
 * machine boundary this window's own real turn 13 never crosses, not a
 * silently-wrong default.
 */
export function resolveTurn13SwitchInAdapter(): Turn13SwitchInAdapter {
  const { program, handlers, state } = stageTurn13DragonBreathHitChainToTerminalMachineState();
  const result = runBattleScriptFaintedActionsOrchestration(program, handlers, state);
  if (result.kind !== "resumed") {
    throw new Error(
      `turn13ResolutionAdapter: expected the forced-switch dance to resume with a healthy `
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
