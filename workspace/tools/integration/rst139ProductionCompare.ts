// rst139 (S10A presentation fidelity, docs/rst139-ordinary-row-rest.md): every settled ROM row OUTSIDE a battle animation script
// (rst139NpzToRaw.py: message / HP / blink / menu rows of the 8 rst139 scenarios, direct mGBA, Scene ON, r1 == r2) compared with
// production's ORDINARY Scene ON row: a resolution presenting a message command (sad133Windows.ts's synthetic segment) over the
// displayed leads (gBattleMons species), drawn by renderBattleResolutionLiveView. The tracked x2 history is production's own tracker
// (liveBattlerX2History.ts applyLiveBattlerX2Event) replayed over the ROM's event order: battle start idle / idle; each anim run ->
// PlayerDoMoveAnimation / OpponentDoMoveAnimation = move-body (the scenario's move), CompleteOnFinishedStatusAnimation = status-animation
// CONFUSION on that battler, CompleteOnFinishedBattleAnimation (STATS_CHANGE) = keep; an opponent species / sprite change = send-in.
// The state carries it as `liveOrdinaryBattlerX2History` (read only by the banked rst139-rest.diff; today's tree ignores it).
// Compared rects: opponent x 136..215 y 0..79 on every row; player x 32..111 y 40..111 on ordinary rows (menu / bounce rows bob the player:
// production's menu bounce clock is not part of this window). The menu's opponent is drawn by the same drawSpriteSheet at
// fieldArt.opponent.origin (drawBattle2ActionMenuWindow), so the ordinary render stands for it in the opponent rect.
//   node --experimental-strip-types --no-warnings tools/integration/rst139ProductionCompare.ts <raw-dir> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { applyLiveBattlerX2Event, LIVE_BATTLER_X2_IDLE, type LiveBattlerX2History } from "../../src/engine/liveBattlerX2History.ts";
import { speciesFrontIdleRestOffsetOrZero } from "../../src/animation/speciesIdleAnim.ts";

const [rawDir, outPath] = process.argv.slice(2) as [string, string];
const FX = "tools/integration/fixtures/rst139";
const index = JSON.parse(readFileSync(`${FX}/scenario-index.json`, "utf8")) as Record<string, any>;
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
// The crops (rst139NpzToRaw.py) are opponent x 136..215 y 0..79 and player x 32..111 y 40..111; the compared sub-rects stop short of both
// healthboxes (their HP bars / the menu's healthbox bob are not this comparison's subject): opponent x 140..211 y 0..71, player
// x 36..107 y 48..111.
const OPP = { x: 136, y: 0, w: 80, h: 80, sub: { x: 140, y: 0, w: 72, h: 72 } };
const PLY = { x: 32, y: 40, w: 80, h: 72, sub: { x: 36, y: 48, w: 72, h: 64 } };
const CROP = (OPP.w * OPP.h + PLY.w * PLY.h) * 3;

const rectDiff = (fb: Uint8Array, crop: Uint8Array, at: number, r: typeof OPP) => {
  let n = 0;
  for (let y = r.sub.y; y < r.sub.y + r.sub.h; y++) for (let x = r.sub.x; x < r.sub.x + r.sub.w; x++) {
    const i = (y * 240 + x) * 4, j = at + ((y - r.y) * r.w + x - r.x) * 3;
    if (fb[i] !== crop[j] || fb[i + 1] !== crop[j + 1] || fb[i + 2] !== crop[j + 2]) n++;
  }
  return n;
};

function production(scenario: any, playerSpecies: number, opponentSpecies: number, history: LiveBattlerX2History) {
  const parties = scenario.overrides.parties;
  const make = (b: 0 | 1, species: number, gender: "male" | "female") => Object.freeze({
    species, name: speciesName(species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex: 0 as const, level: 50, hp: 100, maxHP: 100, gender, status: "none" as const,
    moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
  const genderOf = (party: any[], species: number) => (party.find((m) => m.species === species) ?? party[0]).gender;
  const field = Object.freeze({ player: make(0, playerSpecies, genderOf(parties.player, playerSpecies)),
    opponent: make(1, opponentSpecies, genderOf(parties.opponent, opponentSpecies)) });
  const commands = [Object.freeze({ type: "message", eventSequence: 1, lines: ["NEXT", "MESSAGE"], advance: "automatic", noCursor: false,
    timing: { minimumFrames: 1, holdFrames: 0 } })];
  const state = {
    field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
    commandIndex: 0, lifecycle: { phase: "presenting", phaseElapsed: 40 },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
    liveOrdinaryBattlerX2History: history,
  };
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, createBattleResolutionPresentationRenderView(state as never));
  return fb;
}

const out: Record<string, any> = {};
let total = 0, zero = 0, x2Agree = 0, x2Rows = 0;
for (const name of Object.keys(index).sort()) {
  const stem = name.replace(/\.json$/, "");
  const raw = JSON.parse(readFileSync(`${rawDir}/${stem}.json`, "utf8")) as {
    rows: [number, string, number, number, number, number, number][]; anims: [number, number, string, string][]; sendIns: [number, number][];
  };
  const crops = new Uint8Array(readFileSync(`${rawDir}/${stem}.crops`));
  const sc = JSON.parse(readFileSync(`${FX}/scenarios/${name}`, "utf8"));
  const meta = index[name];
  const SP: Record<string, number> = { PRIMEAPE: 57, ONIX: 95, RATTATA: 19, SNORLAX: 143, GOLBAT: 42 };
  // tracker events in ROM order: [frame the event takes effect from, event]
  const events: [number, any][] = [];
  for (const [first, last, c0, c1] of raw.anims) {
    void first;
    if (c0 === "PlayerDoMoveAnimation") events.push([last, { kind: "move-body", moveId: meta.playerMove, attackerSide: "player" }]);
    else if (c1 === "OpponentDoMoveAnimation") events.push([last, { kind: "move-body", moveId: meta.opponentMove, attackerSide: "opponent" }]);
    else if (c0 === "CompleteOnFinishedStatusAnimation") events.push([last, { kind: "status-animation", side: "player", animation: "CONFUSION" }]);
    else if (c1 === "CompleteOnFinishedStatusAnimation") events.push([last, { kind: "status-animation", side: "opponent", animation: "CONFUSION" }]);
    else if (c0 === "CompleteOnFinishedBattleAnimation" || c1 === "CompleteOnFinishedBattleAnimation") { /* STATS_CHANGE: keep */ }
    else events.push([last, { kind: "unknown", side: "both", reason: `anim ${c0} / ${c1}` }]);
  }
  for (const [f] of raw.sendIns) events.push([f, { kind: "send-in", side: "opponent" }]);
  events.sort((a, b) => a[0] - b[0]);
  let history: LiveBattlerX2History = LIVE_BATTLER_X2_IDLE, ei = 0;
  const cache = new Map<string, Uint8Array>();
  const windows: Record<string, any> = {};
  let prevKey = "";
  for (const [f, kind, ci, oppX2, , m0, m1] of raw.rows) {
    while (ei < events.length && events[ei]![0] <= f) history = applyLiveBattlerX2Event(history, events[ei++]![1]);
    const key = `${m0}:${m1}:${history.player}:${history.opponent}`;
    let fb = cache.get(key);
    if (!fb) { fb = production(sc, m0, m1, history); cache.set(key, fb); }
    const at = ci * CROP;
    const opp = rectDiff(fb, crops, at, OPP);
    const ply = kind !== "ordinary" ? 0 : rectDiff(fb, crops, at + OPP.w * OPP.h * 3, PLY);
    const rest = speciesFrontIdleRestOffsetOrZero(speciesName(m1)).x2;
    const predicted = history.opponent === "idle" ? rest : history.opponent === "zeroed" ? 0 : null;
    if (predicted !== null) { x2Rows++; if (predicted === oppX2) x2Agree++; }
    // a window = a maximal run of rows with one (kind, species, tracked state, ROM x2)
    const wkey = `${kind}|${speciesName(m1)}|${history.opponent}|${oppX2}`;
    if (wkey !== prevKey) { windows[`${f}`] = { kind, opponent: speciesName(m1), tracked: history.opponent, romX2: oppX2, predictedX2: predicted, rows: 0, pxRows: 0, px: [] as number[] }; prevKey = wkey; }
    const w = windows[Object.keys(windows).at(-1)!];
    w.rows++; total++;
    const px = opp + ply;
    if (px === 0) zero++; else w.pxRows++;
    if (!w.px.includes(px)) w.px.push(px);
  }
  out[name] = { opponentRest: meta.opponent, windows };
}
const summary = { rows: total, zeroPxRows: zero, x2Prediction: `${x2Agree} / ${x2Rows}` };
writeFileSync(outPath, JSON.stringify({ summary, scenarios: out }, null, 1) + "\n");
for (const [name, s] of Object.entries(out)) {
  for (const [f, w] of Object.entries(s.windows as Record<string, any>)) {
    console.log(`${name.padEnd(36)} @${f.padStart(5)} ${w.kind.padEnd(8)} ${w.opponent.padEnd(8)} tracked ${w.tracked.padEnd(7)} rom x2 ${w.romX2} pred ${w.predictedX2} rows ${String(w.rows).padStart(4)} px!=0 ${String(w.pxRows).padStart(4)} px ${w.px.join(",")}`);
  }
}
console.log(`rows ${total}: 0 px ${zero}; tracker x2 == ROM x2 ${summary.x2Prediction}`);
