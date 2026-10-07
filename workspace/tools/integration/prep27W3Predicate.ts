/**
 * prep27 Endeavor W3 (Battle TV stale `gBattleMovePower`): the exact eligibility predicate production must implement (or decline on) and the register it leaves.
 * Source: reference/pokeemerald/src/battle_tv.c: BattleTv_SetDataBasedOnString :540-556 (non-link: only STRINGID_ITDOESNTAFFECT / STRINGID_NOTVERYEFFECTIVE pass),
 * :585-599 (ITDOESNTAFFECT always, NOTVERYEFFECTIVE only if the defender's HP != 0 -> TrySetBattleSeminarShow), TrySetBattleSeminarShow :1419-1451 (early returns),
 * the per-slot CalculateBaseDamage loop :1453-1477 (ShouldCalculateDamage :1508-1546), sVariableDmgMoves :73-85. Only the player controller calls it
 * (battle_controller_player.c:2553), and `printstring` always runs on the player-left controller.
 * Output: node --experimental-strip-types tools/integration/prep27W3Predicate.ts  -> table of the 6 Factory Endeavor carriers + the pinned lab case.
 */
import { readFileSync } from "node:fs";
const moves: Record<string, { id: number; power: number }> = {};
for (const m of JSON.parse(readFileSync("src/data/gen/moves.json", "utf8")).moves) moves[m.move] = { id: m.id, power: m.power };
const VARIABLE = new Set(["COUNTER", "FISSURE", "BIDE", "MIRROR_COAT", "HORN_DRILL", "FLAIL", "REVERSAL", "HIDDEN_POWER", "SHEER_COLD", "FOCUS_PUNCH", "ERUPTION", "WATER_SPOUT",
  "DREAM_EATER", "WEATHER_BALL", "SNORE", "PAIN_SPLIT", "GUILLOTINE", "FRUSTRATION", "RETURN", "ENDEAVOR", "PRESENT", "REVENGE", "MAGNITUDE", "PSYWAVE"].map((n) => `MOVE_${n}`));
export interface W3Context {
  readonly stringId: "ITDOESNTAFFECT" | "NOTVERYEFFECTIVE" | string; readonly targetHp: number; readonly double: boolean; readonly link: boolean;
  readonly attackerSide: "player" | "opponent"; readonly attackerAccStage: number; readonly targetEvaStage: number; readonly currentMove: string;
  readonly palacePikePyramid: boolean; readonly slots: readonly string[]; readonly cursor: number;
}
/** True iff TrySetBattleSeminarShow reaches its CalculateBaseDamage loop (=> the register is overwritten). */
export function w3Runs(c: W3Context): boolean {
  if (c.stringId !== "ITDOESNTAFFECT" && !(c.stringId === "NOTVERYEFFECTIVE" && c.targetHp !== 0)) return false;   // :588-598 (non-link)
  if (c.double || c.link) return false;                                    // :1427
  if (c.attackerSide === "opponent") return false;                         // :1429
  if (c.attackerAccStage < 6) return false;                                 // :1431 (DEFAULT_STAT_STAGE = 6)
  if (c.targetEvaStage > 6) return false;                                   // :1433
  if (c.currentMove === "MOVE_HIDDEN_POWER" || c.currentMove === "MOVE_WEATHER_BALL") return false;   // :1435
  if (c.palacePikePyramid) return false;                                    // :1437
  const sel = c.slots[c.cursor]!; if ((moves[sel]?.power ?? 0) === 0) return false;                      // :1439 power of the SELECTED slot's move
  if (VARIABLE.has(sel)) return false;                                      // :1441-1451 (Magnitude / Psywave are in the second list: also excluded here)
  return true;
}
/** The slots the loop calls CalculateBaseDamage for (ShouldCalculateDamage), in slot order; Magnitude uses powerOverride 10. */
export function w3EligibleSlots(slots: readonly string[]): number[] {
  const out: number[] = [];
  slots.forEach((m, i) => { if ((moves[m]?.power ?? 0) !== 0 && (!VARIABLE.has(m) || m === "MOVE_MAGNITUDE")) out.push(i); });   // PSYWAVE excluded (returns FALSE), Magnitude included
  return out;
}
/** Only the LAST CalculateBaseDamage survives: its (table, unmodified-by-sports/pinch) power. null = no eligible slot. */
export function w3Register(slots: readonly string[]): number | null {
  const e = w3EligibleSlots(slots); if (!e.length) return null; const m = slots[e[e.length - 1]!]!; return m === "MOVE_MAGNITUDE" ? 10 : moves[m]!.power;
}
if (process.argv[1]?.endsWith("prep27W3Predicate.ts")) {
  const mons = JSON.parse(readFileSync("src/data/gen/battle-frontier-mons.json", "utf8")).entries as { index: number; species: string; moves: string[] }[];
  const rows = mons.filter((e) => e.moves.includes("MOVE_ENDEAVOR")).map((e) => ({ set: e.index, species: e.species.replace("SPECIES_", ""), moves: e.moves.map((m) => m.replace("MOVE_", "")),
    eligibleSlots: w3EligibleSlots(e.moves), w3Register: w3Register(e.moves) }));
  const lab = ["MOVE_ROCK_SLIDE", "MOVE_TACKLE", "MOVE_QUICK_ATTACK", "MOVE_ENDEAVOR"];   // tools/battle-lab/rollout-endeavor-endeavor-tv-order.json: [157,33,98,283]; ROM left 40 (docs/rollout-endeavor-prep.md §0.2)
  const out = { carriers: rows, labTvOrder: { slots: lab, predicted: w3Register(lab), romMeasured: 40 }, reachableByGeneratedRoutes: rows.every((r) => r.eligibleSlots.length >= 2) };
  console.log(JSON.stringify(out, null, 1));
  if (out.labTvOrder.predicted !== out.labTvOrder.romMeasured) process.exitCode = 1;
}
