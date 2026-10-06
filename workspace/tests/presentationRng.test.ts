import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  advancePresentationRng,
  createPresentationRngState,
  drawPresentationRng,
  presentationRngJump,
  presentationRngStep,
} from "../src/engine/presentationRng.ts";
import {
  DEFAULT_PRESENTATION_RNG_SEED,
  PRESENTATION_RNG_BATTLE_STRIDE,
  PRESENTATION_RNG_POLICY_V1,
  activatePresentationRngBody,
  advancePresentationRngHost,
  createPresentationRngHost,
  createPresentationRngHostAt,
  createPresentationRngSession,
  formatPresentationSeed,
  parsePresentationSeed,
  presentationRngBattleSeed,
  presentationRngBodyWords,
  presentationRngPlanWords,
  tickPresentationRngSession,
  type PresentationRngDrawStep,
} from "../src/engine/presentationRngHost.ts";

type Receipt = { firstRng2: number; steps: { from: number; to: number; gRng2Steps: number }[] };
type Lab = { anchorRng2: number; finalRng2: number; frames: number; runs: { from: number; to: number; steps: number; endValue: number }[] };
type BodyWords = {
  acceptedDoubleKick: { activationRow: number; drawFrame: number; rfuStepsBeforeDraws: number; pinned: number[] };
  labDrawFrames: { activation: number; drawFrame: number; offset: number; earlierDraws: number; drawCallers: string[]; words: number[] }[];
};
const json = <T>(path: string): T => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8")) as T;
const receipt = json<Receipt>("tools/integration/rng2-doublekick-receipt.json");
const lab = json<Lab>("tools/integration/fixtures/random2/lab-doublekick-astonish-mudslap.json");
const bodyWords = json<BodyWords>("tools/integration/fixtures/random2/body-words-check.json");

/** Reference BigInt ISO_RANDOMIZE1 (random.c:31), independent of the u32 implementation. */
const bigStep = (v: number) => Number((BigInt(v) * 1103515245n + 24691n) & 0xffffffffn);

function labValues(): number[] {
  const values = [lab.anchorRng2];
  for (const run of lab.runs) {
    for (let frame = run.from; frame <= run.to; frame += 1) values[frame] = presentationRngJump(values[frame - 1]!, run.steps);
  }
  return values;
}

describe("presentation Random2 LCG (random.c:29-33)", () => {
  it("matches a BigInt ISO_RANDOMIZE1 reference and jump-ahead equals repeated steps", () => {
    let v = DEFAULT_PRESENTATION_RNG_SEED;
    for (let i = 0; i < 2000; i += 1) {
      const next = presentationRngStep(v);
      expect(next).toBe(bigStep(v));
      v = next;
    }
    expect(presentationRngJump(DEFAULT_PRESENTATION_RNG_SEED, 2000)).toBe(v);
    for (const n of [0, 1, 2, 3, 31, 32, 33, 1 << 20, 0xffffffff, 2 ** 40 + 7]) {
      expect(presentationRngJump(presentationRngJump(0x12345678, n), 5)).toBe(presentationRngJump(0x12345678, n + 5));
    }
    // ISO_RANDOMIZE1 has full period 2^32 modulo 2^32.
    expect(presentationRngJump(0xdeadbeef, 2 ** 32)).toBe(0xdeadbeef);
    expect(() => presentationRngJump(0, -1)).toThrow();
  });

  it("draw() is advance-then-high-half (Random2)", () => {
    const s = createPresentationRngState(receipt.firstRng2, "pinned");
    const drawn = drawPresentationRng(s);
    expect(drawn.state.value).toBe(presentationRngStep(receipt.firstRng2));
    expect(drawn.word).toBe(presentationRngStep(receipt.firstRng2) >>> 16);
    expect(drawn.state.provenance).toBe("pinned");
    expect(s.value).toBe(receipt.firstRng2);
    expect(() => createPresentationRngState(2 ** 32, "surrogate")).toThrow();
  });

  it("reproduces the receipt per-frame step sequence and the lab fixture's per-run end values", () => {
    expect(receipt.firstRng2).toBe(0x8c5713a0);
    let iterative = receipt.firstRng2;
    let total = 0;
    for (const step of receipt.steps) {
      for (let i = 0; i < step.gRng2Steps; i += 1) iterative = presentationRngStep(iterative);
      total += step.gRng2Steps;
      expect(presentationRngJump(receipt.firstRng2, total)).toBe(iterative);
    }
    expect(receipt.steps.map(s => s.gRng2Steps).join("")).toBe("11111111151111111111111111111111001");
    expect(total).toBe(37);
    let value = lab.anchorRng2;
    for (const run of lab.runs) {
      value = presentationRngJump(value, run.steps * (run.to - run.from + 1));
      expect(value).toBe(run.endValue);
    }
    expect(value).toBe(lab.finalRng2);
  });
});

describe("presentation RNG host draw-plan API", () => {
  it("returns the accepted Double Kick fistRandom from the receipt activation (body-words-check)", () => {
    const dk = bodyWords.acceptedDoubleKick;
    expect(dk.drawFrame - dk.activationRow).toBe(dk.rfuStepsBeforeDraws);
    const words = presentationRngPlanWords(createPresentationRngState(receipt.firstRng2, "pinned"), [{ ageOffset: 10, count: 4 }]);
    expect(words.words).toEqual([46625, 58366, 21952, 56639]);
    expect(words.words).toEqual(dk.pinned);
    expect(words.provenance).toBe("pinned");
    expect(words.valueAfter).toBe(presentationRngJump(receipt.firstRng2, 14));
    // Same words through a host activated at the receipt frame, and the stream consumes the 4 draws on frame +10.
    let host = createPresentationRngHostAt(createPresentationRngState(receipt.firstRng2, "pinned"));
    const activated = activatePresentationRngBody(host, "double-kick", [{ ageOffset: 10, count: 4 }]);
    expect(activated.record.words.words).toEqual(dk.pinned);
    host = activated.host;
    let value = receipt.firstRng2;
    for (const step of receipt.steps.slice(0, 31)) {
      host = advancePresentationRngHost(host);
      value = presentationRngJump(value, step.gRng2Steps);
      expect(host.state.value).toBe(value); // no lag before frame 259: the policy matches the ROM here
    }
  });

  it("reproduces the lab Double Kick x2, Astonish and Mud-Slap wave vectors", () => {
    const values = labValues();
    const byActivation = new Map<number, BodyWords["labDrawFrames"]>();
    for (const row of bodyWords.labDrawFrames) byActivation.set(row.activation, [...(byActivation.get(row.activation) ?? []), row]);
    expect([...byActivation.keys()]).toEqual([87, 215, 1023, 1968]);
    const plans: Record<number, PresentationRngDrawStep[]> = {
      87: [{ ageOffset: 10, count: 4 }], // Double Kick hit 1 (AnimFistOrFootRandomPos x/y/xSign/ySign)
      215: [{ ageOffset: 10, count: 4 }], // Double Kick hit 2
      1023: [{ ageOffset: 31, count: 2 }, { ageOffset: 31, count: 2 }], // Astonish: 2 droplets x (0x1ff, 0x7f)
      1968: [9, 13, 17, 21, 25, 29].map(ageOffset => ({ ageOffset, count: 10 })), // Mud-Slap 6 waves x 10 AnimDirtScatter
    };
    for (const [activation, rows] of byActivation) {
      const words = presentationRngPlanWords(createPresentationRngState(values[activation]!, "pinned"), plans[activation]!);
      expect(words.words).toEqual(rows.flatMap(row => row.words));
      const expectedDraws = activation === 1023 ? [rows[0]!.words.slice(0, 2), rows[0]!.words.slice(2)] : rows.map(row => row.words);
      expect(words.draws).toEqual(expectedDraws);
      // Value after the last draw frame equals the lab's observed value (lagBeforeDraw 0 for every row).
      const last = rows[rows.length - 1]!;
      expect(words.valueAfter).toBe(values[last.drawFrame]);
    }
    expect(bodyWords.labDrawFrames).toHaveLength(9);
  });

  it("is pure: the same activation state and plan always give the same words, inputs untouched", () => {
    const s = createPresentationRngState(0x0badf00d, "surrogate");
    const plan = Object.freeze([{ ageOffset: 3, count: 2 }, { ageOffset: 3, count: 1 }, { ageOffset: 9, count: 4 }]);
    const a = presentationRngPlanWords(s, plan);
    const b = presentationRngPlanWords(s, plan);
    expect(a).toEqual(b);
    expect(s.value).toBe(0x0badf00d);
    expect(a.words).toHaveLength(7);
    expect(a.valueAfter).toBe(presentationRngJump(0x0badf00d, 9 + 7));
    expect(() => presentationRngPlanWords(s, [{ ageOffset: 4, count: 1 }, { ageOffset: 3, count: 1 }])).toThrow();
    expect(() => presentationRngPlanWords(s, [{ ageOffset: 1, count: -1 }])).toThrow();
  });

  it("consumes each body's draws exactly once per activation, at their draw frames", () => {
    const seed = 0x13579bdf;
    const base = createPresentationRngHost(seed, 0);
    expect(base.state).toEqual({ value: seed, provenance: "surrogate" });
    const plan = [{ ageOffset: 0, count: 1 }, { ageOffset: 2, count: 3 }];
    const first = activatePresentationRngBody(base, "body-a", plan);
    expect(first.host.state.value).toBe(presentationRngJump(seed, 1)); // age-0 draw follows this frame's step
    const again = activatePresentationRngBody(first.host, "body-a", plan);
    expect(again.host).toBe(first.host);
    expect(again.record).toBe(first.record);
    expect(presentationRngBodyWords(first.host, "body-a")).toBe(first.record.words);
    expect(presentationRngBodyWords(first.host, "missing")).toBeNull();
    let host = first.host;
    host = advancePresentationRngHost(host);
    expect(host.state.value).toBe(presentationRngJump(seed, 2));
    host = advancePresentationRngHost(host);
    expect(host.state.value).toBe(presentationRngJump(seed, 2 + 1 + 3));
    expect(host.state.value).toBe(first.record.words.valueAfter);
    expect(host.pendingDraws).toEqual([]);
    host = advancePresentationRngHost(host);
    expect(host.state.value).toBe(presentationRngJump(seed, 7));
  });

  it("keeps pinned vs surrogate provenance in the returned words record", () => {
    const pinned = activatePresentationRngBody(createPresentationRngHostAt(createPresentationRngState(1, "pinned")), "k", [{ ageOffset: 1, count: 1 }]);
    const surrogate = activatePresentationRngBody(createPresentationRngHost(1, 0), "k", [{ ageOffset: 1, count: 1 }]);
    expect(pinned.record.words.provenance).toBe("pinned");
    expect(surrogate.record.words.provenance).toBe("surrogate");
    expect(pinned.record.words.words).toEqual(surrogate.record.words.words);
    expect(advancePresentationRngHost(pinned.host).state.provenance).toBe("pinned");
    expect(advancePresentationRngHost(surrogate.host).state.provenance).toBe("surrogate");
    expect(advancePresentationRng(createPresentationRngState(5, "pinned"), 3).provenance).toBe("pinned");
  });
});

describe("presentation RNG session seeding", () => {
  it("seeds battle n at the session seed advanced by n * 2^20, steps once per presented frame, and drops off-battle", () => {
    expect(PRESENTATION_RNG_BATTLE_STRIDE).toBe(1048576);
    expect(presentationRngBattleSeed(DEFAULT_PRESENTATION_RNG_SEED, 0)).toBe(0x808db3eb);
    expect(presentationRngBattleSeed(7, 2)).toBe(presentationRngJump(7, 2 * 1048576));
    let session = createPresentationRngSession();
    expect(session).toEqual({ seed: 0x808db3eb, policy: PRESENTATION_RNG_POLICY_V1, battlesStarted: 0, battleKey: null, host: null });
    expect(tickPresentationRngSession(session, null)).toBe(session);
    session = tickPresentationRngSession(session, 100);
    expect(session.host).toMatchObject({ battleOrdinal: 0, frame: 0, state: { value: 0x808db3eb, provenance: "surrogate" } });
    for (let i = 0; i < 5; i += 1) session = tickPresentationRngSession(session, 100);
    expect(session.host).toMatchObject({ frame: 5, state: { value: presentationRngJump(0x808db3eb, 5) } });
    session = tickPresentationRngSession(session, null);
    expect(session.host).toBeNull();
    session = tickPresentationRngSession(session, 100);
    expect(session.host).toMatchObject({ battleOrdinal: 1, frame: 0, state: { value: presentationRngBattleSeed(0x808db3eb, 1) } });
    session = tickPresentationRngSession(session, 250);
    expect(session.battlesStarted).toBe(3);
    expect(session.host!.battleOrdinal).toBe(2);
    expect(() => createPresentationRngSession(-1)).toThrow();
    expect(() => createPresentationRngSession(1, "v0" as typeof PRESENTATION_RNG_POLICY_V1)).toThrow();
  });

  it("parses and formats hex presentation seeds", () => {
    expect(parsePresentationSeed("808DB3EB")).toBe(0x808db3eb);
    expect(parsePresentationSeed("0x1f")).toBe(0x1f);
    expect(parsePresentationSeed("123456789")).toBeNull();
    expect(parsePresentationSeed("zz")).toBeNull();
    expect(parsePresentationSeed(null)).toBeNull();
    expect(formatPresentationSeed(0x1f)).toBe("0000001f");
    expect(parsePresentationSeed(formatPresentationSeed(0xfedcba98))).toBe(0xfedcba98);
  });
});
