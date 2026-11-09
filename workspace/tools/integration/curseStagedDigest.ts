/**
 * Renderer-gate proof for the live Curse adapter: sha256 of every staged MOVE_CURSE framebuffer (the four accepted windows,
 * accepted corpus inputs through `curseConfigFor`, the unchanged staged path). Run before and after a renderer change; equal
 * digests prove the staged/accepted outputs are byte-identical.
 *   npx vite-node tools/integration/curseStagedDigest.ts [--out=digest.json]
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { curseConfigFor, curseRowsFor, type CurseWindow } from "../compare/curseProduction.ts";

const out: Record<string, { rows: number; sha256: string }> = {};
for (const window of ["ghost-player", "ghost-opponent", "stats-player", "stats-opponent"] as CurseWindow[]) {
  const rows = curseRowsFor(window), hash = createHash("sha256");
  for (let age = 0; age < rows.length; age += 1) {
    hash.update(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(curseConfigFor(window, rows, age)), age } as never }));
  }
  out[window] = { rows: rows.length, sha256: hash.digest("hex") };
}
const json = `${JSON.stringify(out, null, 1)}\n`;
const target = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
if (target) writeFileSync(target, json);
process.stdout.write(json);
