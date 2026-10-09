/**
 * S10A plans54 (docs/next-adapters-plans54.md; ISSUES #155): Eruption's (284) sprite-order body plan, FAIL-CLOSED by geometry.
 *
 * Move_ERUPTION: a simple_palette_blend controller (Cf;D0), two AnimTask_EruptionLaunchRocks waves of 7 rocks each (Cfffffff), six
 * gEruptionFallingRockSpriteTemplate rocks at absolute arguments (Cffffff; D15..D19), then the closing palette blend (Cf). Each launch
 * rock starts at the ATTACKER sprite (CreateEruptionLaunchRocks: x = attacker x -12 / +16, y = GetEruptionLaunchRockInitialYPos = attacker
 * y + y2 + centerToCornerVecY + 74 / 44) and destroys itself once it leaves [-8, 248] x [-8, 120] (UpdateEruptionLaunchRockPos); same-frame
 * destroys enter the free order in sSpriteOrder position (SortSprites by oam.y), so the destroy groups split, merge or swap with the
 * attacker's geometry only (the target is never read: the falling rocks use absolute coordinates, AnimTask_HorizontalShake allocates no
 * sprite). Measured: 2 plans on the opponent side and 3 on the player side over 5 attacker species.
 *
 * The plans below are the ROM receipts, per-frame exact under tools/integration/plans54Check.ts: tools/integration/fixtures/plans51/
 * units.json `er-*` (battle-lab species are INTERNAL ids: plans51's "camerupt" scenarios stage 323 = BARBOACH) and tools/integration/
 * fixtures/plans54/units.json `er-*` (CAMERUPT 340, the only Factory Eruption user). Keyed by (attacker side, attacker species); any other
 * attacker is unproven: null (the host invalidates after the body).
 */
const OPPONENT_GROUND = "Cf;D0;Cfffffff;D5;D7;D3;D1,6;D2;D4;Cfffffff;D12;D14;D10;D8,13;D9;D11;Cffffff;D15;D16;D17;D18;D19;Cf;D20;D21";
const OPPONENT_ELEVATED = "Cf;D0;Cfffffff;D5;D3,7;D1,6;D2;D4;Cfffffff;D12;D10,14;D8,13;D9;D11;Cffffff;D15;D16;D17;D18;D19;Cf;D20;D21";
const PLAYER_PAIRED = "Cf;D0;Cfffffff;D6,5;D7;D3;D1;D2;D4;Cfffffff;D13,12;D14;D10;D8;D9;D11;Cffffff;D15;D16;D17;D18;D19;Cf;D20;D21";
const PLAYER_TALL = "Cf;D0;Cfffffff;D6;D5;D7;D3;D1;D2;D4;Cfffffff;D13;D12;D14;D10;D8;D9;D11;Cffffff;D15;D16;D17;D18;D19;Cf;D20;D21";
const PLAYER_CAMERUPT = "Cf;D0;Cfffffff;D6;D5;D7;D3;D2;D1;D4;Cfffffff;D13;D12;D14;D10;D9;D8;D11;Cffffff;D15;D16;D17;D18;D19;Cf;D20;D21";

/** Attacker species (battle-lab / engine internal id) -> ROM-proven plan, per attacker side. */
export const ERUPTION_PROVEN_SPRITE_ORDER_PLANS: Readonly<Record<"player" | "opponent", Readonly<Record<number, string>>>> = Object.freeze({
  // CAMERUPT 340 (plans54 er-opp-340-95 / -143), BARBOACH 323 (plans51 er-opp-323-95 / -143), SNORLAX 143 (er-opp-143-42);
  // GOLBAT 42 (er-opp-42-95, elevated: D3,7 and D10,14 share a frame).
  opponent: Object.freeze({ 340: OPPONENT_GROUND, 323: OPPONENT_GROUND, 143: OPPONENT_GROUND, 42: OPPONENT_ELEVATED }),
  // BARBOACH 323 (er-ply-323-95 / -143) and GOLBAT 42 (er-ply-42-95): D6,5 / D13,12 share a frame; SNORLAX 143 (er-ply-143-42): separate
  // frames; CAMERUPT 340 (plans54 er-ply-340-95 / -143): separate frames and D2;D1 / D9;D8 swapped.
  player: Object.freeze({ 340: PLAYER_CAMERUPT, 323: PLAYER_PAIRED, 42: PLAYER_PAIRED, 143: PLAYER_TALL }),
});

/** Eruption's plan text at the attacker's displayed species, or null where the geometry is not ROM-proven (fail closed). */
export function eruptionSpriteOrderPlanText(attackerSide: "player" | "opponent", attackerSpecies: number): string | null {
  return Object.hasOwn(ERUPTION_PROVEN_SPRITE_ORDER_PLANS[attackerSide], attackerSpecies)
    ? ERUPTION_PROVEN_SPRITE_ORDER_PLANS[attackerSide][attackerSpecies]! : null;
}
