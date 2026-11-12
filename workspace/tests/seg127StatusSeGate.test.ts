import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SEG127_EFFECTIVENESS_SE_ROWS,
  SEG127_FIXED_ROWS,
  SEG127_SE_GATE_CAP,
  seg127StatusSeGateFromEvents,
  seg127StatusSeGateRows,
  seg127StatusSeGateRowsForPath,
  type Seg127GateEvent,
  type Seg127SeGatePath,
} from "../src/engine/seg127StatusSeGate.ts";

// seg127 (docs/seg127-status-se-gate.md): the banked IsBattleSEPlaying gate rule against every direct-mGBA receipt
// (tools/integration/fixtures/seg127/receipts/rom-r1.json, 32 scenarios, r1 == r2) and the census projection on seeds 0..999
// (fixtures/seg127/exposure.json, seg127Exposure.ts on the 9a184dfa6 production kernel).

const FIX = "tools/integration/fixtures/seg127";
const SONG_ID: Readonly<Record<string, number>> = { se_not_effective: 12, se_effective: 13, se_super_effective: 14 };

type Receipt = {
  label: string; X: number; gate: number; ruleGate: number; activeRows: number; controllerRows: number; mrf: number;
  se: { song: string; L: number; age: number; hpDrain: number; fixed: number } | null;
};
type Scenario = { class: string; expectedLabel: string; statusAnimations: Receipt[] };
const rom = JSON.parse(readFileSync(`${FIX}/receipts/rom-r1.json`, "utf8")) as { scenarios: Record<string, Scenario>; residuals: unknown[] };
const rule = JSON.parse(readFileSync(`${FIX}/rule.json`, "utf8")) as {
  seRows: Record<string, number>; cap: number; fixedRows: Record<string, number>;
};
const exposure = JSON.parse(readFileSync(`${FIX}/exposure.json`, "utf8")) as {
  receipts: number; unclassified: number; projectionTotal: { gated: number; frames: number; unmeasuredOpen: number };
  openReceipts: { seed: number; k: number; cls: string; gate: number; tail: string[]; next: string | null }[];
};

const receipts = Object.entries(rom.scenarios).flatMap(([stem, s]) => s.statusAnimations.map((r) => ({ stem, s, r })));
const songId = (r: Receipt) => (r.se ? SONG_ID[r.se.song] ?? null : null);

/** The receipt's path when it is its scenario's gated class (label match), else null (turn-start / end-turn / status move). */
function pathOf(stem: string, s: Scenario, r: Receipt): Seg127SeGatePath | null {
  if (!r.label.startsWith(s.expectedLabel) || r.label.includes("MoveUsedIs") || r.label.includes("DoStatusTurnDmg")) return null;
  if (s.class.startsWith("synchronize")) return null;
  if (r.label.startsWith("BattleScript_CuteCharmActivates")) return "cute-charm";
  if (r.label.startsWith("BattleScript_ThrashConfuses")) return "thrash-fatigue";
  if (r.label.startsWith("BattleScript_YawnMakesAsleep")) return "yawn";
  if (s.class.startsWith("contact-ability")) return "contact-ability";
  if (s.class.startsWith("hit-secondary")) return "hit-secondary";
  throw new Error(`unclassified receipt ${stem} ${r.label}`);
}

describe("seg127 IsBattleSEPlaying status-animation gate", () => {
  it("banks the committed rule constants", () => {
    expect(Object.fromEntries(Object.entries(SEG127_EFFECTIVENESS_SE_ROWS).map(([k, v]) => [String(k), v]))).toEqual(rule.seRows);
    expect(SEG127_SE_GATE_CAP).toBe(rule.cap);
    expect({ ...SEG127_FIXED_ROWS }).toEqual(rule.fixedRows);
  });

  it("covers 56 receipts r1 with 0 analysis residuals, including sta123's Ice Beam 17 / 18", () => {
    expect(receipts).toHaveLength(56);
    expect(rom.residuals).toEqual([]);
    const ice = receipts.filter(({ r }) => r.label === "BattleScript_MoveEffectFreeze+0").map(({ stem, r }) => [stem, r.gate]);
    expect(ice).toEqual([["seg127-ice-beam-opp-delcatty-shuckle", 17], ["seg127-ice-beam-ply-delcatty-shuckle", 18]]);
  });

  it("measures the source SE lengths on every effectiveness-SE receipt", () => {
    for (const { r } of receipts) {
      const id = songId(r);
      if (id !== null) expect(r.se!.L, `${r.label}`).toBe(SEG127_EFFECTIVENESS_SE_ROWS[id]);
    }
  });

  it("reproduces every ROM gate from (songId, seAge): residual 0", () => {
    for (const { stem, r } of receipts) {
      const got = r.se ? seg127StatusSeGateRows({ songId: songId(r), seAgeRows: r.se.age }) : 0;
      expect(got, `${stem} ${r.label} X ${r.X}`).toBe(r.gate);
      // every other SE (the animation scripts' own) ended before the first poll
      if (r.se && songId(r) === null) expect(r.se.L).toBeLessThanOrEqual(r.se.age);
      expect(r.controllerRows).toBe(r.gate + r.activeRows + 1);
    }
  });

  it("reproduces every ROM gate from production's inputs (path, HP-bar rows, message since the SE): residual 0", () => {
    let gated = 0;
    for (const { stem, s, r } of receipts) {
      const path = pathOf(stem, s, r);
      // MOVE_RESULT_SUPER_EFFECTIVE (2) / NOT_VERY_EFFECTIVE (4) print their result message after the SE
      const messageSinceSe = path === null || (r.mrf & 6) !== 0;
      const got = path === null ? 0
        : seg127StatusSeGateRowsForPath({ songId: songId(r), path, hpDrainRows: r.se!.hpDrain, messageSinceSe });
      expect(got, `${stem} ${r.label} X ${r.X}`).toBe(r.gate);
      if (path !== null && !messageSinceSe) expect(r.se!.fixed, `${stem} fixed rows`).toBe(SEG127_FIXED_ROWS[path]);
      if (r.gate > 0) gated += 1;
    }
    expect(gated).toBe(16);
  });

  it("caps at 29 and is 0 without an effectiveness SE", () => {
    expect(seg127StatusSeGateRows({ songId: 13, seAgeRows: 1 })).toBe(29);
    expect(seg127StatusSeGateRows({ songId: 14, seAgeRows: 58 })).toBe(29);
    expect(seg127StatusSeGateRows({ songId: 14, seAgeRows: 60 })).toBe(28);
    expect(seg127StatusSeGateRows({ songId: null, seAgeRows: 5 })).toBe(0);
    expect(seg127StatusSeGateRows({ songId: 13, seAgeRows: 73 })).toBe(0);
  });

  it("replays every open census receipt through the event-level form (seeds 0..999: 72 gated, 745 frames)", () => {
    // seg268: exposure.json regenerated on the current kernel; receipts were 8080 (9a184dfa6), frames 729 (gated stays 72).
    expect(exposure.receipts).toBe(8023);
    expect(exposure.unclassified).toBe(0);
    let frames = 0;
    let gated = 0;
    for (const o of exposure.openReceipts) {
      const events: Seg127GateEvent[] = o.tail.map((t) => {
        const [k, a, b, c] = t.split(":");
        if (k === "msg") return { kind: "message", messageId: t.slice(4) };
        if (k === "se") return { kind: "play-se", songId: Number(a) };
        if (k === "hp") return { kind: "hp-change", from: Number(b), to: Number(c) };
        if (k === "anim") return { kind: "animation", animationId: a };
        if (k === "sa") return { kind: "status-animation" };
        return { kind: k! };
      });
      events.push({ kind: "status-animation" });
      if (o.next !== null) events.push({ kind: "message", messageId: o.next });
      const got = seg127StatusSeGateFromEvents(events, o.tail.length);
      expect(got, `seed ${o.seed} #${o.k}`).not.toBeNull();
      expect(got!.path, `seed ${o.seed} #${o.k}`).toBe(o.cls);
      expect(got!.gate, `seed ${o.seed} #${o.k}`).toBe(o.gate);
      frames += got!.gate;
      gated += got!.gate > 0 ? 1 : 0;
    }
    expect({ gated, frames }).toEqual({ gated: exposure.projectionTotal.gated, frames: exposure.projectionTotal.frames });
    expect({ gated, frames }).toEqual({ gated: 72, frames: 745 });
  });

  it("is 0 once a message follows the SE, and without any SE", () => {
    const hit: Seg127GateEvent[] = [
      { kind: "message", messageId: "STRINGID_USEDMOVE" }, { kind: "animation", animationId: "MOVE_ANIMATION" },
      { kind: "play-se", songId: 13 }, { kind: "animation", animationId: "HIT_ANIMATION" }, { kind: "hp-change", from: 120, to: 108 },
    ];
    expect(seg127StatusSeGateFromEvents([...hit, { kind: "status-animation" }, { kind: "message", messageId: "STRINGID_PKMNWASFROZEN" }], 5)!.gate)
      .toBe(17);
    expect(seg127StatusSeGateFromEvents([...hit, { kind: "message", messageId: "STRINGID_CRITICALHIT" }, { kind: "status-animation" }], 6)!.gate)
      .toBe(0);
    expect(seg127StatusSeGateFromEvents([{ kind: "message", messageId: "STRINGID_PKMNFASTASLEEP" }, { kind: "status-animation" }], 1)!.gate)
      .toBe(0);
  });
});
