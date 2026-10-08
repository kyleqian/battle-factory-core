/**
 * prep40: subbed-ATTACKER composites (SUBSTITUTE_TO_MON .. MON_TO_SUBSTITUTE's first inactive row) through the PRODUCTION live renderer
 * (renderBattleResolutionLiveView over liveAdapterFramebuffer.ts liveView, the attacker's doll set by the production setter
 * applySubstituteDollCommand) vs BOTH fresh prep40Probe.py runs, every row. Run it with the temporary production patch
 * tools/integration/fixtures/prep40/swap-ids-framing-env.diff applied and PREP40_SWAP_IDS=<the probed ids> (the env is read at module
 * load), or without the ids for the production-today fallback column.
 *
 * Per window (one per Special_SubstituteToMon whose attacker runs a Move_ body; first window of each scenario plus every later one):
 *   prod     the composite as production frames it (body = the adapter's own duration, live age = body row);
 *   aligned  (only when prod is not 0 px) the body framed as the ROM's own body rows (activation .. first swap-back row) shown at
 *            adapter age row + shift (PREP40_FRAMING), the shift scanned in [-24, 24] on run 1 (smallest residual, ties smallest |shift|);
 *   tail     ROM rows k+1, k+2 after the window's first inactive row k: production today (the settled doll, effect null = the next
 *            command's first row) vs the composite rendered one row longer (substituteSwapFrameAt at age = window length).
 * Plain (doll-free) bodies of the same move in the same probe are measured as controls (activation .. first inactive row, shift scanned).
 * usage: node --experimental-strip-types --no-warnings tools/integration/prep40Check.ts --out=<receipt.json> [--order=drop-164]
 *        <OUT dir> <stem>...        (reads <OUT>/<stem>-r{1,2}.json and -rgb; the scenario json from fixtures/prep40/scenarios)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { applySubstituteDollCommand } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import { substituteSwapBodyField, substituteSwapRows, substituteSwapScriptRows, LIVE_SUBSTITUTE_SWAP_BODY_IDS } from "../../src/engine/liveSubstituteSwap.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

type Battler = { species: number; hp: number; maxHP: number; status1: number; behindSubstitute: boolean };
type Row = { frame: number; sha256: string; script: string | null; animAttacker: number; rng2: number; battlers: [Battler, Battler] };
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=") as [string, string]));
const [outDir, ...stems] = args.filter((a) => !a.startsWith("--")) as [string, ...string[]];
const moveIds: Record<string, number> = Object.fromEntries(moveData.moves.map((m) => [m.move.replace(/^MOVE_/, ""), m.id]));
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
const LCG_INV = 0xeeb9eb65; // inverse of 1103515245 mod 2^32
const unstep = (v: number) => Number((BigInt.asUintN(32, BigInt(v) - 24691n) * BigInt(LCG_INV)) & 0xffffffffn);
const hash = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
const statusOf = (s1: number) => (s1 & 7 ? "sleep" : s1 & 0x88 ? "poison" : s1 & 0x10 ? "burn" : s1 & 0x20 ? "freeze" : s1 & 0x40 ? "paralysis" : "none") as "none";

function rgbOf(dir: string, row: Row): Uint8Array {
  const path = `${dir}/${String(row.frame).padStart(5, "0")}.rgb.z`;
  if (!existsSync(path)) throw new Error(`no RGB for frame ${row.frame}`);
  const rgb = inflateSync(readFileSync(path));
  if (hash(rgb) !== row.sha256) throw new Error("RGB receipt drift");
  return rgb;
}
function diff(rgb: Uint8Array, fb: Uint8Array): { px: number; bbox: number[] | null } {
  let px = 0; const box = [240, 160, -1, -1];
  for (let p = 0; p < 240 * 160; p++) {
    if (rgb[p * 3] !== fb[p * 4] || rgb[p * 3 + 1] !== fb[p * 4 + 1] || rgb[p * 3 + 2] !== fb[p * 4 + 2]) {
      px++; const x = p % 240, y = (p / 240) | 0;
      box[0] = Math.min(box[0]!, x); box[1] = Math.min(box[1]!, y); box[2] = Math.max(box[2]!, x); box[3] = Math.max(box[3]!, y);
    }
  }
  return { px, bbox: px ? box : null };
}
const ranges = (xs: number[]) => xs.reduce<string[]>((acc, a, i) => {
  const m = /^(\d+)(?:\.\.(\d+))?$/.exec(acc.at(-1) ?? "");
  if (m && i > 0 && xs[i - 1] === a - 1) acc[acc.length - 1] = `${m[1]}..${a}`; else acc.push(String(a));
  return acc;
}, []);

/**
 * A swap with no body after it (the faint / switch-out SUBSTITUTE_TO_MON): rows i .. end vs the production swap-in frames
 * (substituteSwapFrameAt ages 0..; a stand-in proven body, BODY_SLAM, under the patch, so only swap rows are drawn). Full frame and
 * field-only (y < 112: the message box text is the stand-in's, not the ROM's) px per run.
 */
function swapOnlyPixels(stem: string, runs: { rows: Row[]; rgb: string }[], rows: Row[], i: number, end: number, attacker: 0 | 1) {
  const side = attacker === 0 ? "player" as const : "opponent" as const;
  const b0 = rows[i]!.battlers;
  const f = { move: "BODY_SLAM", probe: "tools/integration/prep40Probe.py", scenario: stem,
    attacker: { species: speciesName(b0[attacker].species), geometry: { side } },
    target: { species: speciesName(b0[1 - attacker]!.species), geometry: { side: side === "player" ? "opponent" : "player" } },
    fieldProfile: { playerHp: b0[0].hp, playerMaxHp: b0[0].maxHP, opponentHp: b0[1].hp, opponentMaxHp: b0[1].maxHP, playerGender: "male", opponentGender: "male" },
    precedingBodies: [] } as unknown as Fixture;
  const per = runs.map((run) => rows.slice(i, end).map((row, age) => {
    const v = liveView(f, age);
    const field = applySubstituteDollCommand(v.field, { type: "move-animation", eventSequence: 0, battler: attacker,
      animation: { moveId: 164, attacker, target: attacker } as never, timing: { minimumFrames: 1 } } as never);
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, { ...v, field, fieldArt: createBattleCommandFieldArtView(field) });
    const rgb = rgbOf(run.rgb, row);
    const full = diff(rgb, fb);
    const top = diff(rgb.subarray(0, 240 * 112 * 3), fb.subarray(0, 240 * 112 * 4));
    return [full.px, top.px];
  }));
  return { standInSwapPx: per.map((p) => p.reduce((a, x) => a + x[0]!, 0)), standInSwapFieldPx: per.map((p) => p.reduce((a, x) => a + x[1]!, 0)),
    standInFieldBadRows: ranges(per[0]!.map((x, n) => [n, x[1]!] as const).filter((x) => x[1] > 0).map((x) => x[0])) };
}

const results: Record<string, unknown>[] = [];
for (const stem of stems) {
  const runs = [1, 2].map((r) => ({ rows: (JSON.parse(readFileSync(`${outDir}/${stem}-r${r}.json`, "utf8")) as { frames: Row[] }).frames, rgb: `${outDir}/${stem}-r${r}-rgb` }));
  const scen = JSON.parse(readFileSync(`tools/integration/fixtures/prep40/scenarios/${stem}.json`, "utf8")) as { overrides: { parties: Record<"player" | "opponent", { gender: string }[]> } };
  const rows = runs[0]!.rows;
  if (runs[1]!.rows.map((r) => r.sha256).join() !== rows.map((r) => r.sha256).join()) throw new Error(`${stem}: r1 != r2 frames`);
  const bodies: { moveId: number; side: "player" | "opponent" }[] = [];
  const seenTurns = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    if (r.script === null || rows[i - 1]?.script === r.script) continue;
    const prevActive = rows[i - 1]?.script != null;
    const attacker = r.animAttacker as 0 | 1, side = attacker === 0 ? "player" as const : "opponent" as const;
    const isBodyStart = r.script.startsWith("Move_") && r.script !== "Move_COUNT" && !prevActive;
    const swapIn = r.script === "Special_SubstituteToMon";
    if (!isBodyStart && !swapIn) continue;
    // window bounds
    let a: number, bodyEnd: number, k: number, kind: string;
    if (swapIn) {
      let j = i; while (rows[j]!.script === "Special_SubstituteToMon") j++;
      if (rows[j]!.script !== null || !rows[j + 1]?.script?.startsWith("Move_")) {
        const bat = (x: Row) => x.battlers[attacker] as Battler & { sprite: { x2: number }; tileDigest: string };
        results.push({ stem, kind: "swap-without-body", side, frame: r.frame, swapInRows: j - i, next: rows[j]!.script ?? rows[j + 1]?.script ?? null,
          x2: rows.slice(i, j + 3).map((x) => bat(x).sprite.x2), tileSwitchRow: rows.slice(i, j + 3).findIndex((x, n) => n > 0 && bat(x).tileDigest !== bat(rows[i]!).tileDigest),
          modelX2: substituteSwapRows(side, true).map((x) => x.x2), hpAfter: rows[j]!.battlers[attacker].hp,
          ...swapOnlyPixels(stem, runs, rows, i, j + 3, attacker) });
        i = j; continue;
      }
      a = j + 1; bodyEnd = a;
      // body: every row up to the first Special_MonToSubstitute row (multi-hit: the rows between hits included)
      while (bodyEnd < rows.length && rows[bodyEnd]!.script !== "Special_MonToSubstitute") bodyEnd++;
      k = bodyEnd; while (rows[k]!.script === "Special_MonToSubstitute") k++;
      const gaps = rows.slice(a, bodyEnd).some((x) => x.script === null);
      kind = gaps ? "swap-multihit" : "swap";
    } else {
      if (r.battlers[attacker].behindSubstitute) continue; // a subbed body without a swap would be a different finding
      a = i; bodyEnd = a; while (rows[bodyEnd]!.script !== null) bodyEnd++;
      k = bodyEnd; kind = "plain";
    }
    const body = rows[a]!;
    const move = body.script!.replace(/^Move_/, "");
    const moveId = moveIds[move];
    if (moveId === undefined) throw new Error(`unmapped ${body.script}`);
    const turnKey = `${move}/${side}`;
    const turn = ["DIG", "SOLAR_BEAM", "FLY"].includes(move) ? (seenTurns.get(turnKey) ?? 0) % 2 : 0;
    seenTurns.set(turnKey, (seenTurns.get(turnKey) ?? 0) + 1);
    const pre = bodies.slice();
    bodies.push({ moveId, side });
    if (move === "SUBSTITUTE" || move === "TACKLE") { i = k; continue; }
    const b0 = rows[a]!.battlers;
    const genders = { player: scen.overrides.parties.player[0]!.gender, opponent: scen.overrides.parties.opponent[0]!.gender };
    const fixture: Fixture = {
      move, probe: "tools/integration/prep40Probe.py", scenario: stem,
      attacker: { species: speciesName(b0[attacker].species), geometry: { side } },
      target: { species: speciesName(b0[1 - attacker]!.species), geometry: { side: side === "player" ? "opponent" : "player" } },
      fieldProfile: { playerHp: b0[0].hp, playerMaxHp: b0[0].maxHP, opponentHp: b0[1].hp, opponentMaxHp: b0[1].maxHP,
        playerGender: genders.player as "male", opponentGender: genders.opponent as "male" },
      precedingBodies: opt.order === "drop-164" ? pre.filter((u) => u.moveId !== 164) : pre,
      displayedStatus: { player: statusOf(rows[i]!.battlers[0].status1), opponent: statusOf(rows[i]!.battlers[1].status1) },
      ...(turn ? { requestFields: { turn } } : {}),
      presentationRngActivation: { value: unstep(rows[a + 1]!.rng2), source: "prep40Probe.py gRng2Value at activation + 1, stepped back once" },
    } as Fixture;
    let orderInput = opt.order ?? "fixture";
    const withOrder = <T>(fn: () => T): T => {
      if (orderInput === "none" || orderInput === "first-body") process.env.POKEBENCH_LIVE_ORDER_INPUT = orderInput;
      try { return fn(); } finally { delete process.env.POKEBENCH_LIVE_ORDER_INPUT; }
    };
    let declinedNoAdapter = false;
    try { liveView(fixture, 0); } catch (e) {
      const m = String(e);
      if (m.includes("Sprite order unknown")) orderInput = "none";
      else if (m.includes("No live adapter")) declinedNoAdapter = true;
      else throw e;
    }
    const make = (age: number) => withOrder(() => {
      const view = liveView(fixture, age);
      if (kind === "plain") return view;
      const field = applySubstituteDollCommand(view.field, {
        type: "move-animation", eventSequence: 0, battler: attacker,
        animation: { moveId: 164, attacker, target: attacker } as never, timing: { minimumFrames: 1 },
      } as never);
      return { ...view, field, fieldArt: createBattleCommandFieldArtView(field) };
    });
    const entry: Record<string, unknown> = { stem, kind, side, move, moveId, turn, frame: rows[i]!.frame, activation: body.frame,
      window: [rows[i]!.frame, rows[k]!.frame], rows: k - i + 1, swapInRows: a - 1 - i, romBodyRows: bodyEnd - a, swapBackRows: k - bodyEnd,
      orderInput, pinnedRng2: fixture.presentationRngActivation!.value };
    if (declinedNoAdapter) { results.push({ ...entry, adapter: "none" }); i = k; continue; }
    if (kind === "swap-multihit") {
      const bat = (x: Row) => x.battlers[attacker] as Battler & { sprite: { x2: number; invisible: boolean }; tileDigest: string };
      const segs: { script: string | null; rows: number; tiles: string[]; x2: number[] }[] = [];
      for (const x of rows.slice(i, k + 1)) {
        const label = x.script === null ? null : x.script.startsWith("Move_") ? "Move_" : x.script;
        const last = segs.at(-1);
        if (last && last.script === label) { last.rows++; if (!last.tiles.includes(bat(x).tileDigest)) last.tiles.push(bat(x).tileDigest); if (!last.x2.includes(bat(x).sprite.x2)) last.x2.push(bat(x).sprite.x2); }
        else segs.push({ script: label, rows: 1, tiles: [bat(x).tileDigest], x2: [bat(x).sprite.x2] });
      }
      const doll = bat(rows[i]!).tileDigest;
      results.push({ ...entry, segments: segs.map((g) => ({ script: g.script, rows: g.rows, x2: g.x2, shows: g.tiles.map((t) => (t === doll ? "doll" : "mon")) })) });
      console.log(`${stem} ${kind} ${side} ${move} segments ${JSON.stringify(segs.map((g) => [g.script, g.rows]))}`);
      i = k; continue;
    }
    try {
    const v0 = make(0);
    const request = (v0.effect as { request: BattleMoveAnimationRequest }).request;
    const bodyField = kind === "plain" ? v0.field : substituteSwapBodyField(v0.field, attacker);
    entry.adapterDuration = withOrder(() => liveMoveAnimationDuration(request, bodyField));
    entry.multihit = request.multihit;
    entry.productionDuration = withOrder(() => liveMoveAnimationDuration(request, v0.field));
    entry.swapPresented = LIVE_SUBSTITUTE_SWAP_BODY_IDS.has(moveId);
    const window = rows.slice(i, k + 1);
    const rgbs = runs.map((run) => window.map((row) => rgbOf(run.rgb, row)));
    const measure = (render: (age: number) => Uint8Array) => {
      const per = runs.map((_, ri) => window.map((_, age) => diff(rgbs[ri]![age]!, render(age))));
      const px = per.map((p) => p.reduce((s, x) => s + x.px, 0));
      const digests = per.map((p) => hash(JSON.stringify(p.map((x) => x.px))).slice(0, 16));
      const bad = per[0]!.map((x, age) => [age, x.px, x.bbox] as const).filter((x) => x[1] > 0);
      return { px, exactRows: per[0]!.filter((x) => x.px === 0).length, digests, identical: digests[0] === digests[1],
        badAges: ranges(bad.map((x) => x[0])).slice(0, 12), maxPxRow: Math.max(0, ...bad.map((x) => x[1])), firstBad: bad.slice(0, 4) };
    };
    const renderAt = (age: number) => { const fb = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(fb, make(age)); return fb; };
    const prodCache = new Map<number, Uint8Array>();
    const prodAt = (age: number) => prodCache.get(age) ?? (prodCache.set(age, renderAt(age)), prodCache.get(age)!);
    entry.prod = measure(prodAt);
    const prodPx = (entry.prod as { px: number[] }).px;
    // Alignment: kind swap -> body framed by the ROM's own rows at age row + shift; plain -> live age = row + shift.
    if (prodPx[0] !== 0 && kind !== "swap-multihit") {
      const S = kind === "plain" ? 0 : substituteSwapScriptRows(side) + 1;
      const bodyRows = bodyEnd - a + 1; // activation .. first inactive / first swap-back row
      const shifted = new Map<string, Uint8Array>();
      const at = (shift: number, age: number) => {
        // composite body rows = ages S+1 .. S+bodyRows-1 (age S, body age 0, still shows the swap-in tail: substituteSwapFrameAt)
        const key = kind === "plain" ? `${age + shift}` : age > S && age < S + bodyRows ? `b${age - S + shift}` : `s${age}`;
        let fb = shifted.get(key);
        if (!fb) {
          if (kind === "plain") fb = renderAt(age + shift);
          else { process.env.PREP40_FRAMING = `${bodyRows}:${shift}`; try { fb = renderAt(age); } finally { delete process.env.PREP40_FRAMING; } }
          shifted.set(key, fb);
        }
        return fb;
      };
      const scan: [number, number][] = [];
      for (let s = -24; s <= 24; s++) scan.push([s, window.reduce((sum, _, age) => sum + diff(rgbs[0]![age]!, at(s, age)).px, 0)]);
      const best = [...scan].sort((x, y) => x[1] - y[1] || Math.abs(x[0]) - Math.abs(y[0]))[0]!;
      entry.aligned = { framingRows: kind === "plain" ? null : bodyRows, shift: best[0], ...measure((age) => at(best[0], age)),
        zeroShifts: scan.filter((x) => x[1] === 0).map((x) => x[0]) };
    }
    if (kind !== "plain" && rows[k + 2]) {
      // tail rows k+1, k+2: production today = the settled doll (the next command's first row; effect null) vs one row longer.
      const settled = (() => { const v = make(0); const fb = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(fb, { ...v, effect: null }); return fb; })();
      const tail = [k + 1, k + 2].map((t) => runs.map((run) => rgbOf(run.rgb, rows[t]!)));
      // one row longer, framed by the ROM body rows (the swap rows do not depend on the body shift)
      const framed = (age: number) => {
        process.env.PREP40_FRAMING = `${bodyEnd - a + 1}:0`;
        try { return renderAt(age); } finally { delete process.env.PREP40_FRAMING; }
      };
      const longer = framed(window.length);
      entry.tail = {
        rowK1: { today: tail[0]!.map((rgb) => diff(rgb, settled)), oneRowLonger: tail[0]!.map((rgb) => diff(rgb, longer)) },
        rowK2: { today: tail[1]!.map((rgb) => diff(rgb, settled)), oneRowLonger: tail[1]!.map((rgb) => diff(rgb, framed(window.length + 1))) },
        scriptK1: rows[k + 1]!.script, scriptK2: rows[k + 2]!.script,
      };
    }
    } catch (e) { entry.error = String(e).slice(0, 200); results.push(entry); console.log(`${stem} ${kind} ${move} ERROR ${entry.error}`); i = kind === "plain" ? k - 1 : k; continue; }
    results.push(entry);
    const p = entry.prod as { px: number[]; exactRows: number };
    const al = entry.aligned as { shift: number; px: number[]; framingRows: number | null } | undefined;
    console.log(`${stem} ${kind} ${side} ${move} t${turn} rows ${entry.rows} body ${entry.romBodyRows} D ${entry.adapterDuration} prodDur ${entry.productionDuration} order ${orderInput} prod ${p.px.join("/")} exact ${p.exactRows}${al ? ` aligned shift ${al.shift} px ${al.px.join("/")}` : ""}`);
    i = kind === "plain" ? k - 1 : k;
  }
}
if (opt.out) writeFileSync(opt.out, `${JSON.stringify({ schema: "prep40-check/v1", swapIds: [...LIVE_SUBSTITUTE_SWAP_BODY_IDS], order: opt.order ?? "fixture", results }, null, 1)}\n`);
