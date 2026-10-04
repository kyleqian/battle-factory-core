/**
 * Multi-hit prep: with a donor live adapter (PIN_MISSILE, age 0), render every drafted multihit-*.json fixture's message
 * chrome (rows 112-159) and both healthboxes through the production live view and compare them with the ROM frame at the
 * hit's activation. This validates the fixtures' messageLines / fieldProfile HP choice without any multi-hit adapter.
 * usage: node --experimental-strip-types tools/integration/multihitChromeCheck.ts <probe-dir> (dir from multihitProbe.py runs: <name>-a-rgb)
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const dir = process.argv[2]!;
const fxDir = join(root, "tools/integration/fixtures");
const NAMES: Record<string, string> = {
  "double-slap-player": "ds-player", "double-slap-opponent": "ds-opponent", "comet-punch-player": "cp-player",
  "comet-punch-opponent": "cp-opponent", "triple-kick-player": "tk-player", "triple-kick-opponent": "tk-opponent",
};
const rects = { chrome: [0, 112, 240, 160], opponentBox: [8, 8, 120, 48], playerBox: [128, 76, 232, 112] };
const out = [];
for (const file of readdirSync(fxDir).filter(f => /^multihit-.*-hit\d+\.json$/.test(f)).sort()) {
  const fx = JSON.parse(readFileSync(join(fxDir, file), "utf8")) as Fixture;
  const key = file.replace(/^multihit-/, "").replace(/-hit\d+\.json$/, "");
  const rgb = readFileSync(join(dir, `${NAMES[key]}-a-rgb`, `${String(fx.denseWindow!.startFrame).padStart(5, "0")}.rgb`));
  const moveName = moveData.moves.find(m => m.move === `MOVE_${fx.move}`)!.name;
  const hit0Lines: [string, string] = [`${fx.attacker.geometry.side === "opponent" ? "Foe " : ""}${fx.attacker.species} used`, `${moveName}!`];
  const donor: Fixture = { ...fx, move: "PIN_MISSILE", requestFields: undefined, messageLines: fx.messageLines ?? hit0Lines };
  const rgba = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(rgba, liveView(donor, 0));
  const res: Record<string, number> = {};
  for (const [name, [x0, y0, x1, y1]] of Object.entries(rects) as [string, number[]][]) {
    let n = 0; const bad: number[][] = [];
    for (let y = y0!; y < y1!; y++) for (let x = x0!; x < x1!; x++) {
      const p = y * 240 + x;
      if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) { n++; if (bad.length < 6) bad.push([x, y, rgb[p * 3]!, rgba[p * 4]!]); }
    }
    res[name] = n; if (process.env.SHOW && n) console.error(file, name, JSON.stringify(bad));
  }
  out.push({ file, ...res });
}
console.log(JSON.stringify(out, null, 1));
