// obr251: the opponent's mid-battle party-status summary (faint replacement / AI switch): slide-in, hold, BLDALPHA fade-out and its SE.
// Source: PlayerHandle/OpponentHandleDrawPartyStatusSummary (battle_controller_opponent.c:1925-1965), CreatePartyStatusSummarySprites
// (battle_interface.c:1490-1670: the balls copy the bar's x2/y2 through SpriteCB_StatusSummaryBalls_OnSwitchout, no per-ball stagger),
// SpriteCB_StatusSummaryBar_Enter (OPP_BAR_X2) and Task_HidePartyStatusSummary_DuringBattle (:1779-1806). Read-only reuse of the
// battleScene.ts intro tables; the intro tray (ballIcons / drawBallIcons) is untouched.
import { emitSound } from "../audio/soundEvents.ts";
import {
  OPP_BAR_X2,
  ballDisplay,
  blendedSetPixel,
  drawBallStatusBar,
} from "./battleScene.ts";
import type { BattleResolutionPresentationCommand, BattleResolutionPresentationState, PartyBallState } from "./battleResolutionPresentation.ts";
import { SE_BALL_TRAY_ENTER } from "./screenSounds.ts";
import {
  OPPONENT_SUMMARY_FADE_DELAY_FRAMES,
  OPPONENT_SUMMARY_FADE_FRAMES,
  OPPONENT_SUMMARY_SLIDE_FRAMES,
} from "./midBattleOpponentPartySummaryTiming.ts";

/** Display lag from bar creation to the first drawn frame. */
const CREATE_DISPLAY_LAG = 1;

const BAR_Y = 40;
const BAR_X = -24;
const ICON_X = 26;
const ICON_Y = 32;

export type OpponentPartySummaryView = Readonly<{
  states: readonly PartyBallState[];
  /** Frames since the draw command began, minus its script lead (< 0 before the bar exists). */
  createAge: number;
  /** Frames since the hide command began; null while the summary is shown. */
  fadeAge: number | null;
}>;

export type OpponentPartySummaryFrame = Readonly<{ x2: number; eva: number | null }>;

/** The bar's x2 and OBJ blend coefficient at this view's age, or null when nothing is drawn. */
export function opponentPartySummaryFrame(view: Pick<OpponentPartySummaryView, "createAge" | "fadeAge">): OpponentPartySummaryFrame | null {
  const slide = view.createAge - CREATE_DISPLAY_LAG;
  if (slide < 0) return null;
  const x2 = OPP_BAR_X2[Math.min(slide, OPPONENT_SUMMARY_SLIDE_FRAMES - 1)]!;
  if (view.fadeAge === null) return Object.freeze({ x2, eva: null });
  const step = view.fadeAge - OPPONENT_SUMMARY_FADE_DELAY_FRAMES;
  if (step <= 0) return Object.freeze({ x2, eva: null });
  if (step >= OPPONENT_SUMMARY_FADE_FRAMES) return null;
  return Object.freeze({ x2, eva: OPPONENT_SUMMARY_FADE_FRAMES - step });
}

/** CreatePartyStatusSummarySprites' `oam.tileNum += n` (battle_interface.c:1546-1586): healthy 0, empty 1, status 2, fainted 3. */
function ballTileOffset(state: PartyBallState): number {
  return state === "empty" ? 1 : state === "status" ? 2 : state === "fainted" ? 3 : 0;
}

export function drawOpponentPartySummary(fb: Uint8Array, view: OpponentPartySummaryView): void {
  const frame = opponentPartySummaryFrame(view);
  if (frame === null) return;
  const { x2, eva } = frame;
  drawBallStatusBar(fb, BAR_X + x2, BAR_Y, true, eva);
  for (let index = 0; index < 6; index += 1) {
    const tile = ballDisplay.tileset.tiles[ballTileOffset(view.states[5 - index] ?? "empty")];
    if (!tile) continue;
    for (let py = 0; py < 8; py += 1) {
      for (let px = 0; px < 8; px += 1) {
        const colorIndex = tile[py * 8 + px]!;
        if (colorIndex === 0) continue;
        const color = ballDisplay.palette[colorIndex];
        if (color) blendedSetPixel(fb, ICON_X + index * 10 + x2 + px, ICON_Y + py, color, eva);
      }
    }
  }
}

function currentCommand(
  resolution: BattleResolutionPresentationState | null,
): Readonly<{ command: BattleResolutionPresentationCommand; elapsed: number }> | null {
  if (resolution === null || resolution.lifecycle.phase !== "presenting") return null;
  const command = resolution.segments[resolution.segmentIndex]?.commands[resolution.commandIndex];
  return command === undefined ? null : { command, elapsed: resolution.lifecycle.phaseElapsed };
}

/** CreatePartyStatusSummarySprites' `PlaySE12WithPanning(SE_BALL_TRAY_ENTER, 0)`, at the bar's creation (both scenes). Write-only. */
export function emitOpponentPartySummarySounds(
  before: BattleResolutionPresentationState | null,
  after: BattleResolutionPresentationState | null,
): void {
  const now = currentCommand(after);
  if (now === null) return;
  const { command, elapsed } = now;
  if (command.type !== "party-summary" || !command.visible || command.battler !== 1) return;
  const lead = command.timing?.leadFrames ?? 0;
  const prior = currentCommand(before);
  const previous = prior !== null && prior.command === command ? prior.elapsed : -1;
  if (previous < lead && lead <= elapsed) emitSound({ kind: "se", id: SE_BALL_TRAY_ENTER, pan: 0, player: "SE12" });
}
