// Order-consumer sensitivity vs OBSERVED hardware order (direct-mGBA raw rows exported by orderConsumerObserved.py).
// For Heal Bell / Leaf Blade / Perish Song / Ember / Dragon Rage: compares the accepted reducers' painter order with the observed sSpriteOrder
// (back-to-front = reverse array order) per presentation age (nominal alignment age 0 = accepted window start, plus a +-3 shift scan),
// and re-runs the persistent-order reducers (Heal Bell, Leaf Blade) from alternative initial permutations (provider F, assumed, 3 others).
//   node --experimental-strip-types tools/integration/orderConsumerTruth.mjs > tools/integration/fixtures/order-consumer-truth.json   (from workspace/)
import { readFileSync } from "node:fs";
import { healBellAtAge } from "../../src/animation/healBell.ts";
import { sortGbaSpriteOrder } from "../../src/animation/gbaObjCompositor.ts";
import { leafBladeAtAge, leafBladeDisplayedOamOrderAtAge } from "../../src/animation/leafBlade.ts";
import { perishSongNotesAtAge } from "../../src/animation/perishSong.ts";
import { emberSpritesAtAge, emberFlareSpritesAtAge, EMBER_SPAWN_COUNT } from "../../src/animation/ember.ts";
import { DRAGON_RAGE_FIRE_PLUME_SPAWNS, dragonRageFirePlumeStateAtAge, dragonRageSchedule, orderFirePlumesForDraw } from "../../src/animation/dragonRage.ts";

const FIX = "tools/integration/fixtures/";
const obs = JSON.parse(readFileSync(FIX + "order-consumer-observed.json", "utf8")).scenarios;
const seeds = JSON.parse(readFileSync(FIX + "order-consumer-seeds.json", "utf8")).scenarios;
const OFFSET = 2006;
const seedOf = (stem) => seeds.find((s) => s.scenario === stem);
const win = (draft) => JSON.parse(readFileSync(FIX + draft + ".json", "utf8")).denseWindow;
const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const frame = (stem, rel) => obs[stem].frames[rel];
const rel0 = (stem, start) => start + OFFSET - obs[stem].bodyFrame;
const painterObs = (stem, rel, present) => { const f = frame(stem, rel); return f ? f.order.filter((s) => present.includes(s)).reverse() : null; };

// generic alignment scan: lists[age] = {present: slots[], paint: reducer back-to-front slots}; returns per-shift mismatch counts
function scan(stem, start, ages, build) {
  const out = {};
  for (const shift of [-3, -2, -1, 0, 1, 2, 3]) {
    let bad = 0, n = 0, first = null;
    for (let age = 0; age < ages; age++) {
      const r = build(age); if (!r || r.present.length < 2) continue;
      const o = painterObs(stem, rel0(stem, start) + age + shift, r.present); if (!o) continue;
      n++; if (!eq(o, r.paint)) { bad++; first ??= { age, observed: o, reducer: r.paint }; }
    }
    out[shift] = { agesCompared: n, agesDiffer: bad, first };
  }
  return out;
}
const best = (sc) => Object.entries(sc).sort((a, b) => a[1].agesDiffer - b[1].agesDiffer)[0];
const result = [];

// ---------------- Perish Song: reducer tie rule centerY asc then oamSlot desc (battleScene.ts:34629-34632) ----------------
for (const [stem, draft] of [["perish-song-player-murkrow-opponent-onix", "prep5-perish-song-player"], ["perish-song-opponent-murkrow-player-onix", "prep5-perish-song-opponent"]]) {
  const w = win(draft), alloc = obs[stem].allocSlotsInCreationOrder.slice(0, 16);
  const NOTE_SLOTS = [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const build = (age, slotOf = (n) => n.oamSlot) => {
    const notes = perishSongNotesAtAge(age); if (!notes.length) return null;
    const sorted = notes.slice().sort((l, r) => l.centerY - r.centerY || slotOf(r) - slotOf(l));
    return { present: notes.map(slotOf), paint: sorted.map(slotOf), notes };
  };
  const sc = scan(stem, w.startFrame, 259, build);
  // classify ages that differ at the nominal shift: do the flipped pairs overlap with different tile/matrix? (= pixel-affecting)
  let tieAges = 0, differAges = 0, pixelAges = 0;
  const nominal = 0;
  for (let age = 0; age < 259; age++) {
    const r = build(age); if (!r) continue;
    const o = painterObs(stem, rel0(stem, w.startFrame) + age + nominal, r.present); if (!o) continue;
    const ties = r.notes.some((a, i) => r.notes.some((b, j) => j > i && a.centerY === b.centerY));
    if (ties) tieAges++;
    if (!eq(o, r.paint)) {
      differAges++;
      const posO = new Map(o.map((s, i) => [s, i])), posR = new Map(r.paint.map((s, i) => [s, i]));
      let px = false;
      for (const a of r.notes) for (const b of r.notes) if (a.oamSlot < b.oamSlot && (posO.get(a.oamSlot) < posO.get(b.oamSlot)) !== (posR.get(a.oamSlot) < posR.get(b.oamSlot))
        && Math.abs(a.centerX - b.centerX) < 16 && Math.abs(a.centerY - b.centerY) < 16 && (a.tileOffset !== b.tileOffset || JSON.stringify(a.matrix) !== JSON.stringify(b.matrix))) px = true;
      if (px) pixelAges++;
    }
  }
  // pair-level: for every equal-centerY pair of visible notes, does rule (a) reducer `higher oamSlot paints first` or rule (b) provider order
  // (array position at creation = F index before the first create; a later create window sorts after) agree with the observed array order?
  const sdp = seedOf(stem), Fc = sdp.providerFBeforeFirstCreate, winOf = new Map();
  sdp.createFrames.forEach(([, cs], wi) => cs.forEach((sl) => { if (!winOf.has(sl) && alloc.includes(sl)) winOf.set(sl, wi); }));
  const rank = (sl) => (winOf.get(sl) ?? 9) * 1000 + Fc.indexOf(sl);
  const pairStats = { ruleA_oamSlotDesc: { pairsFlipped: 0, agesFlipped: 0, overlapDifferentTileAges: 0, ages: [] }, ruleB_providerCreationOrder: { pairsFlipped: 0, agesFlipped: 0, overlapDifferentTileAges: 0, ages: [] } };
  let tiePairs = 0;
  for (let age = 0; age < 259; age++) {
    const r = build(age); if (!r) continue; const f = frame(stem, rel0(stem, w.startFrame) + age); if (!f) continue;
    const pos = new Map(f.order.map((sl, i) => [sl, i]));
    const flipped = { ruleA_oamSlotDesc: [], ruleB_providerCreationOrder: [] };
    for (const a of r.notes) for (const b of r.notes) if (a.index < b.index && a.centerY === b.centerY) {
      tiePairs++;
      const obsFront = pos.get(a.oamSlot) < pos.get(b.oamSlot) ? a : b; // lower array index = front
      const aFront = a.oamSlot < b.oamSlot ? a : b; // rule A: higher slot painted first => lower slot front
      const bFront = rank(a.oamSlot) < rank(b.oamSlot) ? a : b;
      if (aFront !== obsFront) flipped.ruleA_oamSlotDesc.push([a, b]);
      if (bFront !== obsFront) flipped.ruleB_providerCreationOrder.push([a, b]);
    }
    for (const [k, list] of Object.entries(flipped)) if (list.length) {
      pairStats[k].pairsFlipped += list.length; pairStats[k].agesFlipped++;
      if (list.some(([a, b]) => Math.abs(a.centerX - b.centerX) < 16 && Math.abs(a.centerY - b.centerY) < 16 && (a.tileOffset !== b.tileOffset || JSON.stringify(a.matrix) !== JSON.stringify(b.matrix)))) { pairStats[k].overlapDifferentTileAges++; pairStats[k].ages.push(age); }
    }
  }
  result.push({ move: "PERISH_SONG-pairs", stem, equalCenterYPairsChecked: tiePairs, ...pairStats });
  result.push({ move: "PERISH_SONG", stem, reducerSlotsEqualCreationSlots: eq(NOTE_SLOTS, alloc), allocSlots: alloc, scanByShift: sc, bestShift: best(sc)[0],
    nominalShift0: { agesWithEqualCenterYPair: tieAges, agesObservedDiffersFromReducer: differAges, ofWhichFlippedPairOverlapsWithDifferentTileOrMatrix: pixelAges } });
}

// ---------------- Heal Bell: persistent order replay from the initial permutation (healBell.ts:371-407) ----------------
function hbOrder(init, age, side, ac, bp) {
  let o = [...init];
  for (let t = 0; t <= age; t++) {
    const s = healBellAtAge(t, side, ac, bp);
    o = sortGbaSpriteOrder(o, o.map((slot) => {
      const n = s.notes.find((c) => c.slot === slot); if (n) return { slot, priority: 2, subpriority: 40, y: n.y + n.y2 - 8 };
      const r = s.rings.find((c) => c.slot === slot); if (r) return { slot, priority: 2, subpriority: 40, y: r.y - 64 };
      return { slot, priority: 3, subpriority: 255, y: -96 };
    }));
  }
  const s = healBellAtAge(age, side, ac, bp), by = new Map(s.notes.map((n) => [n.slot, n]));
  return { paint: o.slice().reverse().filter((slot) => by.has(slot)), notes: s.notes };
}
const HB = { player: [{ x: 72, y: 95 }, { x: 72, y: 80 }], opponent: [{ x: 176, y: 34 }, { x: 176, y: 40 }] };
for (const [stem, draft, side] of [["heal-bell-player-chimecho-opponent-onix", "prep5-heal-bell-player", "player"], ["heal-bell-opponent-chimecho-player-onix", "prep5-heal-bell-opponent", "opponent"]]) {
  const w = win(draft), [ac, bp] = HB[side], sd = seedOf(stem);
  const SLOTS = [4, 5, 7, 9, 10, 11];
  const providerInit = sd.providerFAtEdge.filter((s) => SLOTS.includes(s));
  const observedInit = (() => { const f = frame(stem, rel0(stem, w.startFrame)); return f.order.filter((s) => SLOTS.includes(s)); })();
  const inits = { assumedAscending: SLOTS, providerFAtActivation: providerInit, observedAtAgeZero: observedInit,
    descending: [...SLOTS].reverse(), rotated: [7, 9, 10, 11, 4, 5], interleaved: [5, 9, 4, 11, 7, 10] };
  const rows = {};
  for (const [name, init] of Object.entries(inits)) {
    const build = (age) => { const r = hbOrder(init, age, side, ac, bp); return { present: r.notes.map((n) => n.slot), paint: r.paint }; };
    const sc = scan(stem, w.startFrame, 261, build);
    rows[name] = { init, shift0: sc[0], bestShift: best(sc)[0], bestShiftAgesDiffer: best(sc)[1].agesDiffer };
  }
  // reducer-vs-reducer sensitivity: ages whose painter order differs between assumed and each alternative (+overlap)
  const sens = {};
  for (const [name, init] of Object.entries(inits)) {
    if (name === "assumedAscending") continue;
    let differ = 0, overlap = 0;
    for (let age = 0; age < 261; age++) {
      const a = hbOrder(inits.assumedAscending, age, side, ac, bp), b = hbOrder(init, age, side, ac, bp);
      if (eq(a.paint, b.paint)) continue; differ++;
      const pos = (n) => ({ x: n.x + n.x2, y: n.y + n.y2 }); const by = new Map(a.notes.map((n) => [n.slot, n]));
      const ia = new Map(a.paint.map((s, i) => [s, i])), ib = new Map(b.paint.map((s, i) => [s, i]));
      outer: for (const s1 of a.paint) for (const s2 of a.paint) if (s1 < s2 && (ia.get(s1) < ia.get(s2)) !== (ib.get(s1) < ib.get(s2))
        && Math.abs(pos(by.get(s1)).x - pos(by.get(s2)).x) < 16 && Math.abs(pos(by.get(s1)).y - pos(by.get(s2)).y) < 16) { overlap++; break outer; }
    }
    sens[name] = { agesPainterOrderDiffersFromAssumed: differ, ofWhichFlippedPairOverlaps16: overlap };
  }
  result.push({ move: "HEAL_BELL", stem, initialOrders: rows, sensitivityVsAssumed: sens });
}

// ---------------- Leaf Blade: displayed OAM order replay from [3, ...TRAIL_OAM_SLOTS] (leafBlade.ts:236-275) ----------------
function lbOrder(init, age, aSide, tSide, geo) {
  const order = [...init];
  for (let displayAge = 0; displayAge <= age; displayAge++) {
    const created = leafBladeAtAge(displayAge - 2, aSide, tSide, geo).sprites;
    const oam = leafBladeAtAge(displayAge - 1, aSide, tSide, geo).sprites;
    const admitted = created.flatMap((sprite) => {
      const transferred = oam.find((c) => c.kind === sprite.kind && c.spawnIndex === sprite.spawnIndex);
      return transferred || sprite.kind === "blade" ? [{ slot: sprite.oamSlot, subpriority: transferred?.subpriority ?? sprite.subpriority, y: sprite.y }] : [];
    });
    const bySlot = new Map(admitted.map((s) => [s.slot, s]));
    order.sort((l, r) => (bySlot.get(l)?.subpriority ?? 0xff) - (bySlot.get(r)?.subpriority ?? 0xff) || (bySlot.get(r)?.y ?? 160) - (bySlot.get(l)?.y ?? 160));
  }
  return order;
}
for (const [stem, draft, aSide, tSide, geo] of [
  ["leaf-blade-player-sceptile-opponent-onix", "prep5-leaf-blade-player", "player", "opponent", { pictureOffset: { x: 176, y: 42 }, width: 56, height: 64, subpriority: 40 }],
  ["leaf-blade-opponent-sceptile-player-onix", "prep5-leaf-blade-opponent", "opponent", "player", { pictureOffset: { x: 72, y: 88 }, width: 56, height: 64, subpriority: 30 }]]) {
  const w = win(draft), sd = seedOf(stem);
  const SLOTS = [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16];
  const providerInit = sd.providerFAtEdge.filter((s) => SLOTS.includes(s));
  const observedInit = frame(stem, rel0(stem, w.startFrame)).order.filter((s) => SLOTS.includes(s));
  const inits = { assumed_3_then_trails: SLOTS, providerFAtActivation: providerInit, observedAtAgeZero: observedInit,
    descending: [...SLOTS].reverse(), rotated: [...SLOTS.slice(5), ...SLOTS.slice(0, 5)], interleaved: [...SLOTS].sort((a, b) => (a * 7) % 13 - (b * 7) % 13) };
  const rows = {}, sens = {};
  const ages = 224;
  for (const [name, init] of Object.entries(inits)) {
    let bad = 0, n = 0, first = null;
    for (const shift of [0]) for (let age = 0; age < ages; age++) {
      const o = frame(stem, rel0(stem, w.startFrame) + age + shift); if (!o) continue;
      const obsOrder = o.order.filter((s) => SLOTS.includes(s)), mine = lbOrder(init, age, aSide, tSide, geo);
      n++; if (!eq(obsOrder, mine)) { bad++; first ??= { age, observed: obsOrder, reducer: mine }; }
    }
    rows[name] = { init, shift0AgesCompared: n, shift0AgesFullOrderDiffers: bad, first };
  }
  // observed check restricted to the visible sprites of the OAM at that age (the free slots' relative order is not modelled by the reducer)
  const present = {};
  for (const [name, init] of Object.entries(inits)) {
    const byShift = {};
    for (const shift of [-2, -1, 0, 1, 2]) {
      let bad = 0, n = 0, first = null;
      for (let age = 0; age < ages; age++) {
        const vis = leafBladeAtAge(age - 1, aSide, tSide, geo).sprites.filter((s2) => !s2.invisible).map((s2) => s2.oamSlot);
        const o = painterObs(stem, rel0(stem, w.startFrame) + age + shift, vis); if (!o || vis.length < 2) continue;
        const mine = lbOrder(init, age, aSide, tSide, geo).slice().reverse().filter((sl) => vis.includes(sl));
        n++; if (!eq(o, mine)) { bad++; first ??= { age, observed: o, reducer: mine }; }
      }
      byShift[shift] = { agesCompared: n, agesVisibleOrderDiffersFromObserved: bad, first };
    }
    present[name] = byShift;
  }
  rows.__visibleOnlyVsObserved = present;
  // same for the production-order (spawn/blade/trail present sprites only): flipped pairs that overlap with different tile cells
  for (const [name, init] of Object.entries(inits)) {
    if (name === "assumed_3_then_trails") continue;
    let differ = 0, pixel = 0;
    for (let age = 0; age < ages; age++) {
      const a = lbOrder(inits.assumed_3_then_trails, age, aSide, tSide, geo), b = lbOrder(init, age, aSide, tSide, geo);
      const sp = leafBladeAtAge(age - 1, aSide, tSide, geo).sprites.filter((s) => !s.invisible);
      const ia = new Map(a.map((s, i) => [s, i])), ib = new Map(b.map((s, i) => [s, i]));
      let d = false, px = false;
      for (const s1 of sp) for (const s2 of sp) if (s1.oamSlot < s2.oamSlot && (ia.get(s1.oamSlot) < ia.get(s2.oamSlot)) !== (ib.get(s1.oamSlot) < ib.get(s2.oamSlot))) {
        d = true; if (s1.x === s2.x && s1.y === s2.y && s1.tileCell !== s2.tileCell) px = true; else if (Math.abs(s1.x - s2.x) < 32 && Math.abs(s1.y - s2.y) < 32 && s1.tileCell !== s2.tileCell) px = true;
      }
      if (d) differ++; if (px) pixel++;
    }
    sens[name] = { agesVisiblePairOrderFlipped: differ, ofWhichOverlappingPairHasDifferentTileCell: pixel };
  }
  result.push({ move: "LEAF_BLADE", stem, initialOrders: rows, sensitivityVsAssumed: sens });
}

// ---------------- Ember: ties by screen Y then creationOrder (emberSpritesInDrawOrder, ember.ts:174-199) ----------------
for (const [stem, draft, side, sub] of [["ember-player-onix-opponent-murkrow", "prep4-ember-player", "player", 40], ["ember-opponent-onix-player-murkrow", "prep4-ember-opponent", "opponent", 30]]) {
  const w = win(draft), geo = JSON.parse(readFileSync(FIX + draft + ".json", "utf8")).draft.animationProfile, alloc = obs[stem].allocSlotsInCreationOrder;
  const build = (age) => {
    const em = emberSpritesAtAge(age, geo).map((s) => ({ ...s, co: s.spawnIndex }));
    const fl = emberFlareSpritesAtAge(age, geo).map((s) => ({ ...s, co: EMBER_SPAWN_COUNT + s.spawnIndex }));
    const all = [...em, ...fl].map((s) => ({ ...s, slot: alloc[s.co] }));
    const sorted = all.slice().sort((a, b) => a.centerY - b.centerY || b.co - a.co);
    return { present: all.map((s) => s.slot), paint: sorted.map((s) => s.slot), all };
  };
  const sc = scan(stem, w.startFrame, 63, build);
  let tieAges = 0; for (let age = 0; age < 63; age++) { const r = build(age); if (r.all.some((a, i) => r.all.some((b, j) => j > i && a.centerY === b.centerY))) tieAges++; }
  result.push({ move: "EMBER", stem, allocSlots: alloc, createWindowSizes: obs[stem].createFrames.map((c) => c[1].length), scanByShift: sc, bestShift: best(sc)[0], agesWithEqualYPair: tieAges });
}

// ---------------- Dragon Rage: plumes y asc then spawnIndex desc within each subpriority group (battleScene.ts:50791-50796) ----------------
for (const [stem, draft, side, tsub, bp] of [["dragon-rage-charmeleon-onix", "prep5-dragon-rage-player", "player", 40, { x: 176, y: 40 }], ["dragon-rage-onix-charmeleon", "prep5-dragon-rage-opponent", "opponent", 30, { x: 72, y: 80 }]]) {
  const w = win(draft), sched = dragonRageSchedule(0), PLUME_SLOTS = [3, 4, 5, 7, 9, 10, 11, 12];
  const build = (age) => {
    const a = age - 1; // DRAGON_RAGE_FRAMEBUFFER_FIRE_PLUME_AGE_LAG
    const live = DRAGON_RAGE_FIRE_PLUME_SPAWNS.map((sp, i) => {
      const st = dragonRageFirePlumeStateAtAge(sp, side, bp, tsub, a - sched.firePlumeTicks[i]);
      return st ? { ...st, spawnIndex: i, subpriorityOffset: sp.subpriorityOffset, slot: PLUME_SLOTS[i] } : null;
    }).filter(Boolean);
    const behind = orderFirePlumesForDraw(live.filter((p) => p.subpriorityOffset >= 64)), front = orderFirePlumesForDraw(live.filter((p) => p.subpriorityOffset < 64));
    return { present: live.map((p) => p.slot), paint: [...behind, ...front].map((p) => p.slot), live };
  };
  const sc = scan(stem, w.startFrame, 150, build);
  let tieAges = 0; for (let age = 0; age < 150; age++) { const r = build(age); if (r.live.some((a, i) => r.live.some((b, j) => j > i && a.y === b.y && a.subpriorityOffset === b.subpriorityOffset))) tieAges++; }
  result.push({ move: "DRAGON_RAGE", stem, createWindowSizes: obs[stem].createFrames.map((c) => c[1].length), scanByShift: sc, bestShift: best(sc)[0], agesWithEqualYSameSubpriorityPair: tieAges });
}
console.log(JSON.stringify(result, null, 1));
