/**
 * prep37 item 1: the MOVE_SUBSTITUTE body (87 rows) with PRODUCTION-DERIVED inputs, frame-by-frame against ROM windows.
 *   inputs derived exactly as the live seam does (liveMoveAnimation.ts:1039-1075): species from the field, spriteCorner =
 *   battleCommandFieldSpriteOrigin (battleCommandFieldArt.ts:111) + the opponent's species front idle rest; HUD values
 *   from the gameplay field at the body (hp/maxHP); doll art/palette = src/animation/assets/substitute.json.
 *   --renderer=unchanged : production render(engine) (core.ts:3662 -> battleScene.ts:18552), no src change.
 *   --renderer=patched   : prep37RendererPatch.ts copy (generic battler art + names; doll geometry untouched).
 *   --neg=<x>            : negative controls (age0+1 | dollY+1 [patched only] | idleRest0) must FAIL.
 * usage: npx vite-node tools/integration/prep37BodyCheck.ts <probe.json:rgb-dir>... --renderer=... --scratch=<dir> --out=<receipt.json>
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { substituteAtAge } from "../../src/animation/substitute.ts";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { speciesFrontIdleRestOffsetOrZero } from "../../src/animation/speciesIdleAnim.ts";
import { battleCommandFieldSpriteOrigin, createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createFramebuffer } from "../../src/engine/framebuffer.ts";
import { patchedBattleSceneSource } from "./prep37RendererPatch.ts";

type Side = "player" | "opponent";
interface Battler { species: number; hp: number; maxHP: number; sprite: { x2: number; y2: number; invisible: boolean; affineMode: number } }
interface Row { frame: number; script: string | null; animScriptActive: number; animAttacker: number; battlers: Battler[] }
const args = process.argv.slice(2);
const opt = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const renderer = opt("renderer") ?? "unchanged";
const neg = opt("neg");
const out = opt("out");
const scratch = opt("scratch");
const inputs = args.filter((a) => !a.startsWith("--"));
if (!out || !inputs.length || (renderer === "patched" && !scratch)) throw new Error("usage: see header");

let patchedRender: ((fb: Uint8Array, state: unknown) => void) | null = null;
if (renderer === "patched") {
  mkdirSync(scratch!, { recursive: true });
  const file = join(resolve(scratch!), `battleScene.prep37-patched${neg === "dollY+1" ? "-dolly" : ""}.ts`);
  writeFileSync(file, patchedBattleSceneSource({ dollYDelta: neg === "dollY+1" ? 1 : 0 }));
  patchedRender = (await import(file)).renderSceneOnMovePresentation;
}

const results = [];
for (const input of inputs) {
  const [probePath, rgbDir] = input.split(":");
  const probe = JSON.parse(readFileSync(probePath!, "utf8")) as { scenario: string; profile: string; frames: Row[] };
  const scenario = JSON.parse(readFileSync(resolve(probe.scenario), "utf8"));
  const frames = probe.frames;
  const start = frames.findIndex((r) => r.script === "Move_SUBSTITUTE");
  const window = frames.slice(start, start + 87);
  const dense = window.length === 87 && window.every((r, i) => r.frame === window[0]!.frame + i)
    && window.slice(0, 86).every((r) => r.script === "Move_SUBSTITUTE" && r.animScriptActive === 1)
    && window[86]!.animScriptActive === 0;
  const attackerSide: Side = window[0]!.animAttacker === 0 ? "player" : "opponent";
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const b0 = window[0]!.battlers;
  const field = { player: { species: b0[0]!.species }, opponent: { species: b0[1]!.species } };
  const art = createBattleCommandFieldArtView(field as never);
  const battler = (side: Side) => {
    const origin = battleCommandFieldSpriteOrigin(art[side], side);
    const rest = side === "opponent" && neg !== "idleRest0" ? speciesFrontIdleRestOffsetOrZero(art[side].speciesSymbol) : { x2: 0, y2: 0 };
    return {
      species: art[side].speciesSymbol,
      geometry: {
        side, spriteCorner: { x: origin.x + rest.x2, y: origin.y + rest.y2 },
        animationCenter: { x: origin.x + 32, y: Math.min(104, origin.y + 32 + (side === "player" ? 8 : 0)) },
        battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
      },
    };
  };
  const gender = (side: Side) => scenario.overrides.parties[side][0].gender as "male" | "female";
  const stage = createSceneOnMovePresentation({
    move: "SUBSTITUTE", attacker: battler(attackerSide), target: battler(targetSide),
    fieldProfile: {
      playerHp: b0[0]!.hp, playerMaxHp: b0[0]!.maxHP, opponentHp: b0[1]!.hp, opponentMaxHp: b0[1]!.maxHP,
      playerGender: gender("player"), opponentGender: gender("opponent"),
    },
  } as never);
  let component = 0, zeroRows = 0, totalPx = 0;
  let thrown: string | null = null;
  const rows: { age: number; px: number }[] = [];
  const digest = createHash("sha256");
  for (const [age, row] of window.entries()) {
    const expected = substituteAtAge(age, attackerSide).sprite;
    const sprite = row.battlers[window[0]!.animAttacker]!.sprite;
    // RAM sprite x2/y2/invisible vs the accepted reducer at the same age (the accepted harness's component rule)
    if (sprite.x2 === expected.x2 && sprite.y2 === expected.y2 && sprite.invisible === expected.invisible) component += 1;
    const renderAge = neg === "age0+1" ? age + 1 : age;
    const state = { ...stage, age: renderAge };
    let app: Uint8Array;
    try {
      if (patchedRender) { app = createFramebuffer(); patchedRender(app, state); }
      else app = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: state } as EngineState);
    } catch (error) { thrown = String((error as Error).message); break; }
    const rom = inflateSync(readFileSync(join(rgbDir!, `${String(row.frame).padStart(5, "0")}.rgb.z`)));
    let px = 0;
    for (let p = 0; p < 240 * 160; p += 1) {
      if (app[p * 4] !== rom[p * 3] || app[p * 4 + 1] !== rom[p * 3 + 1] || app[p * 4 + 2] !== rom[p * 3 + 2]) px += 1;
    }
    digest.update(rom);
    if (px === 0) zeroRows += 1;
    totalPx += px;
    if (px) rows.push({ age, px });
  }
  results.push({
    probe: probePath!.split("/").pop(), profile: probe.profile, attackerSide,
    pair: `${art[attackerSide].speciesSymbol}->${art[targetSide].speciesSymbol}`,
    bodyFrames: { start: window[0]!.frame, endFirstInactive: window[86]!.frame }, dense,
    derived: { attacker: battler(attackerSide).geometry.spriteCorner, target: battler(targetSide).geometry.spriteCorner },
    rendererThrew: thrown, componentRows: component, zeroPxRows: zeroRows, totalPx, nonZeroRows: rows.slice(0, 20), romWindowSha256: digest.digest("hex"),
  });
}
const receipt = { schema: "prep37-body-check/v1", renderer, neg: neg ?? null, results };
writeFileSync(out, JSON.stringify(receipt, null, 1) + "\n");
for (const r of results) console.log(`${r.pair} ${r.attackerSide} ${r.profile}: threw=${r.rendererThrew} dense=${r.dense} component ${r.componentRows}/87, 0px rows ${r.zeroPxRows}/87, total ${r.totalPx} px`);
