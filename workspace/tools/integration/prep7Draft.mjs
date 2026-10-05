// prep7: activation/window/shadow-row summary for all ten moves (fixtures/prep7-summary.json) and DRAFTED live fixtures fixtures/prep7-<move>-{player,opponent}.json (`<side>` = attacker side;
// schema prep7-adapter-draft/v1 = prep6/order-consumer draft shape, plus `precedingBodies` for the accepted scenario's own history and `firstBodyLab` for the lab-measured first body).
// Inputs: accepted configs (prep7Accepted.mjs), activation receipts (census-activation/, prep6-activation/, prep7-activation/), pins (prep7-pins.json), order validation (prep7-order-seed.json),
// slot/order dumps (prep7-sprites-analysis.json), reducer checks, routes (prep7-route-probe.json). Unverified by an adapter run (no harness).   node --experimental-strip-types tools/integration/prep7Draft.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { acceptedConfig, O, sideOf, otherSide, MOVE_ID } from "./prep7Accepted.mjs";
const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
const FX = "tools/integration/fixtures";
const pins = rd(`${FX}/prep7-pins.json`), seeds = rd(`${FX}/prep7-order-seed.json`), sprites = rd(`${FX}/prep7-sprites-analysis.json`), red = rd(`${FX}/prep7-reducer-checks.json`), probe = rd(`${FX}/prep7-route-probe.json`);
const iv = (path, id, near) => { const l = rd(path).intervals.filter((i) => i.move === id); return near === undefined ? l[0] : l.reduce((b, i) => (Math.abs(i.start - near) < Math.abs(b.start - near) ? i : b)); };
const C = (n) => `${FX}/census-activation/${n}.json`, P6 = (n) => `${FX}/prep6-activation/${n}.json`, P7 = (n) => `${FX}/prep7-activation/${n}.json`;
// accepted-scenario receipt per move/orientation (attacker side) and the lab first-body receipt
const ACC = {
  AERIAL_ACE: (o) => C(o === "player-back" ? "mechanic-aerial-ace-player-pidgeotto-onix" : "mechanic-aerial-ace-pidgeotto-onix"),
  QUICK_ATTACK: (o) => C(o === "player-back" ? "mechanic-quick-attack-player-pidgeotto-onix" : "mechanic-quick-attack-pidgeotto-onix"),
  FEATHER_DANCE: (o) => C(o === "player-back" ? "mechanic-feather-dance-player-pidgeotto-onix" : "mechanic-feather-dance-pidgeotto-onix"),
  FAKE_TEARS: (o) => C(o === "player-back" ? "mechanic-fake-tears-player-delcatty-opponent-shuckle" : "mechanic-fake-tears-opponent-delcatty-player-shuckle"),
  SLEEP_TALK: (o) => C(o === "player-back" ? "mechanic-sleep-talk-player-seaking-opponent-onix" : "mechanic-sleep-talk-opponent-seaking-player-onix"),
  ICE_PUNCH: (o) => C(`stage-ice-punch-${sideOf(o)}`), ROCK_SLIDE: (o) => C(`stage-rock-slide-${sideOf(o)}`),
  DOUBLE_TEAM: (o) => P6(`stage-double-team-${sideOf(o)}`),
  FIRE_BLAST: (o) => P6(o === "player-back" ? "mechanic-fire-blast-player-octillery-opponent-onix" : "tail-mechanic-fire-blast-opponent-octillery-player-onix"),
  DRAGON_DANCE: (o) => P6(o === "player-back" ? "mechanic-dragon-dance-player-dragonair-opponent-onix" : "mechanic-dragon-dance-opponent-dragonair-player-onix"),
};
const LAB = { // first-body lab runs (the move is the battle's first body): receipts of this prep (new scenarios) or the accepted lab scenario itself
  ICE_PUNCH: (o) => P7(`mechanic-ice-punch-${sideOf(o)}-dragonair-onix`), ROCK_SLIDE: (o) => P7(`mechanic-rock-slide-${sideOf(o)}-dragonair-onix`), DOUBLE_TEAM: (o) => P7(`mechanic-double-team-${sideOf(o)}-dragonair-onix`),
  FIRE_BLAST: (o) => P7(`mechanic-fire-blast-${sideOf(o)}-dragonair-onix`), DRAGON_DANCE: ACC.DRAGON_DANCE, AERIAL_ACE: ACC.AERIAL_ACE, QUICK_ATTACK: ACC.QUICK_ATTACK, FEATHER_DANCE: ACC.FEATHER_DANCE, FAKE_TEARS: ACC.FAKE_TEARS, SLEEP_TALK: ACC.SLEEP_TALK,
};
const PRECEDING = { // body history of the accepted evidence scenario (receipt interval list before the move)
  FIRE_BLAST: (o) => [{ moveId: 33, side: o === "player-back" ? "opponent" : "player" }], DOUBLE_TEAM: () => [{ moveId: "AI body (staged)", side: "opponent" }], ICE_PUNCH: (o) => (o === "player-back" ? [{ moveId: 104, side: "opponent" }] : []),
  ROCK_SLIDE: () => [], DRAGON_DANCE: () => [], AERIAL_ACE: () => [], QUICK_ATTACK: () => [], FEATHER_DANCE: () => [], FAKE_TEARS: () => [], SLEEP_TALK: () => [],
};
const VERDICT = {
  AERIAL_ACE: "READY (both orientations; age basis +42)", QUICK_ATTACK: "READY (both orientations; age basis +44)", ICE_PUNCH: "READY (both orientations)", FAKE_TEARS: "READY (both orientations; row -1, no map row)",
  SLEEP_TALK: "READY (both orientations; called move = ordinary second request)", FEATHER_DANCE: "READY-WITH-PROVIDER (first-body bit blocked by the stat-command invalidation: NEEDS-ORDER-POLICY); ungated = approximate after the first body",
  FIRE_BLAST: "READY-WITH-PROVIDER (first-body gate; reducer seed literal is pixel-equivalent)", DRAGON_DANCE: "READY-WITH-PROVIDER (allocationOrder derived from the first-body free order)",
  DOUBLE_TEAM: "NEEDS-ORDER-POLICY (stat command precedes the animation => first-body order unknown today); player-attacker only; frontClone = b on the first body (pixel-measured)",
  ROCK_SLIDE: "READY (opponent-attacker only; spriteOrderSeed pixel-neutral, provider/constant both equal the literal)",
};
const ORDER = {
  AERIAL_ACE: "ORDER-INDEPENDENT: 0/40 arbitrary seeds change the occupied-slot order (prep7-sprites-analysis.json aerial-ace-*); all 4 spawns first-free (slots 3,4,5,7)",
  QUICK_ATTACK: "ORDER-INDEPENDENT: 0/40 seeds; 0 equal-key afterimage pairs in the ROM dumps (prep7-quick-attack-tie.json): slot 3/4 order is decided by OAM y (larger y in front), not by slot ties; spawns 3,4,5(hit sprite),3 first-free",
  ICE_PUNCH: "ORDER-INDEPENDENT: 0/40 seeds; 12 spawn frames all first-free: slots 3,3,4,5,7,9..14,3,4,5 (crystal plan = known-entry first-free lowest slots, reused after destroy)",
  FAKE_TEARS: "ORDER-INDEPENDENT: 0/40 seeds; tears take slots [3,4],[5,7],[9,10],[11,12] first-free (reducer TEAR_SLOTS fakeTears.ts:26)",
  SLEEP_TALK: "ORDER-INDEPENDENT: 0/40 seeds; letters take 3,4,5,7,9,10 then 3,4,5 first-free (reducer SleepTalkLetterSlot)",
  FEATHER_DANCE: "WEAK HISTORY DEPENDENCE: 23/40 arbitrary seeds change up to 17 of 211 frames; the two known shapes A/B are identical (0 frames) and the ROM's own row-0 order reproduces the ROM on 211/211 frames; the reducer simulates the order internally (featherDance.ts compareFeatherDrawOrder), no config field",
  FIRE_BLAST: "FIRST-BODY ORDER = provider [...occupiedPrefix, ...F] (== observed 64-entry order at the activation edge, 2/2 first-body scenarios); reducer literal FIRE_BLAST_ORDER_SEED differs from it only in the relative order of slots 3/4 (A vs B) and A vs B changes 0 of 197 frames (prep6-order-seed.json; fb1-* dumps seedAvsBDiffFrames 0)",
  DRAGON_DANCE: "1-bit/1-frame: allocationOrder derived from the provider = [1,0,2,5,4,3] reproduces the ROM front-to-back orb order [4,3,5,9,7] at window age 20 (prep7-reducer-checks.json); the accepted literal [0..5] gives [3,4,5,7,9] there and still passes its pixel test, so that frame is pixel-neutral",
  DOUBLE_TEAM: "frontClone = 'b' on a first body (provider free order 4 before 3, observed 'b' 2/2 lab scenarios); accepted literal 'a' was read after a preceding AI body. Pixel check (prep7-double-team-firstbody-pixels.json): b = 0 differing pixels over 230 ages, a = 35222 px over 77 ages (region x<128,y<112)",
  ROCK_SLIDE: "spriteOrderSeed (64) provider [...occupiedPrefix, ...F] == accepted literal (GROVYLE_TO_ONIX_ROCK_SLIDE_ORDER_SEED) == observed at the activation edge in both lab orientations; pixel-neutral anyway (0/40 arbitrary seeds, 143/143 model==ROM)",
};
const rows = [], routeFor = (move) => probe.filter((r) => r.move === move);
for (const move of Object.keys(MOVE_ID)) for (const o of O) {
  const acc = acceptedConfig(move, o);
  if (!acc) { rows.push({ move, id: MOVE_ID[move], orientation: o, note: "no accepted evidence" }); continue; }
  const [start, end] = acc.sourceWindow, ageOffset = acc.extras.ageOffset ?? 0, pres0 = acc.extras.presentationAgeAtWindowStart ?? 0;
  const a = iv(ACC[move](o), MOVE_ID[move], start);
  const lab = iv(LAB[move](o), MOVE_ID[move]);
  const row = a.start - start + ageOffset;
  const ageAtAct = pres0 + a.start - start + ageOffset;
  rows.push({ move, id: MOVE_ID[move], orientation: o, acceptedScenario: acc.scenario, activation: a.start, scriptEndFirstInactive: a.end, scriptFrames: a.end - a.start, window: [start, end], ageOffset, presentationAgeAtWindowStart: pres0,
    reducerAgeAtActivation: ageAtAct, liveAgeBasis: ageAtAct, shadowRowFormula: row, shadowRowInMap: row >= 0 && row < end - start + 1 && ["ICE_PUNCH", "SLEEP_TALK", "FIRE_BLAST", "DRAGON_DANCE", "ROCK_SLIDE"].includes(move), windowStartMinusActivation: start - a.start, duration: end - start + 1, windowEndMinusScriptEnd: end - a.end,
    firstBodyLab: { activation: lab.start, scriptEndFirstInactive: lab.end, scriptFrames: lab.end - lab.start }, precedingBodiesOfAcceptedScenario: PRECEDING[move](o) });
}
const slotAudit = Object.fromEntries(sprites.map((s) => [s.file, { spawnFrames: s.spawnFrames, spawnFramesFirstFree: s.spawnFramesFirstFree, row0EqualsKnownEntryFirstMove: s.row0EqualsKnownEntryFirstMove, arbitrarySeedsWithDiff: s.arbitrarySeedsWithDiff, arbitraryDiffFramesMax: s.arbitraryDiffFramesMax, seedAvsBDiffFrames: s.seedAvsBDiffFrames, modelEqualsRomOrderSameFrame: s.modelEqualsRomOrderSameFrame, rows: s.rows, spawnSlotsInOrder: s.spawnSlotsInOrder }]));
writeFileSync(`${FX}/prep7-summary.json`, JSON.stringify({ schema: "prep7-summary/v1", verdicts: VERDICT, rows, slotAudit }, null, 1) + "\n");
const DRAFTED = ["AERIAL_ACE", "QUICK_ATTACK", "ICE_PUNCH", "FAKE_TEARS", "SLEEP_TALK", "FEATHER_DANCE", "FIRE_BLAST", "DRAGON_DANCE", "DOUBLE_TEAM", "ROCK_SLIDE"];
const SPRITE_FILE = { AERIAL_ACE: (o) => `aerial-ace-${o === "player-back" ? "player-" : ""}pidgeotto-onix`, QUICK_ATTACK: (o) => `quick-attack-${o === "player-back" ? "player-" : ""}pidgeotto-onix`, FEATHER_DANCE: (o) => `feather-dance-${o === "player-back" ? "player-" : ""}pidgeotto-onix`,
  FAKE_TEARS: (o) => `fake-tears-${o === "player-back" ? "player-delcatty-opponent" : "opponent-delcatty-player"}-shuckle`, SLEEP_TALK: (o) => `sleep-talk-${o === "player-back" ? "player-seaking-opponent" : "opponent-seaking-player"}-onix`,
  ICE_PUNCH: (o) => `ip-${sideOf(o)}`, ROCK_SLIDE: (o) => `rs-${sideOf(o)}`, DOUBLE_TEAM: (o) => `dt-${sideOf(o)}`, FIRE_BLAST: (o) => `fb1-${sideOf(o)}`, DRAGON_DANCE: (o) => `dd-${sideOf(o)}` };
const HUD_GATE = { // battleScene.ts branches (current master line numbers) to lift under liveField: species-pair throw, hard-coded art, hard-coded drawSendOutHealthbox/composePlayerHealthbox block
  AERIAL_ACE: "branch :50131-50342; pair gate :50135-50146 (PIDGEOTTO->ONIX only); hard-coded healthboxes :50265-50299; messages :50319-50326", QUICK_ATTACK: "branch :48633-48836; pair gate :48637-48648; healthboxes :48760-48794; messages :48813-48820",
  FEATHER_DANCE: "branch :48836-48979; pair gate :48840-48852; healthboxes :48896-48924; messages :48956-48963", ICE_PUNCH: "branch :48979-49332 (the longest: sitrus/freeze/ice-cube HUD at :49030-49236); pair gate :48984-48997 (ONIX<->GROVYLE); player healthbox :49212; messages :49256-49319",
  FAKE_TEARS: "branch :33728-33904; pair gate :33756-33767 (DELCATTY->SHUCKLE); healthboxes :33833-33856; messages :33887-33894", SLEEP_TALK: "branch :34258-34392; pair gate :34273-34284 (SEAKING<->ONIX); hard-coded sleep status/HP :34362-34378; player y -8 :34304-34306; message :34383",
  FIRE_BLAST: "branch :47647-47758; pair gate :47653-47663 (OCTILLERY<->ONIX); hard-coded art :47664-47665; healthboxes :47733-47742", DRAGON_DANCE: "branch :37136-37219; no species gate (art looked up by species :37142-37152, throws if missing); healthboxes :37196-37207 from profile hp",
  DOUBLE_TEAM: "branch :49467-49565; gate :49471-49477 (player ONIX -> opponent GROVYLE only); healthboxes :49531-49536; message :49556", ROCK_SLIDE: "branch :49565-49637; gate :49571-49576 (opponent GROVYLE -> player ONIX only); healthboxes :49601-49606; message :49628",
};
for (const move of DRAFTED) for (const o of O) {
  const acc = acceptedConfig(move, o), r = rows.find((x) => x.move === move && x.orientation === o);
  if (!acc) continue;
  const side = sideOf(o), tside = otherSide(side), c = acc.config;
  const mine = pins.filter((p) => p.move === move && p.orientation === o);
  const derived = {}; for (const p of mine) derived[p.field] = p.derived;
  const diffs = mine.filter((p) => p.match === false && p.consumed).map((p) => ({ field: p.field, accepted: p.accepted, derived: p.derived, note: p.note }));
  const sp = sprites.find((s) => s.file === `${SPRITE_FILE[move](o)}.json`);
  const routes = routeFor(move).filter((x) => x.requestedMove && (!["FIRE_BLAST", "DRAGON_DANCE", "ROCK_SLIDE"].includes(move) || x.firstBodyOrderKnown));
  const extras = {}; for (const k of ["animationProfile", "attackerPictureBounds", "animationAgeOffset", "moveTextStartAge", "hpDrainProfile", "controllerDisplayProfile", "controllerProfile", "controllerPresentation"]) if (c[k] !== undefined) extras[k] = c[k];
  const d = { schema: "prep7-adapter-draft/v1", move, probe: acc.scenario, scenario: acc.scenario, attacker: { species: c.attacker.species, geometry: { side } }, target: { species: c.target.species, geometry: { side: tside } },
    fieldProfile: c.fieldProfile ?? null, orientation: `${o} ${acc.species[0]} -> ${acc.species[1]}`, verdict: VERDICT[move], denseWindow: { startFrame: acc.sourceWindow[0], endFrame: acc.sourceWindow[1], ageOffset: r.ageOffset },
    draft: { activationFrame: r.activation, scriptEndFirstInactive: r.scriptEndFirstInactive, shadowRow: r.shadowRowFormula, shadowRowInMap: r.shadowRowInMap, shadowRowLiveAgeBasis: move === "AERIAL_ACE" || move === "QUICK_ATTACK" || move === "FEATHER_DANCE" ? 0 : undefined,
      expectedDuration: r.duration, scriptFrames: r.scriptFrames, windowEndMinusScriptEnd: r.windowEndMinusScriptEnd, windowStartMinusActivation: r.windowStartMinusActivation, reducerAgeAtActivation: r.reducerAgeAtActivation, liveAgeBasis: r.liveAgeBasis, consumedByTest: false,
      acceptedWindow: { startFrame: acc.sourceWindow[0], endFrame: acc.sourceWindow[1] }, derivedFields: derived, consumedFieldDifferences: diffs, acceptedConfigExtras: extras, order: ORDER[move],
      slotAudit: sp ? { spawnFrames: sp.spawnFrames, spawnFramesFirstFree: sp.spawnFramesFirstFree, row0EqualsKnownEntryFirstMove: sp.row0EqualsKnownEntryFirstMove, arbitrarySeedsWithDiff: sp.arbitrarySeedsWithDiff, spawnSlotsInOrder: sp.spawnSlotsInOrder } : null,
      adhocShadowDraw: "none in the branch (grep shadow|age === 0|liveField over the branch span)", rendererLiftNeeded: HUD_GATE[move], firstBodyLab: r.firstBodyLab,
      routes: routes.slice(0, 5).map((x) => ({ seed: x.seed, streak: x.streak, species: x.species, slot: x.slotIndex, accepted: x.acceptedSpecies, requestFrame: x.moveRequest?.frame, orderInputKnown: x.firstBodyOrderKnown })) },
    precedingBodies: r.precedingBodiesOfAcceptedScenario };
  if (move === "AERIAL_ACE" || move === "QUICK_ATTACK" || move === "FEATHER_DANCE") d.draft.livePlan = `liveMoveAnimationPresentation returns { config: {move, attacker, target, fieldProfile, controllerProfile: neutral, moveTextStartAge: 0, animationAgeOffset: 0}, age: age + ${r.liveAgeBasis} }; body fn reads age+offset and attacker/target side only; the queue owns the ${r.reducerAgeAtActivation} pre-activation text rows (body idle for animationAge < ${move === "AERIAL_ACE" ? 50 : move === "QUICK_ATTACK" ? 52 : 54})`;
  if (move === "FAKE_TEARS") d.draft.livePlan = "attacker passed through affineCenterBattler (animationCenter = sprite centre), attackerPictureBounds = {left: pic.x - w/2, right: pic.x + w/2, top: pic.y - h/2} from liveBattlerAnchors + coords; window starts 1 frame after activation (row -1, no map row) and ends 4 clear rows after the script end";
  if (move === "SLEEP_TALK") d.draft.livePlan = "request 214 then the called move as a SEPARATE ordinary second request (prep7-sleep-talk-field.json: Exploud 214 @1432 -> Shadow Ball 247 @1488, Whiscash 214 @1648 -> Fissure 90 @1704, 56-frame gap); displayed attacker status = 'sleep' at the event (4/4 routes); no config profile";
  if (move === "DRAGON_DANCE") d.draft.livePlan = "allocationSlots = lowest-free [3,4,5,7,9,10]; allocationOrder = for the provider free order F: slots.filter in F order -> orb index list = [1,0,2,5,4,3] (red.dragonDance); gate on spriteOrderInput.known, else null";
  if (move === "FIRE_BLAST") d.draft.livePlan = "gate on spriteOrderInput.known (first body); config from accepted-extras via derivedFields; no reducer input needed (seed A literal == provider B in pixels, 0/197 frames)";
  if (move === "ROCK_SLIDE") d.draft.livePlan = "spriteOrderSeed = spriteOrderWithOccupiedPrefix(known F, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER) when known, else the same constant (pixel-neutral: 0/40 seeds); occupiedSpriteSlots = known-entry occupants; decline the player-attacker orientation (no accepted evidence, renderer gate :49573)";
  if (move === "DOUBLE_TEAM") d.draft.livePlan = "frontClone = F.indexOf(4) < F.indexOf(3) ? 'b' : 'a' from the first-body free order; blocked until the order seam survives the preceding 'stat' command; decline the opponent-attacker orientation (no accepted evidence, renderer gate :49472)";
  if (move === "ICE_PUNCH") d.draft.livePlan = "no hpDrainProfile/controllerDisplayProfile (queue owns HP/result/status/menu); body = crystals + overlay + hit crystals from target animationCenter; script 183 frames, the accepted window's remaining rows are controller HUD";
  writeFileSync(`${FX}/prep7-${move.toLowerCase().replace(/_/g, "-")}-${side}.json`, JSON.stringify(d, null, 2) + "\n");
}
for (const s of rows) console.log(s.move, s.orientation?.slice(0, 3), s.note ?? "", "act", s.activation, "end", s.scriptEndFirstInactive, "win", s.window?.join(".."), "ageOff", s.ageOffset, "age@act", s.reducerAgeAtActivation, "rowF", s.shadowRowFormula, "dur", s.duration, "ws-act", s.windowStartMinusActivation, "we-se", s.windowEndMinusScriptEnd, "lab", s.firstBodyLab?.activation + "/" + s.firstBodyLab?.scriptFrames);
