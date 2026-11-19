// lse2: ROM-minus-ours SE rows of a soundEventProbe lab fixture (ours = the app replaying the fixture's trace).
//   node --experimental-strip-types --no-warnings tools/integration/lse2Se.ts <fixture.json> [maxFrame]
import { readFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { collectSoundTick } from "../../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../../src/engine/core.ts";
import { APP_STAGES } from "../compare/appTrace.ts";
import { traceAdvances } from "../compare/traceReplay.ts";

const [path, maxArg] = process.argv.slice(2) as [string, string | undefined];
const rom = JSON.parse(readFileSync(path, "utf8"));
const maxFrame = maxArg === undefined ? rom.frames : Number(maxArg);
let state: any = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene ?? "on" });
if (rom.trace.appStage !== undefined && rom.trace.appStage.frame === 0) state = APP_STAGES[rom.trace.appStage.id]!(state);
const ours: Array<{ frame: number; id: number }> = [];
for (const advance of traceAdvances(rom.trace.segments)) {
  if (advance.frame > maxFrame) break;
  const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
  state = result.result;
  for (const e of result.events) if (e.kind === "se" && e.id !== null) ours.push({ frame: e.frame, id: e.id });
}
const romSe = rom.events.filter((e: any) => e.kind === "se" && e.id !== null && e.frame <= maxFrame) as Array<{ frame: number; id: number }>;
const byId = new Map<number, number[]>();
for (const o of ours) byId.set(o.id, [...(byId.get(o.id) ?? []), o.frame]);
const used = new Map<number, number>();
const out: string[] = [];
let missing = 0;
for (const r of romSe) {
  const i = used.get(r.id) ?? 0;
  used.set(r.id, i + 1);
  const f = byId.get(r.id)?.[i];
  if (f === undefined) { missing += 1; out.push(`${r.id}@${r.frame} MISSING`); } else out.push(`${r.id}@${r.frame}:${r.frame - f >= 0 ? "+" : ""}${r.frame - f}`);
}
console.log(out.join(" "));
console.log(`rom ${romSe.length} ours ${ours.filter((o) => o.frame <= maxFrame).length} missing ${missing}`);
