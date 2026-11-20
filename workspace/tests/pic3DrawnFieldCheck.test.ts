// pic3 (2026-11-20 playtest, docs/pic1-live-field-pictures.md): the drawn-field check over replayed play. Every rendered frame is drawn
// with src/engine/drawRecord.ts recording on and compared with the battle rules state (tools/integration/drawnFieldCheck.ts): every
// Pokemon picture belongs to one of the two teams, every healthbox names its own side's Pokemon at its level and (player) its max HP and
// an HP the rules held during the shown presentation, the battle room's opponent is the round's own trainer, and no canonical sample
// helper is reached from a live route (drawRecord.ts throws it). Kyle's 11-20 round hit three of these: MURKROW over DELIBIRD with a
// 138/138 MAGBY box (pic1), DESTIN's BUG CATCHER walking into his first room (pic2), and the swap SUMMARY's draft-slot Pokemon (pic5).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { createStartCarryState, runSeed } from "../tools/soak/randomRoundSoakDriver.ts";
import { compareDrawRecord, DrawCheckLog } from "../tools/integration/drawnFieldCheck.ts";
import { createInitialState, type EngineState } from "../src/engine/core.ts";
import { getFactoryTrainerPresentation } from "../src/engine/factoryTrainerPresentation.ts";
import type { DrawRecord } from "../src/engine/drawRecord.ts";

function soakDrawCheck(seed: number, scene: "on" | "off") {
  const log = new DrawCheckLog();
  const result = runSeed(seed, {
    policy: "winning", scene, renderEvery: 1, maxFrames: 60_000, maxRounds: 1, newChallengeFromLobby: false,
    stateFactory: (s) => createStartCarryState(0, s * 7 + 1, scene),
    drawCheck: { check: (state, frame) => log.check(state, frame) },
  });
  return { result, log };
}

describe("pic3: the drawn-field check finds nothing over replayed play", () => {
  it("a generated round in Scene ON, every frame from the draft through battle 1 and on (soak seed 3)", () => {
    const { result, log } = soakDrawCheck(3, "on");
    expect(result.outcome).toBe("OK");
    expect(log.framesChecked).toBeGreaterThan(20_000);
    expect(log.rows()).toEqual([]);
  }, 180_000);

  it("a generated round in Scene OFF (soak seed 0, three battles)", () => {
    const { result, log } = soakDrawCheck(0, "off");
    expect(result.outcome).toBe("OK");
    expect(result.battle).toBeGreaterThanOrEqual(3);
    expect(log.rows()).toEqual([]);
  }, 180_000);

  it("a ROM round replay fixture (gold-noland, seven battles through Noland), every 4th frame", () => {
    const f = JSON.parse(gunzipSync(readFileSync(new URL("./fixtures/round-replay/gold-noland.json.gz", import.meta.url))).toString("utf8"));
    const dir = mkdtempSync(join(tmpdir(), "pic3-round-"));
    const setups = f.setups.map((s: unknown, n: number) => { const p = join(dir, `setup-${n}.json`); writeFileSync(p, JSON.stringify(s)); return p; });
    const o = f.options;
    const env = { ...process.env, ROM_REPLAY_ROUND: "1", ROM_REPLAY_CHALLENGE: String(o.challenge), ROM_REPLAY_SYMBOLS: String(o.symbols), ROM_REPLAY_DRAFT: o.draft,
      ROM_REPLAY_SWAP_OVERRIDE: o.swapOverride, ROM_REPLAY_POLICY: o.policy, ROM_REPLAY_SWAP: o.swap, ROM_REPLAY_HEARD: o.heard ?? "", ROM_REPLAY_DRAW_CHECK: "4" };
    const script = new URL("../tools/integration/soundCensusRomReplay.ts", import.meta.url).pathname;
    execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, "round", `--seed=${o.seed}`, `--scene=${o.scene}`, "--round=1",
      `--setups=${setups.join(",")}`, `--swap=${o.swap}`, `--policy=${o.policy}`, `--known-k=${f.knownK.join(",")}`,
      `--player-variants=${f.playerVariants.join(",")}`, `--out=${join(dir, "engine.json")}`], { stdio: "pipe", maxBuffer: 1 << 28, env });
    const engine = JSON.parse(readFileSync(join(dir, "engine.json"), "utf8"));
    expect(engine.roundError).toBeNull();
    expect(engine.battles).toHaveLength(7);
    expect(engine.drawCheck.framesChecked).toBeGreaterThan(10_000);
    expect(engine.drawCheck.rows).toEqual([]);
  }, 180_000);
});

describe("pic3: the check flags each kind of fallback", () => {
  const record = (part: Partial<DrawRecord>): DrawRecord => ({ monPics: [], healthboxes: [], overworldSprites: [], canonicalSamples: [], ...part });
  let battleState: EngineState | null = null;
  const inBattle = (): EngineState => {
    if (battleState !== null) return battleState;
    runSeed(3, {
      policy: "winning", scene: "off", renderEvery: 1, maxFrames: 30_000, stateFactory: (s) => createStartCarryState(0, s * 7 + 1, "off"),
      drawCheck: { check: (state) => {
        if (battleState === null && state.factoryRoundBattleOrchestrator?.battleCommandPresentation) { battleState = state; throw new Error("captured"); }
      } },
    });
    return battleState!;
  };

  it("a picture of a Pokemon in neither team (MURKROW over a live field)", () => {
    const findings = compareDrawRecord(inBattle(), record({ monPics: [{ side: "front", species: "MURKROW" }] }), 1);
    expect(findings.map((f) => f.kind)).toEqual(["pic"]);
  });

  it("a player healthbox with a sample's HP (MAGBY 138/138 while the team holds other values)", () => {
    const state = inBattle();
    const player = state.factoryRoundBattleOrchestrator!.battle!.rules.rulesContext.battlers[0]!;
    const name = state.factoryRoundBattleOrchestrator!.battleCommandPresentation!.field.player.name;
    const ok = compareDrawRecord(state, record({ healthboxes: [{ side: "player", name, level: 50, gender: null, currentHp: player.hp, maxHp: player.maxHP, hpFraction: null }] }), 1);
    expect(ok).toEqual([]);
    const wrongHp = compareDrawRecord(state, record({ healthboxes: [{ side: "player", name, level: 50, gender: null, currentHp: player.maxHP + 1, maxHp: player.maxHP + 1, hpFraction: null }] }), 1);
    expect(wrongHp.map((f) => f.kind)).toEqual(["healthbox"]);
    const wrongName = compareDrawRecord(state, record({ healthboxes: [{ side: "player", name: "MAGBY", level: 50, gender: null, currentHp: 138, maxHp: 138, hpFraction: null }] }), 1);
    expect(wrongName.map((f) => f.kind)).toEqual(name === "MAGBY" ? [] : ["healthbox"]);
  });

  it("a battle room opponent that is not the round's trainer (the generic BUG CATCHER)", () => {
    const state = inBattle();
    const findings = compareDrawRecord(state, record({ overworldSprites: [{ role: "room-opponent", graphicsId: "BUG_CATCHER", x: 112, y: 40, width: 16, height: 32 }] }), 1);
    const trainer = getFactoryTrainerPresentation(Number(/(\d+)$/.exec(state.factoryRoundBattleOrchestrator!.round.rules.currentOpponent!.id)![1]));
    expect(findings.map((f) => f.kind)).toEqual(trainer.className === "BUG CATCHER" ? [] : ["room"]);
  });

  it("a canonical sample helper reached during a live round", () => {
    expect(compareDrawRecord(inBattle(), record({ canonicalSamples: ["MURKROW healthbox"] }), 1).map((f) => f.kind)).toEqual(["sample"]);
    // outside a generated round (the legacy canonical sample battle) a sample is not a finding
    expect(compareDrawRecord(createInitialState({ appRoute: "canonical-recorded" }), record({ canonicalSamples: ["MURKROW healthbox"] }), 1)).toEqual([]);
  });
});
