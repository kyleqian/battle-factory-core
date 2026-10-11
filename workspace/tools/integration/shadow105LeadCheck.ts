/**
 * shadow105 (docs/next-adapters-shadow105.md): the elevated-opponent enemy shadow on land97's idle lead rows, DIRECT dense ROM vs a
 * production tree (run from inside a git-archive copy's workspace/: base 3cc8381ce, or base + fixtures/shadow105/*.diff).
 * audit24LeadCheck.ts's shape (fixture from the probe RAM rows; liveView + renderBattleResolutionLiveView), plus:
 *  - ROM-only lead table: for the ROM activation A (gAnimScriptActive's rising edge) and the lead id's table N (NROM below, land97's
 *    LIVE_MOVE_IDLE_LEAD_ROWS), every ROM row A+j (j = 0..N) vs A-1 (sha) and vs A+N (the body's age-0 image: sha, total px and px
 *    inside the 32x8 enemy-shadow box x 160..191 y 65..72). "shadow" on row j = it differs from A+N only inside the box;
 *  - production rows: the tree's own lead L = liveMoveIdleLeadRows(request, field). Row j (0 .. L+D-1) is effect age max(0, j - L)
 *    (battleResolutionPresentationRender.ts's phaseElapsed mapping) and is compared with ROM row A + (N - L) + j (L = 0: the
 *    pre-land97 window, which starts at the accepted A + N). --pre-activation marks production row 0 of an L > 0 command with the
 *    patch's `preActivationRow: true` (exactly as the patched render does at phaseElapsed 0).
 * usage: node --experimental-strip-types --no-warnings tools/integration/shadow105LeadCheck.ts --scenarios=<dir> --move=<MOVE>
 *          [--pre-activation] [--out=<json>] <probe dir> <stem>...
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import { liveMoveIdleLeadRows } from "../../src/engine/battleResolutionPresentationRender.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

type Battler = { species: number; hp: number; maxHP: number; status1: number; behindSubstitute: boolean };
type Row = { frame: number; sha256: string; script: string | null; animAttacker: number; rng2: number; battlers: [Battler, Battler] };
const NROM: Record<number, number> = { 325: 8, 44: 10, 188: 4, 41: 10 }; // land97 LIVE_MOVE_IDLE_LEAD_ROWS (src 3cc8381ce)
const BOX = { x0: 160, x1: 191, y0: 65, y1: 72 };
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => (a.slice(2).split("=").concat("1")).slice(0, 2) as [string, string]));
const [outDir, ...stems] = args.filter((a) => !a.startsWith("--")) as [string, ...string[]];
const moveIds: Record<string, number> = Object.fromEntries(moveData.moves.map((m) => [m.move.replace(/^MOVE_/, ""), m.id]));
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
const LCG_INV = 0xeeb9eb65;
const unstep = (v: number) => Number((BigInt.asUintN(32, BigInt(v) - 24691n) * BigInt(LCG_INV)) & 0xffffffffn);
const hash = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
const statusOf = (s1: number) => (s1 & 7 ? "sleep" : s1 & 0x88 ? "poison" : s1 & 0x10 ? "burn" : s1 & 0x20 ? "freeze" : s1 & 0x40 ? "paralysis" : "none") as "none";
const ranges = (xs: number[]) => xs.reduce<string[]>((acc, a, i) => {
  const m = /^(\d+)(?:\.\.(\d+))?$/.exec(acc.at(-1) ?? "");
  if (m && i > 0 && xs[i - 1] === a - 1) acc[acc.length - 1] = `${m[1]}..${a}`; else acc.push(String(a));
  return acc;
}, []);
function rgbOf(dir: string, row: Row): Uint8Array {
  const rgb = inflateSync(readFileSync(`${dir}/${String(row.frame).padStart(5, "0")}.rgb.z`));
  if (hash(rgb) !== row.sha256) throw new Error("RGB receipt drift");
  return rgb;
}
/** [total px, px inside BOX]; b is RGBA (production) when stride 4, RGB when 3. */
function diff(a: Uint8Array, b: Uint8Array, stride: 3 | 4): [number, number] {
  let px = 0, box = 0;
  for (let p = 0; p < 240 * 160; p++) {
    if (a[p * 3] !== b[p * stride] || a[p * 3 + 1] !== b[p * stride + 1] || a[p * 3 + 2] !== b[p * stride + 2]) {
      px++;
      const x = p % 240, y = Math.floor(p / 240);
      if (x >= BOX.x0 && x <= BOX.x1 && y >= BOX.y0 && y <= BOX.y1) box++;
    }
  }
  return [px, box];
}
function damageAfter(rows: Row[], from: number, target: number): number {
  const hp0 = rows[from]!.battlers[target]!.hp;
  for (let n = from; n < Math.min(rows.length, from + 600); n++) {
    const hp = rows[n]!.battlers[target]!.hp;
    if (hp !== hp0) return Math.max(0, hp0 - hp);
  }
  return 0;
}

const results: Record<string, unknown>[] = [];
for (const stem of stems) {
  const runs = [1, 2].map((r) => ({ rows: (JSON.parse(readFileSync(`${outDir}/${stem}-r${r}.json`, "utf8")) as { frames: Row[] }).frames, rgb: `${outDir}/${stem}-r${r}-rgb` }));
  const rows = runs[0]!.rows;
  if (runs[1]!.rows.map((r) => r.sha256).join() !== rows.map((r) => r.sha256).join()) throw new Error(`${stem}: r1 != r2 frames`);
  const scen = JSON.parse(readFileSync(`${opt.scenarios}/${stem}.json`, "utf8")) as { overrides: { parties: Record<"player" | "opponent", { gender: string }[]> } };
  const bodies: { moveId: number; side: "player" | "opponent" }[] = [];
  let nth = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    if (r.script === null || !r.script.startsWith("Move_") || r.script === "Move_COUNT" || rows[i - 1]?.script != null) continue;
    const attacker = r.animAttacker as 0 | 1, side = attacker === 0 ? "player" as const : "opponent" as const;
    let bodyEnd = i; while (rows[bodyEnd]!.script !== null) bodyEnd++;
    const move = r.script.replace(/^Move_/, ""), moveId = moveIds[move]!;
    const pre = bodies.slice(); bodies.push({ moveId, side });
    if (move !== opt.move) { i = bodyEnd - 1; continue; }
    if (r.battlers[attacker].behindSubstitute) throw new Error(`${stem}: subbed attacker`);
    const body = nth++;
    const b0 = r.battlers;
    const fixture = {
      move, probe: "tools/integration/prep40Probe.py", scenario: stem,
      attacker: { species: speciesName(b0[attacker].species), geometry: { side } },
      target: { species: speciesName(b0[1 - attacker]!.species), geometry: { side: side === "player" ? "opponent" : "player" } },
      fieldProfile: { playerHp: b0[0].hp, playerMaxHp: b0[0].maxHP, opponentHp: b0[1].hp, opponentMaxHp: b0[1].maxHP,
        playerGender: scen.overrides.parties.player[0]!.gender as "male", opponentGender: scen.overrides.parties.opponent[0]!.gender as "male" },
      precedingBodies: pre,
      displayedStatus: { player: statusOf(b0[0].status1), opponent: statusOf(b0[1].status1) },
      requestFields: { damage: damageAfter(rows, bodyEnd, 1 - attacker) },
      presentationRngActivation: { value: unstep(rows[i + 1]!.rng2), source: "prep40Probe.py gRng2Value at activation + 1, stepped back once" },
    } as Fixture;
    const v0 = liveView(fixture, 0);
    const request = (v0.effect as { request: BattleMoveAnimationRequest }).request;
    const N = NROM[moveId]!;
    // ROM-only lead table (both runs)
    const romLead = runs.map((run) => {
      const age0 = rgbOf(run.rgb, rows[i + N]!);
      return Array.from({ length: N + 1 }, (_, j) => {
        const row = rows[i + j]!;
        const [px, box] = diff(rgbOf(run.rgb, row), age0, 3);
        return { j, eqPre: row.sha256 === rows[i - 1]!.sha256, eqAge0: row.sha256 === rows[i + N]!.sha256, px, box, shadow: px > 0 && px === box };
      });
    });
    const L = liveMoveIdleLeadRows(request, v0.field);
    const D = liveMoveAnimationDuration(request, v0.field)!;
    const off = N - L;
    const cache = new Map<string, Uint8Array>();
    const prodAt = (age: number, preActivation: boolean) => {
      const k = `${age}:${preActivation}`;
      if (!cache.has(k)) {
        const v = liveView(fixture, age);
        const fb = new Uint8Array(240 * 160 * 4);
        renderBattleResolutionLiveView(fb, preActivation ? { ...v, effect: { ...(v.effect as object), preActivationRow: true } } as never : v);
        cache.set(k, fb);
      }
      return cache.get(k)!;
    };
    const per = runs.map((run) => Array.from({ length: L + D }, (_, j) =>
      diff(rgbOf(run.rgb, rows[i + off + j]!), prodAt(Math.max(0, j - L), opt["pre-activation"] === "1" && L > 0 && j === 0), 4)[0]));
    const leadPx = per.map((p) => p.slice(0, L));
    const bodyPx = per.map((p) => p.slice(L).reduce((s, x) => s + x, 0));
    const bad = per[0]!.map((x, j) => [j, x] as const).filter((x) => x[1] > 0);
    const shadowRows = romLead[0]!.filter((x) => x.shadow).map((x) => x.j);
    const entry = { stem, move, moveId, side, body, attacker: fixture.attacker.species, target: fixture.target.species, activation: r.frame,
      romBodyRows: bodyEnd - i, nRom: N, romPreEqualsRow0: romLead[0]![0]!.eqPre, romShadowRows: shadowRows,
      romRowsEqualAge0: romLead[0]!.filter((x) => x.eqAge0).map((x) => x.j), romLeadR1EqR2: JSON.stringify(romLead[0]) === JSON.stringify(romLead[1]),
      romLead: romLead[0], prodLead: L, prodDuration: D, preActivation: opt["pre-activation"] === "1", rows: L + D,
      leadPx, bodyPx, identical: per[0]!.join() === per[1]!.join(), exactRows: per[0]!.filter((x) => x === 0).length,
      badRows: ranges(bad.map((x) => x[0])), badPx: bad.slice(0, 24) };
    results.push(entry);
    console.log(`${stem} body${body} ${entry.attacker}->${entry.target} act ${r.frame} N ${N} romShadowRows [${shadowRows}] row0=A-1 ${entry.romPreEqualsRow0} rowsEqAge0 ${ranges(entry.romRowsEqualAge0).join(",")} | prod L ${L} D ${D} leadPx ${leadPx.map((p) => p.join("+")).join(" / ")} bodyPx ${bodyPx.join("/")} exact ${entry.exactRows}/${entry.rows} bad ${entry.badRows.slice(0, 8).join(",")}`);
    i = bodyEnd - 1;
  }
}
if (opt.out) writeFileSync(opt.out, `${JSON.stringify({ schema: "shadow105-lead-check/v1", results }, null, 1)}\n`);
