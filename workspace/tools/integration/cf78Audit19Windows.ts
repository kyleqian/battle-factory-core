// cf78: audit 19's 599 consumer windows under the cf78 Castform gate. Per window: the slot forms at its body through PRODUCTION's
// applyLiveCastformFormEvents over the fixture history (every event strictly before the window's own body event), the field through
// withLiveCastformForms, and the gate liveCastformFormDeclines (liveMoveAnimationPresentation returns null on it before reading any
// lend / words / plan). `liveBefore` = the committed audit-19 lends.txt flag (production on 9115d5ec3 with the audit's lend replay);
// `liveAfter` = liveBefore && !gate. The audit-19 verdict (verdicts.txt) is carried for the px column.
//   node --experimental-strip-types --no-warnings tools/integration/cf78Audit19Windows.ts > out.jsonl
import { readdirSync, readFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import {
  applyLiveCastformFormEvents, LIVE_CASTFORM_FORMS_NORMAL, withLiveCastformForms,
} from "../../src/engine/battleResolutionPresentationRender.ts";
import { liveCastformFormDeclines } from "../../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const DIR = "tools/integration/fixtures/audit-19";
const lends = new Map(readFileSync(`${DIR}/receipts/lends.txt`, "utf8").split("\n").filter(Boolean)
  .map((line) => JSON.parse(line) as { fixture: string; live: boolean; decline: string | null }).map((row) => [row.fixture, row]));
const verdicts = new Map(readFileSync(`${DIR}/receipts/verdicts.txt`, "utf8").split("\n").filter(Boolean)
  .map((line) => [`${line.split(/\s+/)[0]}.json`, line.replace(/^\S+\s+\S+\s+\.\s+/, "")]));
for (const name of readdirSync(`${DIR}/fixtures`).filter((n) => n.endsWith(".json")).sort()) {
  const f = JSON.parse(readFileSync(`${DIR}/fixtures/${name}`, "utf8")) as Fixture & { precedingTurns: { events: unknown[] }[] };
  const events = f.precedingTurns.flatMap((turn) => turn.events);
  const forms = applyLiveCastformFormEvents(LIVE_CASTFORM_FORMS_NORMAL, events.map((payload, sequence) => ({ sequence, payload })),
    events.length - 1, true);
  const gate = liveCastformFormDeclines(withLiveCastformForms(liveView(f, 0).field, forms));
  const before = lends.get(name);
  if (before === undefined) throw new Error(`${name}: no lends.txt line`);
  console.log(JSON.stringify({ fixture: name, forms, gate, liveBefore: before.live, liveAfter: before.live && !gate,
    declineBefore: before.decline, audit19: verdicts.get(name) ?? null }));
}
