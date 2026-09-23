/** Hermetic source/ELF verifier for the direct MOVE_CURSE palette timing receipt. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const reference = resolve(root, "reference/pokeemerald");
const fixture = JSON.parse(readFileSync(resolve(root,
  "tools/compare/fixtures/curse-palette-transfer-timing.json"), "utf8")) as Json;
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`Curse palette timing drift: ${message}`);
}
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;

function elfSymbols(): Map<string, number> {
  const output = execFileSync("arm-none-eabi-nm", ["-a", resolve(reference,
    "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 32 << 20 });
  const symbols = new Map<string, number>();
  for (const line of output.split("\n")) {
    const fields = line.trim().split(/\s+/u);
    if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
      symbols.set(fields[2]!, Number.parseInt(fields[0]!, 16));
    }
  }
  return symbols;
}

export function verifyCursePaletteTiming(): Json {
  invariant(fixture.schema === "curse-palette-transfer-timing/v1"
    && fixture.oracleProfile === "battle-scene-on" && fixture.move === "MOVE_CURSE",
  "fixture identity");
  invariant(Object.values(fixture.guard).every((value) => value === false),
    "pixel/framebuffer guard");
  const source = readFileSync(resolve(reference, "src/palette.c"), "utf8");
  invariant(source.includes("CpuCopy32(gPlttBufferFaded, (void *)PLTT, PLTT_SIZE);"),
    "BeginNormalPaletteFade direct palette copy");
  const ghost = readFileSync(resolve(reference, "src/battle_anim_ghost.c"), "utf8");
  invariant(ghost.includes("BeginNormalPaletteFade(selectedPalettes, 0, 16, 16, RGB_BLACK);")
    && ghost.includes("gTasks[taskId].func = AnimTask_CurseStretchingBlackBg_Step2;"),
  "Curse Step1 fade/Step2 transition");
  const symbols = elfSymbols();
  invariant(hex(symbols.get("BeginNormalPaletteFade")!) === fixture.source.beginNormalPaletteFade,
    "BeginNormalPaletteFade ELF address");
  invariant(hex(symbols.get("CpuSet")!) === fixture.source.cpuSetSwi, "CpuSet ELF address");
  invariant(symbols.has("AnimTask_CurseStretchingBlackBg_Step1")
    && symbols.has("AnimTask_CurseStretchingBlackBg_Step2"), "task ELF symbols");
  const rom = readFileSync(resolve(reference, "pokeemerald.gba"));
  const call = Number.parseInt(fixture.source.cpuSetCall, 16) - 0x08000000;
  const swi = Number.parseInt(fixture.source.cpuSetSwi, 16) - 0x08000000;
  invariant(rom.subarray(call, call + 4).toString("hex") === "45f259fa",
    "BeginNormalPaletteFade BL CpuSet opcode");
  invariant(rom.subarray(swi, swi + 2).toString("hex") === "0bdf", "CpuSet SWI opcode");
  const output: Json = {};
  for (const side of ["player-back", "opponent-front"] as const) {
    const row = fixture.orientations[side];
    invariant(row.freshProcessSha256.length === 2
      && row.freshProcessSha256[0] === row.freshProcessSha256[1], `${side}: twice fresh`);
    invariant(row.inVBlank === false
      && Boolean(Number.parseInt(row.dispstat, 16) & 0x1) === false,
      `${side}: active display`);
    invariant(Boolean(Number.parseInt(row.dispstat, 16) & 0x2) === row.inHBlank,
      `${side}: DISPSTAT HBlank`);
    invariant(row.firstPostTransferScanline === row.vcount + (row.inHBlank ? 1 : 0),
      `${side}: source-timed scanline rule`);
    invariant(row.firstPostTransferScanline >= 0 && row.firstPostTransferScanline < 160,
      `${side}: visible scanline`);
    invariant(readFileSync(resolve(root, row.scenario), "utf8").includes('"profile":"battle-scene-on"'),
      `${side}: legal Scene-ON scenario`);
    output[side] = { vcount: row.vcount, inHBlank: row.inHBlank,
      firstPostTransferScanline: row.firstPostTransferScanline,
      twiceFreshSha256: row.freshProcessSha256[0] };
  }
  return { schema: "curse-palette-transfer-timing-verdict/v1", move: "MOVE_CURSE",
    sourceTimed: true, pixelIndependent: true, orientations: output };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify(verifyCursePaletteTiming(), null, 2));
}
