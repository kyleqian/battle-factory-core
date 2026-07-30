import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

type Fixture = {
  schema: "whirlpool-main-portable-evidence/v1";
  oracleProfile: "battle-scene-on";
  orientation: string;
  scenario: string;
  probe: string;
  sourceWindow: { startFrame: number; endFrame: number; frameCount: 133 };
  evidenceSha256: string;
  rawRgbSha256: string;
  targetSide: "player" | "opponent";
};
type Sprite = {
  slot: number; template: { symbol: string | null }; callback: { symbol: string | null };
  attr: number[]; x: number; y: number; x2: number; y2: number; data: number[];
  matrix: number[];
};
type Frame = {
  frame: number; sha256: string; gAnimScriptActive: number; scriptOffset: number | null;
  visualTaskCount: number; soundTaskCount: number; sprites: Sprite[];
  tasks: { func: { symbol: string | null }; data: number[] }[];
  paletteTags: number[]; tileTags: number[]; registers: Record<string, number>;
  softwareOam: string[]; hardwareOam: string[]; fadedPalette: number[];
  hardwarePalette: number[]; battlers: unknown; engine: { currentMove: number };
  se1: { songHeader: number; tracks: { flags: number; panX: number }[] };
};
type Probe = {
  schema: string; sourceWindow: Fixture["sourceWindow"];
  lifecycleCounts: { whirlpoolOrb: number };
  templates: { gWhirlpoolSpriteTemplate: number };
  songHeaders: { SE_M_WHIRLPOOL: number };
  topology: { callbacks: string[]; tasks: string[] };
  frames: Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error("usage: whirlpoolPortableEvidence.ts <player> <opponent>");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fresh = new Map<string, { evidence: string; raw: string }>();
const burst = [
  [50, 384, 8, 50], [40, 240, 11, -46], [40, 416, 4, 42],
  [45, 288, 6, -42], [45, 448, 11, 46], [50, 464, 10, -50],
] as const;

function verify(path: string, pass: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = mkdtempSync(join(tmpdir(), "pokebench-whirlpool-main-"));
  const output = join(scratch, "probe.json");
  const rgb = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const proc = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgb], { cwd: root, encoding: "utf8" });
  if (proc.stdout) process.stdout.write(proc.stdout);
  if (proc.stderr) process.stderr.write(proc.stderr);
  if (proc.status !== 0) process.exit(proc.status ?? 1);
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidence = createHash("sha256").update(bytes).digest("hex");
  const rawHash = createHash("sha256");
  const problems: string[] = [];
  for (const frame of probe.frames) {
    const raw = readFileSync(join(rgb, `${String(frame.frame).padStart(5, "0")}.rgb`));
    rawHash.update(raw);
    if (createHash("sha256").update(raw).digest("hex") !== frame.sha256) problems.push(`raw ${frame.frame}`);
  }
  const raw = rawHash.digest("hex");
  if (fixture.schema !== "whirlpool-main-portable-evidence/v1" || fixture.oracleProfile !== "battle-scene-on"
    || probe.schema !== "whirlpool-main-dense-evidence/v1" || !same(fixture.sourceWindow, probe.sourceWindow)
    || evidence !== fixture.evidenceSha256 || raw !== fixture.rawRgbSha256
    || probe.lifecycleCounts.whirlpoolOrb !== 18
    || !probe.topology.callbacks.includes("AnimParticleInVortex_Step")
    || !probe.topology.tasks.includes("AnimTask_ShakeMon_Step")) problems.push("receipt/topology");
  const previous = fresh.get(fixture.orientation);
  if (previous && !same(previous, { evidence, raw })) problems.push("fresh reproducibility");
  fresh.set(fixture.orientation, { evidence, raw });

  const first = probe.frames[0]!;
  const live = new Map<number, { start: number; params: readonly number[]; x: number; y: number }>();
  const starts: number[][] = [];
  let semantic = 0;
  for (const frame of probe.frames) {
    const failCount = problems.length;
    const vortexes = frame.sprites.filter((sprite) => sprite.template.symbol === "gWhirlpoolSpriteTemplate");
    const now = new Set(vortexes.map((sprite) => sprite.slot));
    for (const sprite of vortexes) if (!live.has(sprite.slot)) {
      const params = [sprite.data[0]! + 1, sprite.data[1]!, sprite.data[2]!, sprite.data[3]!];
      starts.push(params); live.set(sprite.slot, { start: frame.frame, params, x: sprite.x, y: sprite.y });
      const wanted = burst[(starts.length - 1) % burst.length]!;
      if (!same(params, wanted) || sprite.matrix[0] !== 337 || sprite.matrix[3] !== 346) problems.push(`start ${starts.length}`);
    }
    for (const [slot] of live) if (!now.has(slot)) live.delete(slot);
    for (const sprite of vortexes) {
      const life = live.get(sprite.slot)!;
      const elapsed = frame.frame - life.start + 1;
      const [duration, speed, phase, amplitude] = life.params;
      if (sprite.callback.symbol !== "AnimParticleInVortex_Step" || sprite.x !== life.x || sprite.y !== life.y
        || sprite.data[0] !== duration - elapsed || sprite.data[1] !== speed || sprite.data[2] !== phase
        || sprite.data[3] !== amplitude || sprite.data[4] !== speed * elapsed
        || sprite.data[5] !== ((phase * elapsed) & 255) || sprite.y2 !== -(sprite.data[4]! >> 8)
        || (sprite.attr[0]! & 0x500) !== 0x500
        || (sprite.attr[2]! & 0xfc00) !== 0x7800 || sprite.matrix[1] !== 0 || sprite.matrix[2] !== 0) problems.push(`vortex ${frame.frame}/${sprite.slot}`);
    }
    const paletteBlend = frame.sprites.some((sprite) =>
      sprite.template.symbol === "gSimplePaletteBlendSpriteTemplate"
      && sprite.callback.symbol === "AnimSimplePaletteBlend_Step");
    const paletteWindow = (frame.frame >= first.frame + 9 && frame.frame < first.frame + 31)
      || (frame.frame >= first.frame + 95 && frame.frame < first.frame + 117);
    if (paletteBlend !== paletteWindow) {
      problems.push(`target palette blend ${frame.frame}`);
    }
    const shaking = frame.tasks.some((task) => task.func.symbol === "AnimTask_ShakeMon_Step");
    if (shaking !== (frame.frame >= first.frame + 9 && frame.frame < first.frame + 107)) problems.push(`target shake ${frame.frame}`);
    const loaded = frame.frame > first.frame && frame.frame < fixture.sourceWindow.endFrame;
    const alpha = frame.frame >= first.frame + 7;
    if (frame.paletteTags.includes(10149) !== loaded || frame.tileTags.includes(10149) !== loaded
      || frame.registers.bldcnt !== (alpha ? 16192 : 0)
      || frame.registers.bldalpha !== (alpha ? 2060 : 0)) problems.push(`tag/alpha ${frame.frame}`);
    if (frame.frame === first.frame + 9) {
      const audible = frame.se1.tracks.some((track) => (track.flags & 0x80) !== 0
        && track.panX === (fixture.targetSide === "player" ? -63 : 63));
      if (frame.se1.songHeader !== probe.songHeaders.SE_M_WHIRLPOOL || !audible) problems.push("target pan audio");
    }
    const prior = probe.frames.find((row) => row.frame === frame.frame - 1);
    if (prior && !same(frame.hardwareOam, prior.softwareOam)
      && !same(frame.hardwareOam, frame.softwareOam)) problems.push(`OAM latch ${frame.frame}`);
    if (!same(frame.battlers, first.battlers) || frame.engine.currentMove !== 250) problems.push(`gameplay ${frame.frame}`);
    if (frame.frame === fixture.sourceWindow.endFrame
      && (frame.gAnimScriptActive || frame.visualTaskCount || vortexes.length || frame.paletteTags.includes(10149))) problems.push("first inactive cleanup");
    if (problems.length === failCount) semantic += 1;
  }
  if (starts.length !== 18 || !same(starts, Array.from({ length: 3 }, () => burst).flat())) problems.push("18 source lifecycles");
  console.log(`${fixture.orientation} run ${pass}: ${semantic}/133 main-body checks; evidence/raw-RGB ${evidence}/${raw}`);
  if (problems.length) throw new Error(problems.slice(0, 30).join("\n"));
}

for (let pass = 1; pass <= 2; pass += 1) for (const path of paths) verify(path, pass);
