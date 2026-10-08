// S10A Substitute body: staged byte-identity proof for the generalised renderer branch (liveField = false, the accepted
// GOLEM -> ONIX staged configs of tools/compare/substitutePortable.ts, both orientations). Renders presentation ages -2..90
// through the core render and prints one sha256 per orientation (RGBA frames concatenated), plus the staged gate's verdict
// for another pair (must still throw). Run at the base and at the change; equal output = staged outputs byte-identical.
// usage: npx vite-node tools/integration/substBodyStagedDigest.ts
import { createHash } from "node:crypto";
import { createSceneOnMovePresentation, type SceneOnMoveConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";

const geometry = (side: "player" | "opponent", corner: { x: number; y: number }, center: { x: number; y: number }) =>
  ({ side, spriteCorner: corner, animationCenter: center, battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 } });
const config = (playerAttacks: boolean, attacker = "GOLEM", target = "ONIX") => ({
  move: "SUBSTITUTE",
  attacker: { species: attacker, geometry: playerAttacks ? geometry("player", { x: 40, y: 64 }, { x: 72, y: 96 }) : geometry("opponent", { x: 144, y: 13 }, { x: 176, y: 45 }) },
  target: { species: target, geometry: playerAttacks ? geometry("opponent", { x: 145, y: 10 }, { x: 176, y: 42 }) : geometry("player", { x: 40, y: 48 }, { x: 72, y: 80 }) },
  fieldProfile: playerAttacks
    ? { playerHp: 184, playerMaxHp: 187, opponentHp: 142, opponentMaxHp: 142, playerGender: "male", opponentGender: "male" }
    : { playerHp: 142, playerMaxHp: 142, opponentHp: 187, opponentMaxHp: 187, playerGender: "male", opponentGender: "male" },
}) as unknown as SceneOnMoveConfig;
const frame = (c: SceneOnMoveConfig, age: number) =>
  render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(c), age } } as EngineState);
for (const playerAttacks of [true, false]) {
  const h = createHash("sha256");
  for (let age = -2; age <= 90; age += 1) h.update(frame(config(playerAttacks), age));
  let other: string;
  try { frame(config(playerAttacks, "PERSIAN", "SLOWBRO"), 20); other = "rendered"; } catch (error) { other = `threw: ${(error as Error).message}`; }
  console.log(`SUBSTITUTE ${playerAttacks ? "player-to-opponent" : "opponent-to-player"} ages -2..90 ${h.digest("hex")} | staged PERSIAN->SLOWBRO ${other}`);
}
