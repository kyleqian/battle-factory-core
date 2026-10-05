// prep9: pixel sensitivity of the order inputs of the palette-snapshot moves (Giga Drain, Mega Drain, Dream Eater `allocatorProfile.orderSeed`; Sunny Day `animationInputs.spriteOrder`).
// Renders the accepted staged configs (copied from tools/compare/{giga,mega}DrainFramebuffer.ts / dreamEaterFramebuffer.ts / sunnyDayActualCore.ts) with the accepted order and with order variants
// (the ROM-observed activation orders of the other prep9 scenarios of the same move, reversed, ascending) over every source age, both orientations, and counts differing frames / pixels.
//   node --experimental-strip-types tools/integration/prep9OrderPixels.ts > tools/integration/fixtures/prep9-order-pixels.json
import { readFileSync } from "node:fs";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const rd = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const alloc = rd("tools/integration/fixtures/prep9-allocator.json");
const P = (side: "player" | "opponent", c: [number, number], a: [number, number], b: [number, number]) => ({ side, spriteCorner: { x: c[0], y: c[1] }, animationCenter: { x: a[0], y: a[1] }, battlePositionCenter: { x: b[0], y: b[1] } });
const ONIX_OPP = P("opponent", [144, 10], [176, 42], [176, 40]), ONIX_PL = P("player", [40, 48], [72, 88], [72, 80]);
const ctr = (g: any) => ({ x: g.animationCenter.x, y: g.animationCenter.y });
const fp = (ph: number, pm: number, oh: number, om: number, pg = "male", og = "male") => ({ playerHp: ph, playerMaxHp: pm, opponentHp: oh, opponentMaxHp: om, playerGender: pg, opponentGender: og });
const GIGA = { hitsplat: 3, orbs: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 3, 20, 21, 4, 7, 9, 5, 11, 13], stars: [3, 4, 5, 3], paletteController: 3 };
const MEGA = { hitsplat: 3, orbs: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 3, 15, 4, 5, 10, 16], stars: [3, 4, 5, 3], paletteController: 3 };
const DE = { orbs: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 3, 20, 21, 4, 7, 9, 5, 11, 13], stars: [3, 4, 5, 3] };
const mk = (move: string, species: string, side: "player" | "opponent", g: any, tg: any, field: any, extra: any) => ({ move, attacker: { species, geometry: g }, target: { species: "ONIX", geometry: tg }, healingCenter: ctr(g), absorptionCenter: ctr(g), fieldProfile: field, ...extra });
type Cfg = { move: string; scenario: string; ages: number; make: (order: readonly number[]) => any; accepted: readonly number[] };
const first = (move: number, side: string) => alloc.scenarios[`${{ 202: "giga-drain", 72: "mega-drain", 138: "dream-eater", 241: "sunny-day" }[move]}-${side}-accepted`];
const cfgs: Cfg[] = [];
for (const side of ["player", "opponent"] as const) {
  const pl = side === "player";
  const g = (x: number, y: number, cy: number) => pl ? P("player", [40, y], [72, cy], [72, 80]) : P("opponent", [144, y], [176, cy], [176, 40]);
  const tg = pl ? ONIX_OPP : ONIX_PL;
  cfgs.push({ move: "GIGA_DRAIN", scenario: `${side}`, ages: 229, accepted: first(202, side).orderAtActivationRestricted,
    make: (o) => mk("GIGA_DRAIN", "ROSELIA", side, pl ? g(0, 56, 96) : g(0, 16, 48), tg, pl ? fp(135, 146, 110, 110) : fp(110, 110, 135, 146), { allocatorProfile: { ...GIGA, orderSeed: o } }) });
  cfgs.push({ move: "MEGA_DRAIN", scenario: `${side}`, ages: 217, accepted: first(72, side).orderAtActivationRestricted,
    make: (o) => mk("MEGA_DRAIN", "SKIPLOOM", side, pl ? g(0, 61, 101) : g(0, 11, 43), tg, pl ? fp(151, 151, 110, 110) : fp(110, 110, 151, 151), { allocatorProfile: { ...MEGA, orderSeed: o } }) });
  cfgs.push({ move: "DREAM_EATER", scenario: `${side}`, ages: 266, accepted: first(138, side).orderAtActivationRestricted,
    make: (o) => mk("DREAM_EATER", "WIGGLYTUFF", side, pl ? g(0, 56, 96) : g(0, 16, 48), tg, pl ? fp(205, 215, 110, 110, "female", "male") : fp(110, 110, 195, 215, "male", "female"),
      { targetRestOffset: pl ? { x2: 1, y2: 0 } : { x2: 0, y2: 0 }, allocatorProfile: { ...DE, orderSeed: o } }) });
}
const frame = (cfg: any, age: number) => render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(cfg), age } } as any);
const results: any[] = [];
const maxAge = (c: Cfg) => c.ages;
for (const c of cfgs) {
  const mv = ({ GIGA_DRAIN: 202, MEGA_DRAIN: 72, DREAM_EATER: 138 } as any)[c.move] as number;
  const side = c.scenario;
  const variants: Record<string, readonly number[]> = { reversed: [...c.accepted].reverse(), ascending: [...c.accepted].sort((a, b) => a - b) };
  for (const [n, s] of Object.entries(alloc.scenarios) as [string, any][]) if (s.move === mv && s.activation !== null) { const k = JSON.stringify(s.orderAtActivationRestricted); if (k !== JSON.stringify(c.accepted) && !Object.values(variants).some((v) => JSON.stringify(v) === k)) variants[`rom:${n}`] = s.orderAtActivationRestricted; }
  const base = rd; void base;
  const baseCfg = c.make(c.accepted);
  const baseFrames: Uint8Array[] = []; for (let a = 0; a < maxAge(c); a += 1) baseFrames.push(frame(baseCfg, a));
  for (const [vn, order] of Object.entries(variants)) {
    const cfg = c.make(order); let frames = 0, pixels = 0, firstAge: number | null = null;
    for (let a = 0; a < maxAge(c); a += 1) {
      const f = frame(cfg, a), b = baseFrames[a]!; let d = 0;
      for (let i = 0; i < f.length; i += 4) if (f[i] !== b[i] || f[i + 1] !== b[i + 1] || f[i + 2] !== b[i + 2]) d += 1;
      if (d) { frames += 1; pixels += d; firstAge ??= a; }
    }
    results.push({ move: c.move, orientation: side, variant: vn, order, differingFrames: frames, differingPixels: pixels, firstDifferingAge: firstAge, ages: maxAge(c) });
  }
}
// Sunny Day: spriteOrder (64) variants over the 12 ROM scenarios
const sunnyBase = (side: "player" | "opponent") => {
  const pl = side === "player", g = pl ? P("player", [40, 59], [72, 91], [72, 80]) : P("opponent", [144, 22], [176, 54], [176, 40]), tg = pl ? ONIX_OPP.side && P("opponent", [144, 10], [176, 42], [176, 40]) : P("player", [40, 48], [72, 80], [72, 80]);
  const field = pl ? fp(1, 1, 1, 1, "female", "male") : fp(1, 1, 1, 1, "male", "female");
  return (order: readonly number[]) => ({ move: "SUNNY_DAY", attacker: { species: "BELLOSSOM", geometry: g }, target: { species: "ONIX", geometry: tg }, fieldProfile: field, animationInputs: { raySlots: [3, 4, 5, 7], spriteOrder: order, paletteBanks: { background: [0, 1, 2, 3], attackerPartner: pl ? 17 : 18 } } });
};
for (const side of ["player", "opponent"] as const) {
  const accepted: number[] = first(241, side).spriteOrderAtActivation, mkc = sunnyBase(side);
  const baseFrames: Uint8Array[] = []; for (let a = 0; a < 158; a += 1) baseFrames.push(frame(mkc(accepted), a));
  const variants: Record<string, number[]> = { reversed: [...accepted].reverse() };
  for (const [n, s] of Object.entries(alloc.scenarios) as [string, any][]) if (s.move === 241 && s.activation !== null && JSON.stringify(s.spriteOrderAtActivation) !== JSON.stringify(accepted)) variants[`rom:${n}`] = s.spriteOrderAtActivation;
  for (const [vn, order] of Object.entries(variants)) {
    let frames = 0, pixels = 0, firstAge: number | null = null;
    for (let a = 0; a < 158; a += 1) { const f = frame(mkc(order), a), b = baseFrames[a]!; let d = 0; for (let i = 0; i < f.length; i += 4) if (f[i] !== b[i] || f[i + 1] !== b[i + 1] || f[i + 2] !== b[i + 2]) d += 1; if (d) { frames += 1; pixels += d; firstAge ??= a; } }
    results.push({ move: "SUNNY_DAY", orientation: side, variant: vn, orderHead: order.slice(0, 12), differingFrames: frames, differingPixels: pixels, firstDifferingAge: firstAge, ages: 158 });
  }
}
console.log(JSON.stringify({ schema: "prep9-order-pixels/v1", note: "variants rendered against the accepted-order render of the same config; 0 = pixel-neutral", results }, null, 1));
