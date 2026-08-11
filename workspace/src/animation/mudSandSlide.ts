export type MudSandAttackerSide = "player" | "opponent";

const OPPONENT_SLIDE_MAGNITUDES: readonly number[] = [3, 6, 9, 9, 9, 4, 0];
const PLAYER_SLIDE_MAGNITUDES: readonly number[] = [4, 7, 10, 10, 10, 5, 0];

/**
 * Shared `gSlideMonToOffsetSpriteTemplate` /
 * `gSlideMonToOriginalPosSpriteTemplate` choreography. The script requests
 * x=-10; `SlideMonToOffset` mirrors it for an opponent-side attacker. The
 * one-pixel side asymmetry is the source fixed-point rounding result.
 */
export function mudSandAttackerX2AtAge(
  age: number,
  attackerSide: MudSandAttackerSide,
  firstDisplayAge: number,
): number {
  const magnitudes = attackerSide === "opponent"
    ? OPPONENT_SLIDE_MAGNITUDES
    : PLAYER_SLIDE_MAGNITUDES;
  const magnitude = magnitudes[age - firstDisplayAge] ?? 0;
  if (magnitude === 0) return 0;
  return attackerSide === "opponent" ? magnitude : -magnitude;
}
