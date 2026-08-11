import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Boundary = { symbol: string; instructionIndex: number; instructionRole: string };
type Wave = { storageRole: string; waveSymbol: string; payloadBytes: number; payloadSha256: string };
type Replacement = {
  channelIndex: number;
  mplayInvocationIndex: number;
  playerRole: string;
  playerIndex: number;
  trackIndex: number;
  toneType: number;
  route: string;
  selectorBoundary: Boundary;
  channelWaveStoreBoundary: Boundary;
  selectorInput: { role: string; midiKey?: number; selectedToneIndex?: number };
  selectedToneRole: string;
  selectedToneIndex: number | null;
  wave: Wave;
  inlineAncestry: null | {
    lastWriterRouteInSameMPlayMain: string;
    plyXwaveCommandU32Ancestry: boolean;
    writerBoundary: Boundary | null;
  };
};
type ProvenanceReceipt = {
  schema: string;
  oracleProfile: string;
  addressFree: boolean;
  classificationOnly: boolean;
  boundaryRoles: Record<string, Boundary>;
  observations: Array<{
    sourceStateDigest: string;
    entryTargetStateDigest: string;
    replacements: Replacement[];
  }>;
};
type EntryTarget = {
  channelIndex: number;
  targetProducingRoute: string;
  wave: { size: number; sampleRegion: { sha256: string }; directWaveTargetDescriptor: { storageRole: string; waveSymbol: string } };
};
type EntryReceipt = {
  schema: string;
  oracleProfile: string;
  observations: Array<{
    sourceStateDigest: string;
    entryTargetStateDigest: string;
    soundMainRamEntryTargets: EntryTarget[];
  }>;
};
type ElfSymbol = { address: number; size: number; name: string };

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const ELF = join(ROOT, "reference/pokeemerald/pokeemerald.elf");
const PROVENANCE_ROOT = join(ROOT, "tests/fixtures/factory-m4a-mixer-entry-provenance-v2");
const ENTRY_ROOT = join(ROOT, "tests/fixtures/factory-m4a-soundmainram-entry-targets-v1");
const REPRO = join(ROOT, "tests/fixtures/factory-m4a-mixer-entry-provenance-repro-v2.json");
const DEFAULT_EVIDENCE = join(ROOT, "tests/fixtures/factory-m4a-mixer-entry-provenance-evidence-v2.json");
const DEFAULT_DOC = join(ROOT, "docs/issue55-m4a-mixer-entry-provenance-v2.md");
const RECEIPTS = ["anchor", "liliana"] as const;
const PROVENANCE_HASHES = {
  anchor: "afcb80344d7a2e8475b22a1bb2d2f65b8ae337c358c7b88608460faad6c4dab2",
  liliana: "b5cda91156fb1264e03e8729c83bd845121dc3371fddacb9648e3de5eebd516e",
} as const;
const ENTRY_HASHES = {
  anchor: "6b29d708051e0d4422d8f6527e7bd61ffb6bfa408957c017b89b7f2a3c409e1f",
  liliana: "780e332632da2fd024c032a831710c1b8b609d627132836612958546d87fdcf1",
  "factory-varied": "202f18b6d1877ecac55685e51e4f62ec650e2091cb26912ba362efff2c658ad9",
} as const;
const FROZEN_HASHES = {
  entryEvidenceV1: "81635d80696ae102fc67cf5fc670fe37fcb3924942ac0f702632d113229f40a6",
  targetAuditV1: "3817b1ab6c0e3e488619e3827cfede5d5a3fa82e038dd551e173c6af0effa04e",
  sourceStateV3: {
    anchor: "a3c7fb2baeee2cf253481086d77f9262ee8842c9595d4ff2e4a5cd2776d3fbc3",
    liliana: "24717d4e2861bc74948d23470de25e97d69b2a553962d25f303a6a48d75268d6",
    "factory-varied": "54426be9e6af1a9d4bd945ef2276a9a0b58da9c2bfd185ec988029fa4f9f67c1",
  },
} as const;
const BOUNDARIES: Record<string, Boundary> = {
  "ply-note-keysplit-selector": { symbol: "ply_note", instructionIndex: 47, instructionRole: "keysplit-table-selector-load" },
  "ply-note-rhythm-selector": { symbol: "ply_note", instructionIndex: 51, instructionRole: "rhythm-midi-key-selector-copy" },
  "ply-note-inline-selector": { symbol: "ply_note", instructionIndex: 76, instructionRole: "inline-track-tone-select" },
  "ply-voice-inline-wave-store": { symbol: "ply_voice", instructionIndex: 17, instructionRole: "MusicPlayerTrack.ToneData.wav-store" },
  "ply-xwave-inline-wave-store": { symbol: "ply_xwave", instructionIndex: 21, instructionRole: "MusicPlayerTrack.ToneData.wav-store" },
  "ply-note-channel-wave-store": { symbol: "ply_note", instructionIndex: 195, instructionRole: "SoundChannel.wav-store" },
};
const SOURCE_ANCHORS = [
  { id: "ply-voice-inline-writer", source: "reference/pokeemerald/src/m4a_1.s", startLine: 945, endLine: 966, anchors: ["ply_voice:", "o_MusicPlayerTrack_ToneData_wav", "chk_adr_r2"] },
  { id: "ply-note-route-and-channel-writer", source: "reference/pokeemerald/src/m4a_1.s", startLine: 1538, endLine: 1754, anchors: ["ply_note:", "TONEDATA_TYPE_SPL", "TONEDATA_TYPE_RHY", "o_SoundChannel_wav"] },
  { id: "ply-xwave-command-writer", source: "reference/pokeemerald/src/m4a.c", startLine: 1536, endLine: 1559, anchors: ["READ_XCMD_BYTE", "void ply_xwave", "track->tone.wav", "track->cmdPtr += 4"] },
] as const;

function fail(message: string): never {
  throw new Error(`factory-m4a-mixer-entry-provenance-v2: ${message}`);
}
function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}
function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}
function symbols(): ElfSymbol[] {
  const output = execFileSync("arm-none-eabi-nm", ["--defined-only", "-S", "-n", ELF], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return output.split("\n").flatMap((line) => {
    const match = /^([0-9a-fA-F]+)\s+([0-9a-fA-F]+)\s+\S\s+(\S+)$/.exec(line);
    return match ? [{ address: Number.parseInt(match[1]!, 16), size: Number.parseInt(match[2]!, 16), name: match[3]! }] : [];
  });
}
function symbolBytes(elf: Buffer, symbol: ElfSymbol): Buffer {
  const offset = 0x1000 + symbol.address - 0x08000000;
  if (symbol.size <= 0 || offset < 0 || offset + symbol.size > elf.length) fail(`${symbol.name} has an invalid ROM extent`);
  return elf.subarray(offset, offset + symbol.size);
}
function boundaryEvidence(): { sources: unknown[]; symbols: unknown[]; instructions: unknown[] } {
  const elf = readFileSync(ELF);
  const all = symbols();
  const needed = ["ply_voice", "ply_note", "ply_xwave"];
  const selected = Object.fromEntries(needed.map((name) => {
    const symbol = all.find((row) => row.name === name);
    if (!symbol) fail(`ELF lacks ${name}`);
    return [name, symbol];
  })) as Record<string, ElfSymbol>;
  const symbolRows = needed.map((name) => {
    const bytes = symbolBytes(elf, selected[name]!);
    return { symbol: name, bytes: bytes.length, sha256: sha256(bytes) };
  });
  const instructionRows = Object.entries(BOUNDARIES).map(([id, boundary]) => {
    const bytes = symbolBytes(elf, selected[boundary.symbol]!);
    const offset = boundary.instructionIndex * 2;
    if (offset + 2 > bytes.length) fail(`${id} escaped ${boundary.symbol}`);
    return { id, ...boundary, thumbHalfwordSha256: sha256(bytes.subarray(offset, offset + 2)) };
  });
  const sourceRows = SOURCE_ANCHORS.map((anchor) => {
    const lines = readFileSync(join(ROOT, anchor.source), "utf8").split("\n");
    const slice = `${lines.slice(anchor.startLine - 1, anchor.endLine).join("\n")}\n`;
    for (const text of anchor.anchors) if (!slice.includes(text)) fail(`${anchor.id} lost source anchor ${text}`);
    return { id: anchor.id, source: anchor.source, lines: `${anchor.startLine}-${anchor.endLine}`, sha256: sha256(slice) };
  });
  return { sources: sourceRows, symbols: symbolRows, instructions: instructionRows };
}
function expectedWave(target: EntryTarget): Wave {
  return {
    storageRole: target.wave.directWaveTargetDescriptor.storageRole,
    waveSymbol: target.wave.directWaveTargetDescriptor.waveSymbol,
    payloadBytes: target.wave.size,
    payloadSha256: target.wave.sampleRegion.sha256,
  };
}

export function buildEvidence(): Record<string, unknown> {
  if (sha256(readFileSync(join(ROOT, "tests/fixtures/factory-m4a-soundmainram-entry-target-evidence-v1.json"))) !== FROZEN_HASHES.entryEvidenceV1) fail("frozen entry evidence v1 changed");
  if (sha256(readFileSync(join(ROOT, "tests/fixtures/factory-m4a-soundmainram-target-audit-v1.json"))) !== FROZEN_HASHES.targetAuditV1) fail("frozen target audit v1 changed");
  for (const [name, hash] of Object.entries(FROZEN_HASHES.sourceStateV3)) {
    if (sha256(readFileSync(join(ROOT, `tests/fixtures/factory-m4a-source-state-v3/${name}.json`))) !== hash) fail(`${name} frozen source-state v3 changed`);
  }

  const repro = readJson<{ schema: string; oracleProfile: string; freshRunsPerCase: number; cases: Array<{ case: string; firstFreshSha256: string; secondFreshSha256: string; byteIdentical: boolean }>; excludedCase: { case: string } }>(REPRO);
  if (repro.schema !== "factory-m4a-mixer-entry-provenance-repro/v2" || repro.oracleProfile !== "battle-scene-off" || repro.freshRunsPerCase !== 2 || repro.excludedCase.case !== "factory-varied") fail("reproducibility contract changed");

  const entryByJoin = new Map<string, { receipt: string; targets: EntryTarget[] }>();
  let totalEntryTargets = 0;
  let totalReplaced = 0;
  for (const [name, expectedHash] of Object.entries(ENTRY_HASHES)) {
    const bytes = readFileSync(join(ENTRY_ROOT, `${name}.json`));
    if (sha256(bytes) !== expectedHash) fail(`${name} frozen mixer-entry receipt changed`);
    const receipt = JSON.parse(bytes.toString("utf8")) as EntryReceipt;
    if (receipt.schema !== "factory-m4a-soundmainram-entry-targets/v1" || receipt.oracleProfile !== "battle-scene-off") fail(`${name} entry schema changed`);
    for (const observation of receipt.observations) {
      const key = `${observation.sourceStateDigest}:${observation.entryTargetStateDigest}`;
      if (entryByJoin.has(key)) fail(`ambiguous frozen entry join ${key}`);
      entryByJoin.set(key, { receipt: name, targets: observation.soundMainRamEntryTargets });
      totalEntryTargets += observation.soundMainRamEntryTargets.length;
      totalReplaced += observation.soundMainRamEntryTargets.filter((target) => target.targetProducingRoute !== "pre-mplay-persisted").length;
    }
  }
  if (totalEntryTargets !== 565 || totalReplaced !== 13) fail("frozen entry census changed");

  const routes: Record<string, number> = {};
  const xwave = { true: 0, false: 0 };
  const rows: Array<Record<string, unknown>> = [];
  const joinedTargets = new Set<string>();
  const captureSummaries: Array<Record<string, unknown>> = [];
  for (const name of RECEIPTS) {
    const bytes = readFileSync(join(PROVENANCE_ROOT, `${name}.json`));
    const hash = sha256(bytes);
    if (hash !== PROVENANCE_HASHES[name]) fail(`${name} provenance receipt changed`);
    const proof = repro.cases.find((row) => row.case === name);
    if (!proof?.byteIdentical || proof.firstFreshSha256 !== hash || proof.secondFreshSha256 !== hash) fail(`${name} is not twice-fresh byte-identical`);
    const receipt = JSON.parse(bytes.toString("utf8")) as ProvenanceReceipt;
    if (receipt.schema !== "factory-m4a-mixer-entry-provenance/v2" || receipt.oracleProfile !== "battle-scene-off" || !receipt.addressFree || !receipt.classificationOnly) fail(`${name} provenance contract changed`);
    if (canonical(receipt.boundaryRoles) !== canonical(BOUNDARIES)) fail(`${name} boundary-role inventory changed`);
    let replacementCount = 0;
    for (const observation of receipt.observations) {
      const joinKey = `${observation.sourceStateDigest}:${observation.entryTargetStateDigest}`;
      const entry = entryByJoin.get(joinKey);
      if (!entry || entry.receipt !== name) fail(`${name} observation did not join its frozen entry receipt`);
      const replaced = entry.targets.filter((target) => target.targetProducingRoute !== "pre-mplay-persisted");
      if (observation.replacements.length !== replaced.length) fail(`${name} observation replacement cardinality changed`);
      for (const replacement of observation.replacements) {
        const target = replaced.filter((candidate) => candidate.channelIndex === replacement.channelIndex);
        if (target.length !== 1) fail(`${name} channel ${replacement.channelIndex} replacement join is ambiguous`);
        if (canonical(replacement.wave) !== canonical(expectedWave(target[0]!))) fail(`${name} channel ${replacement.channelIndex} wave join failed`);
        const unique = `${joinKey}:${replacement.channelIndex}`;
        if (joinedTargets.has(unique)) fail(`duplicate replacement join ${unique}`);
        joinedTargets.add(unique);
        if (replacement.playerRole !== "SoundInfo.MPlayMain-linked-player" || replacement.playerIndex < 0 || replacement.trackIndex < 0 || replacement.mplayInvocationIndex < 0) fail("source role/index normalization changed");
        if (canonical(replacement.channelWaveStoreBoundary) !== canonical(BOUNDARIES["ply-note-channel-wave-store"])) fail("channel store boundary changed");
        if (replacement.route === "mplay.ply-note.inline-tone-wave") {
          if (canonical(replacement.selectorBoundary) !== canonical(BOUNDARIES["ply-note-inline-selector"]) || replacement.selectedToneIndex !== null || replacement.inlineAncestry === null) fail("inline route shape changed");
          increment(xwave, String(replacement.inlineAncestry.plyXwaveCommandU32Ancestry));
          if (replacement.inlineAncestry.plyXwaveCommandU32Ancestry && canonical(replacement.inlineAncestry.writerBoundary) !== canonical(BOUNDARIES["ply-xwave-inline-wave-store"])) fail("inline xwave ancestry boundary changed");
        } else if (replacement.route === "mplay.ply-note.keysplit-tone-wave") {
          if (canonical(replacement.selectorBoundary) !== canonical(BOUNDARIES["ply-note-keysplit-selector"]) || replacement.selectedToneIndex !== replacement.selectorInput.selectedToneIndex || replacement.inlineAncestry !== null) fail("keysplit route shape changed");
        } else if (replacement.route === "mplay.ply-note.rhythm-tone-wave") {
          if (canonical(replacement.selectorBoundary) !== canonical(BOUNDARIES["ply-note-rhythm-selector"]) || replacement.selectedToneIndex !== replacement.selectorInput.midiKey || replacement.inlineAncestry !== null) fail("rhythm route shape changed");
        } else fail(`unknown replacement route ${replacement.route}`);
        increment(routes, replacement.route);
        replacementCount += 1;
        rows.push({
          sourceStateDigest: observation.sourceStateDigest,
          entryTargetStateDigest: observation.entryTargetStateDigest,
          channelIndex: replacement.channelIndex,
          mplayInvocationIndex: replacement.mplayInvocationIndex,
          playerRole: replacement.playerRole,
          playerIndex: replacement.playerIndex,
          trackIndex: replacement.trackIndex,
          toneType: replacement.toneType,
          route: replacement.route,
          selectorBoundary: replacement.selectorBoundary,
          channelWaveStoreBoundary: replacement.channelWaveStoreBoundary,
          selectorInput: replacement.selectorInput,
          selectedToneRole: replacement.selectedToneRole,
          selectedToneIndex: replacement.selectedToneIndex,
          wave: replacement.wave,
          inlineAncestry: replacement.inlineAncestry,
        });
      }
    }
    captureSummaries.push({ receipt: name, observationsWithReplacements: receipt.observations.length, replacements: replacementCount, sha256: hash });
  }
  if (joinedTargets.size !== 13 || rows.length !== 13) fail(`expected 13 unique joined replacements, got ${joinedTargets.size}/${rows.length}`);
  if ((routes["mplay.ply-note.inline-tone-wave"] ?? 0) !== 6 || (routes["mplay.ply-note.keysplit-tone-wave"] ?? 0) !== 0 || (routes["mplay.ply-note.rhythm-tone-wave"] ?? 0) !== 7) fail("route census changed");
  if (xwave.true !== 0 || xwave.false !== 6) fail("inline ply_xwave ancestry census changed");

  return {
    schema: "factory-m4a-mixer-entry-provenance-evidence/v2",
    oracleProfile: "battle-scene-off",
    reproducibility: { freshRunsPerReplacementBearingReceipt: 2, byteIdenticalReceipts: 2, captures: captureSummaries, zeroReplacementReceiptReused: "factory-varied" },
    frozenInputs: { entryReceiptSha256: ENTRY_HASHES, ...FROZEN_HASHES },
    sourceAndElf: boundaryEvidence(),
    mechanicalJoin: { keys: ["sourceStateDigest", "entryTargetStateDigest", "channelIndex"], frozenEntryObservations: 113, frozenEntryTargets: 565, frozenReplacedTargets: 13, classifiedTargets: 13, ambiguousJoins: 0 },
    coverage: {
      routes: {
        "mplay.ply-note.inline-tone-wave": routes["mplay.ply-note.inline-tone-wave"] ?? 0,
        "mplay.ply-note.keysplit-tone-wave": routes["mplay.ply-note.keysplit-tone-wave"] ?? 0,
        "mplay.ply-note.rhythm-tone-wave": routes["mplay.ply-note.rhythm-tone-wave"] ?? 0,
      },
      inlinePlyXwaveCommandU32Ancestry: xwave,
      runtimeTargetProvenanceComplete: true,
    },
    classifiedTargets: rows,
    closure: {
      closed: "All 13 MPlay-replaced mixer-entry targets join uniquely to the final source-general ply_note SoundChannel.wav writer and its exact selector boundary. Inline rows additionally retain the last same-pass inline-tone writer and ply_xwave command-u32 ancestry verdict.",
      exactMissingMutableRouteField: null,
      durationLicensed: false,
      constructionClockLicensed: false,
    },
  };
}

function markdown(evidence: Record<string, unknown>): string {
  const repro = evidence.reproducibility as Record<string, unknown>;
  const joinEvidence = evidence.mechanicalJoin as Record<string, unknown>;
  const coverage = evidence.coverage as { routes: Record<string, number>; inlinePlyXwaveCommandU32Ancestry: Record<string, number> };
  const source = evidence.sourceAndElf as { sources: Array<Record<string, unknown>>; symbols: Array<Record<string, unknown>>; instructions: Array<Record<string, unknown>> };
  const closure = evidence.closure as Record<string, unknown>;
  return [
    "# Issue #55 — MPlay mixer-entry provenance v2",
    "",
    "Generated by `node --experimental-strip-types tools/report/factory-m4a-mixer-entry-provenance-v2.ts`; do not hand-edit.",
    "",
    "Battle Scene OFF, evidence only. This additive packet leaves every frozen mixer-entry v1, target-audit v1, and source-state v3 byte hash unchanged.",
    "",
    "## Capture and join",
    "",
    `Anchor and LILIANA each reproduced twice byte-identically (${repro.byteIdenticalReceipts}/2 receipts); legal-varied's frozen v1 row has zero replacements and was reused without a new capture. The address-free join uses only source-state digest, mixer-entry target-state digest, and selected channel index: **${joinEvidence.classifiedTargets}/${joinEvidence.frozenReplacedTargets}** classified, **${joinEvidence.ambiguousJoins}** ambiguous.`,
    "",
    "## Source-general classification",
    "",
    `The 13 final writers classify as inline **${coverage.routes["mplay.ply-note.inline-tone-wave"]}**, keysplit **${coverage.routes["mplay.ply-note.keysplit-tone-wave"]}**, and rhythm **${coverage.routes["mplay.ply-note.rhythm-tone-wave"]}**. All six inline routes have an explicit same-MPlayMain ancestry verdict: ply_xwave command-u32 true **${coverage.inlinePlyXwaveCommandU32Ancestry.true}**, false **${coverage.inlinePlyXwaveCommandU32Ancestry.false}**.`,
    "",
    "Each row retains the linked-player/track/channel indices, selector input role and index, normalized WaveData symbol/payload digest, and exact symbol-relative selector/store boundary. It contains no raw pointer, frame, tick, cycle cost, or duration key.",
    "",
    "## Pinned ELF boundaries",
    "",
    "| source slice | SHA-256 |",
    "| --- | --- |",
    ...source.sources.map((row) => `| ${row.source}:${row.lines} (${row.id}) | ${row.sha256} |`),
    "",
    "| symbol | bytes | SHA-256 |",
    "| --- | ---: | --- |",
    ...source.symbols.map((row) => `| ${row.symbol} | ${row.bytes} | ${row.sha256} |`),
    "",
    "| role | symbol instruction index | Thumb halfword SHA-256 |",
    "| --- | --- | --- |",
    ...source.instructions.map((row) => `| ${row.instructionRole} | ${row.symbol}[${row.instructionIndex}] | ${row.thumbHalfwordSha256} |`),
    "",
    "## Closure boundary",
    "",
    String(closure.closed),
    "",
    "The exact mutable-route field is now complete for all 13 replacements. This packet licenses no timing reducer, service cost, operation clock, or construction-clock wiring.",
    "",
  ].join("\n");
}

function outputPaths(): { evidence: string; doc: string } {
  const args = process.argv.slice(2);
  if (args.length === 0) return { evidence: DEFAULT_EVIDENCE, doc: DEFAULT_DOC };
  if (args.length === 2 && args[0] === "--out-dir") {
    const root = resolve(args[1]!);
    return { evidence: join(root, "factory-m4a-mixer-entry-provenance-evidence-v2.json"), doc: join(root, "issue55-m4a-mixer-entry-provenance-v2.md") };
  }
  fail("usage: factory-m4a-mixer-entry-provenance-v2.ts [--out-dir PATH]");
}

export function main(): void {
  const evidence = buildEvidence();
  const output = outputPaths();
  mkdirSync(dirname(output.evidence), { recursive: true });
  mkdirSync(dirname(output.doc), { recursive: true });
  writeFileSync(output.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(output.doc, markdown(evidence));
  process.stdout.write(`wrote ${output.evidence}\nwrote ${output.doc}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
