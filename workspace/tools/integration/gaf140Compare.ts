// gaf140 (S10A, ISSUES #168, docs/gaf140-status-gate-age.md): the IsBattleSEPlaying-GATED Scene ON status-animation windows
// (fixtures/gaf140/windows.json = seg127's gate > 0 receipts; gaf140Probes.sh dense direct-mGBA dumps, r1 == r2) compared THROUGH THE
// PRODUCTION RENDER PATH (createBattleResolutionPresentationRenderView + renderBattleResolutionLiveView), sar131ProductionCompare.ts's
// method. A constructed resolution segment [previous message (or the battler's `status` command when the instruction follows the script's
// own status1 write: GAF140_INFLICTED, sad133's `inflicted`), status-animation {battler, animation, timing as production builds it:
// minimumFrames = gate + STATUS_ANIMATION_ADDED_ROWS, seGateFrames = gate}, next message]; command age a == ROM row X + 1 + a (X = the
// statusanimation instruction's last row; a = 0 .. gate - 1 = the IsBattleSEPlaying rows, a = gate = the first gAnimScriptActive row R;
// a < 0 = the previous command's last frame, a >= minimumFrames = the next command). The x2 history = the production tracker over the
// ROM's earlier bodies / status animations (sar131History.ts).
// The constructed field is not the ROM's whole screen (HP, text), so production's frame P(a) is transplanted onto the ROM's row X wherever
// it differs from production's reference R(a) (the effect dropped; on the command's rows the opponent at its tracked rest and the
// elevated shadow shown — sar131Windows.ts `reference`): C(a) = ROM(X) except where P(a) != R(a). Compared on the full screen, rows
// a = -1 .. minimumFrames + 1 (the statusanimation row - 1 .. release + 2, gate rows included); on the next command's rows the message
// box band (y >= 112: its print) is reported apart.
//   node --experimental-strip-types --no-warnings tools/integration/gaf140Compare.ts <rom.json> <raw-dir> <out.json>
//     [--neg=prefix|gate-1|gate+1]   (controls; must fail: prefix = the pre-fix command, no seGateFrames: the effect at age a)
import { readFileSync, writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { createHash } from "node:crypto";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { sar131HistoryBefore } from "./sar131History.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView, type BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { STATUS_ANIMATION_ADDED_ROWS } from "../../src/engine/battleResolutionPresentation.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";

const PRE = 32;
const FRAME = 240 * 160 * 3;
const BOX_Y = 112;
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
const STATUS1: Partial<Record<string, number>> = { SLP: 3, PSN: 0x08, BRN: 0x10, FRZ: 0x20, PRZ: 0x40 };
/** The instruction labels whose status1 the script set right before (production emits its `status` command first). */
export const GAF140_INFLICTED = /^BattleScript_(MoveEffect(Burn|Freeze|Poison|Paralysis)|YawnMakesAsleep)\+/;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);

/** The production state of one gated window (`seGate`: the command's seGateFrames; null = the pre-fix command without the field). */
export function gaf140Window(
  scenarioPath: string, win: { animation: string; battler: 0 | 1; gate: number }, zeroed: readonly ("player" | "opponent")[] | null,
  seGate: number | null, inflicted = false,
) {
  const parties = JSON.parse(readFileSync(scenarioPath, "utf8")).overrides.parties;
  const make = (b: 0 | 1, mon: any) => Object.freeze({
    species: mon.species as number, name: speciesName(mon.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex: 0 as const, level: 50, hp: 100, maxHP: 100, gender: mon.gender as "male" | "female", status: "none" as const,
    moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, parties.player[0]), opponent: make(1, parties.opponent[0]) });
  const animation = win.animation as keyof typeof STATUS_ANIMATION_ADDED_ROWS;
  const rows = win.gate + STATUS_ANIMATION_ADDED_ROWS[animation];
  const x2Input = zeroed === null ? undefined : Object.freeze({ zeroed: Object.freeze([...zeroed]) });
  const message = (seq: number, lines: [string, string]) => Object.freeze({ type: "message", eventSequence: seq, lines, advance: "automatic",
    noCursor: false, timing: { minimumFrames: 1, holdFrames: 0 } });
  const timing = seGate === null || seGate <= 0 ? { minimumFrames: rows } : { minimumFrames: rows, seGateFrames: seGate };
  const command = Object.freeze({ type: "status-animation", eventSequence: 2, battler: win.battler, animation, timing });
  // sad133: a status the script just set (SetMoveEffect / Yawn) is production's `status` command right before (the effect's `inflicted`).
  const status = Object.freeze({ type: "status", eventSequence: 1, battler: win.battler, before: 0, after: STATUS1[animation] ?? 0,
    timing: { minimumFrames: 1 } });
  const commands = [inflicted ? status : message(1, ["PREVIOUS", "MESSAGE"]), command, message(3, ["NEXT", "MESSAGE"])];
  const viewOf = (commandIndex: number, age: number): BattleResolutionPresentationRenderView => createBattleResolutionPresentationRenderView({
    field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
    commandIndex, lifecycle: { phase: "presenting", phaseElapsed: age },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
    ...(x2Input === undefined ? {} : { liveMoveBattlerX2Input: x2Input }),
  } as never);
  /** Command age a == ROM row X + 1 + a. */
  const viewAt = (a: number) => a < 0 ? viewOf(0, 200) : a < rows ? viewOf(1, a) : viewOf(2, a - rows);
  const draw = (view: BattleResolutionPresentationRenderView) => {
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, view);
    return fb;
  };
  const reference = (a: number) => {
    const view = viewAt(a);
    if (a < 0) return draw({ ...view, effect: null });
    const rest = x2Input === undefined ? { x2: 0, y2: 0 } : liveBattlerAnchors("opponent", view.fieldArt, x2Input).frontIdleRest;
    const opp = view.fieldArt.opponent;
    return draw({ ...view, effect: null, postBodyShadowHidden: false,
      fieldArt: { ...view.fieldArt, opponent: { ...opp, origin: { x: opp.origin.x + rest.x2, y: opp.origin.y + rest.y2 } } } });
  };
  return { rows, viewAt, draw, reference };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
  const [romPath, rawDir, outPath] = args.filter((a) => !a.startsWith("--")) as [string, string, string];
  const rom = JSON.parse(readFileSync(romPath, "utf8"));
  const result: Record<string, unknown> = {};
  let windows = 0, clean = 0, gateRowsClean = 0;
  const digest = createHash("sha256");
  for (const [stem, scen] of Object.entries<any>(rom)) {
    const w = scen.windows.find((x: any) => x.gated);
    windows++;
    const history = sar131HistoryBefore(scen, w.R);
    const zeroed = (["player", "opponent"] as const).filter((s) => history[s] === "zeroed");
    const seGate = neg === "prefix" ? null : neg === "gate-1" ? w.gate - 1 : neg === "gate+1" ? w.gate + 1 : w.gate;
    const inflicted = GAF140_INFLICTED.test(scen.window.label);
    const win = gaf140Window(scen.window.scenario, w, zeroed, seGate, inflicted);
    const raw = readFileSync(`${rawDir}/${w.dump.replace(/\.npz$/, ".rgb")}`);
    const first = w.R - PRE; // raw frame 0 = row R - 32
    const romRowAt = (a: number) => { const i = w.X + 1 + a - first; return raw.subarray(i * FRAME, (i + 1) * FRAME); };
    const base = romRowAt(-1); // row X
    const perRow: [number, number, number][] = [];
    const productionSha: string[] = [];
    let fullPx = 0, gatePx = 0, firstBad: number | null = null;
    const nextRows: { a: number; fullPx: number; boxPx: number }[] = [];
    for (let a = -1; a <= win.rows + 1; a++) {
      const fb = win.draw(win.viewAt(a));
      const ref = win.reference(a);
      productionSha.push(sha(fb));
      const romRow = romRowAt(a);
      let fp = 0, bp = 0;
      for (let o = 0; o < 240 * 160; o++) {
        const changed = fb[o * 4] !== ref[o * 4] || fb[o * 4 + 1] !== ref[o * 4 + 1] || fb[o * 4 + 2] !== ref[o * 4 + 2];
        const src = changed ? fb : base, k = changed ? o * 4 : o * 3;
        if (src[k] === romRow[o * 3] && src[k + 1] === romRow[o * 3 + 1] && src[k + 2] === romRow[o * 3 + 2]) continue;
        fp++;
        if (Math.floor(o / 240) >= BOX_Y) bp++;
      }
      const onNext = a >= win.rows;
      perRow.push([a, fp, bp]);
      if (onNext) nextRows.push({ a, fullPx: fp, boxPx: bp });
      const counted = onNext ? fp - bp : fp;
      fullPx += counted;
      if (a >= 0 && a < w.gate) gatePx += counted;
      if (counted && firstBad === null) firstBad = a;
    }
    if (fullPx === 0) clean++;
    if (gatePx === 0) gateRowsClean++;
    digest.update(`${stem}:${JSON.stringify(perRow)}\n`);
    result[stem] = {
      animation: w.animation, side: w.battler === 0 ? "player" : "opponent", label: scen.window.label, inflicted, X: w.X, R: w.R, gate: w.gate, activeRows: w.activeRows,
      x2History: history, zeroed, rows: { compared: perRow.length, first: -1, last: win.rows + 1, firstBad },
      fullScreen: { px: fullPx }, gateRows: { rows: w.gate, px: gatePx }, zeroPx: fullPx === 0, nextCommandRows: nextRows,
      productionFrameSha: productionSha, perRowMismatches: perRow.filter((r) => r[1]),
    };
    console.log(stem, w.animation, w.battler === 0 ? "player" : "opponent", `gate ${w.gate} rows ${perRow.length}: full ${fullPx} px (gate rows ${gatePx}) firstBad ${firstBad}; next ${JSON.stringify(nextRows)}`);
  }
  result.summary = { neg: neg ?? null, windows, zeroPxWindows: clean, gateRowsZeroPxWindows: gateRowsClean, perRowDigest: digest.digest("hex").slice(0, 16) };
  console.log(`gated windows, production path, full screen 0 px (rows statusanimation-1 .. release+2): ${clean} / ${windows}; gate rows 0 px: ${gateRowsClean} / ${windows}`);
  writeFileSync(outPath, JSON.stringify(result, null, 1) + "\n");
}
