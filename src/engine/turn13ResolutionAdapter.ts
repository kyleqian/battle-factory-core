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
 * FINDING (named, not silently skipped): the forced-switch decision itself
 * (DESTIN choosing MURKROW) and the Murkrow switch-in are NOT staged here.
 * `runBattleScriptFaintedActionsOrchestration`
 * (`battleScriptFaintedActionsOrchestration.ts`) is the real
 * `HandleFaintedMonActions` port and `battleAiSwitchInto.ts`
 * (`getMostSuitableMonToSwitchInto`) is the real AI scoring function it
 * calls through `battleScriptOpenPartyScreenOpcode.ts` -- both already
 * exist and are the correct next machinery -- but chaining onto them here
 * needs two things this slice does not have: (1) the DRAGON_BREATH hit
 * chain's own terminal `BattleScriptMachineState`, which
 * `turn1RockSlidePresentationStaging.ts`'s `stagePlayerHitChain` (entry
 * 751's own staging seam) does not expose (only
 * `{events, rngValueAfter, attacker, target}`); (2) DESTIN's real remaining
 * bench (species/moves/stats past PIDGEOTTO), which is not RAM-probed
 * anywhere in this repo yet (`docs/forced-switch-ground-truth.md` has no
 * turn-13/DESTIN/MURKROW rows). Fabricating either would violate this
 * codebase's no-guessing discipline, so this half stays unowned here -- see
 * this slice's final report for the concrete unblock.
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
import {
  resolveTurn13DragonBreathFaintLines,
  resolveTurn13DragonBreathHpEndpoints,
  resolveTurn13DragonBreathKickoffLines,
  resolveTurn13DragonBreathWindowContent,
  turn13DragonBreathHasParalysisStatusChange,
} from "./turn13DragonBreathPresentationStaging.ts";

type MonPicCoordsAsset = Readonly<{
  front: Readonly<Record<string, Readonly<{ yOffset: number }>>>;
}>;

function frontYOffset(speciesSymbol: string): number {
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
 * "Missing bridge" column): this adapter does not own the forced-switch
 * decision, the Murkrow switch-in, or the turn-14 handoff. See this
 * module's own top doc for exactly what is missing and why.
 */
export const TURN13_FORCED_SWITCH_AND_MURKROW_SWITCHIN_NOT_STAGED = true;
