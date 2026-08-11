#!/usr/bin/env node
/**
 * Issue #55 m4a-internal VBlank workload receipt.
 *
 * This is an evidence generator, not a timing reducer. It consumes the v2
 * opt-in mGBA packets and accounts for m4aSoundMain through stable source
 * routines and loop heads. The v1 outer-VBlank receipt remains untouched.
 *
 * Rerun:
 *   node --experimental-strip-types tools/report/factory-vblank-workload-internal.ts
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Stage = { kind: string; cyclesSinceVBlankEntry: number };
type Observation = {
  m4a: { state: unknown; stages: Stage[] };
  vblankEntryToReturnCycles: number;
  returnToResumeCycles: number;
  resumeFunction: string | null;
};
type Receipt = {
  schema: "factory-vblank-workload-internal-probe/v2";
  case: "anchor" | "liliana" | "factory-varied";
  oracleProfile: string;
  sourceFunction: string;
  m4aInputPrefixBytes: number;
  interrupts: Observation[];
};
type Distribution = {
  count: number;
  min: number;
  max: number;
  distinct: number;
  histogram: Array<{ value: number; count: number }>;
};
type SourceReference = { source: string; lines: string; anchors: string[] };
type Reproducibility = {
  schema: "factory-vblank-workload-internal-repro/v1";
  oracleProfile: string;
  method: string;
  cases: Array<{
    case: "anchor" | "liliana" | "factory-varied";
    firstFreshSha256: string;
    secondFreshSha256: string;
    byteIdentical: boolean;
  }>;
};

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const INPUT_DIR = join(REPO_ROOT, "tests/fixtures/factory-vblank-workload-internal-v2");
const REPRODUCIBILITY_PATH = join(REPO_ROOT, "tests/fixtures/factory-vblank-workload-internal-repro-v2.json");
const DEFAULT_EVIDENCE_PATH = join(REPO_ROOT, "tests/fixtures/factory-vblank-workload-internal-evidence-v2.json");
const DEFAULT_DOC_PATH = join(REPO_ROOT, "docs/issue55-vblank-workload-internal-receipt.md");
const RECEIPT_NAMES = ["anchor", "liliana", "factory-varied"] as const;

const TOP_LEVEL_STAGE_NAMES = [
  "wrapperToSoundMain",
  "soundMainSetup",
  "mplayMainChain",
  "mplayToCgbCall",
  "cgbSound",
  "postCgbSetup",
  "soundMainRamBufferPreparation",
  "soundMainRamChannelPasses",
  "soundMainRamTail",
] as const;

const SOURCE_REFERENCES: SourceReference[] = [
  {
    source: "reference/pokeemerald/src/m4a.c",
    lines: "102-105,925-1080",
    anchors: ["void m4aSoundMain(void)", "void CgbSound(void)"],
  },
  {
    source: "reference/pokeemerald/src/m4a_1.s",
    lines: "20-455",
    anchors: ["SoundMain:", "SoundMainRAM:", "SoundMainRAM_ChanLoop:", "_081DD24A:"],
  },
  {
    source: "reference/pokeemerald/src/m4a_1.s",
    lines: "1130-1466",
    anchors: ["MPlayMain:", "_081DD874:", "_081DD9C4:", "call_r3:"],
  },
  {
    source: "reference/pokeemerald/include/gba/m4a_internal.h",
    lines: "39-180,286-358",
    anchors: ["struct WaveData", "struct ToneData", "struct SoundChannel", "struct MusicPlayerTrack", "struct MusicPlayerInfo"],
  },
  {
    source: "reference/pokeemerald/pokeemerald.map",
    lines: "22378-22418",
    anchors: ["SoundMain", "SoundMainRAM", "MPlayMain", "m4aSoundMain"],
  },
  {
    source: "reference/pokeemerald/pokeemerald.elf",
    lines: "defined symbols",
    anchors: ["082df05c T SoundMain", "082df0e0 T SoundMainRAM", "082dfa5c T MPlayMain", "082e0124 T m4aSoundMain", "082e0ca8 T CgbSound"],
  },
];

function fail(message: string): never {
  throw new Error(`factory-vblank-workload-internal: ${message}`);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function distribution(values: number[]): Distribution {
  if (values.length === 0) fail("cannot make a distribution from zero values");
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

function stagePoints(observation: Observation, kind: string): number[] {
  return observation.m4a.stages
    .filter((stage) => stage.kind === kind)
    .map((stage) => stage.cyclesSinceVBlankEntry);
}

function onlyStage(observation: Observation, kind: string): number {
  const points = stagePoints(observation, kind);
  if (points.length !== 1) fail(`${kind} expected once, got ${points.length}`);
  return points[0]!;
}

function nonEmptyStages(observation: Observation, kind: string): number[] {
  const points = stagePoints(observation, kind);
  if (points.length === 0) fail(`${kind} was not observed`);
  return points;
}

function increasing(label: string, points: number[]): void {
  for (let index = 1; index < points.length; index += 1) {
    if (points[index - 1]! >= points[index]!) fail(`${label} is not strictly increasing`);
  }
}

type StageRow = Record<(typeof TOP_LEVEL_STAGE_NAMES)[number], number> & {
  m4aSoundMain: number;
  mplayPlayerSpans: number[];
  directChannelSpans: number[];
  commandPassCount: number;
  volumePitchPassCount: number;
};

function classifyStages(observation: Observation): StageRow {
  const entry = onlyStage(observation, "m4a-sound-main-call");
  const soundMain = onlyStage(observation, "sound-main-entry");
  const mplay = nonEmptyStages(observation, "mplay-main-entry");
  const afterMplay = onlyStage(observation, "sound-main-after-mplay");
  const cgb = onlyStage(observation, "cgb-sound-entry");
  const afterCgb = onlyStage(observation, "sound-main-after-cgb");
  const soundMainRam = onlyStage(observation, "sound-main-ram-entry");
  const channels = nonEmptyStages(observation, "sound-main-ram-channel-pass");
  const epilogue = onlyStage(observation, "sound-main-ram-epilogue");
  const returned = onlyStage(observation, "m4a-sound-main-return");
  increasing("m4a stage order", [entry, soundMain, ...mplay, afterMplay, cgb, afterCgb, soundMainRam, ...channels, epilogue, returned]);

  const row = {
    wrapperToSoundMain: soundMain - entry,
    soundMainSetup: mplay[0]! - soundMain,
    mplayMainChain: afterMplay - mplay[0]!,
    mplayToCgbCall: cgb - afterMplay,
    cgbSound: afterCgb - cgb,
    postCgbSetup: soundMainRam - afterCgb,
    soundMainRamBufferPreparation: channels[0]! - soundMainRam,
    soundMainRamChannelPasses: epilogue - channels[0]!,
    soundMainRamTail: returned - epilogue,
    m4aSoundMain: returned - entry,
    mplayPlayerSpans: mplay.map((point, index) => (index + 1 < mplay.length ? mplay[index + 1]! : afterMplay) - point),
    directChannelSpans: channels.map((point, index) => (index + 1 < channels.length ? channels[index + 1]! : epilogue) - point),
    commandPassCount: stagePoints(observation, "mplay-track-command-pass").length,
    volumePitchPassCount: stagePoints(observation, "mplay-track-volume-pitch-pass").length,
  };
  const total = TOP_LEVEL_STAGE_NAMES.reduce((sum, name) => sum + row[name], 0);
  if (total !== row.m4aSoundMain) fail(`m4a stages do not sum: ${total} != ${row.m4aSoundMain}`);
  return row;
}

function stateEquivalence(observations: Observation[]): object {
  const groups = new Map<string, number[]>();
  for (const observation of observations) {
    const key = stableJson(observation.m4a.state);
    const cost = classifyStages(observation).m4aSoundMain;
    groups.set(key, [...(groups.get(key) ?? []), cost]);
  }
  const repeated = [...groups.values()].filter((values) => values.length > 1);
  const conflicting = repeated.filter((values) => new Set(values).size > 1);
  return {
    observationCount: observations.length,
    capturedStateKeys: groups.size,
    repeatedCapturedStateKeys: repeated.length,
    repeatedObservationCount: repeated.reduce((sum, values) => sum + values.length, 0),
    repeatedKeysWithDifferentM4aCost: conflicting.length,
    interpretation: repeated.length === 0
      ? "No captured m4a state key repeats, so the observed set cannot establish an equal-key cost implication."
      : conflicting.length === 0
        ? "Repeated captured keys had equal observed m4a cost, but bounded command/wave prefixes still do not establish a reducer."
        : "At least one equal captured key has different observed m4a cost; this inventory is not sufficient for a reducer.",
  };
}

function assertSourceAnchors(): void {
  for (const reference of SOURCE_REFERENCES) {
    if (reference.source.endsWith(".elf")) {
      const symbols = execFileSync(
        "arm-none-eabi-nm",
        ["--defined-only", "-n", join(REPO_ROOT, reference.source)],
        // The pinned ELF has a large generated absolute-symbol table. Keep
        // this source-anchor check deterministic without truncating nm.
        { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
      );
      for (const anchor of reference.anchors) {
        if (!symbols.includes(anchor)) fail(`${reference.source} no longer contains ${JSON.stringify(anchor)}`);
      }
      continue;
    }
    const source = readFileSync(join(REPO_ROOT, reference.source), "utf8");
    for (const anchor of reference.anchors) {
      if (!source.includes(anchor)) fail(`${reference.source}:${reference.lines} no longer contains ${JSON.stringify(anchor)}`);
    }
  }
}

function loadReceipts(): Receipt[] {
  const receipts = RECEIPT_NAMES.map((name) => readJson<Receipt>(join(INPUT_DIR, `${name}.json`)));
  for (const [index, receipt] of receipts.entries()) {
    if (receipt.schema !== "factory-vblank-workload-internal-probe/v2") fail(`${receipt.case} has an unknown schema`);
    if (receipt.case !== RECEIPT_NAMES[index]) fail(`${RECEIPT_NAMES[index]} is mislabeled as ${receipt.case}`);
    if (receipt.oracleProfile !== "battle-scene-off") fail(`${receipt.case} must use battle-scene-off`);
    if (receipt.m4aInputPrefixBytes !== 8) fail(`${receipt.case} has an unexpected m4a input-prefix width`);
    if (receipt.interrupts.length === 0) fail(`${receipt.case} has no VBlank observations`);
  }
  return receipts;
}

function loadReproducibility(receipts: Receipt[]): Reproducibility {
  const reproducibility = readJson<Reproducibility>(REPRODUCIBILITY_PATH);
  if (reproducibility.schema !== "factory-vblank-workload-internal-repro/v1") fail("unknown reproducibility schema");
  if (reproducibility.oracleProfile !== "battle-scene-off") fail("reproducibility must use battle-scene-off");
  if (reproducibility.cases.length !== receipts.length) fail("reproducibility case count does not match raw receipts");
  for (const [index, receipt] of receipts.entries()) {
    const proof = reproducibility.cases[index];
    if (!proof || proof.case !== receipt.case) fail(`reproducibility ordering does not match ${receipt.case}`);
    const digest = sha256(readFileSync(join(INPUT_DIR, `${receipt.case}.json`)));
    if (!proof.byteIdentical || proof.firstFreshSha256 !== proof.secondFreshSha256 || proof.firstFreshSha256 !== digest) {
      fail(`${receipt.case} is not pinned as twice-fresh byte-identical evidence`);
    }
  }
  return reproducibility;
}

function distributionByIndex(rows: StageRow[], field: "mplayPlayerSpans" | "directChannelSpans"): Distribution[] {
  const count = new Set(rows.map((row) => row[field].length));
  if (count.size !== 1) fail(`${field} count changes within a receipt: ${[...count].join(", ")}`);
  const width = rows[0]![field].length;
  return Array.from({ length: width }, (_, index) => distribution(rows.map((row) => row[field][index]!)));
}

function summarizeReceipt(receipt: Receipt): object {
  const rows = receipt.interrupts.map(classifyStages);
  const topLevel = Object.fromEntries(TOP_LEVEL_STAGE_NAMES.map((name) => [
    name,
    distribution(rows.map((row) => row[name])),
  ]));
  const fixedTopLevelStages = TOP_LEVEL_STAGE_NAMES.filter((name) => topLevel[name]!.distinct === 1);
  const variableTopLevelStages = TOP_LEVEL_STAGE_NAMES.filter((name) => topLevel[name]!.distinct !== 1);
  return {
    receipt: receipt.case,
    sourceFunction: receipt.sourceFunction,
    sourceEpochObservationCount: receipt.interrupts.length,
    sourceStateEquivalence: stateEquivalence(receipt.interrupts),
    distributions: {
      m4aSoundMain: distribution(rows.map((row) => row.m4aSoundMain)),
      topLevel,
      mplayPlayerSpans: distributionByIndex(rows, "mplayPlayerSpans"),
      directChannelSpans: distributionByIndex(rows, "directChannelSpans"),
      mplayCommandPassCount: distribution(rows.map((row) => row.commandPassCount)),
      mplayVolumePitchPassCount: distribution(rows.map((row) => row.volumePitchPassCount)),
    },
    classification: {
      fixedTopLevelStages,
      variableTopLevelStages,
      sourceOwnedBoundaries: [
        "m4aSoundMain -> SoundMain",
        "MPlayMain linked-player entries and command/volume-pitch track-pass loop heads",
        "CgbSound",
        "SoundMainRAM setup, SoundMainRAM_ChanLoop iterations, and SoundMainRAM epilogue",
      ],
      noReducerClaim: true,
    },
  };
}

function makeEvidence(): object {
  assertSourceAnchors();
  const receipts = loadReceipts();
  const reproducibility = loadReproducibility(receipts);
  const observations = receipts.flatMap((receipt) => receipt.interrupts);
  return {
    schema: "factory-vblank-workload-internal-evidence/v2",
    oracleProfile: "battle-scene-off",
    measurement: {
      unit: "mGBA master cycles",
      m4aEntry: "VBlankIntr's m4aSoundMain call boundary (reference/pokeemerald/src/main.c:356)",
      m4aReturn: "VBlankIntr's post-m4aSoundMain instruction boundary (reference/pokeemerald/src/main.c:357)",
      stateSnapshot: "m4aSoundMain call boundary; source pointers are omitted and command/wave reads are capped at 8 bytes (16 CGB wave bytes).",
      inclusion: "Only VBlank entries inside the source construction epoch are distributed.",
    },
    sourceReferences: SOURCE_REFERENCES,
    reproducibility,
    sourceClassification: {
      m4aGraph: "The compiled m4aSoundMain wrapper reaches SoundMain, a linked MPlayMain player chain, CgbSound, and the runtime-copied SoundMainRAM. The receipt marks only those routines and named m4a_1.s loop heads.",
      mplay: "The first five linked MPlayMain player spans are fixed in the observed set; the sixth player span varies, as do its command-pass presence and the source state feeding its track loops.",
      cgb: "CgbSound is a separately measured variable source routine over the fixed four CgbChannel slots.",
      directSound: "SoundMainRAM buffer preparation has two observed costs; its five SoundMainRAM_ChanLoop iterations carry the remaining direct-sound envelope/mixer variation.",
      state: "The v2 inventory adds bounded command prefixes, ToneData, WaveData headers/prefixes, complete scalar track/channel control regions, linked-channel kinds, and CGB wave inputs. It deliberately omits raw pointers and unbounded data.",
      reducer: "No reducer is licensed: the complete captured m4a state key does not repeat in the observed set, and the bounded command/wave inventory is explicitly not a complete dynamic execution state.",
    },
    sourceStateEquivalenceAcrossWholeObservedSet: stateEquivalence(observations),
    cases: receipts.map(summarizeReceipt),
    verdict: "Evidence-only checkpoint: m4aSoundMain variability is decomposed into source-owned MPlayMain, CgbSound, and SoundMainRAM stages; no live timing reducer is implemented or claimed.",
  };
}

function asRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function range(value: Distribution): string {
  return `${value.min}–${value.max} (${value.distinct} distinct)`;
}

function makeMarkdown(evidence: object): string {
  const root = asRecord(evidence);
  const cases = root.cases as Array<Record<string, unknown>>;
  const topRows = cases.map((entry) => {
    const distributions = entry.distributions as Record<string, unknown>;
    const top = distributions.topLevel as Record<string, Distribution>;
    return [
      String(entry.receipt),
      String(entry.sourceEpochObservationCount),
      range(distributions.m4aSoundMain as Distribution),
      range(top.mplayMainChain!),
      range(top.cgbSound!),
      range(top.soundMainRamChannelPasses!),
    ];
  });
  const details = cases.flatMap((entry) => {
    const distributions = entry.distributions as Record<string, unknown>;
    const mplay = distributions.mplayPlayerSpans as Distribution[];
    const direct = distributions.directChannelSpans as Distribution[];
    const commands = distributions.mplayCommandPassCount as Distribution;
    const volume = distributions.mplayVolumePitchPassCount as Distribution;
    return [
      `### ${entry.receipt}`,
      "",
      `- MPlayMain player spans: ${mplay.map((value, index) => `#${index} ${range(value)}`).join("; ")}.`,
      `- SoundMainRAM channel spans: ${direct.map((value, index) => `#${index} ${range(value)}`).join("; ")}.`,
      `- MPlay command-pass count: ${range(commands)}; volume/pitch-pass count: ${range(volume)}.`,
      "",
    ];
  });
  const equivalence = root.sourceStateEquivalenceAcrossWholeObservedSet as Record<string, unknown>;
  const reproducibility = root.reproducibility as Reproducibility;
  return [
    "# Issue #55 — m4aSoundMain internal workload receipt",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-vblank-workload-internal.ts`; do not hand-edit.",
    "",
    "This is Scene-OFF Factory construction evidence only. It adds a v2 sibling packet and does not alter the committed outer VBlank-v1 byte contract or authorize a live timing lookup.",
    "",
    `The three raw packets are twice-fresh byte-identical: ${reproducibility.cases.map(({ case: name, firstFreshSha256 }) => `${name} ${firstFreshSha256}`).join("; ")}.`,
    "",
    "## Exact source-stage distributions",
    "",
    "All values are mGBA master cycles. `SoundMainRAM channels` is the sum of the measured `SoundMainRAM_ChanLoop` slot spans.",
    "",
    "| receipt | n | m4aSoundMain | MPlayMain chain | CgbSound | SoundMainRAM channels |",
    "| --- | ---: | --- | --- | --- | --- |",
    ...topRows.map((row) => `| ${row.join(" | ")} |`),
    "",
    ...details,
    "## Source accounting",
    "",
    "The measured graph is `m4aSoundMain → SoundMain → MPlayMain chain → CgbSound → SoundMainRAM`. The VBlank packet marks the wrapper, each linked `MPlayMain` entry, the command and volume/pitch track-pass loop heads, `CgbSound`, the runtime-copied `SoundMainRAM` entry, each `SoundMainRAM_ChanLoop` iteration, and its epilogue. Every row's named top-level stages sum exactly to the m4a call-to-return cost.",
    "",
    "The first five linked player spans are fixed in all three observed receipts; the sixth player span varies. `CgbSound` and the direct-sound channel-loop spans also vary. This narrows the old outer m4a bucket to compiled source stages, but is not a claim that any one stage has a field-minimal cost model.",
    "",
    "## State and reducer boundary",
    "",
    `Across all ${equivalence.observationCount} observations, the address-free captured m4a state has ${equivalence.capturedStateKeys} distinct keys and ${equivalence.repeatedCapturedStateKeys} repeated keys. ${equivalence.interpretation}`,
    "",
    "The inventory contains complete scalar `MusicPlayerTrack`, `SoundChannel`, and `CgbChannel` control regions; bounded next-command/pattern prefixes; active ToneData and WaveData headers; bounded wave bytes; and linked source-channel kinds. It deliberately omits raw pointers and does not pretend that an eight-byte command/wave prefix captures arbitrary command control flow or all samples. A future reducer must prove repeated, complete source-state equivalence across the observed set before it can be claimed.",
    "",
  ].join("\n");
}

function outputPaths(): { evidencePath: string; docPath: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { evidencePath: DEFAULT_EVIDENCE_PATH, docPath: DEFAULT_DOC_PATH };
  if (args.length === 2 && args[0] === "--out-dir") {
    const outDir = resolve(args[1]!);
    return {
      evidencePath: join(outDir, "factory-vblank-workload-internal-evidence-v2.json"),
      docPath: join(outDir, "issue55-vblank-workload-internal-receipt.md"),
    };
  }
  fail("usage: factory-vblank-workload-internal.ts [--out-dir PATH]");
}

function main(): void {
  const evidence = makeEvidence();
  const { evidencePath, docPath } = outputPaths();
  mkdirSync(dirname(evidencePath), { recursive: true });
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(docPath, makeMarkdown(evidence));
  process.stdout.write(`wrote ${evidencePath}\nwrote ${docPath}\n`);
}

main();
