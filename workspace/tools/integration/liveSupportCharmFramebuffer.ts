/**
 * Charm's source probe intentionally records dense `rows`, rather than the
 * common `{ frames }` shape used by liveAdapterFramebuffer.ts.  Keep that
 * shared adapter narrow and use this equally narrow runner to prove the
 * production live field adapter against the source-owned Charm body.
 */
import { spawnSync } from "node:child_process";
import "../../src/engine/monPicPixelsInstall.ts";
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

interface Fixture {
  sourceFixture?: string;
  move: "CHARM";
  sourceWindow: { startFrame: number; endFrame: number };
  probe: string;
  scenario: string;
  attacker: { species: string; geometry: { side: "player" | "opponent" } };
  target: { species: string; geometry: { side: "player" | "opponent" } };
  fieldProfile: SceneOnDragonRageFieldProfile;
}

interface ProbeRow { frame: number; sha256: string; }
interface Probe { schema: "charm-dense-evidence/v2"; rows: ProbeRow[]; }

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ids = Object.fromEntries(moveData.moves.map(row => [row.move.replace(/^MOVE_/, ""), row.id]));
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function liveView(fixture: Fixture, age: number): BattleResolutionPresentationRenderView {
  const profile = fixture.fieldProfile;
  const makeBattler = (side: "player" | "opponent") => {
    const mon = fixture.attacker.geometry.side === side ? fixture.attacker : fixture.target;
    const species = speciesStats.species.find(row => row.name === `SPECIES_${mon.species}`)?.id;
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
  const attacker = fixture.attacker.geometry.side === "player" ? 0 : 1;
  const request: BattleMoveAnimationRequest = {
    moveId: ids.CHARM!, attacker, target: attacker === 0 ? 1 : 0,
    turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
  };
  if (liveMoveAnimationDuration(request) === null) throw new Error("No live adapter for CHARM");
  const healthbox = (mon: typeof field.player) => ({
    name: mon.name, level: mon.level, gender: mon.gender, status: mon.status,
    hpFraction: mon.hp / mon.maxHP, currentHp: mon.hp, maxHp: mon.maxHP,
  });
  return {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: { player: healthbox(field.player), opponent: healthbox(field.opponent) },
    message: { lines: [`${attacker === 1 ? "Foe " : ""}${fixture.attacker.species} used`, "CHARM!"], visibleCharacters: 99 },
    effect: { type: "move", request, age },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null,
    midBattleSwitchIn: null, switchOut: null, partySummary: null, midBattleSwitchFade: null,
    midBattleSwitchParticles: null, trainerSlide: null,
  };
}

export function verifyLiveSupportCharmFramebuffer(path: string, freshRuns = 2) {
  const source = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Fixture;
  const fixture: Fixture = source.sourceFixture
    ? { ...JSON.parse(readFileSync(resolve(root, source.sourceFixture), "utf8")), ...source }
    : source;
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const results = [];
  for (let run = 0; run < freshRuns; run++) {
    const scratch = createScratchDir("pokebench-live-support-charm-");
    const output = join(scratch, "probe.json");
    const rgbDir = join(scratch, "rgb");
    const probeRun = spawnSync("python3", [
      join(root, "tools/run-mgba-probe.py"), output, "--",
      join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
      resolve(root, fixture.scenario), output, rgbDir,
    ], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    if (probeRun.status !== 0) throw new Error(probeRun.stderr || probeRun.stdout);
    const probe = JSON.parse(readFileSync(output, "utf8")) as Probe;
    if (probe.schema !== "charm-dense-evidence/v2") throw new Error("Unexpected Charm probe schema");
    const frames = probe.rows.filter(row => row.frame >= fixture.sourceWindow.startFrame
      && row.frame <= fixture.sourceWindow.endFrame);
    if (frames.length !== fixture.sourceWindow.endFrame - fixture.sourceWindow.startFrame + 1
      || frames.some((row, index) => row.frame !== fixture.sourceWindow.startFrame + index)) {
      throw new Error("Charm probe omitted part of the complete source window");
    }
    const rows = frames.map((frame, age) => {
      const rgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
      if (rgb.length !== 240 * 160 * 3 || hash(rgb) !== frame.sha256) throw new Error("Source RGB receipt drift");
      const rgba = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(rgba, liveView(fixture, age));
      let residualPixels = 0;
      const regions = { field: 0, chrome: 0 };
      for (let pixel = 0; pixel < 240 * 160; pixel++) {
        if (rgb[pixel * 3] !== rgba[pixel * 4]
          || rgb[pixel * 3 + 1] !== rgba[pixel * 4 + 1]
          || rgb[pixel * 3 + 2] !== rgba[pixel * 4 + 2]) {
          residualPixels++;
          regions[pixel < 240 * 112 ? "field" : "chrome"]++;
        }
      }
      return { age, frame: frame.frame, residualPixels, regions, source: hash(rgb), live: hash(rgba) };
    });
    const expectedDuration = liveMoveAnimationDuration(
      (liveView(fixture, 0).effect as { request: BattleMoveAnimationRequest }).request,
    );
    const receipt = {
      fixture: path, run, scratch, expectedDuration, rows: rows.length,
      exactRows: rows.filter(row => row.residualPixels === 0).length,
      residualPixels: rows.reduce((sum, row) => sum + row.residualPixels, 0),
      digest: hash(Buffer.from(JSON.stringify(rows))),
      firstMismatches: rows.filter(row => row.residualPixels > 0).slice(0, 5),
    };
    writeFileSync(join(scratch, "live-comparison.json"), JSON.stringify({ ...receipt, comparisons: rows }, null, 2) + "\n");
    results.push(receipt);
  }
  if (results.some(result => result.digest !== results[0]!.digest)) {
    throw new Error("Fresh source/live results differ");
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const path of process.argv.slice(2)) {
    const results = verifyLiveSupportCharmFramebuffer(path);
    console.log(JSON.stringify(results, null, 2));
    if (results.some(result => result.exactRows !== result.rows || result.expectedDuration !== result.rows)) {
      process.exitCode = 1;
    }
  }
}
