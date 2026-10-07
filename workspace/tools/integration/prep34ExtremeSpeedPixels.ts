// prep34: the UNCHANGED Extreme Speed renderer (`render` of a staged EXTREME_SPEED presentation, the accepted
// extremeSpeedPortable.ts config) against a prep34 direct-mGBA probe window from the scenario's own activation frame.
// usage: vite-node prep34ExtremeSpeedPixels.ts <probe.json>:<rgb dir>:<player|opponent> ... [--age0=43] [--out=receipt.json]
// The reducer age at the activation row is --age0 (43 in both orientations, measured: accepted presentation age 48 + 4 / 52 + 0
// at window row 9). Rows 0..8 and 312..320 are the never-accepted rows; 9..311 re-check the accepted window.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const age0 = Number(flag("age0") ?? 43);
const out = flag("out");
const windows = args.filter((a) => !a.startsWith("--"));

function config(playerToOpponent: boolean) {
  return createSceneOnMovePresentation({
    move: "EXTREME_SPEED",
    attacker: playerToOpponent
      ? { species: "ARCANINE", geometry: { side: "player", spriteCorner: { x: 40, y: 54 }, animationCenter: { x: 72, y: 86 }, battlePositionCenter: { x: 72, y: 80 } } }
      : { species: "ARCANINE", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
    target: playerToOpponent
      ? { species: "DUGTRIO", geometry: { side: "opponent", spriteCorner: { x: 144, y: 21 }, animationCenter: { x: 176, y: 53 }, battlePositionCenter: { x: 176, y: 40 } } }
      : { species: "DUGTRIO", geometry: { side: "player", spriteCorner: { x: 40, y: 59 }, animationCenter: { x: 72, y: 91 }, battlePositionCenter: { x: 72, y: 80 } } },
    fieldProfile: playerToOpponent
      ? { playerHp: 156, opponentHp: 101, playerStatus: "none", playerGender: "male", opponentGender: "female" }
      : { playerHp: 101, opponentHp: 156, playerStatus: "none", playerGender: "male", opponentGender: "male" },
    animationAgeOffset: playerToOpponent ? 4 : 0,
  } as Parameters<typeof createSceneOnMovePresentation>[0]);
}

const results = [];
for (const spec of windows) {
  const [probe, rgbDir, side] = spec.split(":") as [string, string, string];
  const data = JSON.parse(readFileSync(probe, "utf8")) as { sourceWindow: { startFrame: number; endFrame: number }; frames: { frame: number }[] };
  const playerToOpponent = side === "player";
  const offset = playerToOpponent ? 4 : 0;
  let state: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: config(playerToOpponent) };
  const rows: { row: number; frame: number; reducerAge: number; px: number }[] = [];
  data.frames.forEach((item, row) => {
    const reducerAge = age0 + row;
    state = { ...state, sceneOnPresentation: { ...state.sceneOnPresentation!, age: reducerAge - offset } };
    const oracle = readFileSync(join(rgbDir, `${String(item.frame).padStart(5, "0")}.rgb`));
    const rgba = render(state);
    let px = 0;
    for (let p = 0; p < 240 * 160; p += 1) {
      if (oracle[p * 3] !== rgba[p * 4] || oracle[p * 3 + 1] !== rgba[p * 4 + 1] || oracle[p * 3 + 2] !== rgba[p * 4 + 2]) px += 1;
    }
    rows.push({ row, frame: item.frame, reducerAge, px });
  });
  const bad = rows.filter((r) => r.px > 0);
  const segment = (lo: number, hi: number) => {
    const sel = rows.filter((r) => r.row >= lo && r.row <= hi);
    return { rows: `${lo}..${hi}`, matched: sel.filter((r) => r.px === 0).length, total: sel.length, px: sel.reduce((s, r) => s + r.px, 0) };
  };
  const last = rows.length - 1;
  results.push({
    probe: probe.split("/").pop(), side, age0, activationFrame: data.sourceWindow.startFrame, firstInactiveFrame: data.sourceWindow.endFrame,
    rows: rows.length, matched: rows.length - bad.length, px: bad.reduce((s, r) => s + r.px, 0),
    preAccepted: segment(0, 8), accepted: segment(9, Math.min(311, last)), postAccepted: segment(312, last),
    mismatches: bad.slice(0, 40).map((r) => [r.row, r.reducerAge, r.px]),
  });
}
const receipt = { schema: "prep34-extreme-speed-pixels/v1", renderer: "src/engine/battleScene.ts EXTREME_SPEED branch (unchanged)", windows: results };
if (out) writeFileSync(out, `${JSON.stringify(receipt, null, 1)}\n`);
for (const r of results) console.log(`${r.probe} ${r.side}: ${r.matched}/${r.rows} rows 0 px (pre ${r.preAccepted.matched}/${r.preAccepted.total}, accepted ${r.accepted.matched}/${r.accepted.total}, post ${r.postAccepted.matched}/${r.postAccepted.total}); px ${r.px}${r.mismatches.length ? ` first ${JSON.stringify(r.mismatches.slice(0, 12))}` : ""}`);
