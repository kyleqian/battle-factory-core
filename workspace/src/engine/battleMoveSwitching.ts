/**
 * ROM SELECT move switching (`HandleInputChooseMove` SELECT branch and `HandleMoveSwitching`,
 * battle_controller_player.c:599-790): the cursor rules and the permutation applied to the
 * battler, its party mon and the packed PP Up / Mimic bits. docs/msw1-select-move-swap.md.
 */
import {
  withBattleScriptPartyMemberMovesPp,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { BATTLE_SCRIPT_STATUS2_TRANSFORMED } from "./battleScriptSourceConstants.ts";

export type MoveSlot = 0 | 1 | 2 | 3;

/**
 * What the move box draws while SELECT switching: the "Switch which?" prompt, the light-gray source arrow (tile 29),
 * and the one remaining arrow (`target`: tile 27, no shadow; `normal`: the ordinary black arrow). `null` slots draw none.
 */
export type FightSwitchView = Readonly<{
  gray: MoveSlot | null;
  arrow: MoveSlot | null;
  arrowKind: "target" | "normal";
}>;

/** `gMultiUsePlayerCursor` on entry: slot 0 unless the cursor is already there, then slot 1 (:603-606). */
export function initialMoveSwitchTarget(cursor: MoveSlot): MoveSlot {
  return cursor !== 0 ? 0 : 1;
}

/** LEFT/RIGHT flip bit 0 and UP/DOWN flip bit 1; a press toward the edge keeps the cursor (:745-835). */
export function moveSwitchTargetAfter(
  target: MoveSlot,
  direction: "LEFT" | "RIGHT" | "UP" | "DOWN",
): MoveSlot {
  if (direction === "LEFT") return ((target & 1) !== 0 ? target ^ 1 : target) as MoveSlot;
  if (direction === "RIGHT") return ((target & 1) === 0 ? target ^ 1 : target) as MoveSlot;
  if (direction === "UP") return ((target & 2) !== 0 ? target ^ 2 : target) as MoveSlot;
  return ((target & 2) === 0 ? target ^ 2 : target) as MoveSlot;
}

function swapped<T>(values: readonly T[], a: number, b: number): T[] {
  const next = [...values];
  next[a] = values[b]!;
  next[b] = values[a]!;
  return next;
}

export function swapPackedPpBonuses(ppBonuses: number, a: number, b: number): number {
  const fieldA = (ppBonuses >> (a * 2)) & 3;
  const fieldB = (ppBonuses >> (b * 2)) & 3;
  let next = ppBonuses & ~((3 << (a * 2)) | (3 << (b * 2)));
  next |= fieldB << (a * 2);
  next |= fieldA << (b * 2);
  return next & 0xff;
}

/** The Mimic mask only follows the move when the source slot's bit is set (:693-697). */
export function swapMimickedMask(mask: number, source: number, target: number): number {
  if ((mask & (1 << source)) === 0) return mask;
  return (mask & ~(1 << source)) | (1 << target);
}

/**
 * Swaps the player battler's move slots `source` and `target` in `gBattleMons` and, unless the
 * battler is Transformed, in its party mon (:673-736).
 */
export function swapBattleScriptBattlerMoves(
  rulesContext: BattleScriptRulesContext,
  battler: 0,
  source: MoveSlot,
  target: MoveSlot,
): BattleScriptRulesContext {
  if (source === target) return rulesContext;
  const mon = rulesContext.battlers[battler]!;
  const moves = Object.freeze(swapped(mon.moves, source, target)) as unknown as typeof mon.moves;
  const pp = Object.freeze(swapped(mon.pp, source, target)) as unknown as typeof mon.pp;
  const ppBonuses = swapPackedPpBonuses(mon.ppBonuses, source, target);
  const switched = Object.freeze({
    ...mon,
    moves,
    pp,
    ppBonuses,
    mimickedMoves: swapMimickedMask(mon.mimickedMoves, source, target),
  });
  const next = Object.freeze({
    ...rulesContext,
    battlers: Object.freeze(rulesContext.battlers.map((candidate, index) =>
      index === battler ? switched : candidate)) as unknown as typeof rulesContext.battlers,
  }) as BattleScriptRulesContext;
  if ((mon.status2 & BATTLE_SCRIPT_STATUS2_TRANSFORMED) !== 0) return next;
  const member = rulesContext.party.player[mon.partyIndex]!;
  const party = withBattleScriptPartyMemberMovesPp(
    rulesContext.party,
    0,
    mon.partyIndex,
    Object.freeze(swapped(member.moves, source, target)) as unknown as typeof member.moves,
    Object.freeze(swapped(member.pp, source, target)) as unknown as typeof member.pp,
    swapPackedPpBonuses(member.ppBonuses, source, target),
  );
  return Object.freeze({ ...next, party });
}
