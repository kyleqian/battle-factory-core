// Source-derived dependency graph for Emerald move animations.
//
// This is deliberately many-to-many: a move depends on script choreography,
// shared subroutines, sprite/task implementations, and assets, while each of
// those components can serve many moves. Product acceptance stays per move;
// this graph exists to choose implementation work that compounds.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-animation-components.ts
// or pass `--out <path>` for a byte-for-byte reproducibility check.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const defaultOutput = join(
  RUN_ROOT,
  "src",
  "data",
  "gen",
  "battle-animation-components.json",
);
const outputArg = process.argv.indexOf("--out");
if (outputArg !== -1 && !process.argv[outputArg + 1]) {
  throw new Error("--out needs a path");
}
const OUTPUT = outputArg === -1 ? defaultOutput : resolve(process.argv[outputArg + 1]!);

type AnimationTier = "level50" | "openOnly" | "outsideFactory";
type ComponentKind =
  | "asset"
  | "sprite"
  | "task"
  | "soundTask"
  | "subroutine"
  | "visualCommand";

interface InventoryMove {
  readonly move: string;
  readonly id: number;
  readonly name: string;
  readonly animationScript: string;
}

interface Instruction {
  readonly opcode: string;
  readonly args: string;
}

interface ScriptBlock {
  readonly label: string;
  readonly instructions: Instruction[];
  readonly nextLabel?: string;
}

interface ComponentUse {
  readonly kind: ComponentKind;
  readonly name: string;
}

const inventory = JSON.parse(
  readFileSync(
    join(RUN_ROOT, "src", "data", "gen", "factory-animation-inventory.json"),
    "utf8",
  ),
) as {
  tiers: Record<AnimationTier, { moves: InventoryMove[] }>;
};
const animationSourcePath = join(
  RUN_ROOT,
  "reference",
  "pokeemerald",
  "data",
  "battle_anim_scripts.s",
);
const animationSource = readFileSync(animationSourcePath, "utf8");

function parseBlocks(source: string): Map<string, ScriptBlock> {
  const pending: Array<{ label: string; instructions: Instruction[] }> = [];
  let current: { label: string; instructions: Instruction[] } | undefined;
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.replace(/@.*$/, "").trimEnd();
    const label = /^([A-Za-z_][A-Za-z0-9_]*):{1,2}\s*$/.exec(line.trim());
    if (label) {
      current = { label: label[1]!, instructions: [] };
      pending.push(current);
      continue;
    }
    if (!current) continue;
    const instruction = /^\s*([A-Za-z_][A-Za-z0-9_]*)\b\s*(.*)$/.exec(line);
    if (!instruction) continue;
    current.instructions.push({
      opcode: instruction[1]!,
      args: instruction[2]!.trim(),
    });
  }
  return new Map(
    pending.map((block, index) => [
      block.label,
      {
        ...block,
        ...(pending[index + 1] ? { nextLabel: pending[index + 1]!.label } : {}),
      },
    ]),
  );
}

const blocks = parseBlocks(animationSource);
const knownLabels = new Set(blocks.keys());
const controlCommands = new Set([
  "call",
  "goto",
  "choosetwoturnanim",
  "jumpargeq",
  "jumpifcontest",
  "jumpifmoveturn",
  "jumpreteq",
  "jumpretfalse",
  "jumprettrue",
]);
const nonVisualCommands = new Set([
  "delay",
  "end",
  "return",
  "waitforvisualfinish",
  "waitforsound",
  "pause",
  "playsewithpan",
  "loopsewithpan",
  "waitplaysewithpan",
  "panse_1B",
  "panse_19",
  "panse_26",
  "setpan",
]);

function referencedBlocks(block: ScriptBlock): string[] {
  const result = new Set<string>();
  if (block.instructions.length === 0 && block.nextLabel) {
    result.add(block.nextLabel);
  }
  for (const instruction of block.instructions) {
    if (!controlCommands.has(instruction.opcode)) continue;
    for (const token of instruction.args.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []) {
      if (knownLabels.has(token)) result.add(token);
    }
  }
  return [...result];
}

function reachableBlocks(root: string): ScriptBlock[] {
  const result: ScriptBlock[] = [];
  const pending = [root];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const label = pending.shift()!;
    if (seen.has(label)) continue;
    seen.add(label);
    const block = blocks.get(label);
    if (!block) throw new Error(`animation root/call references missing block ${label}`);
    result.push(block);
    pending.push(...referencedBlocks(block));
  }
  return result;
}

function firstArg(args: string): string {
  return args.split(",", 1)[0]!.trim();
}

function componentId(kind: ComponentKind, name: string): string {
  return `${kind}:${name}`;
}

function componentsFor(root: string, reachable: readonly ScriptBlock[]): ComponentUse[] {
  const result = new Map<string, ComponentUse>();
  const add = (kind: ComponentKind, name: string): void => {
    if (!name) return;
    result.set(componentId(kind, name), { kind, name });
  };
  for (const block of reachable) {
    if (block.label !== root) add("subroutine", block.label);
    for (const instruction of block.instructions) {
      switch (instruction.opcode) {
        case "loadspritegfx":
          add("asset", firstArg(instruction.args));
          break;
        case "createsprite":
          add("sprite", firstArg(instruction.args));
          break;
        case "createvisualtask":
          add("task", firstArg(instruction.args));
          break;
        case "createsoundtask":
          add("soundTask", firstArg(instruction.args));
          break;
        default:
          if (
            !controlCommands.has(instruction.opcode) &&
            !nonVisualCommands.has(instruction.opcode)
          ) {
            add("visualCommand", instruction.opcode);
          }
      }
    }
  }
  return [...result.values()].sort((a, b) =>
    componentId(a.kind, a.name).localeCompare(componentId(b.kind, b.name)),
  );
}

const tieredMoves = (
  Object.entries(inventory.tiers) as Array<
    [AnimationTier, { moves: InventoryMove[] }]
  >
).flatMap(([tier, data]) => data.moves.map((move) => ({ ...move, tier })));
const moveRecords = tieredMoves.map((move) => {
  const reachable = reachableBlocks(move.animationScript);
  const components = componentsFor(move.animationScript, reachable);
  return {
    move: move.move,
    id: move.id,
    name: move.name,
    tier: move.tier,
    rootScript: move.animationScript,
    blocks: reachable.map((block) => block.label),
    componentIds: components.map((component) =>
      componentId(component.kind, component.name),
    ),
    components,
  };
});

const componentUses = new Map<
  string,
  ComponentUse & { moves: Array<{ move: string; tier: AnimationTier }> }
>();
for (const move of moveRecords) {
  for (const component of move.components) {
    const id = componentId(component.kind, component.name);
    const entry = componentUses.get(id) ?? { ...component, moves: [] };
    entry.moves.push({ move: move.move, tier: move.tier });
    componentUses.set(id, entry);
  }
}
const components = [...componentUses.entries()]
  .map(([id, component]) => ({
    id,
    kind: component.kind,
    name: component.name,
    moveCount: component.moves.length,
    level50MoveCount: component.moves.filter((move) => move.tier === "level50").length,
    moves: component.moves.map((move) => move.move),
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

const output = {
  schema: "battle-animation-components/v1",
  source: {
    files: [
      "src/data/gen/factory-animation-inventory.json",
      "reference/pokeemerald/data/battle_anim_scripts.s",
    ],
    rule: "Traverse each gBattleAnims_Moves root through script control-flow edges and inventory every reusable asset, sprite template, task, subroutine, and visual command.",
  },
  summary: {
    moves: moveRecords.length,
    scriptBlocks: blocks.size,
    components: components.length,
    dependencyEdges: moveRecords.reduce(
      (sum, move) => sum + move.componentIds.length,
      0,
    ),
  },
  moves: moveRecords.map(({ components: _components, ...move }) => move),
  components,
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(output)}\n`);
console.log(`wrote ${OUTPUT}`);
