import type {
  BattleCommandFieldBattler,
  BattleCommandPresentationState,
} from "./battleCommandPresentation.ts";
import {
  buildFightMoveset,
  type FightMoveset,
} from "./fightSubmenuText.ts";
import type { HealthboxContentParams } from "./healthboxAssembly.ts";

export type BattleCommandPlayerHealthboxRenderParams =
  HealthboxContentParams
  & Readonly<{ currentHp: number; maxHp: number }>;

export type BattleCommandPresentationRenderView = Readonly<{
  field: BattleCommandPresentationState["field"];
  healthboxes: Readonly<{
    player: BattleCommandPlayerHealthboxRenderParams;
    opponent: HealthboxContentParams;
  }>;
  fightMenu: Readonly<{
    moveset: FightMoveset;
    displayCursor: 0 | 1 | 2 | 3;
  }>;
}>;

function healthboxParams(
  battler: BattleCommandFieldBattler,
): HealthboxContentParams {
  return Object.freeze({
    name: battler.name,
    level: battler.level,
    gender: battler.gender === "genderless" ? "none" : battler.gender,
    hpFraction: battler.hp / battler.maxHP,
    status: battler.status,
  });
}

/**
 * Projects the complete field/FIGHT content from the active battler snapshot.
 * No recorded turn flags participate in live HP, status, moves, or PP.
 */
export function createBattleCommandPresentationRenderView(
  presentation: BattleCommandPresentationState,
): BattleCommandPresentationRenderView {
  return Object.freeze({
    field: presentation.field,
    healthboxes: Object.freeze({
      player: Object.freeze({
        ...healthboxParams(presentation.field.player),
        currentHp: presentation.field.player.hp,
        maxHp: presentation.field.player.maxHP,
      }),
      opponent: healthboxParams(presentation.field.opponent),
    }),
    fightMenu: Object.freeze({
      moveset: buildFightMoveset(
        presentation.field.player.moveIds,
        presentation.field.player.currentPP,
        presentation.field.player.ppBonuses,
      ),
      displayCursor: presentation.fightDisplayCursor,
    }),
  });
}

/**
 * Field art and chrome assembly stay injectable until the later asset/data
 * slices make those layers fully species-generic. The render view passed to
 * both callbacks already owns live FIGHT text and both healthbox projections.
 */
export type BattleCommandPresentationRenderAssets = Readonly<{
  drawActionMenu(
    framebuffer: Uint8Array,
    view: BattleCommandPresentationRenderView,
    revealed: boolean,
  ): void;
  drawFightMenu(
    framebuffer: Uint8Array,
    view: BattleCommandPresentationRenderView,
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
  const view = createBattleCommandPresentationRenderView(presentation);
  switch (presentation.lifecycle.phase) {
    case "action-enter":
      assets.drawActionMenu(framebuffer, view, false);
      return;
    case "action-menu":
    case "fight-opening":
      assets.drawActionMenu(framebuffer, view, true);
      return;
    case "fight-menu":
    case "fight-closing":
      assets.drawFightMenu(framebuffer, view);
      return;
    case "party-handoff":
    case "submitting":
      return;
  }
}
