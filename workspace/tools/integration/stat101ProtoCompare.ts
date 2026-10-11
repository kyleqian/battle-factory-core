// stat101 prototype (docs/stat101-stats-change-design.md slice (b) feasibility): composite General_StatsChange with PRODUCTION's existing
// helpers (battleScene.ts drawStatIncreaseBannerForBattler / drawStatDecreaseBannerForBattlerPalette, the stat-anim-banner asset, the
// battle-command field art for the animated species) over the ROM's own row rel 6 (Step1 done, EVA 0: the last pre-banner row) and compare
// every later row of the window with the ROM inside the OBJ-window rect, two ways: "helper" = the production 8-bit blendChannel, "gba" = the
// hardware 5-bit blend (min(31, (a5 * EVA + b5 * EVB) >> 4), mGBA expansion c << 3 | c >> 2). Per-row EVA and BG1 RAM come from the committed
// row TSVs; the visible BG1 Y of row r is tried as RAM(r - 1) and RAM(r). The mask corner is the ROM rect; `cornerPlusX2Y2EqualsRect`
// checks production's battleCommandFieldSpriteOrigin + the battler's live x2 / y2 against it. Read-only use of production; raw frames from stat101NpzToRaw.py.
//   node --experimental-strip-types --no-warnings tools/integration/stat101ProtoCompare.ts <raw-dir> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { drawStatIncreaseBannerForBattler, drawStatDecreaseBannerForBattlerPalette, statAnimBanner } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView, battleCommandFieldSpriteOrigin } from "../../src/engine/battleCommandFieldArt.ts";

const [rawDir, outPath] = process.argv.slice(2) as [string, string];
const F = "tools/integration/fixtures/stat101";
const receipts = JSON.parse(readFileSync(`${F}/receipts/stat-anim.json`, "utf8"));
const SP: Record<string, number> = { PRIMEAPE: 57, ONIX: 95, SNORLAX: 143, GOLBAT: 42, MACHAMP: 68 };
const PAL: Record<number, string> = { 1: "attack", 2: "defense", 3: "speed", 4: "spAttack", 5: "spDefense", 6: "accuracy", 7: "evasion" };
const FRAME = 240 * 160 * 3;
const exp5 = (c: number) => (c << 3) | (c >> 2);
const result: Record<string, unknown> = {};
for (const [scen, v] of Object.entries<any>(receipts)) {
  const ix = v.index;
  if (ix.expectedAnimArg === null) continue;
  const species = SP[ix.animatedSide === ix.userSide ? ix.user : ix.otherLead]!;
  for (const scene of ["on", "off"] as const) {
    const w = v[scene].windows[0];
    if (!w) continue;
    const arg: number = w.arg;
    const down = (arg >= 22 && arg <= 28) || (arg >= 46 && arg <= 52) || arg === 57 || arg === 58;
    const stat = arg >= 55 ? 0 : arg >= 39 ? arg - (down ? 45 : 38) : arg - (down ? 21 : 14);
    const palette = (statAnimBanner.palettes as any)[stat === 0 ? "multiple" : PAL[stat]!];
    const raw = readFileSync(`${rawDir}/${scen}-${scene}.rgb`);
    const frames = raw.length / FRAME;
    const rows = readFileSync(`${F}/${w.rowsTsv.replace("rows/", "receipts/rows/")}`, "utf8").trim().split("\n").slice(1).map((l) => l.split("\t"));
    const byRel = new Map(rows.map((r) => [Number(r[0]), { eva: Number(r[3]), evb: Number(r[4]), bg1y: Number(r[6]) }]));
    const field = { player: { species: ix.animatedSide === "player" ? species : SP.ONIX }, opponent: { species: ix.animatedSide === "opponent" ? species : SP.ONIX } };
    const art = (createBattleCommandFieldArtView(field as any) as any)[ix.animatedSide];
    const [rx, ry, rw, rh] = w.maskRect as [number, number, number, number];
    const frameAt = (rel: number) => raw.subarray((rel + 1) * FRAME, (rel + 2) * FRAME); // frame 0 = A - 1
    const base = frameAt(6);
    const out: Record<string, { rows: number; mismatchedRows: number; px: number; firstBad: number | null }> = {};
    for (const mode of ["helper", "gba"] as const) {
      for (const lag of [1, 0]) {
        let px = 0, bad = 0, n = 0, firstBad: number | null = null;
        for (let rel = 7; rel + 1 < frames && rel <= w.activeFrames + 2; rel++) {
          const st = byRel.get(rel)!, ram = byRel.get(rel - lag)!;
          const fb = new Uint8Array(240 * 160 * 4);
          for (let i = 0; i < 240 * 160; i++) { fb[i * 4] = base[i * 3]!; fb[i * 4 + 1] = base[i * 3 + 1]!; fb[i * 4 + 2] = base[i * 3 + 2]!; fb[i * 4 + 3] = 255; }
          if (st.eva > 0) {
            if (mode === "helper") {
              if (down) drawStatDecreaseBannerForBattlerPalette(fb, art.pic.tileset, { x: rx, y: ry }, st.eva, ram.bg1y, palette);
              else drawStatIncreaseBannerForBattler(fb, art.pic.tileset, { x: rx, y: ry }, st.eva, ram.bg1y, palette);
            } else {
              const ts = art.pic.tileset, map = down ? statAnimBanner.tilemaps.decrease : statAnimBanner.tilemaps.increase, P = 256;
              for (let ty = 0; ty < ts.rows; ty++) for (let tx = 0; tx < ts.columns; tx++) {
                const tile = ts.tiles[ty * ts.columns + tx];
                if (!tile) continue;
                for (let py = 0; py < 8; py++) for (let qx = 0; qx < 8; qx++) {
                  if (tile[py * 8 + qx] === 0) continue;
                  const x = rx + tx * 8 + qx, y = ry + ty * 8 + py;
                  if (x < 0 || x >= 240 || y < 0 || y >= 160) continue;
                  const mx = (((x + (down ? 64 : 0)) % P) + P) % P, my = (((y + ram.bg1y) % P) + P) % P;
                  const e = map.entries[(my >> 3) * map.width + (mx >> 3)];
                  if (!e) continue;
                  const t = statAnimBanner.tileset.tiles[e.tile];
                  const idx = t?.[(e.vFlip ? 7 - (my & 7) : my & 7) * 8 + (e.hFlip ? 7 - (mx & 7) : mx & 7)];
                  if (!idx) continue;
                  const c = palette[idx], o = (y * 240 + x) * 4;
                  for (const [k, cv] of [[0, c.r], [1, c.g], [2, c.b]] as const) {
                    fb[o + k] = exp5(Math.min(31, ((cv >> 3) * st.eva + (fb[o + k]! >> 3) * st.evb) >> 4));
                  }
                }
              }
            }
          }
          const rom = frameAt(rel);
          let rowPx = 0;
          for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) {
            const o = y * 240 + x;
            if (fb[o * 4] !== rom[o * 3] || fb[o * 4 + 1] !== rom[o * 3 + 1] || fb[o * 4 + 2] !== rom[o * 3 + 2]) rowPx++;
          }
          n++; px += rowPx;
          if (rowPx) { bad++; if (firstBad === null) firstBad = rel; }
        }
        out[`${mode}-lag${lag}`] = { rows: n, mismatchedRows: bad, px, firstBad };
      }
    }
    // production's elevation-aware sprite corner vs the ROM's OBJ-window copy (which also carries the battler's live x2 / y2)
    const corner = battleCommandFieldSpriteOrigin(art, ix.animatedSide);
    const bs = w.battlerSprites[ix.animatedSide === "player" ? 0 : 1] as number[];
    result[`${scen}-${scene}`] = { arg, species, side: ix.animatedSide, maskRect: w.maskRect, productionCorner: corner, liveX2Y2: [bs[3], bs[4]],
      cornerPlusX2Y2EqualsRect: corner.x + bs[3]! === rx && corner.y + bs[4]! === ry, ...out };
    console.log(scen, scene, arg, JSON.stringify(out));
  }
}
writeFileSync(outPath, JSON.stringify(result, null, 1) + "\n");
