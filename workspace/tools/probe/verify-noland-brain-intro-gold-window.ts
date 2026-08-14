/**
 * Live verification for `docs/noland-brain-intro-gold-ground-truth.md`.
 *
 * Reruns `tools/battle-lab/factory-brain-gold-intro-dense-off.json` (the
 * dense-capture Brain battle-start-window fixture, gold sibling of
 * `factory-brain-silver-intro-dense-off.json`) against a live Battle Scene
 * OFF service and checks the sha256 of every frame the gold ground-truth
 * doc cites, both pre-checkpoint (the `preCheckpointCaptureFrames` space)
 * and post-checkpoint (frame 0, to prove it lands in the same ready-state
 * cycle §1's table describes).
 *
 * Run (needs a live Battle Scene OFF service, default :8014):
 *   node --experimental-strip-types tools/probe/verify-noland-brain-intro-gold-window.ts
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

/** Every pre-checkpoint frame/sha256 pair `docs/noland-brain-intro-gold-ground-truth.md` §1 cites, gold case. */
const GOLD_PRE_CHECKPOINT: ReadonlyArray<readonly [number, string]> = [
  // rental select + pre-rental fade
  [0, "9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297"],
  [100, "c9fb76289bdedfef273dfe848efe1e7c0f89cce55cf9d1c06a660ea4b9aa1182"],
  [200, "5bfd5ec1a8c8fca1869be080c7ad48011a8101b57205ccf6bbff1b6bf9afa136"],
  [300, "6d496fdc881fd48328a6adf5377c31ffa3be5225bd4e281aedc43ec88f0e6f73"],
  // 418-431 black transition, rental select -> lobby
  [418, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
  [431, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
  // 479-529 escort box instance 1, "Right this way, please!"
  [479, "5e8a53338048580102ec0a5ab86d5cfa85ac7413625b44544ceb2b51a9b8b16e"],
  [500, "5e8a53338048580102ec0a5ab86d5cfa85ac7413625b44544ceb2b51a9b8b16e"],
  [520, "5e8a53338048580102ec0a5ab86d5cfa85ac7413625b44544ceb2b51a9b8b16e"],
  // 629-639 second black transition, mid-walk
  [629, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
  [639, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
  // 880-962 escort box instance 2, "Right this way, please!" (settled)
  [880, "5c99a4d66e363acc32d7a008bd1178e4afc3106a40b1dd12841798659d3e244e"],
  [915, "5c99a4d66e363acc32d7a008bd1178e4afc3106a40b1dd12841798659d3e244e"],
  [962, "5c99a4d66e363acc32d7a008bd1178e4afc3106a40b1dd12841798659d3e244e"],
  // 963-989 dialogue box dismissed, empty arena pause
  [963, "31aec4d68fe629cba03d3d8cd60a144c4e3d2cd1d3edf5592a6237d9a6679543"],
  [989, "31aec4d68fe629cba03d3d8cd60a144c4e3d2cd1d3edf5592a6237d9a6679543"],
  // 990-1040 pre-transition flicker (16f period, alternating at this sampling)
  [990, "ce3e94fa96b0902b865ddba988ca844e0e8f550dbc00aceefe61216aa87ca2a7"],
  [996, "9ea9d972008b19961fbd129745a5992b107f6f3d277d1cf4becd5b4319409810"],
  [1020, "ce3e94fa96b0902b865ddba988ca844e0e8f550dbc00aceefe61216aa87ca2a7"],
  [1040, "31aec4d68fe629cba03d3d8cd60a144c4e3d2cd1d3edf5592a6237d9a6679543"],
  // 1041-1104 transition swirl, unique every frame; 1105-1138 held "eye" pause
  [1105, "3fe5dda8d11c905c6582ee91181fb8161e216f1779526a1d4a4248bdcd5d50b4"],
  [1138, "3fe5dda8d11c905c6582ee91181fb8161e216f1779526a1d4a4248bdcd5d50b4"],
  // 1150-1193 black flash hold
  [1150, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
  [1170, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
  [1193, "d8b443032200e143b1c49820b6d78c32d519553a3f63a38f48e8bc31da084f0a"],
  // 1411-1544 pic reveal + name/class text window ("would like to battle!"), cycling 27f period
  [1411, "c465f04059ac7cf28d0050ed35f24b4edd43451e6cd771b915c76c44486d53cb"],
  [1480, "c465f04059ac7cf28d0050ed35f24b4edd43451e6cd771b915c76c44486d53cb"],
  [1544, "a4c9ba182e5c0e1009f97d68292e57c1766f3d9f15b2df07a4f6b287a18f6765"],
  // 1644-1715 opponent send-out text window ("sent out BLAZIKEN!"), flat hold
  [1644, "9503cf761fd9dfb1c5a542e8f32f9e8a9ced859d8ac4513b4d041582a1947378"],
  [1680, "9503cf761fd9dfb1c5a542e8f32f9e8a9ced859d8ac4513b4d041582a1947378"],
  [1715, "9503cf761fd9dfb1c5a542e8f32f9e8a9ced859d8ac4513b4d041582a1947378"],
  // 1848-1882 player send-out text window ("Go! DUGTRIO!"), flat hold
  [1848, "b2bd1f35cb55a0c56c33af51047d46b172a25c08d46c8abaf3a8bae4e7c784d2"],
  [1870, "b2bd1f35cb55a0c56c33af51047d46b172a25c08d46c8abaf3a8bae4e7c784d2"],
  [1882, "b2bd1f35cb55a0c56c33af51047d46b172a25c08d46c8abaf3a8bae4e7c784d2"],
  // 1889+ first action-menu-ready frame, cycling 36f period
  [1889, "995c66ff0a4578418a8c6ecc387c06a966a55fd342669d220bc953062e7c34d2"],
  [1900, "995c66ff0a4578418a8c6ecc387c06a966a55fd342669d220bc953062e7c34d2"],
  [1911, "08a32dfc09b0856908084fa99797bb2e74d91e9a715a358ec7eca15f690bb1ea"],
  [1920, "d8275aa297efa6617262943aecf019634787df1c69dea379bc4bbabc93cf2d41"],
  [1929, "995c66ff0a4578418a8c6ecc387c06a966a55fd342669d220bc953062e7c34d2"],
  [1938, "6bfde72b063d655cabaec665ece50c9c4e78cb7ea82dc291e46a69f442d0507a"],
  [1974, "995c66ff0a4578418a8c6ecc387c06a966a55fd342669d220bc953062e7c34d2"],
];

/** Post-checkpoint frame 0's sha equals the pre-checkpoint ready-cycle sha above -- the doc's §2 premise check. */
const GOLD_POST_CHECKPOINT_FRAME_ZERO = "995c66ff0a4578418a8c6ecc387c06a966a55fd342669d220bc953062e7c34d2";

async function verifyGoldDense(): Promise<void> {
  const fixture = loadFixture("factory-brain-gold-intro-dense-off.json");
  console.log(`\ngold dense fixture (${fixture.preCheckpointCaptureFrames.length} pre-checkpoint frames requested):`);
  const response = await post(fixture);
  const bl = response.battleLab;
  check("mode echoed as factoryBrain", bl.mode === "factoryBrain", `mode=${bl.mode}`);
  check("fixedIv is the gold value (31)", bl.fixedIv === 31, `fixedIv=${bl.fixedIv}`);

  const byFrame = new Map<number, string>(
    (bl.preCheckpointCaptures as Array<{ frame: number; sha256: string }>).map((c) => [c.frame, c.sha256]),
  );
  for (const [frame, sha256] of GOLD_PRE_CHECKPOINT) {
    const actual = byFrame.get(frame);
    check(
      `pre-checkpoint frame ${frame} sha matches doc`,
      actual === sha256,
      `expected=${sha256.slice(0, 12)} actual=${actual?.slice(0, 12) ?? "MISSING"}`,
    );
  }

  const postFrameZero = (response.captures as Array<{ frame: number; sha256: string }>).find((c) => c.frame === 0);
  check(
    "post-checkpoint frame 0 sha matches the pre-checkpoint ready-cycle sha (doc's §2 premise check)",
    postFrameZero?.sha256 === GOLD_POST_CHECKPOINT_FRAME_ZERO,
    `actual=${postFrameZero?.sha256?.slice(0, 12) ?? "MISSING"}`,
  );
}

async function main(): Promise<void> {
  await verifyGoldDense();
  console.log(`\n${checks - failures}/${checks} checks passed`);
  console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
