// dl4 / fam1: derives src/assets/gen/anim-asset-moves.json (move id -> the lazy animation files its animation reads) and the eager list
// (assets some module imports as a value; they stay in the main chunk). fam1 (docs/fam1-first-use-move-animations.md) replaced dl4's
// soak-intersection derivation, which only knew the moves the recorded battles played (Whirlpool and Spark had no entry), by two direct
// recordings:
//   moves   every move's own animation (tools/bundle/animAssetMoveReads.ts: both attackers, every body row, every request field the body
//           reads), for all 354 moves (a called move can be any of them). This alone is what tests/fam1MoveAnimationReads*.test.ts checks.
//   stage   one staged battle per Factory move through the real game (the soak driver from the Level 50 draft, Scene ON, every frame
//           rendered): every Factory set's four moves are replaced by the staged move (or the move and a helper that makes it work,
//           STAGE_SETS), so both sides use it and its consequences (residuals, weather, the general animations it causes) are drawn by
//           production. Reads are attributed to the move-animation command's own move, and the rest of the battle's reads to the staged
//           move and its helpers. Reads on the tick (outside a render) are listed separately; there must be none.
//   record  dl4's soak recording (per battle: the moves the battle named, the files read); `check` reports reads the table did not predict.
//
//   node --experimental-strip-types tools/bundle/animAssetNeeds.ts moves --out .integration/fam1/moves.json
//   node --experimental-strip-types tools/bundle/animAssetNeeds.ts stage --out .integration/fam1/stage-a.json  (all; --moves A:B / --only ID,ID)
//   node --experimental-strip-types tools/bundle/animAssetNeeds.ts build .integration/fam1/moves.json .integration/fam1/stage-*.json [--write]
//   node --experimental-strip-types tools/bundle/animAssetNeeds.ts record --seeds 0:6 --policy coverage-fight --out .integration/dl4/rec-a.json
//   node --experimental-strip-types tools/bundle/animAssetNeeds.ts check .integration/dl4/rec-*.json .integration/fam1/stage-*.json
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import "../../src/engine/monPicPixelsInstall.ts";
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import movesData from "../../src/data/gen/moves.json" with { type: "json" };
import { bundledAnimAssetSource } from "../../src/engine/animAssetsInstall.ts";
import { installAnimAssets } from "../../src/engine/animAssets.ts";
import { neededMoveIds } from "../../src/engine/animAssetNeeds.ts";
import { setMonMoveAvoidReturn } from "../../src/engine/factoryCorpusParty.ts";
import { presentationRenderRunning } from "../../src/engine/presentationContainment.ts";
import { allMoveIds, factoryMoveIds, moveName, recordMoveAnimationReads } from "./animAssetMoveReads.ts";
import { runSeed, type SoakPolicy } from "./../soak/randomRoundSoakDriver.ts";

// Assets some module imports as a value (the headless tick path reaches six, other animation modules the rest) stay in the main chunk.
function staticallyImported(): string[] {
  const found = new Set<string>();
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) visit(path);
      else if (entry.name.endsWith(".ts") && entry.name !== "animAssetsFull.ts") {
        for (const match of readFileSync(path, "utf8").matchAll(/^import (?!type )\w+ from "[^"]*animation\/assets\/([^"]+)\.json"|^import (?!type )\w+ from "\.\/assets\/([^"]+)\.json"/gm)) found.add((match[1] ?? match[2])!);
      }
    }
  };
  visit("src");
  return [...found].filter((name) => !name.includes("/")).sort();
}
const STATIC_EAGER = staticallyImported();

type Battle = { moves: number[]; reads: string[] };
/** One staged battle: the staged move, its set, and the lazy reads by attribution. */
type Staged = {
  move: number;
  set: number[];
  outcome: string;
  battleFrames: number;
  /** move-animation commands presented per move id: [player attacker, opponent attacker]. */
  presented: Record<string, [number, number]>;
  /** Render reads during a move-animation command, by the command's move id. */
  byMove: Record<string, string[]>;
  /** Render reads during any other battle command (general animations, switch-ins...), by command (`general-animation:NAME`, ...). */
  byCommand: Record<string, string[]>;
  /** Reads while no render ran (the tick). Must be empty. */
  tick: string[];
};

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1]!;
}
function write(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value));
}
const lazyOnly = (names: Iterable<string>): string[] => [...new Set(names)].filter((name) => !STATIC_EAGER.includes(name)).sort();

function moves(): void {
  const out: Record<string, { reads: string[]; fields: string[]; undrawn: string[] }> = {};
  const errors: string[] = [];
  const undrawn: string[] = [];
  let rows = 0;
  for (const id of allMoveIds()) {
    const result = recordMoveAnimationReads(id);
    out[id] = { reads: lazyOnly(result.reads), fields: result.fields, undrawn: result.undrawn };
    errors.push(...result.errors);
    undrawn.push(...result.undrawn.map((key) => `${id} ${moveName(id)} ${key}`));
    rows += result.rows;
  }
  console.log(`${Object.keys(out).length} moves, ${rows} body rows drawn, ${errors.length} variant errors, ${undrawn.length} requests with a body no row of which drew`);
  for (const error of errors) console.log("  error", error);
  for (const key of undrawn) console.log("  undrawn", key);
  write(arg("out", ".integration/fam1/moves.json"), out);
}

const MOVE_ID = new Map((movesData as unknown as { moves: { id: number; move: string }[] }).moves.map((row) => [row.move, row.id]));
const MOVE_SYMBOL = new Map([...MOVE_ID].map(([symbol, id]) => [id, symbol]));
const id = (symbol: string): number => MOVE_ID.get(`MOVE_${symbol}`)!;
// A move that fails when both sides only use it gets a helper that makes it work (the set is [move, helper, move, helper]; the soak's
// coverage-fight player cycles the slots, the AI picks either). Damage: heals and counters need a hit; sleep: Dream Eater, Nightmare,
// Snore, Sleep Talk; a last move to copy or block: Encore, Mimic, Disable, Spite, Mirror Move; Stockpile for Spit Up / Swallow; a status
// for Refresh and the heal-the-party moves; paralysis for Smelling Salt's bonus.
const HELPERS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  TACKLE: ["RECOVER", "SOFTBOILED", "MILK_DRINK", "SLACK_OFF", "MOONLIGHT", "MORNING_SUN", "SYNTHESIS", "REST", "COUNTER", "MIRROR_COAT",
    "BIDE", "ENDEAVOR", "ENCORE", "MIMIC", "DISABLE", "SPITE", "MIRROR_MOVE", "PAIN_SPLIT", "REVENGE", "WISH", "INGRAIN"],
  SPORE: ["DREAM_EATER", "NIGHTMARE", "SNORE", "SLEEP_TALK"],
  STOCKPILE: ["SPIT_UP", "SWALLOW"],
  TOXIC: ["REFRESH", "HEAL_BELL", "AROMATHERAPY", "FACADE"],
  THUNDER_WAVE: ["SMELLING_SALT"],
});
function stageSet(move: number): number[] {
  const symbol = MOVE_SYMBOL.get(move)!.slice(5);
  for (const [helper, list] of Object.entries(HELPERS)) if (list.includes(symbol)) return [move, id(helper), move, id(helper)];
  return [move, move, move, move];
}

// Every set's species is replaced too (by set id), from Water species that no move type misses (no Ghost / Normal / Ground / Flying /
// Dark / Steel type), that no status or Leech Seed skips (no Fire / Poison / Ice / Grass type), with a gender, and whose abilities block
// no move: both sides' moves then land on whoever is out (the Level 50 draft's own picks are a Ghost, a Rock / Ground and a Flying type).
const STAGE_SPECIES = ["KINGLER", "BLASTOISE", "FERALIGATR", "MILOTIC", "KINGDRA", "RELICANTH", "HUNTAIL", "GOREBYSS", "AZUMARILL", "CORSOLA"];

class StageStop extends Error {
  override readonly name = "StageStop";
}

function stage(): void {
  const all = factoryMoveIds();
  const [from, to] = arg("moves", `0:${all.length}`).split(":").map((value, index) => (value === "" ? (index === 0 ? 0 : all.length) : Number(value))) as [number, number];
  const maxBattleFrames = Number(arg("battle-frames", "9000"));
  const policy = arg("policy", "coverage-fight") as SoakPolicy;
  const entries = (frontierMonsData as unknown as { entries: { index: number; species: string; moves: string[] }[] }).entries;
  const original = entries.map((entry) => ({ species: entry.species, moves: [...entry.moves] }));
  for (const entry of entries) entry.species = `SPECIES_${STAGE_SPECIES[(entry.index * 7) % STAGE_SPECIES.length]}`;
  let context: string | null = null;
  let reads = new Set<string>();
  let current: Staged | null = null;
  const add = (map: Record<string, string[]>, key: string, name: string): void => {
    const list = (map[key] ??= []);
    if (!list.includes(name)) list.push(name);
  };
  installAnimAssets({
    get(name) {
      if (current !== null && !STATIC_EAGER.includes(name)) {
        if (!presentationRenderRunning()) {
          if (!current.tick.includes(name)) current.tick.push(name);
        } else if (context !== null) {
          if (context.startsWith("move:")) add(current.byMove, context.slice(5), name);
          else add(current.byCommand, context, name);
        }
        reads.add(name);
      }
      return bundledAnimAssetSource.get(name);
    },
  });
  const out: Staged[] = [];
  const started = Date.now();
  try {
    const only = arg("only", "");
    for (const move of only === "" ? all.slice(from, to) : only.split(",").map(Number)) {
      const set = stageSet(move);
      const symbols = set.map((value) => MOVE_SYMBOL.get(value)!);
      for (const entry of entries) entry.moves.splice(0, entry.moves.length, ...symbols);
      const staged: Staged = { move, set, outcome: "", battleFrames: 0, presented: {}, byMove: {}, byCommand: {}, tick: [] };
      current = staged;
      reads = new Set();
      context = null;
      let battleKey: string | null = null;
      let checked = false;
      const seen = new Set<object>();
      const observer = {
        beginSeed() {},
        recordPlayerFightCommit() {},
        observe(state: Parameters<typeof neededMoveIds>[0]) {
          const orchestrator = state.factoryRoundBattleOrchestrator;
          const inBattle = orchestrator !== null
            && (orchestrator.battleStartIntro !== null || orchestrator.battleCommandPresentation !== null || orchestrator.battleResolutionPresentation !== null);
          const key = orchestrator === null ? null : `${orchestrator.config.id}:${orchestrator.round.rules.battleIndex}`;
          if (battleKey === null && inBattle) battleKey = key;
          if (battleKey !== null && (key !== battleKey || state.factoryTerminal !== null || state.postwin !== null)) throw new StageStop("battle over");
          if (battleKey === null) {
            context = null;
            return;
          }
          staged.battleFrames += 1;
          if (staged.battleFrames > maxBattleFrames) throw new StageStop("frame cap");
          if (!checked && orchestrator!.battleCommandPresentation !== null) {
            // The patch took: every move the parties carry is the staged set's.
            checked = true;
            // SetMonMoveAvoidReturn: a Factory mon never carries Return (216); the game writes Frustration (218) instead.
            const named = [...neededMoveIds(state)].filter((value) => !set.map(setMonMoveAvoidReturn).includes(value));
            if (named.length > 0) throw new Error(`staged move ${move}: the parties also carry ${named.join(",")}`);
          }
          const resolution = orchestrator!.battleResolutionPresentation;
          const command = resolution?.segments[resolution.segmentIndex]?.commands[resolution.commandIndex];
          if (command === undefined) {
            context = "battle";
          } else if (command.type === "move-animation" && command.animation) {
            context = `move:${command.animation.moveId}`;
            if (!seen.has(command)) {
              seen.add(command);
              const count = (staged.presented[command.animation.moveId] ??= [0, 0]);
              count[command.animation.attacker] += 1;
            }
          } else {
            const name = (command as { animation?: unknown }).animation;
            context = `${command.type}${typeof name === "string" ? `:${name}` : ""}`;
          }
        },
      };
      const result = runSeed(move, { policy, scene: "on", renderEvery: 1, maxFrames: 60000, coverage: observer as never });
      staged.outcome = result.outcome === "CRASH" && result.errorName === "StageStop" ? `stop:${result.errorMessage}` : result.outcome
        + (result.errorMessage ? `:${result.errorMessage}` : "");
      for (const map of [staged.byMove, staged.byCommand]) for (const list of Object.values(map)) list.sort();
      staged.tick.sort();
      out.push(staged);
      const own = staged.presented[move] ?? [0, 0];
      console.error(`${move} ${moveName(move)} [${set.join(",")}]: ${staged.outcome} battle ${staged.battleFrames} frames, animated ${own[0]}+${own[1]}, `
        + `${reads.size} lazy files, tick ${staged.tick.length} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
    }
  } finally {
    entries.forEach((entry, index) => {
      entry.species = original[index]!.species;
      entry.moves.splice(0, entry.moves.length, ...original[index]!.moves);
    });
    current = null;
  }
  write(arg("out", ".integration/fam1/stage.json"), out);
}

type MovesRecording = Record<string, { reads: string[] }>;
function isStaged(value: unknown): value is Staged[] {
  return Array.isArray(value) && value.length > 0 && typeof (value[0] as Staged).move === "number" && (value[0] as Staged).byMove !== undefined;
}

function build(): void {
  const files = process.argv.slice(3).filter((file) => !file.startsWith("--"));
  const byMove = new Map<number, Set<string>>();
  const add = (move: number, names: Iterable<string>): void => {
    for (const name of lazyOnly(names)) (byMove.get(move) ?? byMove.set(move, new Set()).get(move)!).add(name);
  };
  let movesFiles = 0;
  let stagedBattles = 0;
  const tick: string[] = [];
  for (const file of files) {
    const data = JSON.parse(readFileSync(file, "utf8")) as unknown;
    if (isStaged(data)) {
      for (const battle of data) {
        stagedBattles += 1;
        for (const [move, names] of Object.entries(battle.byMove)) add(Number(move), names);
        // The rest of the battle's reads (the general animations the staged move causes): the staged move and its helpers.
        for (const names of Object.values(battle.byCommand)) for (const move of new Set(battle.set)) add(move, names);
        tick.push(...battle.tick.map((name) => `${battle.move}:${name}`));
      }
    } else {
      movesFiles += 1;
      for (const [move, entry] of Object.entries(data as MovesRecording)) add(Number(move), entry.reads);
    }
  }
  if (movesFiles === 0) throw new Error("build: give the `moves` recording (and the `stage` recordings)");
  console.log(`${movesFiles} moves recording(s), ${stagedBattles} staged battles; ${byMove.size} moves read a lazy file`);
  if (tick.length > 0) throw new Error(`reads on the tick (they must never happen; make the asset eager): ${tick.join(" ")}`);
  const previous = JSON.parse(readFileSync("src/assets/gen/anim-asset-moves.json", "utf8")) as { byMove: Record<string, string[]> };
  let added = 0;
  let removed = 0;
  let gained = 0;
  for (const [move, names] of byMove) {
    const before = new Set(previous.byMove[move] ?? []);
    const extra = [...names].filter((name) => !before.has(name));
    added += extra.length;
    if (extra.length > 0) gained += 1;
  }
  for (const [move, names] of Object.entries(previous.byMove)) removed += names.filter((name) => !byMove.get(Number(move))?.has(name)).length;
  console.log(`vs the committed table: ${gained} moves gain files (${added} pairs), ${removed} pairs dropped`);
  const factory = factoryMoveIds();
  console.log(`Factory moves: ${factory.length}, with files ${factory.filter((move) => byMove.has(move)).length}`);
  if (process.argv.includes("--write")) {
    const sorted = Object.fromEntries([...byMove].sort(([a], [b]) => a - b).map(([move, names]) => [String(move), [...names].sort()]));
    writeFileSync("src/assets/gen/anim-asset-moves.json", `${JSON.stringify({ eager: [...STATIC_EAGER].sort(), byMove: sorted })}\n`);
  }
}

function record(): void {
  const [from, to] = arg("seeds", "0:4").split(":").map(Number) as [number, number];
  const policy = arg("policy", "coverage-fight") as SoakPolicy;
  const maxFrames = Number(arg("max-frames", "40000"));
  const battles = new Map<string, { moves: Set<number>; reads: Set<string> }>();
  let current: { moves: Set<number>; reads: Set<string> } | null = null;
  installAnimAssets({
    get(name) {
      current?.reads.add(name);
      return bundledAnimAssetSource.get(name);
    },
  });
  for (let seed = from; seed < to; seed += 1) {
    current = null;
    const observer = {
      beginSeed() {},
      recordPlayerFightCommit() {},
      observe(state: Parameters<typeof neededMoveIds>[0]) {
        const id = state.factoryRoundBattleOrchestrator?.config.id;
        if (id === undefined) return;
        const key = `${seed}/${id}`;
        let entry = battles.get(key);
        if (entry === undefined) battles.set(key, (entry = { moves: new Set(), reads: new Set() }));
        current = entry;
        for (const move of neededMoveIds(state)) entry.moves.add(move);
      },
    };
    const result = runSeed(seed, { policy, scene: "on", renderEvery: 1, maxFrames, coverage: observer as never });
    console.error(`seed ${seed}: ${result.outcome} frames=${result.frames} battles=${battles.size}`);
  }
  const out: Battle[] = [...battles.values()].map((entry) => ({ moves: [...entry.moves].sort((a, b) => a - b), reads: [...entry.reads].sort() }));
  write(arg("out", ".integration/dl4/rec.json"), out);
}

/** Reads of recorded soak battles (and staged battles) that the committed table did not predict from the battle's moves. */
function check(): void {
  const table = JSON.parse(readFileSync("src/assets/gen/anim-asset-moves.json", "utf8")) as { byMove: Record<string, string[]> };
  const predicted = (moves: Iterable<number>): Set<string> => new Set([...moves].flatMap((move) => table.byMove[move] ?? []));
  let total = 0;
  let missed = 0;
  let battles = 0;
  let prefetched = 0;
  const missedNames = new Map<string, number>();
  for (const file of process.argv.slice(3).filter((name) => !name.startsWith("--"))) {
    const data = JSON.parse(readFileSync(file, "utf8")) as unknown;
    const list: Battle[] = isStaged(data)
      ? data.map((battle) => ({
        moves: [...new Set([...battle.set, ...Object.keys(battle.presented).map(Number)])],
        reads: [...new Set([...Object.values(battle.byMove).flat(), ...Object.values(battle.byCommand).flat()])],
      }))
      : (data as Battle[]);
    for (const battle of list) {
      battles += 1;
      const have = predicted(battle.moves);
      prefetched += have.size;
      for (const name of lazyOnly(battle.reads)) {
        total += 1;
        if (!have.has(name)) (missed += 1, missedNames.set(name, (missedNames.get(name) ?? 0) + 1));
      }
    }
  }
  console.log(`${battles} battles: ${missed} of ${total} lazy reads not predicted by the battle's moves`, [...missedNames].map(([name, count]) => `${name}(${count})`).join(" "));
  console.log(`files prefetched per battle (mean): ${(prefetched / Math.max(1, battles)).toFixed(1)}`);
}

const mode = process.argv[2];
if (mode === "moves") moves();
else if (mode === "stage") stage();
else if (mode === "build") build();
else if (mode === "record") record();
else if (mode === "check") check();
else throw new Error("usage: animAssetNeeds.ts moves|stage|build|record|check");
