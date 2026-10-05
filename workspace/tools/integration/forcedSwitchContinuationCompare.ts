// Roar / Whirlwind continuation proof (docs/forced-switch-continuation.md): the composed Scene ON presentation (live body +
// forced switch-out hold + recall receipt + send-in) against direct-mGBA frames from the body start through the send-in
// emerge (opponent target RAM ball+19 = E+29, player target RAM ball+47 = E+57), then the send-in TAIL (#146 gap) reported apart.
// Source frames: the dense harness's retained fresh runs (POKEBENCH_LIVE_EVIDENCE_DIR of liveFixtureBatch.sh), checked
// against the probe's per-frame sha256. The body rows render through liveView (the dense acceptance path); the continuation
// rows through createBattleResolutionPresentationRenderView over the production command shapes (projectBattleResolutionCommands'
// forced switch-out: FORCED_RETURN_TO_BALL_HOLD_FRAMES / _SEND_IN_GAP_FRAMES, then the ordinary `switch-in`).
//   node --experimental-strip-types tools/integration/forcedSwitchContinuationCompare.ts <evidence-dir> <tail-frames> <fixture.json>...
// FS_DIAG=1 prints each residual frame's bbox and top ROM<-live colour pairs (run 0) to stderr.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import {
  FORCED_RETURN_TO_BALL_HOLD_FRAMES, FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES, SWITCH_IN_SPAN_FRAMES,
} from "../../src/engine/battleResolutionPresentation.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import { liveView } from "./liveAdapterFramebuffer.ts";

const [evidence, tailArg, ...fixtures] = process.argv.slice(2);
if (!evidence || !tailArg || fixtures.length === 0) throw new Error("usage: <evidence-dir> <tail-frames> <fixture.json>...");
const tail = Number(tailArg);
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const out: Record<string, unknown>[] = [];
for (const path of fixtures) {
  const f = JSON.parse(readFileSync(path, "utf8"));
  const scenario = basename(f.scenario, ".json");
  const rom = JSON.parse(readFileSync(`tools/integration/fixtures/forced-switch/rom/${scenario}.json`, "utf8"));
  const window = f.denseWindow as { startFrame: number; endFrame: number };
  const E = window.endFrame;
  if (rom.E !== E) throw new Error(`${path}: fixture E ${E} != ROM E ${rom.E}`);
  const targetBattler: 0 | 1 = f.attacker.geometry.side === "player" ? 1 : 0;
  const incomingId = (rom.events as { k: number; species?: number[] }[]).find(e => e.k === 9 && e.species)!.species![targetBattler]!;
  const incomingSpecies = speciesStats.species.find(s => s.id === incomingId)!.name.replace(/^SPECIES_/, "");
  const base = liveView(f, 0);
  const duration = liveMoveAnimationDuration((base.effect as { request: never }).request)!;
  if (duration !== E - window.startFrame + 1) throw new Error(`${path}: duration ${duration} != window rows`);
  const side = targetBattler === 0 ? "player" : "opponent";
  const outgoing = base.field[side];
  const incoming = { ...outgoing, species: incomingId, name: incomingSpecies, partyIndex: 1 as const };
  const commands = [
    { type: "message", eventSequence: 0, lines: base.message!.lines, timing: { minimumFrames: 1, holdFrames: 0 } },
    { type: "switch-out", eventSequence: 1, battler: targetBattler, skipAnimation: true,
      timing: { minimumFrames: FORCED_RETURN_TO_BALL_HOLD_FRAMES } },
    { type: "sprite-visibility", eventSequence: 1, battler: targetBattler, visible: false, recall: true,
      timing: { minimumFrames: FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES } },
    { type: "switch-in", eventSequence: 2, battler: targetBattler, fromPartyIndex: 0, toPartyIndex: 1, incoming,
      incomingStatus1: 0, timing: { minimumFrames: SWITCH_IN_SPAN_FRAMES } },
  ];
  const continuationView = (k: number) => {
    // k = frames after E. Hold covers E+1..E+4, recall E+5..E+10, switch-in from E+11.
    const hold = FORCED_RETURN_TO_BALL_HOLD_FRAMES, gap = FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES;
    const [commandIndex, phaseElapsed] = k <= hold ? [1, k - 1] : k <= hold + gap ? [2, k - 1 - hold] : [3, k - 1 - hold - gap];
    return createBattleResolutionPresentationRenderView({
      segments: [{ commands, events: [] }], segmentIndex: 0, commandIndex, field: base.field,
      lifecycle: { phase: "presenting", phaseElapsed }, fadeTick: 0, confirmHandoff: null,
      sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: targetBattler }, opponentTrainer: null,
    } as never);
  };
  // Through the emerge = RAM ball+19 (opponent mon's first y2 bounce write) / ball+47 (player particles + mon), RAM ball E+10.
  // The next framebuffer frame shows the emerge with the ball-open white fade (production keys that fade to the voluntary
  // switch clock only): it is the first TAIL frame, reported separately with the #146 tail.
  const emerge = targetBattler === 1 ? 10 + 19 : 10 + 47;
  for (const run of [0, 1]) {
    const dir = join(evidence, `${basename(path, ".json")}-run${run}`);
    if (!existsSync(dir)) continue;
    const probe = JSON.parse(readFileSync(join(dir, "probe.json"), "utf8"));
    const frames = new Map<number, string>((Array.isArray(probe.sha256)
      ? probe.sha256.map((sha256: string, frame: number) => [frame, sha256])
      : (probe.frames ?? probe.rows).map((r: { frame: number; sha256: string }) => [r.frame, r.sha256])));
    const rows: { k: number; frame: number; residual: number }[] = [];
    for (let frame = window.startFrame; frame <= E + emerge + tail; frame++) {
      const rgb = readFileSync(join(dir, "rgb", `${String(frame).padStart(5, "0")}.rgb`));
      if (hash(rgb) !== frames.get(frame)) throw new Error(`${dir}: source RGB receipt drift at ${frame}`);
      const k = frame - E;
      const view = k <= 0 ? liveView(f, frame - window.startFrame) : continuationView(k);
      const rgba = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(rgba, view);
      let residual = 0;
      for (let p = 0; p < 240 * 160; p++) {
        if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) residual++;
      }
      if (process.env.FS_DIAG && residual > 0 && run === 0) {
        let x0 = 240, y0 = 160, x1 = -1, y1 = -1; const pairs = new Map<string, number>();
        for (let p = 0; p < 240 * 160; p++) {
          if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) {
            const x = p % 240, y = Math.floor(p / 240); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            const key = `${rgb.subarray(p * 3, p * 3 + 3).toString("hex")}<-${Buffer.from(rgba.subarray(p * 4, p * 4 + 3)).toString("hex")}`;
            pairs.set(key, (pairs.get(key) ?? 0) + 1);
          }
        }
        console.error(`k=${k} residual=${residual} bbox x${x0}-${x1} y${y0}-${y1} rom<-live ${[...pairs].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, n]) => `${c}:${n}`).join(" ")}`);
      }
      rows.push({ k, frame, residual });
    }
    const through = rows.filter(r => r.k <= emerge), after = rows.filter(r => r.k > emerge);
    out.push({
      fixture: path, run, E, target: side, incoming: incomingSpecies, emergeK: emerge,
      throughEmerge: { rows: through.length, exactRows: through.filter(r => r.residual === 0).length,
        residualPixels: through.reduce((a, r) => a + r.residual, 0), mismatchK: through.filter(r => r.residual > 0).map(r => r.k) },
      tail: { rows: after.length, exactRows: after.filter(r => r.residual === 0).length,
        residualPixels: after.reduce((a, r) => a + r.residual, 0), firstMismatchK: after.find(r => r.residual > 0)?.k ?? null },
      digest: hash(Buffer.from(JSON.stringify(rows))),
    });
  }
}
console.log(JSON.stringify(out, null, 1));
