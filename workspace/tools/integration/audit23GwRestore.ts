// Live audit 23 (docs/live-audit-23.md): the GrassWhistle 320 restore-blend rows of each window fixture, from the PRODUCTION live render
// (no probe: every audited GrassWhistle row is 0 px against the ROM in audit23Check.ts, so these ARE the ROM's rows). Per fixture: the
// first window age >= 100 whose BG pixel (5, 5) differs from age 100's (ctl95's instrument: the restore blend's first colour step =
// restore start + 6) and the next step (+ 12), next to the per-side constants ctl95 replaced (player 163 / opponent 166: steps 169 / 175,
// 172 / 178). Distinct steps across pairs = the position-dependent restore is exercised.
//   node --experimental-strip-types --no-warnings tools/integration/audit23GwRestore.ts <fixture-dir>
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const dir = process.argv[2]!;
for (const name of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
  const f = JSON.parse(readFileSync(join(dir, name), "utf8")) as Fixture & { move: string; attacker: { species: string; geometry: { side: string } }; target: { species: string } };
  if (f.move !== "GRASS_WHISTLE") continue;
  const px = (age: number) => {
    const rgba = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(rgba, liveView(f, age) as never);
    const o = (5 * 240 + 5) * 4;
    return `${rgba[o]},${rgba[o + 1]},${rgba[o + 2]}`;
  };
  const steps: number[] = [];
  let prev = px(100);
  for (let age = 101; age < 225 && steps.length < 2; age++) {
    const cur = px(age);
    if (cur !== prev) steps.push(age);
    prev = cur;
  }
  const constant = f.attacker.geometry.side === "player" ? [169, 175] : [172, 178];
  console.log(`${name} ${f.attacker.geometry.side} ${f.attacker.species}->${f.target.species} steps ${steps.join(" / ")} (per-side constant ${constant.join(" / ")})`);
}
