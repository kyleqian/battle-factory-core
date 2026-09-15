import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const read = (path: string): Buffer => readFileSync(resolve(root, path));
const json = (path: string): Json => JSON.parse(read(path).toString("utf8")) as Json;
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const receipt = json("tools/compare/fixtures/shock-wave-staging-receipt.json");
const auditText = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/shockWaveSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 << 20 });
if (sha(auditText) !== receipt.source.auditRunSha256 || sha(read(receipt.source.audit)) !== receipt.source.auditSha256 || sha(read(receipt.source.probe)) !== receipt.source.probeSha256) throw new Error("Shock Wave source/probe receipt drifted");
const audit = JSON.parse(auditText) as Json;
if (audit.source.pointerOwnedRoot.rom.romSha256 !== receipt.source.pointerOwnedRoot.romSha256 || JSON.stringify(audit.carriers.level50.map((entry: Json) => entry.index)) !== JSON.stringify(receipt.factoryLegalSelection.level50Carriers)) throw new Error("Shock Wave source/carrier receipt drifted");
for (const run of Object.values(receipt.runs) as Json[]) {
  if (sha(read(run.scenario)) !== run.scenarioSha256 || run.freshRuns !== 2 || !run.outputsByteIdentical || run.pp.spent !== 1 || run.attacker.moves.some((move: number) => move !== 351) || run.target.moves.some((move: number) => move !== 243)) throw new Error(`Shock Wave staging receipt drifted: ${run.scenario}`);
  const stage = json(run.scenario);
  if (stage.profile !== "battle-scene-on" || Object.keys(stage.overrides).join() !== "parties" || stage.overrides.parties.player.length !== 3 || stage.overrides.parties.opponent.length !== 3) throw new Error("Shock Wave legal party staging drifted");
}
for (const [key, value] of Object.entries(receipt.scope)) if (key !== "noTimingOrLatchTransfer" && value !== false) throw new Error(`Shock Wave no-credit scope drifted: ${key}`);
if (receipt.scope.noTimingOrLatchTransfer !== true) throw new Error("Shock Wave non-transfer boundary drifted");
console.log(JSON.stringify({ schema: "shock-wave-source-staging-verifier/v1", auditRunSha256: receipt.source.auditRunSha256, runs: Object.fromEntries(Object.entries(receipt.runs).map(([key, run]: [string, any]) => [key, { outputSha256: run.outputSha256, rootObservations: run.root.observations, firstInactiveCleanupFrame: run.root.firstInactiveCleanupFrame }])) }, null, 2));
