import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

type Distribution = {
  count: number;
  min: number;
  max: number;
  distinct: number;
  histogram: Array<{ value: number; count: number }>;
};

type Stage = { kind: string; cyclesSinceM4aEntry: number };

type SemanticState = {
  revision: string;
  stateDigest: string;
  soundInfo: {
    scalarBytes: number[];
    pcmBuffer: { requestedBytes: number; capturedBytes: number; complete: boolean; sha256: string | null };
  };
  musicPlayers: Array<{
    scalarBytes: number[];
    trackCount: number;
    tracks: Array<{
      scalarBytes: number[];
      tailBytes: number[];
      commandRegion: { requestedBytes: number; capturedBytes: number; complete: boolean; sha256: string | null };
      patternRegions: Array<{ requestedBytes: number; capturedBytes: number; complete: boolean; sha256: string | null }>;
    }>;
  }>;
  directChannels: Array<{
    scalarBytes: number[];
    wave: { sampleRegion: { complete: boolean; requestedBytes: number; capturedBytes: number; sha256: string | null } } | null;
  }>;
  cgbChannels: Array<{
    scalarBytes: number[];
    waveWords: { complete: boolean; requestedBytes: number; capturedBytes: number; sha256: string | null };
    currentWaveWords: { complete: boolean; requestedBytes: number; capturedBytes: number; sha256: string | null };
  }>;
  dispatchTables: {
    clockValues: { complete: boolean; requestedBytes: number; capturedBytes: number; sha256: string | null };
    cgb3VolumeValues: { complete: boolean; requestedBytes: number; capturedBytes: number; sha256: string | null };
    mplayJumpTargets: Array<string | null>;
    xcmdTargets: Array<string | null>;
  };
  audioIo: { vcount: number; soundRegisters: number[] };
  coverage: {
    complete: boolean;
    fixedRegions: string[];
    residualDereferences: Array<Record<string, string>>;
  };
};

type Receipt = {
  schema: string;
  case: string;
  oracleProfile: string;
  sourceFunction: string;
  commandWindowBytes: number;
  patternWindowBytes: number;
  toneTableWindowBytes: number;
  interrupts: Array<{
    m4a: {
      state: { sourceSemanticState: SemanticState };
      stages: Stage[];
    };
  }>;
};

type Reproducibility = {
  schema: string;
  oracleProfile: string;
  freshRunsPerCase: number;
  cases: Array<{
    case: string;
    firstFreshSha256: string;
    secondFreshSha256: string;
    byteIdentical: boolean;
  }>;
};

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const INPUT_DIR = join(REPO_ROOT, "tests/fixtures/factory-m4a-source-state-v3");
const REPRO_PATH = join(REPO_ROOT, "tests/fixtures/factory-m4a-source-state-repro-v1.json");
const DEFAULT_EVIDENCE_PATH = join(REPO_ROOT, "tests/fixtures/factory-m4a-source-state-evidence-v3.json");
const DEFAULT_DOC_PATH = join(REPO_ROOT, "docs/issue55-m4a-source-state-receipt-v3.md");
const CASES = ["anchor", "liliana", "factory-varied"] as const;

const SOURCE_REFERENCES = [
  {
    source: "reference/pokeemerald/src/m4a.c",
    lines: "925-1231,1500-1534",
    anchors: ["void CgbSound(void)", "void ply_xcmd", "gXcmdTable[n]"],
  },
  {
    source: "reference/pokeemerald/src/m4a_1.s",
    lines: "20-445,1130-1466",
    anchors: ["SoundMain:", "SoundMainRAM_ChanLoop:", "MPlayMain:", "call_r3:"],
  },
  {
    source: "reference/pokeemerald/include/gba/m4a_internal.h",
    lines: "39-221,272-350",
    anchors: ["struct WaveData", "struct SoundChannel", "struct MusicPlayerTrack", "struct MusicPlayerInfo"],
  },
  {
    source: "reference/pokeemerald/constants/m4a_constants.inc",
    lines: "54-257",
    anchors: ["o_SoundInfo_pcmBuffer", "o_SoundChannel_wav", "o_MusicPlayerTrack_cmdPtr", "o_CgbChannel_wavePointer"],
  },
  {
    source: "reference/pokeemerald/include/gba/io_reg.h",
    lines: "55-126,234-273",
    anchors: ["REG_OFFSET_NR10", "REG_OFFSET_DMA1SAD", "REG_ADDR_WAVE_RAM0"],
  },
  {
    source: "reference/pokeemerald/pokeemerald.map",
    lines: "sound symbols",
    anchors: ["gMPlayJumpTable", "gCgb3Vol", "gClockTable", "gXcmdTable"],
  },
  {
    source: "reference/pokeemerald/pokeemerald.elf",
    lines: "defined symbols",
    anchors: ["SoundMain", "SoundMainRAM", "MPlayMain", "CgbSound"],
  },
] as const;

function fail(message: string): never {
  throw new Error(`factory-m4a-source-state-v3: ${message}`);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function walkKeys(value: unknown, keys: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => walkKeys(item, keys));
  } else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.push(key);
      walkKeys(child, keys);
    }
  }
  return keys;
}

function distribution(values: number[]): Distribution {
  if (values.length === 0) fail("cannot summarize an empty distribution");
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const histogram = [...counts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([value, count]) => ({ value, count }));
  return {
    count: values.length,
    min: histogram[0]!.value,
    max: histogram.at(-1)!.value,
    distinct: histogram.length,
    histogram,
  };
}

function stagePoints(observation: Receipt["interrupts"][number], kind: string): number[] {
  return observation.m4a.stages.filter((stage) => stage.kind === kind).map((stage) => stage.cyclesSinceM4aEntry);
}

function onlyStage(observation: Receipt["interrupts"][number], kind: string): number {
  const values = stagePoints(observation, kind);
  if (values.length !== 1) fail(`${kind} expected once, got ${values.length}`);
  return values[0]!;
}

function increasing(values: number[], label: string): void {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1]! >= values[index]!) fail(`${label} is not strictly increasing`);
  }
}

function classify(observation: Receipt["interrupts"][number]): {
  m4a: number;
  mplay: number[];
  cgb: number;
  direct: number[];
} {
  const call = onlyStage(observation, "m4a-sound-main-call");
  const soundMain = onlyStage(observation, "sound-main-entry");
  const players = stagePoints(observation, "mplay-main-entry");
  const afterPlayers = onlyStage(observation, "sound-main-after-mplay");
  const cgb = onlyStage(observation, "cgb-sound-entry");
  const afterCgb = onlyStage(observation, "sound-main-after-cgb");
  const ram = onlyStage(observation, "sound-main-ram-entry");
  const channels = stagePoints(observation, "sound-main-ram-channel-pass");
  const epilogue = onlyStage(observation, "sound-main-ram-epilogue");
  const returned = onlyStage(observation, "m4a-sound-main-return");
  increasing([call, soundMain, ...players, afterPlayers, cgb, afterCgb, ram, ...channels, epilogue, returned], "m4a stages");
  if (players.length !== 6) fail(`expected six MPlayMain entries, got ${players.length}`);
  if (channels.length !== 5) fail(`expected five SoundMainRAM channel passes, got ${channels.length}`);
  return {
    m4a: returned - call,
    mplay: players.map((point, index) => (index + 1 < players.length ? players[index + 1]! : afterPlayers) - point),
    cgb: afterCgb - cgb,
    direct: channels.map((point, index) => (index + 1 < channels.length ? channels[index + 1]! : epilogue) - point),
  };
}

function assertSourceAnchors(): void {
  for (const reference of SOURCE_REFERENCES) {
    if (reference.source.endsWith(".elf")) {
      const symbols = execFileSync(
        "arm-none-eabi-nm",
        ["--defined-only", "-n", join(REPO_ROOT, reference.source)],
        { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
      );
      for (const anchor of reference.anchors) {
        if (!symbols.includes(anchor)) fail(`${reference.source} no longer contains ${JSON.stringify(anchor)}`);
      }
    } else {
      const source = readFileSync(join(REPO_ROOT, reference.source), "utf8");
      for (const anchor of reference.anchors) {
        if (!source.includes(anchor)) fail(`${reference.source} no longer contains ${JSON.stringify(anchor)}`);
      }
    }
  }
}

function loadReceipts(): Receipt[] {
  return CASES.map((name) => {
    const receipt = readJson<Receipt>(join(INPUT_DIR, `${name}.json`));
    if (receipt.schema !== "factory-m4a-source-state-probe/v3") fail(`${name} has wrong schema`);
    if (receipt.case !== name) fail(`${name} is mislabeled as ${receipt.case}`);
    if (receipt.oracleProfile !== "battle-scene-off") fail(`${name} is not Scene-OFF evidence`);
    if (receipt.commandWindowBytes !== 256 || receipt.patternWindowBytes !== 128 || receipt.toneTableWindowBytes !== 3072) fail(`${name} has wrong capture widths`);
    if (receipt.interrupts.length === 0) fail(`${name} has no m4a observations`);
    return receipt;
  });
}

function loadReproducibility(receipts: Receipt[]): Reproducibility {
  const repro = readJson<Reproducibility>(REPRO_PATH);
  if (repro.schema !== "factory-m4a-source-state-repro/v1") fail("wrong reproducibility schema");
  if (repro.oracleProfile !== "battle-scene-off" || repro.freshRunsPerCase !== 2) fail("reproducibility is not two fresh Scene-OFF runs");
  if (repro.cases.length !== receipts.length) fail("reproducibility case count mismatch");
  for (const [index, receipt] of receipts.entries()) {
    const proof = repro.cases[index];
    if (!proof || proof.case !== receipt.case) fail(`reproducibility order mismatch for ${receipt.case}`);
    const digest = sha256(readFileSync(join(INPUT_DIR, `${receipt.case}.json`)));
    if (!proof.byteIdentical || proof.firstFreshSha256 !== proof.secondFreshSha256 || proof.firstFreshSha256 !== digest) {
      fail(`${receipt.case} is not pinned as byte-identical fresh evidence`);
    }
  }
  return repro;
}

function validateSemanticState(semantic: SemanticState, label: string): void {
  if (semantic.revision !== "factory-m4a-source-state/v3") fail(`${label} has wrong semantic revision`);
  const digest = semantic.stateDigest;
  const withoutDigest = JSON.parse(JSON.stringify(semantic)) as Record<string, unknown>;
  delete withoutDigest.stateDigest;
  if (sha256(Buffer.from(canonicalJson(withoutDigest))).toString() !== digest) fail(`${label} has an invalid source-state digest`);
  if (semantic.soundInfo.scalarBytes.length !== 0x50) fail(`${label} SoundInfo scalar width changed`);
  if (semantic.soundInfo.pcmBuffer.requestedBytes !== 3168 || !semantic.soundInfo.pcmBuffer.complete) fail(`${label} PCM buffer is not complete`);
  if (semantic.musicPlayers.length !== 6 || semantic.directChannels.length !== 12 || semantic.cgbChannels.length !== 4) fail(`${label} source graph width changed`);
  for (const [index, player] of semantic.musicPlayers.entries()) {
    if (player.scalarBytes.length !== 0x40) fail(`${label} player ${index} scalar width changed`);
    if (player.tracks.length !== player.trackCount) fail(`${label} player ${index} track count mismatch`);
    for (const [trackIndex, track] of player.tracks.entries()) {
      if (track.scalarBytes.length !== 0x20 || track.tailBytes.length !== 0x30) fail(`${label} player ${index} track ${trackIndex} struct coverage changed`);
      if (track.commandRegion.requestedBytes !== 256 || (track.commandRegion.sha256 !== null && !track.commandRegion.complete)) fail(`${label} command window incomplete`);
      if (track.patternRegions.length !== 3 || track.patternRegions.some((region) => region.requestedBytes !== 128 || (region.sha256 !== null && !region.complete))) fail(`${label} pattern window incomplete`);
    }
  }
  for (const [index, channel] of semantic.directChannels.entries()) {
    if (channel.scalarBytes.length !== 0x40) fail(`${label} direct channel ${index} struct coverage changed`);
    if (channel.wave && channel.wave.sampleRegion.sha256 !== null && !channel.wave.sampleRegion.complete) fail(`${label} direct channel ${index} wave coverage incomplete`);
  }
  for (const [index, channel] of semantic.cgbChannels.entries()) {
    if (channel.scalarBytes.length !== 0x40) fail(`${label} CGB channel ${index} struct coverage changed`);
    if ((channel.waveWords.sha256 !== null && !channel.waveWords.complete) || (channel.currentWaveWords.sha256 !== null && !channel.currentWaveWords.complete)) fail(`${label} CGB channel ${index} wave-word coverage incomplete`);
  }
  if (!semantic.dispatchTables.clockValues.complete || !semantic.dispatchTables.cgb3VolumeValues.complete) fail(`${label} static table coverage incomplete`);
  if (semantic.dispatchTables.mplayJumpTargets.length !== 36 || semantic.dispatchTables.xcmdTargets.length !== 14) fail(`${label} dispatch table width changed`);
  if (semantic.audioIo.soundRegisters.length !== 0x40) fail(`${label} audio I/O window width changed`);
  if (semantic.coverage.complete) fail(`${label} incorrectly claims complete transitive coverage`);
  if (semantic.coverage.residualDereferences.length !== 4) fail(`${label} residual list changed without a version change`);
}

function makeEvidence(receipts: Receipt[], reproducibility: Reproducibility): Record<string, unknown> {
  assertSourceAnchors();
  const all = receipts.flatMap((receipt) => receipt.interrupts);
  const rows = receipts.map((receipt) => {
    const classified = receipt.interrupts.map(classify);
    const semantic = receipt.interrupts.map((entry, index) => {
      validateSemanticState(entry.m4a.state.sourceSemanticState, `${receipt.case} observation ${index}`);
      return entry.m4a.state.sourceSemanticState;
    });
    const keys = new Set(semantic.map((state) => state.stateDigest));
    return {
      receipt: receipt.case,
      sourceFunction: receipt.sourceFunction,
      sourceEpochObservationCount: receipt.interrupts.length,
      sourceStateKeysWithinFreshRun: {
        capturedStateKeys: keys.size,
        repeatedCapturedStateKeys: semantic.length - keys.size,
      },
      distributions: {
        m4aSoundMain: distribution(classified.map((row) => row.m4a)),
        mplaySixth: distribution(classified.map((row) => row.mplay[5]!)),
        cgbSound: distribution(classified.map((row) => row.cgb)),
        soundMainRamChannelPasses: distribution(classified.map((row) => row.direct.reduce((sum, value) => sum + value, 0))),
      },
      residualDereferences: semantic[0]!.coverage.residualDereferences,
    };
  });
  const allKeys = all.map((entry) => entry.m4a.state.sourceSemanticState.stateDigest);
  const uniqueKeys = new Set(allKeys);
  const residuals = rows[0]!.residualDereferences;
  if (rows.some((row) => canonicalJson(row.residualDereferences) !== canonicalJson(residuals))) fail("residual dereference inventory differs across cases");
  const forbidden = new Set([
    "entryMasterCycles", "returnMasterCycles", "resumeMasterCycles", "masterCycles", "globalCycles", "cpuCycles", "cyclePhase",
    "sourceEpoch", "frame", "tick", "cursor", "rngValue", "monIndex", "setIds", "trainerId", "pointer", "address",
  ]);
  for (const key of walkKeys(receipts)) if (forbidden.has(key)) fail(`forbidden identity key ${key} entered v3 evidence`);

  const observationCount = all.length;
  return {
    schema: "factory-m4a-source-state-evidence/v3",
    oracleProfile: "battle-scene-off",
    sourceReferences: SOURCE_REFERENCES,
    measurement: {
      unit: "mGBA master cycles relative to m4aSoundMain entry",
      stateSnapshot: "m4aSoundMain call boundary",
      stateKey: "sourceSemanticState.stateDigest",
      method: "Address-free fixed-struct and dereferenced-region packet; blobs are represented by SHA-256 and all pointer targets by roles or symbols.",
    },
    reproducibility,
    sourceClassification: {
      sixthMPlayMain: "Full MusicPlayerInfo/Track scalar regions, channel links, tone table window, command window, pattern windows, and dispatch target symbols are captured; indirect handler transitive reads remain explicitly residual.",
      cgbSound: "All four CgbChannel structs, both wave-word targets, static gCgb3Vol values, dispatch symbols, and the complete audio I/O window are captured.",
      soundMainRam: "All twelve SoundChannel structs, complete readable WaveData samples, the complete PCM buffer, VCOUNT, and DMA source/destination roles are captured.",
      reducer: "Fresh deterministic repeats prove equal captured source keys have equal measured source-stage cycles. No cross-state reducer is licensed while the four residual dereference classes remain.",
    },
    sourceStateEquivalenceAcrossFreshRuns: {
      observationsPerFreshRun: observationCount,
      capturedStateKeys: uniqueKeys.size,
      repeatedEqualStateKeys: observationCount,
      repeatedObservationCount: observationCount * 2,
      repeatedKeysWithDifferentM4aCost: 0,
      proof: "Each committed raw packet is byte-identical to an independently fresh second run; therefore every state key and every measured m4a stage row repeats with equal cycles.",
    },
    sourceStateWithinFreshRuns: {
      capturedStateKeys: uniqueKeys.size,
      repeatedCapturedStateKeys: allKeys.length - uniqueKeys.size,
      interpretation: "The three different staged cases do not repeat a complete captured source key, so only the fresh-run equality implication is established.",
    },
    residualDereferences: residuals,
    cases: rows,
    verdict: "Evidence-only checkpoint: wider source-semantic m4a state keys are reproducible and equal-key fresh repeats have equal measured source cycles; the packet deliberately reports remaining indirect/unbounded reads and implements no timing reducer.",
  };
}

function range(value: Distribution): string {
  return `${value.min}–${value.max} (${value.distinct} distinct)`;
}

function makeMarkdown(evidence: Record<string, unknown>): string {
  const cases = evidence.cases as Array<Record<string, unknown>>;
  const rows = cases.map((entry) => {
    const distributions = entry.distributions as Record<string, Distribution>;
    const state = entry.sourceStateKeysWithinFreshRun as Record<string, number>;
    return `| ${entry.receipt} | ${entry.sourceEpochObservationCount} | ${range(distributions.m4aSoundMain)} | ${range(distributions.mplaySixth)} | ${range(distributions.cgbSound)} | ${range(distributions.soundMainRamChannelPasses)} | ${state.capturedStateKeys} |`;
  });
  const equivalence = evidence.sourceStateEquivalenceAcrossFreshRuns as Record<string, unknown>;
  const residuals = evidence.residualDereferences as Array<Record<string, string>>;
  return [
    "# Issue #55 — m4a source-state equivalence receipt v3",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-source-state-v3.ts`; do not hand-edit.",
    "",
    "This is Battle Scene OFF evidence only. It is a sibling of the v2 internal m4a receipt and does not alter that packet or wire a construction clock.",
    "",
    `Two fresh runs per case are byte-identical. Across ${equivalence.observationsPerFreshRun} observations per run, ${equivalence.repeatedEqualStateKeys} equal source-state keys repeat with ${equivalence.repeatedKeysWithDifferentM4aCost} different m4a costs.`,
    "",
    "## Source-stage observations",
    "",
    "All cycle values are measured mGBA master cycles from the m4aSoundMain call boundary. The sixth player and CgbSound are individual compiled stages; the final column is the sum of five SoundMainRAM channel-pass spans.",
    "",
    "| case | n | m4aSoundMain | sixth MPlayMain | CgbSound | SoundMainRAM channels | fresh-run keys |",
    "| --- | ---: | --- | --- | --- | --- | ---: |",
    ...rows,
    "",
    "## Captured source state",
    "",
    "The key includes complete fixed-size SoundInfo/ MusicPlayerInfo/ MusicPlayerTrack/ SoundChannel/ CgbChannel scalar regions with pointer bytes normalized, all readable WaveData sample regions by digest, the full 3168-byte PCM buffer by digest, command/pattern/tone-table windows, dispatch-table targets, audio I/O registers, VCOUNT, and DMA roles.",
    "",
    "The packet contains no frame, tick, cursor, address, RNG, case-derived timing, or absolute-cycle identity. It is a source-state evidence key, not a lookup table.",
    "",
    "## Remaining dereferences",
    "",
    ...residuals.map((residual) => `- **${residual.stage}** — ${residual.remainder} Captured: ${residual.captured}`),
    "",
    "These residuals keep `coverage.complete` false. The receipt proves only the fresh deterministic implication: equal captured source keys in the two independent runs have equal measured source cycles. A cross-state reducer still requires a source-complete indirect-read contract.",
    "",
  ].join("\n");
}

function outputPaths(): { evidencePath: string; docPath: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { evidencePath: DEFAULT_EVIDENCE_PATH, docPath: DEFAULT_DOC_PATH };
  if (args.length === 2 && args[0] === "--out-dir") {
    const outDir = resolve(args[1]!);
    return {
      evidencePath: join(outDir, "factory-m4a-source-state-evidence-v3.json"),
      docPath: join(outDir, "issue55-m4a-source-state-receipt-v3.md"),
    };
  }
  fail("usage: factory-m4a-source-state-v3.ts [--out-dir PATH]");
}

function main(): void {
  const receipts = loadReceipts();
  const reproducibility = loadReproducibility(receipts);
  const evidence = makeEvidence(receipts, reproducibility);
  const { evidencePath, docPath } = outputPaths();
  mkdirSync(dirname(evidencePath), { recursive: true });
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(docPath, makeMarkdown(evidence));
  process.stdout.write(`wrote ${evidencePath}\nwrote ${docPath}\n`);
}

main();
