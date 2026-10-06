/** prep18: run the REAL Dig reducer (digAtAge) for the fresh alternate-species scenarios with production-derived geometry (liveBattlerAnchors / enemy elevation / front idle rest)
 *  and the accepted same-side constants (corpus-derived digInputsFor), then compare with the ROM probe of the alternate scenario (prep13Probe): sprite births
 *  (age, slot, template, x, y), battler x2/y2/matrix/visibility per age, the unleash body's initial scanline witness (chained from the setup reducer end state), Task_UpdateMonBg data.
 *  run: npx vite-node tools/integration/prep18DigAlt.ts   (needs /tmp/p18a/r1 + /tmp/p18c/r1 from prep18Run.sh stages 2 and prep18Probe.py) */
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { digAtAge, DIG_SETUP_FIRST_INACTIVE_AGE, DIG_UNLEASH_FIRST_INACTIVE_AGE, type DigLiveInputs, type DigBody } from "../../src/animation/dig.ts";
import { digInputsFor, type DigOrientation } from "../compare/verifyDigReducer.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import enemyElevations from "../../src/data/gen/enemy-mon-elevations.json" with { type: "json" };

const TEMPLATE: Record<string, string> = { gDirtMoundSpriteTemplate: "dirt-mound", gDirtPlumeSpriteTemplate: "dirt-plume", gBasicHitSplatSpriteTemplate: "impact" };
const CASES: [string, DigOrientation, string][] = [
  ["mechanic-dig-player-vibrava-opponent-chansey", "player-back", "accepted-player"],
  ["mechanic-dig-opponent-vibrava-player-chansey", "opponent-front", "accepted-opponent"],
  ["prep18-dig-alt-flygon-golem", "player-back", "alt-player"],
  ["prep18-dig-altopp-flygon-golem", "opponent-front", "alt-opponent"],
];
const out: Record<string, unknown> = {};
for (const [sc, side, tag] of CASES) {
  const rows = JSON.parse(gunzipSync(readFileSync(`tools/compare/evidence/dig-${side === "player-back" ? "player" : "opponent"}-dense-state.json.gz`)).toString("utf8")).frames;
  const j = JSON.parse(readFileSync(`/tmp/p18a/r1/${sc}.json`, "utf8")); const pc = JSON.parse(readFileSync(`/tmp/p18c/r1/${sc}.json`, "utf8"));
  const bodies = j.bodies.filter((b: any) => b.move === 91);
  const mon = bodies[0].atActivation.mons;
  const art = createBattleCommandFieldArtView({ player: { species: mon[0].species }, opponent: { species: mon[1].species } } as never);
  const attSide = side === "player-back" ? "player" : "opponent", tgtSide = attSide === "player" ? "opponent" : "player";
  const aa = liveBattlerAnchors(attSide, art), ta = liveBattlerAnchors(tgtSide, art);
  const elevation = attSide === "opponent" ? (enemyElevations as Record<string, number>)[art.opponent.speciesSymbol] ?? 0 : 0;
  const res: Record<string, unknown> = { attacker: attSide, elevation, elevationY: aa.battlePositionCenter.y - elevation };
  let chained: DigLiveInputs["initialScanline"] | null = null;
  bodies.forEach((b: any, bi: number) => {
    const body: DigBody = bi === 0 ? "setup" : "unleash";
    const base = digInputsFor(rows, side, body);
    const input: DigLiveInputs = {
      ...base, attackerCenter: aa.spriteCenter, targetCenter: ta.spriteCenter,
      targetAnimationOrigin: { x: ta.spriteCenter.x, y: ta.spriteCenter.y + (attSide === "opponent" ? 8 : 0) },
      attackerElevationY: aa.battlePositionCenter.y - elevation,
      attackerInitialOffset: { x: aa.frontIdleRest.x2, y: aa.frontIdleRest.y2 }, targetInitialOffset: { x: ta.frontIdleRest.x2, y: ta.frontIdleRest.y2 },
      monBg: { ...base.monBg, snapshot: { x: aa.spriteCenter.x, y: 160 } },
      setupBgOffset: { x: 32 - aa.spriteCenter.x, y: 32 - aa.spriteCenter.y },
      initialScanline: body === "unleash" && chained ? chained : base.initialScanline,
    };
    const last = body === "setup" ? DIG_SETUP_FIRST_INACTIVE_AGE : DIG_UNLEASH_FIRST_INACTIVE_AGE;
    const states = Array.from({ length: last + 1 }, (_, age) => digAtAge(age, input));
    if (body === "setup") chained = states[last]!.scanline as DigLiveInputs["initialScanline"];
    // births: ROM (age, slot, template, x, y) vs reducer first appearance
    const rom = j.spawns.filter((s: any) => s.ev === "+" && s.f >= b.start && s.f <= (b.end ?? 1e9)).map((s: any) => ({ age: s.f - b.start, slot: s.slot, t: s.tmpl, x: s.x, y: s.y }));
    const nm: Record<string, string> = j.taskFuncNames; void nm;
    const sym = (addr: number) => addr; void sym;
    const mine: any[] = []; let prev = new Set<string>();
    states.forEach((st, age) => { const cur = new Set(st.sprites.map((sp) => `${sp.slot}:${sp.template}`)); st.sprites.forEach((sp) => { if (!prev.has(`${sp.slot}:${sp.template}`)) mine.push({ age, slot: sp.slot, template: sp.template, x: sp.x, y: sp.y }); }); prev = cur; });
    const birthKey = (a: any) => `${a.age}|${a.slot}|${a.x}|${a.y}`;
    const mineKeys = new Set(mine.map(birthKey)), romOwn = rom.filter((r: any) => ["gDirtMoundSpriteTemplate", "gDirtPlumeSpriteTemplate", "gBasicHitSplatSpriteTemplate"].some(() => true));
    // ROM template ids are addresses; match by (age,slot,x,y) only
    const romKeys = romOwn.map(birthKey), missing = romKeys.filter((k: string) => !mineKeys.has(k)), extra = [...mineKeys].filter((k) => !romKeys.includes(k));
    // battler x2,y2,matrix,invisible per age
    const bs = new Map<number, number[]>(j.battlerSeries.map((r: number[]) => [r[0], r]));
    let battlerMismatch = 0, battlerRows = 0; const sample: string[] = [];
    states.forEach((st, age) => {
      const r = bs.get(b.start + age); if (!r) return;
      const ab = attSide === "player" ? 1 : 9, tb = attSide === "player" ? 9 : 1;
      const mine2 = [st.attacker.x2, st.attacker.y2, st.attacker.matrixNum, st.attacker.visible ? 0 : 1, st.target.x2, st.target.y2];
      const rom2 = [r[ab], r[ab + 1], r[ab + 2], r[ab + 3], r[tb], r[tb + 1]];
      battlerRows++; if (JSON.stringify(mine2) !== JSON.stringify(rom2)) { battlerMismatch++; if (sample.length < 3) sample.push(`age ${age} mine ${mine2} rom ${rom2}`); }
    });
    // unleash initial scanline vs ROM banks at activation
    const romBanks = (pc.bodies.filter((x: any) => x.move === 91)[bi].atActivation.scan.banks) as number[][];
    const inB = input.initialScanline.buffers;
    const scanEq = JSON.stringify(inB[0]) === JSON.stringify(romBanks[0]) && JSON.stringify(inB[1]) === JSON.stringify(romBanks[1]);
    res[body] = { act: b.start, births: { rom: romKeys.length, reducer: mine.length, missingFromReducer: missing.slice(0, 5), extraInReducer: extra.slice(0, 5) }, battlerRows, battlerMismatch, battlerSample: sample,
      initialScanlineEqualsROMAtActivation: scanEq, scanlineSource: body === "unleash" ? "chained from setup reducer end state" : "accepted first-body corpus constant" };
  });
  out[tag] = res; console.log(tag, JSON.stringify(res));
}
writeFileSync("tools/integration/fixtures/prep18/prep18-dig-alt-check.json", JSON.stringify(out, null, 1));
