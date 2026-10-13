// sgs134 (S10A timeline fidelity, docs/sgs134-se-gate-other-requests.md): the controller's IsBattleSEPlaying gate on the OTHER requests
// (HandleBattleAnimation's B_ANIM_STATS_CHANGE of a hit's secondary, HandleMoveAnimation's 2nd+ multi-hit hit). Pins the committed
// evidence: the direct-mGBA ROM receipts (both scenes) against seg127's rule with the measured fixed rows, the census exposure
// projection, production today (short by exactly the gate) and the banked patch's census delta. JSON fixtures only: the patch is banked
// (fixtures/sgs134/sgs134-gate.diff), not applied.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const F = "tools/integration/fixtures/sgs134";
const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const rule = json("tools/integration/fixtures/seg127/rule.json") as { seRows: Record<string, number>; cap: number };
const fixed = json(`${F}/fixed-rows.json`) as { seRows: Record<string, number>; cap: number; fixedRows: Record<string, number> };
const SONG: Record<string, string> = { se_not_effective: "12", se_effective: "13", se_super_effective: "14" };
type Request = { label: string; op: string; seGate: number | null; ruleGate: number; controllerRows: number; delay: number | null;
  se: { song: string; fixed: number; hpDrain: number; age: number; L: number } | null };
const requests = (path: string) => Object.entries(json(path).scenarios as Record<string, { requests: Request[] }>)
  .flatMap(([scenario, v]) => v.requests.map((r) => ({ scenario, ...r })));
const classOf = (label: string) => label.startsWith("BattleScript_StatDown+") ? "stats-change-target"
  : label.startsWith("BattleScript_StatUp+") ? "stats-change-attacker" : label.startsWith("BattleScript_DoMultiHit+") ? "multi-hit" : null;

describe("sgs134 ROM receipts", () => {
  it("uses seg127's SE rows and cap", () => {
    expect(fixed.seRows).toEqual(rule.seRows);
    expect(fixed.cap).toBe(rule.cap);
    expect(fixed.fixedRows).toEqual({ "stats-change-target": 44, "stats-change-attacker": 44, "multi-hit": 62 });
  });

  for (const mode of ["on", "off"] as const) {
    const path = `${F}/receipts/${mode === "on" ? "rom-r1" : "rom-off-r1"}.json`;
    it(`${mode}: every receipt's gate == clamp(seRows - (fixedRows + HP drain), 0, 29); a print in between closes it`, () => {
      expect(json(path).residuals).toEqual([]);
      const gated = requests(path).filter((r) => classOf(r.label) !== null && r.se !== null && SONG[r.se.song] !== undefined);
      let open = 0;
      let closed = 0;
      for (const r of gated) {
        const cls = classOf(r.label)!;
        if (r.se!.fixed === fixed.fixedRows[cls]) {
          open += 1;
          const projected = Math.max(0, Math.min(fixed.cap, fixed.seRows[SONG[r.se!.song]!]! - (fixed.fixedRows[cls]! + r.se!.hpDrain)));
          expect(r.seGate, `${r.scenario} ${r.label}`).toBe(projected);
        } else {
          closed += 1;
          expect(r.se!.fixed, `${r.scenario} ${r.label}`).toBeGreaterThan(88); // "A critical hit!" + waitmessage 64
          expect(r.seGate).toBe(0);
        }
      }
      expect({ open, closed }).toEqual({ open: 32, closed: 6 });
    });
  }

  it("on: the request's controller rows grow by exactly the gate (playanimation 76 + gate; attackanimation launch = poll + 2 + gate)", () => {
    for (const r of requests(`${F}/receipts/rom-r1.json`)) {
      const cls = classOf(r.label);
      if (cls === "stats-change-target" || cls === "stats-change-attacker") expect(r.controllerRows - r.seGate!).toBe(76);
      if (r.op === "attackanimation") expect(r.delay! - r.seGate!).toBe(2);
    }
    const perMove = (scenario: string) => new Set(requests(`${F}/receipts/rom-r1.json`)
      .filter((r) => r.scenario === scenario && classOf(r.label) === "multi-hit").map((r) => r.controllerRows - r.seGate!));
    expect([...perMove("sgs134-pin-missile-primeape-ply")]).toEqual([95]);
    expect([...perMove("sgs134-pin-missile-primeape-opp")]).toEqual([95]);
    expect([...perMove("sgs134-bonemerang-chansey-ply")]).toEqual([74]);
    expect([...perMove("sgs134-bonemerang-chansey-opp")]).toEqual([74]);
  });

  it("off: the same stat-change gates; no multi-hit request (attackanimation is skipped)", () => {
    const on = requests(`${F}/receipts/rom-r1.json`).filter((r) => r.op === "playanimation").map((r) => [r.scenario, r.seGate, r.controllerRows]);
    const off = requests(`${F}/receipts/rom-off-r1.json`).filter((r) => r.op === "playanimation").map((r) => [r.scenario, r.seGate, r.controllerRows]);
    expect(off).toEqual(on);
    for (const r of requests(`${F}/receipts/rom-off-r1.json`)) if (r.op === "attackanimation") expect(r.controllerRows).toBe(0);
  });
});

describe("sgs134 census exposure 0..999 (Scene ON kernel)", () => {
  const e = json(`${F}/exposure.json`);
  it("projects the measured classes", () => {
    const pick = (cls: string) => ({ open: e.summary[cls].open, gated: e.summary[cls].gated, frames: e.summary[cls].gateFrames });
    expect(pick("stats-change-target")).toEqual({ open: 440, gated: 232, frames: 3000 });
    expect(pick("stats-change-attacker")).toEqual({ open: 19, gated: 8, frames: 114 });
    expect(pick("multi-hit")).toEqual({ open: 308, gated: 126, frames: 540 });
    expect({ gated: e.totalGated, frames: e.totalGateFrames }).toEqual({ gated: 366, frames: 3654 });
    expect(e.summary["status-icon"].open).toBe(0);
  });
});

describe("sgs134 production today (seeds 0..199): short by exactly the gate", () => {
  it("every stats-change command presents its own 76 / 90 + hold regardless of the gate (both scenes)", () => {
    for (const scene of ["on", "off"]) {
      const p = json(`${F}/production-${scene}.json`).statsChange;
      expect(p.framesEqualOwnTiming).toBe(p.commands);
      expect(p.gatedFramesEqualOwnTiming).toBe(p.gated);
      expect(p.gated).toBeGreaterThan(0);
    }
  });
  it("every 2nd+ multi-hit move-animation lasts exactly as long as the 1st hit, whatever the gate (Scene ON)", () => {
    const m = json(`${F}/production-on.json`).multiHit;
    expect(m.gated).toBeGreaterThan(0);
    for (const deltas of Object.values(m.deltaByGate as Record<string, Record<string, number>>)) expect(Object.keys(deltas)).toEqual(["0"]);
  });
});
