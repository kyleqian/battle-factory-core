// prep6: activation/window/shadow-row summary for all eleven moves (fixtures/prep6-summary.json) and DRAFTED live fixtures
// fixtures/prep6-<move>-{player,opponent}.json (`<side>` = attacker side; schema prep6-adapter-draft/v1, shape of prep5-*.json) for every READY move.
// Values: accepted configs (prep6Accepted.mjs), activation receipts (prep6-activation/, prep6Activation.sh + prep6StageActivation.py), production pins (prep6-pins.json),
// order/slot verdicts (prep6-tie-scan, prep6-order-seed, prep6-sprites-analysis, prep6-plans). Unverified until an adapter exists (no harness run).
//   node --experimental-strip-types tools/integration/prep6Draft.mjs     (from workspace root)
import { readFileSync, writeFileSync } from "node:fs";
import { acceptedConfig, O, sideOf, MOVE_ID, otherSide } from "./prep6Accepted.mjs";
const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
const FX = "tools/integration/fixtures";
const pins = rd(`${FX}/prep6-pins.json`);
const REC = (n) => rd(`${FX}/prep6-activation/${n}.json`).intervals;
const SCEN = {
  SELF_DESTRUCT: (o) => `mechanic-self-destruct-${o === "player-back" ? "player-sudowoodo-opponent-shuckle" : "opponent-sudowoodo-player-shuckle"}`,
  KNOCK_OFF: (o) => `mechanic-knock-off-${o === "player-back" ? "shuppet-onix" : "opponent-shuppet-player-onix"}`,
  ROCK_TOMB: (o) => `mechanic-rock-tomb-${o === "player-back" ? "player-grimer-opponent-onix" : "opponent-grimer-player-onix"}`,
  PAIN_SPLIT: (o) => `mechanic-pain-split-${o === "player-back" ? "player-misdreavus-opponent-gengar" : "opponent-misdreavus-player-gengar"}`,
  DRAGON_DANCE: (o) => `mechanic-dragon-dance-${o === "player-back" ? "player-dragonair-opponent-onix" : "opponent-dragonair-player-onix"}`,
  SAFEGUARD: (o) => `mechanic-safeguard-${o === "player-back" ? "player-bayleef-opponent-onix" : "opponent-bayleef-player-onix"}`,
  SWEET_SCENT: (o) => `mechanic-sweet-scent-${o === "player-back" ? "player-weepinbell-opponent-onix" : "opponent-weepinbell-player-onix"}`,
  FIRE_BLAST: (o) => (o === "player-back" ? "mechanic-fire-blast-player-octillery-opponent-onix" : "tail-mechanic-fire-blast-opponent-octillery-player-onix"),
  DOUBLE_TEAM: (o) => `stage-double-team-${sideOf(o)}`, FAINT_ATTACK: (o) => `stage-faint-attack-${sideOf(o)}`,
  SWALLOW: (o, v) => `mechanic-swallow-${sideOf(o)}-pelipper-${["", "one", "two", "three"][v]}-stockpile`,
};
const READY = new Set(["SELF_DESTRUCT", "ROCK_TOMB", "SAFEGUARD", "SWEET_SCENT", "KNOCK_OFF", "SWALLOW", "FAINT_ATTACK"]);
const VERDICT = {
  SELF_DESTRUCT: "READY", ROCK_TOMB: "READY", SAFEGUARD: "READY", SWEET_SCENT: "READY", KNOCK_OFF: "READY", SWALLOW: "READY", FAINT_ATTACK: "READY (player-attacker only)",
  PAIN_SPLIT: "NEEDS-INPUT (coords.yOffset per side into the reducer)", DRAGON_DANCE: "NEEDS-ORDER (1-bit seed, 1 frame)", FIRE_BLAST: "NEEDS-ORDER (persistent sSpriteOrder seed)", DOUBLE_TEAM: "NEEDS-ORDER (1-bit frontClone seed) + opponent evidence missing",
};
const ORDER = {
  SELF_DESTRUCT: "ORDER-INDEPENDENT: 0 overlapping equal-key pairs; seed-independent in the direct-mGBA dump (0/40 arbitrary seeds change the occupied-slot order; prep6-sprites-analysis.json)",
  ROCK_TOMB: "ORDER-INDEPENDENT of the seed (0/42 arbitrary seeds, prep6-order-seed.json); reducer encodes the settled-rock slot rule (rockTomb.ts:255-265); reduced model differs from ROM on 48 frames only for the wrapped-OAM-y rock (slot 7 before 5) - see doc",
  SAFEGUARD: "ORDER-INDEPENDENT of the seed (0/42); renderer paints rings by an orientation rule (battleScene.ts:16018-16020) = the ROM y-key order",
  SWEET_SCENT: "ORDER-INDEPENDENT (0/42 seeds; 12 equal-key pairs, none overlapping)",
  KNOCK_OFF: "ORDER-INDEPENDENT for the two known-entry seed shapes A/B (0 frames differ); arbitrary seeds change 0..4 of 59 frames (20/40 seeds): weak history dependence, no reducer order state",
  SWALLOW: "ORDER-INDEPENDENT: 0/40 arbitrary seeds change the occupied-slot order in any of the six branches (prep6-sprites-analysis.json); orbs are drawn in array order",
  FAINT_ATTACK: "ORDER-INDEPENDENT: no sprite entries in the view (0 ties)",
};
const act = (scen, id, near) => {
  const iv = REC(scen).filter((i) => i.move === id);
  return near === undefined ? iv[0] : iv.reduce((b, i) => (Math.abs(i.start - near) < Math.abs(b.start - near) ? i : b));
};
const summary = [];
const swallow = {}; // side -> variant drafts (one file per attacker side with the three stockpile branches)
const FIELDS = (move, o, v) => pins.filter((p) => p.move === move && (p.orientation === o || p.orientation === `${o}#stockpile${v}`));
for (const move of Object.keys(MOVE_ID)) for (const o of O) for (const variant of move === "SWALLOW" ? [1, 2, 3] : [1]) {
  const acc = acceptedConfig(move, o, variant); if (!acc) { summary.push({ move, id: MOVE_ID[move], orientation: o, note: "no accepted evidence" }); continue; }
  const [start, end] = acc.sourceWindow; const ageOffset = acc.extras.ageOffset ?? 0;
  const a = act(SCEN[move](o, variant), MOVE_ID[move], move === "SWALLOW" || move === "DOUBLE_TEAM" || move === "FAINT_ATTACK" ? start : undefined);
  const row = a.start - start + ageOffset;
  const rec = { move, id: MOVE_ID[move], orientation: o, ...(move === "SWALLOW" ? { stockpile: variant } : {}), activation: a.start, scriptEndFirstInactive: a.end, window: [start, end], ageOffset, shadowRow: row, shadowRowInMap: row >= 0,
    windowStartMinusActivation: start - a.start, duration: end - start + 1, windowEndMinusScriptEnd: end - a.end };
  summary.push(rec);
  if (!READY.has(move)) continue;
  const side = sideOf(o), tside = otherSide(side), c = acc.config;
  const live = FIELDS(move, o, variant).filter((p) => p.match === false && p.consumed).map((p) => ({ field: p.field, accepted: p.accepted, derived: p.derived, note: p.note }));
  const derived = {};
  for (const p of FIELDS(move, o, variant)) derived[p.field] = JSON.parse(`"${String(p.derived).replace(/"/g, '\\"')}"`);
  const d = { schema: "prep6-adapter-draft/v1", move, probe: acc.scenario, scenario: acc.scenario, ...(move === "SWALLOW" ? { stockpileVariants: [1, 2, 3] } : {}),
    attacker: { species: c.attacker.species, geometry: { side } }, target: { species: c.target.species, geometry: { side: tside } }, fieldProfile: c.fieldProfile,
    orientation: `${o} ${c.attacker.species} -> ${c.target.species}`, denseWindow: { startFrame: start, endFrame: end, ageOffset },
    draft: { activationFrame: a.start, scriptEndFirstInactive: a.end, shadowRow: row, shadowRowInMap: row >= 0, expectedDuration: end - start + 1, consumedByTest: false, acceptedWindow: { startFrame: start, endFrame: end },
      derivedFields: derived, consumedFieldDifferences: live, order: ORDER[move] } };
  const cfgExtra = {};
  for (const k of ["animationProfile", "targetSpriteSlot", "targetInitialX2", "effectCenter", "stockpileCount", "attackerPictureOffset", "attackerPictureYOffset", "animationAgeOffset", "moveTextStartAge"]) if (c[k] !== undefined) cfgExtra[k] = c[k];
  d.draft.acceptedConfigExtras = cfgExtra;
  if (move === "SELF_DESTRUCT") d.draft.displayedAttackerHp = "0 at the MOVE_ANIMATION event (measured: prep6-route-probe.json route 56/14/0 field {player hp 0/166}); same setatkhptozero-before-attackanimation path as Explosion";
  if (move === "KNOCK_OFF") d.draft.liveAnimationAgeOffset = { acceptedWindowRelative: -11, liveWindowStartsAtActivation: a.start - start + ageOffset, note: "reducer animation age 0 = activation + 6; window started 5 frames before activation" };
  if (move === "SWALLOW") d.draft.stockpileCountSource = "request.turn (= gBattleScripting.animTurn = stockpileCounter at the event; Cmd_stockpiletohpheal battle_script_commands.c:6918; production battleScriptStockpileOpcode.ts:117/181); measured turn 1/2/3 in prep6-swallow-probe.json";
  if (move === "SWALLOW") d.draft.adhocShadowDraw = "src/engine/battleScene.ts:21746-21757 (opponent attacker, swallowState.age === 0; animationCenter.x - width/2, battlePositionCenter.y + 29): retire (map row 0)";
  else d.draft.adhocShadowDraw = "none in the branch";
  if (move === "SWALLOW") { (swallow[side] ??= []).push({ stockpile: variant, scenario: acc.scenario, target: d.target.species === c.target.species ? c.target.species : null, targetSpecies: c.target.species, fieldProfile: c.fieldProfile, denseWindow: d.denseWindow, draft: d.draft, base: d }); continue; }
  writeFileSync(`${FX}/prep6-${move.toLowerCase().replace(/_/g, "-")}-${side}.json`, JSON.stringify(d, null, 2) + "\n");
}
for (const [side, vs] of Object.entries(swallow)) {
  const base = { ...vs[0].base }; delete base.denseWindow; delete base.draft; delete base.fieldProfile; delete base.scenario; delete base.probe; delete base.target; delete base.orientation;
  const out = { ...base, stockpileVariants: vs.map((v) => v.stockpile), attacker: { species: "PELIPPER", geometry: { side } }, orientation: `${side === "player" ? "player-back" : "opponent-front"} PELIPPER -> DELCATTY (SABLEYE in the opponent three-stockpile branch)`,
    variants: vs.map((v) => ({ stockpile: v.stockpile, scenario: v.scenario, target: { species: v.targetSpecies, geometry: { side: side === "player" ? "opponent" : "player" } }, fieldProfile: v.fieldProfile, denseWindow: v.denseWindow, draft: v.draft })) };
  writeFileSync(`${FX}/prep6-swallow-${side}.json`, JSON.stringify(out, null, 2) + "\n");
}
writeFileSync(`${FX}/prep6-summary.json`, JSON.stringify({ schema: "prep6-summary/v1", verdicts: VERDICT, rows: summary }, null, 1) + "\n");
for (const s of summary) console.log(s.move, s.orientation.slice(0, 3), s.stockpile ?? "", "act", s.activation, "end", s.scriptEndFirstInactive, "win", s.window?.join(".."), "row", s.shadowRow, "dur", s.duration, "winStart-act", s.windowStartMinusActivation, "winEnd-scriptEnd", s.windowEndMinusScriptEnd);
