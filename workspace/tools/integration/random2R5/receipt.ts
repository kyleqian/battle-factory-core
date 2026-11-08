// Random2 R5 receipt rows: dense fresh-run residuals (Mud-Slap / Sand-Attack faithful-random, Dig exact), branch coverage of the pinned
// words, order/slot gates and the ordinary routes. Writes tools/integration/fixtures/random2-r5-live-receipt.json; deletes the per-run
// scratch RGB dumps after reading them.
//   node --experimental-strip-types --no-warnings tools/integration/random2R5/receipt.ts <testedCodeCommit> <testedSrcTree>
import { createHash } from "node:crypto";
import "../../../src/engine/monPicPixelsInstall.ts";
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { verifyLiveAdapterFramebuffer, liveView, type Fixture } from "../liveAdapterFramebuffer.ts";
import { random2Route } from "../random2R1/routeHarness.ts";
import { generatedCommandAnimationReplay } from "../generatedCommandAnimationReplay.ts";
import { createBattleResolutionPresentationRenderView } from "../../../src/engine/battleResolutionPresentationRender.ts";
import { dirtScatterOffsetFromWord, liveMoveRandom2Plan } from "../../../src/engine/liveMovePresentationRng.ts";
import { liveMoveAnimationPresentation } from "../../../src/engine/liveMoveAnimation.ts";
import { presentationRngBodyWords } from "../../../src/engine/presentationRngHost.ts";
import type { BattleMoveAnimationRequest } from "../../../src/engine/battleMoveAnimation.ts";

const [commit, tree] = process.argv.slice(2);
const SEED_A = 0x1234abcd, SEED_B = 0xfeed0042;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const strip = (v: any) => ({ ...v, nextEventSequence: 0,
  rules: { ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } } });

const dense: unknown[] = [];
for (const dir of ["prep17-live", "prep18-live"]) {
  for (const file of readdirSync(`tools/integration/fixtures/${dir}`).sort().filter((name) => name !== "dig-corpus-inputs.json")) {
    const path = `tools/integration/fixtures/${dir}/${file}`;
    const fixture = JSON.parse(readFileSync(path, "utf8")) as Fixture;
    const runs = verifyLiveAdapterFramebuffer(path, 2);
    dense.push({ fixture: path, move: fixture.move, attacker: `${fixture.attacker.species} (${fixture.attacker.geometry.side})`, target: fixture.target.species,
      window: fixture.denseWindow, rows: runs[0]!.rows, expectedDuration: runs[0]!.expectedDuration,
      freshRuns: runs.map((r) => ({ exactRows: r.exactRows, residualPixels: r.residualPixels, digest: r.digest })),
      identicalAcrossFreshRuns: runs.every((r) => r.digest === runs[0]!.digest),
      pinnedActivation: fixture.presentationRngActivation?.value ?? null });
    for (const r of runs) rmSync(r.scratch, { recursive: true, force: true });
  }
}

const VALUES = [0x78a77adb, 0x1c02e96c, 0xc5e4ab6f, 0x481c6973, 0x808db3eb, 0x1, 0xfeedface, 0x00c0ffee, 0x7fffffff, 0xdeadbeef];
const branch = [189, 28].map((id) => {
  const base = JSON.parse(readFileSync(`tools/integration/fixtures/prep17-live/${id === 189 ? "mud-slap" : "sand-attack"}-player-pidgeotto-opponent-onix.json`, "utf8")) as Fixture;
  const perValue = VALUES.map((value) => {
    const f = { ...base, presentationRngActivation: { value, source: "receipt" } } as Fixture;
    const v = liveView(f, 0);
    const effect = v.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never; presentationRng: never };
    const words = presentationRngBodyWords((effect.presentationRng as any).host, (effect.presentationRng as any).key)!.words;
    const state = liveMoveAnimationPresentation(effect.request, v.field, 0, undefined, undefined, effect.spriteOrderInput, effect.presentationRng)!;
    const profile = (state.config as any).animationProfile[id === 189 ? "mud" : "dirt"] as { xStep: number; yStep: number }[];
    const offsets = words.map(dirtScatterOffsetFromWord);
    return { value: `0x${value.toString(16)}`, clampBranchWords: words.filter((w) => (w & 0x1f) > 16).length, nonClampWords: words.filter((w) => (w & 0x1f) <= 16).length,
      minOffset: Math.min(...offsets), maxOffset: Math.max(...offsets), yStepMovingUp: profile.filter((s) => s.yStep & 1).length,
      yStepMovingDown: profile.filter((s) => !(s.yStep & 1)).length, stepDigest: digest(profile).slice(0, 16) };
  });
  return { id, plan: liveMoveRandom2Plan({ moveId: id }), values: perValue, distinctStepSets: new Set(perValue.map((p) => p.stepDigest)).size };
});

const routes: unknown[] = [];
for (const r of [{ move: "MOVE_MUD_SLAP", id: 189, seed: 9, streak: 14, slot: 2 as const }, { move: "MOVE_SAND_ATTACK", id: 28, seed: 3, streak: 0, slot: 3 as const }]) {
  const a = random2Route(r.seed, "on", [r.slot], r.streak, SEED_A), a2 = random2Route(r.seed, "on", [r.slot], r.streak, SEED_A);
  const b = random2Route(r.seed, "on", [r.slot], r.streak, SEED_B), off = random2Route(r.seed, "off", [r.slot], r.streak, SEED_A);
  const bodies = a.bodies.filter((x) => x.moveId === r.id), bBodies = b.bodies.filter((x) => x.moveId === r.id);
  routes.push({
    route: `random2-r5/${r.move.replace("MOVE_", "").toLowerCase().replace("_", "-")}/seed${r.seed}-streak${r.streak}-slot${r.slot}-1turn`, ...r,
    presentationSeeds: { a: SEED_A.toString(16), b: SEED_B.toString(16) }, stalled: a.run.stalled, boundaries: a.run.boundaries.length,
    followingPrompt: a.run.state.battleCommandPresentation?.lifecycle.phase,
    bodies: bodies.map((x, i) => ({ key: x.key, attacker: x.attacker, ages: x.ages.length, firstAge: x.ages[0], lastAge: x.ages.at(-1),
      adapterActiveEveryAge: x.active.every(Boolean), provenance: x.provenance, activationHostFrame: x.activationHostFrame,
      wordsDifferAcrossSeeds: JSON.stringify(x.words) !== JSON.stringify(bBodies[i]?.words ?? null), framesDigestSeedA: digest(x.frameDigests) })),
    sameSeedFramesIdentical: JSON.stringify(a.bodies) === JSON.stringify(a2.bodies),
    seedParity: { boundariesEqual: JSON.stringify(a.run.boundaries) === JSON.stringify(b.run.boundaries),
      facilityEqual: JSON.stringify(a.run.state.facilityState) === JSON.stringify(b.run.state.facilityState),
      rngValueEqual: a.run.state.round.rules.rngValue === b.run.state.round.rules.rngValue },
    sceneOnOffParity: { offBodies: off.bodies.length,
      boundariesEqualExceptSceneBitAndEventCounter: JSON.stringify(a.run.boundaries.map(strip)) === JSON.stringify(off.run.boundaries.map(strip)),
      facilityEqual: JSON.stringify(a.run.state.facilityState) === JSON.stringify(off.run.state.facilityState),
      rngValueEqual: a.run.state.round.rules.rngValue === off.run.state.round.rules.rngValue },
  });
}
{
  const hidden: { kind: string; hidden: boolean }[] = [];
  const on = generatedCommandAnimationReplay(13, "on", [2, 2], 7, false, false, (state) => {
    const res = state.battleResolutionPresentation;
    if (!res || res.lifecycle.phase !== "presenting") return;
    const view = createBattleResolutionPresentationRenderView(res);
    const e = view.effect;
    hidden.push({ kind: e?.type === "move" ? `move:${e.request.moveId}:t${e.request.turn}:a${e.request.attacker}` : "other", hidden: !view.visibility.player.sprite });
  });
  const off = generatedCommandAnimationReplay(13, "off", [2, 2], 7);
  const digs = on.animations.filter((x) => x.moveId === 91 && x.attacker === 0).slice(0, 2);
  const firstUnleash = hidden.findIndex((h) => h.kind === "move:91:t1:a0");
  const lastSetup = hidden.slice(0, firstUnleash).map((h) => h.kind).lastIndexOf("move:91:t0:a0");
  const gap = hidden.slice(lastSetup + 1, firstUnleash);
  routes.push({ route: "prep18/dig/seed13-streak7-slot2-2turns", move: "MOVE_DIG", id: 91, seed: 13, streak: 7, slot: 2, species: "AZUMARILL", stalled: on.stalled,
    followingPrompt: on.state.battleCommandPresentation?.lifecycle.phase,
    bodies: digs.map((x) => ({ ages: x.ages.length, adapterActiveEveryAge: x.adapterActive.every(Boolean) })),
    attackerHiddenBetweenTurns: { gapFrames: gap.length, allHidden: gap.every((g) => g.hidden) },
    sceneOnOffParity: { boundariesEqualExceptSceneBit: JSON.stringify(on.boundaries.map((v: any) => strip(v))) === JSON.stringify(off.boundaries.map((v: any) => strip(v))),
      facilityEqual: JSON.stringify(on.state.facilityState) === JSON.stringify(off.state.facilityState),
      rngValueEqual: on.state.round.rules.rngValue === off.state.round.rules.rngValue } });
}

writeFileSync("tools/integration/fixtures/random2-r5-live-receipt.json", JSON.stringify({
  schema: "random2-r5-live-receipt/v1", lane: "integration S10A (Mud-Slap + Sand-Attack faithful-random, Dig exact)", testedCode: { commit, srcTree: tree },
  policy: "presentation-rng.v1.frame-step.no-lag.battle-stride-2^20",
  promoted: { faithfulRandom: [189, 28], exact: [91] },
  windows: "Mud player 77..127 / opponent 81..131 / alt 72..122; Sand 78..135 / 82..139 / 73..130; Dig setup 195 rows, unleash 68 rows from the activation (prep17 s0.2, prep18 s1.1)",
  denseFixtures: dense, branchCoverage: branch, surrogateAndExactRoutes: routes,
  note: "The pinned activation value is the Random2 state at the ROM activation frame (gRng2 one LCG step before the first post-activation series entry); a pinned fixture proves the controlled body, not arbitrary-play oracle RNG synchronization. Per-run RGB scratch dumps were deleted after reading.",
}, null, 1) + "\n");
console.log("ok", dense.length, "dense fixtures");
