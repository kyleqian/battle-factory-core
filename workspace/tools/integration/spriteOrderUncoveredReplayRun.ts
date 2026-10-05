// CLI for spriteOrderUncoveredReplay.ts: strict replay of the proposed unit transforms; prints the summary, `--write` stores replay-receipt.json.
//   run: npx vite-node tools/integration/spriteOrderUncoveredReplayRun.ts [-- --write]
import { writeFileSync } from "node:fs";
import { LAB_TRACES, ROUTE_TRACES, UNIT_PLANS, replay, type Mode } from "./spriteOrderUncoveredReplay.ts";

{
  const rows: ReturnType<typeof replay>[] = [];
  for (const name of [...ROUTE_TRACES, ...LAB_TRACES.map(n => `lab:${n}`)]) {
    for (const mode of ["baseline", "modelled"] as const) for (const isolated of [false, true]) rows.push(replay(name, mode, isolated));
  }
  const sum = (mode: Mode, isolated: boolean, set: (n: string) => boolean) => {
    const l = rows.filter(r => r.mode === mode && r.isolated === isolated && set(r.trace));
    const add = (f: (r: (typeof rows)[number]) => number) => l.reduce((a, r) => a + f(r), 0);
    return { traces: l.length, moveEdges: add(r => r.moveEdges.edges), known: add(r => r.moveEdges.known), tested: add(r => r.moveEdges.tested), exact: add(r => r.moveEdges.exact), mismatched: add(r => r.moveEdges.mismatched),
      occupiedMismatch: add(r => r.moveEdges.occupiedMismatch + r.animEdges.occupiedMismatch), lent: add(r => r.moveEdges.lent), animKnown: add(r => r.animEdges.known), animMismatched: add(r => r.animEdges.mismatched),
      unitChecks: add(r => r.unitChecks.strict.checks + r.unitChecks.isolated.checks), unitExact: add(r => r.unitChecks.strict.exact + r.unitChecks.isolated.exact),
      unitMismatched: add(r => r.unitChecks.strict.mismatched + r.unitChecks.isolated.mismatched) };
  };
  const summary: Record<string, unknown> = {};
  for (const [label, set] of [["route", (n: string) => !n.startsWith("lab:")], ["lab", (n: string) => n.startsWith("lab:")]] as const) {
    for (const mode of ["baseline", "modelled"] as const) for (const isolated of [false, true]) summary[`${label}/${mode}/${isolated ? "isolated" : "strict"}`] = sum(mode, isolated, set);
  }
  console.log(JSON.stringify(summary, null, 1));
  for (const r of rows.filter(x => x.mode === "modelled")) {
    console.log(r.trace.padEnd(40), r.isolated ? "iso   " : "strict", "move", JSON.stringify(r.moveEdges), "units", JSON.stringify(r.unitChecks), "first-invalid", r.firstInvalidation?.frame, r.firstInvalidation?.reason.slice(0, 70));
  }
  if (process.argv.includes("--write")) {
    writeFileSync(new URL("./fixtures/sprite-order-uncovered/replay-receipt.json", import.meta.url), `${JSON.stringify({ schema: "sprite-order-uncovered-replay/v1", unitPlans: UNIT_PLANS, summary, results: rows })}\n`);
  }
}
