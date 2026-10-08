/**
 * MOVE_SKILL_SWAP (285) live inputs (docs/next-adapters-prep35.md s1 / s3 item 1, faithful timing): the non-OAM per-row inputs of the
 * SKILL_SWAP renderer branch from the source-derived prep35 model, ported 1:1 from tools/integration/prep35SkillSwapModel.ts
 * skillSwapPalettes35 and prep33 skillSwapBlend33 (Move_SKILL_SWAP, battle_anim_scripts.s): the palette program (orb sheet into OBJ bank 23
 * on row 1, the psychic BG palette into BG bank 2 on row 23, SetPsychicBackground_Step rotation of faded colours 1..11 every 4th row from 26,
 * UnsetPsychicBackground restore, the two AnimTask_BlendMonInAndOut(RGB_WHITE, 12, 3, 1) passes on the target (row 42) / attacker (row 60)
 * OBJ banks; hardware row r = faded row r - 1) and the Task_FadeToBg bldcnt / bldy (C1 = 4, C2 = 156, the restore fade counted in executed
 * frames). Production values only (the asset palette composite, the orb / psychic BG asset palettes). The OAM rows come from
 * liveMoveOamAssembler.ts liveSkillSwapHardwareOamRows. Never a capture row.
 *
 * CPU-phase (D4) parameters from src/engine/liveMoveTimingPolicy.ts (prep35 s1.4): the optional lag at row 176 (shifts the restore fade by
 * one executed frame) and the display-neutral bank-2 restore row (175 / 176, BLDY 16 on 175..177).
 */
export const LIVE_SKILL_SWAP = Object.freeze({ ORB_LOAD: 1, PSYCHIC_LOAD: 23, FIRST_ROTATION: 26, ROTATION_EVERY: 4, BLEND_START: { target: 42, attacker: 60 } as const,
  BLEND_DELAY: 3, WHITE: 0x7fff, FADE1: 4, FADE2: 156, LAG: 176, BODY_ROWS: 195 });
type Side = "player" | "opponent";
export interface LiveSkillSwapPaletteRow { readonly unfaded: number[]; readonly faded: number[]; readonly hardware: number[] }
export interface LiveSkillSwapPaletteArgs {
  readonly attackerSide: Side;
  readonly palette0: Readonly<{ unfaded: readonly number[]; faded: readonly number[]; hardware: readonly number[] }>;
  readonly orbPalette: readonly number[];
  readonly psychicPalette: readonly number[];
  readonly rows: number;
  readonly restoreRow: number;
}
const SS = LIVE_SKILL_SWAP;
/** BlendPalette (palette.c): faded[i] = unfaded[i] + ((color - unfaded[i]) * coeff >> 4) per channel. */
const blendTo = (c: number, coeff: number, to: number) => { const ch = (sh: number) => { const a = c >> sh & 31, b = to >> sh & 31; return (a + ((b - a) * coeff >> 4)) & 31; }; return ch(0) | ch(5) << 5 | ch(10) << 10; };
/** AnimTask_BlendMonInAndOut coefficient written on row r (data[4] reaches 3 on start + 2, then every 3 rows: 1..12 then 11..0), or null. */
function monBlendCoeff(r: number, start: number): number | null {
  const k = r - (start + 2); if (k < 0 || k % SS.BLEND_DELAY || k / SS.BLEND_DELAY > 23) return null;
  const j = k / SS.BLEND_DELAY; return j < 12 ? j + 1 : 23 - j;
}
/** Body rows (activation .. first inactive, inclusive): 195, 196 with the optional lag at row 176. */
export const liveSkillSwapRowCount = (lag: boolean): number => SS.BODY_ROWS + (lag ? 1 : 0);
export function liveSkillSwapPalettes(a: LiveSkillSwapPaletteArgs): LiveSkillSwapPaletteRow[] {
  const bank = (side: Side) => side === "player" ? 16 : 17, ts: Side = a.attackerSide === "player" ? "opponent" : "player";
  const unfaded = [...a.palette0.unfaded], faded = [...a.palette0.faded]; let prev = [...a.palette0.hardware];
  const out: LiveSkillSwapPaletteRow[] = [];
  for (let r = 0; r < a.rows; r += 1) {
    if (r === SS.ORB_LOAD) for (let i = 0; i < 16; i += 1) { unfaded[23 * 16 + i] = a.orbPalette[i]!; faded[23 * 16 + i] = a.orbPalette[i]!; }
    if (r === SS.PSYCHIC_LOAD) for (let i = 0; i < 16; i += 1) { unfaded[32 + i] = a.psychicPalette[i]!; faded[32 + i] = a.psychicPalette[i]!; }
    if (r >= SS.FIRST_ROTATION && r < a.restoreRow && (r - SS.FIRST_ROTATION) % SS.ROTATION_EVERY === 0) {
      const c11 = faded[32 + 11]!; for (let i = 10; i > 0; i -= 1) faded[32 + i + 1] = faded[32 + i]!; faded[32 + 1] = c11;
    }
    if (r === a.restoreRow) for (let i = 0; i < 16; i += 1) { unfaded[32 + i] = a.palette0.unfaded[32 + i]!; faded[32 + i] = a.palette0.unfaded[32 + i]!; }
    for (const [side, start] of [[ts, SS.BLEND_START.target], [a.attackerSide, SS.BLEND_START.attacker]] as const) {
      const c = monBlendCoeff(r, start); if (c === null) continue;
      const base = bank(side) * 16; for (let i = 1; i < 16; i += 1) faded[base + i] = blendTo(unfaded[base + i]!, c, SS.WHITE);
    }
    out.push({ unfaded: [...unfaded], faded: [...faded], hardware: r === 0 ? [...a.palette0.hardware] : prev });
    prev = [...faded];
  }
  return out;
}
/** Task_FadeToBg bldcnt / bldy (the merged Psywave program, C1 = 4, C2 = 156), the restore fade counted in executed frames. */
export function liveSkillSwapBlend(r: number, lag: boolean): { bldcnt: number; bldy: number } {
  const fadeY = (e: number, c: number) => (e < c + 1 || e >= c + 37 ? { bldcnt: 0, bldy: 0 } : { bldcnt: 0xe8, bldy: e <= c + 1 ? 0 : e <= c + 17 ? e - c - 1 : e <= c + 20 ? 16 : 16 - (e - (c + 20)) });
  const e = (row: number) => row - (lag && row >= SS.LAG ? 1 : 0);
  return r < SS.FADE2 ? fadeY(r, SS.FADE1) : fadeY(e(r - 1) + 1, SS.FADE2);
}
