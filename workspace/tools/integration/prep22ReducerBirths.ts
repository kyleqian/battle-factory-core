// prep22: accepted reducer (Spikes / Octazooka / Lovely Kiss) fed ONLY production-derivable inputs vs the ROM sprite births of each scenario (accepted P/O + fresh alternates).
// Inputs: liveBattlerAnchors (picOffsetPoint = animationCenter, battlePositionCenter) from the displayed species; slots = lowest-free over the known-entry in-use set;
// sprite subpriority = target battler subpriority - 2 (player 30 / opponent 40); attr2 = (paletteBank << 12) | tile from the measured first-sheet allocation constants.
// Compared per ROM birth: age (reducer first row listing the slot), slot, x, y, subpriority, attr2.  usage: node --experimental-strip-types tools/integration/prep22ReducerBirths.ts STATE_DIR OUT.json
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { spikesAtAge } from "../../src/animation/spikes.ts";
import { octazookaAtAge } from "../../src/animation/octazooka.ts";
import { lovelyKissAtAge } from "../../src/animation/lovelyKiss.ts";
const [dir, outPath] = process.argv.slice(2);
const FREE = Array.from({ length: 64 }, (_, i) => i).filter((s) => ![0, 1, 2, 6, 8, 60, 61, 62, 63].includes(s));
const MOVES: Record<string, number> = { spikes: 191, octazooka: 190, "lovely-kiss": 142 };
const out: any = {}; let bad = 0, total = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith("-r1.json")).sort()) {
  const name = f.slice(0, -8);
  const mv = Object.keys(MOVES).find((k) => name.startsWith(`mechanic-${k}-`) || name.startsWith(`prep22-${k}-alt-`));
  if (!mv) continue;
  const probe = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const body = probe.bodies.find((b: any) => b.move === MOVES[mv]);
  const A = body.start, E = body.end;
  const mons = body.atActivation.mons;
  const art = createBattleCommandFieldArtView({ player: { species: mons[0].species }, opponent: { species: mons[1].species } } as never);
  const attackerSide = probe.battlerPal && body.atActivation.attacker === 0 ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const aa = liveBattlerAnchors(attackerSide, art), ta = liveBattlerAnchors(targetSide, art);
  const targetSub = targetSide === "player" ? 30 : 40;
  const births = probe.spawns.filter((x: any) => A <= x.f && x.f <= E && x.ev === "+");
  const slots = (n: number) => FREE.slice(0, n);
  const zero = new Array(512).fill(0);
  const pal = { unfadedAtAge0: zero, fadedAtAge0: zero, hardwareAtAge0: zero };
  let state: (age: number) => any;
  if (mv === "spikes") {
    const profile: any = { animationRngAtAge0: body.atActivation.rng2, spriteSlots: slots(3), targetSubpriority: targetSub - 2, oam: { spikeAttr2: (7 << 12) | (2 << 10) | 305 },
      palette: { ...pal, unfadedAfterLoad: zero, fadedAfterLoad: zero, unfadedAfterMonbg: zero, fadedAfterMonbg: zero } };
    state = (age) => spikesAtAge(age, attackerSide, aa.picOffsetPoint, targetSide, ta.battlePositionCenter, profile, ta.picOffsetPoint);
  } else if (mv === "octazooka") {
    const profile: any = { animationRngAtAge0: body.atActivation.rng2, ballSpriteSlot: slots(1)[0], smokeSpriteSlots: slots(4), targetSubpriority: targetSub - 2,
      oam: { ballAttr2: (8 << 12) | (2 << 10) | 305, smokeAttr2: (7 << 12) | (2 << 10) | 537 }, palette: { ...pal, unfadedAfterGraySmokeLoad: zero, fadedAfterGraySmokeLoad: zero, unfadedAfterBlackBallLoad: zero, fadedAfterBlackBallLoad: zero } };
    state = (age) => octazookaAtAge(age, attackerSide, aa.picOffsetPoint, targetSide, ta.picOffsetPoint, profile);
  } else {
    const profile: any = { animationRngAtAge0: body.atActivation.rng2, heartSpriteSlots: slots(4), devilSpriteSlot: FREE[0], targetSubpriority: targetSub,
      palette: { ...pal, unfadedAfterPinkHeartLoad: zero, fadedAfterPinkHeartLoad: zero, unfadedAfterDevilLoad: zero, fadedAfterDevilLoad: zero } };
    state = (age) => lovelyKissAtAge(age, targetSide, ta.picOffsetPoint, profile);
  }
  const rows: any[] = [];
  // reducer births: first age each (slot, birth ordinal) appears
  const seen = new Map<string, number>();
  const E_AGE = E - A;
  const reducerFirst: any[] = [];
  const prevSlots = new Set<number>();
  for (let age = 0; age <= E_AGE + 1; age += 1) {
    const sp = state(age).sprites as any[];
    const cur = new Set<number>(sp.map((s) => s.slot));
    for (const s of sp) if (!prevSlots.has(s.slot)) reducerFirst.push({ age, slot: s.slot, x: s.x, y: s.y, subpriority: s.subpriority, attr2: s.attr[2] });
    prevSlots.clear(); for (const s of cur) prevSlots.add(s);
  }
  let ok = 0; const diffs: any[] = [];
  births.forEach((b: any, i: number) => {
    const age = b.f - A;
    const r = (state(age).sprites as any[]).find((x) => x.slot === b.slot);
    const rom = { slot: b.slot, x: b.x, y: b.y, subpriority: b.sub, attr2: b.attr[2] };
    const got = r ? { slot: r.slot, x: r.x, y: r.y, subpriority: r.subpriority, attr2: r.attr[2] } : null;
    const same = got ? Object.keys(rom).filter((k) => (got as any)[k] !== (rom as any)[k]) : ["absent"];
    if (same.length === 0) ok += 1; else diffs.push({ i, age, rom, reducer: got, differs: same });
  });
  total += births.length; bad += births.length - ok;
  out[name] = { move: mv, attackerSide, romBirths: births.length, reducerBirths: reducerFirst.length, exactBirths: ok, diffs: diffs.slice(0, 4) };
  console.log(name.slice(-44).padEnd(44), `births ${births.length} reducer ${reducerFirst.length} exact ${ok}`, diffs.length ? JSON.stringify(diffs[0]) : "");
}
console.log(`mismatching births ${bad} / ${total}`);
writeFileSync(outPath, JSON.stringify(out, null, 1));
