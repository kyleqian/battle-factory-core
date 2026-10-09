// S10A gdgeo (docs/giga-drain-geometry-order.md): the Giga Drain body's (202) sprite-order plan is keyed by the battlers' live
// geometry. The plan comes from src/animation/gigaDrain.ts's own timeline (gigaDrainSpriteOrderPlanText: the renderer's orb
// arithmetic), at the attacker / target picture coordinates the live adapter uses (liveMoveAnimation.ts `case 202`: the target's
// animationCenter and the attacker's picOffsetPoint, both GetBattlerSpriteCoord X_2 / Y_PIC_OFFSET of the species corner).
import { gigaDrainSpriteOrderPlanText } from "../animation/gigaDrain.ts";
import { megaDrainSpriteOrderPlanText } from "../animation/megaDrain.ts";
import { battleCommandFieldSpeciesSpriteOrigin, createBattleCommandFieldArtView } from "./battleCommandFieldArt.ts";

/** The species shown on each side at the body (a Substitute doll still anchors on its species: GetBattlerSpriteCoord). */
export interface SpriteOrderBodyGeometry {
  readonly playerSpecies: number;
  readonly opponentSpecies: number;
}

/** BATTLER_COORD_X_2 / Y_PIC_OFFSET of a side's species (player +8, clamped at 104), as liveBattlerAnchors' picOffsetPoint. */
function picOffsetPoint(art: ReturnType<typeof createBattleCommandFieldArtView>, side: "player" | "opponent") {
  const corner = battleCommandFieldSpeciesSpriteOrigin(art[side], side);
  return { x: corner.x + 32, y: Math.min(104, corner.y + 32 + (side === "player" ? 8 : 0)) };
}

/** The orb arc's end points (target start, attacker = absorption / healing centre) for the species, or null without a battle picture. */
export function gigaDrainOrderCenters(
  attackerSide: "player" | "opponent", geometry: SpriteOrderBodyGeometry,
): Readonly<{ attacker: Readonly<{ x: number; y: number }>; target: Readonly<{ x: number; y: number }> }> | null {
  let art: ReturnType<typeof createBattleCommandFieldArtView>;
  try {
    art = createBattleCommandFieldArtView({ player: { species: geometry.playerSpecies }, opponent: { species: geometry.opponentSpecies } } as never);
  } catch {
    return null;
  }
  return { attacker: picOffsetPoint(art, attackerSide), target: picOffsetPoint(art, attackerSide === "player" ? "opponent" : "player") };
}

/** Body 202's plan text for the attacker side and the two species, or null when a species has no battle picture. */
export function gigaDrainSpriteOrderPlanForGeometry(
  attackerSide: "player" | "opponent", geometry: SpriteOrderBodyGeometry,
): string | null {
  const centers = gigaDrainOrderCenters(attackerSide, geometry);
  return centers === null ? null : gigaDrainSpriteOrderPlanText(centers.target, centers.attacker, attackerSide, centers.attacker);
}

/** Body 72's (Mega Drain: the same orb family, MegaDrainAbsorbEffect) plan text for the attacker side and the two species. */
export function megaDrainSpriteOrderPlanForGeometry(
  attackerSide: "player" | "opponent", geometry: SpriteOrderBodyGeometry,
): string | null {
  const centers = gigaDrainOrderCenters(attackerSide, geometry);
  return centers === null ? null : megaDrainSpriteOrderPlanText(centers.target, centers.attacker, attackerSide, centers.attacker);
}
