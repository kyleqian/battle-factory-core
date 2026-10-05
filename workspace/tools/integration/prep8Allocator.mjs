// prep8: allocator-derived fields of the accepted configs vs the ROM plan (affine-task/plan.json, summary.json from allocator plan v2): per move/orientation, the baseline at the move body's activation
// (matrix bitmap, tasks, occupied sprite mask), net-zero flags, replay mismatches, and each accepted literal (matrix ids / sprite slots / task slots) against the ROM op sequence of that body.
//   node --experimental-strip-types tools/integration/prep8Allocator.mjs > tools/integration/fixtures/prep8-allocator.json
import { readFileSync } from "node:fs";
import { acceptedConfig, MOVE_ID, O } from "./prep8Accepted.mjs";
const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
const plan = rd("tools/integration/fixtures/affine-task/plan.json"), summary = rd("tools/integration/fixtures/affine-task/summary.json");
const SCEN = { SWIFT: "swift-%-staryu-%-onix", TRICK: "trick-%-furret-%-chansey", THUNDERBOLT: "thunderbolt-%-delcatty-%-shuckle", FRUSTRATION: "frustration-%-furret-%-onix", HORN_DRILL: "horn-drill-%-seaking-%-onix", SEISMIC_TOSS: "seismic-toss-%-kecleon-%-onix", AURORA_BEAM: "aurora-beam-%-seadra-%-onix", STOCKPILE: "stockpile-%-pelipper-%-delcatty", UPROAR: "uproar-%-vigoroth-%-onix", ZAP_CANNON: "zap-cannon-%-forretress-%-shuckle" };
const name = (move, o) => { const [a, b] = o === "player-back" ? ["player", "opponent"] : ["opponent", "player"]; let i = 0; return SCEN[move].replace(/%/g, () => (i++ === 0 ? a : b)); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const out = [];
for (const move of Object.keys(MOVE_ID)) for (const o of O) {
  const mid = MOVE_ID[move], n = name(move, o), p = plan[String(mid)].scenarios[n], c = acceptedConfig(move, o).config, S = summary[`${n}-0`];
  const body = S.bodies.find((b) => b.mv === mid);
  const ops = p.ops ?? p.calls ?? [];
  const mat = ops.filter((x) => x[1] === "matrix+").map((x) => x[2]), spr = ops.filter((x) => x[1] === "sprite+").map((x) => x[2]);
  const tasks = ops.filter((x) => x[1] === "task+").map((x) => ({ age: x[0], slot: x[2], func: x[3] }));
  const P = c.animationProfile ?? {}, checks = {};
  switch (move) {
    case "SWIFT": checks.starSlots = [P.starSlots, ops.filter((x) => x[1] === "sprite+" && /Swift/.test(x[3])).map((x) => x[2])]; checks.targetShakeTaskSlot = [P.targetShakeTaskSlot, tasks.find((t) => /ShakeMon2/.test(t.func))?.slot]; break;
    case "TRICK": checks.bagSlots = [P.bagSlots, ops.filter((x) => x[1] === "sprite+" && /Bag/i.test(x[3])).map((x) => x[2])]; checks.taskSlots = [[P.attacker.stretchTaskSlot, P.target.stretchTaskSlot, P.attacker.shakeTaskSlot, P.target.shakeTaskSlot], [tasks.find((t) => /StretchAttackerUp/.test(t.func))?.slot, tasks.find((t) => /StretchTargetUp/.test(t.func))?.slot, tasks.filter((t) => /ShakeMon/.test(t.func))[0]?.slot, tasks.filter((t) => /ShakeMon/.test(t.func))[1]?.slot]]; break;
    case "THUNDERBOLT": checks.orbAndFlashMatrices = [[P.orb.matrixNum, ...P.flashes.map((x) => x.matrixNum)], mat]; checks.flashSprites = [P.flashes.map((x) => x.slot), spr.slice(spr.indexOf(P.flashes[0].slot, 8) >= 0 ? 0 : 0).filter((_, i, a) => false)]; delete checks.flashSprites; break;
    case "FRUSTRATION": { const at = (age) => ops.find((x) => x[1] === "matrix+" && x[0] === age)?.[2]; checks.angerMatrix = [P.angerMatrix, mat[0]]; checks.impactMatrices = [P.impactMatrices, [mat[2], mat[3]]]; checks.angerAndImpactSprites = [[P.angerSlot, ...P.impactSlots], [spr[0], spr[2], spr[3]]]; void at; break; }
    case "HORN_DRILL": checks.impactMatrixIds = [P.impactMatrixIds, mat.slice(0, P.impactMatrixIds.length)]; break;
    case "SEISMIC_TOSS": checks.matrices = [[0, ...P.rocks[0].map((r) => r.matrixNum), 0, ...P.rocks[1].map((r) => r.matrixNum), 0, ...P.rocks[2].map((r) => r.matrixNum)], mat]; break;
    case "AURORA_BEAM": checks.ringMatrixIds = [P.ringMatrixIds, mat.slice(0, P.ringMatrixIds.length)]; checks.ringSlots = [P.ringSlots, spr.slice(0, P.ringSlots.length)]; break;
    case "STOCKPILE": checks.orbMatrixPool = [P.orbMatrixPool, mat.slice(0, 5)]; checks.orbSlotPool = [P.orbSlotPool, spr.slice(0, 5)]; break;
    case "UPROAR": checks.ringMatrixSlots = [c.animationInputs.ringMatrixSlots, mat]; checks.noteSlots = [c.animationInputs.noteSlots, spr.filter((s) => s !== 3).slice(0, 2)]; break;
    case "ZAP_CANNON": checks.sparkMatrices = [P.sparks.map((x) => x.matrixNum), mat]; checks.ballAndSparkSlots = [[P.ball.slot, ...P.sparks.map((x) => x.slot)], spr.slice(0, 9)]; break;
  }
  out.push({ move, orientation: o, scenario: n, rise: p.rise, fall: p.fall, bodyRise: body.riseFrame, baseline: body.baseline, netZero: { matrix: body.netZeroMatrix, task: body.netZeroTask, sprite: body.netZeroSprite }, replayMismatches: p.replayMismatches.length,
    matricesUsed: p.matricesUsed, taskSlotsUsed: p.taskSlotsUsed, spriteSlotsUsed: p.spriteSlotsUsed, bodyIsFirstInScenario: S.bodies[0].mv === mid,
    precedingBodies: S.bodies.slice(0, S.bodies.indexOf(body)).map((b) => ({ mv: b.mv, riseFrame: b.riseFrame, fallFrame: b.fallFrame })),
    checks: Object.fromEntries(Object.entries(checks).map(([k, [acc, rom]]) => [k, { accepted: acc, rom, equal: eq(acc, rom) }])) });
}
console.log(JSON.stringify(out, null, 1));
