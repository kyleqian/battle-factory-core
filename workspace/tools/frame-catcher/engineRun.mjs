// Frame catcher, engine side (tools/frame-catcher/README.md): replays one engine button trace and records, per frame,
// the picture, the sound events, the coarse screen owner and which menu (if any) is waiting for the player.
//
//   node --experimental-strip-types --no-warnings tools/frame-catcher/engineRun.mjs TRACE.json OUTDIR [--game GAME_WORKSPACE] [--max-frame N]
//
// TRACE.json: {challenge: {battleScene, gameplaySeed, presentationSeed, start, frontier}, segments: [{frames, buttons}]} (the site's
// challenge trace, or one written by makeTrace.mjs). GAME_WORKSPACE (default: this workspace) is the workspace whose src/ is played,
// so an older site build can be replayed from a `git archive` copy. Writes OUTDIR/frames.bin + frames.idx.json (each distinct picture
// once, zlib RGB888), OUTDIR/perframe.u32 (picture id of every frame) and OUTDIR/timeline.json (sounds, menus, presses, staging facts).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i < 0 ? dflt : args[i + 1]; };
const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const [tracePath, outDir] = positional;
if (!tracePath || !outDir) { console.error("usage: engineRun.mjs TRACE.json OUTDIR [--game GAME_WORKSPACE] [--max-frame N]"); process.exit(2); }
const GAME = path.resolve(opt("--game", path.resolve(here, "../..")));
const maxFrame = Number(opt("--max-frame", Infinity));

const { FactorySession } = await import(`${GAME}/src/factorySession.ts`);
const { render } = await import(`${GAME}/src/engine/core.ts`);
const { installBundledMonPicPixels } = await import(`${GAME}/src/engine/monPicPixelsInstall.ts`);
installBundledMonPicPixels();
const { menuOf, surfaceOf } = await import(path.join(here, "engineMenus.mjs"));

const trace = JSON.parse(fs.readFileSync(tracePath, "utf8"));
const c = trace.challenge;
const session = new FactorySession({
  battleScene: c.battleScene, gameplaySeed: c.gameplaySeed, presentationSeed: c.presentationSeed,
  start: c.start, frontier: c.frontier, challengeRequest: "hold",
});
let pending = [];
session.attachSoundSink({ push: (e) => pending.push(e) });

fs.mkdirSync(outDir, { recursive: true });
const framesFd = fs.openSync(path.join(outDir, "frames.bin"), "w");
const index = []; const ids = new Map(); let offset = 0;
const perframe = [];
const rgb = Buffer.alloc(240 * 160 * 3);
function store(px) {
  for (let p = 0, q = 0; p < px.length; p += 4, q += 3) { rgb[q] = px[p]; rgb[q + 1] = px[p + 1]; rgb[q + 2] = px[p + 2]; }
  const h = crypto.createHash("sha1").update(rgb).digest("hex");
  let id = ids.get(h);
  if (id === undefined) {
    const z = zlib.deflateSync(rgb, { level: 1 });
    fs.writeSync(framesFd, z); index.push([h, offset, z.length]); offset += z.length;
    id = index.length - 1; ids.set(h, id);
  }
  return id;
}

// Frame 0 is the mount's first picture (before any tick), as the ROM side records its first frame.
perframe.push(store(render(session.state)));
const sounds = []; const menus = []; const surfaces = []; const buttons = [];
let lastMenu = null; let lastSurface = null; let lastButtons = null;
{ // frame 0: the mount's own menu (a press on the first tick already acts on it)
  const m0 = menuOf(session.state);
  menus.push([0, m0 === null ? null : m0.kind, m0 === null ? null : m0.sig]);
  lastMenu = m0 === null ? null : `${m0.kind}|${m0.sig}`;
}
const battles = []; const facts = { rentals: null, frontier: c.frontier ?? null, battleScene: c.battleScene, transitions: {} };
function noteFacts(st, f) {
  // the battle-start transition the engine shows before the next battle (GetSpecialBattleTransition's one Random() draw)
  const tp = st.battleRoom?.transitionPresentation;
  // (the last one shown before the battle's first action menu wins: an after-win room may still hold the last battle's)
  if (tp && facts.transitions[battles.length]?.tableIndex !== tp.tableIndex) facts.transitions[battles.length] = { ...tp, frame: f };
  const orch = st.factoryRoundBattleOrchestrator;
  if (!orch) return;
  if (facts.rentals === null && orch.initialRentalGeneration) {
    facts.rentals = orch.initialRentalGeneration.rentals.map((r) => ({ setId: r.setId, personality: r.personality >>> 0, fixedIv: r.fixedIv, abilitySlot: r.abilitySlot, otId: r.otId >>> 0, species: r.speciesName }));
    facts.playerTrainerId = orch.config.playerTrainerId >>> 0;
    facts.selectedRentalIndexes = orch.config.rentals?.selectedRentalIndexes ?? null;
  }
  const bi = orch.round.rules.battleIndex;
  const cmd = orch.battleCommandPresentation;
  if (cmd && cmd.lifecycle.phase === "action-menu" && !battles.some((b) => b.battleIndex === bi)) {
    const sched = orch.round.opponentSchedule[bi];
    const gen = orch.opponentGenerations?.[bi];
    battles.push({
      battleIndex: bi, firstActionMenuFrame: f,
      rngAtActionMenu: orch.battle.rng.value >>> 0, randomTurnNumber: orch.battle.rules.rulesContext.randomTurnNumber,
      trainerId: Number(String(sched.id).replace(/^factory-trainer-/, "")), trainerName: sched.trainerName,
      selectionRngValue: gen?.generation?.selectionRngValue ?? null, rollRngBefore: gen?.generation?.drawLedger?.[0]?.rngBefore ?? null, generationKind: gen?.kind ?? null,
      opponentSetIds: sched.rentalRecords.map((r) => r.setId),
      opponents: sched.rentalRecords.map((r) => ({ setId: r.setId, personality: r.personality >>> 0, otId: r.otId >>> 0, abilitySlot: r.abilitySlot, fixedIv: r.fixedIv, member: r.member })),
      // the player's three as the battle starts them (round.rules.playerKernelParty: species, ability bit, gender, level, HP, stats)
      playerParty: orch.round.rules.playerRentalRecords?.map((r, i) => ({ setId: r.setId, personality: r.personality >>> 0, otId: r.otId >>> 0, abilitySlot: r.abilitySlot, fixedIv: r.fixedIv, member: orch.round.rules.playerKernelParty?.[i] })) ?? null,
    });
  }
}

const t0 = Date.now();
outer: for (const seg of trace.segments) {
  const held = new Set(seg.buttons);
  for (let i = 0; i < seg.frames; i += 1) {
    if (session.frame >= maxFrame) break outer;
    pending = [];
    session.tick(held);
    const f = session.frame;
    const st = session.state;
    perframe.push(store(render(st)));
    const b = seg.buttons.join("+");
    if (b !== lastButtons) { buttons.push([f, b]); lastButtons = b; }
    for (const e of pending) sounds.push([f, e]);
    const m = menuOf(st);
    const mk = m === null ? null : `${m.kind}|${m.sig}`;
    if (mk !== lastMenu) { menus.push([f, m === null ? null : m.kind, m === null ? null : m.sig]); lastMenu = mk; }
    const s = surfaceOf(st);
    if (s !== lastSurface) { surfaces.push([f, s]); lastSurface = s; }
    noteFacts(st, f);
  }
}
fs.closeSync(framesFd);
fs.writeFileSync(path.join(outDir, "frames.idx.json"), JSON.stringify(index));
fs.writeFileSync(path.join(outDir, "perframe.u32"), Buffer.from(new Uint32Array(perframe).buffer));
fs.writeFileSync(path.join(outDir, "timeline.json"), JSON.stringify({
  side: "engine", game: GAME, trace: path.resolve(tracePath), frames: session.frame, digest: session.digest(),
  facts: { ...facts, battles }, sounds, menus, surfaces, buttons,
}));
console.log(`engine: ${session.frame} frames, ${index.length} distinct pictures, ${sounds.length} sound events, ${battles.length} battles, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
