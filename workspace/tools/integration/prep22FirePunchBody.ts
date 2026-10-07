// prep22: Fire Punch body-only measurement. Renders the accepted Scene-ON FIRE_PUNCH reducer/renderer against the ROM frames of the staged route
// (tools/probe/stage-fire-punch-portable-on.py RGB dump, direct mGBA) over the 101-frame body window, for three resolution profiles:
//   accepted (fixture), neutral (no burn, no HP commit, no secondary roll: every post-body age never reached), burn (secondaryRollSucceeded).
// usage: node --experimental-strip-types tools/integration/prep22FirePunchBody.ts <player|opponent> <rgbDir> <bodyStart> <epochAge> [animationAgeOffset]
//   bodyStart = ROM activation frame (player 2340, opponent 1967); the dense window starts epochAge frames earlier (reducer age at activation).
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { firePunchBurnFlames, firePunchResidualBurnFlames, firePunchParticlesInDrawOrder } from "../../src/animation/firePunch.ts";

const [side, rgbDir, bodyStartArg, epochArg, offsetArg] = process.argv.slice(2);
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fx = JSON.parse(readFileSync(join(root, `tools/compare/fixtures/fire-punch-${side === "player" ? "onix-grovyle" : "grovyle-onix"}.json`), "utf8"));
const bodyStart = Number(bodyStartArg), epoch = Number(epochArg), offset = Number(offsetArg ?? 0);
const BODY_LEN = 101;
const battler = (b: any) => ({ species: b.species, geometry: { side: b.side, spriteCorner: b.spriteCorner, animationCenter: b.animationCenter, battlePositionCenter: b.battlePositionCenter } }) as const;
const never = 1_000_000;
const acc = fx.profile ?? { startHp: 143, endHp: 112, initialStatus: "none", hpCommitAge: 200, secondaryRollAge: 205, secondaryRollSucceeded: false };
const profiles: Record<string, any> = {
  accepted: acc,
  neutral: { startHp: acc.startHp, endHp: acc.startHp, initialStatus: "none", hpCommitAge: never, hpDrainFirstAge: never, hitWobbleFirstAge: never, hitBlinkFirstAge: never, secondaryRollAge: never, secondaryRollSucceeded: false, currentMoveResetAge: never },
  burn: { startHp: acc.startHp, endHp: acc.endHp, initialStatus: "none", hpCommitAge: 200, secondaryRollAge: 205, secondaryRollSucceeded: true, healthboxStatusAge: 242, burnFlameFirstAge: 247, burnMessageTextStartAge: 283 },
};
const out: any = { side, bodyStart, epoch, offset, bodyLen: BODY_LEN, profiles: {} };
for (const [name, profile] of Object.entries(profiles)) {
  const presentation = createSceneOnMovePresentation({ move: "FIRE_PUNCH", attacker: battler(fx.geometry.attacker), target: battler(fx.geometry.target), resolutionProfile: profile,
    animationAgeOffset: offset, moveTextStartAge: -1 });
  let state: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: presentation };
  const rows: number[] = []; let bodyDiff = 0, bodyOk = 0, windowDiff = 0; let firstBurnFlameAge: number | null = null;
  for (let age = 0; age < epoch + BODY_LEN + 30; age += 1) {
    const frame = bodyStart - epoch + age;
    const oracle = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
    const rgba = render(state);
    let d = 0;
    for (let p = 0; p < 240 * 160; p += 1) if (oracle[p * 3] !== rgba[p * 4] || oracle[p * 3 + 1] !== rgba[p * 4 + 1] || oracle[p * 3 + 2] !== rgba[p * 4 + 2]) d += 1;
    if (age >= epoch && age < epoch + BODY_LEN) { bodyDiff += d; if (d === 0) bodyOk += 1; rows.push(d); }
    else windowDiff += d;
    state = { ...state, sceneOnPresentation: { ...state.sceneOnPresentation!, age: state.sceneOnPresentation!.age + 1 } };
  }
  out.profiles[name] = { bodyRowsExact: `${bodyOk}/${BODY_LEN}`, bodyDiffPixels: bodyDiff, outsideBodyDiffPixels: windowDiff, firstNonzeroBodyRows: rows.map((d, i) => [i, d]).filter(([, d]) => d).slice(0, 8) };
}
console.log(JSON.stringify(out));
