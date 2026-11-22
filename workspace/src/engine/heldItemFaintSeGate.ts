// itm1 (docs/aud251-s11-scoreboard-refresh.md "itm1"): OpponentHandleBattleAnimation / PlayerHandleBattleAnimation hold a general animation while
// IsBattleSEPlaying (battle_gfx_sfx_util.c), so the held-item animation after a faint starts no earlier than SE_FAINT + FAINT_SE_ROWS.
import { HELD_ITEM_EFFECT_COMMAND_FRAMES, type BattleResolutionPresentationCommand, type BattleResolutionPresentationState } from "./battleResolutionPresentation.ts";
import { battleResolutionCommandFallbackDuration } from "./battleResolutionPresentationRender.ts";
import { faintSeOffsetRows } from "./battleHitSounds.ts";

/** ROM (aud252 seeds 1914 / 2230, Scene ON): the first held-item SE lands 61 rows after SE_FAINT = 8 + 53; 51 here is the engine's row convention (faintSeOffsetRows is 2 rows late). */
export const FAINT_SE_ROWS = 51;
/** The controller's soundTimer force-stops a still-playing SE after 30 polls (IsBattleSEPlaying). */
const SE_GATE_CAP = 29;

function isGatePassthrough(command: BattleResolutionPresentationCommand): boolean {
  return command.type === "status" || command.type === "sprite-visibility";
}

/**
 * Called when the faint's button message is dismissed (`messageElapsed` = its rows so far): when only status / sprite-visibility commands lie between
 * the faint and a Scene ON held-item animation, the animation command's `minimumFrames` becomes its planned value + the rows SE_FAINT still has to play.
 * The command's timing object is the one mutable object in a plan (planned unfrozen, `baseMinimumFrames` kept beside it): the next-command handoff and
 * the retained-resolution guards compare segment / command identity, so the plan cannot be rebuilt; the write is a pure function of the dismissal row.
 */
export function applyHeldItemFaintSeGate(state: BattleResolutionPresentationState, messageElapsed: number): void {
  const segment = state.segments[state.segmentIndex];
  if (segment === undefined) return;
  const commands = segment.commands;
  const messageIndex = state.commandIndex;
  if (commands[messageIndex]?.type !== "message") return;
  let heldIndex = messageIndex + 1;
  let afterMessage = 0;
  while (commands[heldIndex] !== undefined && isGatePassthrough(commands[heldIndex]!)) {
    afterMessage += battleResolutionCommandFallbackDuration(commands[heldIndex]!);
    heldIndex += 1;
  }
  const held = commands[heldIndex];
  if (held?.type !== "general-animation" || held.animation !== "HELD_ITEM_EFFECT" || Object.isFrozen(held.timing)) return;
  const timing = held.timing as { minimumFrames: number; baseMinimumFrames?: number };
  const base = timing.baseMinimumFrames ?? timing.minimumFrames;
  timing.baseMinimumFrames = base;
  timing.minimumFrames = base;
  if (base < HELD_ITEM_EFFECT_COMMAND_FRAMES) return;
  let faintIndex = messageIndex - 1;
  let beforeMessage = 0;
  while (faintIndex >= 0 && isGatePassthrough(commands[faintIndex]!)) {
    beforeMessage += battleResolutionCommandFallbackDuration(commands[faintIndex]!);
    faintIndex -= 1;
  }
  const faint = commands[faintIndex];
  if (faint?.type !== "faint") return;
  const seOffset = faintSeOffsetRows({ ...state, commandIndex: faintIndex });
  if (seOffset === null) return;
  const age = battleResolutionCommandFallbackDuration(faint) - seOffset + beforeMessage + messageElapsed + afterMessage;
  const lead = base - HELD_ITEM_EFFECT_COMMAND_FRAMES;
  timing.minimumFrames = base + Math.max(0, Math.min(SE_GATE_CAP, FAINT_SE_ROWS - age - lead));
}
