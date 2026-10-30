// apx227 (ISSUES #157): the production Scene ON renderer over a census battle, every presented frame, with the weather-continues
// general-animation event's battler as the kernel emits it (variant A, the last attacker) or rewritten to battler 0 before every
// consumer reads it (variant B, the ROM's value). Prints per-frame sha256 digests of both so the two can be compared byte for byte,
// and the frames on which a RAIN / SUN / SANDSTORM / HAIL_CONTINUES event is presented (with the emitted battler).
// Driver = apx217TransformStrips.ts' census loop (battle i = seed i, rentals 0..2, least-used legal move, presentation RNG ticked as production does).
//   node --experimental-strip-types --no-warnings tools/integration/apx227WeatherWindow.ts --seed=89 [--battler0] [--out=run.json] [--dump=DIR [--frames=f,f,..]]
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const seed = Number(arg("seed")), battler0 = process.argv.includes("--battler0"), outPath = arg("out"), dumpDir = arg("dump");
const dumpFrames = arg("frames") === undefined ? undefined : new Set(arg("frames")!.split(",").map(Number));
const WEATHER = new Set(["RAIN_CONTINUES", "SUN_CONTINUES", "SANDSTORM_CONTINUES", "HAIL_CONTINUES"]);
const isWeatherEvent = (e: any) => e?.payload?.kind === "animation"
  && (WEATHER.has(e.payload.animationId) || (e.payload.animationId === "WEATHER_VAR" && ["12", "13"].includes(e.payload.arguments?.[0])));

const remapped = new WeakMap<object, object>();
const remapSegment = (segment: any) => {
  if (!segment.events.some((e: any) => isWeatherEvent(e) && e.payload.battler !== 0)) return segment;
  let next = remapped.get(segment);
  if (next === undefined) {
    next = Object.freeze({ ...segment, events: Object.freeze(segment.events.map((e: any) => isWeatherEvent(e) && e.payload.battler !== 0
      ? Object.freeze({ ...e, payload: Object.freeze({ ...e.payload, battler: 0 }) }) : e)) });
    remapped.set(segment, next);
  }
  return next;
};
const withBattler0 = (state: any) => {
  const r = state.battleResolutionPresentation;
  if (!battler0 || !r) return state;
  const segments = r.segments.map(remapSegment);
  return segments.every((s: any, i: number) => s === r.segments[i]) ? state : { ...state, battleResolutionPresentation: { ...r, segments } };
};

let state: any = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
  id: `live-share-census-${seed}-${(seed * 11) % 49}`, rngValue: seed, battleScene: "on",
  factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
  battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
  rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
}));
let rng = createPresentationRngSession();
let frame = 0, ended = false;
const live = new Uint8Array(240 * 160 * 4);
const rows: { frame: number; sha: string; weather?: { animationId: string; battler: number }[]; text?: string }[] = [];
let weatherFrames = 0;
const seenWeather: string[] = [];
const step = (buttons: readonly string[] = []) => {
  if (++frame > 200000) throw new Error("frame budget");
  state = withBattler0(state);
  if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons) as never);
  else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons) as never);
  else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons) as never);
  state = withBattler0(state);
  rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
  const r = state.battleResolutionPresentation as any;
  if (r?.lifecycle.phase === "presenting") {
    const seg = r.segments[r.segmentIndex];
    const command = seg?.commands[r.commandIndex];
    const weather = (seg?.events ?? []).filter(isWeatherEvent).map((e: any) => ({ animationId: e.payload.animationId, battler: e.payload.battler }));
    const view = createBattleResolutionPresentationRenderView(r, rng.host);
    live.fill(0);
    renderBattleResolutionLiveView(live, view);
    const sha = createHash("sha256").update(live).digest("hex").slice(0, 16);
    const text = command?.type === "message" ? command.lines.join(" / ") : undefined;
    rows.push({ frame, sha, ...(weather.length ? { weather } : {}), ...(text !== undefined ? { text } : {}) });
    if (weather.length) { weatherFrames += 1; seenWeather.push(JSON.stringify(weather)); }
    if (dumpDir !== undefined && (dumpFrames === undefined || dumpFrames.has(frame))) { mkdirSync(dumpDir, { recursive: true }); writeFileSync(`${dumpDir}/f${String(frame).padStart(6, "0")}.rgba`, live); }
  }
  if (!(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation)) ended = true;
};
const phase = () => state.battleCommandPresentation?.lifecycle.phase;
const pulse = (b: string) => { step(); if (!ended) step([b]); if (!ended) step(); };
const forcedSelector = () => {
  const s = state.battleForcedPartySelect;
  return s && s.sendOutElapsed === null && s.elapsed >= PARTY_LIST_INPUT_ELAPSED ? s : null;
};
const until = (p: () => boolean) => {
  while (!ended && !p()) {
    const s = forcedSelector();
    if (s) { pulse(s.message !== null ? "A" : s.cursor === "onix" && !s.submenuOpen ? "DOWN" : "A"); continue; }
    step((state.battleStartIntro && frame % 16 === 0)
      || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
  }
};
const slotUses = [0, 0, 0, 0];
until(() => phase() === "action-menu");
while (!ended) {
  pulse("A");
  until(() => phase() === "fight-menu");
  if (ended) break;
  const menu = state.battleCommandPresentation!;
  const legal = ([0, 1, 2, 3] as const).filter((s) => menu.legalMoveBySlot[s] !== null);
  const slot = legal.length === 0 ? 0 : legal.reduce((best, s) => (slotUses[s]! < slotUses[best]! ? s : best), legal[0]!);
  slotUses[slot]!++;
  for (let i = 0; i < 4; i++) {
    const cursor = state.battleCommandPresentation!.fightCursor;
    if (cursor === slot) break;
    pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
  }
  pulse("A");
  until(() => !state.battleCommandPresentation);
  until(() => phase() === "action-menu");
}
const all = createHash("sha256").update(rows.map((r) => r.sha).join(",")).digest("hex").slice(0, 16);
const summary = { seed, battler0, presentedFrames: rows.length, weatherFrames, weatherEvents: [...new Set(seenWeather)], digest: all };
console.log(JSON.stringify(summary));
if (outPath) writeFileSync(outPath, JSON.stringify({ ...summary, rows }));
