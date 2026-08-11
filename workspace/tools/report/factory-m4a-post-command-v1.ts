import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type CaseName = "anchor" | "liliana" | "factory-varied";
const CASES: readonly CaseName[] = ["anchor", "liliana", "factory-varied"];
const COUNTS: Record<CaseName, number> = { anchor: 52, liliana: 31, "factory-varied": 30 };
const HASHES: Record<CaseName, string> = {
  anchor: "8ff491a1c076c5140ccc82a3b089231d5da6fb22bf99f7d4c33c1e5e4aaaddf5",
  liliana: "d3d29caaad1be443d065ae5d2de0ca1e74b788face5b656515c8324a592ddfea",
  "factory-varied": "ab887a51371889ad28149cb19088f11d18cefb59131ba8e993820b1b86b0ae6a",
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURES = join(ROOT, "tests/fixtures/factory-m4a-post-command-v1");
const EXECUTION = join(ROOT, "tests/fixtures/factory-m4a-mplay-execution-evidence-v1.json");
const OUTPUT = join(ROOT, "tests/fixtures/factory-m4a-post-command-evidence-v1.json");
const DOC = join(ROOT, "docs/issue55-m4a-post-command-v1.md");

type Track = { trackIndex: number; flags: number; channels: Array<{ role: string; statusFlags: number; type: number; key: number }> };
type Observation = {
  sourceStateDigest: string;
  postCommand: { revision: string; playerRole: string; boundary: string; tracks: Track[] };
};
type Packet = { schema: string; case: CaseName; oracleProfile: string; captureBoundary: string; observations: Observation[] };
type ExecutionRow = {
  sourceStateDigest: string;
  selector: { passCount: number };
  sourceCost: { exact: { sourceCycles: number } | null };
  oracleReference: { observedSixthMPlayCycles: number };
};
type ExecutionEvidence = { schema: string; rows: ExecutionRow[] };

function fail(message: string): never {
  throw new Error(`factory-m4a-post-command-v1: ${message}`);
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function loadPacket(name: CaseName): Packet {
  const bytes = readFileSync(join(FIXTURES, `${name}.json`));
  if (sha256(bytes) !== HASHES[name]) fail(`${name} fixture hash changed`);
  const packet = JSON.parse(bytes.toString("utf8")) as Packet;
  if (packet.schema !== "factory-m4a-post-command-probe/v1" || packet.case !== name || packet.oracleProfile !== "battle-scene-off") fail(`${name} identity changed`);
  if (packet.captureBoundary !== "sixth-MPlayMain-post-command-volume-pitch-loop" || packet.observations.length !== COUNTS[name]) fail(`${name} boundary/count changed`);
  return packet;
}

function loadExecution(): ExecutionEvidence {
  const execution = JSON.parse(readFileSync(EXECUTION, "utf8")) as ExecutionEvidence;
  if (execution.schema !== "factory-m4a-mplay-execution-evidence/v1" || execution.rows.length !== 113) fail("execution evidence identity changed");
  return execution;
}

export function makeEvidence(): Record<string, unknown> {
  const execution = loadExecution();
  const executionByDigest = new Map(execution.rows.map((row) => [row.sourceStateDigest, row]));
  const rows: Array<Record<string, unknown>> = [];
  const byCase: Record<string, { observations: number; onePass: number; zeroPass: number; postCommandWork: number }> = {};
  for (const packet of CASES.map(loadPacket)) {
    const summary = { observations: packet.observations.length, onePass: 0, zeroPass: 0, postCommandWork: 0 };
    for (const observation of packet.observations) {
      const executionRow = executionByDigest.get(observation.sourceStateDigest);
      if (!executionRow) fail(`${packet.case} row does not join execution evidence`);
      const post = observation.postCommand;
      if (post.revision !== "factory-m4a-post-command/v1" || post.playerRole !== "music-player-5" || post.boundary !== "MPlayMain._081DD9C4") fail(`${packet.case} post-command identity changed`);
      if (post.tracks.length !== 10 || post.tracks.some((track, index) => track.trackIndex !== index)) fail(`${packet.case} track shape changed`);
      const workTracks = post.tracks.filter((track) => (track.flags & 0x8f) === 0x80 && (track.flags & 0x0f) !== 0);
      const invalidTracks = post.tracks.filter((track) => (track.flags & 0x80) !== 0 && (track.flags & 0x0f) === 0 && track.channels.some((channel) => channel.role === "unmapped-channel"));
      if (invalidTracks.length !== 0) fail(`${packet.case} retained an unmapped channel`);
      const expectedFlags = [128, 128, 128, 128, 128, 128, 128, 128, 128, 0];
      if (post.tracks.some((track, index) => track.flags !== expectedFlags[index])) fail(`${packet.case} observed a new post-command flag route`);
      if (workTracks.length !== 0) fail(`${packet.case} unexpectedly enters post-command volume/pitch work`);
      summary[executionRow.selector.passCount === 1 ? "onePass" : "zeroPass"] += 1;
      summary.postCommandWork += workTracks.length > 0 ? 1 : 0;
      rows.push({
        sourceStateDigest: observation.sourceStateDigest,
        case: packet.case,
        passCount: executionRow.selector.passCount,
        trackFlags: post.tracks.map((track) => track.flags),
        channelCounts: post.tracks.map((track) => track.channels.length),
        selectedPostCommandWorkTracks: [],
        postCommandRoute: "scan-only-no-TrkVolPitSet-no-channel-traversal",
        completeSourceCost: executionRow.sourceCost.exact?.sourceCycles ?? null,
        oracleReferenceCycles: executionRow.oracleReference.observedSixthMPlayCycles,
      });
    }
    byCase[packet.case] = summary;
  }
  if (rows.length !== 113 || new Set(rows.map((row) => row.sourceStateDigest)).size !== 113) fail("expected 113 unique joined rows");
  const onePass = rows.filter((row) => row.passCount === 1);
  const zeroPass = rows.filter((row) => row.passCount === 0);
  if (onePass.length !== 108 || zeroPass.length !== 5) fail("selector partition changed");
  return {
    schema: "factory-m4a-post-command-evidence/v1",
    oracleProfile: "battle-scene-off",
    source: {
      boundary: "reference/pokeemerald/src/m4a_1.s:_081DD9C4",
      selector: "(Track.flags & MPT_FLG_EXIST) && (Track.flags & (MPT_FLG_VOLCHG | MPT_FLG_PITCHG))",
      selectedPath: "no rows select TrkVolPitSet or the following channel-chain loop",
      constants: { MPT_FLG_EXIST: 128, MPT_FLG_VOLCHG: 3, MPT_FLG_PITCHG: 12 },
    },
    frozenInputs: { postCommandPackets: HASHES, executionEvidence: "tests/fixtures/factory-m4a-mplay-execution-evidence-v1.json" },
    join: { key: "sourceStateDigest", rows: 113, onePassRows: 108, zeroPassRows: 5, ambiguousRows: 0, addressFree: true },
    coverage: {
      byCase,
      postCommandStateClosedRows: 113,
      onePassPostCommandStateClosedRows: 108,
      selectedWorkRows: 0,
      exactCompleteSourceCostRows: 5,
      nullCompleteSourceCostRows: 108,
    },
    rows,
    closure: {
      closed: "The mutable post-command Track.flags/chan discriminator is complete for 113/113 rows. All nine live tracks carry EXIST only and the tenth is inactive, so the volume/pitch worker and its channel chain are unreachable in every observed call.",
      remaining: "The 108 one-pass complete costs remain null. The next discriminator is the earlier tempo-pass track/command execution cost, including wait/LFO/channel-gate paths and command callbacks; this checkpoint does not price that work from observed durations.",
      durationFit: false,
      serviceCost: null,
      constructionClock: null,
    },
    verdict: "113/113 post-command state rows close source-generally, including all 108 one-pass calls; complete one-pass MPlayMain costs remain null at the earlier command/track execution frontier.",
  };
}

function markdown(evidence: ReturnType<typeof makeEvidence>): string {
  const coverage = evidence.coverage as { onePassPostCommandStateClosedRows: number; exactCompleteSourceCostRows: number; nullCompleteSourceCostRows: number };
  return `# Issue #55 — sixth-player post-command state v1\n\nGenerated by \`node --experimental-strip-types tools/report/factory-m4a-post-command-v1.ts\`; do not hand-edit.\n\nThe additive Battle Scene OFF packets join **113/113** frozen source-state rows without ambiguity. They capture the sixth player's mutable track flags and address-free channel roles at compiled \`MPlayMain._081DD9C4\`, after the one permitted tempo command pass and before the volume/pitch scan. Two fresh serial runs per anchor, LILIANA, and legal-varied case were byte-identical.\n\nAll rows have the same source-relevant flag vector: nine \`MPT_FLG_EXIST\`-only tracks (\`0x80\`) followed by one inactive track. Therefore **${coverage.onePassPostCommandStateClosedRows}/108** one-pass rows and all five zero-pass rows skip \`TrkVolPitSet\` and the channel-chain worker. The previously missing post-command \`Track.flags\`/\`chan\` discriminator is closed.\n\nComplete source costs remain **${coverage.exactCompleteSourceCostRows} exact / ${coverage.nullCompleteSourceCostRows} null**. The remaining one-pass frontier is earlier: source timing for the tempo-pass track loop, including channel gate/clear paths, wait/LFO paths, and bounded command callbacks. No observed duration, service cost, or construction-clock value is inferred.\n`;
}

function outputs(): { json: string; doc: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { json: OUTPUT, doc: DOC };
  if (args.length === 2 && args[0] === "--out-dir") return { json: join(resolve(args[1]!), "factory-m4a-post-command-evidence-v1.json"), doc: join(resolve(args[1]!), "issue55-m4a-post-command-v1.md") };
  fail("usage: factory-m4a-post-command-v1.ts [--out-dir PATH]");
}

export function main(): void {
  const evidence = makeEvidence();
  const output = outputs();
  mkdirSync(dirname(output.json), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  writeFileSync(output.json, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
  process.stdout.write(`wrote ${output.json}\nwrote ${output.doc}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
