/**
 * S10A Substitute part 1: the production doll field state against the prep37 ROM field windows.
 *
 * usage: npx vite-node tools/integration/substDollFieldCheck.ts <probe.json:rgb-dir>... [--out=<receipt.json>]
 *
 * Per probe (the subbed battler = the first Move_SUBSTITUTE attacker) the measured rows are prep37Field.py's: idle rows
 * (no anim script) with behindSubstitute set whose DISPLAYED sprite (previous row's RAM sprite: OAM latch) is visible and
 * whose two previous rows were idle (a window's 2-row display tail belongs to the window). The doll is composed only by
 * production: the field starts as the mon, `applySubstituteDollCommand` consumes a completed move-164 body request, and
 * `createBattleCommandFieldArtView` + `battleCommandFieldSpriteOrigin` give pic / palette / corner. The displayed x2 / y2
 * (action-selection bounce, 0..2) is the ROM row's own input. Every opaque doll pixel on rows < 112 is compared.
 * No capture row feeds production; the ROM frames are only the comparison target.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { battleCommandFieldSpriteOrigin, createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { applySubstituteDollCommand } from "../../src/engine/battleResolutionPresentationRender.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";

type Sprite = { x: number; y: number; x2: number; y2: number; invisible: boolean };
type Battler = { sprite: Sprite; behindSubstitute: boolean; species: number };
type Frame = { frame: number; script: string | null; animAttacker: number; battlers: [Battler, Battler] };

const args = process.argv.slice(2);
const outArg = args.find((a) => a.startsWith("--out="))?.slice(6);
const results = [];
let failed = false;
for (const spec of args.filter((a) => !a.startsWith("--"))) {
  const [probePath, rgbDir] = spec.split(":") as [string, string];
  const probe = JSON.parse(readFileSync(probePath, "utf8")) as { profile: string; frames: Frame[] };
  const frames = probe.frames;
  const start = frames.findIndex((r) => r.script === "Move_SUBSTITUTE");
  const subbed = frames[start]!.animAttacker as 0 | 1;
  const side = subbed === 0 ? "player" : "opponent";
  const mon = (b: 0 | 1) => ({ species: frames[start]!.battlers[b].species }) as unknown as BattleResolutionDisplayedField["player"];
  const before = { player: mon(0), opponent: mon(1) } as BattleResolutionDisplayedField;
  // The production setter: a completed Substitute body request by the subbed battler.
  const field = applySubstituteDollCommand(before, {
    type: "move-animation", eventSequence: 0, battler: subbed,
    animation: { moveId: 164, attacker: subbed, target: subbed } as never,
    timing: { minimumFrames: 1 },
  } as never);
  const art = createBattleCommandFieldArtView(field)[side];
  if (art.substituteDoll !== true) throw new Error(`${probePath}: production field did not show the doll`);
  const corner = battleCommandFieldSpriteOrigin(art, side);
  const cols = art.pic.tileset.columns;
  const pixels: [number, number, readonly [number, number, number]][] = [];
  art.pic.tileset.tiles.forEach((tile, t) => tile.forEach((index, i) => {
    if (index === 0) return;
    const c = art.pic.palette[index]!;
    pixels.push([(t % cols) * 8 + (i % 8), Math.floor(t / cols) * 8 + Math.floor(i / 8), [c.r, c.g, c.b]]);
  }));
  let prevSprite = frames[start - 1]!.battlers[subbed].sprite;
  let prevScripts = [frames[start - 2]!.script, frames[start - 1]!.script];
  const rows: number[] = [];
  let mismatchPx = 0, mismatchRows = 0, comparedPx = 0;
  const firstMismatches: { frame: number; px: number }[] = [];
  for (const r of frames.slice(start)) {
    const shown = prevSprite, shownScripts = prevScripts;
    prevSprite = r.battlers[subbed].sprite;
    prevScripts = [prevScripts[1]!, r.script];
    const b = r.battlers[subbed];
    if (r.script !== null || !b.behindSubstitute) continue;
    if (shown.invisible || shownScripts[0] !== null || shownScripts[1] !== null) continue;
    const rgb = inflateSync(readFileSync(`${rgbDir}/${String(r.frame).padStart(5, "0")}.rgb.z`));
    let bad = 0;
    for (const [x, y, c] of pixels) {
      const X = corner.x + shown.x2 + x, Y = corner.y + shown.y2 + y;
      if (X < 0 || X >= 240 || Y < 0 || Y >= 112) continue;
      const o = (Y * 240 + X) * 3;
      comparedPx += 1;
      if (rgb[o] !== c[0] || rgb[o + 1] !== c[1] || rgb[o + 2] !== c[2]) bad += 1;
    }
    rows.push(r.frame);
    if (bad > 0) {
      mismatchPx += bad;
      mismatchRows += 1;
      if (firstMismatches.length < 10) firstMismatches.push({ frame: r.frame, px: bad });
    }
  }
  if (mismatchPx !== 0 || rows.length === 0) failed = true;
  const result = {
    probe: probePath.split("/").at(-1), profile: probe.profile, subbed: side,
    species: { player: before.player.species, opponent: before.opponent.species },
    productionCorner: corner, dollRows: rows.length, rowsDigest: createHash("sha256").update(rows.join(",")).digest("hex").slice(0, 16),
    firstRow: rows[0] ?? null, lastRow: rows.at(-1) ?? null, comparedPx, mismatchRows, mismatchPx, firstMismatches,
  };
  results.push(result);
  console.log(`${result.probe} ${side} corner (${corner.x},${corner.y}) rows ${rows.length} [${result.firstRow}..${result.lastRow}] px ${comparedPx} mismatch ${mismatchPx} (${mismatchRows} rows)`);
}
const receipt = { schema: "subst-doll-field/v1", results };
if (outArg) writeFileSync(outArg, `${JSON.stringify(receipt, null, 1)}\n`);
if (failed) {
  console.error("FAIL: a doll band row differs (or no rows)");
  process.exit(1);
}
console.log("doll band: 0 px on every measured row");
