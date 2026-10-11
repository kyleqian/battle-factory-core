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

// land97: the banked idle94 lead rows (tools/integration/fixtures/idle94/idle94-lead-rows.diff, docs/next-adapters-idle94.md): 40 live
// adapters whose accepted window starts N rows after the ROM activation present N extra rows showing their own age-0 frame.
const LEAD: ReadonlyArray<readonly [number, number]> = [
  [41, 10], [44, 10], [51, 7], [52, 4], [55, 10], [71, 10], [74, 1], [75, 13], [82, 7], [92, 7], [93, 5], [94, 5], [106, 1], [120, 4],
  [124, 4], [136, 1], [146, 13], [153, 4], [158, 4], [184, 4], [188, 4], [204, 4], [207, 7], [225, 6], [232, 4], [247, 5], [248, 5],
  [269, 10], [282, 6], [294, 1], [299, 10], [305, 7], [313, 1], [325, 8], [334, 1], [337, 6], [339, 4], [342, 7], [343, 1], [347, 3],
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
  it("covers the 40 idle94 ids with their N, and nothing else", () => {
    expect(LEAD).toHaveLength(40);
    expect(new Set(LEAD.map(([id]) => id)).size).toBe(40);
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
        expect(battleResolutionCommandDuration(command(req(id, side)), plain)).toBe(d + n);
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

  // The committed base rows are production at 64f0ae997 (no lead). The route is rendered by the current code through production's
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
      const N = 4;
      expect(body).toHaveLength(104);
      expect(nowBody).toHaveLength(104 + N);
      for (let i = 0; i < N; i += 1) {
        expect(nowBody[i]!.sha).toBe(body[0]!.sha);
        expect(nowBody[i]!.age).toBe(0);
        expect(nowBody[i]!.live).toBe(true);
      }
      for (let k = 0; k < body.length; k += 1) {
        expect(nowBody[N + k]!.sha, `row ${k}`).toBe(body[k]!.sha);
        expect(nowBody[N + k]!.age).toBe(body[k]!.age);
      }
      expect(now.render.find((r) => r.after)!.sha).toBe(base.render.find((r) => r.after)!.sha);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120000);
});
