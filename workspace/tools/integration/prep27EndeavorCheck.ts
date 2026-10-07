/**
 * prep27 Endeavor body: SOURCE-RELATIVE prototype of the per-age inputs the accepted reducer reads (anchors instead of GROVYLE/ONIX constants), checked
 * field-by-field against the ROM dense probe (tools/compare/sweetScentProbe.py, Move_ENDEAVOR) for fresh pairs in both orientations.
 * Model (all from battle_anim_effects_3.c:3735-3860, battle_anim_mons.c:1714-1765/1873-1882, battle_anim_scripts.s:3789-3803):
 *   task start T (script age of the first `AnimTask_SquishAndSweatDroplets_Step`), squish = gFacadeSquishAffineAnimCmds x2 (24 rows + 1 re-prepare = stride 25),
 *   y2 = (var - min(var*256/d,128))/2 with var = 64 - 2*picYOffset (picYOffset from the production art view), droplets at tTimer 6 (lower: 30/+20) and 18 (upper: 18/-20)
 *   per cycle around BATTLER_COORD base = battlePositionCenter, 4 sprites, vx -2,-2,+2,+2, vy -1, lifetime 7, BlendMonInAndOut(RGB(31,21,0), 12, delay 1, x2),
 *   shake = gAnimMovePower/12 clamp 1..16, hitsplats at target pic-offset centre +-(12,-12).
 * The only measured constants are the three script-age anchors (T, first hitsplat age, blend start), required EQUAL in all runs.
 * usage: npx vite-node tools/integration/prep27EndeavorCheck.ts <dense.json>:<player|opponent>:<attackerSpeciesId>,<targetSpeciesId> ... [--out=receipt.json] [--neg=y2|droplet|power]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { endeavorShakeSteps } from "../../src/engine/battleScene.ts";

const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const blend = (c: number, t: number, k: number) => { const r = c & 31, g = (c >> 5) & 31, b = (c >> 10) & 31, tr = t & 31, tg = (t >> 5) & 31, tb = (t >> 10) & 31;
  return (r + (((tr - r) * k) >> 4)) | ((g + (((tg - g) * k) >> 4)) << 5) | ((b + (((tb - b) * k) >> 4)) << 10); };
const RGB_31_21_0 = 31 | (21 << 5);
const SQUISH_STRIDE = 25;
const squishRows = (s: number): { a: number; d: number } => {      // s = rows since the first matrix change (1-based); 24 rows per cycle, row 25 = re-prepare (no change)
  const cyc = Math.floor((s - 1) / SQUISH_STRIDE), r = s - cyc * SQUISH_STRIDE;                 // r 1..25
  const a = r <= 6 ? 256 - 16 * r : r <= 18 ? 160 + 16 * (r - 6) : r <= 24 ? 352 - 16 * (r - 18) : 256;
  return { a, d: 512 - a };
};
const sdiv = (n: number, m: number) => Math.trunc(n / m);
const receipt: Record<string, unknown> = {};
const anchors: Record<string, number[]> = { T: [], hit1: [], blend: [] };
for (const spec of args.filter((a) => !a.startsWith("--"))) {
  const [json, side, ids] = spec.split(":"); const [attId, tgtId] = ids!.split(",").map(Number) as [number, number];
  const probe = JSON.parse(readFileSync(json!, "utf8")); const fr: any[] = probe.frames;
  const pl = side === "player" ? attId : tgtId, op = side === "player" ? tgtId : attId;
  const art = createBattleCommandFieldArtView({ player: { species: pl }, opponent: { species: op } } as never);
  const aSide = side as "player" | "opponent", tSide = aSide === "player" ? "opponent" : "player";
  const aAnch = liveBattlerAnchors(aSide, art), tAnch = liveBattlerAnchors(tSide, art);
  const yDelta = art[aSide].coords.yOffset + (neg === "y2" ? 1 : 0);
  const base = aAnch.battlePositionCenter, tgtCenter = tAnch.picOffsetPoint;
  const A = (f: any) => (aSide === "player" ? f.battlerSprites.attacker : f.battlerSprites.attacker);   // probe labels by role
  const T0 = fr.findIndex((f) => f.animScriptActive);
  const sprites = (f: any, sym: string) => (f.sprites as any[]).filter((s) => s.template?.symbol === sym);
  // measured anchors
  const firstChange = fr.findIndex((f) => A(f).matrix[0] !== 256) - T0;      // age of the first matrix change (= T)
  const hit1 = fr.findIndex((f) => sprites(f, "gBasicHitSplatSpriteTemplate").length > 0) - T0;
  const colorBank = 256 + (A(fr[0]).attr[2] >>> 12) * 16;
  const blendStart = fr.findIndex((f) => { for (let i = 1; i < 16; i++) if (f.fadedPalette[colorBank + i] !== f.unfadedPalette[colorBank + i]) return true; return false; }) - T0;
  anchors.T!.push(firstChange); anchors.hit1!.push(hit1); anchors.blend!.push(blendStart);
  const fails: Record<string, string[]> = { matrix: [], y2: [], droplets: [], hitsplats: [], blend: [], shake: [] }; let rows = 0, exact = 0;
  const power = fr[T0 + 1].animationMovePower; const steps = endeavorShakeSteps(neg === "power" ? power + 24 : power);
  const shakeSeen = new Set<number>();
  for (let age = 0; age < fr.length - T0; age += 1) {
    const f = fr[T0 + age]; const before = Object.values(fails).reduce((n, v) => n + v.length, 0); rows += 1;
    // squish
    const s = age - firstChange + 1; const exp = s >= 1 && s <= 2 * SQUISH_STRIDE ? squishRows(s) : { a: 256, d: 256 };
    const m = A(f).matrix; if (m[0] !== exp.a || m[3] !== exp.d) fails.matrix!.push(`age ${age}: ${m[0]}/${m[3]} vs ${exp.a}/${exp.d}`);
    const v = 64 - 2 * yDelta, v2 = Math.min(sdiv(v << 8, exp.d), 128), y2 = sdiv(v - v2, 2);
    const squishing = s >= 1 && s <= 2 * SQUISH_STRIDE - 1;
    if (squishing && A(f).y2 !== y2) fails.y2!.push(`age ${age}: ${A(f).y2} vs ${y2}`);
    // droplets: spawn at tTimer 6 (lower) / 18 (upper); tTimer==1 at age firstChange (T)
    const want: string[] = [];
    for (let cyc = 0; cyc < 2; cyc += 1) for (const [tt, xo, yo] of [[6, 30, 20], [18, 18, -20]] as const) {
      const n = age - (firstChange + SQUISH_STRIDE * cyc + tt - 1);   // timer-since-spawn: spawn row n=0, sTimer = n
      if (n < 0 || n > 6) continue;   // alive for sTimer 0..6 (`++sTimer > 6` destroys), the spawn row included
      for (let i = 0; i < 4; i++) {
        const x0 = base.x + [-xo, -xo - 4, xo, xo + 4][i]!, y0 = base.y + yo + (i & 1) * 6, vx = i < 2 ? -2 : 2;
        want.push(`${x0 + vx * n},${y0 - n}`);
      }
    }
    const got = sprites(f, "gFacadeSweatDropSpriteTemplate").map((x) => `${x.x},${x.y}`);
    if (want.sort().join("|") !== got.sort().join("|")) fails.droplets!.push(`age ${age}: ${got.length} sprites vs ${want.length}`);
    // hitsplats (create_basic_hitsplat_sprite relative_to ANIM_TARGET, x mirrored by the target's side): rows [hit1, hit1+10) at (+12,-12), [hit1+26, hit1+36) at (-12,+12)
    const sx = tSide === "opponent" ? 1 : -1, hs = sprites(f, "gBasicHitSplatSpriteTemplate").map((x) => `${x.x},${x.y}`);
    const hsWant: string[] = [];
    if (hit1 >= 0 && age >= hit1 && age < hit1 + 10) hsWant.push(`${tgtCenter.x + sx * 12},${tgtCenter.y - 12}`);
    if (hit1 >= 0 && age >= hit1 + 26 && age < hit1 + 36) hsWant.push(`${tgtCenter.x - sx * 12},${tgtCenter.y + 12}`);
    if (hsWant.join("|") !== hs.join("|")) fails.hitsplats!.push(`age ${age}: ${hs.join(";")} vs ${hsWant.join(";")}`);
    // blend: BlendMonInAndOut coefficient sequence 1..12..0 twice, one step per frame from blendStart
    const q = age - blendStart; let coeff = 0;
    if (blendStart >= 0 && q >= 0) { const p = q % 24; const rep = Math.floor(q / 24); coeff = rep >= 2 ? 0 : p < 12 ? p + 1 : 24 - p - 1 + 0; if (rep < 2 && p === 23) coeff = 0; }
    let okBlend = true; for (let i = 1; i < 16; i++) if (f.fadedPalette[colorBank + i] !== blend(f.unfadedPalette[colorBank + i], RGB_31_21_0, coeff)) okBlend = false;
    if (!okBlend) fails.blend!.push(`age ${age}: coeff model ${coeff}`);
    // shake: target battler x2 must stay inside {0, +down, -up} of the stale-power steps
    const tx2 = (f.battlerSprites.target.x2 as number); shakeSeen.add(tx2);
    if (Object.values(fails).reduce((n, v) => n + v.length, 0) === before) exact += 1;
  }
  const shakeOk = [...shakeSeen].every((x) => x === 0 || x === steps.upStep || x === -steps.downStep);
  if (!shakeOk) fails.shake!.push(`x2 values ${[...shakeSeen].sort()} vs steps ${JSON.stringify(steps)}`);
  const key = `${side}:${attId}->${tgtId}`;
  receipt[key] = { rows, exactRows: exact, firstMatrixChangeAge: firstChange, firstHitsplatAge: hit1, blendStartAge: blendStart, animMovePower: power, shakeSteps: steps, shakeX2Seen: [...shakeSeen].sort((a, b) => a - b), picYOffsetAttacker: art[aSide].coords.yOffset,
    baseAttackerBattlePosition: base, targetPicCenter: tgtCenter, failCounts: Object.fromEntries(Object.entries(fails).map(([k, vv]) => [k, vv.length])), firstFailures: Object.fromEntries(Object.entries(fails).filter(([, vv]) => vv.length).map(([k, vv]) => [k, vv.slice(0, 2)])) };
  console.log(key, `rows ${exact}/${rows}`, "anchors T/hit1/blend", firstChange, hit1, blendStart, "power", power, JSON.stringify(steps), JSON.stringify((receipt[key] as any).failCounts));
}
const eq = (v: number[]) => v.every((x) => x === v[0]);
receipt["anchorsEqualAcrossRuns"] = { T: eq(anchors.T!), hit1: eq(anchors.hit1!), blend: eq(anchors.blend!), values: anchors };
console.log("anchors equal across runs:", JSON.stringify((receipt["anchorsEqualAcrossRuns"] as any)));
if (outPath) writeFileSync(outPath, JSON.stringify({ neg: neg ?? null, receipt }, null, 1) + "\n");
