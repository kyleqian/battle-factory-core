/**
 * ctl95 (docs/ctl95-doll-free-controls.md): the doll-free CONTROL bodies of the doll labs through the PRODUCTION live renderer as
 * committed, with each suspected fixture-side input switchable (the ablation):
 *   --shift=<n>          the window starts n rows after the ROM activation (gAnimScriptActive's rising edge, the probe body start)
 *                        and runs the adapter's own duration (production's accepted window; attdollLiveCheck.ts uses 0 = activation);
 *   --personalities=<d>  the attacker's party personality from doll90Personality.py (<d>/<stem>-r1.json); absent = none (as doll90);
 *   --body=<n>           only the n-th plain body of the move in the trace (0-based; default all: first AND later bodies);
 *   --emit=<dir>         write each window as a compact Tier-1 fixture (<stem>-b<body>.json: the fixture, the shift and the ROM RGB
 *                        sha256 of every window row, run 1; r1 == r2 is the entry's `identical`), re-rendered by ctl95ControlFixture.ts.
 * Fixture inputs are attdollLiveCheck.ts's (HP, status1, genders, preceding bodies, the D3 activation value, request.damage).
 * Both runs (r1, r2) of every window row are compared; px per row are printed for the bad rows.
 * usage: node --experimental-strip-types --no-warnings tools/integration/ctl95ControlCheck.ts --scenarios=<dir> --move=<MOVE> [--shift=n]
 *          [--personalities=<dir>] [--out=<json>] <probe dir> <stem>...
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

type Battler = { species: number; hp: number; maxHP: number; status1: number; behindSubstitute: boolean };
type Row = { frame: number; sha256: string; script: string | null; animAttacker: number; rng2: number; battlers: [Battler, Battler] };
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=") as [string, string]));
const [outDir, ...stems] = args.filter((a) => !a.startsWith("--")) as [string, ...string[]];
const shift = Number(opt.shift ?? 0);
const onlyBody = opt.body === undefined ? null : Number(opt.body);
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
function diff(rgb: Uint8Array, fb: Uint8Array): number {
  let px = 0;
  for (let p = 0; p < 240 * 160; p++) if (rgb[p * 3] !== fb[p * 4] || rgb[p * 3 + 1] !== fb[p * 4 + 1] || rgb[p * 3 + 2] !== fb[p * 4 + 2]) px++;
  return px;
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
    if (move !== opt.move || r.battlers[attacker].behindSubstitute) { i = bodyEnd - 1; continue; }
    const body = nth++;
    if (onlyBody !== null && body !== onlyBody) { i = bodyEnd - 1; continue; }
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
      ...(opt.personalities && existsSync(`${opt.personalities}/${stem}-r1.json`)
        ? { attackerPersonality: JSON.parse(readFileSync(`${opt.personalities}/${stem}-r1.json`, "utf8"))[side][0].personality } : {}),
    } as Fixture;
    const v0 = liveView(fixture, 0);
    const request = (v0.effect as { request: BattleMoveAnimationRequest }).request;
    const duration = liveMoveAnimationDuration(request, v0.field)!;
    const window = rows.slice(i + shift, i + shift + duration);
    const per = runs.map((run) => window.map((row, age) => {
      const fb = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(fb, liveView(fixture, age)); return diff(rgbOf(run.rgb, row), fb);
    }));
    const px = per.map((p) => p.reduce((s, x) => s + x, 0));
    const bad = per[0]!.map((x, age) => [age, x] as const).filter((x) => x[1] > 0);
    const entry = { stem, move, side, body, attacker: fixture.attacker.species, target: fixture.target.species, activation: r.frame,
      romBodyRows: bodyEnd - i, shift, window: [window[0]!.frame, window.at(-1)!.frame], rows: window.length, duration,
      personality: fixture.attackerPersonality ?? null, px, identical: per[0]!.join() === per[1]!.join(),
      exactRows: per[0]!.filter((x) => x === 0).length, badAges: ranges(bad.map((x) => x[0])), badPx: bad.slice(0, 24) };
    results.push(entry);
    if (opt.emit && entry.identical) {
      writeFileSync(`${opt.emit}/${stem}-b${body}.json`, `${JSON.stringify({ schema: "ctl95-control-fixture/v1", stem, body, shift,
        activation: r.frame, fixture, rows: window.map((row, age) => [age, row.frame, row.sha256]) })}\n`);
    }
    console.log(`${stem} ${move} ${side} body${body} ${entry.attacker}->${entry.target} act ${r.frame} romBody ${entry.romBodyRows} shift ${shift} rows ${entry.rows} px ${px.join("/")} exact ${entry.exactRows}/${entry.rows} bad ${entry.badAges.slice(0, 8).join(",")}`);
    i = bodyEnd - 1;
  }
}
if (opt.out) writeFileSync(opt.out, `${JSON.stringify({ schema: "ctl95-control-check/v1", results }, null, 1)}\n`);
