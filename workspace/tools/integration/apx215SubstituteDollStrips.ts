// apx215 (docs/finish-plan.md Phase 2; src/engine/liveMovePlayback.ts approximate "substitute-doll"): PNG strips of approximate Substitute-doll
// commands drawn by the production live renderer. Drives the lsd194 census battle of one seed (lsd194Census.ts' input loop: battle i = seed i,
// streak i * 11 % 49, rentals 0..2, least-used legal move, presentation RNG session ticked as production does) and, for the first
// move-animation command with (moveId, attacker) classified approx:substitute-doll, renders every presented row with
// renderBattleResolutionLiveView(createBattleResolutionPresentationRenderView(state, rng.host)) and the command's static hold
// (renderBattleResolutionSceneOffView of the same view). Writes a strip of every 4th row (8 columns, 1x) and prints a JSON summary:
// rows, rows that differ from the static hold, a sha256 over every rendered row.
//   node --experimental-strip-types --no-warnings tools/integration/apx215SubstituteDollStrips.ts --seed=17 --move=153 --attacker=0 --out=x.png
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  battleResolutionFieldBeforeCommand, createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt,
} from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView, renderBattleResolutionSceneOffView } from "../../src/engine/battleScene.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import { liveMovePlaybackClassification, liveMovePlaybackCode } from "../../src/engine/liveMovePlayback.ts";

export type Apx215Strip = { seed: number; moveId: number; attacker: number; code: string; rows: number; nonStaticRows: number; sha256: string;
  frames: Uint8Array[] };

/** The census battle of `seed` up to the end of the first approx (moveId, attacker) command; null when none is reached. */
export function apx215SubstituteDollStrip(seed: number, moveId: number, attacker: number): Apx215Strip | null {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${(seed * 11) % 49}`, rngValue: seed, battleScene: "on",
    factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let rng = createPresentationRngSession();
  let frame = 0, ended = false;
  let target: unknown = null, code = "", done = false;
  const frames: Uint8Array[] = []; let nonStatic = 0;
  const hash = createHash("sha256");
  const live = new Uint8Array(240 * 160 * 4), still = new Uint8Array(240 * 160 * 4);
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const step = (buttons: readonly string[] = []) => {
    if (++frame > 200000) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons) as never);
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons) as never);
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons) as never);
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    const r = state.battleResolutionPresentation as any;
    const c = r?.lifecycle.phase === "presenting" ? r.segments[r.segmentIndex]?.commands[r.commandIndex] : null;
    if (target === null && c?.type === "move-animation" && c.animation?.moveId === moveId && c.animation.attacker === attacker) {
      const s = r.segments[r.segmentIndex];
      const cls = liveMovePlaybackClassification(c, battleResolutionFieldBeforeCommand(s.field, s.commands, r.commandIndex),
        createBattleResolutionPresentationRenderView(r, rng.host));
      if (cls?.kind === "approximate" && cls.reason === "substitute-doll") { target = c; code = liveMovePlaybackCode(cls); }
    }
    if (target !== null && !done) {
      if (c !== target) { done = true; return; }
      const view = createBattleResolutionPresentationRenderView(r, rng.host);
      live.fill(0); still.fill(0);
      renderBattleResolutionLiveView(live, view);
      renderBattleResolutionSceneOffView(still, view);
      hash.update(live);
      if (!Buffer.from(live).equals(Buffer.from(still))) nonStatic += 1;
      frames.push(Uint8Array.from(live));
    }
    if (!owned()) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (b: string) => { step(); if (!ended && !done) step([b]); if (!ended && !done) step(); };
  const forcedSelector = () => {
    const s = state.battleForcedPartySelect;
    return s && s.sendOutElapsed === null && s.elapsed >= PARTY_LIST_INPUT_ELAPSED ? s : null;
  };
  const until = (p: () => boolean) => {
    while (!ended && !done && !p()) {
      const s = forcedSelector();
      if (s) { pulse(s.message !== null ? "A" : s.cursor === "onix" && !s.submenuOpen ? "DOWN" : "A"); continue; }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  const slotUses = [0, 0, 0, 0];
  until(() => phase() === "action-menu");
  while (!ended && !done) {
    pulse("A");
    until(() => phase() === "fight-menu");
    if (ended || done) break;
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
  return target === null ? null
    : { seed, moveId, attacker, code, rows: frames.length, nonStaticRows: nonStatic, sha256: hash.digest("hex"), frames };
}

/** RGB PNG of every `every`-th frame (RGBA 240x160) in a `columns`-wide grid, 1x. */
export function apx215StripPng(frames: readonly Uint8Array[], every = 4, columns = 8): Buffer {
  const picked = frames.filter((_, i) => i % every === 0);
  const w = 240 * Math.min(columns, picked.length), h = 160 * Math.ceil(picked.length / columns);
  const raw = Buffer.alloc((w * 3 + 1) * h);
  picked.forEach((f, k) => {
    const ox = (k % columns) * 240, oy = Math.floor(k / columns) * 160;
    for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) for (let c = 0; c < 3; c++) {
      raw[(oy + y) * (w * 3 + 1) + 1 + (ox + x) * 3 + c] = f[(y * 240 + x) * 4 + c]!;
    }
  });
  const chunk = (type: string, data: Buffer) => {
    const b = Buffer.concat([Buffer.from(type), data]); const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(b) >>> 0); return Buffer.concat([len, b, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const strip = apx215SubstituteDollStrip(Number(arg("seed")), Number(arg("move")), Number(arg("attacker")));
  if (strip === null) { console.error("no approx:substitute-doll command reached"); process.exit(1); }
  writeFileSync(arg("out")!, apx215StripPng(strip.frames));
  const { frames: _f, ...summary } = strip;
  console.log(JSON.stringify(summary));
}
