// prep8: activation/window/shadow-row summary for the ten moves (fixtures/prep8-summary.json) and DRAFTED live fixtures fixtures/prep8-<move>-{player,opponent}.json (`<side>` = attacker side;
// schema prep8-adapter-draft/v1 = prep7 draft shape incl. `precedingBodies`). Inputs: accepted configs (prep8Accepted.mjs), activation receipts (prep8-activation/), pins, allocator receipt, sprite analysis, order-pixel
// sensitivity, tracker-lend receipt, route probe/scans. Unverified by an adapter run (no harness).   node --experimental-strip-types tools/integration/prep8Draft.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { acceptedConfig, O, sideOf, otherSide, MOVE_ID, EVIDENCE } from "./prep8Accepted.mjs";
const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
const FX = "tools/integration/fixtures";
const pins = rd(`${FX}/prep8-pins.json`), alloc = rd(`${FX}/prep8-allocator.json`), sprites = rd(`${FX}/prep8-sprites-analysis.json`), px = rd(`${FX}/prep8-order-pixels.json`), tie = rd(`${FX}/prep8-tie-scan.json`),
  lend = rd(`${FX}/prep8-tracker-lend.json`).scenarios, probe = rd(`${FX}/prep8-route-probe.json`), gate = rd(`${FX}/prep8-gate.json`);
const scan = Object.fromEntries(["ZAP_CANNON", "UPROAR", "HORN_DRILL", "AURORA_BEAM"].map((m) => [m, rd(`${FX}/prep8-route-scan-${m}.json`)]));
const opp = rd(`${FX}/prep8-opponent-routes-0.json`);
const STEM = { SWIFT: "swift-%-staryu-%-onix", TRICK: "trick-%-furret-%-chansey", THUNDERBOLT: "thunderbolt-%-delcatty-%-shuckle", FRUSTRATION: "frustration-%-furret-%-onix", HORN_DRILL: "horn-drill-%-seaking-%-onix", SEISMIC_TOSS: "seismic-toss-%-kecleon-%-onix", AURORA_BEAM: "aurora-beam-%-seadra-%-onix", STOCKPILE: "stockpile-%-pelipper-%-delcatty", UPROAR: "uproar-%-vigoroth-%-onix", ZAP_CANNON: "zap-cannon-%-forretress-%-shuckle" };
const stem = (m, o) => { const [a, b] = o === "player-back" ? ["player", "opponent"] : ["opponent", "player"]; let i = 0; return STEM[m].replace(/%/g, () => (i++ === 0 ? a : b)); };
const recPath = (m, o, first) => `${FX}/prep8-activation/${m === "TRICK" ? "" : "mechanic-"}${stem(m, o)}${first ? "-firstbody" : ""}.json`;
const FIRSTBODY_SCEN = new Set(["AURORA_BEAM", "HORN_DRILL", "STOCKPILE"]); // accepted scenario runs a Tackle/Peck body first: first-body lab scenario derived (prep8Scenarios.py)
const denseFrames = (m, o) => { const f = JSON.parse(gunzipSync(readFileSync(`tools/compare/evidence/${EVIDENCE[m]}-${sideOf(o)}-dense-state.json.gz`)).toString()).frames; return [f[0].frame, f.at(-1).frame]; };
const VERDICT = {
  SWIFT: "READY (both orientations): allocator constants only (starSlots, shake task slot 0), no order field; gate = known allocator baseline",
  TRICK: "READY (both orientations): allocator constants only (bagSlots [3,4], task slots), no order field; gate = known allocator baseline",
  THUNDERBOLT: "READY-WITH-ORDER (both): bolt/orb/flash/arc `order` fields = ROM birth indices of the lent order (pixel-neutral: 0 px / 3 permutations x 2 orientations); gate = spriteOrderInput.known; shadow draw to retire",
  FRUSTRATION: "READY-WITH-ORDER (both): impactOrders [63,1] pixel-neutral (0 px, swapped / provider index); gate = spriteOrderInput.known",
  HORN_DRILL: "READY-WITH-ORDER (both): spriteOrderSeed [3,4,5] = lent order restricted to the slots (accepted post-Tackle shape == tracker lend 2/2; first-body shape [4,3,5] pixel-neutral); hornMatrixId is an adapter constant (OAM bits)",
  SEISMIC_TOSS: "READY-WITH-ORDER (both): persistentOrder (3 waves) pixel-neutral, equals ROM birth index; battler palettes = art palettes (derivable); accepted carrier GRUMPIG is never a generated carrier",
  AURORA_BEAM: "READY-WITH-ORDER (both): 64-entry spriteOrderSeed = [...occupiedPrefix, ...lent order] (post-Tackle accepted literal == tracker lend 2/2); pixel-neutral, no pool ties",
  STOCKPILE: "READY-WITH-ORDER (both): spriteOrderSeed [3,4,5,9,7] (post-Peck) == tracker lend 2/2; pixel-neutral, no pool ties; ad-hoc opponent age-0 shadow to retire",
  UPROAR: "READY-WITH-ORDER (both): spriteOrder (64) == provider [...occupiedPrefix, ...F] == observed (accepted scenario is a first body); pixel-neutral",
  ZAP_CANNON: "READY-WITH-ORDER (both): `order` fields pixel-neutral; the only move whose OAM-model order is seed-sensitive (40/40 arbitrary seeds, <=4 frames) => keep the known-order gate; ad-hoc opponent shadow to retire",
};
const GATES = {
  SWIFT: "branch :15463-15542; no pair gate (art by species, throws if missing :15476,:15480); healthboxes :15527-15535 (level 50, status 'none'); text :15537-15539",
  TRICK: "branch :15108-15307; no pair gate (:15130-15136); healthboxes :15283-15297 (status 'none'); text :15300-15303",
  THUNDERBOLT: "branch :27389-27503; no pair gate; AD-HOC opponent shadow :27412-27414 (age 0); healthboxes :27487-27495; text :27497-27501",
  FRUSTRATION: "branch :40090-40172; no pair gate (art throw :40109); healthboxes :40157-40165 (status 'none'); text :40167-40169",
  HORN_DRILL: "branch :27882-28042; no pair gate; healthboxes :28021-28033; text :28035-28038",
  SEISMIC_TOSS: "branch :39896-39968; no pair gate (art throw :39909); battler palettes from profile :39930-39935 (= art palettes); healthboxes :39954-39962; text :39964-39966",
  AURORA_BEAM: "branch :27638-27762; no pair gate; healthboxes :27743-27752; text :27755-27758",
  STOCKPILE: "branch :21566-21695; no pair gate (art throw :21586-21587); AD-HOC opponent shadow :21647-21657 (attackerShadowAtEntry, age 0); healthboxes :21671-21685; text :21688-21691",
  UPROAR: "branch :35897-35985; no pair gate (art throw :35913); healthboxes :35970-35978; text :35980-35982",
  ZAP_CANNON: "branch :27289-27387; no pair gate; AD-HOC opponent shadow :27310-27313 (age 0); healthboxes :27371-27379; text :27381-27385",
};
const ORDER_NOTE = {
  SWIFT: "no order field; 1 pool-tie frame (stars vs hit); ROM replay model == accepted pixels", TRICK: "no order field; 0 pool ties",
  THUNDERBOLT: "order fields = ROM sSpriteOrder index of the slot at its birth frame (post-sort): 29/32 equal here, rest are recycled slots; 35-41 pool-tie frames; all variants 0 px", FRUSTRATION: "impactOrders [63,1]; 0 pool ties; all variants 0 px",
  HORN_DRILL: "spriteOrderSeed [3,4,5]: accepted = post-Tackle lend; first-body = [4,3,5]; 0 pool ties; all variants 0 px", SEISMIC_TOSS: "persistentOrder = ROM birth index 15/15; 7 pool-tie frames; all variants 0 px",
  AURORA_BEAM: "64-entry seed; accepted = post-Tackle lend; first-body == provider 64; 0 pool ties; all variants 0 px", STOCKPILE: "5-entry seed; accepted = post-Peck lend; 0 pool ties; all variants 0 px",
  UPROAR: "64-entry spriteOrder == provider; 16 pool-tie frames; all variants 0 px", ZAP_CANNON: "order fields = ROM birth index 17/17; 16-18 pool-tie frames; arbitrary seeds change <=4 OAM-model frames; all variants 0 px",
};
const rows = [], drafts = [];
for (const move of Object.keys(MOVE_ID)) for (const o of O) {
  const id = MOVE_ID[move], acc = acceptedConfig(move, o), c = acc.config, side = sideOf(o), tside = otherSide(side);
  const [ws, we] = acc.sourceWindow ?? denseFrames(move, o);
  const rec = rd(recPath(move, o, false)).intervals, a = rec.find((i) => i.move === id), lab = rd(recPath(move, o, FIRSTBODY_SCEN.has(move))).intervals.find((i) => i.move === id);
  const preceding = rec.filter((i) => i.start < a.start && i.move !== 0).map((i) => ({ moveId: i.move, side: tside, activation: i.start, scriptEndFirstInactive: i.end }));
  const row = a.start - ws, scriptFrames = a.end - a.start, duration = we - ws + 1;
  const al = alloc.find((r) => r.move === move && r.orientation === o);
  const spr = sprites.find((s) => s.acceptedConfigKey === `${move}/${o}` && !s.firstBodyDerived), sprFb = sprites.find((s) => s.acceptedConfigKey === `${move}/${o}` && s.firstBodyDerived);
  const tl = lend.find((s) => s.file === `${EVIDENCE[move]}-${side}`), tlb = tl?.bodies.find((b) => b.moveId === id);
  const pxr = px.cases.find((r) => r.move === move && r.orientation === o);
  const ties = tie.find((t) => t.file.startsWith(`${stem(move, o)}.json`.replace(/^/, "")) || t.file === `${stem(move, o)}.json`);
  const myPins = pins.filter((p) => p.move === move && p.orientation === o);
  rows.push({ move, id, orientation: o, acceptedScenario: acc.evidence?.scenario ?? `${stem(move, o)} (uproar dense evidence)`, activation: a.start, scriptEndFirstInactive: a.end, scriptFrames, window: [ws, we], ageOffset: 0, reducerAgeAtActivation: row, liveAgeBasis: row, shadowRowFormula: row,
    windowStartMinusActivation: ws - a.start, duration, windowEndMinusScriptEnd: we - a.end, uncoveredScriptTail: Math.max(0, a.end - we - 0), firstBodyLab: { activation: lab.start, scriptEndFirstInactive: lab.end, scriptFrames: lab.end - lab.start, scenario: FIRSTBODY_SCEN.has(move) ? `${FX}/prep8-scenarios/mechanic-${stem(move, o)}-firstbody.json` : "accepted scenario (the move is already the battle's first body)" },
    precedingBodiesOfAcceptedScenario: preceding, baseline: al.baseline, netZero: al.netZero, allocatorChecksAllEqual: Object.values(al.checks).every((x) => x.equal), orderPixels: pxr ? Object.fromEntries(Object.entries(pxr.variants).map(([k, v]) => [k, v.totalDiffPixels])) : null,
    poolTieFrames: ties?.framesWithEqualKeyPairBothPoolSprites ?? null, trackerLendEqualsObservedAtMoveBody: tlb?.lentEqualsObservedFree ?? null });
  const routes = probe.filter((r) => r.move === move && r.requestedMove).slice(0, 6);
  const wide = scan[move]?.routes.filter((r) => r.requested && r.firstBody && r.orderInputKnown).slice(0, 5);
  const d = { schema: "prep8-adapter-draft/v1", move, probe: acc.evidence?.scenario ?? "uproar dense evidence", attacker: { species: c.attacker.species, geometry: { side } }, target: { species: c.target.species, geometry: { side: tside } }, fieldProfile: c.fieldProfile ?? null,
    orientation: `${o} ${acc.species[0]} -> ${acc.species[1]}`, verdict: VERDICT[move], denseWindow: { startFrame: ws, endFrame: we, ageOffset: 0 },
    draft: { activationFrame: a.start, scriptEndFirstInactive: a.end, shadowRow: row, shadowRowInMap: true, expectedDuration: duration, scriptFrames, windowEndMinusScriptEnd: we - a.end, windowStartMinusActivation: ws - a.start, reducerAgeAtActivation: row, liveAgeBasis: row, consumedByTest: false,
      allocatorDerived: { baseline: "matrix bitmap 0x00000006, no active task, occupied sprite mask f000000000000147 (affine-task summary.json body baseline)", acceptedLiteralsEqualRomPlan: al.checks, replayMismatches: al.replayMismatches, netZero: al.netZero },
      derivedFields: Object.fromEntries(myPins.map((p) => [p.field, p.derived])), pinKinds: Object.fromEntries(myPins.map((p) => [p.field, p.kind.slice(0, 10)])), consumedFieldDifferences: myPins.filter((p) => !p.match && p.consumed).map((p) => ({ field: p.field, accepted: p.accepted, derived: p.derived, note: p.note })),
      acceptedConfigExtras: Object.fromEntries(["animationProfile", "animationGeometry", "animationInputs", "attackerEffectCenter", "targetEffectCenter", "targetInitialX2", "attackerPictureCenter", "attackerPictureYOffset", "attackerShadowAtEntry"].filter((k) => c[k] !== undefined).map((k) => [k, k === "animationProfile" ? JSON.parse(JSON.stringify(c[k], (kk, v) => (kk === "immutableGameplayState" ? "(asserted-unchanged gameplay snapshot; not read for pixels)" : v))) : c[k]])),
      order: ORDER_NOTE[move], orderEvidence: { accepted: spr && { row0OrderEqualsProvider64: spr.row0SpriteOrderEqualsProvider64, modelProviderSeedEqualsRomFrames: `${spr.modelProviderSeedEqualsRomFrames}/${spr.rows}`, arbitrarySeedsWithDiff: spr.arbitrarySeedsWithDiff, spawnSlotsInOrder: spr.spawnSlotsInOrder.slice(0, 24) },
        firstBodyScenario: sprFb && { row0OrderEqualsProvider64: sprFb.row0SpriteOrderEqualsProvider64, modelProviderSeedEqualsRomFrames: `${sprFb.modelProviderSeedEqualsRomFrames}/${sprFb.rows}` }, trackerLend: tlb && { lentKnown: tlb.lentKnown, equalsObservedFreeOrder: tlb.lentEqualsObservedFree, acceptedLiteralVsLent: tlb.acceptedLiteralVsLent }, pixelVariants: row && pxr?.variants && Object.fromEntries(Object.entries(pxr.variants).map(([k, v]) => [k, v.totalDiffPixels])) },
      adhocShadowDraw: GATES[move].includes("AD-HOC") ? GATES[move].match(/AD-HOC[^;]*/)[0] : "none in the branch", rendererLiftNeeded: GATES[move], firstBodyLab: rows.at(-1).firstBodyLab,
      routes: routes.map((x) => ({ seed: x.seed, streak: x.streak, species: x.species, slot: x.slotIndex, acceptedSpecies: x.acceptedSpecies, requestFrame: x.moveRequest?.frame, attacker: x.moveRequest?.attacker, firstBody: x.firstBody, orderInputKnown: x.firstBodyOrderKnown })),
      widerRoutes: wide?.map((x) => ({ seed: x.seed, streak: x.streak, species: x.species, slot: x.slotIndex, requestFrame: x.frame })) ?? null,
      opponentAttackerRoutes: opp.hits.filter((h) => h.move === move && h.firstBody).slice(0, 4).map((h) => ({ seed: h.seed, streak: 0, frame: h.frame, orderInputKnown: h.orderInputKnown })) },
    precedingBodies: preceding };
  drafts.push([`${FX}/prep8-${move.toLowerCase().replace(/_/g, "-")}-${side}.json`, d]);
}
for (const [path, d] of drafts) writeFileSync(path, JSON.stringify(d, null, 2) + "\n");
writeFileSync(`${FX}/prep8-summary.json`, JSON.stringify({ schema: "prep8-summary/v1", verdicts: VERDICT, rendererLift: GATES, rows, gate: { ...gate, targetBodies: undefined } }, null, 1) + "\n");
for (const s of rows) console.log(s.move.padEnd(12), s.orientation.slice(0, 3), "act", s.activation, "end", s.scriptEndFirstInactive, "win", s.window.join(".."), "row", s.shadowRowFormula, "dur", s.duration, "script", s.scriptFrames, "we-se", s.windowEndMinusScriptEnd, "prec", JSON.stringify(s.precedingBodiesOfAcceptedScenario.map((b) => b.moveId)), "labAct", s.firstBodyLab.activation, "ties", s.poolTieFrames, "px", JSON.stringify(s.orderPixels));
