// S10A baton-endeavor: ordinary-input routes for the live Baton Pass (226) and Endeavor (283) adapters. Per route: every body of the move
// with adapter-active-every-age, the frames after the Baton Pass body (P = last body frame; attacker sprite drawn?, party screen open,
// send-out), the following prompt, and Scene ON/OFF logical parity (boundaries except the scene bit / event counter, facility, rng).
//   node --experimental-strip-types --no-warnings tools/integration/batonEndeavorRoutes.ts > /tmp/be-routes.json
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const strip = (v: any) => ({ ...v, nextEventSequence: 0,
  rules: { ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } } });
const ROUTES = (process.argv[2] ? JSON.parse(process.argv[2]) : [
  { move: 226, species: "AIPOM", seed: 71, streak: 0, slots: [2] },
  { move: 226, species: "NINJASK", seed: 2, streak: 7, slots: [0] },
]) as { move: number; species: string; seed: number; streak: number; slots: (0 | 1 | 2 | 3)[] }[];
const out = ROUTES.map((r) => {
  // Per-frame post-body trace (ON only): k = frame - P, P = last frame of the move's move-animation command.
  let inBody = false, P: number | null = null;
  const trace: { k: number; cmd: string; attackerSprite: boolean | null; party: boolean; sendOut: number | null }[] = [];
  let attacker: 0 | 1 = 0;
  const bodyInputs: { attacker: number; power: number; staleMovePowerUnknown: boolean }[] = [];
  const messages: string[] = []; const seenSegments = new Set<string>(); let lastBodyKey = "";
  const on = generatedCommandAnimationReplay(r.seed, "on", r.slots, r.streak, true, true, (state, frame) => {
    const res = state.battleResolutionPresentation as any;
    const cmd = res?.segments[res.segmentIndex]?.commands[res.commandIndex];
    if (res) res.segments.forEach((seg: any, i: number) => {
      const key = `${res.resolutionId.requestId}:${i}`; if (seenSegments.has(key)) return; seenSegments.add(key);
      for (const e of seg.events) if (e.payload.kind === "message" && /NOTVERYEFFECTIVE|ITDOESNTAFFECT/.test(e.payload.messageId)) messages.push(`${e.payload.messageId}@${e.payload.actionSnapshot?.attacker}`);
    });
    if (cmd?.type === "move-animation" && cmd.animation?.moveId === r.move) {
      const key = `${res.resolutionId.requestId}:${res.segmentIndex}:${res.commandIndex}`;
      if (key !== lastBodyKey) { lastBodyKey = key; bodyInputs.push({ attacker: cmd.animation.attacker, power: cmd.animation.power, staleMovePowerUnknown: res.liveMoveBattlerX2Input?.staleMovePowerUnknown === true }); }
    }
    const isBody = cmd?.type === "move-animation" && cmd.animation?.moveId === r.move;
    if (isBody && P === null) { inBody = true; attacker = cmd.animation.attacker; }
    if (inBody && !isBody && P === null) P = frame - 1;
    if (P === null || frame - P > 520) return;
    const sel = (state as any).battleForcedPartySelect;
    let sprite: boolean | null = null;
    if (res) { const v: any = createBattleResolutionPresentationRenderView(res); sprite = v.visibility[attacker === 0 ? "player" : "opponent"].sprite; }
    trace.push({ k: frame - P, cmd: cmd?.type ?? (sel ? "party-select" : "-"), attackerSprite: sprite, party: !!sel, sendOut: sel?.sendOutElapsed ?? null });
  });
  const off = generatedCommandAnimationReplay(r.seed, "off", r.slots, r.streak, true, true);
  const bodies = on.animations.filter((x) => x.moveId === r.move);
  const change: unknown[] = []; let key = "";
  for (const t of trace) { const k2 = JSON.stringify([t.cmd, t.attackerSprite, t.party, t.sendOut === null]); if (k2 !== key) { key = k2; change.push([t.k, t.cmd, t.attackerSprite, t.party, t.sendOut]); } }
  return { route: `${r.species}/seed${r.seed}-streak${r.streak}-slots${r.slots.join("")}`, ...r, stalled: on.stalled,
    followingPrompt: on.state.battleCommandPresentation?.lifecycle.phase ?? null,
    bodies: bodies.map((x) => ({ attacker: x.attacker, player: x.player, opponent: x.opponent, ages: x.ages.length, firstAge: x.ages[0], lastAge: x.ages.at(-1),
      adapterActiveEveryAge: x.adapterActive.every(Boolean) })),
    allBodies: on.animations.map((x) => `${x.moveId}/${x.attacker}:${x.ages.length}:${x.adapterActive.every(Boolean)}`),
    postBodyChangePoints: change, bodyInputs, w3Messages: messages,
    sceneOnOffParity: { boundariesEqualExceptSceneBitAndEventCounter: JSON.stringify(on.boundaries.map(strip)) === JSON.stringify(off.boundaries.map(strip)),
      facilityEqual: JSON.stringify(on.state.facilityState) === JSON.stringify(off.state.facilityState),
      rngValueEqual: on.state.round.rules.rngValue === off.state.round.rules.rngValue, stalledEqual: on.stalled === off.stalled } };
});
console.log(JSON.stringify(out, null, 1));
