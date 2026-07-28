/** Semantic fixture gate for the unsupported MOVE_SPARK handoff (no pixel comparison). */
import { readFileSync } from "node:fs";

type Evidence = {
  schema: string;
  frames: Array<{
    frame: number;
    currentMove: number;
    battleAnimAttacker: number;
    battleAnimTarget: number;
    visualTaskCount: number;
    soundTaskCount: number;
  }>;
  window: { startFrame: number; endFrame: number; frameCount: number };
};

function read(path: string): Evidence {
  return JSON.parse(readFileSync(path, "utf8")) as Evidence;
}

function verify(label: string, evidence: Evidence, battler: number): void {
  if (evidence.schema !== "spark-staging-evidence/v1") throw new Error(`${label}: bad schema`);
  if (evidence.frames.length === 0) throw new Error(`${label}: MOVE_SPARK was never active`);
  if (evidence.window.frameCount !== evidence.frames.length) throw new Error(`${label}: bad window count`);
  evidence.frames.forEach((row, index) => {
    if (row.currentMove !== 209) throw new Error(`${label}: non-SPARK frame ${row.frame}`);
    if (index && row.frame !== evidence.frames[index - 1].frame + 1) throw new Error(`${label}: non-contiguous window`);
  });
  if (!evidence.frames.some((row) => (row.visualTaskCount || row.soundTaskCount) &&
      row.battleAnimAttacker === battler && row.battleAnimTarget === (battler ^ 1))) {
    throw new Error(`${label}: MOVE_SPARK never reached its side-relative animation body`);
  }
  if (evidence.window.startFrame !== evidence.frames[0].frame ||
      evidence.window.endFrame !== evidence.frames.at(-1)?.frame) throw new Error(`${label}: bad bounds`);
  console.log(`${label}: ${evidence.window.startFrame}-${evidence.window.endFrame} (${evidence.frames.length} frames)`);
}

if (process.argv.length !== 4) throw new Error("usage: sparkEvidence.ts <player.json> <opponent.json>");
verify("player-back MINUN", read(process.argv[2]), 0);
verify("opponent-front MINUN", read(process.argv[3]), 1);
