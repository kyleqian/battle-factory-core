// prep34: the UNCHANGED Memento renderer (battleScene.ts MEMENTO branch) fed the prep34 production-derived reducer config
// (prep34MementoCheck.ts productionConfig: derived battler inputs + the FIRST_BODY_SCANLINE constant, never the captured RAM)
// against direct-mGBA windows from the activation row. The branch is species-gated to WEEZING -> ONIX (battleScene.ts:29356-29366),
// so only the accepted pair can be rendered.
// usage: vite-node prep34MementoPixels.ts <probe.json>:<rgb dir> ... [--scanline=first-body|captured|swapped|zero] [--neg=top|bgx] [--out=receipt.json]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createSceneOnMovePresentation, type SceneOnMementoConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { battlerConfig, productionConfig } from "./prep34MementoLib.ts";

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const out = flag("out");
const results = [];
for (const spec of args.filter((a) => !a.startsWith("--"))) {
  const [probe, rgbDir] = spec.split(":") as [string, string];
  const data = JSON.parse(readFileSync(probe, "utf8")) as { frames: Record<string, any>[] };
  const first = data.frames[0]!;
  const battler = (which: "attacker" | "target") => {
    const sprite = first.battlerSprites[which]; const c = battlerConfig(first, which);
    return { species: c.species as "WEEZING" | "ONIX", geometry: { side: c.side, spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: { x: sprite.x, y: sprite.y }, battlePositionCenter: { x: sprite.x, y: c.side === "player" ? 80 : 40 } } };
  };
  const config = { move: "MEMENTO", attacker: battler("attacker"), target: battler("target"),
    fieldProfile: { playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp, opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp, playerGender: "male", opponentGender: "male" },
    reducer: productionConfig(first) } as unknown as SceneOnMementoConfig;
  const stage = createSceneOnMovePresentation<SceneOnMementoConfig>(config);
  const rows: [number, number][] = [];
  data.frames.forEach((row, age) => {
    const raw = readFileSync(join(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`));
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    const app = render(engine);
    let px = 0;
    for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) px += 1;
    rows.push([age, px]);
  });
  const bad = rows.filter(([, px]) => px > 0);
  results.push({ probe: probe.split("/").pop(), rows: rows.length, matched: rows.length - bad.length, px: bad.reduce((s, [, px]) => s + px, 0),
    activationScanline: { srcBuffer: first.scanline.srcBuffer }, mismatches: bad.slice(0, 40) });
}
const receipt = { schema: "prep34-memento-pixels/v1", scanline: flag("scanline") ?? "first-body", neg: flag("neg") ?? null,
  renderer: "src/engine/battleScene.ts MEMENTO branch (unchanged)", windows: results };
if (out) writeFileSync(out, `${JSON.stringify(receipt, null, 1)}\n`);
for (const r of results) console.log(`${r.probe}: ${r.matched}/${r.rows} rows 0 px; px ${r.px}${r.mismatches.length ? ` first ${JSON.stringify(r.mismatches.slice(0, 10))}` : ""}`);
