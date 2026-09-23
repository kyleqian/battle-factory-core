/**
 * Compare production live-field adapters to complete fresh source move bodies.
 * The tool supplies a displayed field and typed request, never a captured
 * per-frame host/config. Ordinary command selection is tested independently.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import moveData from "../../src/data/gen/moves.json" with { type: "json" };
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import type { SceneOnDragonRageFieldProfile } from "../../src/animation/sceneOnPresentation.ts";
import { createScratchDir } from "../lib/scratch.ts";

export interface Fixture {
  sourceFixture?: string;
  move: string;
  denseWindow?: { startFrame: number; endFrame: number };
  sourceWindow?: { startFrame: number; endFrame: number };
  probeMoveId?: number;
  probe: string;
  scenario: string;
  attacker: { species: string; geometry: { side: "player" | "opponent" } };
  target: { species: string; geometry: { side: "player" | "opponent" } };
  fieldProfile: SceneOnDragonRageFieldProfile;
  body?: "normal" | "shattered-wall";
}
interface Probe { frames: { frame: number; sha256: string }[]; }
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ids = Object.fromEntries(moveData.moves.map(row => [row.move.replace(/^MOVE_/, ""), row.id]));
const names = Object.fromEntries(moveData.moves.map(row => [row.move.replace(/^MOVE_/, ""), row.name]));
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export function liveView(f: Fixture, age: number): BattleResolutionPresentationRenderView {
  const profile = f.fieldProfile;
  const makeBattler = (side: "player" | "opponent") => {
    const mon = f.attacker.geometry.side === side ? f.attacker : f.target;
    const species = speciesStats.species.find(s => s.name === `SPECIES_${mon.species}`)?.id;
    if (species === undefined) throw new Error(`Unknown species ${mon.species}`);
    return {
      species, name: mon.species, side: side === "player" ? "player" as const : "trainer" as const,
      battler: side === "player" ? 0 as const : 1 as const, partyIndex: 0 as const, level: 50,
      hp: side === "player" ? profile.playerHp : profile.opponentHp,
      maxHP: side === "player" ? profile.playerMaxHp : profile.opponentMaxHp,
      gender: (side === "player" ? profile.playerGender : profile.opponentGender) ?? "male",
      status: "none" as const, moveIds: [0, 0, 0, 0] as const,
      currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
    };
  };
  const field: BattleResolutionDisplayedField = { player: makeBattler("player"), opponent: makeBattler("opponent") };
  const attacker = f.attacker.geometry.side === "player" ? 0 : 1;
  const request: BattleMoveAnimationRequest = {
    moveId: ids[f.move]!, attacker, target: attacker === 0 ? 1 : 0,
    turn: f.body === "shattered-wall" ? 1 : 0, power: 0, damage: 0, friendship: 70, multihit: 0,
  };
  if (liveMoveAnimationDuration(request) === null) throw new Error(`No live adapter for ${f.move}`);
  const healthbox = (mon: typeof field.player) => ({
    name: mon.name, level: mon.level, gender: mon.gender, status: mon.status,
    hpFraction: mon.hp / mon.maxHP, currentHp: mon.hp, maxHp: mon.maxHP,
  });
  // Battle text uses the source's display spelling (for example VICEGRIP,
  // not a synthesized "VICE GRIP"). This remains fixture-independent.
  const name = names[f.move] ?? f.move.replaceAll("_", " ");
  return {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: { player: healthbox(field.player), opponent: healthbox(field.opponent) },
    message: { lines: [`${attacker === 1 ? "Foe " : ""}${f.attacker.species} used`, `${name}!`], visibleCharacters: 99 },
    effect: { type: "move", request, age },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null,
    midBattleSwitchIn: null, switchOut: null, partySummary: null, midBattleSwitchFade: null,
    midBattleSwitchParticles: null, trainerSlide: null,
  };
}

export function verifyLiveAdapterFramebuffer(path: string, freshRuns = 2) {
  const source = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Fixture;
  const fixture: Fixture = source.sourceFixture
    ? { ...JSON.parse(readFileSync(resolve(root, source.sourceFixture), "utf8")), ...source }
    : source;
  // These shared source probes require the selected move as a CLI argument.
  const moveArgumentProbes = [
    "tools/compare/poisonFangProbe.py", "tools/compare/crunchProbe.py",
    "tools/compare/crushClawProbe.py",
  ];
  const probeMoveId = fixture.probeMoveId
    ?? (moveArgumentProbes.includes(fixture.probe) ? ids[fixture.move] : undefined);
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const results = [];
  for (let run = 0; run < freshRuns; run++) {
    const scratch = createScratchDir("pokebench-live-adapter-");
    const output = join(scratch, "probe.json"), rgbDir = join(scratch, "rgb");
    const probeRun = spawnSync("python3", [
      join(root, "tools/run-mgba-probe.py"), output, "--",
      join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
      resolve(root, fixture.scenario), output, rgbDir,
      ...(probeMoveId === undefined ? [] : [String(probeMoveId)]),
    ], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    if (probeRun.status !== 0) throw new Error(probeRun.stderr || probeRun.stdout);
    const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
    // Use the previously accepted complete source-owned window; some probes
    // also retain pre-body text and post-body stat banners. Never pick matching rows.
    const window = fixture.denseWindow ?? fixture.sourceWindow;
    const frames = window
      ? probe.frames.filter(f => f.frame >= window.startFrame && f.frame <= window.endFrame)
      : probe.frames;
    if (window && (frames.length !== window.endFrame - window.startFrame + 1
      || frames.some((f, i) => f.frame !== window.startFrame + i))) {
      throw new Error("Probe omitted part of the complete source window");
    }
    const rows = frames.map((frame, age) => {
      const rgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
      if (rgb.length !== 240 * 160 * 3 || hash(rgb) !== frame.sha256) throw new Error("Source RGB receipt drift");
      const rgba = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(rgba, liveView(fixture, age));
      let residualPixels = 0;
      const regions = { field: 0, chrome: 0 };
      for (let p = 0; p < 240 * 160; p++) {
        if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) {
          residualPixels++;
          regions[p < 240 * 112 ? "field" : "chrome"]++;
        }
      }
      return { age, frame: frame.frame, residualPixels, regions, source: hash(rgb), live: hash(rgba) };
    });
    const expectedDuration = liveMoveAnimationDuration((liveView(fixture, 0).effect as { request: BattleMoveAnimationRequest }).request);
    const receipt = {
      fixture: path, run, scratch, expectedDuration, rows: rows.length,
      exactRows: rows.filter(r => r.residualPixels === 0).length,
      residualPixels: rows.reduce((a, r) => a + r.residualPixels, 0),
      digest: hash(Buffer.from(JSON.stringify(rows))), firstMismatches: rows.filter(r => r.residualPixels > 0).slice(0, 5),
    };
    writeFileSync(join(scratch, "live-comparison.json"), JSON.stringify({ ...receipt, comparisons: rows }, null, 2) + "\n");
    results.push(receipt);
  }
  if (results.some(r => r.digest !== results[0]!.digest)) throw new Error("Fresh source/live results differ");
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const path of process.argv.slice(2)) {
    const results = verifyLiveAdapterFramebuffer(path);
    console.log(JSON.stringify(results, null, 2));
    if (results.some(r => r.exactRows !== r.rows || r.expectedDuration !== r.rows)) process.exitCode = 1;
  }
}
