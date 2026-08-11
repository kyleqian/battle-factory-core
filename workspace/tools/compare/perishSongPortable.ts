import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  PERISH_SONG_FRAME_COUNT,
  perishSongAtAge,
} from "../../src/animation/perishSong.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPerishSongView,
  type SceneOnPerishSongFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Fixture = {
  schema: "perish-song-portable-evidence/v1";
  orientation: string;
  scenario: string;
  probe: string;
  attacker: SceneOnPresentationBattler;
  target: SceneOnPresentationBattler;
  fieldProfile: SceneOnPerishSongFieldProfile;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  evidenceSha256: string;
  rawRgbSha256: string;
  opponentMoveSlot?: 3;
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: perishSongPortable.ts <player fixture> <opponent fixture>",
  );
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();

function expectedNote(component: ReturnType<typeof perishSongAtAge>, index: number) {
  const note = component.notes[index]!;
  return {
    slot: note.oamSlot,
    centerX: note.centerX & 0x1ff,
    centerY: note.centerY & 0xff,
    matrix: [note.matrix.a, note.matrix.b, note.matrix.c, note.matrix.d],
  };
}

function observedNote(sprite: any) {
  return {
    slot: sprite.slot,
    centerX: ((sprite.attr[1] & 0x1ff) + 8) & 0x1ff,
    centerY: ((sprite.attr[0] & 0xff) + 8) & 0xff,
    matrix: sprite.matrix,
  };
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(
    readFileSync(resolve(fixturePath), "utf8"),
  ) as Fixture;
  const scratch = createScratchDir("pokebench-perish-song-");
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"),
    output,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    resolve(root, fixture.scenario),
    output,
    rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as any;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  if (
    fixture.schema !== "perish-song-portable-evidence/v1"
    || probe.schema !== "perish-song-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || evidence !== fixture.evidenceSha256
    || probe.frames.length !== PERISH_SONG_FRAME_COUNT
    || probe.lifecycleCounts.gPerishSongMusicNoteSpriteTemplate !== 16
    || probe.lifecycleCounts.gPerishSongMusicNote2SpriteTemplate !== 1
    || !probe.topology.templates.includes("gSimplePaletteBlendSpriteTemplate")
    || !probe.topology.callbacks.includes("AnimPerishSongMusicNote_Step2")
  ) throw new Error(`${fixture.orientation}: immutable dense receipt changed`);

  const stage = createSceneOnMovePresentation({
    move: "PERISH_SONG",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const failures: string[] = [];
  const rawWindow = createHash("sha256");
  for (const [age, oracle] of probe.frames.entries()) {
    const rgb = readFileSync(
      join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`),
    );
    rawWindow.update(rgb);
    const rawFrame = createHash("sha256").update(rgb).digest("hex");
    const fields =
      oracle.softwareOam.length === 128
      && oracle.hardwareOam.length === 128
      && oracle.hardwareMatrices.length === 32
      && oracle.hardwareMatrices.every((matrix: number[]) => matrix.length === 4)
      && oracle.fadedPalette.length === 512
      && oracle.unfadedPalette.length === 512
      && oracle.hardwarePalette.length === 512
      && oracle.paletteTags.length === 16
      && oracle.tileTags.length === 128
      && Object.keys(oracle.registers).length === 21
      && oracle.mainCallbacks.callback1.symbol === "BattleMainCB1"
      && oracle.mainCallbacks.callback2.symbol === "BattleMainCB2"
      && oracle.mainCallbacks.vblank.symbol === "VBlankCB_Battle"
      && oracle.mainCallbacks.oamLoadDisabled === 0;

    const component = perishSongAtAge(age, fixture.attacker.geometry.side);
    const seam = sceneOnPerishSongView({ ...stage, age });
    const {
      age: _age,
      attacker: _attacker,
      target: _target,
      ...seamComponent
    } = seam;
    const sourceNotes = oracle.sprites.filter(
      (sprite: any) =>
        sprite.template.symbol === "gPerishSongMusicNoteSpriteTemplate",
    );
    const noteMatch = same(
      sourceNotes.map(observedNote),
      component.notes.map((_, index) => expectedNote(component, index)),
    );
    const player = oracle.battlers.player;
    const opponent = oracle.battlers.opponent;
    const battleState =
      player.hp === fixture.fieldProfile.playerHp
      && player.maxHp === fixture.fieldProfile.playerMaxHp
      && opponent.hp === fixture.fieldProfile.opponentHp
      && opponent.maxHp === fixture.fieldProfile.opponentMaxHp
      && player.item === (fixture.attacker.geometry.side === "player" ? 179 : 142)
      && opponent.item === (fixture.attacker.geometry.side === "opponent" ? 179 : 142)
      && player.volatile.perishSongTurns === 3
      && opponent.volatile.perishSongTurns === 3
      && player.statStages.every((stageValue: number) => stageValue === 6)
      && opponent.statStages.every((stageValue: number) => stageValue === 6)
      && player.status1 === 0
      && opponent.status1 === 0;
    const audio =
      age < 27
      || (
        oracle.se1.songHeader !== probe.frames[26].se1.songHeader
        && oracle.se1.tracks[0].panX
          === (fixture.attacker.geometry.side === "player" ? -64 : 63)
      );
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (
        app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
      ) diff += 1;
    }
    const cleanup =
      age !== PERISH_SONG_FRAME_COUNT - 1
      || (
        component.active
        && !component.musicNotes2Loaded
        && component.notes.length === 0
        && oracle.gAnimScriptActive === 0
        && oracle.visualTaskCount === 0
        && oracle.soundTaskCount === 0
        && !oracle.paletteTags.includes(10206)
      );
    if (
      rawFrame !== oracle.sha256
      || !fields
      || !same(seamComponent, component)
      || !noteMatch
      || !battleState
      || !audio
      || diff !== 0
      || !cleanup
    ) {
      failures.push(
        `frame ${oracle.frame}/age ${age}: raw=${rawFrame === oracle.sha256} `
        + `fields=${fields} seam=${same(seamComponent, component)} `
        + `notes=${noteMatch} battle=${battleState} audio=${audio} `
        + `framebuffer=${diff === 0} diff=${diff} cleanup=${cleanup}`,
      );
    }
  }
  const raw = rawWindow.digest("hex");
  if (raw !== fixture.rawRgbSha256) {
    failures.push(`${fixture.orientation}: raw RGB window digest changed`);
  }
  if (failures.length) throw new Error(failures.slice(0, 120).join("\n"));
  const prior = fresh.get(fixture.orientation);
  if (prior && !same(prior, { evidence, raw })) {
    throw new Error(`${fixture.orientation}: twice-fresh proof diverged`);
  }
  fresh.set(fixture.orientation, { evidence, raw });
  console.log(
    `${fixture.orientation} run ${runNumber}: `
    + `${probe.frames.length}/${PERISH_SONG_FRAME_COUNT} `
    + "source/OAM/VBlank/register/audio/palette/seam/raw-RGB/framebuffer exact",
  );
}

for (const fixturePath of fixturePaths) {
  verify(fixturePath, 1);
  verify(fixturePath, 2);
}
