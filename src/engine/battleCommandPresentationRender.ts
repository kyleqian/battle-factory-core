import type { BattleCommandPresentationState } from "./battleCommandPresentation.ts";

/**
 * The command renderer owns phase selection only. Field and chrome assembly
 * stay injectable until the later asset/data slices make those layers fully
 * species- and healthbox-generic.
 */
export type BattleCommandPresentationRenderAssets = Readonly<{
  drawActionMenu(
    framebuffer: Uint8Array,
    presentation: BattleCommandPresentationState,
    revealed: boolean,
  ): void;
  drawFightMenu(
    framebuffer: Uint8Array,
    presentation: BattleCommandPresentationState,
  ): void;
}>;

/**
 * Renders one typed command lifecycle without consulting encounter identity
 * or any scene/trace clock. Open, close, cursor-display, and reopen timing are
 * represented entirely by the presentation's phase-relative lifecycle.
 */
export function renderBattleCommandPresentation(
  framebuffer: Uint8Array,
  presentation: BattleCommandPresentationState,
  assets: BattleCommandPresentationRenderAssets,
): void {
  switch (presentation.lifecycle.phase) {
    case "action-enter":
      assets.drawActionMenu(framebuffer, presentation, false);
      return;
    case "action-menu":
    case "fight-opening":
      assets.drawActionMenu(framebuffer, presentation, true);
      return;
    case "fight-menu":
    case "fight-closing":
      assets.drawFightMenu(framebuffer, presentation);
      return;
    case "party-handoff":
    case "submitting":
      return;
  }
}
