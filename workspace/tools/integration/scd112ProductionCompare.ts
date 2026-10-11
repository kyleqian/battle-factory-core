// scd112 (S10A, ISSUES #166 slice d, docs/scd112-stats-change-render.md): stat102's dense ROM comparator run THROUGH THE PRODUCTION
// RENDER PATH. Per window (10 stat101 scenarios x Scene ON / OFF) a constructed resolution segment
//   [previous message (automatic, printed), stats-change {battler, argument = the window's animArg, minimumFrames = addedRows},
//    next command (print path: a message; playstatchangeanimation path: the 2-frame `stat` write, then a message)]
// is rendered at every ROM row with production's createBattleResolutionPresentationRenderView + renderBattleResolutionLiveView
// (Scene ON; the app's drawScene, whose non-move effects go to the shared renderer) or renderBattleResolutionSceneOffView (Scene OFF).
// Frame mapping (stat102 s4 / the brief): stats-change command age a == ROM rel a + 1; rel <= 0 is the previous command's last frame,
// rel >= addedRows + 1 the next command's frames. Scene ON carries the probe's x2 history through the production tracker
// (applyLiveBattlerX2Event over the bodies before the window; the Roar switch-in resets the opponent), Scene OFF none.
//
// The constructed field is not the ROM's whole screen (HP, text): the production frame P(rel) is transplanted onto the ROM's own
// ordinary row A-1 wherever it differs from production's ORDINARY frame P_ord (the same state with the effect dropped = what the
// base tree drew for the command): C(rel) = ROM(A-1) except where P(rel) != P_ord, where it is P(rel). C == ROM(rel) needs every
// pixel production changes (banner blend over its own under-pixels, shadow hide, the opponent's rest shift) to equal the ROM's, so
// a wrong mask / corner / rest / EVA / BG1 Y / palette or shadow row shows up as px. Compared on the full screen and in the 64x64
// OBJ-window rect at the production corner (with the rest), rows A-1 .. E+2; E+3 reported apart. Rows on the next command are split
// into the message-box band (y >= 112) and the rest (the print path's next message prints its first glyph on its first frame).
// Also reported: the raw production rect (no transplant) on the command's banner rows.
//   node --experimental-strip-types --no-warnings tools/integration/scd112ProductionCompare.ts <raw-dir> <out.json> [--neg=age+1|no-rest|no-shadow]
//     [--tracker-growl-zeroed]   (experiment: the x2 tracker's missing Growl target row replaced by the source class)
// (vite-node also works). Raw frames: stat101NpzToRaw.py output (stat102Run.sh <out>/raw).
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView, renderBattleResolutionSceneOffView, statsChangeRenderView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { applyLiveBattlerX2Event, LIVE_BATTLER_X2_IDLE, type LiveBattlerX2History } from "../../src/engine/liveBattlerX2History.ts";
import { statsChangeParams, statsChangeRow, statsChangeSpan } from "../../src/animation/statsChange.ts";

const args = process.argv.slice(2);
const neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const [rawDir, outPath] = args.filter((a) => !a.startsWith("--")) as [string, string];
const F = "tools/integration/fixtures/stat101";
const receipts = JSON.parse(readFileSync(`${F}/receipts/stat-anim.json`, "utf8"));
const probeDir = rawDir.replace(/\/raw\/?$/, "/probes/r1");
const SP: Record<string, number> = { PRIMEAPE: 57, ONIX: 95, SNORLAX: 143, GOLBAT: 42, MACHAMP: 68, GYARADOS: 130, GRANBULL: 210 };
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
const FRAME = 240 * 160 * 3;
const BOX_Y = 112;

function fieldOf(playerSpecies: number, opponentSpecies: number, genders: [string, string]) {
  const make = (b: 0 | 1, species: number) => Object.freeze({
    species, name: speciesName(species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex: 0 as const, level: 50, hp: 100, maxHP: 100, gender: genders[b] as "male" | "female", status: "none" as const,
    moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
  return Object.freeze({ player: make(0, playerSpecies), opponent: make(1, opponentSpecies) });
}

const result: Record<string, unknown> = {};
let windows = 0, clean = 0;
const digest = createHash("sha256");
for (const [scen, v] of Object.entries<any>(receipts)) {
  const ix = v.index;
  if (ix.expectedAnimArg === null) continue;
  const scenario = JSON.parse(readFileSync(`${F}/scenarios/${scen}.json`, "utf8"));
  for (const scene of ["on", "off"] as const) {
    const w = v[scene].windows[0];
    if (!w) continue;
    windows++;
    const params = statsChangeParams(w.arg)!;
    const span = statsChangeSpan(params);
    const E = w.E - w.A;
    if (span.endRel !== E) throw new Error(`${scen} ${scene}: reducer E ${span.endRel} != ROM ${E}`);
    const raw = readFileSync(`${rawDir}/${scen}-${scene}.rgb`);
    const frames = raw.length / FRAME;
    const frameAt = (rel: number) => raw.subarray((rel + 1) * FRAME, (rel + 2) * FRAME); // frame 0 = A - 1
    // Species on the field at the window (the Intimidate switch-in replaces the opponent lead).
    const playerSpecies = scenario.overrides.parties.player[0].species as number;
    // (The Intimidate window animates the player; the switched-in opponent is unchanged by the command, so the transplant cancels it.)
    const oppSlot = ix.bench ? 1 : 0;
    const opponentSpecies = scenario.overrides.parties.opponent[oppSlot].species as number;
    const genders: [string, string] = [scenario.overrides.parties.player[0].gender, scenario.overrides.parties.opponent[oppSlot].gender];
    const field = fieldOf(playerSpecies, opponentSpecies, genders);
    const battler: 0 | 1 = ix.animatedSide === "player" ? 0 : 1;
    // Scene ON: the production x2 tracker over the probe's bodies before the window (rises before A; mv 0 = a general animation).
    let history: LiveBattlerX2History = LIVE_BATTLER_X2_IDLE;
    const bodies: [number, number, number][] = [];
    if (scene === "on") {
      const probe = JSON.parse(readFileSync(`${probeDir}/${scen}-${scene}.json`, "utf8"));
      let prev = 0;
      for (const r of probe.rows) {
        if (r.f >= w.A) break;
        if (r.act && !prev && r.mv !== 0) bodies.push([r.f, r.mv, r.atk]);
        prev = r.act;
      }
      for (const [, mv, atk] of bodies) {
        history = applyLiveBattlerX2Event(history, { kind: "move-body", moveId: mv, attackerSide: atk === 0 ? "player" : "opponent" });
        // EXPERIMENT ONLY (--tracker-growl-zeroed, never the receipt): Move_GROWL ends with AnimTask_ShakeMon2 on ANIM_TARGET (absolute
        // reset, x2 0), but LIVE_BATTLER_X2_MOVE_TABLE has no row for 45 and the 0-power fallback keeps the target's rest.
        if (mv === 45 && args.includes("--tracker-growl-zeroed")) history = { ...history, [atk === 0 ? "opponent" : "player"]: "zeroed" };
        // Roar (46) forces the opponent's switch: the Intimidate switch-in is a send-in (side := idle).
        if (mv === 46) history = applyLiveBattlerX2Event(history, { kind: "send-in", side: "opponent" });
      }
    }
    const zeroed = (["player", "opponent"] as const).filter((s) => history[s] === "zeroed");
    const x2Input = scene === "on" && neg !== "no-rest" ? Object.freeze({ zeroed: Object.freeze(zeroed) }) : undefined;
    const psca = !String(w.script.launch).includes("PrintString") && !String(w.script.launch).includes("StatDown+") && !String(w.script.launch).includes("Intimidate");
    const message = (seq: number, lines: [string, string]) => Object.freeze({ type: "message", eventSequence: seq, lines, advance: "automatic",
      noCursor: false, timing: { minimumFrames: 1, holdFrames: 0 } });
    const statsChange = Object.freeze({ type: "stats-change", eventSequence: 2, battler, argument: w.arg, timing: { minimumFrames: span.addedRows } });
    const stat = Object.freeze({ type: "stat", eventSequence: 3, battler, stat: "defense", from: 6, to: params.direction === "up" ? 7 : 5, timing: { minimumFrames: 2 } });
    const commands = [message(1, ["PREVIOUS", "MESSAGE"]), statsChange, ...(psca ? [stat] : []), message(4, ["NEXT", "MESSAGE"])];
    const stateAt = (commandIndex: number, age: number) => ({
      field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
      commandIndex, lifecycle: { phase: "presenting", phaseElapsed: age },
      confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
      ...(x2Input === undefined ? {} : { liveMoveBattlerX2Input: x2Input }),
    });
    const draw = (view: any) => {
      const fb = new Uint8Array(240 * 160 * 4);
      if (scene === "on") renderBattleResolutionLiveView(fb, view); else renderBattleResolutionSceneOffView(fb, view);
      return fb;
    };
    const commandAge = (rel: number) => (neg === "age+1" ? rel : rel - 1);
    const viewAtRel = (rel: number) => {
      const age = commandAge(rel);
      if (age < 0) return createBattleResolutionPresentationRenderView(stateAt(0, 200) as never);
      if (age < span.addedRows) {
        const view = createBattleResolutionPresentationRenderView(stateAt(1, age) as never);
        return neg === "no-shadow" ? { ...view, postBodyShadowHidden: false, effect: view.effect } : view;
      }
      let rest = age - span.addedRows;
      if (psca && rest < 2) return createBattleResolutionPresentationRenderView(stateAt(2, rest) as never);
      if (psca) rest -= 2;
      return createBattleResolutionPresentationRenderView(stateAt(psca ? 3 : 2, rest) as never);
    };
    // P_ord: the base tree's frame for the command (the same state, effect dropped: the ordinary field / box).
    const ordinaryView = { ...createBattleResolutionPresentationRenderView(stateAt(1, 0) as never), effect: null };
    const pOrd = draw(ordinaryView);
    const refRom = frameAt(-1);
    const sample = statsChangeRenderView(createBattleResolutionPresentationRenderView(stateAt(1, 10) as never) as never);
    const corner = sample?.banner?.corner ?? null;
    if (corner === null) throw new Error(`${scen} ${scene}: no banner at age 10`);
    const [rx, ry] = w.maskRect as [number, number, number, number];
    const perRow: [number, number, number, number, number][] = []; // [rel, rectPx, fullPx, boxPx, rawRectPx]
    let rectPx = 0, fullPx = 0, compared = 0, firstBad: number | null = null, boxOnlyRows = 0, rawRectBannerPx = 0;
    const nextCommandRows: { rel: number; fullPx: number; boxPx: number; outsideBoxPx: number }[] = [];
    const tail: { rel: number; fullPx: number; boxPx: number }[] = [];
    const lastRel = Math.min(E + 3, frames - 2);
    for (let rel = -1; rel <= lastRel; rel++) {
      const view = viewAtRel(rel);
      let fb: Uint8Array;
      if (neg === "no-shadow" && view.effect?.type === "stats-change") {
        const sc = statsChangeRenderView(view as never)!;
        fb = draw({ ...view, postBodyShadowHidden: false, effect: null, fieldArt: sc.view.fieldArt });
        if (sc.banner) fb = draw(view); // banner rows keep the production frame; the shadow rows are the control
      } else fb = draw(view);
      const rom = frameAt(rel);
      let rp = 0, fp = 0, bp = 0, rawRect = 0;
      for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
        const o = y * 240 + x;
        const changed = fb[o * 4] !== pOrd[o * 4] || fb[o * 4 + 1] !== pOrd[o * 4 + 1] || fb[o * 4 + 2] !== pOrd[o * 4 + 2];
        const c0 = changed ? fb[o * 4]! : refRom[o * 3]!, c1 = changed ? fb[o * 4 + 1]! : refRom[o * 3 + 1]!, c2 = changed ? fb[o * 4 + 2]! : refRom[o * 3 + 2]!;
        const inRect = x >= corner.x && x < corner.x + 64 && y >= corner.y && y < corner.y + 64;
        if (inRect && (fb[o * 4] !== rom[o * 3] || fb[o * 4 + 1] !== rom[o * 3 + 1] || fb[o * 4 + 2] !== rom[o * 3 + 2])) rawRect++;
        if (c0 === rom[o * 3] && c1 === rom[o * 3 + 1] && c2 === rom[o * 3 + 2]) continue;
        fp++;
        if (y >= BOX_Y) bp++;
        if (inRect) rp++;
      }
      const age = commandAge(rel);
      const onNext = age >= span.addedRows;
      const row = statsChangeRow(params, rel);
      if (age >= 0 && age < span.addedRows && row.bannerVisible) rawRectBannerPx += rawRect;
      perRow.push([rel, rp, fp, bp, rawRect]);
      if (rel <= E + 2) {
        compared++;
        if (onNext) nextCommandRows.push({ rel, fullPx: fp, boxPx: bp, outsideBoxPx: fp - bp });
        // Acceptance: every pixel on the command's rows and the previous command's rows; on the next command's rows every pixel
        // outside the message-box band (its own first glyph is the following message's, reported in nextCommandRows).
        const counted = onNext ? fp - bp : fp;
        const countedRect = onNext ? rp - Math.min(rp, bp) : rp;
        if (onNext && bp > 0 && fp === bp) boxOnlyRows++;
        rectPx += countedRect; fullPx += counted;
        if (counted && firstBad === null) firstBad = rel;
      } else tail.push({ rel, fullPx: fp, boxPx: bp });
    }
    const zero = rectPx === 0 && fullPx === 0 && compared === E + 4;
    if (zero) clean++;
    digest.update(`${scen}-${scene}:${JSON.stringify(perRow)}\n`);
    result[`${scen}-${scene}`] = {
      arg: w.arg, side: ix.animatedSide, species: speciesName(battler === 0 ? playerSpecies : opponentSpecies), path: psca ? "playstatchangeanimation" : "print",
      reducer: { direction: params.direction, palette: params.palette, sharply: params.sharply, ...span },
      x2History: scene === "on" ? { bodies: bodies.map(([f, mv, atk]) => ({ f, mv, atk })), zeroed } : null,
      productionCorner: corner, romMaskRect: w.maskRect, cornerEqualsRomRect: corner.x === rx && corner.y === ry,
      compared: { rows: compared, firstRel: -1, lastRel: E + 2, firstBad },
      rect: { px: rectPx }, fullScreen: { px: fullPx }, zeroPx: zero,
      nextCommandRows, boxOnlyNextRows: boxOnlyRows, afterWindow: tail, rawRectBannerRowsPx: rawRectBannerPx,
      perRowSha: createHash("sha256").update(JSON.stringify(perRow)).digest("hex").slice(0, 16),
      perRowMismatches: perRow.filter((r) => r[1] || r[2]),
    };
    console.log(scen, scene, w.arg, psca ? "psca" : "print", `corner ${corner.x},${corner.y} rom ${rx},${ry} rows ${compared}: rect ${rectPx} px, full ${fullPx} px; next rows ${JSON.stringify(nextCommandRows)}; raw rect (banner rows) ${rawRectBannerPx}`);
  }
}
result.summary = { neg: neg ?? null, trackerGrowlZeroedExperiment: args.includes("--tracker-growl-zeroed"), windows, zeroPxWindows: clean, perRowDigest: digest.digest("hex").slice(0, 16) };
console.log(`production path, rect + full screen 0 px windows (rows A-1 .. E+2): ${clean} / ${windows}`);
writeFileSync(outPath, JSON.stringify(result, null, 1) + "\n");
if (!neg && clean !== windows) process.exitCode = 1;
