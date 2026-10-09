// Live audit 15: consumers after Giga Drain 202 through the production order / allocator hosts WITH the orchestrator's geometry-plan callback
// (factoryRoundBattleOrchestrator.ts liveSpriteOrderBodyPlanAt: liveMoveGeometrySpriteOrderPlanText at the displayed species), which
// postkoHostReplay.ts does not pass. Same replay otherwise (beginLiveSpriteOrderTurn per prompt, advanceLiveSpriteOrderHost per event, the
// allocator seam). The view is the harness's liveView with ONLY the order / allocator lends replaced; rows vs two fresh prep48Probe.py runs.
//   node --experimental-strip-types --no-warnings tools/integration/audit15GdCheck.ts <out.json> <fixture.json>...
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import type { BattleKernelSemanticEvent } from "../../src/engine/battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { liveMoveAnimationPresentation, liveMoveGeometrySpriteOrderPlanText } from "../../src/engine/liveMoveAnimation.ts";
import { prepareLiveMoveSpriteAllocator } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { invalidateLiveSpriteAllocatorHost } from "../../src/engine/liveSpriteAllocator.ts";
import { advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, lendLiveSpriteOrder } from "../../src/engine/liveSpriteOrderHost.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

type Json = Record<string, any>;
const SPECIES: Record<string, number> = { CHANSEY: 113, SNORLAX: 143 };
const [out, ...paths] = process.argv.slice(2);
const results: Json[] = [];
for (const path of paths) {
  const f = JSON.parse(readFileSync(path, "utf8")) as Fixture & Json;
  const side = f.attacker.geometry.side as "player" | "opponent";
  const geometry = { playerSpecies: SPECIES[side === "player" ? f.attacker.species : f.target.species]!,
    opponentSpecies: SPECIES[side === "opponent" ? f.attacker.species : f.target.species]! };
  const planAt = (_s: number, _q: number, moveId: number, attackerSide: "player" | "opponent") =>
    liveMoveGeometrySpriteOrderPlanText(moveId, attackerSide, geometry) ?? undefined;
  let host = createLiveSpriteOrderHost(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  let allocator = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove;
  let sequence = 0;
  let lend: Json = {};
  (f.precedingTurns as Json[]).forEach((turn, t) => {
    const events = (turn.events as Json[]).map((payload) => Object.freeze({ sequence: sequence++, payload, provenance: undefined }) as unknown as BattleKernelSemanticEvent);
    const resolution = { resolutionId: { requestId: t + 1 }, segmentIndex: 0, segments: [{ events }] };
    host = beginLiveSpriteOrderTurn(host, t + 1, true);
    events.forEach((event, i) => {
      const p = event.payload as unknown as Json;
      const last = t === f.precedingTurns!.length - 1 && i === events.length - 1;
      const req = p.animationId === "MOVE_ANIMATION" ? battleMoveAnimationRequest(p.battler, p.target, p.arguments) : null;
      if (last) {
        host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, true, planAt);
        lend = { spriteOrderInput: lendLiveSpriteOrder(host, req!.moveId), spriteAllocatorInput: prepareLiveMoveSpriteAllocator(allocator, req!).input };
        return;
      }
      if (req) allocator = prepareLiveMoveSpriteAllocator(allocator, req).next;
      else if (p.kind === "status-animation") allocator = invalidateLiveSpriteAllocatorHost(allocator);
      host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, false, planAt);
    });
  });
  const view = (age: number) => { const v = liveView(f, age) as Json; return { ...v, effect: { ...v.effect, ...lend } }; };
  const v0 = view(0).effect;
  const live = liveMoveAnimationPresentation(v0.request, view(0).field, 0, v0.paletteInput, v0.spriteAllocatorInput, v0.spriteOrderInput,
    v0.presentationRng, v0.battlerX2Input) !== null;
  const runs: Json[] = [];
  for (let run = 0; run < 2; run++) {
    const dir = mkdtempSync(join(tmpdir(), "audit15-gd-"));
    spawnSync("python3", ["tools/run-mgba-probe.py", join(dir, "p.json"), "--", "/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python",
      "tools/integration/prep48Probe.py", f.scenario, join(dir, "p.json"), join(dir, "rgb")], { encoding: "utf8",
      env: { ...process.env, PYTHONPATH: process.env.PYTHONPATH ?? "/Users/kyle/Developer/pokebench/vendor/libmgba-py" } });
    const rows: number[][] = [];
    for (let frame = f.denseWindow!.startFrame; frame <= f.denseWindow!.endFrame; frame++) {
      const rgb = readFileSync(join(dir, "rgb", `${String(frame).padStart(5, "0")}.rgb`));
      const rgba = new Uint8Array(240 * 160 * 4);
      const age = frame - f.denseWindow!.startFrame + (f.denseWindow!.ageOffset ?? 0);
      renderBattleResolutionLiveView(rgba, view(age) as never);
      let px = 0;
      for (let p = 0; p < 240 * 160; p++) if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) px++;
      rows.push([age, px]);
    }
    rmSync(dir, { recursive: true, force: true });
    runs.push({ digest: createHash("sha256").update(JSON.stringify(rows)).digest("hex").slice(0, 16), px: rows.reduce((a, r) => a + r[1]!, 0),
      residualRows: rows.filter((r) => r[1]! > 0) });
  }
  const row = { fixture: path.split("/").pop(), move: f.move, live, orderKnown: (lend.spriteOrderInput as Json | undefined)?.known === true,
    allocatorInput: lend.spriteAllocatorInput !== undefined, rows: f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1,
    px: runs[0]!.px, digests: runs.map((r) => r.digest), residualRows: runs[0]!.residualRows.slice(0, 20) };
  results.push(row);
  console.log(JSON.stringify({ ...row, residualRows: undefined }));
}
writeFileSync(out!, `${JSON.stringify({ schema: "audit15-gd-check/v1", rows: results }, null, 1)}\n`);
