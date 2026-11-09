/**
 * speciesAudit13: tools/integration/substSwapLiveCheck.ts verbatim plus S13_ATTACKER_PERSONALITY=<u32> (the attacker's ROM party
 * personality on the fixture: shiny attacker rows). Original header:
 * S10A Substitute swaps: production live renderer vs fresh direct-mGBA frames, dense, for every subbed-attacker body
 * window of each probe (substSwapProbes.sh): Special_SubstituteToMon .. the first inactive row after
 * Special_MonToSubstitute (swap-in + idle row + body + swap-back). The view is liveAdapterFramebuffer.ts's liveView (the
 * displayed field + typed request; order / allocator / x2 lends from the scenario's preceding move bodies through the
 * production hosts) with the attacker's presentation-only doll flag set as production sets it after the Substitute body
 * (applySubstituteDollCommand). The ROM frames are only the comparison target; no capture row feeds production.
 *
 * usage: node --experimental-strip-types --no-warnings tools/integration/speciesAudit13SwapCheck.ts <probe.json:rgb-dir>...
 *   [--out=<receipt.json>] [--plain] [--attribute] [--neg=lag1|noIdle]   (negative controls must FAIL)
 */
import { readFileSync, writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { applySubstituteDollCommand } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_SUBSTITUTE_SWAP_BODY_IDS, substituteSwapScriptRows } from "../../src/engine/liveSubstituteSwap.ts";
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

type Battler = { species: number; hp: number; maxHP: number; behindSubstitute: boolean };
type Row = { frame: number; sha256: string; script: string | null; animAttacker: number; battlers: [Battler, Battler] };
const args = process.argv.slice(2);
const outArg = args.find((a) => a.startsWith("--out="))?.slice(6);
const neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const plainMode = args.includes("--plain");
// --attribute: a window may carry a BODY residual (attributed elsewhere to the plain control's identical bodyPerRowDigest);
// its swap rows must still be 0 px and its duration equal.
const attribute = args.includes("--attribute");
const moveIds: Record<string, number> = Object.fromEntries(moveData.moves.map((m) => [m.move.replace(/^MOVE_/, ""), m.id]));
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
const results = [];
let failed = false;
for (const spec of args.filter((a) => !a.startsWith("--"))) {
  const [probePath, rgbDir] = spec.split(":") as [string, string];
  const probe = JSON.parse(readFileSync(probePath, "utf8")) as { scenario: string; frames: Row[] };
  const rows = probe.frames;
  const bodies: { moveId: number; side: "player" | "opponent" }[] = [];
  const status: { player?: "paralysis"; opponent?: "paralysis" } = {};
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const startsScript = r.script !== null && rows[i - 1]?.script !== r.script;
    if (!startsScript) continue;
    // Status animations (Task_DoStatusAnimation) resolve past the last Move_ label: not bodies. In these scenarios the only
    // status source is Body Slam's paralysis, shown on the battler's healthbox from then on (the displayed field status).
    if (r.script === "Move_COUNT" && (r as { tasks?: string[] }).tasks?.includes("Task_DoStatusAnimation")) {
      status[r.animAttacker === 0 ? "player" : "opponent"] = "paralysis";
    }
    if (r.script!.startsWith("Move_") && r.script !== "Move_COUNT") {
      const id = moveIds[r.script!.replace(/^Move_/, "")];
      if (id === undefined) throw new Error(`unmapped body ${r.script}`);
      bodies.push({ moveId: id, side: r.animAttacker === 0 ? "player" : "opponent" });
    }
    const attacker = r.animAttacker as 0 | 1, side = attacker === 0 ? "player" as const : "opponent" as const;
    // --plain: control windows of the same bodies by a battler NOT behind a substitute (activation .. first inactive row).
    const plain = plainMode && LIVE_SUBSTITUTE_SWAP_BODY_IDS.has(moveIds[r.script?.replace(/^Move_/, "") ?? ""] ?? -1) && !r.battlers[attacker].behindSubstitute;
    if (r.script !== "Special_SubstituteToMon" && !plain) continue;
    // The window: swap-in script rows, the idle row, the body, the swap-back, its first inactive row.
    let j = i;
    while (rows[j]!.script === "Special_SubstituteToMon") j++;
    const idle = plain ? i - 1 : j;
    const body = rows[idle + 1]!;
    if (!plain && (rows[idle]!.script !== null || !body.script?.startsWith("Move_"))) throw new Error(`${probePath}@${r.frame}: no idle row + body`);
    let k = idle + 1;
    while (rows[k]!.script === body.script) k++;
    if (!plain && rows[k]!.script !== "Special_MonToSubstitute") throw new Error(`${probePath}@${r.frame}: no swap-back`);
    while (!plain && rows[k]!.script === "Special_MonToSubstitute") k++;
    if (plain) bodies.pop();
    const window = rows.slice(i, k + 1);
    const move = body.script!.replace(/^Move_/, "");
    const b0 = r.battlers;
    const fixture: Fixture = {
      move, probe: "tools/integration/prep37Probe.py", scenario: probe.scenario,
      attacker: { species: speciesName(b0[attacker].species), geometry: { side } },
      target: { species: speciesName(b0[1 - attacker]!.species), geometry: { side: side === "player" ? "opponent" : "player" } },
      fieldProfile: { playerHp: b0[0].hp, playerMaxHp: b0[0].maxHP, opponentHp: b0[1].hp, opponentMaxHp: b0[1].maxHP,
        playerGender: "male", opponentGender: "male" },
      // Every move body before this one (the Substitute body, the other side's moves, earlier own bodies).
      precedingBodies: bodies.slice(),
      displayedStatus: { ...status },
      // speciesAudit13: the attacker's ROM party personality (speciesAudit13Personality.py), so production sees a shiny attacker.
      ...(process.env.S13_ATTACKER_PERSONALITY ? { attackerPersonality: Number(process.env.S13_ATTACKER_PERSONALITY) } : {}),
    };
    if (plain) bodies.push({ moveId: moveIds[move]!, side });
    const make = (age: number) => {
      const view = liveView(fixture, age);
      if (plain) return view;
      // The production setter: the attacker's completed Substitute body shows the doll.
      const field = applySubstituteDollCommand(view.field, {
        type: "move-animation", eventSequence: 0, battler: attacker,
        animation: { moveId: 164, attacker, target: attacker } as never, timing: { minimumFrames: 1 },
      } as never);
      return { ...view, field, fieldArt: createBattleCommandFieldArtView(field) };
    };
    const request = (make(0).effect as { request: BattleMoveAnimationRequest }).request;
    const duration = liveMoveAnimationDuration(request, make(0).field);
    let residual = 0, exact = 0;
    const perRow: number[] = [];
    const firstMismatches: { age: number; frame: number; px: number; bbox: string }[] = [];
    window.forEach((row, age) => {
      // noIdle: no idle row between the swap-in and the body; lag1: a 1-row display latch on the swap-in rows (2 measured).
      const negAge = neg === "noIdle" && age > substituteSwapScriptRows(side) ? age + 1
        : neg === "lag1" && age <= substituteSwapScriptRows(side) ? age + 1 : age;
      const view = make(negAge);
      const rgb = inflateSync(readFileSync(`${rgbDir}/${String(row.frame).padStart(5, "0")}.rgb.z`));
      if (createHash("sha256").update(rgb).digest("hex") !== row.sha256) throw new Error("RGB receipt drift");
      const fb = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(fb, view);
      let px = 0;
      const box = [240, 160, -1, -1];
      for (let p = 0; p < 240 * 160; p++) {
        if (rgb[p * 3] !== fb[p * 4] || rgb[p * 3 + 1] !== fb[p * 4 + 1] || rgb[p * 3 + 2] !== fb[p * 4 + 2]) {
          px++;
          const x = p % 240, y = Math.floor(p / 240);
          box[0] = Math.min(box[0]!, x); box[1] = Math.min(box[1]!, y); box[2] = Math.max(box[2]!, x); box[3] = Math.max(box[3]!, y);
        }
      }
      perRow.push(px);
      residual += px;
      if (px === 0) exact++;
      else if (firstMismatches.length < 200) firstMismatches.push({ age, frame: row.frame, px, bbox: box.join(",") });
    });
    // Body rows of the composite (body ages 1 .. D-1; age 0 shows the swap tail) vs a plain control window (ages 1 .. D-1).
    const bodyFrom = plain ? 1 : substituteSwapScriptRows(side) + 2;
    const bodyTo = plain ? window.length - 1 : window.length - 1 - substituteSwapScriptRows(side);
    const bodyRows = perRow.slice(bodyFrom, bodyTo + 1);
    const swapResidual = residual - bodyRows.reduce((a, b) => a + b, 0);
    const ok = residual === 0 && duration === window.length;
    if (!ok && !(attribute && swapResidual === 0 && duration === window.length)) failed = true;
    const result = {
      probe: probePath.split("/").at(-1), side, attacker: fixture.attacker.species, target: fixture.target.species, move,
      startFrame: window[0]!.frame, endFrame: window.at(-1)!.frame, rows: window.length, productionDuration: duration,
      kind: plain ? "plain-control" : "swap", swapInRows: idle - i, bodyRows: k - (idle + 1) - substituteSwapScriptRows(side) + 1, exactRows: exact, residualPixels: residual,
      digest: createHash("sha256").update(JSON.stringify(perRow)).digest("hex").slice(0, 16),
      swapRowsResidual: swapResidual, bodyRowsResidual: residual - swapResidual,
      bodyPerRowDigest: createHash("sha256").update(JSON.stringify(bodyRows)).digest("hex").slice(0, 16), firstMismatches,
    };
    results.push(result);
    console.log(`${result.probe} ${side} ${result.attacker}->${result.target} ${move} frames ${result.startFrame}..${result.endFrame} rows ${window.length} duration ${duration} exact ${exact} residual ${residual}${firstMismatches.length ? " first " + JSON.stringify(firstMismatches.slice(0, 4)) : ""}`);
  }
}
if (outArg) writeFileSync(outArg, `${JSON.stringify({ schema: "subst-swap-live-check/v1", ...(neg ? { negativeControl: neg } : {}), results }, null, 1)}\n`);
if (failed || results.length === 0) { console.error("FAIL"); process.exit(1); }
console.log(`windows: ${results.length}, ${attribute ? "swap rows 0 px (body residual attributed)" : "all 0 px"}, durations equal`);
