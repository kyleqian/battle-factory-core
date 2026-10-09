/**
 * geoice RAM check (docs/icy-wind-blizzard-geometry.md): for every window row of each geoice probe (direct mGBA, Scene ON), the
 * reducers' DERIVED effect sprites (icyWindAtAge / blizzardAtAge oamSlot, x, y, x2, y2) against the ROM's gSprites slots, and the
 * derived per-age order (*EffectOamOrderAtAge) against the ROM sSpriteOrder restricted to the effect slots. RETAINED_* = the
 * pre-geoice retained capture (accepted geometry; check data only, never production) -> the rows where derived != retained.
 * usage: node --experimental-strip-types --no-warnings tools/integration/geoiceSlotCheck.ts <evidence-dir> <out.json> <fixture...>
 * (<evidence-dir>/<fixture basename>-run0/probe.json from tools/integration/liveAdapterFramebuffer.ts)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { icyWindAtAge, icyWindEffectOamOrderAtAge } from "../../src/animation/icyWind.ts";
import { blizzardAtAge, blizzardEffectOamOrderAtAge } from "../../src/animation/blizzard.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };

export const RETAINED_ICY_WIND_SLOTS = {
  snowball: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14],
  spike: { player: [3, 4, 5, 7, 9, 10, 11, 15, 16, 12, 13, 3, 17], opponent: [3, 4, 5, 7, 9, 10, 11, 15, 16, 12, 17, 3, 13] },
} as const;
export const RETAINED_BLIZZARD_SLOTS = {
  snowball: [3, 5, 9, 11, 13, 15, 17, 19, 21, 23, 25, 4, 7, 10],
  traveling: { player: [4, 7, 10, 12, 14, 16, 18, 20, 22, 24, 26, 27, 28, 29], opponent: [4, 7, 10, 12, 14, 16, 18, 20, 22, 24, 26, 27, 28, 12] },
  impact: [3, 4, 5, 7, 9, 10, 11, 3, 4, 5, 7],
} as const;

type Side = "player" | "opponent";
interface Sprite { slot: number; x: number; y: number; x2: number; y2: number; template: { symbol: string } | null }
const ids = new Map((speciesStats as { species: { id: number; name: string }[] }).species.map(({ id, name }) => [name.replace("SPECIES_", ""), id]));

export function geoiceGeometry(side: Side, attacker: string, target: string) {
  const player = side === "player" ? attacker : target, opponent = side === "player" ? target : attacker;
  const art = createBattleCommandFieldArtView({ player: { species: ids.get(player) }, opponent: { species: ids.get(opponent) } } as never);
  const t = liveBattlerAnchors(side === "player" ? "opponent" : "player", art);
  return { attackerCenter: liveBattlerAnchors(side, art).picOffsetPoint, targetCenter: t.picOffsetPoint, spikeTargetCenter: t.battlePositionCenter };
}

/** Derived effect sprites at `age`: [kind, callIndex, slot, x, y, x2, y2] and the retained-table slot. */
function derived(move: string, age: number, side: Side, g: ReturnType<typeof geoiceGeometry>) {
  if (move === "ICY_WIND") {
    const s = icyWindAtAge(age, side, g);
    return [...s.snowballs.map(b => ({ kind: "snowball", i: b.callIndex, slot: b.oamSlot, x: b.x, y: b.y, x2: b.x2, y2: b.y2, retained: RETAINED_ICY_WIND_SLOTS.snowball[b.callIndex]! })),
      ...s.spikes.map(b => ({ kind: "spike", i: b.callIndex, slot: b.oamSlot, x: b.x, y: b.y, x2: 0, y2: 0, retained: RETAINED_ICY_WIND_SLOTS.spike[side][b.callIndex]! }))];
  }
  const s = blizzardAtAge(age, side, g);
  return [...s.snowballs.map(b => ({ kind: "snowball", i: b.callIndex, slot: b.oamSlot, x: b.x, y: b.y, x2: b.x2, y2: b.y2, retained: RETAINED_BLIZZARD_SLOTS.snowball[b.callIndex]! })),
    ...s.largeCrystals.map(b => ({ kind: "traveling", i: b.callIndex, slot: b.oamSlot, x: b.x, y: b.y, x2: b.x2, y2: b.y2, retained: RETAINED_BLIZZARD_SLOTS.traveling[side][b.callIndex]! })),
    ...s.impactCrystals.map(b => ({ kind: "impact", i: b.callIndex, slot: b.oamSlot, x: b.x, y: b.y, x2: 0, y2: 0, retained: RETAINED_BLIZZARD_SLOTS.impact[b.callIndex]! }))];
}

if (process.argv[1]?.endsWith("geoiceSlotCheck.ts")) {
  const [dir, out, ...fixtures] = process.argv.slice(2);
  const cases = fixtures.map((path) => {
    const fx = JSON.parse(readFileSync(path, "utf8"));
    const side = fx.attacker.geometry.side as Side, move = fx.move as string;
    const g = geoiceGeometry(side, fx.attacker.species, fx.target.species);
    const probe = JSON.parse(readFileSync(join(dir!, `${basename(path, ".json")}-run0`, "probe.json"), "utf8"));
    const byFrame = new Map((probe.frames as { frame: number; sprites: Sprite[]; spriteOrder: number[] }[]).map(f => [f.frame, f]));
    let rows = 0, slotRows = 0, orderRows = 0, divergentRows = 0, divergentSlotRows = 0, divergentOrderRows = 0;
    const firstFailures: unknown[] = [];
    const divergentSample: unknown[] = [];
    const last = fx.denseWindow.endFrame - fx.denseWindow.startFrame;
    for (let age = 0; age <= last; age++) {
      const frame = byFrame.get(fx.denseWindow.startFrame + age);
      if (!frame) continue;
      rows++;
      const want = derived(move, age, side, g);
      const romBySlot = new Map(frame.sprites.map(s => [s.slot, s]));
      // A derived sprite matches when ROM gSprites[slot] holds a sprite at the same source position (x + x2, y + y2).
      const slotOk = want.every(w => { const r = romBySlot.get(w.slot); return !!r && r.x + r.x2 === w.x + w.x2 && r.y + r.y2 === w.y + w.y2; });
      const order = (move === "ICY_WIND" ? icyWindEffectOamOrderAtAge(age, side, g) : blizzardEffectOamOrderAtAge(age, side, g)).map(e => e.oamSlot);
      const effectSlots = new Set(want.map(w => w.slot));
      const romOrder = frame.spriteOrder.filter(slot => effectSlots.has(slot));
      const orderOk = JSON.stringify(order) === JSON.stringify(romOrder);
      if (slotOk) slotRows++;
      if (orderOk) orderRows++;
      const divergent = want.some(w => w.slot !== w.retained);
      if (divergent) {
        divergentRows++; if (slotOk) divergentSlotRows++; if (orderOk) divergentOrderRows++;
        if (divergentSample.length < 3) divergentSample.push({ age, frame: fx.denseWindow.startFrame + age,
          derived: want.filter(w => w.slot !== w.retained).map(w => `${w.kind}${w.i}:${w.slot} (retained ${w.retained})`), romOrder, order });
      }
      if ((!slotOk || !orderOk) && firstFailures.length < 5) firstFailures.push({ age, slotOk, orderOk, order, romOrder,
        want: want.map(w => [w.kind, w.i, w.slot, w.x + w.x2, w.y + w.y2]), rom: frame.sprites.map(s => [s.slot, s.template?.symbol, s.x + s.x2, s.y + s.y2]) });
    }
    const r = { fixture: path, move, side, attacker: fx.attacker.species, target: fx.target.species, geometry: g, rows, slotRows, orderRows,
      divergentRows, divergentSlotRows, divergentOrderRows, divergentSample, firstFailures };
    console.log(JSON.stringify({ case: basename(path, ".json"), rows, slotRows, orderRows, divergentRows, divergentSlotRows, divergentOrderRows }));
    return r;
  });
  writeFileSync(out!, JSON.stringify({ schema: "geoice-slot-check/v1", evidenceDir: dir, cases }, null, 1) + "\n");
}
