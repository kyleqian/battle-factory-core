// pmo239: replays saved play:random session traces (tools/browser/randomPlay.mjs --out DIR, *.session.json / traces in the summary) through
// the engine and checks every in-battle party menu the session opened: the voluntary menu's row 0 is the ACTIVE mon (OpenPartyMenuInBattle
// keeps the cursor on row 0), the forced menu's row 0 is the fainted mon with the cursor on it, rows always permute 0..2.
//   node --experimental-strip-types tools/integration/pmo239OpenOnActive.ts <session.json>...
import { readFileSync } from "node:fs";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { presentationRngFromTrace } from "../../src/engine/presentationRngHost.ts";
import { normalizeButtons } from "../../src/input.ts";
import type { RecordedSegment, SessionTrace } from "../../src/sessionRecorder.ts";

let voluntary = 0;
let voluntaryNonIdentity = 0;
let forced = 0;
let forcedNonIdentity = 0;
const problems: string[] = [];

for (const file of process.argv.slice(2)) {
  const parsed = JSON.parse(readFileSync(file, "utf8")) as SessionTrace & { session?: SessionTrace };
  const trace = parsed.session && Array.isArray(parsed.session.segments) ? parsed.session : parsed;
  const rng = presentationRngFromTrace(trace);
  let state = createInitialState({
    ...(trace.appRoute ? { appRoute: trace.appRoute as never } : {}),
    battleScene: trace.battleScene ?? "off",
    presentationSeed: rng.seed,
    presentationRngPolicy: rng.policy,
  });
  let frame = 0;
  let voluntaryOpen = false;
  let forcedOpen = false;
  try {
    for (const segment of trace.segments as RecordedSegment[]) {
      const buttons = new Set(normalizeButtons(segment.buttons ?? []));
      for (let i = 0; i < segment.frames; i += 1) {
        state = tick(state, buttons);
        frame += 1;
        const orchestrator = (state as any).factoryRoundBattleOrchestrator;
        if (!orchestrator) continue;
        const rows = (select: any) => (select.rows ?? select.party).map((row: any) => row.partyIndex) as number[];
        const identity = (list: number[]) => list.every((value, index) => value === index);
        const voluntarySelect = orchestrator.battlePartySelect;
        if (voluntarySelect && !voluntaryOpen && orchestrator.battle) {
          const list = rows(voluntarySelect);
          const active = orchestrator.battle.rules.rulesContext.battlers[0].partyIndex;
          voluntary += 1;
          if (!identity(list)) voluntaryNonIdentity += 1;
          if (list[0] !== active || [...list].sort().join() !== "0,1,2") problems.push(`${file}:${frame}: voluntary rows ${list.join(",")} active ${active}`);
        }
        voluntaryOpen = Boolean(voluntarySelect);
        const forcedSelect = orchestrator.battleForcedPartySelect;
        if (forcedSelect && !forcedOpen && typeof forcedSelect.cursor === "number") {
          const list = rows(forcedSelect);
          forced += 1;
          if (!identity(list)) forcedNonIdentity += 1;
          if (list[0] !== forcedSelect.request.faintedPartyIndex || forcedSelect.cursor !== 0) problems.push(`${file}:${frame}: forced rows ${list.join(",")} fainted ${forcedSelect.request.faintedPartyIndex} cursor ${forcedSelect.cursor}`);
        }
        forcedOpen = Boolean(forcedSelect);
      }
    }
  } catch (error) {
    problems.push(`${file}: engine threw at frame ${frame}: ${String(error)}`);
  }
}
console.log(JSON.stringify({ voluntary, voluntaryNonIdentity, forced, forcedNonIdentity, problems }, null, 1));
process.exit(problems.length === 0 ? 0 : 1);
