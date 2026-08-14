/**
 * Live verification for `docs/noland-brain-intro-ground-truth.md`.
 *
 * Reruns `tools/battle-lab/factory-brain-silver-intro-dense-off.json` (the
 * dense-capture Brain battle-start-window fixture) against a live Battle
 * Scene OFF service and checks the sha256 of every frame the ground-truth
 * doc cites, both pre-checkpoint (the `preCheckpointCaptureFrames` space —
 * where §0 of the doc establishes the whole visual window actually lives)
 * and post-checkpoint (frame 0, to prove it lands in the same ready-state
 * cycle §2's table describes). A second block reruns the existing
 * `factory-trainer-pic-shizuka-off.json` ordinary-trainer fixture with an
 * ad hoc `preCheckpointCaptureFrames` addition (no file edited — the field
 * is added to the parsed object before POSTing, same pattern
 * `verify-factory-brain-lab.ts` uses for its round-trip request) to check
 * the doc's §4 ordinary-vs-Brain delta table.
 *
 * Run (needs a live Battle Scene OFF service, default :8014):
 *   node --experimental-strip-types tools/probe/verify-noland-brain-intro-window.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(HERE, "..", "battle-lab");
const BASE_URL = (process.env.POKEBENCH_ORACLE_URL ?? "http://127.0.0.1:8014").replace(/\/$/, "");

let checks = 0;
let failures = 0;
function check(label: string, condition: boolean, detail: string): void {
  checks += 1;
  if (condition) {
    console.log(`PASS ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL ${label} -- ${detail}`);
  }
}

async function post(value: unknown): Promise<any> {
  const response = await fetch(`${BASE_URL}/v1/battle-lab/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`POST /v1/battle-lab/run -> ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

function loadFixture(name: string): any {
  return JSON.parse(readFileSync(path.join(FIXTURES_DIR, name), "utf8"));
}

/** Every pre-checkpoint frame/sha256 pair `docs/noland-brain-intro-ground-truth.md` §2/§3 cites, silver case. */
const SILVER_PRE_CHECKPOINT: ReadonlyArray<readonly [number, string]> = [
  [700, "7d8066240c8e65145665b0b035b5a560da1fb80f3cc8036a62bda4027d9e5cc9"],
  [1180, "ca7ba3277ad358125fd22b75b67fda0a4d9635ed799dd43b9eafe05a730a60ad"],
  [1400, "ca7ba3277ad358125fd22b75b67fda0a4d9635ed799dd43b9eafe05a730a60ad"],
  [2000, "c9d9b85391cbfd52df55e3da3ea4b0f12628fb1a86f7f1275c80f68d300ff7ed"],
  [2140, "bda253268eadf804bd4d1b87244fd3f477bc78d6cdeb15e7bdcd3a6830def248"],
  [2350, "0c2735bc4fbbf64810ca70b2297e487fc6be11035ed02dcbc0812d1691b071c6"],
  [2500, "02058bf441a1fc72595b29ff53518ce244110e82dae2c4277fbc3b069544cfd7"],
  [2650, "c101715530421b2fbac6b6b019e769f96ebcb2b9d4deaa0d7d78c61162c19aab"],
  [2860, "1c88457394fc841f4cb44c882f7da12964ed10e9d5d343191a0929bd823fc659"],
  [2980, "12f15c67426db1e809b19b92e7466be986810a0158702caea7d9035326ea451f"],
  [3140, "81d5fc9c8ef2bf6b1b35e8e57a67c97a6f89e3894184739bf2f2a59b72c6e471"],
  [3200, "81d5fc9c8ef2bf6b1b35e8e57a67c97a6f89e3894184739bf2f2a59b72c6e471"],
  // 3201-3228 hold: dialogue box dismissed, brief pause
  [3210, "31aec4d68fe629cba03d3d8cd60a144c4e3d2cd1d3edf5592a6237d9a6679543"],
  [3228, "31aec4d68fe629cba03d3d8cd60a144c4e3d2cd1d3edf5592a6237d9a6679543"],
  // 3229-3279 pre-transition flicker (16f period, briefly returning to the 3210/3228 sha)
  [3229, "ce3e94fa96b0902b865ddba988ca844e0e8f550dbc00aceefe61216aa87ca2a7"],
  [3244, "31aec4d68fe629cba03d3d8cd60a144c4e3d2cd1d3edf5592a6237d9a6679543"],
  [3260, "31aec4d68fe629cba03d3d8cd60a144c4e3d2cd1d3edf5592a6237d9a6679543"],
  [3276, "31aec4d68fe629cba03d3d8cd60a144c4e3d2cd1d3edf5592a6237d9a6679543"],
  [3279, "31aec4d68fe629cba03d3d8cd60a144c4e3d2cd1d3edf5592a6237d9a6679543"],
  // 3280-3333 transition swirl, unique every frame; 3334-3367 held "eye" pause
  [3334, "3fe5dda8d11c905c6582ee91181fb8161e216f1779526a1d4a4248bdcd5d50b4"],
  [3367, "3fe5dda8d11c905c6582ee91181fb8161e216f1779526a1d4a4248bdcd5d50b4"],
  // 3379-3422 black flash hold
  [3379, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
  [3400, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
  [3422, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
  // 3423-3639 fade-in / send-out-pic slide-in, unique every frame (no holds)
  // 3640-3738 pic reveal + name/class text window ("would like to battle!"), cycling 27f period
  [3640, "c465f04059ac7cf28d0050ed35f24b4edd43451e6cd771b915c76c44486d53cb"],
  [3660, "a4c9ba182e5c0e1009f97d68292e57c1766f3d9f15b2df07a4f6b287a18f6765"],
  [3738, "a4c9ba182e5c0e1009f97d68292e57c1766f3d9f15b2df07a4f6b287a18f6765"],
  // 3839-3869 opponent send-out text window, flat hold (stride-1 confirmed, no bounce)
  [3839, "9b7a93bd0c2eee6ab79fd428a433f27e011014fb0c8325bbab4d9509bdce46f6"],
  [3850, "9b7a93bd0c2eee6ab79fd428a433f27e011014fb0c8325bbab4d9509bdce46f6"],
  [3869, "9b7a93bd0c2eee6ab79fd428a433f27e011014fb0c8325bbab4d9509bdce46f6"],
  // 4003-4042 player send-out text window ("Go! DELCATTY!"), flat hold
  [4003, "6f265edb76a9ad729634827b8cbee6ee8b24a51be348f58cc38d19b72fb93828"],
  [4042, "6f265edb76a9ad729634827b8cbee6ee8b24a51be348f58cc38d19b72fb93828"],
  // 4049+ first action-menu-ready frame, cycling 36f period (FIGHT-cursor blink)
  [4049, "740918853e7ecf92364c829be6454516081f70c95173b5b5d1a0ce4a79fb480d"],
  [4054, "740918853e7ecf92364c829be6454516081f70c95173b5b5d1a0ce4a79fb480d"],
  [4056, "740918853e7ecf92364c829be6454516081f70c95173b5b5d1a0ce4a79fb480d"],
  [4064, "740918853e7ecf92364c829be6454516081f70c95173b5b5d1a0ce4a79fb480d"],
  [4065, "c19bfb00b09195bdc8d5c4ab2dac84cd3a2b0b9fdc53507bdae716d8e85af7cd"],
  [4074, "73764b4b8dc376ec4108fe3e3c039b351c313a7e8d453c111feb57d5d8a37ac7"],
  [4083, "5dfd6387bc6147408b8c9ad8ce09249cee6c3dc26f80e5777967f30feb766e7c"],
  [4092, "740918853e7ecf92364c829be6454516081f70c95173b5b5d1a0ce4a79fb480d"],
];

/** Post-checkpoint frame 0's sha equals the pre-checkpoint ready-cycle sha above -- the doc's central premise-correction claim. */
const SILVER_POST_CHECKPOINT_FRAME_ZERO = "740918853e7ecf92364c829be6454516081f70c95173b5b5d1a0ce4a79fb480d";

async function verifySilverDense(): Promise<void> {
  const fixture = loadFixture("factory-brain-silver-intro-dense-off.json");
  console.log(`\nsilver dense fixture (${fixture.preCheckpointCaptureFrames.length} pre-checkpoint frames requested):`);
  const response = await post(fixture);
  const bl = response.battleLab;
  check("mode echoed as factoryBrain", bl.mode === "factoryBrain", `mode=${bl.mode}`);
  check("fixedIv is the silver value (15)", bl.fixedIv === 15, `fixedIv=${bl.fixedIv}`);

  const byFrame = new Map<number, string>(
    (bl.preCheckpointCaptures as Array<{ frame: number; sha256: string }>).map((c) => [c.frame, c.sha256]),
  );
  for (const [frame, sha256] of SILVER_PRE_CHECKPOINT) {
    const actual = byFrame.get(frame);
    check(
      `pre-checkpoint frame ${frame} sha matches doc`,
      actual === sha256,
      `expected=${sha256.slice(0, 12)} actual=${actual?.slice(0, 12) ?? "MISSING"}`,
    );
  }

  const postFrameZero = (response.captures as Array<{ frame: number; sha256: string }>).find((c) => c.frame === 0);
  check(
    "post-checkpoint frame 0 sha matches the pre-checkpoint ready-cycle sha (doc's premise-correction claim)",
    postFrameZero?.sha256 === SILVER_POST_CHECKPOINT_FRAME_ZERO,
    `actual=${postFrameZero?.sha256?.slice(0, 12) ?? "MISSING"}`,
  );
}

const ORDINARY_PRE_CHECKPOINT: ReadonlyArray<readonly [number, string]> = [
  [900, "fd8242047c33d338bb874c12a4d0e9e62354401a74abe8747809b94b52b85afc"],
  [1160, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
  [1180, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
  [2000, "5bc27121fb9fd4838dafddf9637ad417f6bce2a17babf8bdc5f1969a95eaadb7"],
];
const ORDINARY_POST_CHECKPOINT_FRAME_ZERO = "5bc27121fb9fd4838dafddf9637ad417f6bce2a17babf8bdc5f1969a95eaadb7";

async function verifyOrdinaryDelta(): Promise<void> {
  const fixture = loadFixture("factory-trainer-pic-shizuka-off.json");
  console.log("\nordinary comparator (factory-trainer-pic-shizuka-off.json + ad hoc preCheckpointCaptureFrames):");
  const request = {
    ...fixture,
    preCheckpointCaptureFrames: ORDINARY_PRE_CHECKPOINT.map(([frame]) => frame),
  };
  const response = await post(request);
  const byFrame = new Map<number, string>(
    (response.battleLab.preCheckpointCaptures as Array<{ frame: number; sha256: string }>).map((c) => [
      c.frame,
      c.sha256,
    ]),
  );
  for (const [frame, sha256] of ORDINARY_PRE_CHECKPOINT) {
    const actual = byFrame.get(frame);
    check(
      `ordinary pre-checkpoint frame ${frame} sha matches doc`,
      actual === sha256,
      `expected=${sha256.slice(0, 12)} actual=${actual?.slice(0, 12) ?? "MISSING"}`,
    );
  }
  const postFrameZero = (response.captures as Array<{ frame: number; sha256: string }>).find((c) => c.frame === 0);
  check(
    "ordinary post-checkpoint frame 0 sha matches its own pre-checkpoint frame-2000 sha (much shorter route than the Brain's ~4049)",
    postFrameZero?.sha256 === ORDINARY_POST_CHECKPOINT_FRAME_ZERO,
    `actual=${postFrameZero?.sha256?.slice(0, 12) ?? "MISSING"}`,
  );
  check(
    "ordinary and Brain black-flash transition frames share the identical sha (shared transition art)",
    byFrame.get(1160) === "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a",
    `actual=${byFrame.get(1160)?.slice(0, 12) ?? "MISSING"}`,
  );
}

async function main(): Promise<void> {
  await verifySilverDense();
  await verifyOrdinaryDelta();
  console.log(`\n${checks - failures}/${checks} checks passed`);
  console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
