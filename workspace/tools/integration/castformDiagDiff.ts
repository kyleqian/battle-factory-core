// #143 diagnosis: app live frame vs ROM frame for the CASTFORM alt-species Thunderbolt runs (read-only; new file).
// usage: castformDiagDiff.ts <castform-alt evidence dir> <player|opponent> <age|all> [--crop out.json]
// The CASTFORM live fixture is derived in memory from the committed MINUN fixture (same body/window), HP from the retained probe.
// CASTFORM_DIAG_WHATIF=1 emulates the source Castform rules by mutating the in-memory JSON modules (production files untouched):
//   gMonBackPicCoords y_offset 13 -> sCastformBackSpriteYCoords[CASTFORM_NORMAL] = 0 (battle_anim_mons.c:73-79, :208-210),
//   gEnemyMonElevation[CASTFORM] 16 -> sCastformElevations[CASTFORM_NORMAL] = 13 (battle_anim_mons.c:62-68, :256-258).
import { readFileSync, writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { join, resolve } from "node:path";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import monPicCoords from "../../src/data/gen/mon-pic-coords.json" with { type: "json" };
import enemyElevations from "../../src/data/gen/enemy-mon-elevations.json" with { type: "json" };
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const [evid, side, ageArg, ...rest] = process.argv.slice(2);
const other = side === "player" ? "opponent" : "player";
const base = JSON.parse(readFileSync(resolve(`tools/integration/fixtures/altspecies11-thunderbolt-${side}-minun-${other}-shuckle.json`), "utf8")) as Fixture & { fieldProfile: Record<string, unknown> };
const dir = join(evid!, `altspecies11-thunderbolt-${side}-castform-${other}-shuckle-run0`);
const probe = JSON.parse(readFileSync(join(dir, "probe.json"), "utf8"));
const cmp = JSON.parse(readFileSync(join(dir, "live-comparison.json"), "utf8")) as { comparisons: { age: number; frame: number }[] };
const pr = probe.frames.find((r: { frame: number }) => r.frame === cmp.comparisons[0]!.frame);
const fp = { ...base.fieldProfile, playerHp: pr.player.hp, playerMaxHp: pr.player.maxHp, playerGender: "male",
  opponentHp: pr.opponent.hp, opponentMaxHp: pr.opponent.maxHp, opponentGender: "male" };
const fixture: Fixture = { ...base, fieldProfile: fp as never, attacker: { ...base.attacker, species: "CASTFORM" } };
if (process.env.CASTFORM_DIAG_WHATIF === "1") {
  (monPicCoords as unknown as { back: Record<string, { yOffset: number }> }).back.CASTFORM!.yOffset = 0;
  (enemyElevations as unknown as Record<string, number>).CASTFORM = 13;
}

function compare(age: number, crop?: string) {
  const row = cmp.comparisons.find(r => r.age === age)!;
  const rgb = readFileSync(join(dir, "rgb", `${String(row.frame).padStart(5, "0")}.rgb`));
  const rgba = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(rgba, liveView(fixture, age));
  let x0 = 999, y0 = 999, x1 = -1, y1 = -1, n = 0; const hist = new Map<string, number>();
  for (let p = 0; p < 240 * 160; p++) {
    const r = [rgb[p * 3]!, rgb[p * 3 + 1]!, rgb[p * 3 + 2]!], a = [rgba[p * 4]!, rgba[p * 4 + 1]!, rgba[p * 4 + 2]!];
    if (r.join() === a.join()) continue;
    const x = p % 240, y = Math.floor(p / 240); n++;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    const k = `rom ${r} app ${a}`; hist.set(k, (hist.get(k) ?? 0) + 1);
  }
  if (crop && n) {
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const pal = new Map<string, string>();
    const sym = (c: string) => pal.get(c) ?? (pal.set(c, "0123456789abcdefghijklmnopqrstuvwxyz"[pal.size] ?? "?"), pal.get(c)!);
    const grid = (src: Uint8Array | Buffer, stride: number) => Array.from({ length: h }, (_, j) => Array.from({ length: w }, (_, i) => {
      const o = ((y0 + j) * 240 + x0 + i) * stride; return sym([src[o]!, src[o + 1]!, src[o + 2]!].join());
    }).join(""));
    writeFileSync(crop, JSON.stringify({ side, age, frame: row.frame, bbox: { x0, y0, x1, y1 }, rom: grid(rgb, 3), app: grid(rgba, 4),
      legend: Object.fromEntries([...pal].map(([c, s]) => [s, c])) }, null, 1) + "\n");
  }
  return { age, frame: row.frame, mismatchPx: n, bbox: n ? { x0, y0, x1, y1 } : null,
    topColourPairs: [...hist].sort((a, b) => b[1] - a[1]).slice(0, 4) };
}
if (ageArg === "all") {
  const rows = cmp.comparisons.map(r => compare(r.age));
  const hist: Record<number, number> = {};
  for (const r of rows) hist[r.mismatchPx] = (hist[r.mismatchPx] ?? 0) + 1;
  console.log(JSON.stringify({ side, whatIf: process.env.CASTFORM_DIAG_WHATIF === "1", rows: rows.length,
    exactRows: rows.filter(r => r.mismatchPx === 0).length, residualPixels: rows.reduce((s, r) => s + r.mismatchPx, 0),
    residualPerRowHistogram: hist }));
} else {
  console.log(JSON.stringify(compare(Number(ageArg), rest[0] === "--crop" ? rest[1] : undefined), null, 1));
}
