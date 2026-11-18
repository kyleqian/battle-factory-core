import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import { liveMoveIdleLeadRows } from "../src/engine/battleResolutionPresentationRender.ts";
import { iu120Pre } from "./helpers/iu120Rows.ts";

// shp116 (shadow105, docs/next-adapters-shadow105.md + docs/shp116-shadow-lead-and-shadow-punch-d4.md): the ROM's activation row (lead
// row 0) still shows an ELEVATED opponent's enemy shadow, whichever side attacks; rows 1..N-1 are the body's age-0 image (shadow
// hidden). Production keeps the lead, flags phaseElapsed 0 `preActivationRow`, and battleScene.ts draws the live shadow on that row.
const mon = (species: number, battler: 0 | 1) => ({
  species, name: "MON", side: battler === 0 ? "player" as const : "trainer" as const, battler, partyIndex: 0 as const, level: 50,
  hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const, moveIds: [0, 0, 0, 0] as const,
  currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
});
const pair = (player: number, opponent: number): BattleResolutionDisplayedField =>
  ({ player: mon(player, 0), opponent: mon(opponent, 1) }) as unknown as BattleResolutionDisplayedField;
const req = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }) as BattleMoveAnimationRequest;

type RouteRow = { elapsed: number; age: number | null; live: boolean; sha: string; pre?: boolean; after?: boolean };
type Route = { frames: number; end: string; targetRows: number; row0VsRow1: { px: number; bbox: number[] | null }; render: RouteRow[] };
// shadow105RouteRender.ts: the census battle loop (liveShareCensus.ts policy), rendering the target command's rows through
// createBattleResolutionPresentationRenderView + renderBattleResolutionLiveView (the full production path).
const route = (seed: number, move: number, side: "player" | "opponent"): Route => {
  const dir = mkdtempSync(join(tmpdir(), "shp116-"));
  try {
    const out = join(dir, "route.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "tools/integration/shadow105RouteRender.ts",
      `--seed=${seed}`, `--streak=${(seed * 11) % 49}`, `--move=${move}`, `--side=${side}`, `--out=${out}`], { stdio: "pipe" });
    return JSON.parse(readFileSync(out, "utf8")) as Route;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe("shp116: the elevated opponent's enemy shadow on lead row 0", () => {
  it("an elevated opponent (HAUNTER 93) keeps the N lead rows, either attacker", () => {
    expect(liveMoveIdleLeadRows(req(325, 1), pair(143, 93))).toBe(8);
    expect(liveMoveIdleLeadRows(req(44, 1), pair(143, 93))).toBe(10);
    expect(liveMoveIdleLeadRows(req(44, 0), pair(143, 93))).toBe(10);
  });

  it("census route b38 (CROBAT Bite, streak 26): row 0 is preActivationRow and row 1 + exactly the 200 px shadow box", () => {
    const r = route(38, 44, "opponent");
    expect(r.end).toBe("terminal");
    const target = r.render.filter((row) => row.after !== true);
    // iu120 + liv2: P 3 pre rows + 5 body-lead rows + 10 lead rows + the 31-row Bite body + the 3-row hit tail; the pre, body-lead and lead rows are all age 0 and live.
    const P = iu120Pre(44, "opponent") + 5;
    expect(target).toHaveLength(P + 44);
    expect(target.slice(0, P + 11).map((row) => row.age)).toEqual(Array(P + 11).fill(0));
    expect(target.every((row) => row.live)).toBe(true);
    // The pre rows show the activation row's image (idle98: F_att..A-1 == row A), shadow included.
    expect(target.map((row) => row.pre === true)).toEqual([...Array(P + 1).fill(true), ...Array(43).fill(false)]);
    expect(r.row0VsRow1).toEqual({ px: 200, bbox: [160, 65, 191, 72] });
    // rows P+1..P+9 are the body's age-0 image (the same frame); only rows 0..P (one image) differ from them.
    expect(new Set(target.slice(P + 1, P + 11).map((row) => row.sha)).size).toBe(1);
    expect(new Set(target.slice(0, P + 1).map((row) => row.sha)).size).toBe(1);
    expect(target[P]!.sha).not.toBe(target[P + 1]!.sha);
  }, 120000);

  it("census route b38 (player WEEZING Sludge Bomb -> elevated CROBAT): the same row-0 shadow", () => {
    const r = route(38, 188, "player");
    const target = r.render.filter((row) => row.after !== true);
    expect(target.slice(0, 4).map((row) => row.age)).toEqual([0, 0, 0, 0]);
    expect(target.map((row) => row.pre === true).indexOf(true)).toBe(0);
    // iu120 + liv2: the activation row + the P pre rows + the 5 body-lead rows before it.
    expect(target.filter((row) => row.pre === true)).toHaveLength(1 + iu120Pre(188) + 5);
    expect(r.row0VsRow1).toEqual({ px: 200, bbox: [160, 65, 191, 72] });
  }, 120000);
});
