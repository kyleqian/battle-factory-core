/**
 * prep46: carry the sprite order THROUGH a words-dependent body with the body's own RAM-read Random2 words (prep46Extract.py `draws`), using the
 * production live adapter's own sprite program, and check it per frame against the ROM sSpriteOrder (docs/next-adapters-prep46.md s1).
 *
 * - Sand-Attack 28 / Mud-Slap 189: the dirt seeds exactly as liveMoveAnimation.ts `case 189: case 28` builds them (dirtScatterSlots,
 *   dirtScatterOffsetFromWord, linearTranslationStep, liveBattlerAnchors, the Mud 4/3 seed swap), then the reducer's own SortSprites loop
 *   (src/animation/sandAttack.ts sandAttackDirtAtAge / mudSlap.ts orderedMudAtAge). The reducers keep that order private, so
 *   `dirtOrderAtAge` below is the loop verbatim with the order returned; every age it is cross-checked against the production reducer's
 *   returned draw order (the current sprites ranked by the same order), so the copy cannot drift from production.
 * - Rain Dance 240: the production reducer rainDanceAtAge (src/animation/rainDance.ts, animationRngAtAge0 = the RAM activation value) gives
 *   every drop's slot and software OAM per age; the order is carried with the production carryLiveSpriteOrder (liveMoveOamAssembler.ts).
 * - General_Rain (RAIN_CONTINUES, no live adapter): `generalRainDropsAtAge` (prep46GeneralRain.ts) from the same source rules.
 *
 * Every frame of the body: the model order restricted to the non-entry slots (KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER removed) must equal the ROM
 * sSpriteOrder restricted the same way; every allocation window: created / destroyed sets and the free order. The post-body free order is the
 * order after the last frame, entry slots removed (what a seam-resolved deferred lend would carry).
 * usage: node --experimental-strip-types tools/integration/prep46Carry.ts <units.json> <out.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { dirtScatterOffsetFromWord, dirtScatterSlots, linearTranslationStep } from "../../src/engine/liveMovePresentationRng.ts";
import { KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, spriteOrderWithOccupiedPrefix } from "../../src/engine/spriteOrderProvider.ts";
import { sandAttackDirtAtAge, SAND_ATTACK_DIRT_FIRST_DISPLAY_AGE, SAND_ATTACK_DIRT_LIFETIME, SAND_ATTACK_DIRT_WAVE_STRIDE } from "../../src/animation/sandAttack.ts";
import { mudSlapMudAtAge, MUD_SLAP_MUD_FIRST_DISPLAY_AGE, MUD_SLAP_MUD_HALF_SIZE } from "../../src/animation/mudSlap.ts";
import { rainDanceAtAge } from "../../src/animation/rainDance.ts";
import { carryLiveSpriteOrder } from "../../src/engine/liveMoveOamAssembler.ts";
import { sortGbaSpriteOrder } from "../../src/animation/gbaObjCompositor.ts";
// (General_Rain model: prep46GeneralRain.ts)

type Side = "player" | "opponent";
interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
export interface Unit { kind: string; mv: number | null; frame: number; length: number; F0: number[]; mask0: string; windows: Win[]; plan: string;
  dense?: [number, string, string][]; draws?: number[][]; activationValue?: number; lagAges?: number[] }
export interface Job { unit: string; identicalAB: boolean; attackerSide: Side; species: Record<Side, number>; units: Unit[] }

const ENTRY = new Set(KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
const hexOrder = (hex: string) => Array.from({ length: 64 }, (_, i) => parseInt(hex.slice(2 * i, 2 * i + 2), 16));
const maskHas = (mask: string, slot: number) => (BigInt(`0x${mask}`) >> BigInt(slot) & 1n) === 1n;
const nonEntry = (order: readonly number[]) => order.filter((s) => !ENTRY.has(s));
const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);

/** One pass of the reducers' SortSprites loop (sandAttack.ts:89-118 / mudSlap.ts:89-115) on `order`, in place. */
function dirtSortPass(order: number[], current: readonly { slot: number; y: number }[], half: number): void {
  const packed = new Array<number>(64).fill((3 << 8) | 255);
  const y = new Array<number>(64).fill(-96);
  for (const sprite of current) { packed[sprite.slot] = (2 << 8) | 2; y[sprite.slot] = sprite.y - half; }
  for (let index = 1; index < order.length; index += 1) {
    let cursor = index;
    while (cursor > 0) {
      const prior = order[cursor - 1]!, next = order[cursor]!;
      if (packed[prior]! > packed[next]! || (packed[prior] === packed[next] && y[prior]! < y[next]!)) {
        order[cursor - 1] = next; order[cursor] = prior; cursor -= 1;
      } else break;
    }
  }
}

export interface BodyModel {
  /** model sSpriteOrder after each live age 0..length-1 (index = age) and the model occupancy (animation sprites) per age */
  readonly orders: readonly (readonly number[])[];
  readonly occupied: readonly (readonly number[])[];
  readonly notes: Record<string, unknown>;
}

/**
 * Sand-Attack / Mud-Slap through the body from the activation order (full 64 order). Phase A (before the reducer's first sort): the two
 * invisible slide helpers (gSlideMonToOffsetSpriteTemplate / ...OriginalPos, `createsprite ..., ANIM_ATTACKER, 2`: priority 3, subpriority =
 * the attacker battler's 30 / 40 minus 2, oam.y 160) carried with the production carryLiveSpriteOrder; phase B: the reducer's own sort loop
 * (dirtSortPass) on the production reducer's candidates, reducer age = live age + animationAgeOffset + 1 (the source latch,
 * mudSlapSourceMudAtAge). `seedAgrees` = phase A's end order equals the production adapter's spriteOrderSeed (lent order, Mud 4/3 swap).
 */
export function dirtModel(job: Job, unit: Unit, activationOrder: readonly number[]): BodyModel {
  const mud = unit.mv === 189;
  const side = job.attackerSide, foe: Side = side === "player" ? "opponent" : "player";
  const art = createBattleCommandFieldArtView({ player: { species: job.species.player }, opponent: { species: job.species.opponent } } as never);
  const attackerAnchors = liveBattlerAnchors(side, art), targetAnchors = liveBattlerAnchors(foe, art);
  // the production adapter's seed (liveMoveAnimation.ts case 189/28): null = the adapter declines this lend
  let adapterSeed: readonly number[] | null = activationOrder;
  if (mud) {
    const at = activationOrder.indexOf(4);
    adapterSeed = activationOrder[at + 1] !== 3 ? null : activationOrder.map((slot, index) => index === at ? 3 : index === at + 1 ? 4 : slot);
  }
  const playerAttacker = side === "player";
  const source = { x: attackerAnchors.picOffsetPoint.x + (playerAttacker ? 15 : -15), y: attackerAnchors.picOffsetPoint.y + 15 };
  const words = unit.draws!.flatMap((row) => row.slice(1));
  const transients: [number, number][] = mud ? [[4, 8], [9, 11]] : [[7, 11], [12, 14]];
  const firstWaveRow = mud ? 9 : 12;
  const slots = dirtScatterSlots(transients, firstWaveRow, [0, 1, 2, 6, 8, 60, 61, 62, 63]);
  const seeds = slots.map((slot, i) => ({ slot,
    xStep: linearTranslationStep(targetAnchors.picOffsetPoint.x + dirtScatterOffsetFromWord(words[2 * i]!) - source.x, 20),
    yStep: linearTranslationStep(targetAnchors.picOffsetPoint.y + dirtScatterOffsetFromWord(words[2 * i + 1]!) - source.y, 20) }));
  const ageOffset = mud ? 42 : 43;
  const first = mud ? MUD_SLAP_MUD_FIRST_DISPLAY_AGE : SAND_ATTACK_DIRT_FIRST_DISPLAY_AGE;
  const half = mud ? MUD_SLAP_MUD_HALF_SIZE : 4;
  const profile = mud ? { mud: seeds, spriteOrderSeed: adapterSeed ?? activationOrder } : { dirt: seeds, spriteOrderSeed: adapterSeed ?? activationOrder };
  const candidatesAt = (age: number) => (mud
    ? mudSlapMudAtAge(age, attackerAnchors.picOffsetPoint, side, profile as never)
    : sandAttackDirtAtAge(age, attackerAnchors.picOffsetPoint, side, profile as never)).map(({ slot, y }) => ({ slot, y }));
  const transientSub = (playerAttacker ? 30 : 40) - 2;
  const orders: number[][] = [], occupied: number[][] = [];
  let order = activationOrder.slice();
  // the production reducer's own order (seeded with the adapter's spriteOrderSeed, the same passes from `first`): what a production carry
  // would export; compared with the model on the non-entry projection at every phase-B age
  const reducerOrder = adapterSeed === null ? null : adapterSeed.slice();
  let agreeAges = 0, disagreeAges = 0, crossChecked = 0, crossFailed = 0;
  for (let age = 0; age < unit.length; age += 1) {
    const r = age + ageOffset + 1;
    const live = transients.filter(([from, to]) => age >= from && age < to).map(() => 3);
    const dirt = slots.filter((_, i) => { const born = firstWaveRow + 4 * Math.floor(i / 5); return age >= born && age <= born + 20; });
    if (r < first) {
      order = carryLiveSpriteOrder(order, live.map((slot) => ({ slot, attr: [0x00a0, 0, 3 << 10] as never, subpriority: transientSub, visible: false, oamY: 160 })), sortGbaSpriteOrder);
    } else {
      const current = candidatesAt(r);
      dirtSortPass(order, current, half);
      if (reducerOrder !== null) {
        dirtSortPass(reducerOrder, current, half);
        if (same(nonEntry(order), nonEntry(reducerOrder))) agreeAges += 1; else disagreeAges += 1;
        // the production reducer's returned draw order == its current sprites ranked by the copied loop's order (the copy is production's loop)
        const prod = current.map((s) => s.slot), mine = prod.slice().sort((a, b) => reducerOrder.indexOf(b) - reducerOrder.indexOf(a));
        if (same(prod, mine)) crossChecked += 1; else crossFailed += 1;
      }
    }
    orders.push(order.slice());
    occupied.push([...new Set([...live, ...dirt])].sort((a, b) => a - b));
  }
  return { orders, occupied, notes: { adapterDeclines: adapterSeed === null, reducerOrderAgreesAges: agreeAges, reducerOrderDisagreesAges: disagreeAges,
    reducerCrossChecked: crossChecked, reducerCrossFailed: crossFailed,
    reducerPostFree: reducerOrder === null ? null : nonEntry(reducerOrder) } };
}

/** liveMoveAnimation.ts:358 KNOWN_ENTRY_IN_USE_SPRITE_SLOTS (module-private there; the value the RAIN_DANCE adapter passes). */
const ENTRY_IN_USE: readonly number[] = Object.freeze([0, 1, 2, 6, 8, 60, 61, 62, 63]);
const UNCONSUMED = Object.freeze(new Array<number>(512).fill(0));

/**
 * Drops of one age as SortSprites keys (software OAM: priority attr2 bits 10-11, subpriority 4, oam.y). A drop created THIS frame by
 * AnimTask_CreateRaindrops is not in that frame's sort: BattleMainCB2 runs BuildOamBuffer (SortSprites) before RunTasks
 * (battle_main.c), so only drops with sourcePass >= 1 are keyed; the reducer's age-18 pair is one pass ahead (created in the sprite pass).
 */
const dropKeys = (drops: readonly { slot: number; attr: readonly number[]; subpriority: number; sourcePass: number }[]) =>
  drops.filter((d) => d.sourcePass >= 1).map((d) => ({ slot: d.slot, attr: d.attr as never, subpriority: d.subpriority, visible: true, oamY: d.attr[0]! & 0xff }));

/**
 * Rain Dance 240 through the body: the production reducer rainDanceAtAge (animationRngAtAge0 = the RAM-read activation value, the adapter's
 * occupied slots) gives every drop's slot and software OAM per age; the order is carried with the production carryLiveSpriteOrder at reducer
 * age = live age + `latch`. `wordsAgree`: the reducer's own Random2 replay of its 160 words equals the RAM-read draw rows.
 */
export function rainDanceModel(unit: Unit, activationOrder: readonly number[], latch: number): BodyModel {
  const profile = { animationRngAtAge0: unit.activationValue!, occupiedSpriteSlots: ENTRY_IN_USE, unfadedPaletteBeforeLoad: UNCONSUMED,
    fadedPaletteBeforeLoad: UNCONSUMED, hardwarePaletteAtAge0: UNCONSUMED, unfadedPaletteAfterLoad: UNCONSUMED, fadedPaletteAfterLoad: UNCONSUMED };
  const orders: number[][] = [], occupied: number[][] = [];
  let order = activationOrder.slice();
  for (let age = 0; age < unit.length; age += 1) {
    const r = age + latch;
    const drops = r < 0 ? [] : rainDanceAtAge(r, profile).drops;
    order = carryLiveSpriteOrder(order, dropKeys(drops), sortGbaSpriteOrder);
    orders.push(order.slice());
    occupied.push(drops.map((d) => d.slot).sort((a, b) => a - b));
  }
  // the reducer's Random2 law vs the RAM rows: x = w0 % 240, y = w1 % 80 per task, two tasks per spawn age
  const romXY = unit.draws!.flatMap((row) => row.slice(1)).map((w, i) => i % 2 === 0 ? w % 240 : w % 80);
  const births: number[] = [];
  for (let r = 0; r < unit.length; r += 1) for (const d of rainDanceAtAge(r, profile).drops) if (d.birthAge === r) births.push(d.x, d.y);
  return { orders, occupied, notes: { latch, wordsAgree: same(births, romXY), words: romXY.length } };
}

const order0 = (free: readonly number[]) =>
  spriteOrderWithOccupiedPrefix({ known: true as const, free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);

/** Per-frame + per-window comparison of a body model with the ROM unit (dense rows: [age, order hex, mask hex], age -1 = pre-edge). */
export function compareBody(unit: Unit, model: BodyModel) {
  let frames = 0, frameMismatch: number[] = [];
  for (const [age, hex] of unit.dense!) {
    if (age < 0 || age >= model.orders.length) continue;
    frames += 1;
    if (!same(nonEntry(hexOrder(hex)), nonEntry(model.orders[age]!))) frameMismatch.push(age);
  }
  let windows = 0; const windowMismatch: string[] = [];
  for (const w of unit.windows) {
    const age = w.f - unit.frame;
    if (age < 0 || age >= model.orders.length) { windowMismatch.push(`f${w.f} outside`); continue; }
    windows += 1;
    const occ = model.occupied[age]!, prev = age > 0 ? model.occupied[age - 1]! : [];
    const created = occ.filter((s) => !prev.includes(s)), destroyed = prev.filter((s) => !occ.includes(s));
    const romC = w.C.map(([s]) => s).sort((a, b) => a - b), romD = [...w.D].sort((a, b) => a - b);
    const free = model.orders[age]!.filter((s) => !ENTRY.has(s) && !occ.includes(s));
    if (!same(created, romC) || !same(destroyed, romD) || !same(free, w.F)) windowMismatch.push(`age ${age}: C ${created}/${romC} D ${destroyed}/${romD} F ${same(free, w.F) ? "==" : "!="}`);
  }
  const last = model.orders[model.orders.length - 1]!;
  const postFree = last.filter((s) => !ENTRY.has(s) && !model.occupied[model.orders.length - 1]!.includes(s));
  return { frames, frameMismatchAges: frameMismatch, windows, windowMismatch, postFree };
}

if (process.argv[1]?.endsWith("prep46Carry.ts")) {
  const jobs = JSON.parse(readFileSync(process.argv[2]!, "utf8")).jobs as Record<string, Job>;
  const latch = Number(process.env.P46_RAIN_LATCH ?? "0");
  const out: Record<string, unknown>[] = [];
  for (const [name, job] of Object.entries(jobs)) {
    job.units.forEach((unit, index) => {
      if (unit.kind !== "body" || unit.dense === undefined || unit.mv === 0) return;
      const activation = order0(unit.F0);
      if (activation === null) { out.push({ job: name, mv: unit.mv, frame: unit.frame, error: "activation order not entry-prefixed" }); return; }
      const model = unit.mv === 240 ? rainDanceModel(unit, activation, latch) : dirtModel(job, unit, activation);
      const cmp = compareBody(unit, model);
      const romPost = job.units[index + 1]!.F0;
      const row = { job: name, mv: unit.mv, frame: unit.frame, identicalAB: job.identicalAB, ...model.notes, frames: cmp.frames,
        frameMismatchAges: cmp.frameMismatchAges, windows: cmp.windows, windowMismatch: cmp.windowMismatch,
        postFreeExact: same(cmp.postFree, romPost) };
      out.push(row);
      console.log(name, unit.mv, unit.frame, `frames ${cmp.frames - cmp.frameMismatchAges.length}/${cmp.frames}`,
        `windows ${cmp.windows - cmp.windowMismatch.length}/${cmp.windows}`, `post ${row.postFreeExact ? "EXACT" : "diff"}`, JSON.stringify(model.notes),
        cmp.frameMismatchAges.slice(0, 12).join(","), cmp.windowMismatch.slice(0, 3).join(" | "));
    });
  }
  writeFileSync(process.argv[3]!, `${JSON.stringify({ schema: "prep46-carry/v1", bodies: out }, null, 1)}\n`);
}
