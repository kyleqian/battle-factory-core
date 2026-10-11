// stat102 (ISSUES #166 slice b, docs/stat102-stats-change-reducer.md): the dense ROM comparator on the slice (a) reducer. Per window
// (10 scenarios x Scene ON / OFF), every dumped row rel A-1 .. E+3 is composited over the ROM's own last pre-banner row (rel 6: Step1
// done, EVA 0, shadow already hidden) with
//   - the banner: src/animation/statsChange.ts statsChangeParams(arg) (palette key / direction) and statsChangeRow(params, rel)
//     (bannerVisible, eva, bg1YVisible; evb == 16 - eva and bg1XVisible == 0 / 64 are asserted), drawn by production's
//     drawStatIncreaseBannerForBattler / drawStatDecreaseBannerForBattlerPalette;
//   - the mask corner: production's battleCommandFieldSpriteOrigin (elevation-aware) + the battler's live x2 / y2 (receipt), NOT the ROM rect;
//   - the elevated-opponent shadow (SpriteCB_EnemyShadow hides it while gAnimScriptActive): shown iff
//     !statsChangeRow(params, rel).enemyShadowHidden (hidden rel 1 .. E+1), drawn from src/assets/gen/battle-enemy-shadow.json at the source singles placement
//     (176, 40 + 29), as battleScene.ts drawSourceOpponentEnemyShadow (private) does.
// Compared with the ROM frame in the 64x64 OBJ-window rect at the production corner and on the full screen, rows A-1 .. E+2 (acceptance:
// both 0 px); E+3 is reported apart (the next script instruction's message box starts drawing there).
// Read-only use of production; raw frames from stat101NpzToRaw.py.
//   node --experimental-strip-types --no-warnings tools/integration/stat102ReducerCompare.ts <raw-dir> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { drawStatIncreaseBannerForBattler, drawStatDecreaseBannerForBattlerPalette, statAnimBanner, setPixel } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView, battleCommandFieldSpriteOrigin } from "../../src/engine/battleCommandFieldArt.ts";
import { statsChangeParams, statsChangeRow, statsChangeSpan } from "../../src/animation/statsChange.ts";

const [rawDir, outPath] = process.argv.slice(2) as [string, string];
const F = "tools/integration/fixtures/stat101";
const receipts = JSON.parse(readFileSync(`${F}/receipts/stat-anim.json`, "utf8"));
const shadow = JSON.parse(readFileSync("src/assets/gen/battle-enemy-shadow.json", "utf8")) as {
  width: number; height: number; mask: number[]; color: { r: number; g: number; b: number }; elevatedSpecies: string[];
};
const SP: Record<string, number> = { PRIMEAPE: 57, ONIX: 95, SNORLAX: 143, GOLBAT: 42, MACHAMP: 68, GYARADOS: 130, GRANBULL: 210 };
const FRAME = 240 * 160 * 3;
const result: Record<string, unknown> = {};
let windows = 0, clean = 0;
for (const [scen, v] of Object.entries<any>(receipts)) {
  const ix = v.index;
  if (ix.expectedAnimArg === null) continue;
  const animatedName: string = ix.animatedSide === ix.userSide ? ix.user : ix.otherLead;
  const opponentName: string = ix.userSide === "opponent" ? ix.user : ix.otherLead;
  for (const scene of ["on", "off"] as const) {
    const w = v[scene].windows[0];
    if (!w) continue;
    windows++;
    const params = statsChangeParams(w.arg)!;
    const span = statsChangeSpan(params);
    if (span.endRel !== w.E - w.A) throw new Error(`${scen} ${scene}: reducer E ${span.endRel} != ROM ${w.E - w.A}`);
    const palette = (statAnimBanner.palettes as any)[params.palette];
    const raw = readFileSync(`${rawDir}/${scen}-${scene}.rgb`);
    const frames = raw.length / FRAME;
    const frameAt = (rel: number) => raw.subarray((rel + 1) * FRAME, (rel + 2) * FRAME); // frame 0 = A - 1
    const field = {
      player: { species: SP[ix.animatedSide === "player" ? animatedName : ix.userSide === "player" ? ix.user : ix.otherLead] },
      opponent: { species: SP[ix.animatedSide === "opponent" ? animatedName : opponentName] },
    };
    const art = (createBattleCommandFieldArtView(field as any) as any)[ix.animatedSide];
    const origin = battleCommandFieldSpriteOrigin(art, ix.animatedSide);
    const bs = w.battlerSprites[ix.animatedSide === "player" ? 0 : 1] as number[];
    const corner = { x: origin.x + bs[3]!, y: origin.y + bs[4]! };
    const [rx, ry] = w.maskRect as [number, number, number, number];
    // Roar's opponent is the Intimidate switch-in (not elevated); every other opponent is the receipt's lead.
    const elevatedOpponent = !ix.bench && shadow.elevatedSpecies.includes(`SPECIES_${opponentName}`);
    const base = frameAt(6);
    const perRow: [number, number, number, number, number][] = []; // [rel, rectPx, fullPx, bannerVisible, shadowShown]
    let rectPx = 0, rectBadRows = 0, fullPx = 0, fullBadRows = 0, firstBad: number | null = null, compared = 0, bannerRows = 0, shadowRows = 0;
    const tail: { rel: number; rectPx: number; fullPx: number }[] = [];
    const lastRel = Math.min(span.endRel + 3, frames - 2);
    for (let rel = -1; rel <= lastRel; rel++) {
      const row = statsChangeRow(params, rel);
      const fb = new Uint8Array(240 * 160 * 4);
      for (let i = 0; i < 240 * 160; i++) { fb[i * 4] = base[i * 3]!; fb[i * 4 + 1] = base[i * 3 + 1]!; fb[i * 4 + 2] = base[i * 3 + 2]!; fb[i * 4 + 3] = 255; }
      const shadowShown = elevatedOpponent && !row.enemyShadowHidden;
      if (shadowShown) {
        shadowRows++;
        const sx = 176 - shadow.width / 2, sy = 40 + 29 - shadow.height / 2;
        for (const p of shadow.mask) setPixel(fb, sx + (p % shadow.width), sy + Math.floor(p / shadow.width), shadow.color);
      }
      if (row.bannerVisible) {
        bannerRows++;
        if (row.evb !== 16 - row.eva! || row.bg1XVisible !== params.bg1X || row.bg1YVisible === null) throw new Error(`${scen} ${scene} rel ${rel}: helper preconditions`);
        if (params.direction === "down") drawStatDecreaseBannerForBattlerPalette(fb, art.pic.tileset, corner, row.eva!, row.bg1YVisible, palette);
        else drawStatIncreaseBannerForBattler(fb, art.pic.tileset, corner, row.eva!, row.bg1YVisible, palette);
      }
      const rom = frameAt(rel);
      let rp = 0, fp = 0;
      for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
        const o = y * 240 + x;
        if (fb[o * 4] === rom[o * 3] && fb[o * 4 + 1] === rom[o * 3 + 1] && fb[o * 4 + 2] === rom[o * 3 + 2]) continue;
        fp++;
        if (x >= corner.x && x < corner.x + 64 && y >= corner.y && y < corner.y + 64) rp++;
      }
      perRow.push([rel, rp, fp, row.bannerVisible ? 1 : 0, shadowShown ? 1 : 0]);
      if (rel <= span.endRel + 2) {
        compared++;
        rectPx += rp; fullPx += fp;
        if (fp) fullBadRows++;
        if (rp) rectBadRows++;
        if (fp && firstBad === null) firstBad = rel;
      } else {
        tail.push({ rel, rectPx: rp, fullPx: fp });
      }
    }
    if (rectPx === 0 && fullPx === 0 && compared === span.endRel + 4) clean++;
    result[`${scen}-${scene}`] = {
      arg: w.arg, side: ix.animatedSide, species: animatedName,
      reducer: { direction: params.direction, palette: params.palette, sharply: params.sharply, ...span, bannerRows, shadowRows },
      productionCorner: origin, liveX2Y2: [bs[3], bs[4]], maskCorner: corner, romMaskRect: w.maskRect,
      cornerEqualsRomRect: corner.x === rx && corner.y === ry, elevatedOpponentShadow: elevatedOpponent,
      compared: { rows: compared, firstRel: -1, lastRel: span.endRel + 2, firstBad },
      rect: { mismatchedRows: rectBadRows, px: rectPx },
      fullScreen: { mismatchedRows: fullBadRows, px: fullPx },
      afterWindow: tail,
      perRowMismatches: perRow.filter((r) => r[0] <= span.endRel + 2 && (r[1] || r[2])),
    };
    console.log(scen, scene, w.arg, `rows ${compared}: rect ${rectPx} px, full screen ${fullPx} px; after: ${JSON.stringify(tail)}`);
  }
}
result.summary = { windows, zeroPxWindows: clean };
console.log(`rect + full screen 0 px windows (rows A-1 .. E+2): ${clean} / ${windows}`);
writeFileSync(outPath, JSON.stringify(result, null, 1) + "\n");
