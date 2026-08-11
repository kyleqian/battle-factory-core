// Dump the app-side semantic presentation state for the generated Scene-OFF
// battle-command canary.  It deliberately accepts a checkout root so a
// bisected parent and child can be replayed with identical staging/input.
//
// Usage:
//   node --experimental-strip-types tools/probe/dump-generated-route-canary-state.ts \
//     --repo /path/to/checkout --start 60 --end 140 --transitions

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

type UntypedModule = Record<string, unknown>;
type UntypedRecord = Record<string, unknown>;

interface Options {
  repo: string;
  start: number;
  end: number;
  transitionsOnly: boolean;
}

function readOptions(args: readonly string[]): Options {
  const parsed: Partial<Options> = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    const value = (): string => {
      index += 1;
      const next = args[index];
      if (next === undefined) throw new Error(`${argument} needs a value`);
      return next;
    };
    if (argument === "--repo") {
      parsed.repo = value();
    } else if (argument === "--start") {
      parsed.start = Number(value());
    } else if (argument === "--end") {
      parsed.end = Number(value());
    } else if (argument === "--transitions") {
      parsed.transitionsOnly = true;
    } else {
      throw new Error(`unknown argument ${argument}`);
    }
  }
  if (parsed.repo === undefined) throw new Error("--repo is required");
  const start = parsed.start ?? 1;
  const end = parsed.end ?? start;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
    throw new Error("--start/--end must be non-negative integer frames with end >= start");
  }
  return {
    repo: resolve(parsed.repo),
    start,
    end,
    transitionsOnly: parsed.transitionsOnly ?? false,
  };
}

function record(value: unknown, context: string): UntypedRecord {
  if (value === null || typeof value !== "object") throw new Error(`${context} is not an object`);
  return value as UntypedRecord;
}

function array(value: unknown, context: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${context} is not an array`);
  return value;
}

function functionExport(module: UntypedModule, name: string): (...args: any[]) => any {
  const value = module[name];
  if (typeof value !== "function") throw new Error(`module does not export function ${name}`);
  return value;
}

async function checkoutModule(repo: string, path: string): Promise<UntypedModule> {
  return await import(pathToFileURL(resolve(repo, path)).href) as UntypedModule;
}

function compactBoundary(boundary: unknown): unknown {
  const candidate = record(boundary, "battle boundary");
  const request = candidate.request;
  return {
    kind: candidate.kind,
    request: request === undefined ? undefined : {
      kind: record(request, "battle request").kind,
      side: record(request, "battle request").side,
      requestId: record(request, "battle request").requestId,
    },
  };
}

function compactCommand(command: unknown): unknown {
  const candidate = record(command, "presentation command");
  return {
    type: candidate.type,
    eventSequence: candidate.eventSequence,
    lines: candidate.lines,
    battler: candidate.battler,
    visible: candidate.visible,
    from: candidate.from,
    to: candidate.to,
  };
}

function snapshotAt(
  frame: number,
  state: unknown,
  createRenderView: ((resolution: unknown) => unknown) | null,
): UntypedRecord {
  const engine = record(state, "engine state");
  const orchestrator = engine.factoryRoundBattleOrchestrator;
  if (orchestrator === null || orchestrator === undefined) {
    return { frame, orchestrator: null };
  }
  const round = record(orchestrator, "orchestrator");
  const resolution = round.battleResolutionPresentation;
  if (resolution === null || resolution === undefined) {
    return {
      frame,
      resolution: null,
      boundary: compactBoundary(record(round.battle, "battle").boundary),
      commandOpen: round.battleCommandPresentation !== null,
    };
  }
  const presentation = record(resolution, "resolution");
  const segments = array(presentation.segments, "resolution segments");
  const segmentIndex = presentation.segmentIndex as number;
  const commandIndex = presentation.commandIndex as number;
  const activeSegment = record(segments[segmentIndex], "active resolution segment");
  const commands = array(activeSegment.commands, "active segment commands");
  const activeCommand = commands[commandIndex];
  const lifecycle = record(presentation.lifecycle, "resolution lifecycle");
  const fields = presentation.field;
  const boundary = presentation.pendingBoundary;
  const renderView = createRenderView === null
    ? null
    : record(createRenderView(resolution), "resolution render view");
  return {
    frame,
    resolution: {
      segmentIndex,
      segmentCount: segments.length,
      commandIndex,
      commandCount: commands.length,
      lifecycle: {
        phase: lifecycle.phase,
        phaseElapsed: lifecycle.phaseElapsed,
      },
      activeCommand: activeCommand === undefined ? null : compactCommand(activeCommand),
      allCommands: commands.map(compactCommand),
      field: fields,
      pendingBoundary: compactBoundary(boundary),
      render: renderView === null ? null : {
        message: renderView.message,
        bottom: renderView.bottom,
        effect: renderView.effect,
        visibility: renderView.visibility,
      },
    },
  };
}

function presentationSignature(snapshot: UntypedRecord): string {
  const resolution = snapshot.resolution;
  if (resolution === null || resolution === undefined) return JSON.stringify(snapshot);
  const current = record(resolution, "snapshot resolution");
  const lifecycle = record(current.lifecycle, "snapshot lifecycle");
  const command = current.activeCommand === null
    ? null
    : record(current.activeCommand, "snapshot active command");
  return JSON.stringify({
    segmentIndex: current.segmentIndex,
    commandIndex: current.commandIndex,
    phase: lifecycle.phase,
    type: command?.type ?? null,
    eventSequence: command?.eventSequence ?? null,
  });
}

const options = readOptions(process.argv.slice(2));
const core = await checkoutModule(options.repo, "src/engine/core.ts");
const orchestratorModule = await checkoutModule(
  options.repo,
  "src/engine/factoryRoundBattleOrchestrator.ts",
);
const partyModule = await checkoutModule(options.repo, "src/engine/factoryCorpusParty.ts");
const presentationRenderModule = await checkoutModule(
  options.repo,
  "src/engine/battleResolutionPresentationRender.ts",
);

const createInitialState = functionExport(core, "createInitialState");
const tick = functionExport(core, "tick");
const createFactoryRoundBattleOrchestrator = functionExport(
  orchestratorModule,
  "createFactoryRoundBattleOrchestrator",
);
const completeFactoryRoundPresentation = functionExport(
  orchestratorModule,
  "completeFactoryRoundPresentation",
);
const advanceFactoryRoundPresentation = functionExport(
  orchestratorModule,
  "advanceFactoryRoundPresentation",
);
const createFactoryCorpusPartyMember = functionExport(partyModule, "createFactoryCorpusPartyMember");
const createBattleResolutionPresentationRenderView = functionExport(
  presentationRenderModule,
  "createBattleResolutionPresentationRenderView",
);

const frontierMons = record(
  JSON.parse(readFileSync(resolve(options.repo, "src/data/gen/battle-frontier-mons.json"), "utf8")),
  "frontier mons",
);
const natures = record(
  JSON.parse(readFileSync(resolve(options.repo, "src/data/gen/natures.json"), "utf8")),
  "natures",
);
const natureByName = new Map(
  array(natures.natures, "natures.natures").map((entry) => {
    const row = record(entry, "nature row");
    return [row.name as string, row.index as number] as const;
  }),
);

function generatedCommandRecord(setId: number): UntypedRecord {
  const entries = array(frontierMons.entries, "frontier mons entries");
  const set = record(entries[setId], `frontier set ${setId}`);
  const personality = natureByName.get(set.nature as string);
  if (personality === undefined) throw new Error(`frontier set ${setId} has no nature index`);
  const input = {
    setId,
    personality,
    fixedIv: 31,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: 0x89ab_cdef,
  };
  return Object.freeze({
    ...input,
    abilitySlot: record(createFactoryCorpusPartyMember(input), "corpus party member").abilitySlot,
  });
}

const playerRentalRecords = [
  generatedCommandRecord(664),
  generatedCommandRecord(678),
  generatedCommandRecord(527),
] as const;
let orchestrator = createFactoryRoundBattleOrchestrator({
  id: "battle-command-generated-off",
  rngValue: 4,
  factoryWinStreak: 0,
  playerTrainerId: 0x89ab_cdef,
  battleTowerLevel50WinStreak: 0,
  facilityState: { rentsCount: 0 },
  rentals: {
    type: "currentRecords",
    playerRentalRecords,
    savedRentalRecords: [
      ...playerRentalRecords,
      generatedCommandRecord(1),
      generatedCommandRecord(2),
      generatedCommandRecord(3),
    ],
  },
});
const startCommand = record(record(orchestrator, "orchestrator").round, "round").presentation;
const commandId = record(record(startCommand, "round presentation").command, "round command").commandId;
if (typeof commandId !== "number") throw new Error("staged battle-start command has no numeric commandId");
orchestrator = advanceFactoryRoundPresentation(
  completeFactoryRoundPresentation(orchestrator, { commandId }),
);
const stagedBattle = record(orchestrator, "orchestrator").battle;
const stagedRngValue = stagedBattle === null
  ? 4
  : record(record(stagedBattle, "battle").rng, "battle rng").value;
if (typeof stagedRngValue !== "number") throw new Error("staged battle RNG has no numeric value");
let state = {
  ...createInitialState({ appRoute: "generated-orchestrator" }),
  factoryRoundBattleOrchestrator: orchestrator,
  rngMode: "frontierBattle",
  rngValue: stagedRngValue,
};

const trace = record(
  JSON.parse(readFileSync(resolve(options.repo, "tools/compare/traces/battle-command-generated-off.json"), "utf8")),
  "canary trace",
);
let frame = 0;
let lastSignature: string | null = null;
console.log(JSON.stringify({
  repo: options.repo,
  window: [options.start, options.end],
  transitionsOnly: options.transitionsOnly,
}));
for (const rawSegment of array(trace.segments, "trace segments")) {
  const segment = record(rawSegment, "trace segment");
  const frames = segment.frames;
  if (typeof frames !== "number") throw new Error("trace segment has no frame count");
  const buttons = new Set(
    (segment.buttons === undefined ? [] : array(segment.buttons, "trace buttons")) as Iterable<string>,
  );
  for (let offset = 0; offset < frames; offset += 1) {
    frame += 1;
    state = tick(state, buttons);
    if (frame >= options.start && frame <= options.end) {
      const snapshot = snapshotAt(frame, state, createBattleResolutionPresentationRenderView);
      const signature = presentationSignature(snapshot);
      if (!options.transitionsOnly || signature !== lastSignature) {
        console.log(JSON.stringify(snapshot));
      }
      lastSignature = signature;
    }
  }
}
