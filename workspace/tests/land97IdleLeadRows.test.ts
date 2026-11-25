import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import { battleResolutionCommandDuration, liveMoveIdleLeadRows } from "../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";
import { LIVE_SUBSTITUTE_SWAP_BODY_IDS, liveSubstituteSwapApplies } from "../src/engine/liveSubstituteSwap.ts";
import { iu120Extra, iu120Post, iu120Pre } from "./helpers/iu120Rows.ts";

// land97: the banked idle94 lead rows (tools/integration/fixtures/idle94/idle94-lead-rows.diff, docs/next-adapters-idle94.md): 40 live
// adapters whose accepted window starts N rows after the ROM activation present N extra rows showing their own age-0 frame.
// hit1: + Thunder Punch's 10 (idle94's measured lead; static on the frame catcher's ROM rows, docs/hit1-move-hit-timing.md).
// bwf1: Fake Tears (313) left the table: its idle lead row is the presented S lead now.
const LEAD: ReadonlyArray<readonly [number, number]> = [
  [9, 10], [41, 10], [44, 10], [51, 7], [209, 9], [52, 4], [55, 10], [71, 10], [74, 1], [75, 13], [82, 7], [92, 7], [93, 5], [94, 5], [106, 1], [120, 4],
  [53, 18], [124, 4], [136, 1], [146, 13], [153, 4], [158, 4], [184, 4], [188, 4], [204, 4], [207, 7], [225, 6], [232, 4], [247, 5], [248, 5],
  [269, 10], [282, 6], [294, 1], [299, 10], [305, 7], [325, 8], [334, 1], [337, 6], [339, 4], [342, 7], [343, 1], [347, 3],
];
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

describe("land97 idle lead rows", () => {
  it("covers the 40 idle94 ids, bwf2's Spark, liv2's Flamethrower and hit1's Thunder Punch with their N, and nothing else", () => {
    expect(LEAD).toHaveLength(42);
    expect(new Set(LEAD.map(([id]) => id)).size).toBe(42);
    const plain = field(false, false);
    for (const side of [0, 1] as const) {
      for (const [id, n] of LEAD) {
        const live = liveMoveAnimationDuration(req(id, side), plain);
        expect(liveMoveIdleLeadRows(req(id, side), plain), `move ${id}`).toBe(live === null ? 0 : n);
      }
      for (let id = 1; id <= 354; id += 1) {
        if (LEAD.some(([lead]) => lead === id)) continue;
        expect(liveMoveIdleLeadRows(req(id, side), plain), `move ${id}`).toBe(0);
      }
    }
  });

  it("a live command lasts D + N (Bulk Up 104 + 4, Swagger 161 + 7, Taunt 125 + 10, Scary Face 190 + 4)", () => {
    const plain = field(false, false);
    for (const [id, d, n] of [[339, 104, 4], [207, 161, 7], [269, 125, 10], [184, 190, 4]] as const) {
      for (const side of [0, 1] as const) {
        expect(liveMoveAnimationDuration(req(id, side), plain)).toBe(d);
        expect(liveMoveIdleLeadRows(req(id, side), plain)).toBe(n);
        // iu120: + the universal pre / post rows around the lead + body (tests/iu120UniversalRows.test.ts).
        expect(battleResolutionCommandDuration(command(req(id, side)), plain)).toBe(d + n + iu120Extra(id, side === 0 ? "player" : "opponent") + (id === 184 ? 14 : 0)); // kse1: + Scary Face's Cmd_end SE_M_STRING_SHOT2 wait
      }
    }
  });

  it("a Substitute-swap composite keeps lead 0 and its unchanged composite duration", () => {
    const swapLead = LEAD.filter(([id]) => LIVE_SUBSTITUTE_SWAP_BODY_IDS.has(id));
    expect(swapLead.length).toBeGreaterThan(0);
    let swapped = 0;
    for (const [id] of swapLead) {
      for (const side of [0, 1] as const) {
        const doll = side === 0 ? field(true, false) : field(false, true);
        if (liveSubstituteSwapApplies(req(id, side), doll) !== true) continue;
        swapped += 1;
        expect(liveMoveIdleLeadRows(req(id, side), doll), `move ${id} side ${side}`).toBe(0);
        expect(battleResolutionCommandDuration(command(req(id, side)), doll)).toBe(liveMoveAnimationDuration(req(id, side), doll));
      }
    }
    expect(swapped).toBeGreaterThan(0);
  });

  // The committed base rows are production at 16d0b355b (no lead). The route is rendered by the current code through production's
  // renderBattleResolutionLiveView (tools/integration/idle94RouteRender.ts).
  it("Bulk Up (battle 154, player): rows 0..N-1 equal the age-0 frame, row N+k equals the unpatched row k", () => {
    const fx = "tools/integration/fixtures/land97/base-b154-339-player.json";
    const base = JSON.parse(readFileSync(fx, "utf8")) as { rows?: any[]; render: Array<{ age: number | null; live: boolean; sha: string; after?: boolean }> };
    const dir = mkdtempSync(join(tmpdir(), "land97-"));
    try {
      const out = join(dir, "now.json");
      execFileSync("node", ["--experimental-strip-types", "--no-warnings", "tools/integration/idle94RouteRender.ts",
        "--seed=154", "--streak=" + ((154 * 11) % 49), "--move=339", "--side=player", `--out=${out}`], { stdio: "ignore" });
      const now = JSON.parse(readFileSync(out, "utf8")) as typeof base;
      const body = base.render.filter((r) => !r.after), nowBody = now.render.filter((r) => !r.after);
      // iu120: the P pre rows come before the N lead rows (both the age-0 frame); the T post rows repeat the last body row.
      const N = 4, P = iu120Pre(339), T = iu120Post(339);
      expect(body).toHaveLength(104);
      // lead4 (B3): Bulk Up is an S body; its script lead (2 rows) is presented before the body (age 0) and leaves the tail: the row total is unchanged.
      const LEAD = 2;
      const SCRIPT_TAIL = 2; // ont193 (docs/ont193-scene-on-tails.md): the held last body row after the post rows (Bulk Up: tail 7 + trail -1 - post 2 = 4, minus the lead 2).
      expect(nowBody).toHaveLength(P + N + LEAD + 104 + T + SCRIPT_TAIL);
      for (let i = 0; i < P + N + LEAD; i += 1) {
        expect(nowBody[i]!.sha).toBe(body[0]!.sha);
        expect(nowBody[i]!.age).toBe(0);
        expect(nowBody[i]!.live).toBe(true);
      }
      for (let k = 0; k < body.length; k += 1) {
        expect(nowBody[P + N + LEAD + k]!.sha, `row ${k}`).toBe(body[k]!.sha);
        expect(nowBody[P + N + LEAD + k]!.age).toBe(body[k]!.age);
      }
      for (let j = 0; j < T + SCRIPT_TAIL; j += 1) expect(nowBody[P + N + LEAD + body.length + j]!.sha).toBe(body.at(-1)!.sha);
      expect(now.render.find((r) => r.after)!.sha).toBe(base.render.find((r) => r.after)!.sha);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120000);
});

describe("live audit 24 / shadow105 / shp116: an elevated opponent on the field keeps its idle lead rows", () => {
  // HAUNTER (93) is elevated (src/data/gen/enemy-mon-elevations.json 4); SNORLAX (143) is grounded. The ROM's lead row 0 still shows
  // the elevated opponent's enemy shadow (docs/next-adapters-shadow105.md); shp116 draws it on that row (`preActivationRow`) instead
  // of declining the lead, so every attacker keeps N (tests/shp116ShadowLeadRow0.test.ts pins the row-0 shadow).
  const pair = (player: number, opponent: number): BattleResolutionDisplayedField =>
    ({ player: mon(player, 0, false), opponent: mon(opponent, 1, false) }) as unknown as BattleResolutionDisplayedField;
  it("elevated or grounded opponent, either attacker: the lead rows are N", () => {
    expect(liveMoveIdleLeadRows(req(325, 1), pair(143, 93))).toBe(8);
    expect(liveMoveIdleLeadRows(req(44, 1), pair(143, 93))).toBe(10);
    expect(liveMoveIdleLeadRows(req(44, 0), pair(143, 93))).toBe(10);
    expect(liveMoveIdleLeadRows(req(44, 1), pair(93, 143))).toBe(10);
    expect(liveMoveIdleLeadRows(req(44, 0), pair(93, 143))).toBe(10);
  });
});
