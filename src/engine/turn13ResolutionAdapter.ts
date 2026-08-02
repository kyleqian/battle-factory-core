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
 * The completed switch-in chain also retains the player-side post-turn
 * command facts. `resolveTurn13CompletedResolutionNextCommandHandoff`
 * publishes that exact predecessor receipt for the following FIGHT reopen:
 * the post-DRAGON_BREATH PP, persisted move slot, and settled redraw/input
 * readiness. It deliberately reads the terminal turn-13 chain, rather than
 * the later retained FLY charge owner, whose player PP belongs to turn 14.
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
import { rentalMoveset } from "./battleSetup.ts";
import {
  createLatestCompletedCommandHandoff,
  type LatestCompletedCommandHandoff,
} from "./nextCommandHandoff.ts";

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
 * Runs the one real turn-13 terminal state through HandleFaintedMonActions.
 * Both the switch-in adapter and the following-command handoff deliberately
 * project this same resumed state, so neither can accidentally borrow facts
 * from the later FLY owner.
 */
function resolveTurn13ResumedRulesContext() {
  const { program, handlers, state } = stageTurn13DragonBreathHitChainToTerminalMachineState();
  const result = runBattleScriptFaintedActionsOrchestration(program, handlers, state);
  if (result.kind !== "resumed") {
    throw new Error(
      `turn13ResolutionAdapter: expected the forced-switch dance to resume with a healthy `
        + `replacement, got "${result.kind}" instead`,
    );
  }
  return result.state.rulesContext;
}

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
  const replacement = resolveTurn13ResumedRulesContext().battlers[1];
  const replacementSpecies = speciesDisplayName(replacement.species);
  return Object.freeze({
    replacementSpecies,
    replacementPartyIndex: replacement.partyIndex,
    replacementLevel: replacement.level,
    replacementHp: Object.freeze({ current: replacement.hp, max: replacement.maxHP }),
    sentOutLine2: `out ${replacementSpecies}!`,
  });
}

/**
 * Typed predecessor receipt for the next FIGHT command after turn 13. The
 * strings model the already-settled redraw controller state at the input
 * edge which installs this receipt; a consumer must require both rather than
 * treating arbitrary adapter presence as input readiness.
 */
export type Turn13CompletedResolutionNextCommandHandoff = Readonly<{
  /** Post-turn-13 DRAGON_BREATH receipt. The separate later FLY owner is 17/20. */
  dragonBreathPp: Readonly<{ current: number; max: number }>;
  /** `gMoveSelectionCursor` carried from the completed DRAGON_BREATH command. */
  persistedMoveSlot: 2;
  /** The following FIGHT reopen is visually settled and may accept input. */
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
}>;

/**
 * Projects the completed turn-13 lifecycle's own post-switch rules context
 * into a handoff for turn 14. The current PP comes from the DRAGON_BREATH
 * chain after its real PP deduction; maximum PP comes from the same active
 * ONIX moveset the menu renders. This must not read a future FLY resolution.
 */
export function resolveTurn13CompletedResolutionNextCommandHandoff(): Turn13CompletedResolutionNextCommandHandoff {
  const rulesContext = resolveTurn13ResumedRulesContext();
  if (rulesContext.currentMovePosition !== 2) {
    throw new Error(
      "turn13ResolutionAdapter: completed DRAGON_BREATH chain did not retain move slot 2",
    );
  }
  const playerPp = rulesContext.battlers[0].pp[2];
  const maxPp = rentalMoveset("ONIX").maxPP[2];
  if (playerPp === undefined || maxPp === undefined) {
    throw new Error("turn13ResolutionAdapter: turn-13 DRAGON_BREATH PP receipt is unavailable");
  }
  return Object.freeze({
    dragonBreathPp: Object.freeze({ current: playerPp, max: maxPp }),
    persistedMoveSlot: 2,
    nextCommand: Object.freeze({ redraw: "settled" as const, input: "ready" as const }),
  });
}

/**
 * Normalizes turn 13's compact legacy receipt into a complete generic PP
 * tuple. The tuple comes from the completed DRAGON_BREATH chain's resumed
 * rules context; the later retained FLY presentation owner is intentionally
 * outside this command boundary.
 */
export function resolveTurn13LatestCompletedCommandHandoff(): LatestCompletedCommandHandoff {
  const legacyHandoff = resolveTurn13CompletedResolutionNextCommandHandoff();
  const rulesContext = resolveTurn13ResumedRulesContext();
  const [rockSlidePp, bindPp, dragonBreathPp, sandstormPp] = rulesContext.battlers[0].pp;
  if (
    rockSlidePp === undefined
    || bindPp === undefined
    || dragonBreathPp === undefined
    || sandstormPp === undefined
  ) {
    throw new Error("turn13ResolutionAdapter: canonical four-slot PP receipt is unavailable");
  }
  return createLatestCompletedCommandHandoff({
    playerPp: [rockSlidePp, bindPp, dragonBreathPp, sandstormPp],
    persistedMoveSlot: legacyHandoff.persistedMoveSlot,
    nextCommand: legacyHandoff.nextCommand,
  });
}

/** Typed gate shared by the core's next-FIGHT reopen and its dispatcher. */
export function isTurn13NextCommandHandoffReady(
  handoff: Turn13CompletedResolutionNextCommandHandoff | null | undefined,
): handoff is Turn13CompletedResolutionNextCommandHandoff {
  return handoff?.nextCommand.redraw === "settled"
    && handoff.nextCommand.input === "ready";
}
