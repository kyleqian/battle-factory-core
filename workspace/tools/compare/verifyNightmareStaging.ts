/** Hermetic verifier for the compact, no-credit MOVE_NIGHTMARE staging receipt. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const read = (path: string): Buffer => readFileSync(resolve(root, path));
const json = (path: string): Json => JSON.parse(read(path).toString("utf8")) as Json;
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const stable = (value: any): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const fail = (message: string): never => { throw new Error(`Nightmare staging receipt drifted: ${message}`); };

const receipt = json("tools/compare/fixtures/nightmare-staging-receipt.json");
const auditText = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/nightmareSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 << 20 });
if (sha(read(receipt.source.audit)) !== receipt.source.auditSha256 || sha(read(receipt.source.probe)) !== receipt.source.probeSha256 || sha(auditText) !== receipt.source.auditRunSha256) fail("source/probe hash");
const audit = JSON.parse(auditText) as Json;
const components = ["subroutine:NightmareInContest", "task:AnimTask_BlendMonInAndOut", "task:AnimTask_NightmareClone", "task:AnimTask_ShakeMon", "visualCommand:clearmonbg", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:waitbgfadein"];
if (audit.move !== "MOVE_NIGHTMARE" || audit.moveId !== 171 || audit.status !== "unsupported-source-staging-checkpoint" || audit.coverageCredit !== false) fail("source classification");
if (JSON.stringify(audit.graph.components) !== JSON.stringify(components) || audit.graph.track.fulfilled !== false || JSON.stringify(audit.graph.track.representatives) !== JSON.stringify(["MOVE_NIGHTMARE"])) fail("component track");
if (JSON.stringify(audit.carriers.allFactory.map((entry: Json) => entry.index)) !== JSON.stringify(receipt.carrierCensus.allFactory) || JSON.stringify(audit.carriers.level50.map((entry: Json) => entry.index)) !== JSON.stringify(receipt.carrierCensus.level50)) fail("carrier census");
if (audit.source.pointerOwnedRoot.rom.romSha256 !== receipt.source.pointerOwnedRoot.romSha256 || audit.source.pointerOwnedRoot.rom.start !== receipt.source.pointerOwnedRoot.start || audit.source.pointerOwnedRoot.rom.endExclusive !== receipt.source.pointerOwnedRoot.endExclusive) fail("pointer-owned ROM root");
if (!audit.controls.kind.includes("no Nightmare timing") || Object.keys(audit.controls.named).length !== 14) fail("identity-only controls");

const coverage = json("ANIMATION_COVERAGE.json");
if (coverage.entries.find((entry: Json) => entry.move === "MOVE_NIGHTMARE")?.status !== "exact"
  || coverage.queue.includes("MOVE_NIGHTMARE")) fail("exact coverage boundary");
const track = coverage.componentTracks.find((entry: Json) => entry.id === "nightmare-clone-blend");
if (!track || track.fulfilled !== false || JSON.stringify(track.components) !== JSON.stringify(components)) fail("unfulfilled track declaration");

for (const [orientation, sides] of Object.entries({ "player-back": ["player", "opponent", 0, 1], "opponent-front": ["opponent", "player", 1, 0] }) as [string, [string, string, number, number]][]) {
  const run = receipt.runs[orientation] as Json;
  const output = run.output as Json;
  const stage = json(run.scenario);
  if (sha(read(run.scenario)) !== run.scenarioSha256 || sha(`${stable(output)}\n`) !== run.outputSha256) fail(`${orientation} deterministic output`);
  if (run.freshRuns !== 2 || !run.outputsByteIdentical || output.schema !== "nightmare-compact-staging/v2" || output.oracleProfile !== "battle-scene-on") fail(`${orientation} fresh Scene-ON receipt`);
  if (stage.mode !== "mechanicLab" || stage.profile !== "battle-scene-on" || Object.keys(stage.overrides).join() !== "parties" || stage.overrides.parties.player.length !== 3 || stage.overrides.parties.opponent.length !== 3) fail(`${orientation} party-before-init stage`);
  if (output.attacker.side !== sides[0] || output.target.side !== sides[1] || output.root.first.attackerBattler !== sides[2] || output.root.first.targetBattler !== sides[3]) fail(`${orientation} orientation`);
  if (output.root.symbol !== "Move_NIGHTMARE" || output.root.observations !== 168 || output.root.first.currentMove !== 171 || !output.root.first.scriptActive || output.root.first.targetStatus1 === 0) fail(`${orientation} root/sleep prerequisite`);
  if (output.stockOutcome.nightmareEffect.targetStatus2 !== 134217728 || output.stockOutcome.targetStatus.kind !== "sleep" || output.stockOutcome.battleOutcome !== 0) fail(`${orientation} stock Nightmare effect`);
  if (output.pp.spent !== 1 || output.cleanup.visualTasks !== 0 || output.cleanup.soundTasks !== 0 || !output.benches.unchanged || !output.benches.checksumValid || output.benches.beforeSha256 !== output.benches.afterSha256) fail(`${orientation} PP/cleanup/benches`);
  if (!output.sourceInitialized || !output.customPartiesBuiltBeforeBattle || !output.transientFreeSetup || output.entryHooks.weather !== 0 || output.entryHooks.weatherTurns !== 0) fail(`${orientation} transient-free builder`);
  if (output.scope.battleStateInjected || output.scope.transientOverrides.length !== 0 || output.scope.framebuffersRetained || output.scope.rawRgbRetained || output.scope.denseWindowCaptured || output.scope.latchMeasured || output.scope.productionChanged || output.scope.reducerAdded || output.scope.typedSceneOnSeam || output.scope.compositorAdded || output.scope.coveragePromotion || output.scope.componentTrackFulfilled || !output.scope.noTimingOrLatchTransfer) fail(`${orientation} no-credit scope`);
}
for (const [key, value] of Object.entries(receipt.scope)) {
  if (key === "noTimingOrLatchTransfer") {
    if (value !== true) fail("no timing or latch transfer");
  } else if (key === "transientOverrides") {
    if (JSON.stringify(value) !== "[]") fail("transient override declaration");
  } else if (value !== false) fail(`receipt scope ${key}`);
}

console.log(JSON.stringify({
  schema: "nightmare-source-staging-verifier/v1",
  auditRunSha256: receipt.source.auditRunSha256,
  runs: Object.fromEntries(Object.entries(receipt.runs).map(([orientation, run]: [string, any]) => [orientation, { outputSha256: run.outputSha256, rootObservations: run.output.root.observations, ppSpent: run.output.pp.spent }])),
}, null, 2));
