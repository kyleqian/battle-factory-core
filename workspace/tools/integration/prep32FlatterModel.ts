/**
 * prep32 Flatter (260) source-derived per-age model: the 38 confetti (words from the activation Random2, slots, per-row step state),
 * the register file schedule and the palette loads. Field checks: prep32FlatterWords.ts (words / split T), prep32FlatterCheck.ts (per row).
 * Source: data/battle_anim_scripts.s Move_FLATTER; battle_anim_effects_3.c AnimFlatterConfetti(_Step) :3033, AnimFlatterSpotlight(_Step) :3090,
 * AnimTask_CreateSpotlight / AnimTask_RemoveSpotlight :1674 / :1697; battle_anim_utility.c AnimTask_HardwarePaletteFade.
 */
export const ANIM_TAG_CONFETTI = 10000 + 240;
export const step = (s: number): number => (Math.imul(s, 0x41c64e6d) + 0x6073) >>> 0;
export const BURST_AGE = 65;
export interface Confetti { slot: number; side: 0 | 1; tileOffset: number; data0: number; data1: number }
/** The 38 confetti of a window from its activation value (S) and the occupied slots at the burst (K). */
export function flatterConfetti(seed: number, occupied: readonly number[], rfuSteps = BURST_AGE): { confetti: Confetti[]; words: number[]; after: number } {
  let s = seed >>> 0;
  for (let i = 0; i < rfuSteps; i += 1) s = step(s);
  const words: number[] = [], confetti: Confetti[] = [], used = new Set(occupied);
  const draw = (): number => { s = step(s); const w = s >>> 16; words.push(w); return w; };
  for (let i = 0; i < 38; i += 1) {
    const w0 = draw(), r1 = draw() & 0x1ff, r2 = draw() & 0xff;
    let slot = 0; while (used.has(slot)) slot += 1; used.add(slot);
    confetti.push({ slot, side: (i & 1) as 0 | 1, tileOffset: w0 % 12, data0: r1 & 1 ? 0x5e0 + r1 : 0x5e0 - r1, data1: r2 & 1 ? 0x480 + r2 : 0x480 - r2 });
  }
  return { confetti, words, after: s };
}

/** Main-loop step count of the confetti at a row: the burst (65..67) ends inside row 67's iteration (one AnimateSprites), row 68 is the lag. */
export const confettiSteps = (row: number): number => (row < 67 ? 0 : row <= 68 ? 1 : row - 67);
/** Confetti sprite state after n steps (AnimFlatterConfetti_Step); null once destroyed (data[3] reaches 31). */
export function confettiState(c: Confetti, n: number): { x: number; y: number; x2: number; y2: number; data: number[] } | null {
  if (n >= 31) return null;
  let d0 = c.data0, d1 = c.data1, x2 = 0, y2 = 0;
  for (let i = 0; i < n; i += 1) { x2 += c.side === 0 ? d0 >> 8 : -(d0 >> 8); y2 -= d1 >> 8; d0 = Math.max(d0 - 22, 0); d1 -= 48; }
  return { x: c.side === 0 ? -8 : 248, y: 104, x2, y2, data: [d0, d1, c.side, n] };
}
/**
 * Register file of a row from the activation registers (K) and the source schedule (S; script rows: CreateSpotlight 7, fade-in task
 * BLDY 1..10 every 4 rows from 8 (AnimTask_HardwarePaletteFade delay 3), spotlight init 49 (WINOUT), spotlight destroy 175 (WINOUT,
 * DISPCNT ^ OBJWIN), fade-out BLDY 9..0 every 4 rows from 177, BLDCNT clear 217, RemoveSpotlight 218). Row 1: WIN0H / WIN0V = 0 (anim start).
 */
export function flatterRegisters(row: number, r0: Readonly<Record<string, number>>): Record<string, number> {
  const reg: Record<string, number> = { ...r0 };
  if (row >= 1) { reg.win0h = 0; reg.win0v = 0; }
  if (row >= 7 && row < 218) { reg.dispcnt = r0.dispcnt! | 0x4000; reg.winin = 0x1f3f; }
  if (row >= 8 && row < 217) reg.bldcnt = 0xf8;
  if (row >= 8 && row <= 44) reg.bldy = 1 + Math.floor((row - 8) / 4);
  else if (row > 44 && row < 177) reg.bldy = 10;
  else if (row >= 177 && row <= 213) reg.bldy = 9 - Math.floor((row - 177) / 4);
  if (row >= 49 && row < 175) reg.winout = 0x1f3f;
  if (row >= 175 && row < 218) reg.dispcnt = (r0.dispcnt! | 0x4000) ^ 0x8000;
  if (row >= 218) reg.dispcnt = (r0.dispcnt! ^ 0x8000) & ~0x4000;
  return reg;
}
/** Palettes: loadspritegfx SPOTLIGHT (row 1) / CONFETTI (row 4) into the lowest free OBJ palette slots (P words); hardware = next row. */
export function flatterPalettes(row: number, p0: Readonly<{ unfaded: readonly number[]; faded: readonly number[]; hardware: readonly number[] }>,
  loads: readonly { row: number; bank: number; words: readonly number[] }[]) {
  const at = (r: number, base: readonly number[]) => { const o = [...base]; for (const l of loads) if (r >= l.row) for (let i = 0; i < 16; i += 1) o[(16 + l.bank) * 16 + i] = l.words[i]!; return o; };
  return { unfaded: at(row, p0.unfaded), faded: at(row, p0.faded), hardware: row === 0 ? [...p0.hardware] : at(row - 1, p0.faded) };
}
