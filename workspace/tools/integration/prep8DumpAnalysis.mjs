// prep8: slot audit + persistent-order validation over the direct-mGBA sprite dumps (fixtures/prep8-sprites/*.json, prep8SpriteDump.sh); method of prep7DumpAnalysis.mjs plus
//   (a) the PRODUCTION provider seed (spriteOrderWithOccupiedPrefix(knownEntrySpriteOrderState, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)) compared with the observed 64-order at row 0 and the model replayed from it vs the ROM at every frame,
//   (b) accepted-config order fields (`order` / `persistentOrder` / `spriteOrder`) vs the ROM index of the slot at its birth frame.
//   node --experimental-strip-types tools/integration/prep8DumpAnalysis.mjs > tools/integration/fixtures/prep8-sprites-analysis.json
import { readFileSync, readdirSync } from "node:fs";
import { createSpriteOrderState, sortSpriteOrder } from "../../src/animation/spriteOrder.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { knownEntrySpriteOrderState, spriteOrderWithOccupiedPrefix, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER } from "../../src/engine/spriteOrderProvider.ts";
const D = "tools/integration/fixtures/prep8-sprites";
const acc = JSON.parse(readFileSync("tools/integration/fixtures/prep8-accepted-configs.json"));
const model = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove.occupants.map((o) => o.slot).sort((a, b) => a - b);
const PROV64 = spriteOrderWithOccupiedPrefix(knownEntrySpriteOrderState("battle-lab-ordinary-singles"), KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
const RES = new Set([0, 1, 2, 6, 8, 60, 61, 62, 63]); const POOL = Array.from({ length: 64 }, (_, i) => i).filter((s) => !RES.has(s)); const filt = (o) => o.filter((s) => !RES.has(s));
const key = (s) => ({ priority: (s.attr[2] >> 10) & 3, subpriority: s.subpriority, oamY: s.attr[0] & 0xff, affineMode: ((s.attr[0] >> 8) & 3) === 3 ? "double" : ((s.attr[0] >> 8) & 3) === 1 ? "normal" : "off", oamSize: (s.attr[1] >> 14) & 3, oamShape: ["square", "horizontal", "vertical"][(s.attr[0] >> 14) & 3] ?? "square" });
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const lowest = (occ, k) => { const out = []; for (let s = 0; s < 64 && out.length < k; s++) if (!occ.has(s)) out.push(s); return out; };
const MOVE = { "aurora-beam": "AURORA_BEAM", frustration: "FRUSTRATION", "horn-drill": "HORN_DRILL", "seismic-toss": "SEISMIC_TOSS", stockpile: "STOCKPILE", swift: "SWIFT", thunderbolt: "THUNDERBOLT", trick: "TRICK", uproar: "UPROAR", "zap-cannon": "ZAP_CANNON" };
const flat = (o, out = []) => { if (Array.isArray(o)) o.forEach((x) => flat(x, out)); else if (o && typeof o === "object") { if (typeof o.slot === "number" && (o.order !== undefined || o.persistentOrder !== undefined)) out.push([o.slot, o.order ?? o.persistentOrder]); else Object.values(o).forEach((x) => flat(x, out)); } return out; };
const res = [];
for (const file of readdirSync(D).filter((f) => f.endsWith(".json")).sort()) {
  const name = file.replace(/\.json$/, ""); const mv = MOVE[Object.keys(MOVE).find((k) => name.startsWith(k))]; const orient = name.includes("-player-") && name.split("-player-")[0].length < name.split("-opponent-")[0].length ? "player-back" : name.match(/^[a-z-]+?-opponent-/) && !name.match(/^[a-z-]+?-player-.*-opponent-/) ? "opponent-front" : "player-back";
  const d = JSON.parse(readFileSync(`${D}/${file}`)); const fr = Object.keys(d.dumps).map(Number).sort((a, b) => a - b).map((k) => d.dumps[k]);
  const occ = fr.map((r) => new Set(r.sprites.map((s) => s.slot))); const row0 = [...occ[0]].sort((a, b) => a - b);
  let strict = 0; const bad = [], spawnSlots = [], births = [];
  for (let f = 1; f < fr.length; f++) {
    const now = [...occ[f]].filter((s) => !occ[f - 1].has(s)).sort((a, b) => a - b); if (!now.length) continue;
    const freed = [...occ[f - 1]].filter((s) => !occ[f].has(s)); const A = lowest(occ[f - 1], now.length), B = lowest(new Set([...occ[f - 1]].filter((s) => !freed.includes(s))), now.length);
    if (eq(now, A) || eq(now, B)) strict++; else bad.push({ frameIndex: f, spawned: now, lowestFreeA: A, lowestFreeB: B });
    for (const s of now) { spawnSlots.push(s); births.push([s, fr[f - 1].spriteOrder.indexOf(s), fr[f].spriteOrder.indexOf(s)]); }
  }
  const own = fr[0].spriteOrder, row0OrderEqualsProvider = eq(own, PROV64);
  const replay = (seed) => { let st = createSpriteOrderState(POOL, filt(seed)); return fr.map((r) => { st = { ...st, occupants: r.sprites.filter((s) => !RES.has(s.slot)).map((s) => ({ owner: s.slot, slot: s.slot, ...key(s) })) }; st = sortSpriteOrder(st); return { order: st.order.slice(), occ: new Set(st.occupants.map((o) => o.slot)) }; }); };
  const simOwn = replay(own), simProv = replay(PROV64);
  const only = (o, c) => o.filter((s) => c.has(s)).join();
  let romEqOwn = 0, romEqProv = 0, maxOcc = 0, ownVsProv = 0;
  fr.forEach((r, f) => { const c = simOwn[f].occ; maxOcc = Math.max(maxOcc, c.size); const rom = only(filt(r.spriteOrder), c); if (only(simOwn[f].order, c) === rom) romEqOwn++; if (only(simProv[f].order, simProv[f].occ) === only(filt(r.spriteOrder), simProv[f].occ)) romEqProv++; if (only(simOwn[f].order, c) !== only(simProv[f].order, c)) ownVsProv++; });
  let lcg = 4242; const rnd = () => (lcg = (lcg * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const arb = Array.from({ length: 40 }, () => { const a = POOL.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } const sim = replay([...RES, ...a]); let n = 0; fr.forEach((_, f) => { const c = simOwn[f].occ; if (only(sim[f].order, c) !== only(simOwn[f].order, c)) n++; }); return n; });
  const cfgKey = `${mv}/${orient}`; const c = acc[cfgKey]?.config; const fields = c ? flat(c.animationProfile ?? c.animationInputs) : [];
  const romBirth = births.map(([s, pre, post]) => `${s}:${pre}`), romBirthPost = births.map(([s, pre, post]) => `${s}:${post}`);
  const inPre = fields.filter(([s, o]) => romBirth.includes(`${s}:${o}`)).length, inPost = fields.filter(([s, o]) => romBirthPost.includes(`${s}:${o}`)).length;
  res.push({ file, move: mv, orientation: orient, window: d.window, rows: fr.length, row0Slots: row0, row0EqualsKnownEntryFirstMove: eq(row0, model), row0SpriteOrderEqualsProvider64: row0OrderEqualsProvider,
    row0OrderDiffersAtIndexes: row0OrderEqualsProvider ? [] : own.map((s, i) => (s !== PROV64[i] ? i : -1)).filter((i) => i >= 0), maxOccupiedPoolSlots: maxOcc, spawnFrames: strict + bad.length, spawnFramesFirstFree: strict, spawnFramesNotFirstFree: bad.length, badSample: bad.slice(0, 3),
    spawnSlotsInOrder: spawnSlots.slice(0, 48), modelOwnSeedEqualsRomFrames: romEqOwn, modelProviderSeedEqualsRomFrames: romEqProv, ownVsProviderSeedDiffFrames: ownVsProv, arbitrarySeeds: 40, arbitrarySeedsWithDiff: arb.filter((n) => n > 0).length, arbitraryDiffFramesMax: Math.max(...arb),
    acceptedOrderFields: fields.length, acceptedOrderFieldsEqualRomBirthIndexPre: inPre, acceptedOrderFieldsEqualRomBirthIndexPost: inPost, acceptedConfigKey: cfgKey, firstBodyDerived: name.endsWith("firstbody") });
}
console.log(JSON.stringify(res, null, 1));
