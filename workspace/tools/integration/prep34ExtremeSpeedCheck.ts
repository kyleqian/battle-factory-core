// prep34: the accepted Extreme Speed reducer (src/animation/extremeSpeed.ts, unchanged) checked field by field against
// complete direct-mGBA windows from each scenario's own activation frame (row 0), reducer age = --age0 (43) + row.
// Every field is the HARDWARE-visible value of the same row (registers / hardware OAM / hardware matrices), with the
// renderer's display conventions (extremeSpeed branch of battleScene.ts): no per-field lag is fitted.
// usage: vite-node prep34ExtremeSpeedCheck.ts <probe.json>:<player|opponent> ... [--age0=43] [--yoffset=hardcoded|derived]
//        [--neg=age|scroll|anchor] [--out=receipt.json]
import { readFileSync, writeFileSync } from "node:fs";
import {
  extremeSpeedAttackerAffineAtAge, extremeSpeedAttackerVisibleAtAge, extremeSpeedBackgroundAtAge, extremeSpeedDustAtAge,
  extremeSpeedHitsplatsAtAge, extremeSpeedImpactAtAge,
} from "../../src/animation/extremeSpeed.ts";
import picCoords from "../../src/data/gen/mon-pic-coords.json" with { type: "json" };
import speciesNames from "../../src/data/gen/species-names.json" with { type: "json" };

type Side = "player" | "opponent";
const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const age0 = Number(flag("age0") ?? 43) + (flag("neg") === "age" ? 1 : 0);
const yMode = flag("yoffset") ?? "derived";
const neg = flag("neg");
const out = flag("out");
const windows = args.filter((a) => !a.startsWith("--"));

interface Sprite { x: number; y: number; x2: number; y2: number; attr: number[]; template: { symbol: string | null } }
interface Row {
  frame: number; registers: Record<string, number>; hardwareOam: string[]; hardwareMatrices: number[][];
  battlerSprites: { attacker: Sprite; target: Sprite }; sprites: Sprite[]; battlers: Record<Side, { species: number }>;
}
const oam = (hex: string) => {
  const b = Buffer.from(hex, "hex");
  const a0 = b.readUInt16LE(0); const a1 = b.readUInt16LE(2); const a2 = b.readUInt16LE(4);
  return { y: a0 & 0xff, mode: (a0 >> 8) & 3, x: a1 & 0x1ff, matrix: (a1 >> 9) & 31, tile: a2 & 0x3ff };
};
const speciesName = (id: number) => (speciesNames as unknown as { species: { name: string }[] }).species[id]!.name;
const coords = picCoords as unknown as Record<"front" | "back", Record<string, { yOffset: number }>>;

const receipts = [];
for (const spec of windows) {
  const [probe, attackerSide] = spec.split(":") as [string, Side];
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const data = JSON.parse(readFileSync(probe, "utf8")) as { frames: Row[] };
  const r0 = data.frames[0]!;
  const attackerSpecies = speciesName(r0.battlers[attackerSide].species);
  const targetSpecies = speciesName(r0.battlers[targetSide].species);
  // A: the attacker's pic-coords y_offset (back table for the player, front for the opponent); the reducer's caller
  // hard-codes ARCANINE's (6 / 2) at sceneOnPresentation.ts:12977-12980.
  const derivedYOffset = coords[attackerSide === "player" ? "back" : "front"][attackerSpecies]!.yOffset;
  const yOffset = yMode === "hardcoded" ? (attackerSide === "player" ? 6 : 2) : derivedYOffset;
  const attackerTile = r0.battlerSprites.attacker.attr[2]! & 0x3ff;
  const targetTile = r0.battlerSprites.target.attr[2]! & 0x3ff;
  // A: battler anchors. animationCenter (hit splat, X_2 / Y_PIC_OFFSET) = the target battler sprite's own (x, y);
  // battlePositionCenter (dust, BATTLER_COORD_X / Y) = the per-side sBattlerCoords constants.
  const center = { x: r0.battlerSprites.target.x + (neg === "anchor" ? 1 : 0), y: r0.battlerSprites.target.y };
  const position = attackerSide === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 };
  const attackerBase = { x: r0.battlerSprites.attacker.x, y: r0.battlerSprites.attacker.y };
  const targetBaseX = r0.battlerSprites.target.x - 32;
  const fields: Record<string, { ok: number; total: number; first: unknown[] }> = {};
  const check = (field: string, row: number, expected: unknown, actual: unknown) => {
    const f = (fields[field] ??= { ok: 0, total: 0, first: [] });
    f.total += 1;
    if (JSON.stringify(expected) === JSON.stringify(actual)) f.ok += 1;
    else if (f.first.length < 6) f.first.push({ row, expected, actual });
  };
  let hitsplatTile: number | null = null; let dustTile: number | null = null;
  for (const r of data.frames) for (const s of r.sprites) {
    if (s.template.symbol === "gMonEdgeHitSplatSpriteTemplate") hitsplatTile ??= s.attr[2]! & 0x3ff;
    if (s.template.symbol === "gSpeedDustSpriteTemplate") dustTile = Math.min(dustTile ?? 1024, s.attr[2]! & 0x3ff);
  }
  const neutral: number[] = [];
  data.frames.forEach((r, row) => {
    const age = age0 + row;
    const bg = extremeSpeedBackgroundAtAge(age, attackerSide);
    const reg = r.registers;
    const darken = (reg.bldcnt! & 0xc0) === 0xc0 ? reg.bldy! & 0x1f : 0;
    check("darkenBldy", row, Math.min(16, bg.bldy), Math.min(16, darken));
    // BG3 content (variant / scroll) is display-neutral while BLDCNT darkens BG3 by 16 (fully black): counted separately.
    const bg3Visible = darken < 16;
    const scroll = neg === "scroll" ? bg.scrollX + 1 : bg.scrollX;
    if (bg3Visible) {
      check("bgVariant", row, bg.background, reg.bg3cnt === 0x3a0b ? "highspeed" : "default");
      check("bg3hofs", row, ((scroll % 512) + 512) % 512, reg.bg3hofs! & 0x1ff);
    } else {
      neutral.push(row);
    }
    // attacker: renderer draws it iff (!affine.invisible || visible); affine stretch iff scale != 256. Compared as the
    // displayed centre + matrix (battler sprites are affine OAM; mode 3 = double size, corner -64).
    const affine = extremeSpeedAttackerAffineAtAge(age, yOffset);
    const visible = extremeSpeedAttackerVisibleAtAge(age);
    const reappeared = affine.invisible && visible;
    const drawn = !affine.invisible || visible;
    const stretched = !reappeared && (affine.xScale !== 256 || affine.yScale !== 256);
    const entries = r.hardwareOam.map(oam).filter((e) => e.mode !== 2);
    const a = entries.find((e) => e.tile === attackerTile);
    const identity = [256, 0, 0, 256];
    const expectedAttacker = !drawn ? null
      : { cx: attackerBase.x, cy: (attackerBase.y + (stretched ? affine.y2 : 0)) & 0xff, matrix: stretched ? [affine.xScale, 0, 0, affine.yScale] : identity };
    check("attackerOam", row, expectedAttacker, a
      ? { cx: (a.x + (a.mode === 3 ? 64 : 32)) & 0x1ff, cy: (a.y + (a.mode === 3 ? 64 : 32)) & 0xff, matrix: a.mode === 0 ? identity : r.hardwareMatrices[a.matrix] }
      : null);
    // target: displayed impact x2 = reducer impact at age - 1 (renderer). Sprite while in OAM; otherwise the monbg BG copy
    // (Task_UpdateMonBg: HOFS = 32 - target.x - x2; opponent target BG1, player target BG2).
    const displayedX2 = extremeSpeedImpactAtAge(age - 1, targetSide).targetX2;
    const t = entries.find((e) => e.tile === targetTile);
    const hofs = (targetSide === "opponent" ? reg.bg1hofs! : reg.bg2hofs!) & 0x1ff;
    const rest = (32 - r0.battlerSprites.target.x) & 0x1ff;
    const wrap = (v: number) => ((((v + 256) % 512) + 512) % 512) - 256;
    check("targetX2", row, displayedX2, t ? t.x - targetBaseX : wrap(rest - hofs));
    // hit splats: 32x32 affine-normal at animationCenter + (targetX2 captured at creation, y2) - 16.
    const splats = extremeSpeedHitsplatsAtAge(age, targetSide).map((h) => ({ x: (center.x + h.targetX2 - 16) & 0x1ff, y: (center.y + h.y2 - 16) & 0xff, matrix: [h.matrixScale, 0, 0, h.matrixScale] }));
    check("hitsplats", row, splats, entries.filter((e) => e.tile === hitsplatTile).map((e) => ({ x: e.x, y: e.y, matrix: r.hardwareMatrices[e.matrix] })));
    const dust = extremeSpeedDustAtAge(age).map((d) => ({ x: (position.x + d.x2 - 8) & 0x1ff, y: (position.y + d.y2 - 8) & 0xff, tile: (dustTile ?? 0) + d.frame * 4 }));
    const sortKey = (e: { x: number; y: number; tile: number }) => e.x * 1e6 + e.y * 1e3 + e.tile;
    check("dust", row, [...dust].sort((p, q) => sortKey(p) - sortKey(q)),
      entries.filter((e) => dustTile !== null && e.tile >= dustTile && e.tile < dustTile + 12).map((e) => ({ x: e.x, y: e.y, tile: e.tile })).sort((p, q) => sortKey(p) - sortKey(q)));
  });
  const total = Object.values(fields).reduce((s, f) => s + f.total, 0);
  const ok = Object.values(fields).reduce((s, f) => s + f.ok, 0);
  receipts.push({ probe: probe.split("/").pop(), attackerSide, attacker: attackerSpecies, target: targetSpecies, rows: data.frames.length,
    age0, yOffset, derivedYOffset, anchors: { animationCenter: center, battlePositionCenter: position, attackerSprite: attackerBase },
    fieldRows: `${ok}/${total}`, bg3DisplayNeutralRows: neutral, fields });
}
const receipt = { schema: "prep34-extreme-speed-check/v1", age0, yOffsetMode: yMode, neg: neg ?? null, windows: receipts };
if (out) writeFileSync(out, `${JSON.stringify(receipt, null, 1)}\n`);
for (const w of receipts) {
  console.log(`${w.probe} ${w.attacker}->${w.target} (${w.attackerSide}) yOffset ${w.yOffset}: ${w.fieldRows}`);
  for (const [k, f] of Object.entries(w.fields)) if (f.ok !== f.total) console.log(`  ${k} ${f.ok}/${f.total} ${JSON.stringify(f.first.slice(0, 3))}`);
}
