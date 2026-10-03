#!/usr/bin/env -S npx tsx
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";

if (process.argv.length !== 4) {
  throw new Error("usage: verifyKnownEntrySpriteAllocator.ts <raw-directory> <receipt.json>");
}

const rawDirectory = resolve(process.argv[2]!);
const receiptPath = resolve(process.argv[3]!);
const root = resolve(import.meta.dirname, "../..");
const names = [
  "player-exeggcute-a", "player-exeggcute-b",
  "opponent-exeggcute-a", "opponent-exeggcute-b",
  "player-slowpoke-a", "player-slowpoke-b",
] as const;

const sha = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");
const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};
type RawCall = {
  kind: string; caller: string; slotArgument: number | null; resultSlot?: number | null;
  step: number; template: null | { names: string[]; paletteTag: number; callbackNames: string[] };
};
type Raw = {
  schema: string; toolSha256: string;
  referenceSha256: Record<string, string>; sourceSha256: Record<string, string>;
  calls: RawCall[]; commandPrompt: { slot: number; templateNames: string[] }[];
  firstMove: { slot: number; templateNames: string[] }[];
  battlerSpriteIds: number[]; healthboxSpriteIds: number[]; historyBound: string;
};

const probe = resolve(root, "tools/compare/lightScreenAllocatorCallProbe.py");
const probeSha256 = sha(probe);
const provider = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles");
const expectedPrompt = provider.commandPrompt.occupants.map(({ slot }) => slot);
const expectedFirstMove = provider.firstMove.occupants.map(({ slot }) => slot);
const summaries = [];

for (const name of names) {
  const path = resolve(rawDirectory, `${name}.json`);
  const raw = JSON.parse(readFileSync(path, "utf8")) as Raw;
  assert(raw.schema === "known-entry-sprite-allocator-calls/v1", `${name}: schema`);
  assert(raw.toolSha256 === probeSha256, `${name}: stale probe hash`);
  for (const [filename, digest] of Object.entries(raw.referenceSha256)) {
    assert(sha(resolve(root, "reference/pokeemerald", filename)) === digest, `${name}: stale ${filename}`);
  }
  for (const [filename, digest] of Object.entries(raw.sourceSha256)) {
    assert(sha(resolve(root, "reference/pokeemerald", filename)) === digest, `${name}: stale ${filename}`);
  }
  assert(JSON.stringify(raw.commandPrompt.map(row => row.slot)) === JSON.stringify(expectedPrompt), `${name}: prompt provider mismatch`);
  assert(JSON.stringify(raw.firstMove.map(row => row.slot)) === JSON.stringify(expectedFirstMove), `${name}: first-move provider mismatch`);
  assert(JSON.stringify(raw.battlerSpriteIds) === JSON.stringify([6, 8]), `${name}: battler owner ids`);
  assert(JSON.stringify(raw.healthboxSpriteIds) === JSON.stringify([0, 1]), `${name}: healthbox owner ids`);
  assert(raw.firstMove.find(row => row.slot === 2)?.templateNames.includes("gSpriteTemplate_EnemyShadow"), `${name}: shadow owner`);
  assert(raw.firstMove.find(row => row.slot === 6)?.templateNames.includes("gMultiuseSpriteTemplate"), `${name}: player owner`);
  assert(raw.firstMove.find(row => row.slot === 8)?.templateNames.includes("gMultiuseSpriteTemplate"), `${name}: opponent owner`);

  const top = raw.calls.filter(call => call.kind !== "CreateSpriteAt");
  const results = (caller: string, kind: string) => top
    .filter(call => call.caller.startsWith(caller) && call.kind === kind)
    .map(call => call.resultSlot);
  assert(JSON.stringify(results("CreateBattlerHealthboxSprites", "CreateSprite")) === JSON.stringify([0, 1]), `${name}: healthbox first-hole order`);
  assert(JSON.stringify(results("CreateBattlerHealthboxSprites", "CreateSpriteAtEnd")) === JSON.stringify([63, 62, 61, 60]), `${name}: healthbox end-hole order`);
  assert(JSON.stringify(results("CreatePartyStatusSummarySprites", "CreateSprite")) === JSON.stringify([5, 6]), `${name}: summary bars`);
  assert(JSON.stringify(results("CreatePartyStatusSummarySprites", "CreateSpriteAtEnd")) === JSON.stringify([59, 58, 57, 56, 55, 54, 53, 52, 51, 50, 49, 48]), `${name}: summary ball loop`);
  assert(results("PlayerHandleDrawTrainerPic", "CreateSprite")[0] === 3, `${name}: player trainer owner`);
  assert(results("OpponentHandleDrawTrainerPic", "CreateSprite")[0] === 4, `${name}: opponent trainer owner`);
  assert(results("StartSendOutAnim", "CreateSprite").join(",") === "8,6", `${name}: battler source order`);

  const operationsAt = (step: number) => top.filter(call => call.step === step)
    .map(call => [call.kind, call.slotArgument ?? call.resultSlot]);
  const stepMatching = (predicate: (calls: RawCall[]) => boolean): number => {
    const steps = [...new Set(top.map(call => call.step))];
    const found = steps.find(step => predicate(top.filter(call => call.step === step)));
    if (found === undefined) throw new Error(`${name}: required operation group missing`);
    return found;
  };
  const opponentBallReuse = stepMatching(calls => calls.some(call => call.caller.startsWith("HandleBallAnimEnd") && call.slotArgument === 9));
  assert(JSON.stringify(operationsAt(opponentBallReuse)) === JSON.stringify([["DestroySprite", 9], ["CreateSprite", 9]]), `${name}: opponent ball reuse`);
  const opponentSummary = stepMatching(calls => calls.some(call => call.caller.startsWith("Task_HidePartyStatusSummary_BattleStart_2") && call.slotArgument === 6));
  assert(JSON.stringify(operationsAt(opponentSummary)) === JSON.stringify([
    ["DestroySprite", 6], ["DestroySprite", 53], ["DestroySprite", 52],
    ["DestroySprite", 51], ["DestroySprite", 50], ["DestroySprite", 49],
    ["DestroySprite", 48], ["CreateSprite", 6],
  ]), `${name}: opponent summary/particle order`);
  const playerSummary = stepMatching(calls => calls.some(call => call.caller.startsWith("DestroySpriteAndFreeResources") && call.slotArgument === 5));
  assert(JSON.stringify(operationsAt(playerSummary)) === JSON.stringify([
    ["DestroySprite", 5], ["DestroySprite", 59], ["DestroySprite", 58],
    ["DestroySprite", 57], ["DestroySprite", 56], ["DestroySprite", 55],
    ["DestroySprite", 54], ["CreateSprite", 5],
  ]), `${name}: player summary/ball order`);
  const playerBallReuse = stepMatching(calls => calls.some(call => call.caller.startsWith("HandleBallAnimEnd") && call.slotArgument === 5));
  assert(JSON.stringify(operationsAt(playerBallReuse)) === JSON.stringify([["DestroySprite", 5], ["CreateSprite", 5]]), `${name}: player ball reuse`);
  const cursorStep = stepMatching(calls => calls.some(call => call.caller.startsWith("EndBounceEffect")));
  assert(JSON.stringify(operationsAt(cursorStep)) === JSON.stringify([["DestroySprite", 3], ["DestroySprite", 4]]), `${name}: cursor cleanup order`);

  const mutableTemplates = top.filter(call => call.template?.names.includes("gMultiuseSpriteTemplate"));
  assert(mutableTemplates.length === 4, `${name}: mutable template count`);
  assert(new Set(mutableTemplates.map(call => call.template!.paletteTag)).size >= 3, `${name}: mutable template snapshots`);
  summaries.push({ name, rawSha256: sha(path), calls: raw.calls.length, cursorStep });
}

for (const [left, right] of [
  ["player-exeggcute-a", "player-exeggcute-b"],
  ["opponent-exeggcute-a", "opponent-exeggcute-b"],
  ["player-slowpoke-a", "player-slowpoke-b"],
] as const) {
  assert(sha(resolve(rawDirectory, `${left}.json`)) === sha(resolve(rawDirectory, `${right}.json`)), `${left}/${right}: fresh pair differs`);
}

const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const first = JSON.parse(readFileSync(resolve(rawDirectory, `${names[0]}.json`), "utf8")) as Raw;
const receipt = {
  schema: "known-entry-sprite-allocator-provider-verification/v1",
  testedCommit: git("rev-parse", "HEAD"), testedTree: git("write-tree"),
  probeSha256, verifierSha256: sha(import.meta.filename),
  referenceSha256: first.referenceSha256, sourceSha256: first.sourceSha256,
  runs: summaries,
  provider: {
    route: provider.route, commandPromptSlots: expectedPrompt,
    firstMoveSlots: expectedFirstMove,
    owners: provider.firstMove.occupants,
  },
  historyBound: first.historyBound,
  verdict: "six fresh stock-ROM runs reproduce exact allocator call order and the pure known-entry provider topology before the first legal move",
  unsupported: ["unknown entry", "switch", "in-battle summary", "substitute", "transform"],
};
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ runs: summaries.length, calls: summaries.map(row => row.calls), testedTree: receipt.testedTree }));
