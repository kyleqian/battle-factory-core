/**
 * Live audit 24 (docs/live-audit-24.md): land97's idle lead rows, DIRECT dense ROM vs production (idle94 proved them by transitivity).
 * For every doll-free body of --move in fresh ctl95Probe.py runs (r1 and r2, every row), the window is the ROM activation A (the
 * probe's body start, gAnimScriptActive's rising edge) .. A + N + D - 1, where N = liveMoveIdleLeadRows(request, field) and
 * D = liveMoveAnimationDuration(request, field) are production's own (battleResolutionPresentationRender.ts / liveMoveAnimation.ts).
 * Production row j renders effect age max(0, j - N): the mapping of battleResolutionPresentationRender.ts:1453 (the command's
 * phaseElapsed j). So rows 0..N-1 are the lead rows production now draws (its age-0 image) and rows N.. are the accepted body
 * (production's accepted window starts at A + N: idle94 table windowStart - activation). Also reported: whether the ROM's A-1, A ..
 * A+N rows are one sha (the ROM's lead is static), and, for a SUBBED attacker body, production's lead for the Substitute-swap
 * composite (liveMoveIdleLeadRows on the doll field: must be 0; the composite itself is attdollLiveCheck.ts's).
 * Fixture inputs as ctl95ControlCheck.ts (HP, status1, genders, preceding bodies, the D3 activation value, request.damage).
 * usage: node --experimental-strip-types --no-warnings tools/integration/audit24LeadCheck.ts --scenarios=<dir> --move=<MOVE>
 *          [--out=<json>] <probe dir> <stem>...
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import { liveMoveIdleLeadRows, applySubstituteDollCommand } from "../../src/engine/battleResolutionPresentationRender.ts";
import { liveSubstituteSwapApplies } from "../../src/engine/liveSubstituteSwap.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

type Battler = { species: number; hp: number; maxHP: number; status1: number; behindSubstitute: boolean };
type Row = { frame: number; sha256: string; script: string | null; animAttacker: number; rng2: number; battlers: [Battler, Battler] };
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=") as [string, string]));
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
    if (move !== opt.move) { i = bodyEnd - 1; continue; }
    const subbed = r.battlers[attacker].behindSubstitute;
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
    const base = { stem, move, moveId, side, body, attacker: fixture.attacker.species, target: fixture.target.species, activation: r.frame,
      romBodyRows: bodyEnd - i };
    if (subbed) {
      // production's own doll field for a subbed attacker (attdollLiveCheck.ts's make()): the lead the swap composite presents
      const dollField = applySubstituteDollCommand(v0.field, { type: "move-animation", eventSequence: 0, battler: attacker,
        animation: { moveId: 164, attacker, target: attacker } as never, timing: { minimumFrames: 1 } } as never);
      const entry = { ...base, kind: "subbed", swapApplies: liveSubstituteSwapApplies(request, dollField), leadOnDollField: liveMoveIdleLeadRows(request, dollField),
        leadOnPlainField: liveMoveIdleLeadRows(request, v0.field) };
      results.push(entry);
      console.log(`${stem} ${move} ${side} body${body} SUBBED swapApplies ${entry.swapApplies} lead(doll) ${entry.leadOnDollField} lead(plain) ${entry.leadOnPlainField}`);
      i = bodyEnd - 1; continue;
    }
    const lead = liveMoveIdleLeadRows(request, v0.field);
    const duration = liveMoveAnimationDuration(request, v0.field)!;
    const window = rows.slice(i, i + lead + duration);
    const ageOf = (j: number) => Math.max(0, j - lead); // battleResolutionPresentationRender.ts:1453, phaseElapsed j
    const cache = new Map<number, Uint8Array>();
    const prodAt = (age: number) => {
      if (!cache.has(age)) { const fb = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(fb, liveView(fixture, age)); cache.set(age, fb); }
      return cache.get(age)!;
    };
    const per = runs.map((run) => window.map((row, j) => diff(rgbOf(run.rgb, row), prodAt(ageOf(j)))));
    const leadPx = per.map((p) => p.slice(0, lead).reduce((s, x) => s + x, 0));
    const bodyPx = per.map((p) => p.slice(lead).reduce((s, x) => s + x, 0));
    const bad = per[0]!.map((x, j) => [j, x] as const).filter((x) => x[1] > 0);
    const leadShas = rows.slice(i - 1, i + lead + 1).map((x) => x.sha256);
    const entry = { ...base, kind: "plain", lead, duration, rows: window.length, window: [window[0]!.frame, window.at(-1)!.frame],
      romLeadStatic: new Set(leadShas.slice(1)).size === 1, romPreRowEqual: leadShas[0] === leadShas[1],
      leadPx, bodyPx, identical: per[0]!.join() === per[1]!.join(), exactRows: per[0]!.filter((x) => x === 0).length,
      badRows: ranges(bad.map((x) => x[0])), badPx: bad.slice(0, 24) };
    results.push(entry);
    console.log(`${stem} ${move} ${side} body${body} ${entry.attacker}->${entry.target} act ${r.frame} romBody ${entry.romBodyRows} N ${lead} D ${duration} leadPx ${leadPx.join("/")} bodyPx ${bodyPx.join("/")} exact ${entry.exactRows}/${entry.rows} romLeadStatic ${entry.romLeadStatic} bad ${entry.badRows.slice(0, 8).join(",")}`);
    i = bodyEnd - 1;
  }
}
if (opt.out) writeFileSync(opt.out, `${JSON.stringify({ schema: "audit24-lead-check/v1", results }, null, 1)}\n`);
