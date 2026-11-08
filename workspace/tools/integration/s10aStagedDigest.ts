// S10A staged byte-identity proof for the Extreme Speed / Memento renderer branches (liveField = false, the accepted staged configs):
// renders every presentation age of each staged window through the core render and prints one sha256 per window (RGBA frames concatenated).
// Run at the base and at the change; equal digests = the staged / accepted outputs are byte-identical.
// usage: vite-node tools/integration/s10aStagedDigest.ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation, type SceneOnMementoConfig, type SceneOnMoveConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { battlerConfig, productionConfig } from "./prep34MementoLib.ts";

const digest = (config: SceneOnMoveConfig, ages: number) => {
  const stage = createSceneOnMovePresentation(config), h = createHash("sha256");
  for (let age = 0; age < ages; age += 1) {
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    h.update(render(engine));
  }
  return h.digest("hex");
};
const geometry = (side: "player" | "opponent", corner: { x: number; y: number }, center: { x: number; y: number }) =>
  ({ side, spriteCorner: corner, animationCenter: center, battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 } });
// tools/compare/extremeSpeedPortable.ts staged configs (accepted ARCANINE -> DUGTRIO, both orientations), 330 presentation ages.
for (const playerToOpponent of [true, false]) {
  const config = { move: "EXTREME_SPEED",
    attacker: { species: "ARCANINE", geometry: playerToOpponent ? geometry("player", { x: 40, y: 54 }, { x: 72, y: 86 }) : geometry("opponent", { x: 144, y: 10 }, { x: 176, y: 42 }) },
    target: { species: "DUGTRIO", geometry: playerToOpponent ? geometry("opponent", { x: 144, y: 21 }, { x: 176, y: 53 }) : geometry("player", { x: 40, y: 59 }, { x: 72, y: 91 }) },
    fieldProfile: playerToOpponent
      ? { playerHp: 156, opponentHp: 101, playerStatus: "none", playerGender: "male", opponentGender: "female" }
      : { playerHp: 101, opponentHp: 156, playerStatus: "none", playerGender: "male", opponentGender: "male" },
    animationAgeOffset: playerToOpponent ? 4 : 0 } as unknown as SceneOnMoveConfig;
  console.log(`EXTREME_SPEED ${playerToOpponent ? "player-to-opponent" : "opponent-to-player"} ${digest(config, 330)}`);
}
// The accepted WEEZING -> ONIX Memento windows (retained corpora tools/compare/evidence/memento-*-dense-state.json.gz) with the prep34 staged-scene
// construction (prep34MementoPixels.ts), every corpus row.
for (const side of ["player", "opponent"]) {
  const data = JSON.parse(gunzipSync(readFileSync(`tools/compare/evidence/memento-${side}-dense-state.json.gz`)).toString("utf8")) as { frames: Record<string, any>[] };
  const first = data.frames[0]!;
  const battler = (which: "attacker" | "target") => {
    const sprite = first.battlerSprites[which]; const c = battlerConfig(first, which);
    return { species: c.species, geometry: { side: c.side, spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: { x: sprite.x, y: sprite.y }, battlePositionCenter: { x: sprite.x, y: c.side === "player" ? 80 : 40 } } };
  };
  const config = { move: "MEMENTO", attacker: battler("attacker"), target: battler("target"),
    fieldProfile: { playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp, opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp, playerGender: "male", opponentGender: "male" },
    reducer: productionConfig(first) } as unknown as SceneOnMementoConfig;
  console.log(`MEMENTO ${side} ${digest(config, data.frames.length)}`);
}
