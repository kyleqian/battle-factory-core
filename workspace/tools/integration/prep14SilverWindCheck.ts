// prep14: Silver Wind. silverWindAtAge with the accepted-corpus constants of the same attacker side (task slots, sparkle slots/matrices/subpriorities, resources, background registers, palettes; equal across the 3
// scenarios by prep14Constants.py) and the production-derivable fields REPLACED: attackerPictureOrigin = attacker spriteCenter, targetPictureOrigin = (target spriteCenter.x, target picOffsetPoint.y), each sparkle's birth
// attr0 y byte shifted by the target picOffset.y delta (the only geometry-dependent OAM word), animationRngSeed, spriteOrder (lend), initialMatrixBitmap. Compares every sparkle birth (age, slot, x, y, matrix),
// the 18-sparkle count and the end age against the ROM probe (accepted player / opponent + alternate).   npx vite-node tools/integration/prep14SilverWindCheck.ts
import { readFileSync, writeFileSync } from "node:fs";
import { silverWindAtAge, type SilverWindLiveInputs } from "../../src/animation/silverWind.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { silverWindInputsFor } from "../compare/verifySilverWindReducer.ts";
const A = JSON.parse(readFileSync("tools/integration/fixtures/prep14/prep14-analysis.json", "utf8")) as Record<string, any[]>;
const consts = { player: silverWindInputsFor("player-back"), opponent: silverWindInputsFor("opponent-front") } as Record<string, SilverWindLiveInputs>;
const out: Record<string, any> = {};
for (const sc of Object.keys(A).filter((k) => /silver-wind/.test(k))) {
  const r = A[sc]!.find((x) => x.move === "SILVER_WIND")!;
  const side = (sc.startsWith("mechanic-silver-wind-opponent") ? "opponent" : "player") as "player" | "opponent"; const tgt = side === "player" ? "opponent" : "player";
  const art = createBattleCommandFieldArtView({ player: { species: r.monsAtAct[0].species }, opponent: { species: r.monsAtAct[1].species } } as never);
  const aa = liveBattlerAnchors(side, art), ta = liveBattlerAnchors(tgt, art);
  const base = consts[side]!; const dy = ta.picOffsetPoint.y - base.targetPictureOrigin.y;
  const input: SilverWindLiveInputs = { ...base, attackerPictureOrigin: aa.spriteCenter, targetPictureOrigin: { x: ta.spriteCenter.x, y: ta.picOffsetPoint.y },
    sparkleSlots: base.sparkleSlots.map((s) => ({ ...s, attr: [(s.attr[0] & ~0xff) | (((s.attr[0] & 0xff) + dy) & 0xff), s.attr[1], s.attr[2]] as const })),
    animationRngSeed: r.rng2, allocator: { ...base.allocator, initialMatrixBitmap: r.bitmap, spriteOrder: r.orderAtAct.filter((s: number) => r.inUseAtAct.includes(s)) } };
  const births: any[] = []; let prev = new Set<string>(); let end = -1;
  for (let age = 0; age < r.rows; age += 1) {
    const s = silverWindAtAge(age, input); if (!s.active && end < 0) end = age;
    const cur = new Set<string>();
    for (const sp of s.sprites as any[]) { const k = `${sp.template}:${sp.slot}`; cur.add(k); if (!prev.has(k)) births.push({ age, template: sp.template, slot: sp.slot, x: sp.x, y: sp.y, matrix: sp.matrixNum }); }
    prev = cur;
  }
  const rom = r.sprites.filter((s: any) => /SilverWind/.test(s.tmpl));
  let eq = 0, exactAge = 0; const bad: any[] = [];
  for (const s of rom) {
    const m = births.find((b) => b.template === s.tmpl && b.slot === s.slot && Math.abs(b.age - s.age) <= 1 && b.matrix === s.matrix);
    const ok = !!m && m.x === s.x && m.y === s.y;
    if (ok) { eq += 1; if (m!.age === s.age) exactAge += 1; } else if (bad.length < 5) bad.push({ rom: [s.age, s.slot, s.tmpl, s.x, s.y, s.matrix], red: m ?? null });
  }
  out[sc] = { dyTargetPicY: dy, romSparkles: rom.length, reducerBirths: births.length, sparklesEqual: eq, exactBirthAge: exactAge, firstInactiveAge: end, romRows: r.rows, bad };
  console.log(sc, JSON.stringify(out[sc]));
}
writeFileSync("tools/integration/fixtures/prep14/prep14-silver-wind-check.json", JSON.stringify(out, null, 1));
