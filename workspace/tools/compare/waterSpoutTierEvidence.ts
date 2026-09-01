/** Dense legal lower-HP evidence and production verifier for MOVE_WATER_SPOUT. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { waterSpoutPowerTier } from "../../src/animation/waterSpout.ts";
import { createScratchDir } from "../lib/scratch.ts";
import type { WaterSpoutOrientation } from "./waterSpoutFramebuffer.ts";

type Json = Record<string, any>;
type Tier = 0 | 1 | 2;
const root = resolve(import.meta.dirname, "../..");
const fixturePath = resolve(root, "tools/compare/fixtures/water-spout-lower-tiers.json");
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const sides = [
  { orientation: "player-back" as const, key: "player", scenario: "tools/battle-lab/mechanic-water-spout-tiers-player-wailmer-opponent-shuckle-toxic.json" },
  { orientation: "opponent-front" as const, key: "opponent", scenario: "tools/battle-lab/mechanic-water-spout-tiers-opponent-wailmer-player-shuckle-toxic.json" },
] as const;
const expectedRows = {
  "player-back": { 2: 229, 1: 204, 0: 204 },
  "opponent-front": { 2: 230, 1: 206, 0: 201 },
} as const;
const expectedHp = { 2: 89, 1: 57, 0: 17 } as const;
const expectedLaunch = { 2: 10, 1: 7, 0: 5 } as const;

function tierBodies(probe: Json, orientation: WaterSpoutOrientation): Record<Tier, Json[]> {
  invariant(probe.schema === "water-spout-dense-evidence/v1" && probe.profile === "battle-scene-on" && probe.move === 323, `${orientation}: identity`);
  invariant(probe.bodyWindows.length === 6, `${orientation}: six legal Water Spout bodies`);
  const result = {} as Record<Tier, Json[]>;
  for (const [index, tier] of ([2, 1, 0] as const).entries()) {
    const window = probe.bodyWindows[index + 3]!;
    const rows = probe.frames.filter((row: Json) => row.frame >= window.startFrame && row.frame <= window.endFrame);
    const attacker = orientation === "player-back" ? "player" : "opponent";
    invariant(rows.length === expectedRows[orientation][tier] && rows[0]!.scriptOffset === 0 && rows[0]!.animScriptActive
      && rows.at(-1)!.scriptOffset === 45 && !rows.at(-1)!.animScriptActive, `${orientation} tier ${tier}: complete dense cleanup`);
    invariant(rows[0]!.battlers[attacker].hp === expectedHp[tier] && rows[0]!.battlers[attacker].maxHp === 137
      && waterSpoutPowerTier(expectedHp[tier], 137) === tier, `${orientation} tier ${tier}: legal HP band`);
    invariant(rows.every((row: Json, age: number) => row.frame === window.startFrame + age && row.scriptOwner === "Move_WATER_SPOUT"
      && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32
      && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512), `${orientation} tier ${tier}: dense shape`);
    const launch = rows[55]!.sprites.filter((sprite: Json) => sprite.template?.symbol === "gSmallWaterOrbSpriteTemplate");
    invariant(launch.length === expectedLaunch[tier] && rows.at(-1)!.visualTaskCount === 0 && rows.at(-1)!.soundTaskCount === 0,
      `${orientation} tier ${tier}: allocation/cleanup`);
    result[tier] = rows;
  }
  return result;
}

function selectedRgbHash(rgbDir: string, tiers: Record<Tier, Json[]>): string {
  return sha(Buffer.concat(([2, 1, 0] as const).flatMap((tier) => tiers[tier].map((row) =>
    readFileSync(resolve(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`))))));
}

function bankSide(side: typeof sides[number], firstJson: string, firstRgb: string, repeatJson: string, repeatRgb: string): Json {
  const first = readFileSync(firstJson), repeat = readFileSync(repeatJson);
  invariant(first.equals(repeat), `${side.orientation}: repeated dense probe differs`);
  const probe = JSON.parse(first.toString()) as Json;
  const tiers = tierBodies(probe, side.orientation);
  const firstRgbHash = selectedRgbHash(firstRgb, tiers), repeatRgbHash = selectedRgbHash(repeatRgb, tiers);
  invariant(firstRgbHash === repeatRgbHash, `${side.orientation}: repeated lower-tier RGB differs`);
  const densePath = `tools/compare/evidence/water-spout-lower-${side.key}-dense-state.json.gz`;
  const rgbPath = `tools/compare/evidence/water-spout-lower-${side.key}-raw-rgb.tar.gz`;
  const dense = Buffer.from(`${JSON.stringify({ schema: "water-spout-lower-tier-state/v1", orientation: side.orientation, tiers })}\n`);
  writeFileSync(resolve(root, densePath), gzipSync(dense));
  const scratch = createScratchDir(`water-spout-lower-${side.key}-`);
  for (const tier of [2, 1, 0] as const) for (const row of tiers[tier]) {
    const name = `${String(row.frame).padStart(5, "0")}.rgb`;
    copyFileSync(resolve(firstRgb, name), resolve(scratch, name));
  }
  execFileSync("tar", ["-czf", resolve(root, rgbPath), "-C", scratch, "."]);
  return {
    scenario: side.scenario, scenarioSha256: sha(readFileSync(resolve(root, side.scenario))),
    denseState: densePath, denseStateSha256: sha(readFileSync(resolve(root, densePath))),
    probeJsonSha256: sha(first), repeatProbeJsonSha256: sha(repeat),
    rawRgbArchive: rgbPath, rawRgbArchiveSha256: sha(readFileSync(resolve(root, rgbPath))),
    rawRgbSequenceSha256: firstRgbHash, repeatRawRgbSequenceSha256: repeatRgbHash,
    rows: Object.fromEntries(([2, 1, 0] as const).map((tier) => [tier, tiers[tier].length])),
  };
}

function bank(args: string[]): void {
  invariant(args.length === 8, "usage: waterSpoutTierEvidence.ts --bank <player-json> <player-rgb> <player-repeat-json> <player-repeat-rgb> <opponent-json> <opponent-rgb> <opponent-repeat-json> <opponent-repeat-rgb>");
  mkdirSync(resolve(root, "tools/compare/evidence"), { recursive: true });
  const output = {
    schema: "water-spout-lower-tier-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_WATER_SPOUT",
    legalStaging: "Shuckle uses TM06 Toxic; escalating stock-ROM toxic damage leaves HP-invested Wailmer at 89/137, 57/137, and 17/137 before successive Water Spouts.",
    freshRunsPerOrientation: 2, tiers: [2, 1, 0],
    source: { probe: "tools/compare/waterSpoutProbe.py", repeatedBodyProbe: "tools/compare/sweetScentProbe.py" },
    orientations: {
      "player-back": bankSide(sides[0], ...args.slice(0, 4) as [string, string, string, string]),
      "opponent-front": bankSide(sides[1], ...args.slice(4, 8) as [string, string, string, string]),
    },
  };
  writeFileSync(fixturePath, `${JSON.stringify(output, null, 2)}\n`);
}

export function readWaterSpoutTierRows(orientation: WaterSpoutOrientation): Record<Tier, Json[]> {
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
  const item = fixture.orientations[orientation];
  const state = JSON.parse(gunzipSync(readFileSync(resolve(root, item.denseState))).toString()) as Json;
  return state.tiers;
}

export function verifyWaterSpoutTierEvidence(): Json[] {
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Json;
  invariant(fixture.schema === "water-spout-lower-tier-evidence/v1" && fixture.freshRunsPerOrientation === 2, "lower-tier fixture identity");
  return sides.map((side) => {
    const item = fixture.orientations[side.orientation];
    for (const [path, expected] of [[item.scenario, item.scenarioSha256], [item.denseState, item.denseStateSha256], [item.rawRgbArchive, item.rawRgbArchiveSha256]] as const)
      invariant(sha(readFileSync(resolve(root, path))) === expected, `${side.orientation}: ${path} drift`);
    invariant(item.probeJsonSha256 === item.repeatProbeJsonSha256 && item.rawRgbSequenceSha256 === item.repeatRawRgbSequenceSha256,
      `${side.orientation}: twice-fresh drift`);
    const tiers = readWaterSpoutTierRows(side.orientation);
    const scratch = createScratchDir(`water-spout-lower-verify-${side.key}-`);
    execFileSync("tar", ["-xzf", resolve(root, item.rawRgbArchive), "-C", scratch]);
    invariant(selectedRgbHash(scratch, tiers) === item.rawRgbSequenceSha256, `${side.orientation}: RGB archive drift`);
    return { orientation: side.orientation, rows: Object.fromEntries(([2, 1, 0] as const).map((tier) => [tier, tiers[tier].length])),
      rawRgb: item.rawRgbSequenceSha256, twiceFresh: true };
  });
}

const at = process.argv.indexOf("--bank");
if (at >= 0) bank(process.argv.slice(at + 1));
else if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyWaterSpoutTierEvidence(), null, 2));
