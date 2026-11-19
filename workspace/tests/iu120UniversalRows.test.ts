import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import {
  battleResolutionCommandDuration, liveMoveIdleLeadRows, liveMoveUniversalRows,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";
import { LIVE_SUBSTITUTE_SWAP_BODY_IDS, liveSubstituteSwapApplies } from "../src/engine/liveSubstituteSwap.ts";
import { LAND97_LEAD_ROWS } from "./helpers/land97LeadAges.ts";
import {
  IU120_NO_PRE_ROW_SIDES, IU120_POST_ROW_SIDES, IU120_UNMEASURED_IDS, iu120Post, iu120Pre,
} from "./helpers/iu120Rows.ts";

// iu120 (docs/iu120-universal-rows.md): idle98's banked universal rows (docs/next-adapters-idle98.md s3.2), folded with land97's idle
// lead rows: a live move-animation command lasts P + N + D + T, effect age clamp(elapsed - P - N, 0, D - 1).
const mon = (species: number, battler: 0 | 1, doll = false) => ({
  species, name: "MON", side: battler === 0 ? "player" as const : "trainer" as const, battler, partyIndex: 0 as const, level: 50,
  hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const, moveIds: [0, 0, 0, 0] as const,
  currentPP: [0, 0, 0, 0] as const, ppBonuses: 0, ...(doll ? { substituteDoll: true as const } : {}),
});
const field = (playerDoll: boolean, opponentDoll: boolean): BattleResolutionDisplayedField =>
  ({ player: mon(53, 0, playerDoll), opponent: mon(80, 1, opponentDoll) }) as unknown as BattleResolutionDisplayedField;
const req = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }) as BattleMoveAnimationRequest;
const command = (animation: BattleMoveAnimationRequest) =>
  ({ type: "move-animation", animation, timing: { minimumFrames: 1 } }) as unknown as Parameters<typeof battleResolutionCommandDuration>[0];
const sideOf = (attacker: 0 | 1) => (attacker === 0 ? "player" as const : "opponent" as const);

type RenderRow = { age: number | null; live: boolean; sha: string; pre?: boolean; after?: boolean };
const routeRows = (tool: string, seed: number, move: number, side: string): RenderRow[] => {
  const dir = mkdtempSync(join(tmpdir(), "iu120-"));
  try {
    const out = join(dir, "now.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", `tools/integration/${tool}`, `--seed=${seed}`,
      `--streak=${(seed * 11) % 49}`, `--move=${move}`, `--side=${side}`, `--out=${out}`], { stdio: "ignore" });
    return (JSON.parse(readFileSync(out, "utf8")) as { render: RenderRow[] }).render;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const baseRows = (name: string) =>
  (JSON.parse(readFileSync(`tools/integration/fixtures/iu120/${name}.json`, "utf8")) as { render: RenderRow[] }).render;

describe("iu120 universal rows: P / T per class", () => {
  it("P = 3 / T = 2 (trail -1), P = 3 / T = 0, the masked P = 0 sides and the one-sided masks", () => {
    const plain = field(false, false);
    const rows = (id: number, attacker: 0 | 1) => liveMoveUniversalRows(req(id, attacker), plain);
    for (const attacker of [0, 1] as const) {
      expect(rows(2, attacker)).toEqual({ pre: 3, post: 2 }); // Karate Chop (hit, trail -1)
      expect(rows(339, attacker)).toEqual({ pre: 3, post: 2 }); // Bulk Up (status, lead 4)
      expect(rows(44, attacker)).toEqual({ pre: 3, post: 0 }); // Bite (lead 10, trail != -1)
      expect(rows(89, attacker)).toEqual({ pre: 3, post: 0 }); // Earthquake
      expect(rows(24, attacker)).toEqual({ pre: 3, post: 0 }); // Double Kick
      expect(rows(9, attacker)).toEqual({ pre: 0, post: 0 }); // Thunder Punch (lead unproven)
      expect(rows(223, attacker)).toEqual({ pre: 0, post: 0 }); // Dynamic Punch (lead unproven)
    }
    // One-sided masks: Rock Slide's player lead is unproven; Fire Blast / Crunch-class post rows on one side only.
    expect(rows(157, 0).pre).toBe(0);
    expect(rows(157, 1).pre).toBe(3);
    expect(rows(126, 0).post).toBe(2);
    expect(rows(126, 1).post).toBe(0);
    expect(rows(214, 0).post).toBe(0);
    expect(rows(214, 1).post).toBe(2);
  });

  it("the masks: 13 no-pre moves (idle98 s3.2: the leads land97 does not cover), 131 post-row moves / 259 sides", () => {
    expect(IU120_NO_PRE_ROW_SIDES.size).toBe(13);
    // liv2: Flamethrower (53) keeps no pre rows and carries its 18 measured idle rows instead (5 + 18 + 192 + 6 = the ROM's release-to-hit 221).
    for (const id of IU120_NO_PRE_ROW_SIDES.keys()) expect(LAND97_LEAD_ROWS.has(id), `move ${id}`).toBe(id === 53);
    expect(IU120_POST_ROW_SIDES.size).toBe(131);
    const sides = [...IU120_POST_ROW_SIDES.values()].reduce((n, mask) => n + (mask & 1) + ((mask >> 1) & 1), 0);
    expect(sides).toBe(259);
    expect([...IU120_UNMEASURED_IDS]).toEqual([165]);
  });

  it("production equals the test-side masks on every move id and side (declined bodies 0 / 0)", () => {
    const plain = field(false, false);
    let live = 0, pre = 0, post = 0;
    for (const attacker of [0, 1] as const) {
      for (let id = 1; id <= 354; id += 1) {
        const d = liveMoveAnimationDuration(req(id, attacker), plain);
        const want = d === null ? { pre: 0, post: 0 } : { pre: iu120Pre(id, sideOf(attacker)), post: iu120Post(id, sideOf(attacker)) };
        expect(liveMoveUniversalRows(req(id, attacker), plain), `move ${id} attacker ${attacker}`).toEqual(want);
        if (d === null) continue;
        live += 1;
        pre += want.pre === 3 ? 1 : 0;
        post += want.post === 2 ? 1 : 0;
      }
    }
    expect(live).toBeGreaterThan(400);
    expect(pre).toBeGreaterThan(live - 30);
    expect(post).toBeGreaterThan(200);
  });
});

describe("iu120 composition", () => {
  it("one hold: duration = P + N + D + T (Bulk Up 3 + 4 + 104 + 2, Bite 3 + 10 + 31, Karate Chop 3 + 49 + 2, Thunder Punch 0 + D)", () => {
    const plain = field(false, false);
    for (const attacker of [0, 1] as const) {
      for (const [id, n] of [[339, 4], [44, 10], [2, 0], [9, 0], [89, 0], [325, 8]] as const) {
        const d = liveMoveAnimationDuration(req(id, attacker), plain)!;
        expect(d, `move ${id}`).not.toBeNull();
        expect(liveMoveIdleLeadRows(req(id, attacker), plain)).toBe(n);
        expect(battleResolutionCommandDuration(command(req(id, attacker)), plain), `move ${id}`)
          .toBe(iu120Pre(id, sideOf(attacker)) + n + d + iu120Post(id, sideOf(attacker)));
      }
      expect(battleResolutionCommandDuration(command(req(339, attacker)), plain)).toBe(113);
      expect(battleResolutionCommandDuration(command(req(44, attacker)), plain)).toBe(44);
    }
  });

  it("Struggle 165 (live after idle98's evidence, rows unmeasured) keeps 0 / 0, its doll cells too", () => {
    for (const [f, attacker] of [[field(false, false), 0], [field(false, false), 1], [field(false, true), 0], [field(true, false), 1]] as const) {
      const d = liveMoveAnimationDuration(req(165, attacker), f);
      expect(d).not.toBeNull();
      expect(liveMoveUniversalRows(req(165, attacker), f)).toEqual({ pre: 0, post: 0 });
      expect(battleResolutionCommandDuration(command(req(165, attacker)), f)).toBe(d);
    }
  });

  it("a Substitute-swap composite keeps 0 / 0 and its unchanged composite duration", () => {
    let swapped = 0;
    for (const id of LIVE_SUBSTITUTE_SWAP_BODY_IDS) {
      for (const attacker of [0, 1] as const) {
        const doll = attacker === 0 ? field(true, false) : field(false, true);
        if (liveSubstituteSwapApplies(req(id, attacker), doll) !== true) continue;
        swapped += 1;
        expect(liveMoveUniversalRows(req(id, attacker), doll), `move ${id}`).toEqual({ pre: 0, post: 0 });
        expect(battleResolutionCommandDuration(command(req(id, attacker)), doll)).toBe(liveMoveAnimationDuration(req(id, attacker), doll));
      }
    }
    expect(swapped).toBeGreaterThan(5);
  });

  it("a declined body keeps 0 / 0 and its minimum frames (no live adapter: move 1 Pound)", () => {
    expect(liveMoveAnimationDuration(req(1, 0), field(false, false))).toBeNull();
    expect(liveMoveUniversalRows(req(1, 0), field(false, false))).toEqual({ pre: 0, post: 0 });
    expect(battleResolutionCommandDuration(command(req(1, 0)), field(false, false))).toBe(1);
  });
});

// Committed base rows: production at 61e1128ab (land97 lead rows + shp116's preActivationRow, no universal rows), rendered through
// renderBattleResolutionLiveView by the same tool (tools/integration/fixtures/iu120/base-*.json).
describe("iu120 routes: pre rows == base row 0, body rows unchanged, post rows == base last row, next command equal", () => {
  // tail: ont193 (docs/ont193-scene-on-tails.md) script-tail rows after the post rows; they repeat the last body row.
  // lead (lead4 B3, S bodies): the script lead rows are presented before the body (age 0, the first body row) and leave the tail.
  const check = (name: string, tool: string, seed: number, move: number, side: "player" | "opponent", tail = 0, lead = 0) => {
    const base = baseRows(name), now = routeRows(tool, seed, move, side);
    const body = base.filter((r) => !r.after), nowBody = now.filter((r) => !r.after);
    const P = iu120Pre(move, side), T = iu120Post(move, side);
    expect(nowBody).toHaveLength(body.length + P + T + tail + lead);
    const key = (r: RenderRow) => [r.sha, r.age, r.live, r.pre === true];
    for (let i = 0; i < P + lead; i += 1) expect(key(nowBody[i]!), `pre row ${i}`).toEqual(key(body[0]!));
    for (let k = 0; k < body.length; k += 1) expect(key(nowBody[P + lead + k]!), `body row ${k}`).toEqual(key(body[k]!));
    for (let j = 0; j < T + tail; j += 1) expect(key(nowBody[P + lead + body.length + j]!), `post row ${j}`).toEqual(key(body.at(-1)!));
    expect(now.find((r) => r.after)!.sha).toBe(base.find((r) => r.after)!.sha);
    return { P, T, rows: nowBody.length, pre: nowBody.map((r) => r.pre === true) };
  };

  it("Bulk Up (battle 154, player; P 3, N 4, T 2): 108 -> 113 rows, + ont193's 4 script-tail rows (lead4: 2 of them are the script lead before the body) = 117", () => {
    expect(check("base-b154-339-player", "idle94RouteRender.ts", 154, 339, "player", 2, 2)).toMatchObject({ P: 3, T: 2, rows: 117 });
  }, 120000);

  it("Karate Chop (battle 268, player; P 3, N 0, T 2): 49 -> 54 rows", () => {
    expect(check("base-b268-2-player", "idle94RouteRender.ts", 268, 2, "player")).toMatchObject({ P: 3, T: 2, rows: 54 });
  }, 120000);

  it("shp116 composition (battle 38, opponent CROBAT Bite into an elevated field; P 3, N 10): the pre rows keep the row-0 shadow", () => {
    // liv2: Bite's window is the ROM's 40 + 1 (idle 10 + live 31), with the 5 body-lead rows after the pre rows and a 3-row hit tail:
    // 3 + 5 + 10 + 31 + 3 = 52 rows; the base rows (production at 61e1128ab) are its first 9 + ... prefix: row 0 + 10 lead rows + ages 1..25.
    const base = baseRows("base-b38-44-opponent").filter((r) => !r.after);
    const now = routeRows("shadow105RouteRender.ts", 38, 44, "opponent").filter((r) => !r.after);
    const key = (r: RenderRow) => [r.sha, r.age, r.live, r.pre === true];
    expect(now).toHaveLength(52);
    expect(now.map((r) => r.pre === true)).toEqual([...Array(9).fill(true), ...Array(43).fill(false)]);
    expect(now.map((r) => r.age)).toEqual([...Array(19).fill(0), ...Array.from({ length: 30 }, (_, i) => i + 1), 30, 30, 30]);
    for (let i = 0; i < 9; i += 1) expect(key(now[i]!), `pre / lead row ${i}`).toEqual(key(base[0]!));
    for (let k = 1; k < base.length; k += 1) expect(key(now[8 + k]!), `body row ${k}`).toEqual(key(base[k]!));
  }, 120000);
});
