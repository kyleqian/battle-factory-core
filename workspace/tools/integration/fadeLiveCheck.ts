/**
 * S10A Substitute fade live (docs/next-adapters-prep39.md): General_SubstituteFade through the PRODUCTION presentation queue
 * view and live renderer, dense, against fresh direct-mGBA frames (prep39Probe.py). Every window row is the production
 * `createBattleResolutionPresentationRenderView` of a resolution segment [dismissed button message, substitute-fade command,
 * "faded" message] at the fade command's age, the fading battler shown as the doll before it (as production sets it after the
 * Substitute body), the x2 history from the probe's preceding move bodies / fades through the production tracker, drawn by
 * `renderBattleResolutionLiveView`. Rows: the script rows, the first inactive row and the 2-row OAM tail (the command's whole
 * length; the ROM's next box change is the row after).
 *
 * Inputs owned by the message queue, not the fade (prep39 s2): the box contents before the fade (the queue's
 * STRINGID_SUBSTITUTEDMG, except MESSAGE_OVERRIDES where the ROM box is already cleared). The ROM also shows a frozen wait
 * cursor in the box on every fade row; production's queue presents that message as an AUTOMATIC message (no cursor on any
 * row), so the claim is scoped to the pixels outside the cursor footprint (the union of production's own drawCursor over the
 * four CURSOR_Y_OFFSETS phases at the line-2 end); pixels inside it are reported separately (cursorBoxPx).
 *
 * usage: npx vite-node tools/integration/fadeLiveCheck.ts <probe.json:rgb-dir>... --out=<receipt.json>
 *   [--neg=age+1|no-fade|no-x2]   (negative controls; must FAIL)
 */
import { readFileSync, writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { applyLiveBattlerX2Event, LIVE_BATTLER_X2_IDLE, liveMoveBattlerX2Input } from "../../src/engine/liveBattlerX2History.ts";
import { substituteFadeDuration, substituteFadeScriptRows } from "../../src/engine/liveSubstituteFade.ts";
import { dominantLiveMoveTimingPhase, LIVE_STATUS_ANIMATION_TIMING_POLICY } from "../../src/engine/liveMoveTimingPolicy.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";

const FADE = "General_SubstituteFade";
type Battler = { species: number; hp: number; maxHP: number; behindSubstitute: boolean };
type Row = { frame: number; sha256: string; script: string | null; animAttacker: number; battlers: [Battler, Battler] };
type Probe = { scenario: string; profile: string; scriptStarts: [number, string, number][]; rows: Row[] };
type Side = "player" | "opponent";

const args = process.argv.slice(2);
const opt = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const out = opt("out");
const neg = opt("neg");
const inputs = args.filter((a) => !a.startsWith("--"));
if (!out || !inputs.length) throw new Error("usage: see header");

const moveIds: Record<string, number> = Object.fromEntries(moveData.moves.map((m) => [m.move.replace(/^MOVE_/, ""), m.id]));
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
/** Windows whose box shows a different queue state (super-effective Earthquake: the box is already cleared, no cursor). */
const MESSAGE_OVERRIDES: Record<string, { lines: [string, string]; cursor: false }> = {
  "prep39-on-player-golem-onix@946": { lines: ["", ""], cursor: false },
};
/**
 * Documented alternate VBlank phase rows (docs/next-adapters-prep39.md s3; liveMoveTimingPolicy.ts
 * LIVE_STATUS_ANIMATION_TIMING_POLICY.SUBSTITUTE_FADE "no-event", not the shipped phase): BLDALPHA's step one row early on rows
 * 27 and 45 of this window (271 px each). The blendoff-one-row-early windows are 0 px (eva 0 from row 52).
 */
const ALTERNATE_PHASE_ROWS: Record<string, readonly number[]> = { "prep39-on-player-persian-onix@3822": [27, 45] };

function fieldOf(probe: Probe, row: Row, fading: 0 | 1): BattleResolutionDisplayedField {
  const scenario = JSON.parse(readFileSync(probe.scenario, "utf8"));
  const make = (b: 0 | 1) => {
    const side = b === 0 ? "player" : "opponent";
    const mon = row.battlers[b];
    return Object.freeze({
      species: mon.species, name: speciesName(mon.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
      partyIndex: 0 as const, level: 50, hp: mon.hp, maxHP: mon.maxHP,
      gender: scenario.overrides.parties[side][0].gender as "male" | "female", status: "none" as const,
      moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
      ...(b === fading ? { substituteDoll: true as const } : {}),
    });
  };
  return Object.freeze({ player: make(0), opponent: make(1) }) as unknown as BattleResolutionDisplayedField;
}

const results = [];
let failed = false;
for (const input of inputs) {
  const [probePath, rgbDir] = input.split(":") as [string, string];
  const probe = JSON.parse(readFileSync(probePath, "utf8")) as Probe;
  const rows = probe.rows;
  const stem = probe.scenario.split("/").at(-1)!.replace(/\.json$/, "");
  const starts = rows.map((r, i) => (r.script === FADE && rows[i - 1]?.script !== FADE ? i : -1)).filter((i) => i >= 0);
  for (const s of starts) {
    const attacker = rows[s]!.animAttacker as 0 | 1, side: Side = attacker === 0 ? "player" : "opponent";
    const duration = substituteFadeDuration(side), scriptRows = substituteFadeScriptRows(side);
    const window = rows.slice(s, s + duration);
    const dense = window.length === duration && window.every((r, i) => r.frame === window[0]!.frame + i)
      && window.slice(0, scriptRows).every((r) => r.script === FADE) && window[scriptRows]!.script === null;
    // Production x2 history over the probe's preceding move bodies and fades (Move_* / General_SubstituteFade starts).
    let history = LIVE_BATTLER_X2_IDLE;
    for (const [frame, label, who] of probe.scriptStarts) {
      if (frame >= window[0]!.frame) continue;
      const at: Side = who === 0 ? "player" : "opponent";
      if (label === FADE) history = applyLiveBattlerX2Event(history, { kind: "substitute-fade", side: at });
      else if (label.startsWith("Move_") && label !== "Move_COUNT") {
        history = applyLiveBattlerX2Event(history, { kind: "move-body", moveId: moveIds[label.slice(5)]!, attackerSide: at });
      }
    }
    const x2Input = neg === "no-x2" ? undefined : liveMoveBattlerX2Input(history);
    const field = fieldOf(probe, window[0]!, attacker);
    const fading = speciesName(window[0]!.battlers[attacker].species);
    const override = MESSAGE_OVERRIDES[`${stem}@${window[0]!.frame}`];
    const lines: [string, string] = override?.lines ?? ["The SUBSTITUTE took damage", `for ${side === "opponent" ? "Foe " : ""}${fading}!`];
    const message = (advance: "button" | "automatic") => Object.freeze({ type: "message", eventSequence: 1, lines, advance,
      noCursor: false, timing: { minimumFrames: 1, holdFrames: 0 } });
    const fade = Object.freeze({ type: "substitute-fade", eventSequence: 2, battler: attacker, timing: { minimumFrames: duration } });
    const faded = Object.freeze({ type: "message", eventSequence: 3, lines: ["x", "y"], advance: "automatic", noCursor: false,
      timing: { minimumFrames: 1, holdFrames: 0 }, substituteFadeBattler: attacker });
    const commands = neg === "no-fade" ? [message(override ? "automatic" : "button"), faded] : [message(override ? "automatic" : "button"), fade, faded];
    const stateAt = (age: number) => ({
      field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
      commandIndex: 1, lifecycle: { phase: "presenting", phaseElapsed: age },
      confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
      ...(x2Input === undefined ? {} : { liveMoveBattlerX2Input: x2Input }),
    });
    // The wait cursor's footprint: production drawCursor at the line-2 end, every CURSOR_Y_OFFSETS phase (message host, not the fade).
    const cursorMask = new Uint8Array(240 * 160);
    if (!override) {
      const base = createBattleResolutionPresentationRenderView(stateAt(0) as never);
      const plain = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(plain, base);
      for (const age of [0, 9, 18, 27]) {
        const fb = new Uint8Array(240 * 160 * 4);
        renderBattleResolutionLiveView(fb, { ...base, waitCursor: { age } });
        for (let p = 0; p < 240 * 160; p++) if (fb[p * 4] !== plain[p * 4] || fb[p * 4 + 1] !== plain[p * 4 + 1] || fb[p * 4 + 2] !== plain[p * 4 + 2]) cursorMask[p] = 1;
      }
    }
    const evaluate = () => {
      let zero = 0, total = 0, cursorBoxPx = 0, allPx = 0;
      const perRow: number[] = [];
      const nonZero: { age: number; frame: number; px: number; bbox: number[] }[] = [];
      const romDigest = createHash("sha256");
      for (const [age, row] of window.entries()) {
        const view = createBattleResolutionPresentationRenderView(stateAt(neg === "age+1" ? age + 1 : age) as never);
        const fb = new Uint8Array(240 * 160 * 4);
        renderBattleResolutionLiveView(fb, view);
        const rgb = inflateSync(readFileSync(`${rgbDir}/${String(row.frame).padStart(5, "0")}.rgb.z`));
        if (createHash("sha256").update(rgb).digest("hex") !== row.sha256) throw new Error("RGB receipt drift");
        romDigest.update(rgb);
        let px = 0;
        const box = [240, 160, -1, -1];
        for (let p = 0; p < 240 * 160; p++) {
          if (rgb[p * 3] !== fb[p * 4] || rgb[p * 3 + 1] !== fb[p * 4 + 1] || rgb[p * 3 + 2] !== fb[p * 4 + 2]) {
            allPx++;
            if (cursorMask[p]) { cursorBoxPx++; continue; }
            px++;
            const x = p % 240, y = Math.floor(p / 240);
            box[0] = Math.min(box[0]!, x); box[1] = Math.min(box[1]!, y); box[2] = Math.max(box[2]!, x); box[3] = Math.max(box[3]!, y);
          }
        }
        perRow.push(px);
        total += px;
        if (px === 0) zero++; else if (nonZero.length < 120) nonZero.push({ age, frame: row.frame, px, bbox: box });
      }
      return { zero, total, cursorBoxPx, allPx, perRow, nonZero, romDigest: romDigest.digest("hex").slice(0, 16) };
    };
    const best = evaluate();
    // The documented alternate VBlank phase rows (liveMoveTimingPolicy.ts): residual allowed only on those ages.
    const documentedRows = ALTERNATE_PHASE_ROWS[`${stem}@${window[0]!.frame}`];
    const documented = new Set(documentedRows ?? []);
    const undocumented = best.nonZero.filter((r) => !documented.has(r.age));
    const verdict = !dense ? "FAIL-not-dense"
      : best.total === 0 ? "policy-exact"
      : undocumented.length === 0 && best.nonZero.length === best.perRow.filter((p) => p > 0).length ? "alternate-phase-documented"
      : "FAIL";
    if (verdict.startsWith("FAIL")) failed = true;
    const result = {
      window: `${stem}@${window[0]!.frame}`, profile: probe.profile, side, fading, other: speciesName(window[0]!.battlers[1 - attacker]!.species),
      frames: [window[0]!.frame, window.at(-1)!.frame], rows: window.length, dense, otherX2Zeroed: x2Input?.zeroed ?? [],
      verdict, ...(override ? { messageOverride: override.lines } : {}), cursorFootprintPx: cursorMask.reduce((a, b) => a + b, 0),
      zeroPxRows: best.zero, totalPx: best.total, cursorBoxPx: best.cursorBoxPx, wholeFramePx: best.allPx, nonZero: best.nonZero,
      ...(documentedRows ? { documentedAlternatePhaseRows: documentedRows } : {}),
      perRowDigest: createHash("sha256").update(JSON.stringify(best.perRow)).digest("hex").slice(0, 16), romWindowSha256: best.romDigest,
    };
    results.push(result);
    console.log(`${verdict} ${result.window} ${probe.profile} ${side} ${fading} vs ${result.other} rows ${window.length} dense=${dense} 0px ${best.zero}/${window.length} outside-cursor ${best.total} (cursor box ${best.cursorBoxPx})${best.nonZero.length ? " first " + JSON.stringify(best.nonZero.slice(0, 6)) : ""}`);
  }
}
// The documented rows are exactly the policy's measured alternate-phase alpha steps, and the shipped phase is the dominant one.
const alphaPolicy = LIVE_STATUS_ANIMATION_TIMING_POLICY.SUBSTITUTE_FADE!.parameters[0]!;
const alternateRows = results.reduce((n, r) => n + r.nonZero.length, 0);
const alternateMeasured = alphaPolicy.alternatives.find((a) => a.phase !== alphaPolicy.chosen)!.measured;
const policyOk = dominantLiveMoveTimingPhase(alphaPolicy.alternatives).phase === alphaPolicy.chosen && (neg !== undefined || alternateRows === alternateMeasured);
if (!policyOk) failed = true;
console.log(`policy: alpha-step phase ${alphaPolicy.chosen} (dominant), alternate-phase residual rows ${alternateRows} vs policy no-event ${alternateMeasured}`);
writeFileSync(out, `${JSON.stringify({ schema: "fade-live-check/v1", neg: neg ?? null, results }, null, 1)}\n`);
console.log(failed ? "FAIL" : `PASS: ${results.length} windows (${results.filter((r) => r.verdict === "policy-exact").length} policy-exact; the rest residual only on documented alternate-phase rows)`);
if (failed && !neg) process.exitCode = 1;
