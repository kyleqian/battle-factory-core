// rollout/endeavor prep: engine side of the Rollout counter check. Drives the merged full-turn reducer (same API as tests/factoryBattleScriptRolloutFullTurn.test.ts)
// through 5 consecutive Rollout hits (no Defense Curl, and with Defense Curl first) and prints, per hit: the MOVE_ANIMATION event arguments and the post-hit
// rules-context fields rolloutTimer (battlers[0]) and rolloutTimerStartValues[0]  (battleScriptRolloutOpcode.ts:55-61,91-98; ROM rolloutdamagecalculation runs BEFORE attackanimation:
// BattleScript_RolloutHit -> rolloutdamagecalculation -> BattleScript_HitFromCritCalc, battle_scripts_1.s:1603-1606).
//   node --experimental-strip-types tools/integration/rolloutEndeavorEngine.ts > tools/integration/fixtures/rollout-endeavor/engine-rollout.json
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision, type FactoryFullTurnConfig } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
const ROLLOUT = 205, DEFENSE_CURL = 111, SLEEP_TALK = 214, REST = 156, CURL = 1 << 30;
function cfg(curlFirst: boolean, seed: number): FactoryFullTurnConfig {
  return { requestId: 1, rngSeed: seed,
    player: { species: 213, moveId: ROLLOUT, moves: [ROLLOUT, DEFENSE_CURL, SLEEP_TALK, REST], pp: [20, 40, 10, 10], attack: 30, defense: 282, spAttack: 33, spDefense: 282, speed: 22, hp: 95,
      status2: 0, statStages: [6, 6, 6, 6, 6, 6, 6, 6], types: ["TYPE_BUG", "TYPE_ROCK"] },
    trainer: { species: 242, moveId: SLEEP_TALK, moves: [SLEEP_TALK, 0, 0, 0], pp: [10, 0, 0, 0], attack: 30, defense: 30, spAttack: 104, spDefense: 155, speed: 54, hp: 2500, types: ["TYPE_NORMAL", "TYPE_NORMAL"] } } as FactoryFullTurnConfig;
}
const use = (slot: 0 | 1 | 2 | 3, t: 0 | 1) => ({ kind: "use-move" as const, moveSlot: slot, targetBattler: t });
const out: any[] = [];
for (const curlFirst of [false, true]) {
  // first seed (from 325391 up) whose Rollout accuracy rolls hit 5 times in a row (the engine/ROM miss unlocks the move, which would restart the counter)
  for (let seed = 325391; seed < 325391 + 200; seed++) {
    let st: any = createFactoryFullTurnBattleState(cfg(curlFirst, seed)); let rid = 1; const hits: any[] = []; let ok = true;
    const submit = (side: "player" | "trainer", d: any) => { const r: any = submitFactoryFullTurnDecision(st, { requestId: rid++, side, decision: d }); if (r.kind === "decision-required") st = r.state; return r; };
    if (curlFirst) { submit("player", use(1, 0)); submit("trainer", use(0, 0)); }
    submit("player", use(0, 1));
    for (let i = 0; i < 5; i++) {
      const r = submit("trainer", use(0, 0));
      if (r.kind !== "decision-required") { ok = false; break; }
      const evs = (r.events ?? r.state?.events ?? []).map((e: any) => e.payload ?? e);
      const ev = evs.filter((e: any) => e.animationId === "MOVE_ANIMATION").map((e: any) => e.arguments);
      const rc = r.state.rules.rulesContext;
      if (rc.battlers[0].rolloutTimer !== 4 - i || ev.length !== 1) { ok = false; break; }  // a miss cancels the timer to 0 and emits no MOVE_ANIMATION
      hits.push({ hit: i + 1, moveAnimationArgs: ev, rolloutTimer: rc.battlers[0].rolloutTimer, rolloutTimerStartValue: rc.rolloutTimerStartValues[0], counterStartMinusTimer: rc.rolloutTimerStartValues[0] - rc.battlers[0].rolloutTimer, defenseCurl: (rc.battlers[0].status2 & CURL) !== 0, oppHp: rc.battlers[1].hp, eventCount: evs.length });
      if (i < 4 && r.nextRequest?.side === "player") { ok = false; break; }
    }
    if (ok && hits.length === 5) { out.push({ curlFirst, seed, hits }); break; }
  }
}
console.log(JSON.stringify(out, null, 1));
