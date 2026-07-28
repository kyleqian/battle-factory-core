import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const requiredTemplates = [
  "gComplexPaletteBlendSpriteTemplate",
  "gReversalOrbSpriteTemplate",
  "gHorizontalLungeSpriteTemplate",
  "gFistFootSpriteTemplate",
  "gBasicHitSplatSpriteTemplate",
];
const requiredCallbacks = [
  "AnimComplexPaletteBlend_Step1",
  "AnimComplexPaletteBlend_Step2",
  "AnimReversalOrb_Step",
];
const requiredTasks = [
  "AnimTask_BlendColorCycleLoop",
  "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step",
];
const gpuRegisters = [
  "dispcnt",
  "bg0cnt", "bg1cnt", "bg2cnt", "bg3cnt",
  "bg0hofs", "bg0vofs", "bg1hofs", "bg1vofs",
  "bg2hofs", "bg2vofs", "bg3hofs", "bg3vofs",
  "bg2pa", "bg2pb", "bg2pc", "bg2pd",
  "bg3pa", "bg3pb", "bg3pc", "bg3pd",
  "winin", "winout", "mosaic", "bldcnt", "bldalpha", "bldy",
];

for (let pass = 0; pass < 2; pass += 1) {
  for (const path of process.argv.slice(2)) {
    const fixture = JSON.parse(readFileSync(resolve(path), "utf8"));
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-reversal-"));
    const output = join(scratch, "probe.json");
    const rgb = join(scratch, "rgb");
    const vendor = dirname(
      realpathSync(join(root, "reference/pokeemerald")),
    );
    const run = spawnSync(
      "python3",
      [
        join(root, "tools/run-mgba-probe.py"),
        output,
        "--",
        join(vendor, "mgba-venv/bin/python"),
        join(root, fixture.probe),
        join(root, fixture.scenario),
        output,
        rgb,
      ],
      { cwd: root, encoding: "utf8" },
    );
    if (run.status) throw new Error(run.stderr || run.stdout);

    const bytes = readFileSync(output);
    const evidence = JSON.parse(bytes.toString());
    const raw = createHash("sha256");
    for (const row of evidence.frames) {
      raw.update(
        readFileSync(
          join(rgb, `${String(row.frame).padStart(5, "0")}.rgb`),
        ),
      );
    }
    const evidenceDigest = createHash("sha256").update(bytes).digest("hex");
    const rawDigest = raw.digest("hex");
    const sourceFrames = evidence.frames.filter(
      (row: { frame: number }) =>
        row.frame >= fixture.sourceWindow.startFrame
        && row.frame <= fixture.sourceWindow.endFrame,
    );
    const last = evidence.frames.at(-1);
    if (
      evidence.schema !== "reversal-dense-evidence/v2"
      || JSON.stringify(evidence.captureWindow)
        !== JSON.stringify(fixture.captureWindow)
      || JSON.stringify(evidence.sourceWindow)
        !== JSON.stringify(fixture.sourceWindow)
      || evidence.frames.length !== fixture.captureWindow.frameCount
      || sourceFrames.length !== 174
      || sourceFrames[0].scriptOffset !== 0
      || last.gAnimScriptActive !== 0
      || last.visualTaskCount !== 0
      || last.soundTaskCount !== 0
      || evidenceDigest !== fixture.evidenceSha256
      || rawDigest !== fixture.rawRgbSha256
    ) {
      throw new Error(
        `${fixture.orientation}: incomplete receipt `
        + `${evidenceDigest} ${rawDigest}`,
      );
    }
    for (const row of evidence.frames) {
      if (
        row.currentMove !== 179
        || row.softwareOam.length !== 128
        || row.hardwareOam.length !== 128
        || row.hardwareMatrices.length !== 32
        || row.fadedPalette.length !== 512
        || row.unfadedPalette.length !== 512
        || row.hardwarePalette.length !== 512
        || row.paletteTags.length !== 16
        || row.se1.tracks.length !== 3
        || row.se2.tracks.length !== 3
        || JSON.stringify(Object.keys(row.registers))
          !== JSON.stringify(gpuRegisters)
        || row.tasks.some((task: { raw: string }) => task.raw.length !== 80)
        || row.sprites.some((sprite: { raw: string }) =>
          sprite.raw.length !== 136
        )
      ) {
        throw new Error(
          `${fixture.orientation}: missing software/hardware receipt`,
        );
      }
    }
    for (const name of requiredTemplates) {
      if (!evidence.topology.templates.includes(name))
        throw new Error(`${fixture.orientation}: missing ${name}`);
    }
    for (const name of requiredCallbacks) {
      if (!evidence.topology.callbacks.includes(name))
        throw new Error(`${fixture.orientation}: missing ${name}`);
    }
    for (const name of requiredTasks) {
      if (!evidence.topology.tasks.includes(name))
        throw new Error(`${fixture.orientation}: missing ${name}`);
    }
    if (
      evidence.lifecycleCounts.complexPaletteBlend !== 2
      || evidence.lifecycleCounts.reversalOrb !== 6
    ) {
      throw new Error(`${fixture.orientation}: incomplete lifecycle counts`);
    }
    const paletteTags = new Set(
      evidence.frames.flatMap(
        (row: { paletteTags: number[] }) => row.paletteTags,
      ),
    );
    for (const tag of [10135, 10143, 10236]) {
      if (!paletteTags.has(tag))
        throw new Error(`${fixture.orientation}: missing palette tag ${tag}`);
    }
    const songs = new Set(
      evidence.frames.flatMap(
        (row: { se1: { songHeader: number }; se2: { songHeader: number } }) =>
          [row.se1.songHeader, row.se2.songHeader],
      ),
    );
    for (const [name, address] of Object.entries(evidence.songHeaders)) {
      if (!songs.has(address))
        throw new Error(`${fixture.orientation}: missing ${name}`);
    }
    console.log(
      `${fixture.orientation} pass ${pass + 1}: `
      + `${evidenceDigest} ${rawDigest}`,
    );
  }
}
