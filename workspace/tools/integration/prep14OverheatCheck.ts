// prep14: Overheat. overheatAtAge with the accepted-corpus constants of the same attacker side (task/sprite/matrix slots, resources, oam templates, palettes, background registers; equal across the 3 scenarios by
// prep14Constants.py) and the production-derivable fields REPLACED: picture origins = liveBattlerAnchors().picOffsetPoint, battler sprite x/y = spriteCenter (+ front idle x2/y2 for the opponent target),
// animationRngSeed = gRng2 at activation, spriteOrder = sSpriteOrder at activation (lend), initialOccupiedSprites / initialMatrixBitmap = activation state. Compares every owned sprite birth (age, slot, x, y, matrix)
// and the end age against the ROM probe (accepted player / opponent + alternate).   npx vite-node tools/integration/prep14OverheatCheck.ts
import { readFileSync, writeFileSync } from "node:fs";
import { overheatAtAge, OVERHEAT_FIRST_INACTIVE_AGE, type OverheatLiveInputs } from "../../src/animation/overheat.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { overheatInputsFor } from "../compare/verifyOverheatReducer.ts";
const A = JSON.parse(readFileSync("tools/integration/fixtures/prep14/prep14-analysis.json", "utf8")) as Record<string, any[]>;
const consts = { player: overheatInputsFor("player-back"), opponent: overheatInputsFor("opponent-front") } as Record<string, OverheatLiveInputs>;
const out: Record<string, any> = {};
const tmplKind: Record<string, string> = { gOverheatFlameSpriteTemplate: "gOverheatFlameSpriteTemplate", gBasicHitSplatSpriteTemplate: "gBasicHitSplatSpriteTemplate", gSimplePaletteBlendSpriteTemplate: "gSimplePaletteBlendSpriteTemplate" };
for (const sc of Object.keys(A).filter((k) => /overheat/.test(k) && !/factory|solrock-shuckle-off/.test(k))) {
  const r = A[sc]!.find((x) => x.move === "OVERHEAT")!;
  const side = (sc.startsWith("mechanic-overheat-opponent") ? "opponent" : "player") as "player" | "opponent"; const tgt = side === "player" ? "opponent" : "player";
  const art = createBattleCommandFieldArtView({ player: { species: r.monsAtAct[0].species }, opponent: { species: r.monsAtAct[1].species } } as never);
  const aa = liveBattlerAnchors(side, art), ta = liveBattlerAnchors(tgt, art);
  const base0 = consts[side]!; const strip = (b: OverheatLiveInputs["attackerSprite"]): OverheatLiveInputs["attackerSprite"] => ({ ...b, attr: [0, 0, b.attr[2]], flags: 0, matrix: [256, 0, 0, 256], matrixNum: 0 }); // STRIP=1: only slot/subpriority/palette bank survive
  const base = process.env.STRIP ? { ...base0, attackerSprite: strip(base0.attackerSprite), targetSprite: strip(base0.targetSprite) } : base0;
  const input: OverheatLiveInputs = { ...base, attackerPictureOrigin: aa.picOffsetPoint, targetPictureOrigin: ta.picOffsetPoint,
    attackerSprite: { ...base.attackerSprite, x: aa.spriteCenter.x, y: aa.spriteCenter.y, x2: aa.frontIdleRest.x2, y2: aa.frontIdleRest.y2 },
    targetSprite: { ...base.targetSprite, x: ta.spriteCenter.x, y: ta.spriteCenter.y, x2: ta.frontIdleRest.x2, y2: ta.frontIdleRest.y2 },
    animationRngSeed: r.rng2, allocator: { ...base.allocator, spriteOrder: r.orderAtAct, initialMatrixBitmap: r.bitmap, initialOccupiedSprites: r.inUseAtAct } };
  const births: any[] = []; let prev = new Set<string>(); let end = -1;
  for (let age = 0; age < r.rows; age += 1) {
    const s = overheatAtAge(age, input); if (!s.active && end < 0) end = age;
    const cur = new Set<string>();
    for (const sp of s.sprites as any[]) { const k = `${sp.template}:${sp.slot}`; cur.add(k); if (!prev.has(k)) births.push({ age, template: sp.template, slot: sp.slot, x: sp.x, y: sp.y, matrix: sp.matrixNum }); }
    prev = cur;
  }
  const rom = r.sprites.filter((s: any) => tmplKind[s.tmpl]);
  let eq = 0, exactAge = 0; const bad: any[] = [];
  for (const s of rom) {
    const m = births.find((b) => b.template === s.tmpl && b.slot === s.slot && Math.abs(b.age - s.age) <= 1);
    const ok = !!m && m.x === s.x && m.y === s.y;
    if (ok) { eq += 1; if (m!.age === s.age) exactAge += 1; } else if (bad.length < 5) bad.push({ rom: [s.age, s.slot, s.tmpl, s.x, s.y, s.matrix], red: m ?? null });
  }
  out[sc] = { romOwnedSprites: rom.length, reducerBirths: births.length, spritesEqualXY: eq, spritesWithExactBirthAge: exactAge, firstInactiveAge: end, expectedFirstInactiveAge: OVERHEAT_FIRST_INACTIVE_AGE, romRows: r.rows, bad };
  console.log(sc, JSON.stringify(out[sc]));
}
writeFileSync("tools/integration/fixtures/prep14/prep14-overheat-check.json", JSON.stringify(out, null, 1));
