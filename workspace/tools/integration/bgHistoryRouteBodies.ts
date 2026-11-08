// BG-register history: ordered presented move-animation bodies of ordinary generated routes (x2TrackerRouteReplay.ts capture, bodies only; Scene ON, production orchestrator).
// usage: node --experimental-strip-types --no-warnings tools/integration/bgHistoryRouteBodies.ts <out.json> <seed>...
import { writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";

const PATTERNS: (0 | 1 | 2 | 3)[][] = [[0, 1, 2, 3, 0, 1, 2, 3, 0, 1], [1, 2, 3, 0, 1, 2, 3, 0, 1, 2]];
const [outPath, ...seedArgs] = process.argv.slice(2);
const routes = seedArgs.map(Number).map((seed) => {
  const bodies: { moveId: number; attacker: string; live: boolean; segment: number; cmd: number; request: number }[] = [];
  const seen = new Set<string>();
  let error: string | undefined;
  try {
    generatedCommandAnimationReplay(seed, "on", PATTERNS[seed % 2]!, 0, true, true, (state) => {
      const r = state.battleResolutionPresentation;
      if (r?.lifecycle.phase !== "presenting") return;
      const command = r.segments[r.segmentIndex]?.commands[r.commandIndex];
      if (command?.type !== "move-animation" || !command.animation) return;
      const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
      if (seen.has(key)) return;
      seen.add(key);
      const view = createBattleResolutionPresentationRenderView(r, undefined as never);
      bodies.push({ moveId: command.animation.moveId, attacker: command.animation.attacker === 0 ? "player" : "opponent", live: liveMoveAnimationDuration(command.animation, view.field) !== null,
        segment: r.segmentIndex, cmd: r.commandIndex, request: Number(String(r.resolutionId.requestId).replace(/\D/g, "") || 0) });
    });
  } catch (e) { error = String(e).slice(0, 160); }
  console.log(seed, bodies.length, error ?? "");
  return { seed, bodies, error };
});
writeFileSync(outPath!, JSON.stringify({ schema: "bg-history-route-bodies/v1", routes }) + "\n");
