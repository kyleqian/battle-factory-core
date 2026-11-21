// rsl141 (docs/rsl141-ordinary-row-rest-live.md): rst139's ordinary-row idle rest, landed. Outside a battle animation script the ROM keeps
// the battler sprite's x2 where the last script / send-in left it (ONIX opponent: +1 after every send-in), so a Scene ON ordinary row
// (battleResolutionPresentationRender.ts) and the command UI (battleScene.ts renderGeneratedBattleCommandPresentation) draw a tracked-`idle`
// opponent at its species front idle rest; `zeroed` / `unknown` / no history keep x2 0.
import { censusDeal } from "../tools/integration/censusRound.ts";
import { describe, expect, it } from "vitest";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView, renderGeneratedBattleCommandPresentation } from "../src/engine/battleScene.ts";
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleStartIntro, beginFactoryRoundBattleStartIntro,
  createFactoryRoundBattleOrchestrator, factoryRoundBattleOpponentIdleRest, factoryRoundBattleResolutionForRender,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import type { LiveBattlerX2History } from "../src/engine/liveBattlerX2History.ts";

const ONIX = 95;
const PRIMEAPE = 57;
// the opponent sprite rect (rst139ProductionCompare.ts OPP: x 136..215 y 0..79)
const inOpponentRect = (x: number, y: number) => x >= 136 && x < 216 && y < 80;

function diff(a: Uint8Array, b: Uint8Array) {
  let inside = 0, outside = 0;
  for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
    const i = (y * 240 + x) * 4;
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) {
      if (inOpponentRect(x, y)) inside++; else outside++;
    }
  }
  return { inside, outside };
}

// rst139ProductionCompare.ts's ordinary row: a message command presenting over PRIMEAPE vs ONIX.
function ordinaryRow(history: LiveBattlerX2History | undefined, opponentDoll = false) {
  const make = (b: 0 | 1, species: number, name: string) => Object.freeze({
    species, name, side: b === 0 ? "player" as const : "trainer" as const, battler: b,
    partyIndex: 0 as const, level: 50, hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const,
    moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
    ...(b === 1 && opponentDoll ? { substituteDoll: true as const } : {}),
  });
  const field = Object.freeze({ player: make(0, PRIMEAPE, "PRIMEAPE"), opponent: make(1, ONIX, "ONIX") });
  const commands = [Object.freeze({ type: "message", eventSequence: 1, lines: ["NEXT", "MESSAGE"], advance: "automatic", noCursor: false,
    timing: { minimumFrames: 1, holdFrames: 0 } })];
  const state = {
    field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0,
    commandIndex: 0, lifecycle: { phase: "presenting", phaseElapsed: 40 },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
    ...(history === undefined ? {} : { liveOrdinaryBattlerX2History: history }),
  };
  const view = createBattleResolutionPresentationRenderView(state as never);
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return { view, fb };
}

describe("rsl141 ordinary-row idle rest (landed rst139)", () => {
  const idle = ordinaryRow({ player: "idle", opponent: "idle" });
  const zeroed = ordinaryRow({ player: "idle", opponent: "zeroed" });
  const unknown = ordinaryRow({ player: "idle", opponent: "unknown" });
  const none = ordinaryRow(undefined);

  it("a tracked-idle ONIX ordinary row draws ONIX one pixel right (its front idle rest), only in the opponent rect", () => {
    expect(idle.view.fieldArt.opponent.origin.x).toBe(zeroed.view.fieldArt.opponent.origin.x + 1);
    expect(idle.view.fieldArt.opponent.origin.y).toBe(zeroed.view.fieldArt.opponent.origin.y);
    expect(idle.view.fieldArt.player).toEqual(zeroed.view.fieldArt.player);
    const d = diff(idle.fb, zeroed.fb);
    expect(d.outside).toBe(0);
    expect(d.inside).toBe(1091); // rst139: the ONIX rest shift in the opponent rect
  });

  it("zeroed / unknown / no history keep x2 0 (byte-identical rows)", () => {
    expect(unknown.view.fieldArt.opponent.origin).toEqual(zeroed.view.fieldArt.opponent.origin);
    expect(none.view.fieldArt.opponent.origin).toEqual(zeroed.view.fieldArt.opponent.origin);
    expect(Buffer.from(unknown.fb).equals(Buffer.from(zeroed.fb))).toBe(true);
    expect(Buffer.from(none.fb).equals(Buffer.from(zeroed.fb))).toBe(true);
  });

  it("the substitute doll has no rest", () => {
    const dollIdle = ordinaryRow({ player: "idle", opponent: "idle" }, true);
    const dollZeroed = ordinaryRow({ player: "idle", opponent: "zeroed" }, true);
    expect(dollIdle.view.fieldArt.opponent.origin).toEqual(dollZeroed.view.fieldArt.opponent.origin);
  });

  it("orchestrator: the handoff rows read the battle's current history; a presenting row keeps its stamped one; another battle's host is ignored", () => {
    const resolution = (phase: string, stamped?: LiveBattlerX2History) => ({
      lifecycle: { phase, phaseElapsed: 0 }, ...(stamped === undefined ? {} : { liveOrdinaryBattlerX2History: stamped }),
    });
    const orchestrator = (r: unknown, battleCallStart: number) => ({
      battleResolutionPresentation: r, activeBattleCallStart: 7,
      liveBattlerX2Host: { battleCallStart, commandKey: "k", host: { history: { player: "idle", opponent: "idle" }, cursor: null } },
    }) as unknown as FactoryRoundBattleOrchestratorState;
    const zeroedStamp = { player: "idle", opponent: "zeroed" } as const;
    expect(factoryRoundBattleResolutionForRender(orchestrator(resolution("next-command-handoff"), 7))?.liveOrdinaryBattlerX2History)
      .toEqual({ player: "idle", opponent: "idle" });
    expect(factoryRoundBattleResolutionForRender(orchestrator(resolution("presenting", zeroedStamp), 7))?.liveOrdinaryBattlerX2History)
      .toEqual(zeroedStamp);
    expect(factoryRoundBattleResolutionForRender(orchestrator(resolution("next-command-handoff"), 6))?.liveOrdinaryBattlerX2History)
      .toBeUndefined();
    expect(factoryRoundBattleOpponentIdleRest(orchestrator(null, 7))).toBe(true);
    expect(factoryRoundBattleOpponentIdleRest(orchestrator(null, 6))).toBe(false);
  });

  // Census battle 134 (streak 4, the rst139 route loop): ONIX leads; the first action menu (frame 530) is a tracked-idle ONIX menu row.
  const firstMenu = (battleScene: "on" | "off") => {
    let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
      id: "live-share-census-134-4", battleScene,
      factoryWinStreak: 4, playerTrainerId: 416049562,
      battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
      ...censusDeal({ seed: 134, factoryWinStreak: 4 }),
    }));
    for (let frame = 1; frame < 4000; frame++) {
      if (state.battleCommandPresentation?.lifecycle.phase === "action-menu") return state;
      const keys = new Set<"A">(state.battleStartIntro && frame % 16 === 0 ? ["A"] : []);
      if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, keys);
      else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, keys);
      else throw new Error("left the battle before the first action menu");
    }
    throw new Error("no action menu");
  };

  it("live Scene ON command UI: a tracked-idle ONIX stands one pixel right of today's x2 0; Scene OFF carries no history", () => {
    const on = firstMenu("on");
    expect(on.battleCommandPresentation!.field.opponent.name).toBe("ONIX");
    expect(factoryRoundBattleOpponentIdleRest(on)).toBe(true);
    const rest = new Uint8Array(240 * 160 * 4);
    const flat = new Uint8Array(240 * 160 * 4);
    renderGeneratedBattleCommandPresentation(rest, on.battleCommandPresentation!, "all", undefined, true);
    renderGeneratedBattleCommandPresentation(flat, on.battleCommandPresentation!, "all", undefined, false);
    const d = diff(rest, flat);
    expect(d.outside).toBe(0);
    expect(d.inside).toBe(1091); // rst139: the ONIX rest shift in the opponent rect
    expect(factoryRoundBattleOpponentIdleRest(firstMenu("off"))).toBe(false);
  });
});
