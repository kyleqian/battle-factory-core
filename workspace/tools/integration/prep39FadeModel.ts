/**
 * prep39: per-row SOURCE model of General_SubstituteFade (data/battle_anim_scripts.s:10326), the unit an integration
 * port would add to the presentation queue. Row 0 = the first script row (gAnimScriptActive, sBattleAnimScriptPtr inside
 * General_SubstituteFade); the window ends at the first inactive row (103 player / 101 opponent).
 *
 *   monbg ANIM_ATTACKER              row 0: MoveBattlerSpriteToBG (battle_anim.c:673): the attacker's 64x64 sprite copied to
 *                                    BG2 (player, palette 9) / BG1 (opponent, palette 8) at -(x + x2) + 32, -(y + y2) + 32; the
 *                                    OBJ set invisible; Task_UpdateMonBg copies the OBJ's faded palette into the BG slot
 *   createvisualtask AnimTask_SubstituteFadeToInvisible (battle_anim_throw.c:2171), FADE_TASK_ROW = 3:
 *                                    case 0: BLDCNT = TGT1 BG1|BG2-by-rank | EFFECT_BLEND | TGT2_ALL, BLDALPHA (16, 0)
 *                                    case 1: every 3rd row (data[1]++ > 1) k += 1, BLDALPHA (16 - k, k); k == 16 -> case 2
 *                                    case 2: RequestDma3Fill(0) on the OBJ tiles, ClearBehindSubstituteBit, destroy
 *   createvisualtask AnimTask_BlendBattleAnimPal F_PAL_ATTACKER 0 0 16 RGB_WHITE (battle_anim_utility_funcs.c:48/169):
 *                                    BlendPalette(attacker OBJ palette, coeff, white) with coeff 0 -> 16, +1 per row (two
 *                                    applications on the creation row)
 *   waitforvisualfinish; delay 1; clearmonbg; delay 2; blendoff; BlendBattleAnimPal back to 0 (one row; invisible: zero tiles)
 *   createvisualtask AnimTask_SwapMonSpriteToFromSubstitute TRUE   SWAP_ROW = 61 / 61: the SUBSTITUTE_TO_MON task verbatim
 *                                    (src/engine/liveSubstituteSwap.ts substituteSwapRows(side, true)), sliding ZERO tiles out
 *                                    and the mon (LoadBattleMonGfxAndAnimate: mon gfx + palette + y) back in.
 *
 * Display: the OBJ shows the RAM row two rows earlier (OAM latch, as liveSubstituteSwap.ts) and the tile block one row earlier;
 * the I/O registers (BLDCNT /
 * BLDALPHA) and hardware palettes are copied at VBlank from the previous row's buffers (one row, see ioLag).
 */
import { substituteSwapRows } from "../../src/engine/liveSubstituteSwap.ts";

export type Side = "player" | "opponent";

/** Script row on which AnimTask_SubstituteFadeToInvisible / AnimTask_BlendBattleAnimPal are created (measured, both sides). */
export const FADE_TASK_ROW = 3;
/** Script row of the trailing AnimTask_SwapMonSpriteToFromSubstitute (measured, both sides). */
export const SWAP_ROW = 61;
/** The clearmonbg task runs rows 55..58 (Task_ClearMonBg); the BG copy is gone from row 59 on (gBattle_BGn_X/Y = 0). */
export const CLEARMONBG_ROW = 55;

/** k of BLDALPHA_BLEND(16 - k, k) written on RAM row r (null = no blend register written yet). */
export function fadeAlphaK(r: number): number | null {
  if (r < FADE_TASK_ROW) return null;
  return Math.min(16, Math.floor((r - FADE_TASK_ROW) / 3));
}

/** Coefficient of the attacker's FADED OBJ palette after RAM row r (BlendPalette toward RGB_WHITE). */
export function fadedWhiteCoefficient(r: number): number {
  if (r < FADE_TASK_ROW) return 0;
  return Math.min(16, r - FADE_TASK_ROW + 1);
}

/** RAM row r of the fade, as the source program leaves it (what a fresh direct-mGBA probe reads after row r). */
export type FadeRamRow = Readonly<{
  /** BG copy of the attacker present (monbg .. clearmonbg's tilemap / offset reset). */
  bgCopy: boolean;
  /** OBJ: "doll" (tiles of the doll), "zero" (tiles zeroed / invisible), "mon" (after the swap's graphics load). */
  obj: "doll" | "zero" | "mon";
  objInvisible: boolean;
  x2: number;
  /** I/O registers as read after row r (written on row r - 1, copied at VBlank). */
  ioBldcnt: number;
  ioBldalpha: number;
  /** behindSubstitute (ClearBehindSubstituteBit at case 2). */
  behindSubstitute: boolean;
  /** coefficient of the hardware BG-copy palette as read after row r (faded OBJ palette two rows earlier). */
  bgPaletteWhite: number;
}>;

export function fadeRamRow(side: Side, r: number): FadeRamRow {
  const ioK = fadeAlphaK(r - 1);
  const blendOn = r - 1 >= FADE_TASK_ROW && r - 1 < SWAP_ROW; // blendoff on SWAP_ROW (I/O 0 from SWAP_ROW + 1)
  const swap = substituteSwapRows(side, true);
  const j = r - SWAP_ROW;
  const swapRow = j >= 0 ? swap[Math.min(j, swap.length - 1)]! : null;
  // VRAM switch to the mon graphics: measured two rows after the swap task's load row (subst-swap receipt: 23 / 22).
  const loadRow = swap.findIndex((row) => !row.doll);
  const zeroAt = FADE_TASK_ROW + 16 * 3 + 2; // case 2 (fill requested) + the DMA at VBlank: tiles read zero after row 53
  const obj = j >= loadRow + 2 ? "mon" as const : r >= zeroAt ? "zero" as const : "doll" as const;
  return Object.freeze({
    bgCopy: r >= 0 && r < CLEARMONBG_ROW + 4,
    obj,
    objInvisible: r >= 0 && r < CLEARMONBG_ROW,
    x2: swapRow ? swapRow.x2 : 0,
    ioBldcnt: blendOn ? (side === "opponent" ? 0x3f42 : 0x3f44) : 0,
    ioBldalpha: blendOn && ioK !== null ? (16 - ioK) | (ioK << 8) : 0,
    behindSubstitute: r < FADE_TASK_ROW + 16 * 3 + 1,
    bgPaletteWhite: fadedWhiteCoefficient(r - 2),
  });
}

/** What the display shows at window row a (ioLag: rows between an I/O / palette read and the picture it drives). */
export type FadeDisplayRow = Readonly<{
  /** The attacker layer: the idle doll OBJ, the BG copy blended (eva / evb, white coefficient), nothing, or the mon at x2. */
  layer:
    | Readonly<{ kind: "doll" }>
    | Readonly<{ kind: "bg-copy"; eva: number; evb: number; white: number; blend: boolean }>
    | Readonly<{ kind: "none" }>
    | Readonly<{ kind: "mon"; x2: number }>;
}>;

export function fadeDisplayRow(side: Side, a: number, ioLag = 1): FadeDisplayRow {
  const objRow = a - 2;
  const obj = objRow < 0 ? null : fadeRamRow(side, objRow);
  // OBJ layer: OAM (visibility, x2) two rows late (OAM latch), the tile block one row late (the DMA'd VRAM is read by the
  // next picture; measured: the zero -> mon switch at RAM row 84 / 83 is on screen at row 85 / 84 at the OAM x2 of row 83 / 82).
  if (obj === null) return Object.freeze({ layer: Object.freeze({ kind: "doll" as const }) });
  const tiles = fadeRamRow(side, a - 1).obj;
  if (!obj.objInvisible && tiles === "mon") return Object.freeze({ layer: Object.freeze({ kind: "mon" as const, x2: obj.x2 }) });
  const io = fadeRamRow(side, a + 1 - ioLag);
  if (io.bgCopy && a >= 1) {
    const blend = io.ioBldcnt !== 0;
    const eva = blend ? io.ioBldalpha & 0x1f : 16, evb = blend ? (io.ioBldalpha >> 8) & 0x1f : 0;
    if (eva > 0) return Object.freeze({ layer: Object.freeze({ kind: "bg-copy" as const, eva, evb, white: io.bgPaletteWhite, blend }) });
  }
  return Object.freeze({ layer: Object.freeze({ kind: "none" as const }) });
}

/** Script rows of the window (rows before the first inactive row): 103 player / 101 opponent. */
export function fadeScriptRows(side: Side): number {
  return SWAP_ROW + substituteSwapRows(side, true).length - 1;
}

/** Source BlendPalette (palette.c) on one BGR555 color toward `target`. */
export function blendBgr555(color: number, coefficient: number, target = 0x7fff): number {
  let out = 0;
  for (const shift of [0, 5, 10]) {
    const from = (color >> shift) & 31, to = (target >> shift) & 31;
    out |= (from + (((to - from) * coefficient) >> 4)) << shift;
  }
  return out;
}
