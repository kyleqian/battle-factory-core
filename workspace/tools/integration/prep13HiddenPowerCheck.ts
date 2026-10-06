// prep13: Hidden Power. Build the production-derivable HiddenPowerProfile (lowest-free slots over the activation in-use set, first-free matrix ids over bitmap 0x6, side subpriorities 30/40,
// order seed = sSpriteOrder at age 63 filtered to the 14 slots, personality from the party, center from liveBattlerAnchors) and compare with the ROM probe births, the reducer orb positions
// and the painter order vs the ROM order series.   npx vite-node tools/integration/prep13HiddenPowerCheck.ts
import { readFileSync, writeFileSync } from "node:fs";
import { hiddenPowerAtAge, type HiddenPowerProfile } from "../../src/animation/hiddenPower.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
const A = JSON.parse(readFileSync("tools/integration/fixtures/prep13/prep13-analysis.json", "utf8")) as Record<string, any[]>;
const out: Record<string, unknown> = {};
const lowestFree = (inUse: number[], n: number, from = 0) => { const r: number[] = []; for (let s = from; s < 64 && r.length < n; s += 1) if (!inUse.includes(s)) r.push(s); return r; };
for (const sc of Object.keys(A).filter((k) => /hidden-power/.test(k))) {
  const r = A[sc]!.find((x) => x.move === "HIDDEN_POWER")!;
  const side = (/alt-opponent|power-opponent/.test(sc) ? "opponent" : "player") as "player" | "opponent";
  const art = createBattleCommandFieldArtView({ player: { species: r.monsAtAct[0].species }, opponent: { species: r.monsAtAct[1].species } } as never);
  const aa = liveBattlerAnchors(side, art);
  const romOrbit = r.sprites.filter((s: any) => s.tmpl === "gHiddenPowerOrbSpriteTemplate"); const romScatter = r.sprites.filter((s: any) => s.tmpl === "gHiddenPowerOrbScatterSpriteTemplate");
  const slots = lowestFree(r.inUseAtAct, 14);
  const orderAt63 = (() => { let o = r.orderAtAct; for (const [age, ord] of r.orderChanges) if (age <= 63) o = ord; return o; })();
  const seed = orderAt63.filter((s: number) => slots.includes(s));
  const matrices = [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // first-free over bitmap 0x6 (bits 0, 3, 4, ...)
  const mon = r.monsAtAct[side === "player" ? 0 : 1];
  const profile: HiddenPowerProfile = {
    attackerSubpriority: side === "player" ? 30 : 40, targetSubpriority: side === "player" ? 40 : 30, allocationSlots: slots, spriteOrderSeed: seed,
    orbitMatrixNums: matrices.slice(0, 6), scatterMatrixNums: matrices.slice(6), uninitializedScatterY: romScatter[7].y, attackerPersonality: mon.personality, animationRngSeed: r.rng2,
  };
  const center = { x: romOrbit[0].x, y: romOrbit[0].y };
  const seedAct = r.orderAtAct.filter((q: number) => slots.includes(q));
  const romOrderAt = (age: number): number[] => { let o: number[] = r.orderAtAct; for (const [a, ord] of r.orderChanges) if (a <= age) o = ord; return o; };
  const painterScore = (sd: number[]) => { const p2 = { ...profile, spriteOrderSeed: sd }; let eq = 0, n = 0; const bad: number[] = [];
    for (let age = 64; age <= 178; age += 1) { const st = hiddenPowerAtAge(age, center, p2); const slotsLive = st.orbs.map((o) => o.slot); if (!slotsLive.length) continue; n += 1;
      const mine = st.painterOrder.map((ow) => slots[ow]!); const rom2 = romOrderAt(age).filter((q: number) => slotsLive.includes(q));
      if (JSON.stringify(mine) === JSON.stringify(rom2) || JSON.stringify(mine) === JSON.stringify([...rom2].reverse())) eq += 1; else if (bad.length < 5) bad.push(age); }
    return { eq, n, bad }; };
  const pAct = painterScore(seedAct), p63 = painterScore(seed);
  const rom = { slots: [...romOrbit, ...romScatter].map((s: any) => s.slot), matrices: [...romOrbit, ...romScatter].map((s: any) => s.matrix), seed63: seed };
  // center candidates
  const centers = { rom: center, picOffsetPoint: aa.picOffsetPoint, spriteCenter: aa.spriteCenter };
  // reducer vs ROM: orbit/scatter x,y at birth ages
  let posOk = 0, posN = 0;
  const st64 = hiddenPowerAtAge(64, center, profile), st118 = hiddenPowerAtAge(118, center, profile);
  for (const s of romOrbit) { posN += 1; const o = st64.orbs.find((q) => q.kind === "orbit" && q.slot === s.slot); if (o && o.x === s.x && o.y === s.y) posOk += 1; }
  for (const s of romScatter) { posN += 1; const o = st118.orbs.find((q) => q.kind === "scatter" && q.slot === s.slot); if (o && o.x === s.x && o.y === s.y) posOk += 1; }
  const slotsEq = JSON.stringify(rom.slots) === JSON.stringify(slots);
  const matEq = JSON.stringify(rom.matrices) === JSON.stringify(matrices);
  out[sc] = { side, species: r.monsAtAct.map((m: any) => m.species), personality: mon.personality, ivWord: mon.ivWord, romSlots: rom.slots, derivedSlots: slots, slotsEqual: slotsEq, romMatrices: rom.matrices, derivedMatrices: matrices, matricesEqual: matEq,
    uninitializedScatterYRom: romScatter.map((s: any) => s.y), centerCandidates: centers, romBirthPositionsMatched: `${posOk}/${posN}`, orderSeed63: seed, orderSeedActivationFiltered: seedAct, seedActEqualsSeed63: JSON.stringify(seedAct) === JSON.stringify(seed), painterOrderEqualAges: { seed63: p63, activationSeed: pAct }, orderSeed63Equal14: seed.length === 14 };
  console.log(sc.padEnd(52), "slots==", slotsEq, "matrices==", matEq, "pos", `${posOk}/${posN}`, "center rom", JSON.stringify(center), "pic", JSON.stringify(aa.picOffsetPoint), "sprite", JSON.stringify(aa.spriteCenter), "uninitY", romScatter.map((s: any) => s.y).join("/"), "seedAct==63", JSON.stringify(seedAct) === JSON.stringify(seed), "painter seed63", `${p63.eq}/${p63.n}`, "actSeed", `${pAct.eq}/${pAct.n}`, p63.bad.join(","));
}
writeFileSync("tools/integration/fixtures/prep13/prep13-hidden-power-check.json", JSON.stringify(out, null, 1));
