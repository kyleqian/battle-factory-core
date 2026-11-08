/** Actual core.ts framebuffer verifier for the four retained Magnitude bodies. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnMagnitudeView,
  type SceneOnMagnitudeConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
export type MagnitudeBodyId = "regular-player" | "regular-opponent" | "intense-player" | "intense-opponent";
const root = resolve(new URL("../..", import.meta.url).pathname);
const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/magnitude-dense-evidence.json"), "utf8")) as Json;
const species = new Map<number, SceneOnPresentationBattler["species"]>([
  [75, "GRAVELER"], [95, "ONIX"], [301, "DELCATTY"], [323, "CAMERUPT"],
]);
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

export function readMagnitudeRows(id: MagnitudeBodyId): Json[] {
  const body = receipt.bodies.find((candidate: Json) => candidate.id === id)!;
  const compressed = readFileSync(resolve(root, body.denseState));
  if (sha256(compressed) !== body.denseStateSha256) throw new Error(`${id}: dense hash drifted`);
  return (JSON.parse(gunzipSync(compressed).toString("utf8")) as Json).frames;
}

function battler(row: Json, role: "attacker" | "target"): SceneOnPresentationBattler {
  const side = row.animationBattlers[role] === 0 ? "player" : "opponent";
  const source = row.battlerSprites[role];
  const active = row.battlers[side];
  const name = role === "attacker" && row.battlerSprites[role].data[2] === 323
    ? "BARBOACH"
    : role === "target" && row.battlerSprites[role].data[2] === 301
      ? "NINCADA"
      : species.get(active.species);
  if (!name) throw new Error(`missing Magnitude species ${active.species}`);
  return {
    species: name,
    geometry: {
      side,
      spriteCorner: { x: source.x - 32, y: source.y - 32 },
      animationCenter: { x: source.x, y: source.y },
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

export function magnitudeConfigFor(id: MagnitudeBodyId, rows = readMagnitudeRows(id)): SceneOnMagnitudeConfig {
  const first = rows[0]!;
  const playerMon = first.parties.player[first.battlers.player.partyIndex];
  const opponentMon = first.parties.opponent[first.battlers.opponent.partyIndex];
  const attacker = battler(first, "attacker"), target = battler(first, "target");
  const firstShake = rows[1]!.tasks.find((task: Json) => task.func.symbol === "AnimTask_ShakePlatforms");
  return {
    move: "MAGNITUDE",
    attacker,
    target,
    fieldProfile: {
      playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp, opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: playerMon.gender === "genderless" ? "none" : playerMon.gender,
      opponentGender: opponentMon.gender === "genderless" ? "none" : opponentMon.gender,
    },
    animationInputs: {
      movePower: (firstShake.data[15] - 3) * 10,
      attackerSide: attacker.geometry.side,
      targetSide: target.geometry.side,
      initialPlatformX: first.battleBg.gBattle_BG3_X,
      initialBattlerX2: {
        player: first.animationBattlers.attacker === 0 ? first.battlerSprites.attacker.x2 : first.battlerSprites.target.x2,
        opponent: first.animationBattlers.attacker === 1 ? first.battlerSprites.attacker.x2 : first.battlerSprites.target.x2,
      },
      battlerSpriteSlots: {
        player: first.animationBattlers.attacker === 0 ? first.battlerSprites.attacker.slot : first.battlerSprites.target.slot,
        opponent: first.animationBattlers.attacker === 1 ? first.battlerSprites.attacker.slot : first.battlerSprites.target.slot,
      },
      spriteOrder: first.spriteOrder,
    },
  };
}

export function inspectMagnitudeFramebuffer(): readonly Json[] {
  return (receipt.bodies as Json[]).map((body) => {
    const id = body.id as MagnitudeBodyId;
    const rows = readMagnitudeRows(id);
    const archive = resolve(root, body.rawRgbArchive);
    if (sha256(readFileSync(archive)) !== body.rawRgbArchiveSha256) throw new Error(`${id}: RGB archive eset drifted`);
    const scratch = createScratchDir(`pokebench-magnitude-${id}-`);
    execFileSync("tar", ["-xzf", archive, "-C", scratch]);
    const stage = createSceneOnMovePresentation(magnitudeConfigFor(id, rows));
    let matched = 0, componentMatched = 0, residualPixels = 0;
    const failures: string[] = [];
    for (const [age, row] of rows.entries()) {
      const state = { ...stage, age };
      const view = sceneOnMagnitudeView(state);
      if (view.source.offset !== row.scriptOffset || view.active !== row.animScriptActive) {
        throw new Error(`${id} age ${age}: typed seam drifted`);
      }
      const platform = row.tasks.find((task: Json) => task.func.symbol === "AnimTask_ShakePlatforms");
      const battlers = row.tasks.find((task: Json) => task.func.symbol === "AnimTask_ShakeBattlers");
      const sound = row.tasks.find((task: Json) => task.func.symbol === "Task_LoopAndPlaySE");
      const palette = row.sprites.find((sprite: Json) => sprite.template?.symbol === "gComplexPaletteBlendSpriteTemplate");
      const shakeMatches = age >= 1 && view.shake.active
        ? !!platform && !!battlers && [platform, battlers].every((task: Json) =>
          task.data[0] === view.shake.taskState && task.data[1] === view.shake.delay
          && task.data[2] === view.shake.timer && task.data[3] === 50
          && task.data[14] === view.shake.horizontalOffset
          && task.data[15] === Math.floor(stage.config.animationInputs.movePower / 10) + 3)
        : !platform && !battlers;
      const audioMatches = view.audio.active
        ? !!sound && sound.data[0] === 214 && sound.data[1] === view.audio.panning
          && sound.data[2] === 8 && sound.data[3] === view.audio.playsRemaining
          && sound.data[8] === view.audio.frameCounter
        : !sound;
      const paletteMatches = view.palette.active
        ? !!palette && JSON.stringify(palette.data) === JSON.stringify([
          view.palette.timer, view.palette.color === "white" ? 259 : 3,
          view.palette.remainingBlends, 0, 14, 32767, 14, 1,
        ])
        : !palette;
      if (!shakeMatches || !audioMatches || !paletteMatches
        || view.visualTaskCount !== row.visualTaskCount || view.soundTaskCount !== row.soundTaskCount) {
        throw new Error(`${id} age ${age}: reducer component drifted`);
      }
      componentMatched += 1;
      const app = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: state });
      const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
      if (sha256(raw) !== row.sha256) throw new Error(`${id} age ${age}: RGB digest drifted`);
      let residual = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        if (app[pixel * 4] !== raw[pixel * 3]
          || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
          || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) {
          residual += 1;
          const x = pixel % 240, y = Math.floor(pixel / 240);
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
      if (residual === 0) matched += 1;
      else { residualPixels += residual; failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`); }
    }
    return { id, rows: rows.length, componentMatched, matched, residualPixels, failures };
  });
}

export function magnitudeFramebufferVerdict(): Json {
  const bodies = inspectMagnitudeFramebuffer();
  const canonical = magnitudeConfigFor("regular-player");
  const relocated = canonical.animationInputs.spriteOrder.filter((slot) => slot !== 18 && slot !== 3);
  const altered: SceneOnMagnitudeConfig = {
    ...canonical,
    attacker: {
      species: "SURSKIT",
      geometry: { side: "player", spriteCorner: { x: 35, y: 53 }, animationCenter: { x: 67, y: 85 }, battlePositionCenter: { x: 72, y: 80 } },
    },
    target: {
      species: "ARON",
      geometry: { side: "opponent", spriteCorner: { x: 139, y: 17 }, animationCenter: { x: 171, y: 49 }, battlePositionCenter: { x: 176, y: 40 } },
    },
    animationInputs: {
      ...canonical.animationInputs,
      movePower: 150,
      battlerSpriteSlots: { player: 18, opponent: 3 },
      spriteOrder: [18, ...relocated, 3],
    },
  };
  const renderAt = (config: SceneOnMagnitudeConfig): string => sha256(render({
    ...createInitialState(), rngMode: "frontierBattle",
    sceneOnPresentation: { ...createSceneOnMovePresentation(config), age: 42 },
  }));
  const canonicalDigest = renderAt(canonical), alteredDigest = renderAt(altered);
  if (canonicalDigest === alteredDigest) throw new Error("material live Magnitude control did not change framebuffer");
  const stable = {
    schema: "magnitude-actual-core-verdict/v1",
    rows: bodies.reduce((sum, body) => sum + body.rows, 0),
    componentMatched: bodies.reduce((sum, body) => sum + body.componentMatched, 0),
    matched: bodies.reduce((sum, body) => sum + body.matched, 0),
    residualPixels: bodies.reduce((sum, body) => sum + body.residualPixels, 0),
    bodies,
    alteredLiveControl: { species: ["SURSKIT", "ARON"], geometryChanged: true, allocationOrderChanged: true, changed: true },
  };
  return { ...stable, digest: sha256(Buffer.from(JSON.stringify(stable))) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(magnitudeFramebufferVerdict()));
}
