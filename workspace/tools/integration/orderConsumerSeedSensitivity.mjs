// Order-consumer prep: pixel/draw-order sensitivity of the accepted seed consumers to the sSpriteOrder seed.
// Renders the ACCEPTED reducers (flamethrower.ts, blazeKick.ts, rockThrow.ts, mudSlap.ts, sandAttack.ts) from the accepted fixture seed and from
// alternative permutations of the free-slot part (provider-at-allocation, swap 3/4, reversed, ascending, rotated) and counts presentation ages whose draw
// order differs; for position-carrying sprites also ages where a flipped pair overlaps (|dx|,|dy| < 16 = two 16x16 cells).
//   node --experimental-strip-types tools/integration/orderConsumerSeedSensitivity.mjs > tools/integration/fixtures/order-consumer-seed-sensitivity.json  (from workspace/)
import { readFileSync } from "node:fs";
import { derive } from "./prep4Production.mjs";
import { flamethrowerFlamesAtAge } from "../../src/animation/flamethrower.ts";
import { blazeKickSpritesAtAge } from "../../src/animation/blazeKick.ts";
import { rockThrowDrawOrder, rockThrowRockState } from "../../src/animation/rockThrow.ts";
import { mudSlapMudAtAge } from "../../src/animation/mudSlap.ts";
import { sandAttackDirtAtAge } from "../../src/animation/sandAttack.ts";
const CF = (n) => JSON.parse(readFileSync(`tools/compare/fixtures/${n}.json`, "utf8"));
const OCC = [0, 1, 2, 6, 8, 60, 61, 62, 63];
const seeds = JSON.parse(readFileSync("tools/integration/fixtures/order-consumer-seeds.json", "utf8")).scenarios;
const sdOf = (stem, mv) => seeds.find((s) => s.scenario === stem && s.move === mv && s.bodyOfMove === 0);
const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const ov = (a, b) => Math.abs(a.x - b.x) < 16 && Math.abs(a.y - b.y) < 16;
function variantsSubset(order) {
  const rev = [...order].reverse(), asc = [...order].sort((a, b) => a - b), rot = [...order.slice(3), ...order.slice(0, 3)];
  const sw = [...order]; const i3 = sw.indexOf(3), i4 = sw.indexOf(4); if (i3 >= 0 && i4 >= 0) { sw[i3] = 4; sw[i4] = 3; }
  return { swap34: sw, reversed: rev, ascending: asc, rotated3: rot };
}
function variants64(order) { // permute only the free tail, keep the occupied prefix
  const occ = order.filter((s) => OCC.includes(s)), tail = order.filter((s) => !OCC.includes(s));
  const v = variantsSubset(tail); return Object.fromEntries(Object.entries(v).map(([k, t]) => [k, [...occ, ...t]]));
}
function compare(label, ages, render, accepted, alts, extra) {
  const base = ages.map((a) => render(accepted, a));
  const rows = {};
  for (const [name, seed] of Object.entries(alts)) {
    let differ = 0, overlap = 0, first = null;
    ages.forEach((a, i) => {
      const r = render(seed, a);
      if (!eq(r.ids, base[i].ids)) {
        differ++; first ??= { age: a, accepted: base[i].ids, alt: r.ids };
        if (r.pos) { const pa = new Map(base[i].ids.map((s, k) => [s, k])), pb = new Map(r.ids.map((s, k) => [s, k]));
          let hit = false; for (const s1 of r.ids) for (const s2 of r.ids) if (s1 < s2 && (pa.get(s1) < pa.get(s2)) !== (pb.get(s1) < pb.get(s2)) && ov(r.pos.get(s1), r.pos.get(s2))) hit = true;
          if (hit) overlap++; }
      }
    });
    rows[name] = { agesDrawOrderDiffers: differ, agesFlippedPairOverlaps16: r_or_null(overlap, base[0].pos), first };
  }
  return { label, agesRendered: ages.length, ...extra, alternatives: rows };
}
const r_or_null = (n, pos) => (pos ? n : null);
const res = [];
const range = (n) => Array.from({ length: n }, (_, i) => i);
// FLAMETHROWER (animationProfile = FlamethrowerGeometry) and BLAZE_KICK
for (const stem of ["flamethrower-player-onix-opponent-murkrow", "flamethrower-opponent-onix-player-murkrow"]) {
  const g = CF(stem).animationProfile, provider = sdOf(stem, 53).providerFBeforeFirstCreate.filter((s) => g.flameSpriteSlots.includes(s));
  const alts = { providerFAtFirstAlloc: provider, ...variantsSubset(g.spriteOrderSeed) };
  res.push(compare(stem, range(130), (seed, age) => { const f = flamethrowerFlamesAtAge(age, { ...g, spriteOrderSeed: seed }); return { ids: f.map((x) => x.slot), pos: new Map(f.map((x) => [x.slot, { x: x.centerX, y: x.centerY }])) }; }, g.spriteOrderSeed, alts, { move: "FLAMETHROWER", acceptedSeed: g.spriteOrderSeed, providerSeed: provider, providerEqualsAccepted: eq(provider, g.spriteOrderSeed) }));
}
for (const stem of ["blaze-kick-player-onix-opponent-murkrow", "blaze-kick-opponent-onix-player-murkrow"]) {
  const g0 = CF(stem), g = { ...g0.animationProfile, targetCenter: g0.animationProfile.targetCenter };
  const provider = sdOf(stem, 299).providerFBeforeFirstCreate.filter((s) => g.spriteSlots.includes(s));
  // BlazeKickGeometry needs more fields than the fixture lists at top level; pass the whole accepted animationProfile as the production builder does
  const alts = { providerFAtFirstAlloc: provider, ...variantsSubset(g.spriteOrderSeed) };
  let ok = true; try { blazeKickSpritesAtAge(5, g); } catch (e) { ok = false; res.push({ label: stem, move: "BLAZE_KICK", skipped: String(e.message).slice(0, 160) }); }
  if (ok) res.push(compare(stem, range(80), (seed, age) => { const s = blazeKickSpritesAtAge(age, { ...g, spriteOrderSeed: seed }); return { ids: s.map((x, i) => x.slot ?? `${x.kind}${i}`), pos: new Map(s.map((x, i) => [x.slot ?? `${x.kind}${i}`, { x: x.centerX, y: x.centerY }])) }; }, g.spriteOrderSeed, alts, { move: "BLAZE_KICK", acceptedSeed: g.spriteOrderSeed, providerSeed: provider, providerEqualsAccepted: eq(provider, g.spriteOrderSeed) }));
}
// ROCK_THROW (64-entry seed; draw order of the alive rocks)
for (const [stem, side] of [["rock-throw-player-graveler-opponent-onix", "player"], ["rock-throw-opponent-graveler-player-onix", "opponent"]]) {
  const f = CF(stem), p = f.animationProfile, tgt = derive("GRAVELER", side, "ONIX").target.picOffsetPoint, geo = { rockOrigin: { x: tgt.x, y: tgt.y + 14 } };
  const alts = variants64(p.spriteOrderSeed);
  const sd = sdOf(stem, 88), occ = p.spriteOrderSeed.filter((s) => OCC.includes(s)); alts.providerFAtFirstAlloc = [...occ, ...sd.providerFBeforeFirstCreate];
  res.push(compare(stem, range(90), (seed, age) => ({ ids: [...rockThrowDrawOrder(age, { ...p, spriteOrderSeed: seed }, geo)], pos: new Map(range(12).map((i) => [i, rockThrowRockState(i, age, p, geo)]).filter(([, st]) => st).map(([i, st]) => [i, { x: st.centerX, y: st.centerY }])) }),
    p.spriteOrderSeed, alts, { move: "ROCK_THROW", providerFreeTailEqualsAccepted: eq(sd.providerFBeforeFirstCreate, p.spriteOrderSeed.filter((s) => !OCC.includes(s))) }));
}
// MUD_SLAP / SAND_ATTACK (64-entry seed; draw order of mud/dirt sprites). attackerCenter = production pic point of the Pidgeotto attacker.
for (const [move, mv, stem, side, fn] of [["MUD_SLAP", 189, "mud-slap-player-pidgeotto-onix", "player", mudSlapMudAtAge], ["MUD_SLAP", 189, "mud-slap-pidgeotto-onix", "opponent", mudSlapMudAtAge],
  ["SAND_ATTACK", 28, "sand-attack-player-pidgeotto-onix", "player", sandAttackDirtAtAge], ["SAND_ATTACK", 28, "sand-attack-pidgeotto-onix", "opponent", sandAttackDirtAtAge]]) {
  const p = CF(stem).animationProfile, c = derive("PIDGEOTTO", side, "ONIX").attacker.picOffsetPoint, sd = sdOf(stem, mv);
  const sixWin = sd.createFrames.find(([, cs]) => cs.length >= 6)[0]; // provider free order just before the 6-slot allocation window: from the seeds receipt's window list (mud: after transient slot 3)
  const alts = variants64(p.spriteOrderSeed);
  const lit = p.spriteOrderSeed.filter((s) => !OCC.includes(s)), occ = p.spriteOrderSeed.filter((s) => OCC.includes(s));
  const swapped = lit.slice(); const a = swapped.indexOf(3), b = swapped.indexOf(4); [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
  alts.acceptedWith34Swapped = [...occ, ...swapped];
  res.push(compare(stem, range(150), (seed, age) => { const d = fn(age, c, side, { ...p, spriteOrderSeed: seed }); return { ids: d.map((x) => x.slot), pos: new Map(d.map((x) => [x.slot, { x: x.x, y: x.y }])) }; },
    p.spriteOrderSeed, alts, { move, acceptedFreeTailHead: lit.slice(0, 4), sixSlotWindowFrame: sixWin, note: "acceptedWith34Swapped = the other of the two real F heads (4,3 vs 3,4)" }));
}
console.log(JSON.stringify(res, null, 1));
