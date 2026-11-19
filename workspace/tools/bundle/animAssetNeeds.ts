// dl4: records which animation asset files each battle's frames read and derives src/assets/gen/anim-asset-moves.json (move id -> asset files)
// and the always-loaded general set. Method: play Scene ON soak seeds with every frame rendered over the full asset table with a recording
// source; per battle keep (moves the battle named, assets read); an asset's moves are the intersection of the move sets of the battles that
// read it. Over-attribution only prefetches one file more; a missed one is covered by the loop's hold (docs/dl3-per-species-pictures.md, dl4).
//   node --experimental-strip-types tools/bundle/animAssetNeeds.ts record --seeds 0:6 --policy coverage-fight --out .integration/dl4/rec-a.json
//   node --experimental-strip-types tools/bundle/animAssetNeeds.ts build .integration/dl4/rec-*.json   (prints the report, writes the table with --write)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { bundledAnimAssetSource } from "../../src/engine/animAssetsInstall.ts";
import { installAnimAssets } from "../../src/engine/animAssets.ts";
import { neededMoveIds } from "../../src/engine/animAssetNeeds.ts";
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

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : process.argv[at + 1]!;
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
  writeFileSync(arg("out", ".integration/dl4/rec.json"), JSON.stringify(out));
}

function build(): void {
  const files = process.argv.slice(3).filter((file) => !file.startsWith("--"));
  const battles: Battle[] = files.flatMap((file) => JSON.parse(readFileSync(file, "utf8")) as Battle[]);
  const readers = new Map<string, Battle[]>();
  for (const battle of battles) for (const name of battle.reads) (readers.get(name) ?? readers.set(name, []).get(name)!).push(battle);
  const generalShare = Number(arg("general-share", "0.15"));
  const norm = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const moves = (JSON.parse(readFileSync("src/data/gen/moves.json", "utf8")) as { moves: { id: number; move: string }[] }).moves.filter((move) => move.id > 0);
  const assets = readdirSync("src/animation/assets").map((file) => file.slice(0, -5));
  // A move's own asset carries its name (`knock-off`, `furySwipes`, `sand-tomb-mud-sand`): this covers moves the soaks never played.
  const aliases: Record<string, string> = { "purple-flame": "GRUDGE", "kadabra-front": "ROLE_PLAY", "water-orb": "HYDRO_PUMP", "rain-drops": "RAIN_DANCE" };
  const named = (name: string): number[] =>
    moves.filter((move) => (aliases[name] !== undefined ? move.move === `MOVE_${aliases[name]}` : norm(name).startsWith(norm(move.move.slice(5))))).map((move) => move.id);
  const general: string[] = [];
  const byAsset: Record<string, number[]> = {};
  const orphans: string[] = [];
  const unexplained: string[] = [];
  for (const name of assets) {
    if (STATIC_EAGER.includes(name)) continue;
    const own = named(name);
    const list = readers.get(name) ?? [];
    if (own.length === 0) unexplained.push(name);
    // Battles that read the asset although none of its own moves is named: the moves they share are the other users of the file.
    const strays = own.length === 0 ? list : list.filter((battle) => !battle.moves.some((id) => own.includes(id)));
    if (strays.length >= generalShare * battles.length) {
      general.push(name);
      continue;
    }
    let inter: Set<number> | null = null;
    for (const battle of strays) inter = inter === null ? new Set(battle.moves) : new Set(battle.moves.filter((move) => inter!.has(move)));
    const ids = new Set([...own, ...(inter ?? [])]);
    if (ids.size === 0) orphans.push(name);
    byAsset[name] = [...ids].sort((a, b) => a - b);
  }
  console.log(`${battles.length} battles, ${readers.size} assets read of ${assets.length}, ${general.length} general, ${orphans.length} without any move`);
  console.log("general:", general.sort().join(" "));
  console.log("orphans:", orphans.sort().join(" "));
  console.log("not named like a move:", unexplained.sort().join(" "));
  const predicted = new Map<number, Set<string>>();
  for (const [name, ids] of Object.entries(byAsset)) for (const id of ids) (predicted.get(id) ?? predicted.set(id, new Set()).get(id)!).add(name);
  let missed = 0;
  let total = 0;
  const missedNames = new Map<string, number>();
  for (const battle of battles) {
    const have = new Set(battle.moves.flatMap((id) => [...(predicted.get(id) ?? [])]));
    for (const name of battle.reads) {
      if (STATIC_EAGER.includes(name) || general.includes(name)) continue;
      total += 1;
      if (!have.has(name)) (missed += 1, missedNames.set(name, (missedNames.get(name) ?? 0) + 1));
    }
  }
  console.log(`reads not predicted by the battle's moves: ${missed} of ${total}`, [...missedNames].map(([name, count]) => `${name}(${count})`).join(" "));
  console.log("assets prefetched per battle (mean, general excluded):", (battles.reduce((sum, battle) => sum + new Set(battle.moves.flatMap((id) => [...(predicted.get(id) ?? [])])).size, 0) / battles.length).toFixed(1));
  const byMove: Record<string, string[]> = {};
  for (const [name, moves] of Object.entries(byAsset)) for (const move of moves) (byMove[move] ??= []).push(name);
  for (const move of Object.keys(byMove)) byMove[move]!.sort();
  if (process.argv.includes("--write")) {
    const sorted = Object.fromEntries(Object.entries(byMove).sort(([a], [b]) => Number(a) - Number(b)));
    writeFileSync("src/assets/gen/anim-asset-moves.json", `${JSON.stringify({ eager: [...STATIC_EAGER].sort(), byMove: sorted })}\n`);
  }
}

const mode = process.argv[2];
if (mode === "record") record();
else if (mode === "build") build();
else throw new Error("usage: animAssetNeeds.ts record|build");
